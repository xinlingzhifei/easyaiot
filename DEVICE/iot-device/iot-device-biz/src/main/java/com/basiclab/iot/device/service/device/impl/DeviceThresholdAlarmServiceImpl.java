package com.basiclab.iot.device.service.device.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.basiclab.iot.common.domain.TableDataInfo;
import com.basiclab.iot.device.dal.pgsql.device.DeviceAlarmStrategyMapper;
import com.basiclab.iot.device.dal.pgsql.device.DeviceMapper;
import com.basiclab.iot.device.dal.pgsql.device.DevicePropertyThresholdMapper;
import com.basiclab.iot.device.dal.pgsql.device.DeviceThresholdAlarmMapper;
import com.basiclab.iot.device.domain.device.vo.Device;
import com.basiclab.iot.device.domain.device.vo.DeviceAlarmStrategy;
import com.basiclab.iot.device.domain.device.vo.DeviceHealthScoreVO;
import com.basiclab.iot.device.domain.device.vo.DevicePropertyThreshold;
import com.basiclab.iot.device.domain.device.vo.DeviceThresholdAlarm;
import com.basiclab.iot.device.domain.device.vo.PropertyPredictRequest;
import com.basiclab.iot.device.domain.device.vo.PropertyPredictResultVO;
import com.basiclab.iot.device.domain.device.vo.PropertyThresholdEvaluateParam;
import com.basiclab.iot.device.domain.device.vo.TDDeviceDataResp;
import com.basiclab.iot.device.service.device.DeviceAssociatedService;
import com.basiclab.iot.device.service.device.DeviceAlarmNotifyEnrichService;
import com.basiclab.iot.device.service.device.DeviceThresholdAlarmService;
import com.basiclab.iot.tdengine.RemoteTdEngineService;
import com.basiclab.iot.tdengine.domain.query.TDDeviceDataHistoryRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
public class DeviceThresholdAlarmServiceImpl implements DeviceThresholdAlarmService {

    private static final int MIN_PREDICT_SAMPLES = 6;

    @Resource
    private DevicePropertyThresholdMapper thresholdMapper;
    @Resource
    private DeviceAlarmStrategyMapper strategyMapper;
    @Resource
    private DeviceThresholdAlarmMapper alarmMapper;
    @Resource
    private DeviceMapper deviceMapper;
    @Resource
    private DeviceAssociatedService deviceAssociatedService;
    @Resource
    private DeviceAlarmNotifyEnrichService alarmNotifyEnrichService;
    @Resource
    private RemoteTdEngineService remoteTdEngineService;
    @Autowired(required = false)
    @org.springframework.beans.factory.annotation.Qualifier("deviceAlertKafkaTemplate")
    private KafkaTemplate<String, String> kafkaTemplate;
    @Resource
    private ObjectMapper objectMapper;

    @Value("${spring.kafka.alert-notification.send-topic:iot-alert-notification-send}")
    private String alertSendTopic;

    @Override
    public List<DevicePropertyThreshold> listThresholds(String deviceIdentification) {
        return thresholdMapper.selectByDeviceIdentification(deviceIdentification);
    }

    @Override
    public DevicePropertyThreshold getThreshold(String deviceIdentification, String propertyCode) {
        return thresholdMapper.selectByDeviceAndCode(deviceIdentification, propertyCode);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DevicePropertyThreshold saveThreshold(DevicePropertyThreshold threshold) {
        if (threshold == null || StrUtil.isBlank(threshold.getDeviceIdentification())
                || StrUtil.isBlank(threshold.getPropertyCode())) {
            throw new RuntimeException("设备标识与属性标识不能为空");
        }
        if (threshold.getMinValue() != null && threshold.getMaxValue() != null
                && threshold.getMinValue() > threshold.getMaxValue()) {
            throw new RuntimeException("下限不能大于上限");
        }
        LocalDateTime now = LocalDateTime.now();
        DevicePropertyThreshold existing = thresholdMapper.selectByDeviceAndCode(
                threshold.getDeviceIdentification(), threshold.getPropertyCode());
        if (existing != null) {
            existing.setPropertyName(threshold.getPropertyName());
            existing.setMinValue(threshold.getMinValue());
            existing.setMaxValue(threshold.getMaxValue());
            existing.setEnabled(threshold.getEnabled() == null ? 1 : threshold.getEnabled());
            existing.setAlarmLevel(StrUtil.blankToDefault(threshold.getAlarmLevel(), "WARNING"));
            existing.setRemark(threshold.getRemark());
            existing.setRulesJson(threshold.getRulesJson());
            existing.setHealthWeight(threshold.getHealthWeight() == null ? 10 : threshold.getHealthWeight());
            existing.setCritical(threshold.getCritical() == null ? 0 : threshold.getCritical());
            existing.setUpdateTime(now);
            thresholdMapper.updateById(existing);
            return existing;
        }
        threshold.setEnabled(threshold.getEnabled() == null ? 1 : threshold.getEnabled());
        threshold.setAlarmLevel(StrUtil.blankToDefault(threshold.getAlarmLevel(), "WARNING"));
        threshold.setHealthWeight(threshold.getHealthWeight() == null ? 10 : threshold.getHealthWeight());
        threshold.setCritical(threshold.getCritical() == null ? 0 : threshold.getCritical());
        if (threshold.getTenantId() == null) {
            threshold.setTenantId(com.basiclab.iot.common.core.context.TenantContextHolder.getTenantId());
        }
        threshold.setCreateTime(now);
        threshold.setUpdateTime(now);
        thresholdMapper.insert(threshold);
        return threshold;
    }

    @Override
    public int deleteThreshold(Long id) {
        return thresholdMapper.deleteById(id);
    }

    @Override
    public DeviceAlarmStrategy getStrategy(String deviceIdentification) {
        DeviceAlarmStrategy strategy = strategyMapper.selectByDeviceIdentification(deviceIdentification);
        if (strategy != null) {
            return strategy;
        }
        DeviceAlarmStrategy defaults = new DeviceAlarmStrategy();
        defaults.setDeviceIdentification(deviceIdentification);
        defaults.setStrategyName("默认告警策略");
        defaults.setEnabled(0);
        defaults.setNotifyMethods("[]");
        defaults.setNotifyUsers("[]");
        defaults.setChannels("[]");
        defaults.setSilenceSeconds(300);
        defaults.setIncludeOffline(1);
        return defaults;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DeviceAlarmStrategy saveStrategy(DeviceAlarmStrategy strategy) {
        if (strategy == null || StrUtil.isBlank(strategy.getDeviceIdentification())) {
            throw new RuntimeException("设备标识不能为空");
        }
        // 对齐算法任务：保存前 enrich channels（userless）并从模板解析 notifyUsers
        DeviceAlarmNotifyEnrichService.EnrichResult enrichResult =
                alarmNotifyEnrichService.enrich(strategy.getChannels(), strategy.getNotifyMethods());
        strategy.setChannels(enrichResult.getChannelsJson());
        strategy.setNotifyUsers(enrichResult.getNotifyUsersJson());
        strategy.setNotifyMethods(enrichResult.getNotifyMethodsJson());

        if (Objects.equals(strategy.getEnabled(), 1)) {
            boolean notifiable = alarmNotifyEnrichService.hasNotifiableConfig(
                    strategy.getChannels(), strategy.getNotifyUsers());
            if (!notifiable) {
                throw new RuntimeException("启用策略时请配置通知渠道并绑定消息模板");
            }
        }

        LocalDateTime now = LocalDateTime.now();
        DeviceAlarmStrategy existing = strategyMapper.selectByDeviceIdentification(strategy.getDeviceIdentification());
        if (existing != null) {
            existing.setStrategyName(StrUtil.blankToDefault(strategy.getStrategyName(), existing.getStrategyName()));
            existing.setEnabled(strategy.getEnabled() == null ? existing.getEnabled() : strategy.getEnabled());
            existing.setNotifyMethods(strategy.getNotifyMethods());
            existing.setNotifyUsers(strategy.getNotifyUsers());
            existing.setChannels(strategy.getChannels());
            existing.setSilenceSeconds(strategy.getSilenceSeconds() == null ? 300 : strategy.getSilenceSeconds());
            existing.setIncludeOffline(strategy.getIncludeOffline() == null ? 1 : strategy.getIncludeOffline());
            existing.setRemark(strategy.getRemark());
            existing.setUpdateTime(now);
            strategyMapper.updateById(existing);
            return existing;
        }
        strategy.setStrategyName(StrUtil.blankToDefault(strategy.getStrategyName(), "默认告警策略"));
        strategy.setEnabled(strategy.getEnabled() == null ? 0 : strategy.getEnabled());
        strategy.setSilenceSeconds(strategy.getSilenceSeconds() == null ? 300 : strategy.getSilenceSeconds());
        strategy.setIncludeOffline(strategy.getIncludeOffline() == null ? 1 : strategy.getIncludeOffline());
        if (strategy.getTenantId() == null) {
            strategy.setTenantId(com.basiclab.iot.common.core.context.TenantContextHolder.getTenantId());
        }
        strategy.setCreateTime(now);
        strategy.setUpdateTime(now);
        strategyMapper.insert(strategy);
        return strategy;
    }

    @Override
    public int evaluateAndAlarm(PropertyThresholdEvaluateParam param) {
        if (param == null || StrUtil.isBlank(param.getDeviceIdentification())
                || param.getProperties() == null || param.getProperties().isEmpty()) {
            return 0;
        }
        DeviceAlarmStrategy strategy = strategyMapper.selectByDeviceIdentification(param.getDeviceIdentification());
        if (strategy != null && Objects.equals(strategy.getEnabled(), 0)) {
            return 0;
        }
        List<DevicePropertyThreshold> thresholds = thresholdMapper.selectEnabledByDevice(param.getDeviceIdentification());
        if (thresholds == null || thresholds.isEmpty()) {
            return 0;
        }
        String deviceName = StrUtil.blankToDefault(param.getDeviceName(), param.getDeviceIdentification());
        int triggered = 0;
        for (DevicePropertyThreshold th : thresholds) {
            Object raw = param.getProperties().get(th.getPropertyCode());
            if (raw == null) {
                continue;
            }
            Double value = parseDouble(raw);
            boolean breached = false;
            StringBuilder msg = new StringBuilder();
            Double minBound = th.getMinValue();
            Double maxBound = th.getMaxValue();

            // 优先运算符规则（贡献源码对齐）
            if (StrUtil.isNotBlank(th.getRulesJson())) {
                try {
                    com.fasterxml.jackson.databind.JsonNode arr = objectMapper.readTree(th.getRulesJson());
                    if (arr != null && arr.isArray()) {
                        for (com.fasterxml.jackson.databind.JsonNode node : arr) {
                            String op = node.path("operator").asText("");
                            String expected = node.path("value").asText("");
                            if (matchRule(raw, op, expected)) {
                                breached = true;
                                if (msg.length() > 0) msg.append("；");
                                msg.append(String.format("属性[%s]当前值%s满足%s%s",
                                        th.getPropertyCode(), raw, op, expected));
                            }
                            Double expectedNum = parseDouble(expected);
                            if (expectedNum != null) {
                                if (">".equals(op) || ">=".equals(op)) {
                                    maxBound = maxBound == null ? expectedNum : Math.min(maxBound, expectedNum);
                                }
                                if ("<".equals(op) || "<=".equals(op)) {
                                    minBound = minBound == null ? expectedNum : Math.max(minBound, expectedNum);
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("[evaluateAndAlarm] 解析 rulesJson 失败 property={}", th.getPropertyCode(), e);
                }
            }

            if (!breached && value != null) {
                if (th.getMinValue() != null && value < th.getMinValue()) {
                    breached = true;
                    msg.append(String.format("属性[%s]当前值%s低于下限%s", th.getPropertyCode(), value, th.getMinValue()));
                }
                if (th.getMaxValue() != null && value > th.getMaxValue()) {
                    breached = true;
                    if (msg.length() > 0) {
                        msg.append("；");
                    }
                    msg.append(String.format("属性[%s]当前值%s高于上限%s", th.getPropertyCode(), value, th.getMaxValue()));
                }
            }
            if (!breached) {
                clearOpenAlarm(param.getDeviceIdentification(), th.getPropertyCode());
                continue;
            }
            int silence = strategy != null && strategy.getSilenceSeconds() != null ? strategy.getSilenceSeconds() : 300;
            LocalDateTime since = LocalDateTime.now().minusSeconds(Math.max(silence, 0));
            if (alarmMapper.countOpenSince(param.getDeviceIdentification(), th.getPropertyCode(), since) > 0) {
                continue;
            }
            DeviceThresholdAlarm alarm = DeviceThresholdAlarm.builder()
                    .deviceIdentification(param.getDeviceIdentification())
                    .deviceName(deviceName)
                    .propertyCode(th.getPropertyCode())
                    .propertyName(th.getPropertyName())
                    .alarmValue(String.valueOf(raw))
                    .minValue(minBound)
                    .maxValue(maxBound)
                    .alarmLevel(StrUtil.blankToDefault(th.getAlarmLevel(), "WARNING"))
                    .alarmStatus("OPEN")
                    .message(msg.toString())
                    .kafkaSent(0)
                    .tenantId(0L)
                    .createTime(LocalDateTime.now())
                    .build();
            alarmMapper.insert(alarm);
            boolean sent = publishKafkaAlert(alarm, strategy);
            if (sent) {
                alarm.setKafkaSent(1);
                alarmMapper.updateById(alarm);
            }
            triggered++;
        }
        return triggered;
    }

    private void clearOpenAlarm(String deviceIdentification, String propertyCode) {
        DeviceThresholdAlarm open = alarmMapper.selectLatestOpen(deviceIdentification, propertyCode);
        if (open == null) {
            return;
        }
        LambdaUpdateWrapper<DeviceThresholdAlarm> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(DeviceThresholdAlarm::getId, open.getId())
                .set(DeviceThresholdAlarm::getAlarmStatus, "CLEARED")
                .set(DeviceThresholdAlarm::getClearTime, LocalDateTime.now());
        alarmMapper.update(null, wrapper);
    }

    private boolean publishKafkaAlert(DeviceThresholdAlarm alarm, DeviceAlarmStrategy strategy) {
        if (kafkaTemplate == null) {
            log.warn("[publishKafkaAlert] KafkaTemplate 不可用，跳过推送 device={}", alarm.getDeviceIdentification());
            return false;
        }
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("alertId", alarm.getId() != null ? alarm.getId().intValue() : 0);
            payload.put("alert_id", alarm.getId() != null ? alarm.getId().intValue() : 0);
            payload.put("taskId", 0);
            payload.put("task_id", 0);
            payload.put("taskName", "设备阈值告警");
            payload.put("task_name", "设备阈值告警");
            payload.put("deviceId", alarm.getDeviceIdentification());
            payload.put("device_id", alarm.getDeviceIdentification());
            payload.put("deviceName", alarm.getDeviceName());
            payload.put("device_name", alarm.getDeviceName());
            String ts = String.valueOf(System.currentTimeMillis());
            payload.put("timestamp", ts);

            Map<String, Object> alertInfo = new HashMap<>();
            alertInfo.put("object", "device_property");
            alertInfo.put("event", "threshold_breach");
            alertInfo.put("region", alarm.getPropertyCode());
            alertInfo.put("information", alarm.getMessage());
            alertInfo.put("taskType", "threshold");
            alertInfo.put("task_type", "threshold");
            alertInfo.put("time", ts);
            // 设备阈值专用占位符字段（消息中心模板可直接使用）
            alertInfo.put("property", alarm.getPropertyCode());
            alertInfo.put("property_code", alarm.getPropertyCode());
            alertInfo.put("property_name", StrUtil.blankToDefault(alarm.getPropertyName(), alarm.getPropertyCode()));
            alertInfo.put("value", alarm.getAlarmValue());
            alertInfo.put("alarm_value", alarm.getAlarmValue());
            alertInfo.put("alarm_level", alarm.getAlarmLevel());
            alertInfo.put("min_value", alarm.getMinValue());
            alertInfo.put("max_value", alarm.getMaxValue());
            payload.put("alert", alertInfo);

            List<String> methods = new ArrayList<>();
            List<Map<String, Object>> users = new ArrayList<>();
            List<Map<String, Object>> channels = new ArrayList<>();
            if (strategy != null) {
                if (StrUtil.isNotBlank(strategy.getNotifyMethods())) {
                    methods = objectMapper.readValue(strategy.getNotifyMethods(),
                            new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                }
                if (StrUtil.isNotBlank(strategy.getNotifyUsers())) {
                    users = objectMapper.readValue(strategy.getNotifyUsers(),
                            new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {});
                }
                if (StrUtil.isNotBlank(strategy.getChannels())) {
                    channels = objectMapper.readValue(strategy.getChannels(),
                            new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {});
                }
                // 运行时兜底：历史策略可能只有 channels 无 notifyUsers，触发时再解析一次
                if ((users == null || users.isEmpty()) && channels != null && !channels.isEmpty()) {
                    DeviceAlarmNotifyEnrichService.EnrichResult enrichResult =
                            alarmNotifyEnrichService.enrich(strategy.getChannels(), strategy.getNotifyMethods());
                    try {
                        users = objectMapper.readValue(enrichResult.getNotifyUsersJson(),
                                new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {});
                        channels = objectMapper.readValue(enrichResult.getChannelsJson(),
                                new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {});
                    } catch (Exception ignore) {
                        // keep original
                    }
                }
            }
            if (methods == null) {
                methods = new ArrayList<>();
            }
            if (users == null) {
                users = new ArrayList<>();
            }
            if (channels == null) {
                channels = new ArrayList<>();
            }
            if (methods.isEmpty() && !channels.isEmpty()) {
                for (Map<String, Object> ch : channels) {
                    Object m = ch.get("method");
                    if (m != null && StrUtil.isNotBlank(String.valueOf(m))) {
                        String method = String.valueOf(m).toLowerCase();
                        if (!methods.contains(method)) {
                            methods.add(method);
                        }
                    }
                }
            }
            payload.put("notifyMethods", methods);
            payload.put("notifyUsers", users);
            payload.put("channels", channels);
            boolean shouldNotify = alarmNotifyEnrichService.hasNotifiableConfig(
                    objectMapper.writeValueAsString(channels),
                    objectMapper.writeValueAsString(users));
            payload.put("shouldNotify", shouldNotify);

            String json = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(alertSendTopic, alarm.getDeviceIdentification(), json);
            log.info("[publishKafkaAlert] 已发送阈值告警到 Kafka topic={} device={} property={} shouldNotify={} channels={} users={}",
                    alertSendTopic, alarm.getDeviceIdentification(), alarm.getPropertyCode(),
                    shouldNotify, channels.size(), users.size());
            return true;
        } catch (Exception e) {
            log.error("[publishKafkaAlert] 发送失败 device={}", alarm.getDeviceIdentification(), e);
            return false;
        }
    }

    @Override
    public List<DeviceThresholdAlarm> listOpenAlarms(String deviceIdentification) {
        return alarmMapper.selectOpenByDevice(deviceIdentification);
    }

    @Override
    public DeviceHealthScoreVO calcHealthScore(String deviceIdentification, boolean includeAssociated) {
        DeviceHealthScoreVO vo = new DeviceHealthScoreVO();
        Device center = deviceMapper.findOneByDeviceIdentification(deviceIdentification);
        List<Device> devices = new ArrayList<>();
        if (center != null) {
            devices.add(center);
        }
        if (includeAssociated) {
            List<Device> associated = deviceAssociatedService.listAssociatedDevices(deviceIdentification);
            if (associated != null) {
                devices.addAll(associated);
            }
        }
        if (devices.isEmpty()) {
            vo.setScore(0);
            vo.setLevel("RISK");
            vo.getReasons().add("设备不存在");
            return vo;
        }

        int online = 0;
        int offline = 0;
        int thresholdConfigured = 0;
        int thresholdBreached = 0;
        int openAlarms = 0;
        for (Device d : devices) {
            if ("ONLINE".equalsIgnoreCase(d.getConnectStatus())) {
                online++;
            } else {
                offline++;
            }
            List<DevicePropertyThreshold> ths = thresholdMapper.selectEnabledByDevice(d.getDeviceIdentification());
            if (ths != null && !ths.isEmpty()) {
                thresholdConfigured += ths.size();
            }
            int open = alarmMapper.countOpenByDevice(d.getDeviceIdentification());
            openAlarms += open;
            if (open > 0) {
                thresholdBreached++;
            }
        }

        double onlineRatio = devices.isEmpty() ? 0 : (online * 1.0 / devices.size());
        int onlineScore = (int) Math.round(onlineRatio * 100);
        int thresholdScore = 100;
        if (thresholdConfigured > 0) {
            double breachRatio = Math.min(1.0, openAlarms * 1.0 / Math.max(thresholdConfigured, 1));
            thresholdScore = (int) Math.round((1 - breachRatio) * 100);
        }
        // 在线 30% + 阈值健康 70%（对齐截图健康指数拆解）
        int score = (int) Math.round(onlineScore * 0.3 + thresholdScore * 0.7);
        score = Math.max(0, Math.min(100, score));

        vo.setScore(score);
        vo.setOnlineScore(onlineScore);
        vo.setThresholdScore(thresholdScore);
        vo.setOnlineWeightDesc("在线可用性 30%");
        vo.setThresholdWeightDesc("阈值健康 70%");
        vo.setTotalDevices(devices.size());
        vo.setOnlineCount(online);
        vo.setOfflineCount(offline);
        vo.setOpenAlarmCount(openAlarms);
        vo.setThresholdConfiguredCount(thresholdConfigured);
        vo.setThresholdBreachedCount(thresholdBreached);
        if (score >= 80) {
            vo.setLevel("GOOD");
        } else if (score >= 50) {
            vo.setLevel("WARNING");
        } else {
            vo.setLevel("RISK");
        }
        vo.getReasons().add(String.format("在线 %d/%d", online, devices.size()));
        vo.getReasons().add(String.format("未恢复阈值告警 %d", openAlarms));
        return vo;
    }

    @Override
    @SuppressWarnings("unchecked")
    public PropertyPredictResultVO predict(PropertyPredictRequest request) {
        PropertyPredictResultVO result = new PropertyPredictResultVO();
        result.setMinSampleRequired(MIN_PREDICT_SAMPLES);
        if (request == null || StrUtil.isBlank(request.getDeviceIdentification())
                || StrUtil.isBlank(request.getPropertyCode())) {
            result.setPredictReady(false);
            result.setMessage("参数不完整");
            result.setSampleCount(0);
            return result;
        }
        result.setDeviceIdentification(request.getDeviceIdentification());
        result.setPropertyCode(request.getPropertyCode());
        result.setPropertyName(request.getPropertyName());
        result.setUnit(request.getUnit());

        Device device = deviceMapper.findOneByDeviceIdentification(request.getDeviceIdentification());
        result.setDeviceStatus(device != null ? device.getConnectStatus() : "UNKNOWN");
        result.setRunStateMessage(device != null && "ONLINE".equalsIgnoreCase(device.getConnectStatus()) ? "运转正常" : "未知");

        long end = request.getEndTime() != null ? request.getEndTime() : System.currentTimeMillis();
        long start = request.getStartTime() != null ? request.getStartTime() : end - 3600_000L;
        int predictPoints = request.getPredictPoints() == null ? 12 : Math.max(3, request.getPredictPoints());

        List<double[]> samples = loadNumericHistory(request.getDeviceIdentification(), request.getPropertyCode(), start, end);
        result.setSampleCount(samples.size());
        if (samples.size() < MIN_PREDICT_SAMPLES) {
            result.setPredictReady(false);
            result.setMessage(String.format("至少需要 %d 条有效浮点数据，当前仅 %d 条", MIN_PREDICT_SAMPLES, samples.size()));
            result.setRiskLevel("PENDING");
            result.setFailureRisk(0);
            result.setRiskMessage("待分析");
            return result;
        }

        result.setPredictReady(true);
        // 降采样：最多取 240 点做回归
        if (samples.size() > 240) {
            samples = downsample(samples, 240);
        }

        double t0 = samples.get(0)[0];
        double[] xs = new double[samples.size()];
        double[] ys = new double[samples.size()];
        for (int i = 0; i < samples.size(); i++) {
            xs[i] = (samples.get(i)[0] - t0) / 3600_000.0; // hours
            ys[i] = samples.get(i)[1];
            PropertyPredictResultVO.PredictPoint p = new PropertyPredictResultVO.PredictPoint();
            p.setTs((long) samples.get(i)[0]);
            p.setValue(ys[i]);
            result.getHistory().add(p);
        }

        double[] lr = linearRegression(xs, ys);
        double slope = lr[0];
        double intercept = lr[1];
        double residualStd = lr[2];
        result.setHourlyTrend(round2(slope));

        PropertyPredictResultVO.PredictPoint latest = result.getHistory().get(result.getHistory().size() - 1);
        result.setLatestValue(latest.getValue());
        result.setLatestTs(latest.getTs());

        double lastX = xs[xs.length - 1];
        double avgStep = xs.length > 1 ? (xs[xs.length - 1] - xs[0]) / (xs.length - 1) : 1.0 / 12;
        if (avgStep <= 0) {
            avgStep = 1.0 / 12;
        }

        DevicePropertyThreshold th = thresholdMapper.selectByDeviceAndCode(
                request.getDeviceIdentification(), request.getPropertyCode());

        boolean willBreach = false;
        long predictEndTs = latest.getTs();
        for (int i = 1; i <= predictPoints; i++) {
            double x = lastX + avgStep * i;
            double y = intercept + slope * x;
            double z = 1.96 * residualStd;
            long ts = (long) (t0 + x * 3600_000.0);
            predictEndTs = ts;

            PropertyPredictResultVO.PredictPoint mid = new PropertyPredictResultVO.PredictPoint();
            mid.setTs(ts);
            mid.setValue(round2(y));
            result.getPrediction().add(mid);

            PropertyPredictResultVO.PredictPoint up = new PropertyPredictResultVO.PredictPoint();
            up.setTs(ts);
            up.setValue(round2(y + z));
            result.getUpperBound().add(up);

            PropertyPredictResultVO.PredictPoint low = new PropertyPredictResultVO.PredictPoint();
            low.setTs(ts);
            low.setValue(round2(y - z));
            result.getLowerBound().add(low);

            if (th != null) {
                if (th.getMaxValue() != null && y > th.getMaxValue()) {
                    willBreach = true;
                }
                if (th.getMinValue() != null && y < th.getMinValue()) {
                    willBreach = true;
                }
            }
        }
        result.setPredictEndTs(predictEndTs);

        // 异常检测：残差异常占比
        int anomaly = 0;
        double threshold = Math.max(residualStd * 2, 1e-6);
        for (int i = 0; i < ys.length; i++) {
            double pred = intercept + slope * xs[i];
            if (Math.abs(ys[i] - pred) > threshold) {
                anomaly++;
            }
        }
        double anomalyRatio = anomaly * 1.0 / ys.length;
        result.setAnomalyRatio(round2(anomalyRatio * 100));
        result.setSensitivity(35.0);
        result.setAnomalyMessage(anomalyRatio > 0.2 ? "存在波动异常" : "波动正常");

        double windowChange = result.getPrediction().isEmpty() ? 0
                : result.getPrediction().get(result.getPrediction().size() - 1).getValue() - latest.getValue();
        result.setWindowChange(round2(windowChange));
        double degradation = Math.min(100, Math.abs(slope) * 10);
        result.setDegradationDegree(round2(degradation));
        result.setDegradationMessage(Math.abs(slope) > 1 ? "性能衰减趋势明显" : "性能趋势平稳");

        int risk = (int) Math.round(Math.min(100,
                anomalyRatio * 40 + (willBreach ? 40 : 0) + Math.min(20, Math.abs(slope))));
        result.setFailureRisk(risk);
        result.setCompressionRisk(willBreach ? 40.0 : 0.0);
        if (risk >= 70) {
            result.setRiskLevel("HIGH");
            result.setRiskMessage("高风险");
        } else if (risk >= 40) {
            result.setRiskLevel("MEDIUM");
            result.setRiskMessage("中风险");
        } else {
            result.setRiskLevel("LOW");
            result.setRiskMessage("低风险");
        }
        result.setFailureMessage(willBreach ? "预测窗口内可能越限" : "预测窗口内安全");
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<double[]> loadNumericHistory(String deviceIdentification, String propertyCode, long start, long end) {
        List<double[]> samples = new ArrayList<>();
        try {
            TDDeviceDataHistoryRequest req = new TDDeviceDataHistoryRequest();
            req.setDeviceIdentification(deviceIdentification);
            req.setIdentifier(propertyCode);
            req.setStartTime(start);
            req.setEndTime(end);
            TableDataInfo table = remoteTdEngineService.deviceInfoHistoryPage(req);
            if (table == null || table.getData() == null) {
                return samples;
            }
            List<?> rows = (List<?>) table.getData();
            for (Object row : rows) {
                Long ts = null;
                String dataValue = null;
                if (row instanceof TDDeviceDataResp) {
                    TDDeviceDataResp r = (TDDeviceDataResp) row;
                    ts = r.getTs();
                    dataValue = r.getDataValue();
                } else if (row instanceof Map) {
                    Map<String, Object> m = (Map<String, Object>) row;
                    Object tsObj = m.get("ts");
                    if (tsObj instanceof Number) {
                        ts = ((Number) tsObj).longValue();
                    }
                    Object v = m.get("dataValue");
                    dataValue = v == null ? null : String.valueOf(v);
                }
                Double num = parseNumericValue(dataValue, propertyCode);
                if (ts != null && num != null) {
                    samples.add(new double[]{ts.doubleValue(), num});
                }
            }
            samples.sort((a, b) -> Double.compare(a[0], b[0]));
        } catch (Exception e) {
            log.error("[loadNumericHistory] 加载历史失败 device={} property={}", deviceIdentification, propertyCode, e);
        }
        return samples;
    }

    private List<double[]> downsample(List<double[]> src, int max) {
        if (src.size() <= max) {
            return src;
        }
        List<double[]> out = new ArrayList<>(max);
        double step = (src.size() - 1.0) / (max - 1.0);
        for (int i = 0; i < max; i++) {
            out.add(src.get((int) Math.round(i * step)));
        }
        return out;
    }

    /** @return [slope, intercept, residualStd] */
    private double[] linearRegression(double[] xs, double[] ys) {
        int n = xs.length;
        double sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (int i = 0; i < n; i++) {
            sumX += xs[i];
            sumY += ys[i];
            sumXY += xs[i] * ys[i];
            sumXX += xs[i] * xs[i];
        }
        double denom = n * sumXX - sumX * sumX;
        double slope = Math.abs(denom) < 1e-12 ? 0 : (n * sumXY - sumX * sumY) / denom;
        double intercept = (sumY - slope * sumX) / n;
        double sse = 0;
        for (int i = 0; i < n; i++) {
            double err = ys[i] - (intercept + slope * xs[i]);
            sse += err * err;
        }
        double residualStd = Math.sqrt(sse / Math.max(1, n - 2));
        return new double[]{slope, intercept, residualStd};
    }

    private boolean matchRule(Object actual, String operator, String expected) {
        if (StrUtil.isBlank(operator)) {
            return false;
        }
        Double leftNum = parseDouble(actual);
        Double rightNum = parseDouble(expected);
        if (leftNum != null && rightNum != null) {
            switch (operator) {
                case ">":
                    return leftNum > rightNum;
                case ">=":
                    return leftNum >= rightNum;
                case "<":
                    return leftNum < rightNum;
                case "<=":
                    return leftNum <= rightNum;
                case "=":
                    return Double.compare(leftNum, rightNum) == 0;
                default:
                    return false;
            }
        }
        String left = actual == null ? "" : String.valueOf(actual);
        String right = expected == null ? "" : expected;
        if ("=".equals(operator)) {
            return left.equals(right);
        }
        return false;
    }

    private Double parseNumericValue(Object raw, String propertyCode) {
        Double direct = parseDouble(raw);
        if (direct != null) {
            return direct;
        }
        if (raw == null) {
            return null;
        }
        String s = String.valueOf(raw).trim();
        if (!s.startsWith("{")) {
            return null;
        }
        try {
            com.fasterxml.jackson.databind.JsonNode node =
                    new com.fasterxml.jackson.databind.ObjectMapper().readTree(s);
            if (StrUtil.isNotBlank(propertyCode) && node.has(propertyCode) && node.get(propertyCode).isNumber()) {
                return node.get(propertyCode).asDouble();
            }
            com.fasterxml.jackson.databind.JsonNode props = node.get("properties");
            if (props != null && props.isObject() && StrUtil.isNotBlank(propertyCode)
                    && props.has(propertyCode) && props.get(propertyCode).isNumber()) {
                return props.get(propertyCode).asDouble();
            }
            return parseDouble(raw);
        } catch (Exception e) {
            return null;
        }
    }

    private Double parseDouble(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Number) {
            return ((Number) raw).doubleValue();
        }
        String s = String.valueOf(raw).trim();
        if (s.isEmpty() || "null".equalsIgnoreCase(s) || "--".equals(s)) {
            return null;
        }
        try {
            return Double.parseDouble(s.replace("%", ""));
        } catch (Exception ignore) {
            // 兼容 {"temperature": 29.5} / {"properties":{"temperature":29.5}}
            if (s.startsWith("{")) {
                try {
                    com.fasterxml.jackson.databind.JsonNode node =
                            new com.fasterxml.jackson.databind.ObjectMapper().readTree(s);
                    if (node.has("value") && node.get("value").isNumber()) {
                        return node.get("value").asDouble();
                    }
                    if (node.has("_value") && node.get("_value").isNumber()) {
                        return node.get("_value").asDouble();
                    }
                    com.fasterxml.jackson.databind.JsonNode props = node.get("properties");
                    if (props != null && props.isObject()) {
                        var it = props.fields();
                        if (it.hasNext()) {
                            var entry = it.next();
                            if (entry.getValue().isNumber()) {
                                return entry.getValue().asDouble();
                            }
                        }
                    }
                    var fields = node.fields();
                    while (fields.hasNext()) {
                        var entry = fields.next();
                        if (entry.getKey().startsWith("_")) {
                            continue;
                        }
                        if (entry.getValue().isNumber()) {
                            return entry.getValue().asDouble();
                        }
                    }
                } catch (Exception ignored) {
                    return null;
                }
            }
            return null;
        }
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}

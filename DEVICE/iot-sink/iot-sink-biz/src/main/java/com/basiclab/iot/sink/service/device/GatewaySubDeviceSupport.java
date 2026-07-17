package com.basiclab.iot.sink.service.device;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.basiclab.iot.common.domain.R;
import com.basiclab.iot.device.RemoteDeviceService;
import com.basiclab.iot.device.domain.device.vo.Device;
import com.basiclab.iot.device.domain.device.vo.EnsureDeviceOnUplinkParam;
import com.basiclab.iot.device.domain.device.vo.EnsureGatewaySubDeviceParam;
import com.basiclab.iot.sink.biz.dto.IotDeviceRespDTO;
import com.basiclab.iot.sink.enums.IotDeviceTopicEnum;
import com.basiclab.iot.sink.mq.message.IotDeviceMessage;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 网关代报子设备：从 payload 解析子设备标识，必要时自动创建并改写消息归属。
 */
@Slf4j
@Component
public class GatewaySubDeviceSupport {

    @Autowired(required = false)
    private RemoteDeviceService remoteDeviceService;

    @Autowired(required = false)
    private DeviceService deviceService;

    public static boolean isSubDataUpstream(IotDeviceTopicEnum topicEnum) {
        return topicEnum == IotDeviceTopicEnum.SUB_PROPERTY_UPSTREAM_REPORT
                || topicEnum == IotDeviceTopicEnum.SUB_EVENT_UPSTREAM_REPORT
                || topicEnum == IotDeviceTopicEnum.SUB_SERVICE_UPSTREAM_INVOKE_RESPONSE
                || topicEnum == IotDeviceTopicEnum.SUB_PROPERTY_UPSTREAM_DESIRED_SET_ACK;
    }

    public static boolean isTopoUpstream(IotDeviceTopicEnum topicEnum) {
        return topicEnum == IotDeviceTopicEnum.TOPO_UPSTREAM_ADD
                || topicEnum == IotDeviceTopicEnum.TOPO_UPSTREAM_DELETE
                || topicEnum == IotDeviceTopicEnum.TOPO_UPSTREAM_STATUS;
    }

    /**
     * 将网关代理上行消息改写为子设备归属（deviceId/params），并在需要时自动创建子设备。
     *
     * @return true 表示已成功绑定到子设备；false 表示应跳过后续业务存储
     */
    public boolean rewriteToSubDevice(IotDeviceMessage message, String gatewayDeviceIdentification) {
        if (message == null || StrUtil.isBlank(gatewayDeviceIdentification)) {
            return false;
        }
        SubDeviceRef ref = extractSubDeviceRef(message.getParams());
        if (ref == null || StrUtil.hasBlank(ref.getProductIdentification(), ref.getDeviceIdentification())) {
            log.warn("[rewriteToSubDevice][缺少子设备 productIdentification/deviceIdentification，gateway={}]",
                    gatewayDeviceIdentification);
            return false;
        }

        Device ensured = ensureSubDevice(gatewayDeviceIdentification, ref, message.getTenantId());
        if (ensured == null || ensured.getId() == null) {
            return false;
        }

        message.setDeviceId(String.valueOf(ensured.getId()));
        if (message.getTenantId() == null) {
            message.setTenantId(ensured.getTenantId());
        }

        Object unwrapped = unwrapBusinessParams(message.getParams(), ref);
        if (unwrapped != null) {
            message.setParams(unwrapped);
        }
        return true;
    }

    /**
     * Topic 路径上的设备不存在时：对 GATEWAY/COMMON 产品自动建档并返回 DTO。
     * SUBSET 不会在此创建（须走 rewriteToSubDevice / ensureGatewaySubDevice）。
     */
    public IotDeviceRespDTO ensurePathDevice(String productIdentification, String deviceIdentification,
                                             Long tenantId) {
        if (StrUtil.hasBlank(productIdentification, deviceIdentification)) {
            return null;
        }
        if (deviceService != null) {
            IotDeviceRespDTO existing = deviceService.getDevice(productIdentification, deviceIdentification);
            if (existing != null && existing.getId() != null) {
                return existing;
            }
        }
        if (remoteDeviceService == null) {
            log.warn("[ensurePathDevice][RemoteDeviceService 不可用，无法自动创建设备 {}/{}]",
                    productIdentification, deviceIdentification);
            return null;
        }
        EnsureDeviceOnUplinkParam param = EnsureDeviceOnUplinkParam.builder()
                .productIdentification(productIdentification)
                .deviceIdentification(deviceIdentification)
                .deviceName(null)
                .tenantId(tenantId)
                .build();
        R<Device> result = remoteDeviceService.ensureDeviceOnUplink(param);
        if (result == null || !result.isSuccess() || result.getData() == null) {
            log.warn("[ensurePathDevice][自动建档失败 product={} device={} msg={}]",
                    productIdentification, deviceIdentification,
                    result != null ? result.getMsg() : "null");
            return null;
        }
        return toRespDto(result.getData());
    }

    public static IotDeviceRespDTO toRespDto(Device device) {
        if (device == null) {
            return null;
        }
        IotDeviceRespDTO dto = new IotDeviceRespDTO();
        dto.setId(device.getId());
        dto.setProductIdentification(device.getProductIdentification());
        dto.setDeviceIdentification(device.getDeviceIdentification());
        dto.setTenantId(device.getTenantId());
        dto.setDeviceType(device.getDeviceType());
        dto.setParentIdentification(device.getParentIdentification());
        dto.setExtension(device.getExtension());
        return dto;
    }

    public List<Device> processTopoAdd(String gatewayIdentification, Object params, Long tenantId) {
        List<SubDeviceRef> refs = extractTopoDeviceInfos(params);
        List<Device> created = new ArrayList<>();
        for (SubDeviceRef ref : refs) {
            Device device = ensureSubDevice(gatewayIdentification, ref, tenantId);
            if (device != null) {
                created.add(device);
            }
        }
        return created;
    }

    public int processTopoDelete(String gatewayIdentification, Object params) {
        if (remoteDeviceService == null) {
            log.warn("[processTopoDelete][RemoteDeviceService 不可用]");
            return 0;
        }
        List<String> ids = extractDeviceIdentificationList(params);
        if (ids.isEmpty()) {
            return 0;
        }
        R<Integer> result = remoteDeviceService.detachGatewaySubDevices(gatewayIdentification, ids);
        if (result == null || !result.isSuccess()) {
            log.warn("[processTopoDelete][失败 gateway={} msg={}]", gatewayIdentification,
                    result != null ? result.getMsg() : "null");
            return 0;
        }
        return result.getData() != null ? result.getData() : 0;
    }

    public int processTopoStatus(String gatewayIdentification, Object params) {
        if (remoteDeviceService == null) {
            log.warn("[processTopoStatus][RemoteDeviceService 不可用]");
            return 0;
        }
        List<Map<String, Object>> items = extractStatusItems(params);
        if (items.isEmpty()) {
            return 0;
        }
        R<Integer> result = remoteDeviceService.updateGatewaySubDeviceStatus(gatewayIdentification, items);
        if (result == null || !result.isSuccess()) {
            log.warn("[processTopoStatus][失败 gateway={} msg={}]", gatewayIdentification,
                    result != null ? result.getMsg() : "null");
            return 0;
        }
        return result.getData() != null ? result.getData() : 0;
    }

    private Device ensureSubDevice(String gatewayIdentification, SubDeviceRef ref, Long tenantId) {
        // 优先本地查询（已存在则不必 Feign）
        if (deviceService != null) {
            IotDeviceRespDTO existing = deviceService.getDevice(
                    ref.getProductIdentification(), ref.getDeviceIdentification());
            if (existing != null && existing.getId() != null) {
                Device device = new Device();
                device.setId(existing.getId());
                device.setProductIdentification(existing.getProductIdentification());
                device.setDeviceIdentification(existing.getDeviceIdentification());
                device.setTenantId(existing.getTenantId());
                device.setParentIdentification(existing.getParentIdentification());
                device.setDeviceType(existing.getDeviceType());
                // 未绑定则走 Feign 补齐
                if (StrUtil.isNotBlank(existing.getParentIdentification())
                        && gatewayIdentification.equals(existing.getParentIdentification())) {
                    return device;
                }
            }
        }
        if (remoteDeviceService == null) {
            log.warn("[ensureSubDevice][RemoteDeviceService 不可用，无法自动创建子设备]");
            return null;
        }
        EnsureGatewaySubDeviceParam param = EnsureGatewaySubDeviceParam.builder()
                .gatewayIdentification(gatewayIdentification)
                .productIdentification(ref.getProductIdentification())
                .deviceIdentification(ref.getDeviceIdentification())
                .deviceName(ref.getDeviceName())
                .tenantId(tenantId)
                .build();
        R<Device> result = remoteDeviceService.ensureGatewaySubDevice(param);
        if (result == null || !result.isSuccess() || result.getData() == null) {
            log.warn("[ensureSubDevice][自动创建/绑定失败 gateway={} sub={}/{} msg={}]",
                    gatewayIdentification, ref.getProductIdentification(), ref.getDeviceIdentification(),
                    result != null ? result.getMsg() : "null");
            return null;
        }
        return result.getData();
    }

    @SuppressWarnings("unchecked")
    public static SubDeviceRef extractSubDeviceRef(Object params) {
        if (params == null) {
            return null;
        }
        if (params instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) params;
            // 批量：取第一项（单设备上报）
            Object subDevices = map.get("subDevices");
            if (subDevices instanceof List && !((List<?>) subDevices).isEmpty()) {
                Object first = ((List<?>) subDevices).get(0);
                if (first instanceof Map) {
                    return fromMap((Map<String, Object>) first);
                }
            }
            return fromMap(map);
        }
        try {
            JSONObject obj = JSONUtil.parseObj(params);
            if (obj.containsKey("subDevices")) {
                JSONArray arr = obj.getJSONArray("subDevices");
                if (arr != null && !arr.isEmpty()) {
                    return fromJson(arr.getJSONObject(0));
                }
            }
            return fromJson(obj);
        } catch (Exception e) {
            return null;
        }
    }

    private static SubDeviceRef fromMap(Map<String, Object> map) {
        SubDeviceRef ref = new SubDeviceRef();
        Object p = firstNonNull(map.get("productIdentification"), map.get("productId"), map.get("productKey"));
        Object d = firstNonNull(map.get("deviceIdentification"), map.get("deviceId"), map.get("nodeId"), map.get("deviceName"));
        // deviceName 字段可能是名称而非标识：仅当没有 deviceIdentification 时才用 nodeId
        if (map.get("deviceIdentification") == null && map.get("deviceId") == null && map.get("nodeId") != null) {
            d = map.get("nodeId");
        } else if (map.get("deviceIdentification") != null) {
            d = map.get("deviceIdentification");
        } else if (map.get("deviceId") != null) {
            d = map.get("deviceId");
        }
        Object name = map.get("deviceName");
        if (name == null) {
            name = map.get("name");
        }
        if (p != null) {
            ref.setProductIdentification(String.valueOf(p));
        }
        if (d != null) {
            ref.setDeviceIdentification(String.valueOf(d));
        }
        if (name != null) {
            ref.setDeviceName(String.valueOf(name));
        }
        return ref;
    }

    private static SubDeviceRef fromJson(JSONObject obj) {
        if (obj == null) {
            return null;
        }
        Map<String, Object> map = new LinkedHashMap<>();
        map.putAll(obj);
        return fromMap(map);
    }

    @SuppressWarnings("unchecked")
    private static Object unwrapBusinessParams(Object params, SubDeviceRef ref) {
        if (!(params instanceof Map)) {
            return params;
        }
        Map<String, Object> map = new LinkedHashMap<>((Map<String, Object>) params);
        if (map.containsKey("properties") && map.get("properties") != null) {
            return map.get("properties");
        }
        if (map.containsKey("input") && map.get("input") != null) {
            return map.get("input");
        }
        if (map.containsKey("data") && map.get("data") != null) {
            return map.get("data");
        }
        // 去掉信封字段，剩余作为业务 params
        map.remove("productIdentification");
        map.remove("productId");
        map.remove("productKey");
        map.remove("deviceIdentification");
        map.remove("deviceId");
        map.remove("nodeId");
        map.remove("deviceName");
        map.remove("name");
        map.remove("subDevices");
        return map.isEmpty() ? Collections.emptyMap() : map;
    }

    @SuppressWarnings("unchecked")
    private List<SubDeviceRef> extractTopoDeviceInfos(Object params) {
        List<SubDeviceRef> list = new ArrayList<>();
        if (params == null) {
            return list;
        }
        Object deviceInfos = null;
        if (params instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) params;
            deviceInfos = firstNonNull(map.get("deviceInfos"), map.get("subDevices"), map.get("devices"));
        } else {
            try {
                JSONObject obj = JSONUtil.parseObj(params);
                deviceInfos = firstNonNull(obj.get("deviceInfos"), obj.get("subDevices"), obj.get("devices"));
            } catch (Exception ignored) {
                // ignore
            }
        }
        if (deviceInfos instanceof List) {
            for (Object item : (List<?>) deviceInfos) {
                if (item instanceof Map) {
                    SubDeviceRef ref = fromMap((Map<String, Object>) item);
                    if (ref != null && StrUtil.isNotBlank(ref.getProductIdentification())
                            && StrUtil.isNotBlank(ref.getDeviceIdentification())) {
                        list.add(ref);
                    }
                }
            }
        }
        // 也支持单对象
        if (list.isEmpty()) {
            SubDeviceRef single = extractSubDeviceRef(params);
            if (single != null && StrUtil.isNotBlank(single.getProductIdentification())
                    && StrUtil.isNotBlank(single.getDeviceIdentification())) {
                list.add(single);
            }
        }
        return list;
    }

    @SuppressWarnings("unchecked")
    private List<String> extractDeviceIdentificationList(Object params) {
        List<String> ids = new ArrayList<>();
        if (params == null) {
            return ids;
        }
        Object raw = params;
        if (params instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) params;
            raw = firstNonNull(map.get("deviceIdentifications"), map.get("deviceIds"),
                    map.get("subDevices"), map.get("deviceInfos"));
        }
        if (raw instanceof List) {
            for (Object item : (List<?>) raw) {
                if (item instanceof String || item instanceof Number) {
                    ids.add(String.valueOf(item));
                } else if (item instanceof Map) {
                    Object d = firstNonNull(((Map<?, ?>) item).get("deviceIdentification"),
                            ((Map<?, ?>) item).get("deviceId"), ((Map<?, ?>) item).get("nodeId"));
                    if (d != null) {
                        ids.add(String.valueOf(d));
                    }
                }
            }
        }
        return ids;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractStatusItems(Object params) {
        List<Map<String, Object>> items = new ArrayList<>();
        if (params == null) {
            return items;
        }
        Object raw = params;
        if (params instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) params;
            raw = firstNonNull(map.get("deviceStatuses"), map.get("subDevices"), map.get("devices"), map);
            if (raw == map && map.containsKey("deviceIdentification")) {
                items.add(map);
                return items;
            }
        }
        if (raw instanceof List) {
            for (Object item : (List<?>) raw) {
                if (item instanceof Map) {
                    items.add((Map<String, Object>) item);
                }
            }
        }
        return items;
    }

    private static Object firstNonNull(Object... values) {
        if (values == null) {
            return null;
        }
        for (Object v : values) {
            if (v != null) {
                return v;
            }
        }
        return null;
    }

    @Data
    public static class SubDeviceRef {
        private String productIdentification;
        private String deviceIdentification;
        private String deviceName;
    }
}

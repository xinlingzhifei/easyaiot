package com.basiclab.iot.device.controller.device;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.basiclab.iot.common.constant.HttpStatus;
import com.basiclab.iot.common.core.context.TenantContextHolder;
import com.basiclab.iot.common.domain.TableDataInfo;
import com.basiclab.iot.common.utils.StringUtils;
import com.basiclab.iot.device.dal.pgsql.device.DeviceServiceInvokeResponseMapper;
import com.basiclab.iot.device.domain.device.vo.Device;
import com.basiclab.iot.device.domain.device.vo.DeviceServiceInvokeResponse;
import com.basiclab.iot.device.messagebus.ServiceInvokeResponseHandler;
import com.basiclab.iot.device.service.device.DeviceService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Device service invocation log endpoints.
 */
@Api(tags = "Device Service Log")
@RestController
@RequestMapping("/deviceService")
@RequiredArgsConstructor
public class DeviceServiceController {

    private final DeviceServiceInvokeResponseMapper responseMapper;
    private final DeviceService deviceService;

    @ApiOperation("List device service invocation logs")
    @GetMapping("/list")
    public TableDataInfo list(@RequestParam Long deviceId,
                              @RequestParam(defaultValue = "1") Integer page,
                              @RequestParam(defaultValue = "10") Integer pageSize,
                              @RequestParam(required = false) String status,
                              @RequestParam(required = false) String serviceName,
                              @RequestParam(required = false)
                              @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime startTime,
                              @RequestParam(required = false)
                              @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime endTime) {
        Device device = deviceService.findOneById(deviceId);
        if (device == null) {
            return tableData(List.of(), 0);
        }

        Long tenantId = TenantContextHolder.getRequiredTenantId();
        List<DeviceServiceInvokeResponse> records = responseMapper.selectByDeviceId(deviceId);
        List<DeviceServiceInvokeResponse> filtered = records.stream()
                .filter(record -> tenantId == null || tenantId.equals(record.getTenantId()))
                .filter(record -> matchesStatus(record, status))
                .filter(record -> matchesService(record, serviceName))
                .filter(record -> startTime == null || !recordTime(record).isBefore(startTime))
                .filter(record -> endTime == null || !recordTime(record).isAfter(endTime))
                .collect(Collectors.toList());

        int safePage = Math.max(page, 1);
        int safePageSize = Math.min(Math.max(pageSize, 1), 1000);
        int from = Math.min((safePage - 1) * safePageSize, filtered.size());
        int to = Math.min(from + safePageSize, filtered.size());
        List<Map<String, Object>> data = filtered.subList(from, to).stream()
                .map(this::toView)
                .collect(Collectors.toList());
        return tableData(data, filtered.size());
    }

    private boolean matchesStatus(DeviceServiceInvokeResponse record, String status) {
        return StringUtils.isEmpty(status) || status.equalsIgnoreCase(toStatus(record.getResponseCode()));
    }

    private boolean matchesService(DeviceServiceInvokeResponse record, String serviceName) {
        return StringUtils.isEmpty(serviceName) || containsIgnoreCase(record.getServiceIdentifier(), serviceName)
                || containsIgnoreCase(record.getMethod(), serviceName);
    }

    private boolean containsIgnoreCase(String value, String expected) {
        return value != null && value.toLowerCase().contains(expected.toLowerCase());
    }

    private LocalDateTime recordTime(DeviceServiceInvokeResponse record) {
        if (record.getReportTime() != null) {
            return record.getReportTime();
        }
        return record.getCreateTime() != null ? record.getCreateTime() : LocalDateTime.MIN;
    }

    private Map<String, Object> toView(DeviceServiceInvokeResponse record) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", record.getId());
        String identifier = record.getServiceIdentifier();
        boolean propertySet = "$property.set".equals(identifier)
                || "thing.property.set".equals(record.getMethod());
        view.put("serviceName", propertySet ? "属性设置" : identifier);
        view.put("serviceIdentification", identifier);
        view.put("kind", propertySet ? "PROPERTY" : "SERVICE");
        view.put("status", toStatus(record.getResponseCode()));
        view.put("requestId", record.getRequestId());
        view.put("createTime", recordTime(record));

        Object inputParams = null;
        Object outputParams = null;
        String raw = record.getResponseData();
        if (StringUtils.isNotEmpty(raw) && JSONUtil.isTypeJSON(raw)) {
            try {
                JSONObject obj = JSONUtil.parseObj(raw);
                if (obj.containsKey("input") || obj.containsKey("output")) {
                    inputParams = obj.get("input");
                    outputParams = obj.get("output");
                } else if (record.getResponseCode() != null
                        && record.getResponseCode() == ServiceInvokeResponseHandler.PENDING_CODE) {
                    inputParams = obj;
                } else {
                    // 历史 ACK 记录：无 input 包装时，补充 request 元数据，output 用原数据
                    Map<String, Object> meta = new LinkedHashMap<>();
                    meta.put("requestId", record.getRequestId());
                    meta.put("method", record.getMethod());
                    meta.put("topic", record.getTopic());
                    inputParams = meta;
                    outputParams = obj;
                }
            } catch (Exception ignored) {
                // fall through
            }
        }
        if (inputParams == null) {
            if (record.getResponseCode() != null
                    && record.getResponseCode() == ServiceInvokeResponseHandler.PENDING_CODE
                    && StringUtils.isNotEmpty(raw)) {
                inputParams = raw;
            } else {
                Map<String, Object> meta = new LinkedHashMap<>();
                meta.put("requestId", record.getRequestId());
                meta.put("method", record.getMethod());
                meta.put("topic", record.getTopic());
                if (StringUtils.isNotEmpty(raw)
                        && (record.getResponseCode() == null
                        || record.getResponseCode() == ServiceInvokeResponseHandler.PENDING_CODE)) {
                    meta.put("params", raw);
                }
                inputParams = meta;
            }
        }
        if (outputParams == null
                && (record.getResponseCode() == null
                || record.getResponseCode() != ServiceInvokeResponseHandler.PENDING_CODE)) {
            outputParams = StringUtils.isNotEmpty(raw) ? raw : record.getResponseMsg();
        }

        view.put("inputParams", inputParams);
        view.put("outputParams", outputParams);
        return view;
    }

    private String toStatus(Integer responseCode) {
        if (responseCode == null) {
            return "SUCCESS";
        }
        if (responseCode == ServiceInvokeResponseHandler.PENDING_CODE) {
            return "PENDING";
        }
        return responseCode == 0 ? "SUCCESS" : "FAILED";
    }

    private TableDataInfo tableData(List<?> data, long total) {
        TableDataInfo result = new TableDataInfo();
        result.setCode(HttpStatus.SUCCESS);
        result.setMsg("Query successful");
        result.setData(data);
        result.setTotal(total);
        return result;
    }
}

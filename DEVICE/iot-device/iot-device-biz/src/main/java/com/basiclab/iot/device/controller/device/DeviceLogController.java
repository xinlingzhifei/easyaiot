package com.basiclab.iot.device.controller.device;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.basiclab.iot.common.constant.HttpStatus;
import com.basiclab.iot.common.domain.TableDataInfo;
import com.basiclab.iot.common.utils.StringUtils;
import com.basiclab.iot.device.domain.device.vo.Device;
import com.basiclab.iot.device.service.device.DeviceService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Device-originated MQTT log query endpoints.
 */
@Api(tags = "Device MQTT Log")
@RestController
@RequestMapping("/device/log")
@RequiredArgsConstructor
public class DeviceLogController {

    private static final DateTimeFormatter[] TIME_FORMATTERS = new DateTimeFormatter[]{
            DateTimeFormatter.ISO_LOCAL_DATE_TIME,
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"),
    };

    private final DeviceService deviceService;

    @ApiOperation("List device-originated MQTT logs")
    @GetMapping("/{deviceId}")
    public TableDataInfo list(@PathVariable Long deviceId,
                              @RequestParam(defaultValue = "1") Integer page,
                              @RequestParam(defaultValue = "10") Integer pageSize,
                              @RequestParam(required = false) String actionType,
                              @RequestParam(required = false) String level,
                              @RequestParam(required = false) String keyword,
                              @RequestParam(required = false) String userName,
                              @RequestParam(required = false) String status,
                              @RequestParam(required = false)
                              @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime startTime,
                              @RequestParam(required = false)
                              @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime endTime) {
        Device device = deviceService.findOneById(deviceId);
        if (device == null || StringUtils.isEmpty(device.getExtension())) {
            return tableData(Collections.emptyList(), 0);
        }

        JSONObject extension = JSONObject.parseObject(device.getExtension());
        JSONArray storedLogs = extension.getJSONArray("logs");
        if (storedLogs == null || storedLogs.isEmpty()) {
            return tableData(Collections.emptyList(), 0);
        }

        List<Map> logs = new ArrayList<>(storedLogs.toJavaList(Map.class));
        Collections.reverse(logs);
        List<Map> filtered = logs.stream()
                .filter(log -> matchesValue(log.get("actionType"), actionType))
                .filter(log -> matchesValue(log.get("level"), level))
                .filter(log -> matchesValue(log.get("status"), status))
                .filter(log -> matchesText(log.get("userName"), userName))
                .filter(log -> matchesKeyword(log, keyword))
                .filter(log -> matchesTimeRange(log.get("createTime"), startTime, endTime))
                .collect(Collectors.toList());

        int safePage = Math.max(page, 1);
        int safePageSize = Math.min(Math.max(pageSize, 1), 1000);
        int from = Math.min((safePage - 1) * safePageSize, filtered.size());
        int to = Math.min(from + safePageSize, filtered.size());
        return tableData(filtered.subList(from, to), filtered.size());
    }

    private boolean matchesValue(Object value, String expected) {
        return StringUtils.isEmpty(expected) || expected.equalsIgnoreCase(String.valueOf(value));
    }

    private boolean matchesText(Object value, String expected) {
        return StringUtils.isEmpty(expected) || value != null
                && String.valueOf(value).toLowerCase().contains(expected.toLowerCase());
    }

    private boolean matchesKeyword(Map log, String keyword) {
        if (StringUtils.isEmpty(keyword)) {
            return true;
        }
        String lower = keyword.toLowerCase();
        Object content = log.get("content");
        if (content != null && String.valueOf(content).toLowerCase().contains(lower)) {
            return true;
        }
        Object actionData = log.get("actionData");
        return actionData != null && String.valueOf(actionData).toLowerCase().contains(lower);
    }

    private boolean matchesTimeRange(Object createTime, LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null && endTime == null) {
            return true;
        }
        LocalDateTime time = parseTime(createTime);
        if (time == null) {
            return true;
        }
        if (startTime != null && time.isBefore(startTime)) {
            return false;
        }
        return endTime == null || !time.isAfter(endTime);
    }

    private LocalDateTime parseTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDateTime) {
            return (LocalDateTime) value;
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            return null;
        }
        // 兼容 2026-07-16T02:55:23.123 与带 Z 的 ISO
        text = text.replace("Z", "");
        for (DateTimeFormatter formatter : TIME_FORMATTERS) {
            try {
                return LocalDateTime.parse(text, formatter);
            } catch (DateTimeParseException ignored) {
                // try next
            }
        }
        try {
            if (text.length() >= 19) {
                return LocalDateTime.parse(text.substring(0, 19), DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
            }
        } catch (Exception ignored) {
            // ignore
        }
        return null;
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

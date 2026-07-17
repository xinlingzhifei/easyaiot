package com.basiclab.iot.device.controller.device;

import com.alibaba.fastjson2.JSONObject;
import com.basiclab.iot.common.domain.R;
import com.basiclab.iot.common.utils.StringUtils;
import com.basiclab.iot.device.domain.device.vo.Device;
import com.basiclab.iot.device.service.device.DeviceService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Device shadow query endpoints.
 */
@Api(tags = "Device Shadow")
@RestController
@RequestMapping("/shadow")
@RequiredArgsConstructor
public class DeviceShadowController {

    private final DeviceService deviceService;

    @ApiOperation("Get the latest device shadow (reported / desired / delta)")
    @GetMapping("/{deviceId}")
    public R<?> getDeviceShadow(@PathVariable Long deviceId) {
        Device device = deviceService.findOneById(deviceId);
        Map<String, Object> result = new LinkedHashMap<>();
        if (device == null) {
            result.put("shadow", Collections.emptyMap());
            result.put("reported", Collections.emptyMap());
            result.put("desired", Collections.emptyMap());
            result.put("delta", Collections.emptyMap());
            result.put("version", null);
            result.put("updateTime", null);
            result.put("connectStatus", null);
            return R.ok(result);
        }

        JSONObject extension = StringUtils.isEmpty(device.getExtension())
                ? new JSONObject() : JSONObject.parseObject(device.getExtension());
        if (extension == null) {
            extension = new JSONObject();
        }

        Object shadowRaw = extension.getOrDefault("shadow", Collections.emptyMap());
        Map<String, Object> shadowMap = toMap(shadowRaw);

        Map<String, Object> reported = firstNonEmptyMap(
                toMap(shadowMap.get("reported")),
                toMap(extension.get("properties")),
                flattenReported(shadowMap)
        );
        Map<String, Object> desired = firstNonEmptyMap(
                toMap(shadowMap.get("desired")),
                toMap(extension.get("desired"))
        );

        Map<String, Object> delta = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : desired.entrySet()) {
            Object reportedVal = reported.get(entry.getKey());
            if (!Objects.equals(stringify(reportedVal), stringify(entry.getValue()))) {
                delta.put(entry.getKey(), entry.getValue());
            }
        }

        Object version = shadowMap.get("version");
        Object updateTime = extension.get("shadowUpdateTime");
        if (updateTime == null) {
            updateTime = extension.get("desiredUpdateTime");
        }

        // 兼容旧前端：shadow 优先返回含 reported/desired 的结构
        Map<String, Object> shadowView = new LinkedHashMap<>();
        if (!reported.isEmpty()) {
            shadowView.put("reported", reported);
        }
        if (!desired.isEmpty()) {
            shadowView.put("desired", desired);
        }
        if (version != null) {
            shadowView.put("version", version);
        }
        if (shadowView.isEmpty()) {
            shadowView.putAll(shadowMap);
        }

        result.put("shadow", shadowView);
        result.put("reported", reported);
        result.put("desired", desired);
        result.put("delta", delta);
        result.put("version", version);
        result.put("updateTime", updateTime != null ? updateTime : device.getUpdateTime());
        result.put("connectStatus", device.getConnectStatus());
        return R.ok(result);
    }

    private static Map<String, Object> flattenReported(Map<String, Object> shadowMap) {
        if (shadowMap == null || shadowMap.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, Object> flat = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : shadowMap.entrySet()) {
            String key = entry.getKey();
            if ("reported".equals(key) || "desired".equals(key) || "metadata".equals(key)
                    || "version".equals(key) || "timestamp".equals(key) || "updateTime".equals(key)) {
                continue;
            }
            flat.put(key, entry.getValue());
        }
        return flat;
    }

    @SafeVarargs
    private static Map<String, Object> firstNonEmptyMap(Map<String, Object>... candidates) {
        for (Map<String, Object> candidate : candidates) {
            if (candidate != null && !candidate.isEmpty()) {
                return candidate;
            }
        }
        return Collections.emptyMap();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> toMap(Object value) {
        if (value == null) {
            return Collections.emptyMap();
        }
        if (value instanceof Map) {
            return new LinkedHashMap<>((Map<String, Object>) value);
        }
        if (value instanceof String && StringUtils.isNotEmpty((String) value)) {
            try {
                JSONObject obj = JSONObject.parseObject((String) value);
                return obj != null ? new LinkedHashMap<>(obj) : Collections.emptyMap();
            } catch (Exception ignored) {
                return Collections.emptyMap();
            }
        }
        if (value instanceof JSONObject) {
            return new LinkedHashMap<>((JSONObject) value);
        }
        return Collections.emptyMap();
    }

    private static String stringify(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof Map || value instanceof Iterable) {
            return JSONObject.toJSONString(value);
        }
        return String.valueOf(value);
    }
}

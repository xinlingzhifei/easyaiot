package com.basiclab.iot.sink.util;

import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * 算法任务告警触发类别过滤（与 VIDEO alert_class_filter.py 规则一致）。
 */
public final class AlertClassFilter {

    private AlertClassFilter() {
    }

    public static String normalizeClassName(String className) {
        if (!StringUtils.hasText(className)) {
            return "";
        }
        return className.trim().toLowerCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
    }

    @SuppressWarnings("unchecked")
    public static List<String> parseAlertClassNames(Object raw) {
        if (raw == null) {
            return Collections.emptyList();
        }
        List<Object> names;
        if (raw instanceof List) {
            names = (List<Object>) raw;
        } else if (raw instanceof String) {
            String text = ((String) raw).trim();
            if (!StringUtils.hasText(text)) {
                return Collections.emptyList();
            }
            if (text.startsWith("[")) {
                try {
                    List<Object> parsed = com.basiclab.iot.common.utils.json.JsonUtils.parseObject(
                            text, new com.fasterxml.jackson.core.type.TypeReference<List<Object>>() {});
                    names = parsed != null ? parsed : Collections.singletonList(text);
                } catch (Exception e) {
                    names = Collections.singletonList(text);
                }
            } else {
                names = Collections.singletonList(text);
            }
        } else {
            return Collections.emptyList();
        }

        Set<String> seen = new LinkedHashSet<>();
        List<String> result = new ArrayList<>();
        for (Object item : names) {
            if (item == null) {
                continue;
            }
            String label = String.valueOf(item).trim();
            if (!StringUtils.hasText(label)) {
                continue;
            }
            String key = normalizeClassName(label);
            if (seen.contains(key)) {
                continue;
            }
            seen.add(key);
            result.add(label);
        }
        return result;
    }

    public static List<Map<String, Object>> filterDetectionsForAlert(
            List<Map<String, Object>> detections,
            Object alertClassNames) {
        if (detections == null || detections.isEmpty()) {
            return Collections.emptyList();
        }
        List<String> allowed = parseAlertClassNames(alertClassNames);
        if (allowed.isEmpty()) {
            return detections;
        }
        Set<String> allowedSet = new HashSet<>();
        for (String name : allowed) {
            allowedSet.add(normalizeClassName(name));
        }
        List<Map<String, Object>> filtered = new ArrayList<>();
        for (Map<String, Object> det : detections) {
            if (det == null) {
                continue;
            }
            Object rawName = det.get("class_name");
            if (rawName == null) {
                rawName = det.get("className");
            }
            String className = rawName != null ? String.valueOf(rawName) : "unknown";
            if (allowedSet.contains(normalizeClassName(className))) {
                filtered.add(det);
            }
        }
        return filtered;
    }
}

package com.basiclab.iot.system.service.supervision;

import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCameraPermissionRequest;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCameraPermissionResolver;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@ConfigurationProperties(prefix = "yfeieye.review.camera-permission")
public class ConfiguredReviewCameraPermissionResolver implements ReviewCameraPermissionResolver {

    private Map<Long, List<String>> users = new LinkedHashMap<>();
    private Map<Long, List<String>> tenants = new LinkedHashMap<>();
    private List<String> defaultAllowedCameraIds = List.of();
    private boolean failClosed = true;

    @Override
    public List<String> resolveAllowedCameraIds(ReviewCameraPermissionRequest request) {
        if (request == null) {
            return null;
        }
        if (request.operatorUserId() != null && users.containsKey(request.operatorUserId())) {
            return normalizeCameraIds(users.get(request.operatorUserId()));
        }
        if (request.tenantId() != null && tenants.containsKey(request.tenantId())) {
            return normalizeCameraIds(tenants.get(request.tenantId()));
        }
        List<String> normalizedDefaultAllowedCameraIds = normalizeCameraIds(defaultAllowedCameraIds);
        if (normalizedDefaultAllowedCameraIds != null && !normalizedDefaultAllowedCameraIds.isEmpty()) {
            return normalizedDefaultAllowedCameraIds;
        }
        return failClosed && request.operatorUserId() != null ? List.of() : null;
    }

    private static List<String> normalizeCameraIds(List<String> cameraIds) {
        if (cameraIds == null) {
            return null;
        }
        return cameraIds.stream()
                .filter(cameraId -> cameraId != null && !cameraId.trim().isEmpty())
                .map(String::trim)
                .distinct()
                .toList();
    }

    public Map<Long, List<String>> getUsers() {
        return users;
    }

    public void setUsers(Map<Long, List<String>> users) {
        this.users = users == null ? new LinkedHashMap<>() : users;
    }

    public Map<Long, List<String>> getTenants() {
        return tenants;
    }

    public void setTenants(Map<Long, List<String>> tenants) {
        this.tenants = tenants == null ? new LinkedHashMap<>() : tenants;
    }

    public List<String> getDefaultAllowedCameraIds() {
        return defaultAllowedCameraIds;
    }

    public void setDefaultAllowedCameraIds(List<String> defaultAllowedCameraIds) {
        this.defaultAllowedCameraIds = defaultAllowedCameraIds == null ? List.of() : defaultAllowedCameraIds;
    }

    public boolean isFailClosed() {
        return failClosed;
    }

    public void setFailClosed(boolean failClosed) {
        this.failClosed = failClosed;
    }
}

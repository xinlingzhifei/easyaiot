package com.basiclab.iot.system.service.supervision;

import com.basiclab.iot.system.service.permission.PermissionService;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCameraPermissionRequest;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCameraPermissionResolver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@ConfigurationProperties(prefix = "yfeieye.review.camera-permission")
public class ConfiguredReviewCameraPermissionResolver implements ReviewCameraPermissionResolver {

    private Map<Long, List<String>> users = new LinkedHashMap<>();
    private Map<Long, List<String>> tenants = new LinkedHashMap<>();
    private Map<String, List<String>> actionPermissions = new LinkedHashMap<>();
    private List<String> defaultAllowedCameraIds = List.of();
    private boolean failClosed = true;
    private PermissionService permissionService;

    @Override
    public List<String> resolveAllowedCameraIds(ReviewCameraPermissionRequest request) {
        if (request == null) {
            return null;
        }
        if (!hasRequiredActionPermission(request)) {
            return List.of();
        }
        if (request.operatorUserId() != null && users.containsKey(request.operatorUserId())) {
            return normalizeValues(users.get(request.operatorUserId()));
        }
        if (request.tenantId() != null && tenants.containsKey(request.tenantId())) {
            return normalizeValues(tenants.get(request.tenantId()));
        }
        List<String> normalizedDefaultAllowedCameraIds = normalizeValues(defaultAllowedCameraIds);
        if (normalizedDefaultAllowedCameraIds != null && !normalizedDefaultAllowedCameraIds.isEmpty()) {
            return normalizedDefaultAllowedCameraIds;
        }
        return failClosed && request.operatorUserId() != null ? List.of() : null;
    }

    private boolean hasRequiredActionPermission(ReviewCameraPermissionRequest request) {
        List<String> permissions = actionPermissions.get(normalizeActionType(request.actionType()));
        List<String> normalizedPermissions = normalizeValues(permissions);
        if (normalizedPermissions == null || normalizedPermissions.isEmpty()) {
            return true;
        }
        if (permissionService == null || request.operatorUserId() == null) {
            return false;
        }
        return permissionService.hasAnyPermissions(request.operatorUserId(), normalizedPermissions.toArray(String[]::new));
    }

    private static String normalizeActionType(String actionType) {
        return actionType == null ? "" : actionType.trim().toLowerCase(Locale.ROOT);
    }

    private static List<String> normalizeValues(List<String> values) {
        if (values == null) {
            return null;
        }
        return values.stream()
                .filter(value -> value != null && !value.trim().isEmpty())
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

    public Map<String, List<String>> getActionPermissions() {
        return actionPermissions;
    }

    public void setActionPermissions(Map<String, List<String>> actionPermissions) {
        this.actionPermissions = actionPermissions == null ? new LinkedHashMap<>() : actionPermissions;
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

    @Autowired(required = false)
    public void setPermissionService(PermissionService permissionService) {
        this.permissionService = permissionService;
    }
}

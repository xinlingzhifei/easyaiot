package com.basiclab.iot.system.supervision;

import com.basiclab.iot.system.api.permission.dto.DeptDataPermissionRespDTO;
import com.basiclab.iot.system.service.permission.PermissionService;
import com.basiclab.iot.system.service.supervision.ConfiguredReviewCameraPermissionResolver;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCameraPermissionRequest;
import org.junit.jupiter.api.Test;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ConfiguredReviewCameraPermissionResolverTest {

    @Test
    void userScopeOverridesTenantAndDefaultAndNormalizesValues() {
        ConfiguredReviewCameraPermissionResolver resolver = new ConfiguredReviewCameraPermissionResolver();
        resolver.setUsers(Map.of(7L, List.of(" camera-01 ", "", "camera-01", "camera-02")));
        resolver.setTenants(Map.of(10L, List.of("tenant-camera")));
        resolver.setDefaultAllowedCameraIds(List.of("default-camera"));

        List<String> allowed = resolver.resolveAllowedCameraIds(
                new ReviewCameraPermissionRequest(1L, 7L, 10L, "playback", null));

        assertEquals(List.of("camera-01", "camera-02"), allowed);
    }

    @Test
    void tenantAndDefaultScopesAreUsedBeforeFailClosed() {
        ConfiguredReviewCameraPermissionResolver tenantResolver = new ConfiguredReviewCameraPermissionResolver();
        tenantResolver.setTenants(Map.of(10L, List.of("tenant-camera")));

        assertEquals(
                List.of("tenant-camera"),
                tenantResolver.resolveAllowedCameraIds(
                        new ReviewCameraPermissionRequest(1L, 8L, 10L, "export", null))
        );

        ConfiguredReviewCameraPermissionResolver defaultResolver = new ConfiguredReviewCameraPermissionResolver();
        defaultResolver.setDefaultAllowedCameraIds(List.of("default-camera"));

        assertEquals(
                List.of("default-camera"),
                defaultResolver.resolveAllowedCameraIds(
                        new ReviewCameraPermissionRequest(1L, 8L, 11L, "download", null))
        );

        ConfiguredReviewCameraPermissionResolver failClosedResolver = new ConfiguredReviewCameraPermissionResolver();

        assertEquals(
                List.of(),
                failClosedResolver.resolveAllowedCameraIds(
                        new ReviewCameraPermissionRequest(1L, 8L, 11L, "download", null))
        );
        assertNull(failClosedResolver.resolveAllowedCameraIds(
                new ReviewCameraPermissionRequest(1L, null, 11L, "download", null)));
    }

    @Test
    void failOpenCanBeConfiguredForTemporaryUnrestrictedInternalUse() {
        ConfiguredReviewCameraPermissionResolver resolver = new ConfiguredReviewCameraPermissionResolver();
        resolver.setFailClosed(false);

        assertNull(resolver.resolveAllowedCameraIds(
                new ReviewCameraPermissionRequest(1L, 8L, 11L, "playback", null)));
    }

    @Test
    void configuredScopesRequireRealActionPermissionWhenPermissionServiceIsPresent() {
        ConfiguredReviewCameraPermissionResolver resolver = new ConfiguredReviewCameraPermissionResolver();
        resolver.setUsers(Map.of(7L, List.of("camera-01")));
        resolver.setActionPermissions(Map.of("download", List.of("system:supervision-alert-review:media:download")));
        CapturingPermissionService permissionService = new CapturingPermissionService();
        resolver.setPermissionService(permissionService);

        ReviewCameraPermissionRequest request = new ReviewCameraPermissionRequest(1L, 7L, 10L, "download", null);

        assertEquals(List.of(), resolver.resolveAllowedCameraIds(request));
        assertEquals(7L, permissionService.checkedUserId);
        assertEquals(List.of("system:supervision-alert-review:media:download"), permissionService.checkedPermissions);

        permissionService.allowed = true;

        assertEquals(List.of("camera-01"), resolver.resolveAllowedCameraIds(request));
    }

    private static final class CapturingPermissionService implements PermissionService {

        private boolean allowed;
        private Long checkedUserId;
        private List<String> checkedPermissions = List.of();

        @Override
        public boolean hasAnyPermissions(Long userId, String... permissions) {
            checkedUserId = userId;
            checkedPermissions = permissions == null ? List.of() : List.of(permissions);
            return allowed;
        }

        @Override
        public boolean hasAnyRoles(Long userId, String... roles) {
            return false;
        }

        @Override
        public void assignRoleMenu(Long roleId, Set<Long> menuIds) {
        }

        @Override
        public void processRoleDeleted(Long roleId) {
        }

        @Override
        public void processMenuDeleted(Long menuId) {
        }

        @Override
        public Set<Long> getRoleMenuListByRoleId(Collection<Long> roleIds) {
            return Set.of();
        }

        @Override
        public Set<Long> getMenuRoleIdListByMenuIdFromCache(Long menuId) {
            return Set.of();
        }

        @Override
        public void assignUserRole(Long userId, Set<Long> roleIds) {
        }

        @Override
        public void processUserDeleted(Long userId) {
        }

        @Override
        public Set<Long> getUserRoleIdListByRoleId(Collection<Long> roleIds) {
            return Set.of();
        }

        @Override
        public Set<Long> getUserRoleIdListByUserId(Long userId) {
            return Set.of();
        }

        @Override
        public Set<Long> getUserRoleIdListByUserIdFromCache(Long userId) {
            return Set.of();
        }

        @Override
        public void assignRoleDataScope(Long roleId, Integer dataScope, Set<Long> dataScopeDeptIds) {
        }

        @Override
        public DeptDataPermissionRespDTO getDeptDataPermission(Long userId) {
            return null;
        }
    }
}

package com.basiclab.iot.system.supervision;

import com.basiclab.iot.system.service.supervision.ConfiguredReviewCameraPermissionResolver;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCameraPermissionRequest;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

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
}

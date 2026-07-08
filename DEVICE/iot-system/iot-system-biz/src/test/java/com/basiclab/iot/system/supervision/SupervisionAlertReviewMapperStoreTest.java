package com.basiclab.iot.system.supervision;

import com.basiclab.iot.common.core.context.TenantContextHolder;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewItemDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewSegmentDO;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewCaseAuditMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewCaseItemMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewCaseMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewEvidenceMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewExportJobMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewIngestIdentityMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewItemMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewReportAckMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewRuleMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewRuntimeLockMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewRuntimeOutboxMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewRuntimeRunMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewSegmentMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewSemanticIndexMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewUserStatusMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionEventMapper;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewMapperStore;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewItemDraft;
import org.junit.jupiter.api.Test;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SupervisionAlertReviewMapperStoreTest {

    @Test
    void createBindsTenantIdFromCurrentTenantContext() {
        AtomicReference<SupervisionAlertReviewItemDO> insertedItem = new AtomicReference<>();
        SupervisionAlertReviewItemMapper reviewItemMapper = mapper(SupervisionAlertReviewItemMapper.class, (proxy, method, args) -> {
            if ("insert".equals(method.getName())) {
                SupervisionAlertReviewItemDO itemDO = (SupervisionAlertReviewItemDO) args[0];
                itemDO.setId(101L);
                insertedItem.set(itemDO);
                return 1;
            }
            return defaultValue(method.getReturnType());
        });
        SupervisionAlertReviewSegmentMapper reviewSegmentMapper = mapper(
                SupervisionAlertReviewSegmentMapper.class,
                (proxy, method, args) -> defaultValue(method.getReturnType())
        );
        SupervisionAlertReviewCaseItemMapper reviewCaseItemMapper = mapper(
                SupervisionAlertReviewCaseItemMapper.class,
                (proxy, method, args) -> defaultValue(method.getReturnType())
        );
        SupervisionAlertReviewMapperStore store = newStore(
                reviewItemMapper,
                reviewSegmentMapper,
                reviewCaseItemMapper
        );
        LocalDateTime alertTime = LocalDateTime.of(2026, 7, 4, 10, 15);

        try {
            TenantContextHolder.setTenantId(1001L);
            store.create(new ReviewItemDraft(
                    "video",
                    "alert-tenant-store",
                    "restricted_area",
                    "restricted_area",
                    alertTime,
                    "device-01",
                    "camera-01",
                    "zone-a",
                    "person",
                    "hash-tenant-store",
                    Map.of(),
                    "not_required",
                    alertTime,
                    null
            ), List.of());
        } finally {
            TenantContextHolder.clear();
        }

        assertEquals(1001L, insertedItem.get().getTenantId());
    }

    @Test
    void createRejectsOverlappingReviewSegmentBeforeSegmentInsert() {
        LocalDateTime startTime = LocalDateTime.of(2026, 7, 4, 10, 15);
        LocalDateTime endTime = startTime.plusSeconds(30);
        AtomicInteger segmentInserts = new AtomicInteger();
        SupervisionAlertReviewItemMapper reviewItemMapper = mapper(SupervisionAlertReviewItemMapper.class, (proxy, method, args) -> {
            if ("insert".equals(method.getName())) {
                SupervisionAlertReviewItemDO itemDO = (SupervisionAlertReviewItemDO) args[0];
                itemDO.setId(100L);
                return 1;
            }
            return defaultValue(method.getReturnType());
        });
        SupervisionAlertReviewSegmentMapper reviewSegmentMapper = mapper(SupervisionAlertReviewSegmentMapper.class, (proxy, method, args) -> {
            if ("selectOverlapping".equals(method.getName())) {
                return List.of(new SupervisionAlertReviewSegmentDO()
                        .setTenantId(0L)
                        .setReviewItemId(200L)
                        .setCameraId("camera-01")
                        .setStartTime(startTime.minusSeconds(10))
                        .setEndTime(startTime.plusSeconds(10)));
            }
            if ("insert".equals(method.getName())) {
                segmentInserts.incrementAndGet();
                return 1;
            }
            return defaultValue(method.getReturnType());
        });
        SupervisionAlertReviewCaseItemMapper reviewCaseItemMapper = mapper(
                SupervisionAlertReviewCaseItemMapper.class,
                (proxy, method, args) -> defaultValue(method.getReturnType())
        );

        SupervisionAlertReviewMapperStore store = newStore(
                reviewItemMapper,
                reviewSegmentMapper,
                reviewCaseItemMapper
        );

        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> store.create(new ReviewItemDraft(
                        "video",
                        "alert-overlap-store",
                        "restricted_area",
                        "restricted_area",
                        startTime,
                        "device-01",
                        "camera-01",
                        "zone-a",
                        "person",
                        "hash-overlap-store",
                        Map.of("reviewSegment", Map.of(
                                "segmentId", "seg-overlap-store",
                                "cameraId", "camera-01",
                                "status", "alert",
                                "severity", "alert",
                                "startTime", startTime.toString(),
                                "endTime", endTime.toString(),
                                "objectIds", List.of("obj-overlap-store"),
                                "zones", List.of("zone-a"),
                                "sourceAlertIds", List.of("alert-overlap-store")
                        )),
                        "not_required",
                        startTime,
                        null
                ), List.of()));

        assertTrue(error.getMessage().contains("overlapping review segment"));
        assertEquals(0, segmentInserts.get());
    }

    @Test
    void createRejectsReviewSegmentWithoutCameraBeforeSegmentInsert() {
        LocalDateTime startTime = LocalDateTime.of(2026, 7, 4, 10, 25);
        AtomicInteger segmentInserts = new AtomicInteger();
        SupervisionAlertReviewItemMapper reviewItemMapper = mapper(SupervisionAlertReviewItemMapper.class, (proxy, method, args) -> {
            if ("insert".equals(method.getName())) {
                SupervisionAlertReviewItemDO itemDO = (SupervisionAlertReviewItemDO) args[0];
                itemDO.setId(102L);
                return 1;
            }
            return defaultValue(method.getReturnType());
        });
        SupervisionAlertReviewSegmentMapper reviewSegmentMapper = mapper(SupervisionAlertReviewSegmentMapper.class, (proxy, method, args) -> {
            if ("insert".equals(method.getName())) {
                segmentInserts.incrementAndGet();
                return 1;
            }
            return defaultValue(method.getReturnType());
        });
        SupervisionAlertReviewMapperStore store = newStore(
                reviewItemMapper,
                reviewSegmentMapper,
                noopMapper(SupervisionAlertReviewCaseItemMapper.class)
        );

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> store.create(new ReviewItemDraft(
                        "video",
                        "alert-missing-segment-camera",
                        "restricted_area",
                        "restricted_area",
                        startTime,
                        "device-01",
                        null,
                        "zone-a",
                        "person",
                        "hash-missing-segment-camera",
                        Map.of("reviewSegment", Map.of(
                                "segmentId", "seg-missing-camera",
                                "status", "alert",
                                "severity", "alert",
                                "startTime", startTime.toString(),
                                "endTime", startTime.plusSeconds(20).toString(),
                                "sourceAlertIds", List.of("alert-missing-segment-camera")
                        )),
                        "not_required",
                        startTime,
                        null
                ), List.of()));

        assertTrue(error.getMessage().contains("review segment cameraId is required"));
        assertEquals(0, segmentInserts.get());
    }

    @Test
    void createRejectsInvalidReviewSegmentStatusBeforeSegmentInsert() {
        LocalDateTime startTime = LocalDateTime.of(2026, 7, 4, 10, 35);
        AtomicInteger segmentInserts = new AtomicInteger();
        SupervisionAlertReviewItemMapper reviewItemMapper = mapper(SupervisionAlertReviewItemMapper.class, (proxy, method, args) -> {
            if ("insert".equals(method.getName())) {
                SupervisionAlertReviewItemDO itemDO = (SupervisionAlertReviewItemDO) args[0];
                itemDO.setId(103L);
                return 1;
            }
            return defaultValue(method.getReturnType());
        });
        SupervisionAlertReviewSegmentMapper reviewSegmentMapper = mapper(SupervisionAlertReviewSegmentMapper.class, (proxy, method, args) -> {
            if ("insert".equals(method.getName())) {
                segmentInserts.incrementAndGet();
                return 1;
            }
            return defaultValue(method.getReturnType());
        });
        SupervisionAlertReviewMapperStore store = newStore(
                reviewItemMapper,
                reviewSegmentMapper,
                noopMapper(SupervisionAlertReviewCaseItemMapper.class)
        );

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> store.create(new ReviewItemDraft(
                        "video",
                        "alert-invalid-segment-status",
                        "restricted_area",
                        "restricted_area",
                        startTime,
                        "device-01",
                        "camera-01",
                        "zone-a",
                        "person",
                        "hash-invalid-segment-status",
                        Map.of("reviewSegment", Map.of(
                                "segmentId", "seg-invalid-status",
                                "cameraId", "camera-01",
                                "status", "paused",
                                "severity", "alert",
                                "startTime", startTime.toString(),
                                "endTime", startTime.plusSeconds(20).toString(),
                                "sourceAlertIds", List.of("alert-invalid-segment-status")
                        )),
                        "not_required",
                        startTime,
                        null
                ), List.of()));

        assertTrue(error.getMessage().contains("review segment status must be active, detection, alert, or ended"));
        assertEquals(0, segmentInserts.get());
    }

    @Test
    void createScopesReviewSegmentOverlapProbeByTenant() {
        LocalDateTime startTime = LocalDateTime.of(2026, 7, 4, 10, 45);
        AtomicInteger overlapArgCount = new AtomicInteger();
        AtomicReference<Object[]> overlapArgs = new AtomicReference<>();
        SupervisionAlertReviewItemMapper reviewItemMapper = mapper(SupervisionAlertReviewItemMapper.class, (proxy, method, args) -> {
            if ("insert".equals(method.getName())) {
                SupervisionAlertReviewItemDO itemDO = (SupervisionAlertReviewItemDO) args[0];
                itemDO.setId(101L);
                return 1;
            }
            return defaultValue(method.getReturnType());
        });
        SupervisionAlertReviewSegmentMapper reviewSegmentMapper = mapper(SupervisionAlertReviewSegmentMapper.class, (proxy, method, args) -> {
            if ("selectOverlapping".equals(method.getName())) {
                overlapArgCount.set(args == null ? 0 : args.length);
                overlapArgs.set(args);
                return List.of();
            }
            return defaultValue(method.getReturnType());
        });
        SupervisionAlertReviewMapperStore store = newStore(
                reviewItemMapper,
                reviewSegmentMapper,
                noopMapper(SupervisionAlertReviewCaseItemMapper.class)
        );

        try {
            TenantContextHolder.setTenantId(1001L);
            store.create(new ReviewItemDraft(
                    "video",
                    "alert-tenant-segment-store",
                    "restricted_area",
                    "restricted_area",
                    startTime,
                    "device-01",
                    "camera-01",
                    "zone-a",
                    "person",
                    "hash-tenant-segment-store",
                    Map.of("reviewSegment", Map.of(
                            "segmentId", "seg-tenant-store",
                            "cameraId", "camera-01",
                            "status", "alert",
                            "severity", "alert",
                            "startTime", startTime.toString(),
                            "endTime", startTime.plusSeconds(20).toString(),
                            "objectIds", List.of("obj-tenant-store"),
                            "zones", List.of("zone-a"),
                            "sourceAlertIds", List.of("alert-tenant-segment-store")
                    )),
                    "not_required",
                    startTime,
                    null
            ), List.of());
        } finally {
            TenantContextHolder.clear();
        }

        assertEquals(4, overlapArgCount.get());
        assertEquals(1001L, overlapArgs.get()[0]);
        assertEquals("camera-01", overlapArgs.get()[1]);
    }

    @Test
    void createPersistsNonEndedReviewSegmentAsOpenInterval() {
        LocalDateTime startTime = LocalDateTime.of(2026, 7, 4, 10, 50);
        AtomicReference<Object[]> overlapArgs = new AtomicReference<>();
        AtomicReference<SupervisionAlertReviewSegmentDO> insertedSegment = new AtomicReference<>();
        SupervisionAlertReviewItemMapper reviewItemMapper = mapper(SupervisionAlertReviewItemMapper.class, (proxy, method, args) -> {
            if ("insert".equals(method.getName())) {
                SupervisionAlertReviewItemDO itemDO = (SupervisionAlertReviewItemDO) args[0];
                itemDO.setId(104L);
                return 1;
            }
            return defaultValue(method.getReturnType());
        });
        SupervisionAlertReviewSegmentMapper reviewSegmentMapper = mapper(SupervisionAlertReviewSegmentMapper.class, (proxy, method, args) -> {
            if ("selectOverlapping".equals(method.getName())) {
                overlapArgs.set(args);
                return List.of();
            }
            if ("insert".equals(method.getName())) {
                insertedSegment.set((SupervisionAlertReviewSegmentDO) args[0]);
                return 1;
            }
            return defaultValue(method.getReturnType());
        });
        SupervisionAlertReviewMapperStore store = newStore(
                reviewItemMapper,
                reviewSegmentMapper,
                noopMapper(SupervisionAlertReviewCaseItemMapper.class)
        );

        store.create(new ReviewItemDraft(
                "video",
                "alert-open-segment-store",
                "restricted_area",
                "motion_detection",
                startTime,
                "device-01",
                "camera-01",
                "zone-a",
                "person",
                "hash-open-segment-store",
                Map.of("reviewSegment", Map.of(
                        "segmentId", "seg-open-store",
                        "cameraId", "camera-01",
                        "status", "active",
                        "severity", "detection",
                        "startTime", startTime.toString(),
                        "endTime", startTime.toString(),
                        "objectIds", List.of("obj-open-store"),
                        "zones", List.of("zone-a"),
                        "sourceAlertIds", List.of("alert-open-segment-store")
                )),
                "not_required",
                startTime,
                null
        ), List.of());

        assertNull(overlapArgs.get()[3]);
        assertNull(insertedSegment.get().getEndTime());
        assertEquals("active", insertedSegment.get().getSegmentStatus());
    }

    @Test
    void updateReviewStatusRejectsConcurrentStatusConflict() {
        LocalDateTime firstReviewedAt = LocalDateTime.of(2026, 7, 4, 11, 0);
        LocalDateTime ignoredAt = LocalDateTime.of(2026, 7, 4, 11, 1);
        AtomicInteger selectCount = new AtomicInteger();
        AtomicInteger conditionalUpdateCount = new AtomicInteger();
        SupervisionAlertReviewItemMapper reviewItemMapper = mapper(SupervisionAlertReviewItemMapper.class, (proxy, method, args) -> {
            if ("selectById".equals(method.getName())) {
                if (selectCount.incrementAndGet() == 1) {
                    return reviewItem(101L, SupervisionAlertReviewService.STATUS_PENDING_REVIEW, null, null);
                }
                return reviewItem(101L, SupervisionAlertReviewService.STATUS_REVIEWED, 9001L, firstReviewedAt);
            }
            if ("updateReviewStatusIfCurrent".equals(method.getName())) {
                conditionalUpdateCount.incrementAndGet();
                return 0;
            }
            return defaultValue(method.getReturnType());
        });
        SupervisionAlertReviewMapperStore store = newStore(
                reviewItemMapper,
                noopMapper(SupervisionAlertReviewSegmentMapper.class),
                noopMapper(SupervisionAlertReviewCaseItemMapper.class)
        );

        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> store.updateReviewStatus(
                        101L,
                        SupervisionAlertReviewService.STATUS_IGNORED,
                        9002L,
                        "duplicate",
                        ignoredAt
                ));

        assertEquals("review_item_status_conflict: reviewed -> ignored", error.getMessage());
        assertEquals(1, conditionalUpdateCount.get());
    }

    private static SupervisionAlertReviewItemDO reviewItem(Long id,
                                                           String reviewStatus,
                                                           Long reviewerUserId,
                                                           LocalDateTime reviewedAt) {
        return new SupervisionAlertReviewItemDO()
                .setId(id)
                .setTenantId(0L)
                .setReviewItemNo("ARI-" + id)
                .setSourceSystem("video")
                .setRuleCode("restricted_area")
                .setSourceAlertType("restricted_area")
                .setDeviceId("device-01")
                .setCameraId("camera-01")
                .setZoneCode("zone-a")
                .setObjectLabel("person")
                .setFirstAlertTime(LocalDateTime.of(2026, 7, 4, 10, 55))
                .setLastAlertTime(LocalDateTime.of(2026, 7, 4, 10, 55))
                .setAlertCount(1)
                .setSourceAlertIds("alert-101")
                .setReviewData("{}")
                .setReviewStatus(reviewStatus)
                .setReviewerUserId(reviewerUserId)
                .setReviewedAt(reviewedAt)
                .setRecordEvidenceStatus("not_required")
                .setVersion(0);
    }

    private static SupervisionAlertReviewMapperStore newStore(SupervisionAlertReviewItemMapper reviewItemMapper,
                                                              SupervisionAlertReviewSegmentMapper reviewSegmentMapper,
                                                              SupervisionAlertReviewCaseItemMapper reviewCaseItemMapper) {
        return new SupervisionAlertReviewMapperStore(
                reviewItemMapper,
                noopMapper(SupervisionAlertReviewEvidenceMapper.class),
                noopMapper(SupervisionAlertReviewIngestIdentityMapper.class),
                noopMapper(SupervisionAlertReviewRuleMapper.class),
                noopMapper(SupervisionAlertReviewCaseMapper.class),
                reviewCaseItemMapper,
                noopMapper(SupervisionAlertReviewCaseAuditMapper.class),
                noopMapper(SupervisionAlertReviewExportJobMapper.class),
                noopMapper(SupervisionAlertReviewSemanticIndexMapper.class),
                noopMapper(SupervisionAlertReviewUserStatusMapper.class),
                noopMapper(SupervisionAlertReviewRuntimeLockMapper.class),
                noopMapper(SupervisionAlertReviewRuntimeRunMapper.class),
                noopMapper(SupervisionAlertReviewRuntimeOutboxMapper.class),
                reviewSegmentMapper,
                noopMapper(SupervisionAlertReviewReportAckMapper.class),
                noopMapper(SupervisionEventMapper.class)
        );
    }

    private static <T> T noopMapper(Class<T> mapperType) {
        return mapper(mapperType, (proxy, method, args) -> defaultValue(method.getReturnType()));
    }

    private static <T> T mapper(Class<T> mapperType, InvocationHandler handler) {
        Object proxy = Proxy.newProxyInstance(
                mapperType.getClassLoader(),
                new Class<?>[]{mapperType},
                (proxyInstance, method, args) -> {
                    if (method.getDeclaringClass() == Object.class) {
                        return switch (method.getName()) {
                            case "toString" -> mapperType.getSimpleName() + "Proxy";
                            case "hashCode" -> System.identityHashCode(proxyInstance);
                            case "equals" -> proxyInstance == args[0];
                            default -> null;
                        };
                    }
                    return handler.invoke(proxyInstance, method, args);
                });
        return mapperType.cast(proxy);
    }

    private static Object defaultValue(Class<?> returnType) {
        if (returnType == Void.TYPE) {
            return null;
        }
        if (returnType == Boolean.TYPE) {
            return false;
        }
        if (returnType == Integer.TYPE) {
            return 0;
        }
        if (returnType == Long.TYPE) {
            return 0L;
        }
        if (List.class.isAssignableFrom(returnType)) {
            return List.of();
        }
        if (Map.class.isAssignableFrom(returnType)) {
            return Map.of();
        }
        if (Optional.class.isAssignableFrom(returnType)) {
            return Optional.empty();
        }
        return null;
    }

}

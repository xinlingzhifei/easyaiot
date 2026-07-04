package com.basiclab.iot.system.supervision;

import com.basiclab.iot.common.core.context.TenantContextHolder;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewItemDO;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewSegmentDO;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewCaseAuditMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewCaseItemMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewCaseMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewEvidenceMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewExportJobMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewItemMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewRuleMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewRuntimeLockMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewRuntimeOutboxMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewRuntimeRunMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewSegmentMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewSemanticIndexMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewUserStatusMapper;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionEventMapper;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewMapperStore;
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

    private static SupervisionAlertReviewMapperStore newStore(SupervisionAlertReviewItemMapper reviewItemMapper,
                                                              SupervisionAlertReviewSegmentMapper reviewSegmentMapper,
                                                              SupervisionAlertReviewCaseItemMapper reviewCaseItemMapper) {
        return new SupervisionAlertReviewMapperStore(
                reviewItemMapper,
                noopMapper(SupervisionAlertReviewEvidenceMapper.class),
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

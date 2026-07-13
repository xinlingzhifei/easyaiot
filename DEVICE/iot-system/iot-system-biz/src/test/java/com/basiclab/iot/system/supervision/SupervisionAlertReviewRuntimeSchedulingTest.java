package com.basiclab.iot.system.supervision;

import com.basiclab.iot.common.core.job.TenantJob;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewRuntimeOutboxMapper;
import com.basiclab.iot.system.job.supervision.SupervisionAlertReviewEventReconcileJob;
import com.basiclab.iot.system.job.supervision.SupervisionAlertReviewEvidenceExportWorkerJob;
import com.basiclab.iot.system.job.supervision.SupervisionAlertReviewOperationsReportJob;
import com.basiclab.iot.system.job.supervision.SupervisionAlertReviewRuntimeOutboxJob;
import com.basiclab.iot.system.job.supervision.SupervisionAlertReviewRuntimePatrolJob;
import com.basiclab.iot.system.job.supervision.SupervisionAlertReviewSemanticIndexJob;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuntimeOutboxDeliveryResult;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuntimeOutboxMessage;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuntimeOutboxPublisher;
import org.apache.ibatis.annotations.Update;
import org.junit.jupiter.api.Test;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SupervisionAlertReviewRuntimeSchedulingTest {

    private static final String SCHEDULER_MIGRATION =
            "/sql/migrations/V20260709__alert_review_scheduler_activation.sql";

    @Test
    void schedulerSeedsRequiredRuntimeJobsEnabledByDefault() throws IOException {
        String sql = resourceText(SCHEDULER_MIGRATION);

        assertTrue(sql.contains("supervisionAlertReviewRuntimePatrolJob"));
        assertTrue(sql.contains("supervisionAlertReviewRuntimeOutboxJob"));
        assertTrue(sql.contains("supervisionAlertReviewEventReconcileJob"));
        assertTrue(sql.contains("supervisionAlertReviewEvidenceExportWorkerJob"));
        assertTrue(sql.contains("supervisionAlertReviewSemanticIndexJob"));
        assertTrue(sql.contains("supervisionAlertReviewOperationsReportJob"));
        assertTrue(sql.contains("SET status = 1"));
        assertFalse(sql.contains("SET status = 2"));
    }

    @Test
    void runtimeJobsAreTenantScopedSchedulerHandlers() throws NoSuchMethodException {
        List<Class<?>> jobTypes = List.of(
                SupervisionAlertReviewRuntimePatrolJob.class,
                SupervisionAlertReviewRuntimeOutboxJob.class,
                SupervisionAlertReviewEventReconcileJob.class,
                SupervisionAlertReviewEvidenceExportWorkerJob.class,
                SupervisionAlertReviewSemanticIndexJob.class,
                SupervisionAlertReviewOperationsReportJob.class
        );

        for (Class<?> jobType : jobTypes) {
            Component component = jobType.getAnnotation(Component.class);
            assertNotNull(component, jobType.getSimpleName());
            assertFalse(component.value().isBlank(), jobType.getSimpleName());
            assertTrue(jobType.getMethod("execute", String.class).isAnnotationPresent(TenantJob.class),
                    jobType.getSimpleName());
        }
    }

    @Test
    void unconfiguredOutboxPublisherFailsClosedWithoutDiscardingPayload() {
        String payload = "{\"alert\":\"record_storage_drift:file_missing\"}";
        ReviewRuntimeOutboxMessage message = new ReviewRuntimeOutboxMessage(
                91L,
                "run-91",
                "review_runtime_alert",
                "record_storage_drift:file_missing",
                payload,
                2,
                LocalDateTime.of(2026, 7, 10, 9, 0)
        );

        ReviewRuntimeOutboxDeliveryResult result = ReviewRuntimeOutboxPublisher.noop().publish(message);

        assertFalse(result.success());
        assertEquals("runtime_outbox_sink_not_configured", result.errorCode());
        assertEquals(payload, message.payload());
    }

    @Test
    void outboxClaimAtomicallyReclaimsFailedRowsOnlyAfterBackoff() throws NoSuchMethodException {
        Method claimMethod = SupervisionAlertReviewRuntimeOutboxMapper.class.getMethod(
                "claimPending",
                Integer.class,
                String.class,
                Long.class,
                LocalDateTime.class,
                LocalDateTime.class
        );
        String sql = String.join("\n", claimMethod.getAnnotation(Update.class).value()).toLowerCase();

        assertTrue(sql.contains("outbox_status = 'failed'"));
        assertTrue(sql.contains("retry_count"));
        assertTrue(sql.contains("published_at"));
        assertTrue(sql.contains("interval '1 second'"));
        assertTrue(sql.contains("for update skip locked"));
        assertFalse(sql.contains("payload ="));
    }

    private static String resourceText(String path) throws IOException {
        try (InputStream input = SupervisionAlertReviewRuntimeSchedulingTest.class.getResourceAsStream(path)) {
            assertNotNull(input, path);
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}

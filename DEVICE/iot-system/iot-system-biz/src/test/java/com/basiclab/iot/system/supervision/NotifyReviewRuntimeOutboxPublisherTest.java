package com.basiclab.iot.system.supervision;

import com.basiclab.iot.system.service.notify.NotifySendService;
import com.basiclab.iot.system.service.supervision.NotifyReviewRuntimeOutboxPublisher;
import com.basiclab.iot.system.service.supervision.ReviewRuntimeOutboxNotifyDeliveryStore;
import com.basiclab.iot.system.service.supervision.ReviewRuntimeOutboxNotifyProperties;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuntimeOutboxDeliveryResult;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuntimeOutboxMessage;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NotifyReviewRuntimeOutboxPublisherTest {

    @Test
    void publisherDispatchesRuntimeAlertAndOperationsReportToConfiguredAdmins() {
        CapturingNotifySendService notifySendService = new CapturingNotifySendService();
        ReviewRuntimeOutboxNotifyProperties properties = new ReviewRuntimeOutboxNotifyProperties();
        properties.setAdminUserIds(List.of(1001L, 1002L));
        properties.setRuntimeAlertTemplateCode("YFEIEYE_REVIEW_RUNTIME_ALERT");
        properties.setOperationsReportTemplateCode("YFEIEYE_REVIEW_OPERATIONS_REPORT");
        NotifyReviewRuntimeOutboxPublisher publisher = new NotifyReviewRuntimeOutboxPublisher(
                notifySendService, properties, ReviewRuntimeOutboxNotifyDeliveryStore.noop());

        ReviewRuntimeOutboxDeliveryResult alertResult = publisher.publish(new ReviewRuntimeOutboxMessage(
                1L,
                "run-1",
                "review_runtime_alert",
                "record_storage_drift:file_missing",
                """
                        {"alert":"record_storage_drift:file_missing","action":"inspect_record_storage","recommendedActions":["inspect storage"],"metadata":{"finalRepairableCount":2}}
                        """,
                0,
                LocalDateTime.of(2026, 7, 8, 15, 0)
        ));
        ReviewRuntimeOutboxDeliveryResult reportResult = publisher.publish(new ReviewRuntimeOutboxMessage(
                2L,
                "report-daily",
                "review_operations_report",
                "daily:2026-07-08",
                """
                        {"reportKey":"daily:2026-07-08","reportType":"daily","action":"deliver_operations_report","reviewItemIds":[11,12],"evidenceGaps":["missing record"],"generatedAt":"2026-07-08T00:10:00"}
                        """,
                0,
                LocalDateTime.of(2026, 7, 8, 15, 1)
        ));

        assertTrue(alertResult.success());
        assertNull(alertResult.errorCode());
        assertTrue(reportResult.success());
        assertEquals(4, notifySendService.calls.size());
        assertEquals(List.of(1001L, 1002L, 1001L, 1002L),
                notifySendService.calls.stream().map(SendCall::userId).toList());
        assertEquals("YFEIEYE_REVIEW_RUNTIME_ALERT", notifySendService.calls.get(0).templateCode());
        assertEquals("record_storage_drift:file_missing",
                notifySendService.calls.get(0).templateParams().get("alertKey"));
        assertEquals("inspect_record_storage",
                notifySendService.calls.get(0).templateParams().get("action"));
        assertEquals("2",
                notifySendService.calls.get(0).templateParams().get("finalRepairableCount"));
        assertEquals("YFEIEYE_REVIEW_OPERATIONS_REPORT", notifySendService.calls.get(2).templateCode());
        assertEquals("daily:2026-07-08",
                notifySendService.calls.get(2).templateParams().get("reportKey"));
        assertEquals("daily",
                notifySendService.calls.get(2).templateParams().get("reportType"));
    }

    @Test
    void publisherSkipsAlreadyDeliveredRecipientsWhenRetryingAfterPartialFailure() {
        CapturingNotifySendService notifySendService = new CapturingNotifySendService();
        notifySendService.failOnceForUserId = 1002L;
        InMemoryNotifyDeliveryStore deliveryStore = new InMemoryNotifyDeliveryStore();
        ReviewRuntimeOutboxNotifyProperties properties = new ReviewRuntimeOutboxNotifyProperties();
        properties.setAdminUserIds(List.of(1001L, 1002L));
        properties.setRuntimeAlertTemplateCode("YFEIEYE_REVIEW_RUNTIME_ALERT");
        NotifyReviewRuntimeOutboxPublisher publisher = new NotifyReviewRuntimeOutboxPublisher(
                notifySendService, properties, deliveryStore);
        ReviewRuntimeOutboxMessage message = new ReviewRuntimeOutboxMessage(
                10L,
                "run-partial",
                "review_runtime_alert",
                "record_storage_drift:file_missing",
                "{\"alert\":\"record_storage_drift:file_missing\",\"action\":\"inspect_record_storage\"}",
                1,
                LocalDateTime.of(2026, 7, 8, 16, 0)
        );

        ReviewRuntimeOutboxDeliveryResult firstAttempt = publisher.publish(message);
        ReviewRuntimeOutboxDeliveryResult retryAttempt = publisher.publish(message);

        assertEquals(false, firstAttempt.success());
        assertEquals("runtime_outbox_notify_send_failed:IllegalStateException", firstAttempt.errorCode());
        assertTrue(retryAttempt.success());
        assertEquals(List.of(1001L, 1002L, 1002L),
                notifySendService.calls.stream().map(SendCall::userId).toList());
        assertTrue(deliveryStore.isDelivered(10L, "system_notify_admin", 1001L,
                "YFEIEYE_REVIEW_RUNTIME_ALERT"));
        assertTrue(deliveryStore.isDelivered(10L, "system_notify_admin", 1002L,
                "YFEIEYE_REVIEW_RUNTIME_ALERT"));
        assertEquals("runtime_outbox_notify_send_failed:IllegalStateException",
                deliveryStore.lastError.get(new DeliveryKey(10L, "system_notify_admin", 1002L,
                        "YFEIEYE_REVIEW_RUNTIME_ALERT")));
    }

    @Test
    void publisherReturnsFailureWhenNotifyRoutingIsNotConfigured() {
        CapturingNotifySendService notifySendService = new CapturingNotifySendService();
        ReviewRuntimeOutboxNotifyProperties properties = new ReviewRuntimeOutboxNotifyProperties();
        properties.setRuntimeAlertTemplateCode("YFEIEYE_REVIEW_RUNTIME_ALERT");
        NotifyReviewRuntimeOutboxPublisher publisher = new NotifyReviewRuntimeOutboxPublisher(
                notifySendService, properties, ReviewRuntimeOutboxNotifyDeliveryStore.noop());

        ReviewRuntimeOutboxDeliveryResult result = publisher.publish(new ReviewRuntimeOutboxMessage(
                3L,
                "run-2",
                "review_runtime_alert",
                "review_data_schema_drift",
                "{\"alert\":\"review_data_schema_drift\"}",
                0,
                LocalDateTime.of(2026, 7, 8, 15, 2)
        ));

        assertEquals(false, result.success());
        assertEquals("runtime_outbox_notify_recipients_not_configured", result.errorCode());
        assertTrue(notifySendService.calls.isEmpty());
    }

    private static class CapturingNotifySendService implements NotifySendService {

        private final List<SendCall> calls = new ArrayList<>();
        private Long failOnceForUserId;

        @Override
        public Long sendSingleNotifyToAdmin(Long userId, String templateCode, Map<String, Object> templateParams) {
            calls.add(new SendCall(userId, templateCode, Map.copyOf(templateParams)));
            if (userId != null && userId.equals(failOnceForUserId)) {
                failOnceForUserId = null;
                throw new IllegalStateException("notify unavailable");
            }
            return 9000L + calls.size();
        }

        @Override
        public Long sendSingleNotifyToMember(Long userId, String templateCode, Map<String, Object> templateParams) {
            throw new UnsupportedOperationException("member notify is not used by alert review outbox");
        }

        @Override
        public Long sendSingleNotify(Long userId, Integer userType, String templateCode, Map<String, Object> templateParams) {
            throw new UnsupportedOperationException("generic notify is not used by alert review outbox");
        }
    }

    private record SendCall(Long userId,
                            String templateCode,
                            Map<String, Object> templateParams) {
    }

    private static class InMemoryNotifyDeliveryStore implements ReviewRuntimeOutboxNotifyDeliveryStore {

        private final Map<DeliveryKey, Long> delivered = new HashMap<>();
        private final Map<DeliveryKey, String> lastError = new HashMap<>();

        @Override
        public boolean isDelivered(Long outboxId, String channel, Long recipientUserId, String templateCode) {
            return delivered.containsKey(new DeliveryKey(outboxId, channel, recipientUserId, templateCode));
        }

        @Override
        public void markDelivered(Long outboxId, String eventType, String alertKey, String channel,
                                  Long recipientUserId, String templateCode, Long notifyMessageId,
                                  LocalDateTime deliveredAt) {
            delivered.put(new DeliveryKey(outboxId, channel, recipientUserId, templateCode), notifyMessageId);
        }

        @Override
        public void markFailed(Long outboxId, String eventType, String alertKey, String channel,
                               Long recipientUserId, String templateCode, String lastError,
                               LocalDateTime attemptedAt) {
            this.lastError.put(new DeliveryKey(outboxId, channel, recipientUserId, templateCode), lastError);
        }
    }

    private record DeliveryKey(Long outboxId,
                               String channel,
                               Long recipientUserId,
                               String templateCode) {
    }
}

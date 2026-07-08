package com.basiclab.iot.system.service.supervision;

import com.basiclab.iot.system.service.notify.NotifySendService;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuntimeOutboxDeliveryResult;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuntimeOutboxMessage;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuntimeOutboxPublisher;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@ConditionalOnProperty(prefix = "yfeieye.review.runtime-outbox.notify", name = "enabled", havingValue = "true")
public class NotifyReviewRuntimeOutboxPublisher implements ReviewRuntimeOutboxPublisher {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };
    private static final String EVENT_RUNTIME_ALERT = "review_runtime_alert";
    private static final String EVENT_OPERATIONS_REPORT = "review_operations_report";

    private final NotifySendService notifySendService;
    private final ReviewRuntimeOutboxNotifyProperties properties;
    private final ReviewRuntimeOutboxNotifyDeliveryStore deliveryStore;

    public NotifyReviewRuntimeOutboxPublisher(NotifySendService notifySendService,
                                              ReviewRuntimeOutboxNotifyProperties properties,
                                              ReviewRuntimeOutboxNotifyDeliveryStore deliveryStore) {
        this.notifySendService = Objects.requireNonNull(notifySendService, "notifySendService");
        this.properties = Objects.requireNonNull(properties, "properties");
        this.deliveryStore = Objects.requireNonNull(deliveryStore, "deliveryStore");
    }

    @Override
    public ReviewRuntimeOutboxDeliveryResult publish(ReviewRuntimeOutboxMessage message) {
        if (message == null) {
            return ReviewRuntimeOutboxDeliveryResult.failed("runtime_outbox_notify_message_missing");
        }
        List<Long> recipients = normalizedAdminUserIds();
        if (recipients.isEmpty()) {
            return ReviewRuntimeOutboxDeliveryResult.failed("runtime_outbox_notify_recipients_not_configured");
        }
        String templateCode = templateCode(message.eventType());
        if (!hasText(templateCode)) {
            return ReviewRuntimeOutboxDeliveryResult.failed("runtime_outbox_notify_template_not_configured");
        }
        Map<String, Object> templateParams = templateParams(message);
        for (Long adminUserId : recipients) {
            if (deliveryStore.isDelivered(message.id(),
                    ReviewRuntimeOutboxNotifyDeliveryStore.CHANNEL_SYSTEM_NOTIFY_ADMIN,
                    adminUserId,
                    templateCode)) {
                continue;
            }
            try {
                Long notifyMessageId = notifySendService.sendSingleNotifyToAdmin(
                        adminUserId, templateCode, templateParams);
                if (notifyMessageId == null) {
                    deliveryStore.markFailed(message.id(), message.eventType(), message.alertKey(),
                            ReviewRuntimeOutboxNotifyDeliveryStore.CHANNEL_SYSTEM_NOTIFY_ADMIN,
                            adminUserId, templateCode, "runtime_outbox_notify_message_not_created",
                            java.time.LocalDateTime.now());
                    return ReviewRuntimeOutboxDeliveryResult.failed("runtime_outbox_notify_message_not_created");
                }
                deliveryStore.markDelivered(message.id(), message.eventType(), message.alertKey(),
                        ReviewRuntimeOutboxNotifyDeliveryStore.CHANNEL_SYSTEM_NOTIFY_ADMIN,
                        adminUserId, templateCode, notifyMessageId, java.time.LocalDateTime.now());
            } catch (RuntimeException ex) {
                String errorCode = "runtime_outbox_notify_send_failed:" + ex.getClass().getSimpleName();
                deliveryStore.markFailed(message.id(), message.eventType(), message.alertKey(),
                        ReviewRuntimeOutboxNotifyDeliveryStore.CHANNEL_SYSTEM_NOTIFY_ADMIN,
                        adminUserId, templateCode, errorCode, java.time.LocalDateTime.now());
                return ReviewRuntimeOutboxDeliveryResult.failed(errorCode);
            }
        }
        return ReviewRuntimeOutboxDeliveryResult.delivered();
    }

    private List<Long> normalizedAdminUserIds() {
        return properties.getAdminUserIds().stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private String templateCode(String eventType) {
        if (EVENT_RUNTIME_ALERT.equals(eventType)) {
            return properties.getRuntimeAlertTemplateCode();
        }
        if (EVENT_OPERATIONS_REPORT.equals(eventType)) {
            return properties.getOperationsReportTemplateCode();
        }
        return null;
    }

    private static Map<String, Object> templateParams(ReviewRuntimeOutboxMessage message) {
        Map<String, Object> payload = readPayload(message.payload());
        Map<String, Object> params = new LinkedHashMap<>();
        putText(params, "eventType", message.eventType());
        putText(params, "runId", message.runId());
        putText(params, "alertKey", message.alertKey());
        putText(params, "retryCount", message.retryCount());
        putText(params, "createdAt", message.createdAt());
        putText(params, "alert", firstValue(payload.get("alert"), message.alertKey()));
        putText(params, "action", payload.get("action"));
        putText(params, "reportKey", firstValue(payload.get("reportKey"), message.alertKey()));
        putText(params, "reportType", payload.get("reportType"));
        putText(params, "deliveryStatus", payload.get("deliveryStatus"));
        putText(params, "acknowledgementStatus", payload.get("acknowledgementStatus"));
        putText(params, "generatedAt", payload.get("generatedAt"));
        putText(params, "recommendedActions", payload.get("recommendedActions"));
        putText(params, "reviewItemIds", payload.get("reviewItemIds"));
        putText(params, "evidenceGaps", payload.get("evidenceGaps"));
        putText(params, "finalRepairableCount", nestedValue(payload.get("metadata"), "finalRepairableCount"));
        return params;
    }

    private static Map<String, Object> readPayload(String payload) {
        if (!hasText(payload)) {
            return Map.of();
        }
        try {
            return OBJECT_MAPPER.readValue(payload, MAP_TYPE);
        } catch (JsonProcessingException ex) {
            return Map.of();
        }
    }

    private static Object nestedValue(Object value, String key) {
        if (!(value instanceof Map<?, ?> map)) {
            return null;
        }
        return map.get(key);
    }

    private static Object firstValue(Object value, Object fallback) {
        if (value instanceof String text && text.isBlank()) {
            return fallback;
        }
        return value == null ? fallback : value;
    }

    private static void putText(Map<String, Object> params, String key, Object value) {
        if (value == null) {
            return;
        }
        String text = String.valueOf(value);
        if (!text.isBlank()) {
            params.put(key, text);
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}

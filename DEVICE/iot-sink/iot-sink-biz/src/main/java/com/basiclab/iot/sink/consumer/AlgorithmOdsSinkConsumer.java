package com.basiclab.iot.sink.consumer;

import com.basiclab.iot.common.utils.json.JsonUtils;
import com.basiclab.iot.sink.domain.model.AlertNotificationMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * 算法ODS下沉监听器：
 * 监听人脸/车牌分流队列，转换为ODS贴源事件后再投递到 Doris ODS Kafka Topic。
 */
@Slf4j
@Component
public class AlgorithmOdsSinkConsumer {

    private static final String DETECTION_FACE = "face";
    private static final String DETECTION_PLATE = "plate";
    private static final DateTimeFormatter ALERT_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final ZoneId SHANGHAI_ZONE = ZoneId.of("Asia/Shanghai");

    @Autowired(required = false)
    private KafkaTemplate<String, String> iotKafkaTemplate;

    @Value("${spring.kafka.algorithm-ods.face.ods-topic:ods.face.raw}")
    private String faceOdsTopic;

    @Value("${spring.kafka.algorithm-ods.plate.ods-topic:ods.plate.raw}")
    private String plateOdsTopic;

    @KafkaListener(
            topics = "${spring.kafka.algorithm-ods.face.dispatch-topic:iot-algorithm-face-ods-dispatch}",
            groupId = "${spring.kafka.algorithm-ods.face.group-id:iot-sink-face-ods-sink-consumer}",
            containerFactory = "iotKafkaListenerContainerFactory"
    )
    public void consumeFaceDispatch(
            @Payload String messageJson,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION_ID) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment acknowledgment) {
        processAndSink(messageJson, DETECTION_FACE, topic, partition, offset, acknowledgment);
    }

    @KafkaListener(
            topics = "${spring.kafka.algorithm-ods.plate.dispatch-topic:iot-algorithm-plate-ods-dispatch}",
            groupId = "${spring.kafka.algorithm-ods.plate.group-id:iot-sink-plate-ods-sink-consumer}",
            containerFactory = "iotKafkaListenerContainerFactory"
    )
    public void consumePlateDispatch(
            @Payload String messageJson,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION_ID) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment acknowledgment) {
        processAndSink(messageJson, DETECTION_PLATE, topic, partition, offset, acknowledgment);
    }

    private void processAndSink(String messageJson,
                                String detectionType,
                                String sourceTopic,
                                int partition,
                                long offset,
                                Acknowledgment acknowledgment) {
        try {
            if (!StringUtils.hasText(messageJson)) {
                ack(acknowledgment);
                return;
            }
            if (iotKafkaTemplate == null) {
                log.error("KafkaTemplate不可用，无法下沉ODS: sourceTopic={}, partition={}, offset={}", sourceTopic, partition, offset);
                ack(acknowledgment);
                return;
            }

            AlertNotificationMessage message = JsonUtils.parseObject(messageJson, AlertNotificationMessage.class);
            if (message == null || message.getAlert() == null) {
                ack(acknowledgment);
                return;
            }

            List<Map<String, Object>> detections = extractDetections(message);
            if (detections.isEmpty()) {
                log.debug("消息中无检测结果，跳过ODS下沉: detectionType={}, sourceTopic={}, deviceId={}",
                        detectionType, sourceTopic, message.getDeviceId());
                ack(acknowledgment);
                return;
            }

            long ts = parseTimestampMillis(message.getAlert().getTime());
            int sent = 0;
            for (Map<String, Object> detection : detections) {
                String className = asString(detection.get("class_name"));
                if (DETECTION_FACE.equals(detectionType) && !isFaceClass(className)) {
                    continue;
                }
                if (DETECTION_PLATE.equals(detectionType) && !isPlateClass(className)) {
                    continue;
                }

                Map<String, Object> odsEvent = DETECTION_FACE.equals(detectionType)
                        ? buildFaceOdsEvent(message, detection, ts)
                        : buildPlateOdsEvent(message, detection, ts);
                String targetTopic = DETECTION_FACE.equals(detectionType) ? faceOdsTopic : plateOdsTopic;
                iotKafkaTemplate.send(targetTopic, message.getDeviceId(), JsonUtils.toJsonString(odsEvent));
                sent++;
            }

            log.info("算法ODS下沉完成: detectionType={}, sourceTopic={}, partition={}, offset={}, deviceId={}, sent={}",
                    detectionType, sourceTopic, partition, offset, message.getDeviceId(), sent);
            ack(acknowledgment);
        } catch (Exception e) {
            log.error("算法ODS下沉失败: detectionType={}, sourceTopic={}, partition={}, offset={}, error={}",
                    detectionType, sourceTopic, partition, offset, e.getMessage(), e);
            ack(acknowledgment);
        }
    }

    private List<Map<String, Object>> extractDetections(AlertNotificationMessage message) {
        List<Map<String, Object>> detections = new ArrayList<>();
        Object infoObj = message.getAlert().getInformation();
        Map<String, Object> infoMap = toMap(infoObj);
        Object nestedDetections = infoMap.get("detections");
        if (nestedDetections instanceof List) {
            for (Object item : (List<?>) nestedDetections) {
                if (item instanceof Map) {
                    detections.add((Map<String, Object>) item);
                }
            }
        }

        if (!detections.isEmpty()) {
            return detections;
        }

        Map<String, Object> single = new HashMap<>();
        single.put("class_name", message.getAlert().getObject());
        single.put("track_id", infoMap.get("track_id"));
        single.put("confidence", infoMap.get("confidence"));
        single.put("bbox", infoMap.get("bbox"));
        detections.add(single);
        return detections;
    }

    private Map<String, Object> buildFaceOdsEvent(AlertNotificationMessage message, Map<String, Object> detection, long ts) {
        int[] bbox = parseBbox(detection.get("bbox"));
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("event_id", UUID.randomUUID().toString());
        event.put("event_type", "face_detection");
        event.put("device_id", message.getDeviceId());
        event.put("ts", ts);
        event.put("track_id", asString(detection.get("track_id")));
        event.put("bbox_x", bbox[0]);
        event.put("bbox_y", bbox[1]);
        event.put("bbox_w", bbox[2]);
        event.put("bbox_h", bbox[3]);
        event.put("score", toDouble(detection.get("confidence")));
        event.put("face_quality", toDouble(detection.get("confidence")));
        return event;
    }

    private Map<String, Object> buildPlateOdsEvent(AlertNotificationMessage message, Map<String, Object> detection, long ts) {
        int[] bbox = parseBbox(detection.get("bbox"));
        String className = asString(detection.get("class_name"));
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("event_id", UUID.randomUUID().toString());
        event.put("event_type", "plate_ocr");
        event.put("device_id", message.getDeviceId());
        event.put("ts", ts);
        event.put("track_id", asString(detection.get("track_id")));
        event.put("bbox_x", bbox[0]);
        event.put("bbox_y", bbox[1]);
        event.put("bbox_w", bbox[2]);
        event.put("bbox_h", bbox[3]);
        event.put("score", toDouble(detection.get("confidence")));
        event.put("plate_no", asString(detection.get("plate_no")));
        event.put("plate_score", toDouble(detection.get("confidence")));
        event.put("plate_color", asString(detection.get("plate_color")));
        event.put("vehicle_type", className);
        event.put("vehicle_color", asString(detection.get("vehicle_color")));
        event.put("vehicle_brand", asString(detection.get("vehicle_brand")));
        return event;
    }

    private Map<String, Object> toMap(Object value) {
        if (value instanceof Map) {
            return (Map<String, Object>) value;
        }
        if (value instanceof String) {
            String text = ((String) value).trim();
            if (!StringUtils.hasText(text)) {
                return Collections.emptyMap();
            }
            try {
                Map<String, Object> parsed = JsonUtils.parseObject(text, Map.class);
                return parsed != null ? parsed : Collections.emptyMap();
            } catch (Exception ignored) {
                return Collections.emptyMap();
            }
        }
        return Collections.emptyMap();
    }

    private int[] parseBbox(Object bboxObj) {
        int[] parsed = new int[]{0, 0, 0, 0};
        if (!(bboxObj instanceof List)) {
            return parsed;
        }
        List<?> bbox = (List<?>) bboxObj;
        if (bbox.size() < 4) {
            return parsed;
        }

        int x1 = toInt(bbox.get(0));
        int y1 = toInt(bbox.get(1));
        int x2 = toInt(bbox.get(2));
        int y2 = toInt(bbox.get(3));
        parsed[0] = x1;
        parsed[1] = y1;
        parsed[2] = Math.max(0, x2 - x1);
        parsed[3] = Math.max(0, y2 - y1);
        return parsed;
    }

    private long parseTimestampMillis(String timeText) {
        if (!StringUtils.hasText(timeText)) {
            return System.currentTimeMillis();
        }
        try {
            LocalDateTime dateTime = LocalDateTime.parse(timeText, ALERT_TIME_FORMATTER);
            return dateTime.atZone(SHANGHAI_ZONE).toInstant().toEpochMilli();
        } catch (Exception e) {
            return System.currentTimeMillis();
        }
    }

    private boolean isFaceClass(String className) {
        String normalized = normalizeClassName(className);
        return normalized.contains("face") || normalized.contains("facial") || normalized.contains("person_face")
                || normalized.contains("人脸");
    }

    private boolean isPlateClass(String className) {
        String normalized = normalizeClassName(className);
        return normalized.contains("plate") || normalized.contains("license_plate")
                || normalized.contains("licence_plate") || normalized.contains("car_plate")
                || normalized.contains("车牌");
    }

    private String normalizeClassName(String className) {
        if (!StringUtils.hasText(className)) {
            return "";
        }
        return className.trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private int toInt(Object value) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception e) {
            return 0;
        }
    }

    private double toDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (Exception e) {
            return 0D;
        }
    }

    private void ack(Acknowledgment acknowledgment) {
        if (acknowledgment != null) {
            acknowledgment.acknowledge();
        }
    }
}

package com.basiclab.iot.sink.service;

import com.basiclab.iot.common.utils.json.JsonUtils;
import com.basiclab.iot.sink.domain.model.AlertNotificationMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 算法告警ODS分流服务：
 * 根据人脸/车牌检测开关，把消息异步投递到独立的ODS分流队列。
 */
@Slf4j
@Component
public class AlgorithmOdsDispatchService {

    @Autowired(required = false)
    private KafkaTemplate<String, String> iotKafkaTemplate;

    @Value("${spring.kafka.algorithm-ods.face.dispatch-topic:iot-algorithm-face-ods-dispatch}")
    private String faceDispatchTopic;

    @Value("${spring.kafka.algorithm-ods.plate.dispatch-topic:iot-algorithm-plate-ods-dispatch}")
    private String plateDispatchTopic;

    public void dispatchByDetectionSwitch(AlertNotificationMessage message, String rawMessageJson, String sourceTopic) {
        if (message == null) {
            return;
        }

        if (iotKafkaTemplate == null) {
            log.warn("KafkaTemplate不可用，跳过算法ODS分流: sourceTopic={}, deviceId={}", sourceTopic, message.getDeviceId());
            return;
        }

        boolean faceEnabled = Boolean.TRUE.equals(message.getFaceDetectionEnabled());
        boolean plateEnabled = Boolean.TRUE.equals(message.getPlateDetectionEnabled());
        if (!faceEnabled && !plateEnabled) {
            log.debug("算法任务未开启人脸/车牌检测，跳过ODS分流: sourceTopic={}, deviceId={}", sourceTopic, message.getDeviceId());
            return;
        }

        String payload = rawMessageJson;
        if (!StringUtils.hasText(payload)) {
            payload = JsonUtils.toJsonString(message);
        }
        if (!StringUtils.hasText(payload)) {
            log.warn("算法ODS分流消息为空，跳过: sourceTopic={}, deviceId={}", sourceTopic, message.getDeviceId());
            return;
        }

        if (faceEnabled) {
            sendAsync(faceDispatchTopic, message.getDeviceId(), payload, "face", sourceTopic);
        }
        if (plateEnabled) {
            sendAsync(plateDispatchTopic, message.getDeviceId(), payload, "plate", sourceTopic);
        }
    }

    private void sendAsync(String topic, String key, String payload, String detectionType, String sourceTopic) {
        iotKafkaTemplate.send(topic, key, payload).addCallback(
                result -> {
                    if (result != null && result.getRecordMetadata() != null) {
                        log.debug("算法ODS分流投递成功: sourceTopic={}, detectionType={}, topic={}, partition={}, offset={}",
                                sourceTopic,
                                detectionType,
                                result.getRecordMetadata().topic(),
                                result.getRecordMetadata().partition(),
                                result.getRecordMetadata().offset());
                    }
                },
                failure -> log.error("算法ODS分流投递失败: sourceTopic={}, detectionType={}, topic={}, key={}, error={}",
                        sourceTopic, detectionType, topic, key, failure.getMessage(), failure)
        );
    }
}

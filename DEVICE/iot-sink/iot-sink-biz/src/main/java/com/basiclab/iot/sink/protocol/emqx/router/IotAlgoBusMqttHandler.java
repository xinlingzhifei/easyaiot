package com.basiclab.iot.sink.protocol.emqx.router;

import cn.hutool.core.util.StrUtil;
import cn.hutool.extra.spring.SpringUtil;
import com.basiclab.iot.sink.domain.model.AlertNotificationMessage;
import com.basiclab.iot.sink.domain.model.PostProcessRequestMessage;
import com.basiclab.iot.sink.service.AlertService;
import com.basiclab.iot.sink.service.PostProcessService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.nio.charset.StandardCharsets;

/**
 * 订阅 EMQX 算法总线（mqtt/iot-*），完成告警/后处理入库；携带边缘节点维度字段。
 */
@Slf4j
public class IotAlgoBusMqttHandler {

    private final AlertService alertService;
    private final PostProcessService postProcessService;
    private final ObjectMapper objectMapper;

    public IotAlgoBusMqttHandler() {
        this.alertService = SpringUtil.getBean(AlertService.class);
        PostProcessService pps = null;
        try {
            pps = SpringUtil.getBean(PostProcessService.class);
        } catch (Exception ignored) {
            // optional
        }
        this.postProcessService = pps;
        ObjectMapper om = null;
        try {
            om = SpringUtil.getBean(ObjectMapper.class);
        } catch (Exception ignored) {
            om = new ObjectMapper();
        }
        this.objectMapper = om;
    }

    public boolean supports(String topic) {
        return StrUtil.isNotBlank(topic) && topic.startsWith("mqtt/iot-");
    }

    public void handle(String topic, byte[] payloadBytes) {
        String json = new String(payloadBytes, StandardCharsets.UTF_8);
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode payload = root.has("payload") ? root.get("payload") : root;
            if (topic.endsWith("iot-alert-notification") || topic.contains("iot-alert-notification")) {
                handleAlert(payload, root, false);
            } else if (topic.contains("iot-snapshot-alert")) {
                handleAlert(payload, root, true);
            } else if (topic.contains("iot-post-process-request")) {
                handlePostProcess(payload, root);
            } else {
                log.debug("[IotAlgoBusMqttHandler] 忽略未处理算法 Topic: {}", topic);
            }
        } catch (Exception e) {
            log.error("[IotAlgoBusMqttHandler] 处理失败 topic={} err={}", topic, e.getMessage(), e);
        }
    }

    private void handleAlert(JsonNode payload, JsonNode root, boolean snapshot) throws Exception {
        AlertNotificationMessage msg = objectMapper.treeToValue(
                mergeEdgeFields(payload, root), AlertNotificationMessage.class);
        // 兼容 envelope：alert 业务体可能直接在 payload
        if (msg.getAlert() == null) {
            AlertNotificationMessage.AlertInfo info = objectMapper.treeToValue(payload, AlertNotificationMessage.AlertInfo.class);
            msg.setAlert(info);
        }
        if (msg.getDeviceId() == null && payload.has("device_id")) {
            msg.setDeviceId(payload.get("device_id").asText());
        }
        if (msg.getDeviceName() == null && payload.has("device_name")) {
            msg.setDeviceName(payload.get("device_name").asText());
        }
        fillEdgeFromNodes(msg, payload, root);
        if (snapshot) {
            alertService.processSnapshotAlert(msg);
        } else {
            alertService.processAlert(msg);
        }
        log.info("[IotAlgoBusMqttHandler] 告警已入库 edgeNodeId={} deviceId={}",
                msg.getEdgeNodeId(), msg.getDeviceId());
    }

    private void handlePostProcess(JsonNode payload, JsonNode root) throws Exception {
        if (postProcessService == null) {
            log.warn("[IotAlgoBusMqttHandler] PostProcessService 不可用，跳过");
            return;
        }
        PostProcessRequestMessage req = objectMapper.treeToValue(payload, PostProcessRequestMessage.class);
        postProcessService.enqueue(req);
        log.info("[IotAlgoBusMqttHandler] 后处理已入队 taskId={} deviceId={}",
                req.getTaskId(), req.getDeviceId());
    }

    private JsonNode mergeEdgeFields(JsonNode payload, JsonNode root) {
        return payload;
    }

    private void fillEdgeFromNodes(AlertNotificationMessage msg, JsonNode payload, JsonNode root) {
        if (msg.getEdgeNodeId() == null) {
            Long id = readLong(payload, "edge_node_id", "edgeNodeId");
            if (id == null) {
                id = readLong(root, "edge_node_id", "edgeNodeId");
            }
            msg.setEdgeNodeId(id);
        }
        if (StrUtil.isBlank(msg.getEdgeNodeName())) {
            msg.setEdgeNodeName(readText(payload, "edge_node_name", "edgeNodeName"));
        }
        if (StrUtil.isBlank(msg.getEdgeNodeHost())) {
            msg.setEdgeNodeHost(readText(payload, "edge_node_host", "edgeNodeHost"));
        }
        if (msg.getNodeId() == null) {
            msg.setNodeId(readLong(payload, "node_id", "nodeId", "compute_node_id"));
        }
    }

    private Long readLong(JsonNode node, String... names) {
        if (node == null) {
            return null;
        }
        for (String name : names) {
            if (node.has(name) && !node.get(name).isNull()) {
                return node.get(name).asLong();
            }
        }
        return null;
    }

    private String readText(JsonNode node, String... names) {
        if (node == null) {
            return null;
        }
        for (String name : names) {
            if (node.has(name) && !node.get(name).isNull()) {
                return node.get(name).asText();
            }
        }
        return null;
    }

}

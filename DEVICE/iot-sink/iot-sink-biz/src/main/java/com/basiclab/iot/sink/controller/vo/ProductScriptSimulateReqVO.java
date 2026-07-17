package com.basiclab.iot.sink.controller.vo;

import lombok.Data;

import java.util.Map;

/**
 * 产品协议脚本模拟调试请求。
 */
@Data
public class ProductScriptSimulateReqVO {

    /**
     * 脚本内容（可与已保存内容不同，便于未保存试跑）
     */
    private String scriptContent;

    /**
     * uplink / decode：上行解码；downlink / encode：下行编码
     */
    private String direction;

    /**
     * MQTT Topic（编解码可能依赖 topic 解析服务标识等）
     */
    private String topic;

    /**
     * 上行原始载荷：UTF-8 文本（与 payloadHex 二选一，hex 优先）
     */
    private String payloadText;

    /**
     * 上行原始载荷：十六进制字符串
     */
    private String payloadHex;

    /**
     * 下行平台标准消息（Map），对应 IotDeviceMessage JSON
     */
    private Map<String, Object> message;
}

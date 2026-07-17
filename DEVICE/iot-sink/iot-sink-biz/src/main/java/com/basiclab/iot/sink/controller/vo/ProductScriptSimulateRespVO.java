package com.basiclab.iot.sink.controller.vo;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * 产品协议脚本模拟调试响应。
 */
@Data
@Builder
public class ProductScriptSimulateRespVO {

    private boolean success;
    private String message;
    private String direction;
    private long elapsedMs;

    /** 输出 UTF-8 文本（尽力） */
    private String outputText;
    /** 输出十六进制 */
    private String outputHex;
    /** 若输出是合法 JSON 则解析 */
    private Map<String, Object> outputJson;
    /** 输出字节长度 */
    private int outputLength;
}

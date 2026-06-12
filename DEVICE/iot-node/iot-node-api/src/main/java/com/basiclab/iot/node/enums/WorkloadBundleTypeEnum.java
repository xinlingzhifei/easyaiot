package com.basiclab.iot.node.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 计算节点工作负载分发包类型（四大块）。
 */
@Getter
@AllArgsConstructor
public enum WorkloadBundleTypeEnum {

    STREAM_FORWARD("stream_forward", "推流转发", "VIDEO"),
    ALGORITHM_REALTIME("algorithm_realtime", "实时算法", "VIDEO"),
    ALGORITHM_SNAP("algorithm_snap", "抓拍算法", "VIDEO"),
    AI_SERVICE("ai_service", "模型服务", "AI");

    private final String type;
    private final String label;
    /** VIDEO 或 AI */
    private final String module;

    public static WorkloadBundleTypeEnum of(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }
        String t = type.trim().toLowerCase();
        for (WorkloadBundleTypeEnum e : values()) {
            if (e.type.equals(t)) {
                return e;
            }
        }
        return null;
    }
}

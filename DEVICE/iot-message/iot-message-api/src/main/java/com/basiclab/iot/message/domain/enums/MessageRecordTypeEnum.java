package com.basiclab.iot.message.domain.enums;

/**
 * 消息记录类型：模板与推送分离
 */
public final class MessageRecordTypeEnum {

    /** 消息模板（可被算法任务引用、可被推送任务选择） */
    public static final int TEMPLATE = 0;

    /** 消息推送任务（引用模板，含收件人/用户组等推送配置） */
    public static final int PUSH = 1;

    private MessageRecordTypeEnum() {
    }
}

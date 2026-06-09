package com.basiclab.iot.message.service;

import com.basiclab.iot.message.domain.entity.TMsgSms;
import com.basiclab.iot.message.domain.model.vo.MessagePrepareVO;

import java.util.List;

public interface MessagePrepareService {

    MessagePrepareVO add(MessagePrepareVO messagePrepareVO);

    MessagePrepareVO update(MessagePrepareVO messagePrepareVO);

    String delete(int msgType,String id);

    /**
     * 仅删除消息实例主表行（以及短信的模板数据），不删除推送历史。
     * 用于告警自动发送：发送完成后清理临时记录，避免污染“消息推送”列表。
     */
    void deleteMessageInstance(int msgType, String id);

    List<?> query(MessagePrepareVO messagePrepareVO);

    TMsgSms querySmsByMsgId(String msgId);

}

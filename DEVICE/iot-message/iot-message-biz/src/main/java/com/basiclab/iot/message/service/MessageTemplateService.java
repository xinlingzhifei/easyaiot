package com.basiclab.iot.message.service;

import com.basiclab.iot.message.domain.model.vo.MessagePrepareVO;

import java.util.List;
import java.util.Map;

/**
 * 消息模板服务（与消息推送分离，record_type=0）
 */
public interface MessageTemplateService {

    MessagePrepareVO add(MessagePrepareVO vo);

    MessagePrepareVO update(MessagePrepareVO vo);

    String delete(int msgType, String id);

    List<?> query(MessagePrepareVO vo);

    Map<String, Object> getById(String id, int msgType);

    List<Map<String, Object>> queryByType(int msgType);

    void validateTemplateUnique(int msgType, String title, String msgName, String excludeId);
}

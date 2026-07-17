package com.basiclab.iot.device.messagebus;

import cn.hutool.core.util.StrUtil;
import com.basiclab.iot.sink.enums.IotDeviceTopicEnum;
import com.basiclab.iot.sink.messagebus.core.IotMessageBus;
import com.basiclab.iot.sink.messagebus.core.IotMessageSubscriber;
import com.basiclab.iot.sink.mq.message.IotDeviceMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;

/**
 * 订阅属性期望设置 ACK，闭合 setProperties 的 PENDING → SUCCESS/FAILED。
 */
@Slf4j
@Component
@ConditionalOnBean(IotMessageBus.class)
public class PropertyDesiredSetAckSubscriber implements IotMessageSubscriber<IotDeviceMessage> {

    @Resource
    private IotMessageBus messageBus;

    @Resource
    private ServiceInvokeResponseHandler handler;

    @PostConstruct
    public void subscribe() {
        messageBus.register(this);
        log.info("[subscribe][属性期望设置 ACK 订阅器注册成功，主题：{}]", getTopic());
    }

    @Override
    public String getTopic() {
        return IotDeviceMessage.MESSAGE_BUS_DEVICE_MESSAGE_TOPIC;
    }

    @Override
    public String getGroup() {
        return "iot-device-property-desired-set-ack-subscriber";
    }

    @Override
    public void onMessage(IotDeviceMessage message) {
        try {
            if (message == null || StrUtil.isBlank(message.getTopic())) {
                return;
            }
            IotDeviceTopicEnum topicEnum = IotDeviceTopicEnum.matchTopic(message.getTopic());
            if (topicEnum != IotDeviceTopicEnum.PROPERTY_UPSTREAM_DESIRED_SET_ACK
                    && topicEnum != IotDeviceTopicEnum.SUB_PROPERTY_UPSTREAM_DESIRED_SET_ACK) {
                return;
            }
            log.info("[onMessage][收到属性期望设置 ACK，messageId: {}, topic: {}, requestId: {}]",
                    message.getId(), message.getTopic(), message.getRequestId());
            handler.handlePropertySetAck(message);
        } catch (Exception e) {
            log.error("[onMessage][处理属性期望设置 ACK 失败，messageId: {}]",
                    message != null ? message.getId() : "unknown", e);
        }
    }
}

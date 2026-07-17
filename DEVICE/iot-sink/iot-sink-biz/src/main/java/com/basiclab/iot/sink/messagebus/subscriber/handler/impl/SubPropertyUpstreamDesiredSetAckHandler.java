package com.basiclab.iot.sink.messagebus.subscriber.handler.impl;

import com.basiclab.iot.sink.enums.IotDeviceTopicEnum;
import com.basiclab.iot.sink.messagebus.subscriber.handler.IotUpstreamMessageHandler;
import com.basiclab.iot.sink.mq.message.IotDeviceMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class SubPropertyUpstreamDesiredSetAckHandler extends AbstractTopicHandler implements IotUpstreamMessageHandler {

    @Override
    public boolean handleUpstreamMessage(IotDeviceMessage message) {
        return handleAndPublishEvent(message, IotDeviceTopicEnum.SUB_PROPERTY_UPSTREAM_DESIRED_SET_ACK);
    }
}
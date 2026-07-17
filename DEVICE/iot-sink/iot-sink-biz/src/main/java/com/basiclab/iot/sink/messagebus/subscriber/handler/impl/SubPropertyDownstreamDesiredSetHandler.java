package com.basiclab.iot.sink.messagebus.subscriber.handler.impl;

import com.basiclab.iot.sink.enums.IotDeviceTopicEnum;
import com.basiclab.iot.sink.messagebus.subscriber.handler.IotDownstreamMessageHandler;
import com.basiclab.iot.sink.mq.message.IotDeviceMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class SubPropertyDownstreamDesiredSetHandler extends AbstractTopicHandler implements IotDownstreamMessageHandler {

    @Override
    public boolean handleDownstreamMessage(IotDeviceMessage message) {
        return handleAndPublishEvent(message, IotDeviceTopicEnum.SUB_PROPERTY_DOWNSTREAM_DESIRED_SET);
    }
}
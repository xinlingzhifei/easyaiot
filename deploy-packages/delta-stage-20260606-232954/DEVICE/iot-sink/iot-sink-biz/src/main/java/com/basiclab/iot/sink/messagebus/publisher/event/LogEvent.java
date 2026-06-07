package com.basiclab.iot.sink.messagebus.publisher.event;

import com.basiclab.iot.sink.enums.IotDeviceTopicEnum;
import com.basiclab.iot.sink.mq.message.IotDeviceMessage;

/**
 * LogEvent
 *
 * @author 翱翔的雄库鲁
 * @email andywebjava@163.com
 */

public class LogEvent extends AbstractIotDeviceEvent {

    public LogEvent(Object source, IotDeviceMessage message, IotDeviceTopicEnum topicEnum) {
        super(source, message, topicEnum);
    }
}


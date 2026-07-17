package com.basiclab.iot.sink.messagebus.subscriber.listener;

import com.basiclab.iot.sink.enums.IotDeviceTopicEnum;
import com.basiclab.iot.sink.messagebus.subscriber.event.IotMessageBusEvent;
import com.basiclab.iot.sink.service.data.DeviceDataStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;

/**
 * 网关代报子设备属性：按直连属性上报语义入库（影子 / TDengine）。
 */
@Slf4j
@Component
public class SubPropertyUpstreamReportListener {

    @Resource
    private DeviceDataStorageService deviceDataStorageService;

    @Async("iotMessageBusSubscriberExecutor")
    @EventListener
    public void handleSubPropertyUpstreamReportEvent(IotMessageBusEvent event) {
        try {
            if (event.getTopicEnum() != IotDeviceTopicEnum.SUB_PROPERTY_UPSTREAM_REPORT) {
                return;
            }
            log.info("[handleSubPropertyUpstreamReportEvent][网关代报属性 messageId={} deviceId={}]",
                    event.getMessage().getId(), event.getMessage().getDeviceId());
            // 已在 sendDeviceMessage 中改写为子设备 deviceId + 纯 properties
            deviceDataStorageService.storeDeviceData(event.getMessage(),
                    IotDeviceTopicEnum.PROPERTY_UPSTREAM_REPORT);
        } catch (Exception e) {
            log.error("[handleSubPropertyUpstreamReportEvent][处理失败 messageId={}]",
                    event.getMessage() != null ? event.getMessage().getId() : null, e);
        }
    }
}

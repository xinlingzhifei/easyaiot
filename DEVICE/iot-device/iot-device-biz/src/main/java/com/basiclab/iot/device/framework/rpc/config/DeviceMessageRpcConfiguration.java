package com.basiclab.iot.device.framework.rpc.config;

import com.basiclab.iot.message.RemoteMessageNotifyQueryService;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Configuration;

/**
 * 设备服务调用消息中心（模板/用户分组）Feign 注册
 */
@Configuration(proxyBeanMethods = false)
@EnableFeignClients(clients = {RemoteMessageNotifyQueryService.class})
public class DeviceMessageRpcConfiguration {
}

package com.basiclab.iot.common.config;

import com.basiclab.iot.system.api.oauth2.OAuth2TokenApi;
import com.basiclab.iot.system.api.permission.PermissionApi;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.cloud.openfeign.EnableFeignClients;

/**
 * Security 相关 Feign 客户端。
 * system-server 进程内已有 OAuth2TokenApiImpl / PermissionApiImpl，不再注册 Feign 代理，避免回环 HTTP 调用。
 */
@AutoConfiguration
@ConditionalOnExpression("'${spring.application.name:}' != 'system-server'")
@EnableFeignClients(clients = {OAuth2TokenApi.class, PermissionApi.class})
public class YudaoSecurityFeignClientsAutoConfiguration {
}

package com.basiclab.iot.common.config;

import com.basiclab.iot.system.api.tenant.TenantApi;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cloud.openfeign.EnableFeignClients;

/**
 * Tenant Feign 客户端。system-server 进程内已有 TenantApiImpl，不再注册 Feign 代理。
 */
@AutoConfiguration
@ConditionalOnProperty(prefix = "iot.tenant", value = "enable", matchIfMissing = true)
@ConditionalOnExpression("'${spring.application.name:}' != 'system-server'")
@EnableFeignClients(clients = TenantApi.class)
public class YudaoTenantFeignClientsAutoConfiguration {
}

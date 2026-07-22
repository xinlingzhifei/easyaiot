package com.basiclab.iot.visualize.framework.fuxa;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * FUXA 组态连接与 SSO 代登录配置
 */
@Data
@Component
@ConfigurationProperties(prefix = "iot.fuxa")
public class FuxaProperties {

    /** 后端访问 FUXA 的地址（容器内可用 http://FUXA:1881） */
    private String baseUrl = "http://127.0.0.1:1881";

    /** 浏览器打开 FUXA 的地址（可与 baseUrl 不同） */
    private String publicUrl = "http://127.0.0.1:1881";

    /** 代登录账号（默认 admin） */
    private String username = "admin";

    /** 代登录密码（默认 123456，生产务必修改） */
    private String password = "123456";

    /** 是否启用 SSO 桥接；关闭则前端直跳 FUXA */
    private boolean ssoEnabled = true;

    /** SSO 桥接页路径（挂载到 FUXA client/dist） */
    private String ssoPath = "/easyaiot-sso.html";

}

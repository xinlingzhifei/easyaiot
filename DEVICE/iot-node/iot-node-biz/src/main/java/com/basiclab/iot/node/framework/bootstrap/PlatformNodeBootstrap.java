package com.basiclab.iot.node.framework.bootstrap;

import com.basiclab.iot.node.service.ComputeNodeService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;

/**
 * 启动时自动纳管控制面宿主机节点。
 */
@Slf4j
@Component
public class PlatformNodeBootstrap implements ApplicationRunner {

    @Resource
    private ComputeNodeService computeNodeService;

    @Override
    public void run(ApplicationArguments args) {
        try {
            computeNodeService.ensurePlatformNode();
        } catch (Exception ex) {
            log.warn("控制面节点自动纳管失败: {}", ex.getMessage());
        }
    }
}

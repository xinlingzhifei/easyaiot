package com.basiclab.iot.sink.controller;

import cn.hutool.core.util.StrUtil;
import com.basiclab.iot.common.domain.AjaxResult;
import com.basiclab.iot.sink.protocol.modbus.ModbusSerialPortLocks;
import com.basiclab.iot.sink.protocol.polling.IndustrialDeviceConfig;
import com.ghgande.j2mod.modbus.facade.ModbusSerialMaster;
import com.ghgande.j2mod.modbus.util.SerialParameters;
import org.eclipse.milo.opcua.sdk.client.OpcUaClient;
import org.eclipse.milo.opcua.sdk.client.identity.AnonymousProvider;
import org.eclipse.milo.opcua.sdk.client.identity.UsernameProvider;
import org.eclipse.milo.opcua.stack.core.security.SecurityPolicy;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@RestController
@RequestMapping("/modbus")
public class ModbusConnectionController {

    private static final int TEST_TIMEOUT_MS = 5000;
    private static final ExecutorService SERIAL_TEST_EXECUTOR = Executors.newFixedThreadPool(2, runnable -> {
        Thread thread = new Thread(runnable, "modbus-serial-connection-test");
        thread.setDaemon(true);
        return thread;
    });

    @PostMapping("/test-connection")
    public AjaxResult testConnection(@RequestBody IndustrialDeviceConfig config) {
        long startedAt = System.currentTimeMillis();
        try {
            if ("MODBUS_TCP".equalsIgnoreCase(config.getType())) {
                testTcp(config);
            } else if ("MODBUS_RTU".equalsIgnoreCase(config.getType())) {
                testRtu(config);
            } else if ("OPCUA".equalsIgnoreCase(config.getType())) {
                testOpcUa(config);
            } else {
                return AjaxResult.error("仅支持测试 Modbus TCP、Modbus RTU 或 OPC UA 连接");
            }
            long elapsed = System.currentTimeMillis() - startedAt;
            return AjaxResult.success("连接成功，耗时 " + elapsed + " ms");
        } catch (Exception exception) {
            return AjaxResult.error("连接失败：" + StrUtil.blankToDefault(exception.getMessage(),
                    exception.getClass().getSimpleName()));
        }
    }

    private void testTcp(IndustrialDeviceConfig config) throws Exception {
        if (StrUtil.isBlank(config.getHost())) {
            throw new IllegalArgumentException("主机地址不能为空");
        }
        int port = config.getPort() == null ? 502 : config.getPort();
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(config.getHost(), port), TEST_TIMEOUT_MS);
        }
    }

    private void testRtu(IndustrialDeviceConfig config) throws Exception {
        if (StrUtil.isBlank(config.getSerialPort())) {
            throw new IllegalArgumentException("串口名称不能为空");
        }
        Future<?> test = SERIAL_TEST_EXECUTOR.submit(() -> {
            synchronized (ModbusSerialPortLocks.forPort(config.getSerialPort())) {
                openSerialPort(config);
            }
            return null;
        });
        try {
            test.get(TEST_TIMEOUT_MS + 1000L, TimeUnit.MILLISECONDS);
        } catch (TimeoutException exception) {
            test.cancel(true);
            throw new IllegalStateException("打开串口超时，请确认串口存在、未被占用，且 Sink 服务可以访问该串口");
        } catch (ExecutionException exception) {
            Throwable cause = exception.getCause();
            if (cause instanceof Exception nestedException) {
                throw nestedException;
            }
            throw new IllegalStateException(cause);
        }
    }

    private void testOpcUa(IndustrialDeviceConfig config) throws Exception {
        String endpointUrl = config.getEndpointUrl();
        if (StrUtil.isBlank(endpointUrl)) {
            if (StrUtil.isBlank(config.getHost())) {
                throw new IllegalArgumentException("Endpoint URL 或主机地址不能为空");
            }
            endpointUrl = "opc.tcp://" + config.getHost() + ":"
                    + (config.getPort() == null ? 4840 : config.getPort());
        }
        boolean hasCredentials = StrUtil.isNotBlank(config.getUsername());
        OpcUaClient client = OpcUaClient.create(
                endpointUrl,
                endpoints -> endpoints.stream()
                        .filter(endpoint -> SecurityPolicy.None.getUri().equals(endpoint.getSecurityPolicyUri()))
                        .findFirst(),
                transportConfig -> {
                },
                clientConfig -> clientConfig.setIdentityProvider(hasCredentials
                        ? new UsernameProvider(config.getUsername(), StrUtil.nullToEmpty(config.getPassword()))
                        : new AnonymousProvider()));
        try {
            client.connectAsync().get(TEST_TIMEOUT_MS, TimeUnit.MILLISECONDS);
        } finally {
            try {
                client.disconnectAsync().get(TEST_TIMEOUT_MS, TimeUnit.MILLISECONDS);
            } catch (Exception ignored) {
                // ignore disconnect errors after a failed/partial connect
            }
        }
    }

    private void openSerialPort(IndustrialDeviceConfig config) throws Exception {
        SerialParameters parameters = new SerialParameters();
        parameters.setPortName(config.getSerialPort());
        parameters.setBaudRate(config.getBaudRate() == null ? 9600 : config.getBaudRate());
        parameters.setDatabits(config.getDataBits() == null ? 8 : config.getDataBits());
        parameters.setStopbits(StrUtil.blankToDefault(config.getStopBits(), "1"));
        parameters.setParity(StrUtil.blankToDefault(config.getParity(), "NONE"));
        parameters.setEncoding("rtu");
        parameters.setRs485Mode(!Boolean.FALSE.equals(config.getRs485Mode()));
        ModbusSerialMaster master = new ModbusSerialMaster(parameters, TEST_TIMEOUT_MS,
                config.getTransmitDelayMs() == null ? 0 : Math.max(0, config.getTransmitDelayMs()));
        try {
            master.connect();
        } finally {
            master.disconnect();
        }
    }
}

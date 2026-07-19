package com.basiclab.iot.sink.protocol.modbus;

import cn.hutool.core.util.StrUtil;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public final class ModbusSerialPortLocks {

    private static final Map<String, Object> LOCKS = new ConcurrentHashMap<>();

    private ModbusSerialPortLocks() {
    }

    public static Object forPort(String serialPort) {
        String port = StrUtil.blankToDefault(serialPort, "<missing>").toUpperCase();
        return LOCKS.computeIfAbsent(port, ignored -> new Object());
    }
}

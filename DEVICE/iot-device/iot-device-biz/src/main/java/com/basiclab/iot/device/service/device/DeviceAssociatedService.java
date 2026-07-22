package com.basiclab.iot.device.service.device;

import com.basiclab.iot.device.domain.device.vo.Device;

import java.util.List;

public interface DeviceAssociatedService {

    /**
     * 查询中心设备的关联子设备（含网关拓扑子设备合并）
     */
    List<Device> listAssociatedDevices(String centerDeviceIdentification);

    /**
     * 查询可添加的任意已存在设备（排除自身与已关联）
     */
    List<Device> listCandidateDevices(String centerDeviceIdentification, String deviceName);

    int associateDevices(String centerDeviceIdentification, List<Long> deviceIds);

    int disassociateDevices(String centerDeviceIdentification, List<Long> deviceIds);
}

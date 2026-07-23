package com.genersoft.iot.vmp.gb28181.service.impl;

import com.basiclab.iot.common.exception.ControllerException;
import com.genersoft.iot.vmp.gb28181.bean.CommonGBChannel;
import com.genersoft.iot.vmp.gb28181.bean.Device;
import com.genersoft.iot.vmp.gb28181.bean.DeviceChannel;
import com.genersoft.iot.vmp.gb28181.service.IDeviceChannelService;
import com.genersoft.iot.vmp.gb28181.service.IDeviceService;
import com.genersoft.iot.vmp.gb28181.service.IGbChannelService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PlayServiceImplTest {

    @Test
    void audioBroadcastRejectsChannelWithoutBroadcastSupport() {
        IDeviceService deviceService = mock(IDeviceService.class);
        IDeviceChannelService deviceChannelService = mock(IDeviceChannelService.class);
        IGbChannelService channelService = mock(IGbChannelService.class);
        Device device = mock(Device.class);
        DeviceChannel deviceChannel = mock(DeviceChannel.class);
        CommonGBChannel commonChannel = mock(CommonGBChannel.class);

        when(deviceService.getDeviceByDeviceId("device")).thenReturn(device);
        when(deviceChannelService.getOne("device", "channel")).thenReturn(deviceChannel);
        when(channelService.queryCommonChannelByDeviceChannel(deviceChannel)).thenReturn(commonChannel);
        when(commonChannel.getEnableBroadcast()).thenReturn(0);

        PlayServiceImpl service = new PlayServiceImpl();
        ReflectionTestUtils.setField(service, "deviceService", deviceService);
        ReflectionTestUtils.setField(service, "deviceChannelService", deviceChannelService);
        ReflectionTestUtils.setField(service, "channelService", channelService);

        ControllerException error = assertThrows(
                ControllerException.class,
                () -> service.audioBroadcast("device", "channel", true)
        );

        assertEquals("该通道未启用语音对讲，请先确认摄像机支持并在通道配置中启用", error.getMsg());
    }
}

package com.genersoft.iot.vmp.gb28181.service.impl;

import com.basiclab.iot.common.exception.ControllerException;
import com.genersoft.iot.vmp.conf.UserSetting;
import com.genersoft.iot.vmp.gb28181.bean.CommonGBChannel;
import com.genersoft.iot.vmp.gb28181.bean.Device;
import com.genersoft.iot.vmp.gb28181.bean.DeviceChannel;
import com.genersoft.iot.vmp.gb28181.service.IDeviceChannelService;
import com.genersoft.iot.vmp.gb28181.service.IDeviceService;
import com.genersoft.iot.vmp.gb28181.service.IGbChannelService;
import com.genersoft.iot.vmp.media.bean.MediaServer;
import com.genersoft.iot.vmp.media.service.IMediaServerService;
import com.genersoft.iot.vmp.storager.IRedisCatchStorage;
import com.genersoft.iot.vmp.vmanager.bean.AudioBroadcastResult;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PlayServiceImplTest {

    @Test
    void audioBroadcastRegistersAuthorityAndAddsItToPushUrl() {
        IDeviceService deviceService = mock(IDeviceService.class);
        IDeviceChannelService deviceChannelService = mock(IDeviceChannelService.class);
        IGbChannelService channelService = mock(IGbChannelService.class);
        IMediaServerService mediaServerService = mock(IMediaServerService.class);
        IRedisCatchStorage redisCatchStorage = mock(IRedisCatchStorage.class);
        UserSetting userSetting = mock(UserSetting.class);
        Device device = mock(Device.class);
        DeviceChannel deviceChannel = mock(DeviceChannel.class);
        CommonGBChannel commonChannel = mock(CommonGBChannel.class);
        MediaServer mediaServer = mock(MediaServer.class);

        when(deviceService.getDeviceByDeviceId("device")).thenReturn(device);
        when(deviceChannelService.getOne("device", "channel")).thenReturn(deviceChannel);
        when(channelService.queryCommonChannelByDeviceChannel(deviceChannel)).thenReturn(commonChannel);
        when(commonChannel.getEnableBroadcast()).thenReturn(1);
        when(device.getServerId()).thenReturn("server");
        when(device.getDeviceId()).thenReturn("device");
        when(deviceChannel.getDeviceId()).thenReturn("channel");
        when(userSetting.getServerId()).thenReturn("server");
        when(mediaServerService.getMediaServerForMinimumLoad(null)).thenReturn(mediaServer);

        PlayServiceImpl service = new PlayServiceImpl();
        ReflectionTestUtils.setField(service, "deviceService", deviceService);
        ReflectionTestUtils.setField(service, "deviceChannelService", deviceChannelService);
        ReflectionTestUtils.setField(service, "channelService", channelService);
        ReflectionTestUtils.setField(service, "mediaServerService", mediaServerService);
        ReflectionTestUtils.setField(service, "redisCatchStorage", redisCatchStorage);
        ReflectionTestUtils.setField(service, "userSetting", userSetting);

        AudioBroadcastResult result = service.audioBroadcast("device", "channel", true);

        ArgumentCaptor<String> tokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(redisCatchStorage).registerAudioBroadcastAuthority(
                eq("broadcast"), eq("device_channel"), tokenCaptor.capture()
        );
        String token = tokenCaptor.getValue();
        assertFalse(token.isBlank());
        verify(mediaServerService).getStreamInfoByAppAndStream(
                mediaServer, "broadcast", "device_channel", null, null, token, false
        );
        assertEquals("broadcast", result.getApp());
        assertEquals("device_channel", result.getStream());
    }

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

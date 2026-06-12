package com.genersoft.iot.vmp.media.zlm;

import com.genersoft.iot.vmp.media.bean.MediaServer;
import com.genersoft.iot.vmp.media.bean.ResultForOnPublish;
import com.genersoft.iot.vmp.media.service.IMediaServerService;
import com.genersoft.iot.vmp.media.zlm.dto.hook.HookResultForOnPublish;
import com.genersoft.iot.vmp.media.zlm.dto.hook.OnPublishHookParam;
import com.genersoft.iot.vmp.service.IMediaService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ZLMHttpHookListenerTest {

    @Test
    void onPublishFallsBackToDefaultMediaServerWhenHookDoesNotSendMediaServerId() {
        IMediaServerService mediaServerService = mock(IMediaServerService.class);
        IMediaService mediaService = mock(IMediaService.class);
        MediaServer defaultMediaServer = new MediaServer();
        defaultMediaServer.setId("zlmediakit-local");
        ResultForOnPublish publishResult = new ResultForOnPublish();
        publishResult.setEnable_audio(true);

        when(mediaServerService.getDefaultMediaServer()).thenReturn(defaultMediaServer);
        when(mediaService.authenticatePublish(defaultMediaServer, "rtp", "device_channel", ""))
                .thenReturn(publishResult);

        ZLMHttpHookListener listener = new ZLMHttpHookListener();
        ReflectionTestUtils.setField(listener, "mediaServerService", mediaServerService);
        ReflectionTestUtils.setField(listener, "mediaService", mediaService);

        OnPublishHookParam param = new OnPublishHookParam();
        param.setApp("rtp");
        param.setStream("device_channel");
        param.setParams("");

        HookResultForOnPublish result = listener.onPublish(param);

        assertEquals(0, result.getCode());
        assertEquals("zlmediakit-local", param.getMediaServerId());
        verify(mediaServerService).getDefaultMediaServer();
        verify(mediaService).authenticatePublish(defaultMediaServer, "rtp", "device_channel", "");
    }
}

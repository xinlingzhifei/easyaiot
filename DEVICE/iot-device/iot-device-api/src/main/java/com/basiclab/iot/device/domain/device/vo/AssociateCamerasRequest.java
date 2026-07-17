package com.basiclab.iot.device.domain.device.vo;

import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.List;

/**
 * 关联流媒体摄像头请求
 */
@Data
public class AssociateCamerasRequest {

    @ApiModelProperty(value = "IoT设备主键")
    private Long iotDeviceId;

    @ApiModelProperty(value = "流媒体摄像头ID列表")
    private List<String> cameraDeviceIds;
}

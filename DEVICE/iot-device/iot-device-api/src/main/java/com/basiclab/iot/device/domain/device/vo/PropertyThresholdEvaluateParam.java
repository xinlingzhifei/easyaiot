package com.basiclab.iot.device.domain.device.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.io.Serializable;
import java.util.Map;

/**
 * 属性上报后阈值评估请求
 */
@ApiModel("属性阈值评估请求")
@Data
public class PropertyThresholdEvaluateParam implements Serializable {

    @ApiModelProperty("设备标识")
    private String deviceIdentification;

    @ApiModelProperty("设备名称")
    private String deviceName;

    @ApiModelProperty("属性键值，key=propertyCode, value=上报值")
    private Map<String, Object> properties;
}

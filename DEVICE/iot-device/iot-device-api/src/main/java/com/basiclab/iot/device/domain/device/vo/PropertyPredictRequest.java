package com.basiclab.iot.device.domain.device.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.io.Serializable;

@ApiModel("属性预测诊断请求")
@Data
public class PropertyPredictRequest implements Serializable {

    @ApiModelProperty("设备标识")
    private String deviceIdentification;

    @ApiModelProperty("属性标识")
    private String propertyCode;

    @ApiModelProperty("属性名称")
    private String propertyName;

    @ApiModelProperty("开始时间 epoch ms")
    private Long startTime;

    @ApiModelProperty("结束时间 epoch ms")
    private Long endTime;

    @ApiModelProperty("预测未来点数，默认 12")
    private Integer predictPoints;

    @ApiModelProperty("单位")
    private String unit;
}

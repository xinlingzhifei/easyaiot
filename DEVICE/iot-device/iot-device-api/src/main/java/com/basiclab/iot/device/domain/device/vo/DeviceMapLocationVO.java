package com.basiclab.iot.device.domain.device.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 设备地图分布点位（轻量字段）
 */
@ApiModel("设备地图分布点位")
@Data
public class DeviceMapLocationVO implements Serializable {

    @ApiModelProperty("设备主键")
    private Long id;

    @ApiModelProperty("设备标识")
    private String deviceIdentification;

    @ApiModelProperty("设备名称")
    private String deviceName;

    @ApiModelProperty("连接状态 ONLINE/OFFLINE/INIT")
    private String connectStatus;

    @ApiModelProperty("是否在线")
    private Boolean online;

    @ApiModelProperty("设备类型")
    private String deviceType;

    @ApiModelProperty("产品标识")
    private String productIdentification;

    @ApiModelProperty("经度")
    private BigDecimal longitude;

    @ApiModelProperty("纬度")
    private BigDecimal latitude;

    @ApiModelProperty("位置名称/地址")
    private String address;

    @ApiModelProperty("是否已配置坐标")
    private Boolean hasLocation;

    @ApiModelProperty("位置更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime locationUpdatedAt;

    private static final long serialVersionUID = 1L;
}

package com.basiclab.iot.device.domain.device.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;

/**
 * 更新设备地图坐标请求
 */
@ApiModel("更新设备地图坐标")
@Data
public class DeviceLocationUpdateParam implements Serializable {

    @ApiModelProperty(value = "经度（与纬度成对；都为空表示清除坐标）")
    private BigDecimal longitude;

    @ApiModelProperty(value = "纬度（与经度成对；都为空表示清除坐标）")
    private BigDecimal latitude;

    @ApiModelProperty("位置名称/地址")
    private String address;

    @ApiModelProperty("省/直辖市编码")
    private String provinceCode;

    @ApiModelProperty("市编码")
    private String cityCode;

    @ApiModelProperty("区县编码")
    private String regionCode;

    @ApiModelProperty("备注")
    private String remark;

    private static final long serialVersionUID = 1L;
}

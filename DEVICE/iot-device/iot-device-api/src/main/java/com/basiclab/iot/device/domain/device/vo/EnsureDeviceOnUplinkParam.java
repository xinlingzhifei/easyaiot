package com.basiclab.iot.device.domain.device.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.*;
import lombok.experimental.Accessors;

import javax.validation.constraints.NotEmpty;
import java.io.Serializable;

/**
 * 上行时若设备不存在则按产品自动建档（GATEWAY / COMMON）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Accessors(chain = true)
@ApiModel(value = "EnsureDeviceOnUplinkParam", description = "上行自动创建设备参数")
public class EnsureDeviceOnUplinkParam implements Serializable {
    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "产品标识", required = true)
    @NotEmpty(message = "产品标识不能为空")
    private String productIdentification;

    @ApiModelProperty(value = "设备标识", required = true)
    @NotEmpty(message = "设备标识不能为空")
    private String deviceIdentification;

    @ApiModelProperty(value = "设备名称（新建时可选）")
    private String deviceName;

    @ApiModelProperty(value = "MQTT ClientId（新建时可选）")
    private String clientId;

    @ApiModelProperty(value = "租户编号")
    private Long tenantId;
}

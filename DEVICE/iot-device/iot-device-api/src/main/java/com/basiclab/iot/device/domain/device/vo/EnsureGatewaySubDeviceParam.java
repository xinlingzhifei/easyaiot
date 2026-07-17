package com.basiclab.iot.device.domain.device.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.*;
import lombok.experimental.Accessors;

import javax.validation.constraints.NotEmpty;
import java.io.Serializable;

/**
 * 网关代报时确保子设备存在（自动创建 / 补齐绑定）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Accessors(chain = true)
@ApiModel(value = "EnsureGatewaySubDeviceParam", description = "网关确保子设备存在参数")
public class EnsureGatewaySubDeviceParam implements Serializable {
    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "网关设备标识", required = true)
    @NotEmpty(message = "网关设备标识不能为空")
    private String gatewayIdentification;

    @ApiModelProperty(value = "子设备所属产品标识（须为 SUBSET 产品）", required = true)
    @NotEmpty(message = "子设备产品标识不能为空")
    private String productIdentification;

    @ApiModelProperty(value = "子设备标识", required = true)
    @NotEmpty(message = "子设备标识不能为空")
    private String deviceIdentification;

    @ApiModelProperty(value = "子设备名称（新建时可选）")
    private String deviceName;

    @ApiModelProperty(value = "租户编号")
    private Long tenantId;
}

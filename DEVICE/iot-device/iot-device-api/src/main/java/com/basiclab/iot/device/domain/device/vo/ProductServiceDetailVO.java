package com.basiclab.iot.device.domain.device.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * 物模型服务详情（含入参/出参，供产品编辑与设备控制）
 */
@ApiModel("物模型服务详情")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductServiceDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty("服务ID")
    private Long id;

    @ApiModelProperty("服务标识")
    private String serviceCode;

    @ApiModelProperty("服务名称")
    private String serviceName;

    @ApiModelProperty("产品标识")
    private String productIdentification;

    @ApiModelProperty("模板标识")
    private String templateIdentification;

    @ApiModelProperty("状态")
    private String status;

    @ApiModelProperty("描述")
    private String description;

    @ApiModelProperty("默认命令ID（内部同步用）")
    private Long commandId;

    @ApiModelProperty("入参列表")
    @Builder.Default
    private List<ProductServiceParamVO> inputParams = new ArrayList<>();

    @ApiModelProperty("出参列表")
    @Builder.Default
    private List<ProductServiceParamVO> outParams = new ArrayList<>();
}

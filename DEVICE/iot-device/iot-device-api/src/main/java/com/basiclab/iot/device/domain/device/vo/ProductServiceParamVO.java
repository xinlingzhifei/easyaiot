package com.basiclab.iot.device.domain.device.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 物模型服务入参/出参（前端编辑与设备控制共用）
 */
@ApiModel("物模型服务参数")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductServiceParamVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty("参数记录ID")
    private Long id;

    @ApiModelProperty("参数标识（前端兼容 propertyCode）")
    private String parameterCode;

    @ApiModelProperty("参数名称（前端兼容 propertyName）")
    private String parameterName;

    /** 前端表单字段兼容 */
    private String propertyCode;
    private String propertyName;

    @ApiModelProperty("数据类型 INT/DOUBLE/BOOL/TEXT 等")
    private String datatype;

    @ApiModelProperty("最小值")
    private Integer min;

    @ApiModelProperty("最大值")
    private Integer max;

    @ApiModelProperty("步长")
    private Integer step;

    @ApiModelProperty("字符串最大长度")
    private Integer maxlength;

    @ApiModelProperty("单位")
    private String unit;

    @ApiModelProperty("枚举/布尔描述 JSON")
    private String enumlist;

    @ApiModelProperty("是否必填 0/1")
    private Integer required;

    @ApiModelProperty("描述")
    private String description;

    @ApiModelProperty("描述（兼容 parameterDescription）")
    private String parameterDescription;

    private String boolClose;
    private String boolOpen;
}

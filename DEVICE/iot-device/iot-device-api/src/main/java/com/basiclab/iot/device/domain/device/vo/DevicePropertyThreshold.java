package com.basiclab.iot.device.domain.device.vo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 设备属性阈值
 */
@ApiModel("设备属性阈值")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Accessors(chain = true)
@Builder
@TableName("device_property_threshold")
public class DevicePropertyThreshold implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    @ApiModelProperty("设备标识")
    private String deviceIdentification;

    @ApiModelProperty("属性标识")
    private String propertyCode;

    @ApiModelProperty("属性名称")
    private String propertyName;

    @ApiModelProperty("下限")
    private Double minValue;

    @ApiModelProperty("上限")
    private Double maxValue;

    @ApiModelProperty("是否启用 1启用 0停用")
    private Integer enabled;

    @ApiModelProperty("告警级别 INFO/WARNING/CRITICAL")
    private String alarmLevel;

    private String remark;

    @ApiModelProperty("运算符阈值规则 JSON 数组")
    private String rulesJson;

    @ApiModelProperty("健康权重 1-100")
    private Integer healthWeight;

    @ApiModelProperty("关键属性 1是 0否")
    private Integer critical;

    private Long tenantId;
    private String createBy;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;

    private String updateBy;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updateTime;
}

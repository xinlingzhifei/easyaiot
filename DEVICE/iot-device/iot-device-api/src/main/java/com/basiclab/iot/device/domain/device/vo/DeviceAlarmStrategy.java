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
 * 设备告警策略（以设备为单位）
 */
@ApiModel("设备告警策略")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Accessors(chain = true)
@Builder
@TableName("device_alarm_strategy")
public class DeviceAlarmStrategy implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    @ApiModelProperty("设备标识")
    private String deviceIdentification;

    @ApiModelProperty("策略名称")
    private String strategyName;

    @ApiModelProperty("是否启用")
    private Integer enabled;

    @ApiModelProperty("通知方式 JSON 数组 sms/email/wxcp/ding/feishu/http")
    private String notifyMethods;

    @ApiModelProperty("通知人 JSON（由消息模板绑定的用户分组解析写入）")
    private String notifyUsers;

    @ApiModelProperty("渠道模板配置 JSON：[{method,template_id,template_name,userless?}]")
    private String channels;

    @ApiModelProperty("告警静默秒数")
    private Integer silenceSeconds;

    @ApiModelProperty("是否纳入离线健康扣分")
    private Integer includeOffline;

    private String remark;
    private Long tenantId;
    private String createBy;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;

    private String updateBy;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updateTime;
}

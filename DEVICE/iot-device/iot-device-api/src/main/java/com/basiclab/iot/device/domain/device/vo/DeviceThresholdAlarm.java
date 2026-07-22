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

@ApiModel("设备阈值告警记录")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Accessors(chain = true)
@Builder
@TableName("device_threshold_alarm")
public class DeviceThresholdAlarm implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String deviceIdentification;
    private String deviceName;
    private String propertyCode;
    private String propertyName;
    private String alarmValue;
    private Double minValue;
    private Double maxValue;
    private String alarmLevel;

    @ApiModelProperty("OPEN/CLEARED")
    private String alarmStatus;

    private String message;
    private Integer kafkaSent;
    private Long tenantId;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime clearTime;
}

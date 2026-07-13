package com.basiclab.iot.system.dal.dataobject.supervision;

import com.baomidou.mybatisplus.annotation.TableName;
import com.basiclab.iot.common.core.dataobject.BaseDO;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@TableName("system_supervision_alert_review_evidence")
@Data
@EqualsAndHashCode(callSuper = true)
public class SupervisionAlertReviewEvidenceDO extends BaseDO {

    private Long id;
    private Long reviewItemId;
    private String sourceAlertId;
    private String materialType;
    private String materialUri;
    private LocalDateTime happenedAt;
    private LocalDateTime recordStartTime;

}

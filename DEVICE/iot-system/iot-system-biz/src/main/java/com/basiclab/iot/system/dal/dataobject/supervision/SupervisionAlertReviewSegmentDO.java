package com.basiclab.iot.system.dal.dataobject.supervision;

import com.baomidou.mybatisplus.annotation.TableName;
import com.basiclab.iot.common.core.dataobject.BaseDO;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@TableName("system_supervision_alert_review_segment")
@Data
@EqualsAndHashCode(callSuper = true)
public class SupervisionAlertReviewSegmentDO extends BaseDO {

    private Long id;
    private Long tenantId;
    private Long reviewItemId;
    private String segmentNo;
    private String cameraId;
    private String severity;
    private String segmentStatus;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String objectIds;
    private String zoneCodes;
    private String sourceAlertIds;
    private String segmentEvents;
    private String segmentMetadata;
    private Integer version;

}

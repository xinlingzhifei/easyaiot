package com.basiclab.iot.system.dal.dataobject.supervision;

import com.baomidou.mybatisplus.annotation.TableName;
import com.basiclab.iot.common.core.dataobject.BaseDO;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@TableName("system_supervision_alert_review_item")
@Data
@EqualsAndHashCode(callSuper = true)
public class SupervisionAlertReviewItemDO extends BaseDO {

    private Long id;
    private Long tenantId;
    private String reviewItemNo;
    private String sourceSystem;
    private String ruleCode;
    private String sourceAlertType;
    private String deviceId;
    private String cameraId;
    private String zoneCode;
    private String objectLabel;
    private LocalDateTime firstAlertTime;
    private LocalDateTime lastAlertTime;
    private Integer alertCount;
    private String sourceAlertIds;
    private String reviewData;
    private String reviewStatus;
    private Long reviewerUserId;
    private LocalDateTime reviewedAt;
    private String ignoreReason;
    private String ruleSuggestion;
    private String ruleSuggestionStatus;
    private LocalDateTime ruleSuggestionUpdatedAt;
    private Long eventId;
    private LocalDateTime convertedAt;
    private String recordEvidenceStatus;
    private LocalDateTime recordEvidenceCheckedAt;
    private String recordEvidenceMessage;
    private Integer version;

}

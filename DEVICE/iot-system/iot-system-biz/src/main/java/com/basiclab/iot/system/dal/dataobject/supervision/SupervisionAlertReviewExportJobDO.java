package com.basiclab.iot.system.dal.dataobject.supervision;

import com.baomidou.mybatisplus.annotation.TableName;
import com.basiclab.iot.common.core.dataobject.BaseDO;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@TableName("system_supervision_alert_review_export_job")
@Data
@EqualsAndHashCode(callSuper = true)
public class SupervisionAlertReviewExportJobDO extends BaseDO {

    private Long id;
    private String jobNo;
    private String status;
    private String packageNo;
    private Long reviewCaseId;
    private String reviewItemIds;
    private String evidenceUris;
    private String manifest;
    private String fileHash;
    private LocalDateTime expiresAt;
    private Long operatorUserId;
    private String exportReason;
    private String boundEventIds;
    private LocalDateTime generatedAt;
    private Integer version;

}

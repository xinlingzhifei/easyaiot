package com.basiclab.iot.system.dal.dataobject.supervision;

import com.baomidou.mybatisplus.annotation.TableName;
import com.basiclab.iot.common.core.dataobject.BaseDO;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@TableName("system_supervision_alert_review_case_item")
@Data
@EqualsAndHashCode(callSuper = true)
public class SupervisionAlertReviewCaseItemDO extends BaseDO {

    private Long id;
    private Long reviewCaseId;
    private Long reviewItemId;
    private Integer sortOrder;
    private LocalDateTime addedAt;
    private Integer version;

}

package com.basiclab.iot.system.dal.dataobject.supervision;

import com.baomidou.mybatisplus.annotation.TableName;
import com.basiclab.iot.common.core.dataobject.BaseDO;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@TableName("system_supervision_alert_review_runtime_lock")
@Data
@EqualsAndHashCode(callSuper = true)
public class SupervisionAlertReviewRuntimeLockDO extends BaseDO {

    private Long id;
    private String lockName;
    private Long ownerUserId;
    private LocalDateTime lockedUntil;
    private LocalDateTime lastLockedAt;
    private Integer version;

}

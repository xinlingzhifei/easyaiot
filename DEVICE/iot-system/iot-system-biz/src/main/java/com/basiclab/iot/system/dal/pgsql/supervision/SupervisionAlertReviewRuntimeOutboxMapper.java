package com.basiclab.iot.system.dal.pgsql.supervision;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewRuntimeOutboxDO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface SupervisionAlertReviewRuntimeOutboxMapper extends BaseMapperX<SupervisionAlertReviewRuntimeOutboxDO> {

    default List<SupervisionAlertReviewRuntimeOutboxDO> selectPending(Integer limit) {
        int normalizedLimit = limit == null || limit <= 0 ? 50 : Math.min(limit, 200);
        return selectList(new LambdaQueryWrapperX<SupervisionAlertReviewRuntimeOutboxDO>()
                .eq(SupervisionAlertReviewRuntimeOutboxDO::getOutboxStatus, "pending")
                .orderByAsc(SupervisionAlertReviewRuntimeOutboxDO::getCreatedAt)
                .orderByAsc(SupervisionAlertReviewRuntimeOutboxDO::getId)
                .last("LIMIT " + normalizedLimit));
    }

    @Update("""
            UPDATE system_supervision_alert_review_runtime_outbox
            SET outbox_status = 'processing',
                claim_token = #{claimToken,jdbcType=VARCHAR},
                claimed_by = #{claimedBy,jdbcType=BIGINT},
                claimed_at = #{claimedAt,jdbcType=TIMESTAMP},
                update_time = CURRENT_TIMESTAMP
            WHERE id IN (
                SELECT id
                FROM system_supervision_alert_review_runtime_outbox
                WHERE (
                    outbox_status = 'pending'
                    OR (
                        outbox_status = 'processing'
                        AND #{reclaimBefore,jdbcType=TIMESTAMP} IS NOT NULL
                        AND (
                            claimed_at IS NULL
                            OR claimed_at < #{reclaimBefore,jdbcType=TIMESTAMP}
                        )
                    )
                )
                  AND deleted = FALSE
                ORDER BY created_at ASC, id ASC
                LIMIT #{limit,jdbcType=INTEGER}
                FOR UPDATE SKIP LOCKED
            )
            """)
    int claimPending(@Param("limit") Integer limit,
                     @Param("claimToken") String claimToken,
                     @Param("claimedBy") Long claimedBy,
                     @Param("claimedAt") LocalDateTime claimedAt,
                     @Param("reclaimBefore") LocalDateTime reclaimBefore);

    default List<SupervisionAlertReviewRuntimeOutboxDO> selectClaimed(String claimToken, Integer limit) {
        int normalizedLimit = limit == null || limit <= 0 ? 50 : Math.min(limit, 200);
        return selectList(new LambdaQueryWrapperX<SupervisionAlertReviewRuntimeOutboxDO>()
                .eq(SupervisionAlertReviewRuntimeOutboxDO::getOutboxStatus, "processing")
                .eq(SupervisionAlertReviewRuntimeOutboxDO::getClaimToken, claimToken)
                .orderByAsc(SupervisionAlertReviewRuntimeOutboxDO::getCreatedAt)
                .orderByAsc(SupervisionAlertReviewRuntimeOutboxDO::getId)
                .last("LIMIT " + normalizedLimit));
    }

    default boolean existsActive(String eventType, String alertKey) {
        return selectCount(new LambdaQueryWrapperX<SupervisionAlertReviewRuntimeOutboxDO>()
                .eq(SupervisionAlertReviewRuntimeOutboxDO::getEventType, eventType)
                .eq(SupervisionAlertReviewRuntimeOutboxDO::getAlertKey, alertKey)
                .in(SupervisionAlertReviewRuntimeOutboxDO::getOutboxStatus, List.of("pending", "processing", "published"))) > 0;
    }

}

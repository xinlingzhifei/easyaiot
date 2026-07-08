package com.basiclab.iot.system.dal.pgsql.supervision;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewRuntimeOutboxDO;
import org.apache.ibatis.annotations.Mapper;

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

    default boolean existsActive(String eventType, String alertKey) {
        return selectCount(new LambdaQueryWrapperX<SupervisionAlertReviewRuntimeOutboxDO>()
                .eq(SupervisionAlertReviewRuntimeOutboxDO::getEventType, eventType)
                .eq(SupervisionAlertReviewRuntimeOutboxDO::getAlertKey, alertKey)
                .in(SupervisionAlertReviewRuntimeOutboxDO::getOutboxStatus, List.of("pending", "published"))) > 0;
    }

}

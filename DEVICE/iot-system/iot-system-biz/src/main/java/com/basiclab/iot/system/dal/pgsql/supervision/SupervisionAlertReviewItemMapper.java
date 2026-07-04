package com.basiclab.iot.system.dal.pgsql.supervision;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewItemDO;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService;
import org.apache.ibatis.annotations.Mapper;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface SupervisionAlertReviewItemMapper extends BaseMapperX<SupervisionAlertReviewItemDO> {

    default SupervisionAlertReviewItemDO selectMergeCandidate(Long tenantId,
                                                             String sourceSystem,
                                                             String cameraId,
                                                             String zoneCode,
                                                             String ruleCode,
                                                             LocalDateTime windowStart,
                                                             LocalDateTime windowEnd) {
        LambdaQueryWrapperX<SupervisionAlertReviewItemDO> query = new LambdaQueryWrapperX<SupervisionAlertReviewItemDO>()
                .eq(SupervisionAlertReviewItemDO::getReviewStatus, SupervisionAlertReviewService.STATUS_PENDING_REVIEW)
                .eqIfPresent(SupervisionAlertReviewItemDO::getTenantId, tenantId)
                .eq(SupervisionAlertReviewItemDO::getSourceSystem, sourceSystem)
                .eq(SupervisionAlertReviewItemDO::getCameraId, cameraId)
                .geIfPresent(SupervisionAlertReviewItemDO::getLastAlertTime, windowStart)
                .leIfPresent(SupervisionAlertReviewItemDO::getFirstAlertTime, windowEnd)
                .orderByDesc(SupervisionAlertReviewItemDO::getLastAlertTime)
                .last("LIMIT 1");
        return selectOne(query);
    }

    default List<SupervisionAlertReviewItemDO> selectWorkbench(Long tenantId,
                                                              String reviewStatus,
                                                              String cameraId,
                                                              LocalDateTime beginTime,
                                                              LocalDateTime endTime) {
        return selectList(new LambdaQueryWrapperX<SupervisionAlertReviewItemDO>()
                .eqIfPresent(SupervisionAlertReviewItemDO::getTenantId, tenantId)
                .eqIfPresent(SupervisionAlertReviewItemDO::getReviewStatus, reviewStatus)
                .eqIfPresent(SupervisionAlertReviewItemDO::getCameraId, cameraId)
                .geIfPresent(SupervisionAlertReviewItemDO::getLastAlertTime, beginTime)
                .leIfPresent(SupervisionAlertReviewItemDO::getFirstAlertTime, endTime)
                .orderByDesc(SupervisionAlertReviewItemDO::getLastAlertTime));
    }

}

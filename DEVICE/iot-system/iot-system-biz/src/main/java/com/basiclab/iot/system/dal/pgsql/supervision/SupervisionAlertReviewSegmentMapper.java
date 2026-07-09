package com.basiclab.iot.system.dal.pgsql.supervision;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewSegmentDO;
import org.apache.ibatis.annotations.Mapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Mapper
public interface SupervisionAlertReviewSegmentMapper extends BaseMapperX<SupervisionAlertReviewSegmentDO> {

    default SupervisionAlertReviewSegmentDO selectByReviewItemId(Long reviewItemId) {
        return selectOne(new LambdaQueryWrapperX<SupervisionAlertReviewSegmentDO>()
                .eq(SupervisionAlertReviewSegmentDO::getReviewItemId, reviewItemId)
                .eq(SupervisionAlertReviewSegmentDO::getDeleted, false));
    }

    default List<SupervisionAlertReviewSegmentDO> selectOverlapping(Long tenantId,
                                                                    String cameraId,
                                                                    LocalDateTime startTime,
                                                                    LocalDateTime endTime) {
        return selectList(new LambdaQueryWrapperX<SupervisionAlertReviewSegmentDO>()
                .eq(SupervisionAlertReviewSegmentDO::getCameraId, cameraId)
                .eq(SupervisionAlertReviewSegmentDO::getDeleted, false)
                .orderByDesc(SupervisionAlertReviewSegmentDO::getStartTime))
                .stream()
                .filter(segment -> Objects.equals(tenantId, segment.getTenantId()))
                .filter(segment -> overlaps(startTime, endTime, segment.getStartTime(), segment.getEndTime()))
                .toList();
    }

    private static boolean overlaps(LocalDateTime startTime,
                                    LocalDateTime endTime,
                                    LocalDateTime existingStartTime,
                                    LocalDateTime existingEndTime) {
        LocalDateTime leftEnd = endTime == null ? LocalDateTime.MAX : endTime;
        LocalDateTime rightEnd = existingEndTime == null ? LocalDateTime.MAX : existingEndTime;
        return startTime.isBefore(rightEnd) && existingStartTime.isBefore(leftEnd);
    }

}

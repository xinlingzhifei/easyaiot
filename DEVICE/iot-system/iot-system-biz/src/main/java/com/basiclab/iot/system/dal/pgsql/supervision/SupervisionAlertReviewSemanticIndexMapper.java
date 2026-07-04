package com.basiclab.iot.system.dal.pgsql.supervision;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewSemanticIndexDO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface SupervisionAlertReviewSemanticIndexMapper extends BaseMapperX<SupervisionAlertReviewSemanticIndexDO> {

    default SupervisionAlertReviewSemanticIndexDO selectByReviewItemId(Long reviewItemId) {
        return selectOne(new LambdaQueryWrapperX<SupervisionAlertReviewSemanticIndexDO>()
                .eq(SupervisionAlertReviewSemanticIndexDO::getReviewItemId, reviewItemId));
    }

    default List<SupervisionAlertReviewSemanticIndexDO> selectByReviewItemIds(List<Long> reviewItemIds) {
        if (reviewItemIds == null || reviewItemIds.isEmpty()) {
            return List.of();
        }
        return selectList(new LambdaQueryWrapperX<SupervisionAlertReviewSemanticIndexDO>()
                .in(SupervisionAlertReviewSemanticIndexDO::getReviewItemId, reviewItemIds));
    }

}

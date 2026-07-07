package com.basiclab.iot.system.dal.pgsql.supervision;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewCaseAuditDO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface SupervisionAlertReviewCaseAuditMapper extends BaseMapperX<SupervisionAlertReviewCaseAuditDO> {

    default List<SupervisionAlertReviewCaseAuditDO> selectByCaseId(Long reviewCaseId) {
        return selectList(new LambdaQueryWrapperX<SupervisionAlertReviewCaseAuditDO>()
                .eq(SupervisionAlertReviewCaseAuditDO::getReviewCaseId, reviewCaseId)
                .orderByAsc(SupervisionAlertReviewCaseAuditDO::getHappenedAt)
                .orderByAsc(SupervisionAlertReviewCaseAuditDO::getId));
    }

    default List<SupervisionAlertReviewCaseAuditDO> selectByReviewItemId(Long reviewItemId) {
        return selectList(new LambdaQueryWrapperX<SupervisionAlertReviewCaseAuditDO>()
                .eq(SupervisionAlertReviewCaseAuditDO::getReviewItemId, reviewItemId)
                .orderByAsc(SupervisionAlertReviewCaseAuditDO::getHappenedAt)
                .orderByAsc(SupervisionAlertReviewCaseAuditDO::getId));
    }

}

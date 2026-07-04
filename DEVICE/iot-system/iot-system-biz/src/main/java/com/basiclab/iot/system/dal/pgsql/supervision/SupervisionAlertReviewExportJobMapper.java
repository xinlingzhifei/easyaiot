package com.basiclab.iot.system.dal.pgsql.supervision;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewExportJobDO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface SupervisionAlertReviewExportJobMapper extends BaseMapperX<SupervisionAlertReviewExportJobDO> {

    default SupervisionAlertReviewExportJobDO selectByJobNo(String jobNo) {
        return selectOne(new LambdaQueryWrapperX<SupervisionAlertReviewExportJobDO>()
                .eq(SupervisionAlertReviewExportJobDO::getJobNo, jobNo));
    }

    default List<SupervisionAlertReviewExportJobDO> selectByReviewCaseId(Long reviewCaseId) {
        return selectList(new LambdaQueryWrapperX<SupervisionAlertReviewExportJobDO>()
                .eq(SupervisionAlertReviewExportJobDO::getReviewCaseId, reviewCaseId)
                .orderByAsc(SupervisionAlertReviewExportJobDO::getGeneratedAt));
    }

    default List<SupervisionAlertReviewExportJobDO> selectAll() {
        return selectList(new LambdaQueryWrapperX<SupervisionAlertReviewExportJobDO>()
                .orderByAsc(SupervisionAlertReviewExportJobDO::getGeneratedAt));
    }

}

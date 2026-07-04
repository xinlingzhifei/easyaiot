package com.basiclab.iot.system.dal.pgsql.supervision;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewCaseDO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface SupervisionAlertReviewCaseMapper extends BaseMapperX<SupervisionAlertReviewCaseDO> {

    default List<SupervisionAlertReviewCaseDO> selectLatest() {
        return selectList(new LambdaQueryWrapperX<SupervisionAlertReviewCaseDO>()
                .orderByDesc(SupervisionAlertReviewCaseDO::getId));
    }

}

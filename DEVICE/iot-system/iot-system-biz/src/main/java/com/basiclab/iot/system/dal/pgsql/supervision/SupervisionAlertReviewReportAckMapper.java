package com.basiclab.iot.system.dal.pgsql.supervision;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionAlertReviewReportAckDO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SupervisionAlertReviewReportAckMapper extends BaseMapperX<SupervisionAlertReviewReportAckDO> {

    default SupervisionAlertReviewReportAckDO selectByTenantAndReportKey(Long tenantId, String reportKey) {
        return selectOne(new LambdaQueryWrapperX<SupervisionAlertReviewReportAckDO>()
                .eq(SupervisionAlertReviewReportAckDO::getTenantId, tenantId)
                .eq(SupervisionAlertReviewReportAckDO::getReportKey, reportKey)
                .last("LIMIT 1"));
    }

}

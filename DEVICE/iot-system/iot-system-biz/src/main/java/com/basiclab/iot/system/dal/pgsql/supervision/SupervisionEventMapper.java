package com.basiclab.iot.system.dal.pgsql.supervision;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionEventDO;
import com.basiclab.iot.system.enums.supervision.SupervisionEventStatusEnum;
import org.apache.ibatis.annotations.Mapper;

import java.time.LocalDateTime;

@Mapper
public interface SupervisionEventMapper extends BaseMapperX<SupervisionEventDO> {

    default SupervisionEventDO selectOpenBySourceAlert(String sourceSystem, String sourceAlertId) {
        return selectOne(new LambdaQueryWrapperX<SupervisionEventDO>()
                .eq(SupervisionEventDO::getSourceSystem, sourceSystem)
                .eq(SupervisionEventDO::getSourceAlertId, sourceAlertId)
                .ne(SupervisionEventDO::getEventStatus, SupervisionEventStatusEnum.CLOSED.getCode()));
    }

    default int updateStatusToDispatched(Long eventId, LocalDateTime dispatchedAt) {
        return update(new SupervisionEventDO()
                        .setEventStatus(SupervisionEventStatusEnum.DISPATCHED.getCode())
                        .setDispatchedAt(dispatchedAt),
                new LambdaQueryWrapperX<SupervisionEventDO>()
                        .eq(SupervisionEventDO::getId, eventId)
                        .eq(SupervisionEventDO::getEventStatus, SupervisionEventStatusEnum.CREATED.getCode()));
    }

}

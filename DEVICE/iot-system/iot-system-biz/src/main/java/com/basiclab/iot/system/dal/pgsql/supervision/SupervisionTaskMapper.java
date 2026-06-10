package com.basiclab.iot.system.dal.pgsql.supervision;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionTaskDO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SupervisionTaskMapper extends BaseMapperX<SupervisionTaskDO> {
}

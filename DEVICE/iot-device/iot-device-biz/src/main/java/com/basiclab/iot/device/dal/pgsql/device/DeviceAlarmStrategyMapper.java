package com.basiclab.iot.device.dal.pgsql.device;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.basiclab.iot.device.domain.device.vo.DeviceAlarmStrategy;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface DeviceAlarmStrategyMapper extends BaseMapper<DeviceAlarmStrategy> {

    DeviceAlarmStrategy selectByDeviceIdentification(@Param("deviceIdentification") String deviceIdentification);
}

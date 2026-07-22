package com.basiclab.iot.device.dal.pgsql.device;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.basiclab.iot.device.domain.device.vo.DevicePropertyThreshold;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface DevicePropertyThresholdMapper extends BaseMapper<DevicePropertyThreshold> {

    List<DevicePropertyThreshold> selectByDeviceIdentification(@Param("deviceIdentification") String deviceIdentification);

    DevicePropertyThreshold selectByDeviceAndCode(@Param("deviceIdentification") String deviceIdentification,
                                                  @Param("propertyCode") String propertyCode);

    List<DevicePropertyThreshold> selectEnabledByDevice(@Param("deviceIdentification") String deviceIdentification);
}

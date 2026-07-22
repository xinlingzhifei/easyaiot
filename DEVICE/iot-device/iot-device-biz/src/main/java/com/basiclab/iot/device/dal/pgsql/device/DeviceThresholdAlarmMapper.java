package com.basiclab.iot.device.dal.pgsql.device;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.basiclab.iot.device.domain.device.vo.DeviceThresholdAlarm;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface DeviceThresholdAlarmMapper extends BaseMapper<DeviceThresholdAlarm> {

    List<DeviceThresholdAlarm> selectOpenByDevice(@Param("deviceIdentification") String deviceIdentification);

    DeviceThresholdAlarm selectLatestOpen(@Param("deviceIdentification") String deviceIdentification,
                                          @Param("propertyCode") String propertyCode);

    int countOpenByDevice(@Param("deviceIdentification") String deviceIdentification);

    int countOpenSince(@Param("deviceIdentification") String deviceIdentification,
                       @Param("propertyCode") String propertyCode,
                       @Param("since") LocalDateTime since);
}

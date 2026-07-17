package com.basiclab.iot.device.dal.pgsql.device;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.basiclab.iot.device.domain.device.vo.DeviceServiceRecord;
import org.apache.ibatis.annotations.Mapper;

/**
 * Mapper for device service invocation records.
 */
@Mapper
public interface DeviceServiceMapper extends BaseMapper<DeviceServiceRecord> {
}

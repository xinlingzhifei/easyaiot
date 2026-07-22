package com.basiclab.iot.device.dal.pgsql.device;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.basiclab.iot.device.domain.device.vo.DeviceAssociatedLink;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface DeviceAssociatedLinkMapper extends BaseMapper<DeviceAssociatedLink> {

    List<DeviceAssociatedLink> selectByCenter(@Param("centerDeviceIdentification") String centerDeviceIdentification);

    int deleteByCenterAndAssociatedIds(@Param("centerDeviceIdentification") String centerDeviceIdentification,
                                       @Param("associatedDeviceIds") List<Long> associatedDeviceIds);

    int deleteByCenterAndAssociatedIdentifications(@Param("centerDeviceIdentification") String centerDeviceIdentification,
                                                   @Param("identifications") List<String> identifications);
}

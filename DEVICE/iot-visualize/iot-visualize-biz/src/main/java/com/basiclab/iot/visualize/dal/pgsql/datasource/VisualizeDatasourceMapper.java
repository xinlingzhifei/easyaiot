package com.basiclab.iot.visualize.dal.pgsql.datasource;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.visualize.controller.admin.datasource.vo.VisualizeDatasourcePageReqVO;
import com.basiclab.iot.visualize.dal.dataobject.datasource.VisualizeDatasourceDO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface VisualizeDatasourceMapper extends BaseMapperX<VisualizeDatasourceDO> {

    default PageResult<VisualizeDatasourceDO> selectPage(VisualizeDatasourcePageReqVO reqVO) {
        return selectPage(reqVO, new LambdaQueryWrapperX<VisualizeDatasourceDO>()
                .likeIfPresent(VisualizeDatasourceDO::getDsName, reqVO.getDsName())
                .eqIfPresent(VisualizeDatasourceDO::getDsType, reqVO.getDsType())
                .eqIfPresent(VisualizeDatasourceDO::getStatus, reqVO.getStatus())
                .orderByDesc(VisualizeDatasourceDO::getId));
    }

}

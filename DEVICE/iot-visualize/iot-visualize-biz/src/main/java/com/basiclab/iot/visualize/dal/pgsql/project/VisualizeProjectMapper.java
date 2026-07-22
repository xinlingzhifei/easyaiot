package com.basiclab.iot.visualize.dal.pgsql.project;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.visualize.controller.admin.project.vo.VisualizeProjectPageReqVO;
import com.basiclab.iot.visualize.dal.dataobject.project.VisualizeProjectDO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface VisualizeProjectMapper extends BaseMapperX<VisualizeProjectDO> {

    default PageResult<VisualizeProjectDO> selectPage(VisualizeProjectPageReqVO reqVO) {
        return selectPage(reqVO, new LambdaQueryWrapperX<VisualizeProjectDO>()
                .likeIfPresent(VisualizeProjectDO::getProjectName, reqVO.getProjectName())
                .eqIfPresent(VisualizeProjectDO::getProjectType, reqVO.getProjectType())
                .eqIfPresent(VisualizeProjectDO::getState, reqVO.getState())
                .orderByDesc(VisualizeProjectDO::getId));
    }

}

package com.basiclab.iot.visualize.dal.pgsql.deploy;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.visualize.controller.admin.deploy.vo.VisualizeDeployPageReqVO;
import com.basiclab.iot.visualize.dal.dataobject.deploy.VisualizeDeployDO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface VisualizeDeployMapper extends BaseMapperX<VisualizeDeployDO> {

    default PageResult<VisualizeDeployDO> selectPage(VisualizeDeployPageReqVO reqVO) {
        return selectPage(reqVO, new LambdaQueryWrapperX<VisualizeDeployDO>()
                .likeIfPresent(VisualizeDeployDO::getDeployName, reqVO.getDeployName())
                .eqIfPresent(VisualizeDeployDO::getProjectId, reqVO.getProjectId())
                .eqIfPresent(VisualizeDeployDO::getStatus, reqVO.getStatus())
                .orderByDesc(VisualizeDeployDO::getId));
    }

    default VisualizeDeployDO selectByDeployCode(String deployCode) {
        return selectOne(VisualizeDeployDO::getDeployCode, deployCode);
    }

}

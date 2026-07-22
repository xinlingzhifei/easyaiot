package com.basiclab.iot.visualize.service.deploy;

import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.visualize.controller.admin.deploy.vo.VisualizeDeployPageReqVO;
import com.basiclab.iot.visualize.controller.admin.deploy.vo.VisualizeDeploySaveReqVO;
import com.basiclab.iot.visualize.dal.dataobject.deploy.VisualizeDeployDO;

public interface VisualizeDeployService {

    Long createDeploy(VisualizeDeploySaveReqVO createReqVO);

    void updateDeploy(VisualizeDeploySaveReqVO updateReqVO);

    void deleteDeploy(Long id);

    VisualizeDeployDO getDeploy(Long id);

    PageResult<VisualizeDeployDO> getDeployPage(VisualizeDeployPageReqVO pageReqVO);

    void onlineDeploy(Long id);

    void offlineDeploy(Long id);

}

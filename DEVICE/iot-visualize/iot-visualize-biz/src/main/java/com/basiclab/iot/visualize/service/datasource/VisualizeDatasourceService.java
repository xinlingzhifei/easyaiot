package com.basiclab.iot.visualize.service.datasource;

import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.visualize.controller.admin.datasource.vo.VisualizeDatasourcePageReqVO;
import com.basiclab.iot.visualize.controller.admin.datasource.vo.VisualizeDatasourceSaveReqVO;
import com.basiclab.iot.visualize.dal.dataobject.datasource.VisualizeDatasourceDO;

public interface VisualizeDatasourceService {

    Long createDatasource(VisualizeDatasourceSaveReqVO createReqVO);

    void updateDatasource(VisualizeDatasourceSaveReqVO updateReqVO);

    void deleteDatasource(Long id);

    VisualizeDatasourceDO getDatasource(Long id);

    PageResult<VisualizeDatasourceDO> getDatasourcePage(VisualizeDatasourcePageReqVO pageReqVO);

}

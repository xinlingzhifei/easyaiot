package com.basiclab.iot.visualize.service.datasource;

import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.common.utils.object.BeanUtils;
import com.basiclab.iot.visualize.controller.admin.datasource.vo.VisualizeDatasourcePageReqVO;
import com.basiclab.iot.visualize.controller.admin.datasource.vo.VisualizeDatasourceSaveReqVO;
import com.basiclab.iot.visualize.dal.dataobject.datasource.VisualizeDatasourceDO;
import com.basiclab.iot.visualize.dal.pgsql.datasource.VisualizeDatasourceMapper;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import javax.annotation.Resource;

import static com.basiclab.iot.common.exception.util.ServiceExceptionUtil.exception;
import static com.basiclab.iot.visualize.enums.ErrorCodeConstants.DATASOURCE_NOT_FOUND;

@Service
@Validated
public class VisualizeDatasourceServiceImpl implements VisualizeDatasourceService {

    @Resource
    private VisualizeDatasourceMapper datasourceMapper;

    @Override
    public Long createDatasource(VisualizeDatasourceSaveReqVO createReqVO) {
        VisualizeDatasourceDO ds = BeanUtils.toBean(createReqVO, VisualizeDatasourceDO.class);
        if (ds.getStatus() == null) {
            ds.setStatus(0);
        }
        if (ds.getRequestMethod() == null || ds.getRequestMethod().isEmpty()) {
            ds.setRequestMethod("GET");
        }
        datasourceMapper.insert(ds);
        return ds.getId();
    }

    @Override
    public void updateDatasource(VisualizeDatasourceSaveReqVO updateReqVO) {
        validateExists(updateReqVO.getId());
        datasourceMapper.updateById(BeanUtils.toBean(updateReqVO, VisualizeDatasourceDO.class));
    }

    @Override
    public void deleteDatasource(Long id) {
        validateExists(id);
        datasourceMapper.deleteById(id);
    }

    @Override
    public VisualizeDatasourceDO getDatasource(Long id) {
        return datasourceMapper.selectById(id);
    }

    @Override
    public PageResult<VisualizeDatasourceDO> getDatasourcePage(VisualizeDatasourcePageReqVO pageReqVO) {
        return datasourceMapper.selectPage(pageReqVO);
    }

    private void validateExists(Long id) {
        if (id == null || datasourceMapper.selectById(id) == null) {
            throw exception(DATASOURCE_NOT_FOUND);
        }
    }

}

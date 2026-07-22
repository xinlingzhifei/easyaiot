package com.basiclab.iot.visualize.controller.admin.datasource;

import com.basiclab.iot.common.domain.CommonResult;
import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.common.utils.object.BeanUtils;
import com.basiclab.iot.visualize.controller.admin.datasource.vo.VisualizeDatasourcePageReqVO;
import com.basiclab.iot.visualize.controller.admin.datasource.vo.VisualizeDatasourceRespVO;
import com.basiclab.iot.visualize.controller.admin.datasource.vo.VisualizeDatasourceSaveReqVO;
import com.basiclab.iot.visualize.dal.dataobject.datasource.VisualizeDatasourceDO;
import com.basiclab.iot.visualize.service.datasource.VisualizeDatasourceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import javax.validation.Valid;

import static com.basiclab.iot.common.domain.CommonResult.success;

@Tag(name = "管理后台 - VISUALIZE 数据源")
@RestController
@RequestMapping("/visualize/datasource")
@Validated
public class VisualizeDatasourceController {

    @Resource
    private VisualizeDatasourceService datasourceService;

    @PostMapping("/create")
    @Operation(summary = "创建数据源")
    public CommonResult<Long> createDatasource(@Valid @RequestBody VisualizeDatasourceSaveReqVO createReqVO) {
        return success(datasourceService.createDatasource(createReqVO));
    }

    @PutMapping("/update")
    @Operation(summary = "更新数据源")
    public CommonResult<Boolean> updateDatasource(@Valid @RequestBody VisualizeDatasourceSaveReqVO updateReqVO) {
        datasourceService.updateDatasource(updateReqVO);
        return success(true);
    }

    @DeleteMapping("/delete")
    @Operation(summary = "删除数据源")
    @Parameter(name = "id", description = "编号", required = true)
    public CommonResult<Boolean> deleteDatasource(@RequestParam("id") Long id) {
        datasourceService.deleteDatasource(id);
        return success(true);
    }

    @GetMapping("/get")
    @Operation(summary = "获得数据源详情")
    @Parameter(name = "id", description = "编号", required = true)
    public CommonResult<VisualizeDatasourceRespVO> getDatasource(@RequestParam("id") Long id) {
        VisualizeDatasourceDO ds = datasourceService.getDatasource(id);
        return success(BeanUtils.toBean(ds, VisualizeDatasourceRespVO.class));
    }

    @GetMapping("/page")
    @Operation(summary = "获得数据源分页")
    public CommonResult<PageResult<VisualizeDatasourceRespVO>> getDatasourcePage(@Validated VisualizeDatasourcePageReqVO pageReqVO) {
        PageResult<VisualizeDatasourceDO> pageResult = datasourceService.getDatasourcePage(pageReqVO);
        return success(BeanUtils.toBean(pageResult, VisualizeDatasourceRespVO.class));
    }

}

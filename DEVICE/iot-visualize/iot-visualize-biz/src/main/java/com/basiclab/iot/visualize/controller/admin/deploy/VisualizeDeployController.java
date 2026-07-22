package com.basiclab.iot.visualize.controller.admin.deploy;

import com.basiclab.iot.common.domain.CommonResult;
import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.common.utils.object.BeanUtils;
import com.basiclab.iot.visualize.controller.admin.deploy.vo.VisualizeDeployPageReqVO;
import com.basiclab.iot.visualize.controller.admin.deploy.vo.VisualizeDeployRespVO;
import com.basiclab.iot.visualize.controller.admin.deploy.vo.VisualizeDeploySaveReqVO;
import com.basiclab.iot.visualize.dal.dataobject.deploy.VisualizeDeployDO;
import com.basiclab.iot.visualize.service.deploy.VisualizeDeployService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import javax.validation.Valid;

import static com.basiclab.iot.common.domain.CommonResult.success;

@Tag(name = "管理后台 - VISUALIZE 服务部署")
@RestController
@RequestMapping("/visualize/deploy")
@Validated
public class VisualizeDeployController {

    @Resource
    private VisualizeDeployService deployService;

    @PostMapping("/create")
    @Operation(summary = "创建服务部署")
    public CommonResult<Long> createDeploy(@Valid @RequestBody VisualizeDeploySaveReqVO createReqVO) {
        return success(deployService.createDeploy(createReqVO));
    }

    @PutMapping("/update")
    @Operation(summary = "更新服务部署")
    public CommonResult<Boolean> updateDeploy(@Valid @RequestBody VisualizeDeploySaveReqVO updateReqVO) {
        deployService.updateDeploy(updateReqVO);
        return success(true);
    }

    @DeleteMapping("/delete")
    @Operation(summary = "删除服务部署")
    @Parameter(name = "id", description = "编号", required = true)
    public CommonResult<Boolean> deleteDeploy(@RequestParam("id") Long id) {
        deployService.deleteDeploy(id);
        return success(true);
    }

    @GetMapping("/get")
    @Operation(summary = "获得服务部署详情")
    @Parameter(name = "id", description = "编号", required = true)
    public CommonResult<VisualizeDeployRespVO> getDeploy(@RequestParam("id") Long id) {
        VisualizeDeployDO deploy = deployService.getDeploy(id);
        return success(BeanUtils.toBean(deploy, VisualizeDeployRespVO.class));
    }

    @GetMapping("/page")
    @Operation(summary = "获得服务部署分页")
    public CommonResult<PageResult<VisualizeDeployRespVO>> getDeployPage(@Validated VisualizeDeployPageReqVO pageReqVO) {
        PageResult<VisualizeDeployDO> pageResult = deployService.getDeployPage(pageReqVO);
        return success(BeanUtils.toBean(pageResult, VisualizeDeployRespVO.class));
    }

    @PutMapping("/online")
    @Operation(summary = "上线服务部署")
    @Parameter(name = "id", description = "编号", required = true)
    public CommonResult<Boolean> onlineDeploy(@RequestParam("id") Long id) {
        deployService.onlineDeploy(id);
        return success(true);
    }

    @PutMapping("/offline")
    @Operation(summary = "下线服务部署")
    @Parameter(name = "id", description = "编号", required = true)
    public CommonResult<Boolean> offlineDeploy(@RequestParam("id") Long id) {
        deployService.offlineDeploy(id);
        return success(true);
    }

}

package com.basiclab.iot.visualize.controller.admin.asset;

import com.basiclab.iot.common.domain.CommonResult;
import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.common.utils.object.BeanUtils;
import com.basiclab.iot.visualize.controller.admin.asset.vo.VisualizeAssetPageReqVO;
import com.basiclab.iot.visualize.controller.admin.asset.vo.VisualizeAssetRespVO;
import com.basiclab.iot.visualize.controller.admin.asset.vo.VisualizeAssetSaveReqVO;
import com.basiclab.iot.visualize.dal.dataobject.asset.VisualizeAssetDO;
import com.basiclab.iot.visualize.service.asset.VisualizeAssetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import javax.validation.Valid;

import static com.basiclab.iot.common.domain.CommonResult.success;

@Tag(name = "管理后台 - VISUALIZE 素材")
@RestController
@RequestMapping("/visualize/asset")
@Validated
public class VisualizeAssetController {

    @Resource
    private VisualizeAssetService assetService;

    @PostMapping("/create")
    @Operation(summary = "登记素材（文件需先上传至 file 服务）")
    public CommonResult<Long> createAsset(@Valid @RequestBody VisualizeAssetSaveReqVO createReqVO) {
        return success(assetService.createAsset(createReqVO));
    }

    @PutMapping("/update")
    @Operation(summary = "更新素材")
    public CommonResult<Boolean> updateAsset(@Valid @RequestBody VisualizeAssetSaveReqVO updateReqVO) {
        assetService.updateAsset(updateReqVO);
        return success(true);
    }

    @DeleteMapping("/delete")
    @Operation(summary = "删除素材")
    @Parameter(name = "id", description = "编号", required = true)
    public CommonResult<Boolean> deleteAsset(@RequestParam("id") Long id) {
        assetService.deleteAsset(id);
        return success(true);
    }

    @GetMapping("/get")
    @Operation(summary = "获得素材详情")
    @Parameter(name = "id", description = "编号", required = true)
    public CommonResult<VisualizeAssetRespVO> getAsset(@RequestParam("id") Long id) {
        VisualizeAssetDO asset = assetService.getAsset(id);
        return success(BeanUtils.toBean(asset, VisualizeAssetRespVO.class));
    }

    @GetMapping("/page")
    @Operation(summary = "获得素材分页")
    public CommonResult<PageResult<VisualizeAssetRespVO>> getAssetPage(@Validated VisualizeAssetPageReqVO pageReqVO) {
        PageResult<VisualizeAssetDO> pageResult = assetService.getAssetPage(pageReqVO);
        return success(BeanUtils.toBean(pageResult, VisualizeAssetRespVO.class));
    }

}

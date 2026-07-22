package com.basiclab.iot.visualize.controller.admin.template;

import com.basiclab.iot.common.domain.CommonResult;
import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.common.utils.object.BeanUtils;
import com.basiclab.iot.visualize.controller.admin.template.vo.VisualizeTemplatePageReqVO;
import com.basiclab.iot.visualize.controller.admin.template.vo.VisualizeTemplateRespVO;
import com.basiclab.iot.visualize.controller.admin.template.vo.VisualizeTemplateSaveReqVO;
import com.basiclab.iot.visualize.dal.dataobject.template.VisualizeTemplateDO;
import com.basiclab.iot.visualize.service.template.VisualizeTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import javax.validation.Valid;

import static com.basiclab.iot.common.domain.CommonResult.success;

@Tag(name = "管理后台 - VISUALIZE 模板")
@RestController
@RequestMapping("/visualize/template")
@Validated
public class VisualizeTemplateController {

    @Resource
    private VisualizeTemplateService templateService;

    @PostMapping("/create")
    @Operation(summary = "创建模板")
    public CommonResult<Long> createTemplate(@Valid @RequestBody VisualizeTemplateSaveReqVO createReqVO) {
        return success(templateService.createTemplate(createReqVO));
    }

    @PutMapping("/update")
    @Operation(summary = "更新模板")
    public CommonResult<Boolean> updateTemplate(@Valid @RequestBody VisualizeTemplateSaveReqVO updateReqVO) {
        templateService.updateTemplate(updateReqVO);
        return success(true);
    }

    @DeleteMapping("/delete")
    @Operation(summary = "删除模板")
    @Parameter(name = "id", description = "编号", required = true)
    public CommonResult<Boolean> deleteTemplate(@RequestParam("id") Long id) {
        templateService.deleteTemplate(id);
        return success(true);
    }

    @GetMapping("/get")
    @Operation(summary = "获得模板详情")
    @Parameter(name = "id", description = "编号", required = true)
    public CommonResult<VisualizeTemplateRespVO> getTemplate(@RequestParam("id") Long id) {
        VisualizeTemplateDO template = templateService.getTemplate(id);
        return success(BeanUtils.toBean(template, VisualizeTemplateRespVO.class));
    }

    @GetMapping("/page")
    @Operation(summary = "获得模板分页")
    public CommonResult<PageResult<VisualizeTemplateRespVO>> getTemplatePage(@Validated VisualizeTemplatePageReqVO pageReqVO) {
        PageResult<VisualizeTemplateDO> pageResult = templateService.getTemplatePage(pageReqVO);
        return success(BeanUtils.toBean(pageResult, VisualizeTemplateRespVO.class));
    }

}

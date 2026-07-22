package com.basiclab.iot.visualize.controller.admin.project;

import com.basiclab.iot.common.domain.CommonResult;
import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.common.utils.object.BeanUtils;
import com.basiclab.iot.visualize.controller.admin.project.vo.*;
import com.basiclab.iot.visualize.dal.dataobject.project.VisualizeProjectDO;
import com.basiclab.iot.visualize.service.project.VisualizeProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import javax.validation.Valid;

import static com.basiclab.iot.common.domain.CommonResult.success;

@Tag(name = "管理后台 - VISUALIZE 可视化项目")
@RestController
@RequestMapping("/visualize/project")
@Validated
public class VisualizeProjectController {

    @Resource
    private VisualizeProjectService projectService;

    @PostMapping("/create")
    @Operation(summary = "创建可视化项目（大屏/组态）")
    //@PreAuthorize("@ss.hasPermission('visualize:project:create')")
    public CommonResult<Long> createProject(@Valid @RequestBody VisualizeProjectSaveReqVO createReqVO) {
        return success(projectService.createProject(createReqVO));
    }

    @PutMapping("/update")
    @Operation(summary = "更新可视化项目元数据")
    //@PreAuthorize("@ss.hasPermission('visualize:project:update')")
    public CommonResult<Boolean> updateProject(@Valid @RequestBody VisualizeProjectSaveReqVO updateReqVO) {
        projectService.updateProject(updateReqVO);
        return success(true);
    }

    @PutMapping("/save-content")
    @Operation(summary = "保存画布内容（仅大屏）")
    //@PreAuthorize("@ss.hasPermission('visualize:project:update')")
    public CommonResult<Boolean> saveContent(@Valid @RequestBody VisualizeProjectSaveContentReqVO reqVO) {
        projectService.saveContent(reqVO);
        return success(true);
    }

    @PutMapping("/publish")
    @Operation(summary = "发布/取消发布")
    //@PreAuthorize("@ss.hasPermission('visualize:project:publish')")
    public CommonResult<Boolean> publishProject(@Valid @RequestBody VisualizeProjectPublishReqVO reqVO) {
        projectService.publishProject(reqVO);
        return success(true);
    }

    @DeleteMapping("/delete")
    @Operation(summary = "删除可视化项目")
    @Parameter(name = "id", description = "编号", required = true)
    //@PreAuthorize("@ss.hasPermission('visualize:project:delete')")
    public CommonResult<Boolean> deleteProject(@RequestParam("id") Long id) {
        projectService.deleteProject(id);
        return success(true);
    }

    @GetMapping("/get")
    @Operation(summary = "获得可视化项目详情")
    @Parameter(name = "id", description = "编号", required = true)
    //@PreAuthorize("@ss.hasPermission('visualize:project:query')")
    public CommonResult<VisualizeProjectRespVO> getProject(@RequestParam("id") Long id) {
        VisualizeProjectDO project = projectService.getProject(id);
        return success(BeanUtils.toBean(project, VisualizeProjectRespVO.class));
    }

    @GetMapping("/page")
    @Operation(summary = "获得可视化项目分页")
    //@PreAuthorize("@ss.hasPermission('visualize:project:query')")
    public CommonResult<PageResult<VisualizeProjectRespVO>> getProjectPage(@Validated VisualizeProjectPageReqVO pageReqVO) {
        PageResult<VisualizeProjectDO> pageResult = projectService.getProjectPage(pageReqVO);
        return success(BeanUtils.toBean(pageResult, VisualizeProjectRespVO.class));
    }

    @GetMapping("/fuxa-open")
    @Operation(summary = "获取 FUXA 免登打开地址（SSO 代登录）")
    @Parameter(name = "id", description = "组态项目编号；可空（仅按 editorRef 打开）")
    @Parameter(name = "mode", description = "edit 编辑器 / preview 运行态", example = "edit")
    @Parameter(name = "editorRef", description = "可选：覆盖项目 editorRef（画面名或 /editor）")
    //@PreAuthorize("@ss.hasPermission('visualize:project:query')")
    public CommonResult<VisualizeFuxaOpenRespVO> getFuxaOpenUrl(
            @RequestParam(value = "id", required = false) Long id,
            @RequestParam(value = "mode", required = false, defaultValue = "edit") String mode,
            @RequestParam(value = "editorRef", required = false) String editorRef) {
        return success(projectService.buildFuxaOpenUrl(id, mode, editorRef));
    }

}

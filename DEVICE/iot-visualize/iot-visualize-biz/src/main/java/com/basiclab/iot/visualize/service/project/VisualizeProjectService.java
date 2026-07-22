package com.basiclab.iot.visualize.service.project;

import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.visualize.controller.admin.project.vo.VisualizeFuxaOpenRespVO;
import com.basiclab.iot.visualize.controller.admin.project.vo.VisualizeProjectPageReqVO;
import com.basiclab.iot.visualize.controller.admin.project.vo.VisualizeProjectPublishReqVO;
import com.basiclab.iot.visualize.controller.admin.project.vo.VisualizeProjectSaveContentReqVO;
import com.basiclab.iot.visualize.controller.admin.project.vo.VisualizeProjectSaveReqVO;
import com.basiclab.iot.visualize.dal.dataobject.project.VisualizeProjectDO;

public interface VisualizeProjectService {

    Long createProject(VisualizeProjectSaveReqVO createReqVO);

    void updateProject(VisualizeProjectSaveReqVO updateReqVO);

    void saveContent(VisualizeProjectSaveContentReqVO reqVO);

    void publishProject(VisualizeProjectPublishReqVO reqVO);

    void deleteProject(Long id);

    VisualizeProjectDO getProject(Long id);

    PageResult<VisualizeProjectDO> getProjectPage(VisualizeProjectPageReqVO pageReqVO);

    /**
     * 生成打开 FUXA 编辑器/运行态的 URL（SSO 代登录或直跳）
     *
     * @param id   项目 ID；可为空（仅按 editorRef 打开）
     * @param mode edit / preview
     * @param editorRef 可选覆盖项目上的 editorRef
     */
    VisualizeFuxaOpenRespVO buildFuxaOpenUrl(Long id, String mode, String editorRef);

}

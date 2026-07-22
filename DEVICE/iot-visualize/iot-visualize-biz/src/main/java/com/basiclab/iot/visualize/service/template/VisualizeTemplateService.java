package com.basiclab.iot.visualize.service.template;

import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.visualize.controller.admin.template.vo.VisualizeTemplatePageReqVO;
import com.basiclab.iot.visualize.controller.admin.template.vo.VisualizeTemplateSaveReqVO;
import com.basiclab.iot.visualize.dal.dataobject.template.VisualizeTemplateDO;

public interface VisualizeTemplateService {

    Long createTemplate(VisualizeTemplateSaveReqVO createReqVO);

    void updateTemplate(VisualizeTemplateSaveReqVO updateReqVO);

    void deleteTemplate(Long id);

    VisualizeTemplateDO getTemplate(Long id);

    PageResult<VisualizeTemplateDO> getTemplatePage(VisualizeTemplatePageReqVO pageReqVO);

}

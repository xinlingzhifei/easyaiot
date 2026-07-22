package com.basiclab.iot.visualize.service.template;

import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.common.utils.object.BeanUtils;
import com.basiclab.iot.visualize.controller.admin.template.vo.VisualizeTemplatePageReqVO;
import com.basiclab.iot.visualize.controller.admin.template.vo.VisualizeTemplateSaveReqVO;
import com.basiclab.iot.visualize.dal.dataobject.template.VisualizeTemplateDO;
import com.basiclab.iot.visualize.dal.pgsql.template.VisualizeTemplateMapper;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import javax.annotation.Resource;

import static com.basiclab.iot.common.exception.util.ServiceExceptionUtil.exception;
import static com.basiclab.iot.visualize.enums.ErrorCodeConstants.TEMPLATE_NOT_FOUND;

@Service
@Validated
public class VisualizeTemplateServiceImpl implements VisualizeTemplateService {

    @Resource
    private VisualizeTemplateMapper templateMapper;

    @Override
    public Long createTemplate(VisualizeTemplateSaveReqVO createReqVO) {
        VisualizeTemplateDO template = BeanUtils.toBean(createReqVO, VisualizeTemplateDO.class);
        if (template.getSort() == null) {
            template.setSort(0);
        }
        templateMapper.insert(template);
        return template.getId();
    }

    @Override
    public void updateTemplate(VisualizeTemplateSaveReqVO updateReqVO) {
        validateExists(updateReqVO.getId());
        templateMapper.updateById(BeanUtils.toBean(updateReqVO, VisualizeTemplateDO.class));
    }

    @Override
    public void deleteTemplate(Long id) {
        validateExists(id);
        templateMapper.deleteById(id);
    }

    @Override
    public VisualizeTemplateDO getTemplate(Long id) {
        return templateMapper.selectById(id);
    }

    @Override
    public PageResult<VisualizeTemplateDO> getTemplatePage(VisualizeTemplatePageReqVO pageReqVO) {
        return templateMapper.selectPage(pageReqVO);
    }

    private void validateExists(Long id) {
        if (id == null || templateMapper.selectById(id) == null) {
            throw exception(TEMPLATE_NOT_FOUND);
        }
    }

}

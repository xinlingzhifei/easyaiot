package com.basiclab.iot.visualize.dal.pgsql.template;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.visualize.controller.admin.template.vo.VisualizeTemplatePageReqVO;
import com.basiclab.iot.visualize.dal.dataobject.template.VisualizeTemplateDO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface VisualizeTemplateMapper extends BaseMapperX<VisualizeTemplateDO> {

    default PageResult<VisualizeTemplateDO> selectPage(VisualizeTemplatePageReqVO reqVO) {
        return selectPage(reqVO, new LambdaQueryWrapperX<VisualizeTemplateDO>()
                .likeIfPresent(VisualizeTemplateDO::getTemplateName, reqVO.getTemplateName())
                .eqIfPresent(VisualizeTemplateDO::getCategory, reqVO.getCategory())
                .orderByAsc(VisualizeTemplateDO::getSort)
                .orderByDesc(VisualizeTemplateDO::getId));
    }

}

package com.basiclab.iot.visualize.controller.admin.template.vo;

import com.basiclab.iot.common.domain.PageParam;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "管理后台 - 模板分页 Request VO")
@Data
@EqualsAndHashCode(callSuper = true)
public class VisualizeTemplatePageReqVO extends PageParam {

    @Schema(description = "模板名称，模糊匹配")
    private String templateName;

    @Schema(description = "分类")
    private String category;

}

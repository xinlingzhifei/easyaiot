package com.basiclab.iot.visualize.controller.admin.template.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Schema(description = "管理后台 - 模板创建/修改 Request VO")
@Data
public class VisualizeTemplateSaveReqVO {

    @Schema(description = "编号")
    private Long id;

    @Schema(description = "模板名称", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "模板名称不能为空")
    @Size(max = 128, message = "模板名称不能超过128个字符")
    private String templateName;

    @Schema(description = "分类")
    private String category;

    @Schema(description = "封面图 URL")
    private String coverImage;

    @Schema(description = "备注")
    private String remarks;

    @Schema(description = "模板画布 JSON")
    private String content;

    @Schema(description = "排序")
    private Integer sort;

}

package com.basiclab.iot.visualize.controller.admin.project.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Schema(description = "管理后台 - 保存画布内容 Request VO")
@Data
public class VisualizeProjectSaveContentReqVO {

    @Schema(description = "项目编号", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "项目编号不能为空")
    private Long id;

    @Schema(description = "画布 JSON", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "画布内容不能为空")
    private String content;

}

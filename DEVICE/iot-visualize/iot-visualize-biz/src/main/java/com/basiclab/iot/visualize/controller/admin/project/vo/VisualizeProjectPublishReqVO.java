package com.basiclab.iot.visualize.controller.admin.project.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import javax.validation.constraints.NotNull;

@Schema(description = "管理后台 - 发布大屏 Request VO")
@Data
public class VisualizeProjectPublishReqVO {

    @Schema(description = "项目编号", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "项目编号不能为空")
    private Long id;

    @Schema(description = "发布状态：-1 未发布，1 已发布", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "发布状态不能为空")
    private Integer state;

}

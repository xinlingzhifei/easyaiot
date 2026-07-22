package com.basiclab.iot.visualize.controller.admin.project.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Schema(description = "管理后台 - 可视化项目 Response VO")
@Data
public class VisualizeProjectRespVO {

    @Schema(description = "编号")
    private Long id;

    @Schema(description = "项目名称")
    private String projectName;

    @Schema(description = "项目类型：dashboard 大屏，scada 组态（FUXA）")
    private String projectType;

    @Schema(description = "发布状态：-1 未发布，1 已发布")
    private Integer state;

    @Schema(description = "缩略图 URL")
    private String indexImage;

    @Schema(description = "备注")
    private String remarks;

    @Schema(description = "画布 JSON（大屏）")
    private String content;

    @Schema(description = "外部编辑器引用（组态）")
    private String editorRef;

    @Schema(description = "创建时间")
    private LocalDateTime createTime;

    @Schema(description = "更新时间")
    private LocalDateTime updateTime;

}

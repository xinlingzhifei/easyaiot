package com.basiclab.iot.visualize.controller.admin.template.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Schema(description = "管理后台 - 模板 Response VO")
@Data
public class VisualizeTemplateRespVO {

    private Long id;
    private String templateName;
    private String category;
    private String coverImage;
    private String remarks;
    private String content;
    private Integer sort;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

}

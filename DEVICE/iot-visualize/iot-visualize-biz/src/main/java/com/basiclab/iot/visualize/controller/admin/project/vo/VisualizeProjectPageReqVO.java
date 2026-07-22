package com.basiclab.iot.visualize.controller.admin.project.vo;

import com.basiclab.iot.common.domain.PageParam;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "管理后台 - 可视化项目分页 Request VO")
@Data
@EqualsAndHashCode(callSuper = true)
public class VisualizeProjectPageReqVO extends PageParam {

    @Schema(description = "项目名称，模糊匹配")
    private String projectName;

    @Schema(description = "项目类型：dashboard 大屏，scada 组态")
    private String projectType;

    @Schema(description = "发布状态：-1 未发布，1 已发布")
    private Integer state;

}

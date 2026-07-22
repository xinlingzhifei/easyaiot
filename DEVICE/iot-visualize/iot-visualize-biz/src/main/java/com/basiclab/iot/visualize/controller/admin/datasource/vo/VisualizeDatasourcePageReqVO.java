package com.basiclab.iot.visualize.controller.admin.datasource.vo;

import com.basiclab.iot.common.domain.PageParam;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "管理后台 - 数据源分页 Request VO")
@Data
@EqualsAndHashCode(callSuper = true)
public class VisualizeDatasourcePageReqVO extends PageParam {

    @Schema(description = "数据源名称")
    private String dsName;

    @Schema(description = "类型：http/sql/static/device")
    private String dsType;

    @Schema(description = "状态：0 启用，1 停用")
    private Integer status;

}

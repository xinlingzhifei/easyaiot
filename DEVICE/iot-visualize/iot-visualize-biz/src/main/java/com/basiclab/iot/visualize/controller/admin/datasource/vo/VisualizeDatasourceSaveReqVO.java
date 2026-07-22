package com.basiclab.iot.visualize.controller.admin.datasource.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Schema(description = "管理后台 - 数据源保存 Request VO")
@Data
public class VisualizeDatasourceSaveReqVO {

    private Long id;

    @NotBlank(message = "数据源名称不能为空")
    @Size(max = 128)
    private String dsName;

    @NotBlank(message = "数据源类型不能为空")
    private String dsType;

    private String requestMethod;
    private String requestUrl;
    private String requestHeaders;
    private String requestBody;
    private String sqlContent;
    private String staticData;
    private Integer status;
    private String remarks;

}

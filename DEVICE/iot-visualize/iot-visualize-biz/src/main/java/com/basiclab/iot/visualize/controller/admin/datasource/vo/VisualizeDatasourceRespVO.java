package com.basiclab.iot.visualize.controller.admin.datasource.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Schema(description = "管理后台 - 数据源 Response VO")
@Data
public class VisualizeDatasourceRespVO {

    private Long id;
    private String dsName;
    private String dsType;
    private String requestMethod;
    private String requestUrl;
    private String requestHeaders;
    private String requestBody;
    private String sqlContent;
    private String staticData;
    private Integer status;
    private String remarks;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

}

package com.basiclab.iot.visualize.controller.admin.deploy.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Schema(description = "管理后台 - 服务部署 Response VO")
@Data
public class VisualizeDeployRespVO {

    private Long id;
    private String deployName;
    private Long projectId;
    private String projectName;
    private String deployCode;
    private Integer status;
    private String accessPath;
    private LocalDateTime expireTime;
    private String remarks;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

}

package com.basiclab.iot.visualize.controller.admin.deploy.vo;

import com.basiclab.iot.common.domain.PageParam;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "管理后台 - 服务部署分页 Request VO")
@Data
@EqualsAndHashCode(callSuper = true)
public class VisualizeDeployPageReqVO extends PageParam {

    @Schema(description = "部署名称")
    private String deployName;

    @Schema(description = "项目编号")
    private Long projectId;

    @Schema(description = "状态：0 草稿，1 已上线，2 已下线")
    private Integer status;

}

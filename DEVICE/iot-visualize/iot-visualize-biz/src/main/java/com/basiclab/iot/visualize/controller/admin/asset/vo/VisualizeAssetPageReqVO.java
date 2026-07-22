package com.basiclab.iot.visualize.controller.admin.asset.vo;

import com.basiclab.iot.common.domain.PageParam;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "管理后台 - 素材分页 Request VO")
@Data
@EqualsAndHashCode(callSuper = true)
public class VisualizeAssetPageReqVO extends PageParam {

    @Schema(description = "素材名称，模糊匹配")
    private String assetName;

    @Schema(description = "素材类型")
    private String assetType;

}

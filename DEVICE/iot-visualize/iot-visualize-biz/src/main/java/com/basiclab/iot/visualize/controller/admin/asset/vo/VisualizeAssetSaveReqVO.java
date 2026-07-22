package com.basiclab.iot.visualize.controller.admin.asset.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Schema(description = "管理后台 - 素材登记 Request VO")
@Data
public class VisualizeAssetSaveReqVO {

    @Schema(description = "编号")
    private Long id;

    @Schema(description = "素材名称", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "素材名称不能为空")
    @Size(max = 256, message = "素材名称不能超过256个字符")
    private String assetName;

    @Schema(description = "素材类型，默认 image")
    private String assetType;

    @Schema(description = "文件 URL", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "文件 URL 不能为空")
    private String fileUrl;

    @Schema(description = "文件大小（字节）")
    private Long fileSize;

    @Schema(description = "备注")
    private String remarks;

}

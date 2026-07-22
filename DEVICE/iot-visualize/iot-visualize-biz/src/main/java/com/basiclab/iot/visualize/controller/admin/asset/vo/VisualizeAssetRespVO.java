package com.basiclab.iot.visualize.controller.admin.asset.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Schema(description = "管理后台 - 素材 Response VO")
@Data
public class VisualizeAssetRespVO {

    private Long id;
    private String assetName;
    private String assetType;
    private String fileUrl;
    private Long fileSize;
    private String remarks;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

}

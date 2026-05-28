package com.basiclab.iot.dataset.domain.dataset.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 图片/压缩包上传结果
 */
@Schema(description = "图片数据集上传结果")
@Data
public class DatasetImageUploadRespVO {

    @Schema(description = "成功上传数量")
    private int successCount;

    @Schema(description = "失败数量")
    private int failedCount;

    @Schema(description = "跳过的非图片条目数量")
    private int skippedCount;

    @Schema(description = "失败文件及原因（最多返回前 20 条）")
    private List<String> failedFiles = new ArrayList<>();
}

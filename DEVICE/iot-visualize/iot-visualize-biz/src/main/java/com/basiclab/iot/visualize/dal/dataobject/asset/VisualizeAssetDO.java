package com.basiclab.iot.visualize.dal.dataobject.asset;

import com.baomidou.mybatisplus.annotation.KeySequence;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.basiclab.iot.common.core.db.TenantBaseDO;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * VISUALIZE 素材
 */
@TableName("visualize_asset")
@KeySequence("visualize_asset_seq")
@Data
@EqualsAndHashCode(callSuper = true)
public class VisualizeAssetDO extends TenantBaseDO {

    @TableId
    private Long id;
    private String assetName;
    private String assetType;
    private String fileUrl;
    private Long fileSize;
    private String remarks;

}

package com.basiclab.iot.visualize.dal.dataobject.template;

import com.baomidou.mybatisplus.annotation.KeySequence;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.basiclab.iot.common.core.db.TenantBaseDO;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * VISUALIZE 模板
 */
@TableName("visualize_template")
@KeySequence("visualize_template_seq")
@Data
@EqualsAndHashCode(callSuper = true)
public class VisualizeTemplateDO extends TenantBaseDO {

    @TableId
    private Long id;
    private String templateName;
    private String category;
    private String coverImage;
    private String remarks;
    private String content;
    private Integer sort;

}

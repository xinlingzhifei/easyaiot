package com.basiclab.iot.visualize.dal.dataobject.project;

import com.baomidou.mybatisplus.annotation.KeySequence;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.basiclab.iot.common.core.db.TenantBaseDO;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * VISUALIZE 可视化项目（大屏 / 组态）
 */
@TableName("visualize_project")
@KeySequence("visualize_project_seq")
@Data
@EqualsAndHashCode(callSuper = true)
public class VisualizeProjectDO extends TenantBaseDO {

    @TableId
    private Long id;
    /** 项目名称 */
    private String projectName;
    /**
     * 项目类型：dashboard 大屏，scada 组态（FUXA）
     * @see com.basiclab.iot.visualize.enums.VisualizeProjectTypeEnum
     */
    private String projectType;
    /** 发布状态：-1 未发布，1 已发布 */
    private Integer state;
    /** 缩略图 URL */
    private String indexImage;
    /** 备注 */
    private String remarks;
    /** 画布 JSON（大屏）；组态项目可为空 */
    private String content;
    /** 外部编辑器引用（组态可选：FUXA 画面名或相对路径） */
    private String editorRef;

}

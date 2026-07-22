package com.basiclab.iot.visualize.dal.dataobject.deploy;

import com.baomidou.mybatisplus.annotation.KeySequence;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.basiclab.iot.common.core.db.TenantBaseDO;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@TableName("visualize_deploy")
@KeySequence("visualize_deploy_seq")
@Data
@EqualsAndHashCode(callSuper = true)
public class VisualizeDeployDO extends TenantBaseDO {

    @TableId
    private Long id;
    private String deployName;
    private Long projectId;
    private String projectName;
    private String deployCode;
    /** 0 草稿，1 已上线，2 已下线 */
    private Integer status;
    private String accessPath;
    private LocalDateTime expireTime;
    private String remarks;

}

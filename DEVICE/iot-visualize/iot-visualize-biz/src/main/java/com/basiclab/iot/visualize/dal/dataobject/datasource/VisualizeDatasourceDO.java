package com.basiclab.iot.visualize.dal.dataobject.datasource;

import com.baomidou.mybatisplus.annotation.KeySequence;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.basiclab.iot.common.core.db.TenantBaseDO;
import lombok.Data;
import lombok.EqualsAndHashCode;

@TableName("visualize_datasource")
@KeySequence("visualize_datasource_seq")
@Data
@EqualsAndHashCode(callSuper = true)
public class VisualizeDatasourceDO extends TenantBaseDO {

    @TableId
    private Long id;
    private String dsName;
    /** http / sql / static / device */
    private String dsType;
    private String requestMethod;
    private String requestUrl;
    private String requestHeaders;
    private String requestBody;
    private String sqlContent;
    private String staticData;
    /** 0 启用，1 停用 */
    private Integer status;
    private String remarks;

}

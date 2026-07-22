package com.basiclab.iot.visualize.enums;

import com.basiclab.iot.common.exception.ErrorCode;

/**
 * VISUALIZE 错误码：1-020-xxx-xxx
 */
public interface ErrorCodeConstants {

    ErrorCode PROJECT_NOT_FOUND = new ErrorCode(1_020_001_001, "可视化项目不存在");
    ErrorCode PROJECT_TYPE_INVALID = new ErrorCode(1_020_001_002, "项目类型无效，仅支持 dashboard（大屏）或 scada（组态）");
    ErrorCode PROJECT_NOT_SCADA = new ErrorCode(1_020_001_003, "非组态项目，无法打开 FUXA");
    ErrorCode FUXA_SSO_FAILED = new ErrorCode(1_020_001_004, "FUXA 代登录失败，请检查组态服务是否可用");
    ErrorCode TEMPLATE_NOT_FOUND = new ErrorCode(1_020_002_001, "模板不存在");
    ErrorCode ASSET_NOT_FOUND = new ErrorCode(1_020_003_001, "素材不存在");
    ErrorCode DATASOURCE_NOT_FOUND = new ErrorCode(1_020_004_001, "数据源不存在");
    ErrorCode DEPLOY_NOT_FOUND = new ErrorCode(1_020_005_001, "服务部署不存在");
    ErrorCode DEPLOY_CODE_DUPLICATE = new ErrorCode(1_020_005_002, "投放编码已存在");

}

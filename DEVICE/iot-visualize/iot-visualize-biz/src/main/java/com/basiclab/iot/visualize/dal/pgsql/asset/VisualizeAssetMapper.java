package com.basiclab.iot.visualize.dal.pgsql.asset;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.visualize.controller.admin.asset.vo.VisualizeAssetPageReqVO;
import com.basiclab.iot.visualize.dal.dataobject.asset.VisualizeAssetDO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface VisualizeAssetMapper extends BaseMapperX<VisualizeAssetDO> {

    default PageResult<VisualizeAssetDO> selectPage(VisualizeAssetPageReqVO reqVO) {
        return selectPage(reqVO, new LambdaQueryWrapperX<VisualizeAssetDO>()
                .likeIfPresent(VisualizeAssetDO::getAssetName, reqVO.getAssetName())
                .eqIfPresent(VisualizeAssetDO::getAssetType, reqVO.getAssetType())
                .orderByDesc(VisualizeAssetDO::getId));
    }

}

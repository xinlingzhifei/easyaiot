package com.basiclab.iot.visualize.service.asset;

import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.visualize.controller.admin.asset.vo.VisualizeAssetPageReqVO;
import com.basiclab.iot.visualize.controller.admin.asset.vo.VisualizeAssetSaveReqVO;
import com.basiclab.iot.visualize.dal.dataobject.asset.VisualizeAssetDO;

public interface VisualizeAssetService {

    Long createAsset(VisualizeAssetSaveReqVO createReqVO);

    void updateAsset(VisualizeAssetSaveReqVO updateReqVO);

    void deleteAsset(Long id);

    VisualizeAssetDO getAsset(Long id);

    PageResult<VisualizeAssetDO> getAssetPage(VisualizeAssetPageReqVO pageReqVO);

}

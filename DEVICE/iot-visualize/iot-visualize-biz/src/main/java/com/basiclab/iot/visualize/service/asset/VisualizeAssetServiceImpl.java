package com.basiclab.iot.visualize.service.asset;

import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.common.utils.object.BeanUtils;
import com.basiclab.iot.visualize.controller.admin.asset.vo.VisualizeAssetPageReqVO;
import com.basiclab.iot.visualize.controller.admin.asset.vo.VisualizeAssetSaveReqVO;
import com.basiclab.iot.visualize.dal.dataobject.asset.VisualizeAssetDO;
import com.basiclab.iot.visualize.dal.pgsql.asset.VisualizeAssetMapper;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import javax.annotation.Resource;

import static com.basiclab.iot.common.exception.util.ServiceExceptionUtil.exception;
import static com.basiclab.iot.visualize.enums.ErrorCodeConstants.ASSET_NOT_FOUND;

@Service
@Validated
public class VisualizeAssetServiceImpl implements VisualizeAssetService {

    @Resource
    private VisualizeAssetMapper assetMapper;

    @Override
    public Long createAsset(VisualizeAssetSaveReqVO createReqVO) {
        VisualizeAssetDO asset = BeanUtils.toBean(createReqVO, VisualizeAssetDO.class);
        if (asset.getAssetType() == null || asset.getAssetType().isEmpty()) {
            asset.setAssetType("image");
        }
        assetMapper.insert(asset);
        return asset.getId();
    }

    @Override
    public void updateAsset(VisualizeAssetSaveReqVO updateReqVO) {
        validateExists(updateReqVO.getId());
        assetMapper.updateById(BeanUtils.toBean(updateReqVO, VisualizeAssetDO.class));
    }

    @Override
    public void deleteAsset(Long id) {
        validateExists(id);
        assetMapper.deleteById(id);
    }

    @Override
    public VisualizeAssetDO getAsset(Long id) {
        return assetMapper.selectById(id);
    }

    @Override
    public PageResult<VisualizeAssetDO> getAssetPage(VisualizeAssetPageReqVO pageReqVO) {
        return assetMapper.selectPage(pageReqVO);
    }

    private void validateExists(Long id) {
        if (id == null || assetMapper.selectById(id) == null) {
            throw exception(ASSET_NOT_FOUND);
        }
    }

}

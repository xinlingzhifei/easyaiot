package com.basiclab.iot.dataset.dal.pgsql;

import com.basiclab.iot.common.core.mapper.BaseMapperX;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.dataset.dal.dataobject.DatasetImageDO;
import com.basiclab.iot.dataset.domain.dataset.vo.DatasetImagePageReqVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

/**
 * 图片数据集 Mapper
 *
 * @author 翱翔的雄库鲁
 * @email andywebjava@163.com
 */
@Mapper
public interface DatasetImageMapper extends BaseMapperX<DatasetImageDO> {

    /**
     * 分页查询
     *
     * @param reqVO
     * @return
     */
    default PageResult<DatasetImageDO> selectPage(DatasetImagePageReqVO reqVO) {
        return selectPage(reqVO, new LambdaQueryWrapperX<DatasetImageDO>()
                .eqIfPresent(DatasetImageDO::getDatasetId, reqVO.getDatasetId())
                .likeIfPresent(DatasetImageDO::getName, reqVO.getName())
                .eqIfPresent(DatasetImageDO::getPath, reqVO.getPath())
                .eqIfPresent(DatasetImageDO::getCompleted, reqVO.getCompleted())
                .eqIfPresent(DatasetImageDO::getIsTrain, reqVO.getIsTrain())
                .eqIfPresent(DatasetImageDO::getIsValidation, reqVO.getIsValidation())
                .eqIfPresent(DatasetImageDO::getIsTest, reqVO.getIsTest())
                .eqIfPresent(DatasetImageDO::getModificationCount, reqVO.getModificationCount())
                .betweenIfPresent(DatasetImageDO::getLastModified, reqVO.getLastModified())
                .eqIfPresent(DatasetImageDO::getWidth, reqVO.getWidth())
                .eqIfPresent(DatasetImageDO::getHeigh, reqVO.getHeigh())
                .eqIfPresent(DatasetImageDO::getSize, reqVO.getSize())
                .eqIfPresent(DatasetImageDO::getDatasetVideoId, reqVO.getDatasetVideoId())
                .orderByDesc(DatasetImageDO::getUpdateTime));
    }

    /**
     * 根据数据集ID查询图片列表
     *
     * @param datasetId
     * @return
     */
    List<Long> selectImageIdsByDatasetId(@Param("datasetId") Long datasetId);

    /**
     * 批量更新图片使用状态
     *
     * @param imageIds
     * @param isTrain
     * @param isValidation
     * @param isTest
     */
    void batchUpdateUsage(@Param("imageIds") List<Long> imageIds,
                          @Param("isTrain") int isTrain,
                          @Param("isValidation") int isValidation,
                          @Param("isTest") int isTest);

    /**
     * 重置数据集下所有图片的使用状态
     *
     * @param datasetId
     */
    void resetUsageByDatasetId(@Param("datasetId") Long datasetId);

    /**
     * 根据数据集ID查询所有图片
     *
     * @param datasetId 数据集ID
     * @return 图片列表
     */
    List<DatasetImageDO> selectByDatasetId(@Param("datasetId") Long datasetId);

    /**
     * 将 PostgreSQL 主键序列同步到当前表内最大 id，避免 COPY/手工导入数据后 nextval 与已有主键冲突。
     */
    void syncIdSequence();

    /**
     * 按数据集 ID 与文件名批量查询已有图片（用于导入覆盖）
     */
    default List<DatasetImageDO> selectByDatasetIdAndNames(@Param("datasetId") Long datasetId,
                                                             @Param("names") Collection<String> names) {
        if (names == null || names.isEmpty()) {
            return Collections.emptyList();
        }
        return selectList(new LambdaQueryWrapperX<DatasetImageDO>()
                .eq(DatasetImageDO::getDatasetId, datasetId)
                .in(DatasetImageDO::getName, names));
    }
}
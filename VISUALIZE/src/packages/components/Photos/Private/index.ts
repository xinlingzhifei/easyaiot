import { ChartFrameEnum, ConfigType, PackagesCategoryEnum } from '@/packages/index.d'
import { ImageConfig } from '@/packages/components/Informations/Mores/Image/index'
import { ChatCategoryEnum, ChatCategoryEnumName } from '../index.d'
import { goDialog } from '@/utils'
import { FileTypeEnum } from '@/enums/fileTypeEnum'
import { backgroundImageSize } from '@/settings/designSetting'
import { usePackagesStore } from '@/store/modules/packagesStore/packagesStore'
import { createAssetApi, fetchAssetPageApi, uploadFileApi } from '@/api/path'

/**
 * 上传完成事件类型
 */
type UploadCompletedEventType = {
  fileName: string
  url: string
}

const userPhotosList: ConfigType[] = []

const loadRemotePhotos = async () => {
  try {
    const res: any = await fetchAssetPageApi({ pageNo: 1, pageSize: 100, assetType: 'image' })
    const rows = res?.data?.list || []
    const packagesStore = usePackagesStore()
    rows.forEach((item: any, index: number) => {
      const photo: ConfigType = {
        ...ImageConfig,
        category: ChatCategoryEnum.PRIVATE,
        categoryName: ChatCategoryEnumName.PRIVATE,
        package: PackagesCategoryEnum.PHOTOS,
        chartFrame: ChartFrameEnum.STATIC,
        title: item.assetName,
        image: item.fileUrl,
        dataset: item.fileUrl,
        redirectComponent: `${ImageConfig.package}/${ImageConfig.category}/${ImageConfig.key}`
      }
      userPhotosList.push(photo)
      packagesStore.addPhotos(photo, index + 1)
    })
  } catch (e) {
    // 未登录或后端不可用时忽略
  }
}

// 异步加载远程素材
loadRemotePhotos()

const uploadFile = (callback: Function | null = null) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.png,.jpg,.jpeg,.gif'
  input.onchange = async () => {
    if (!input.files || !input.files.length) return
    const file = input.files[0]
    const { name, size, type } = file
    if (size > 1024 * 1024 * backgroundImageSize) {
      window['$message'].warning(`图片超出 ${backgroundImageSize}M 限制，请重新上传！`)
      return false
    }
    if (type !== FileTypeEnum.PNG && type !== FileTypeEnum.JPEG && type !== FileTypeEnum.GIF) {
      window['$message'].warning('文件格式不符合，请重新上传！')
      return false
    }
    try {
      const uploadRes: any = await uploadFileApi(file)
      const fileData = uploadRes?.data
      const url = fileData?.url
      if (!url) {
        window['$message'].error('上传失败')
        return
      }
      await createAssetApi({
        assetName: name,
        assetType: 'image',
        fileUrl: url,
        fileSize: size
      })
      const eventObj: UploadCompletedEventType = { fileName: name, url }
      callback && callback(eventObj)
    } catch (e) {
      // 拦截器已提示
    }
  }
  input.click()
}

const addConfig = {
  ...ImageConfig,
  category: ChatCategoryEnum.PRIVATE,
  categoryName: ChatCategoryEnumName.PRIVATE,
  package: PackagesCategoryEnum.PHOTOS,
  chartFrame: ChartFrameEnum.STATIC,
  title: '点击上传图片',
  image: 'upload.png',
  redirectComponent: `${ImageConfig.package}/${ImageConfig.category}/${ImageConfig.key}`,
  disabled: true,
  configEvents: {
    addHandle: (photoConfig: ConfigType) => {
      goDialog({
        message: `图片需小于 ${backgroundImageSize}M。将上传至文件服务并登记到素材库。`,
        transformOrigin: 'center',
        onPositiveCallback: () => {
          uploadFile((e: UploadCompletedEventType) => {
            const packagesStore = usePackagesStore()
            const newPhoto = {
              ...ImageConfig,
              category: ChatCategoryEnum.PRIVATE,
              categoryName: ChatCategoryEnumName.PRIVATE,
              package: PackagesCategoryEnum.PHOTOS,
              chartFrame: ChartFrameEnum.STATIC,
              title: e.fileName,
              image: e.url,
              dataset: e.url,
              redirectComponent: `${ImageConfig.package}/${ImageConfig.category}/${ImageConfig.key}`
            }
            userPhotosList.unshift(newPhoto)
            packagesStore.addPhotos(newPhoto, 1)
          })
        }
      })
    }
  }
}

export default [addConfig, ...userPhotosList]

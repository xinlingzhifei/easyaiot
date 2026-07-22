import axiosInstance from '@/api/axios'
import { axiosPre } from '@/settings/httpSetting'

/** 上传文件到 file 服务，返回 { name, url } */
export const uploadFileApi = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return axiosInstance({
    url: `${axiosPre}/sysFile/upload`,
    method: 'post',
    data: formData
    // 不手动设置 Content-Type，由浏览器自动带 multipart boundary
  })
}

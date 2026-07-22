import axios, { AxiosResponse, InternalAxiosRequestConfig, AxiosError } from 'axios'
import { ResultEnum } from "@/enums/httpEnum"
import { ErrorPageNameMap } from "@/enums/pageEnum"
import { redirectErrorPage } from '@/utils'
import { StorageEnum } from '@/enums/storageEnum'
import { getLocalStorage, clearLocalStorage } from '@/utils'
import { defaultTenantId } from '@/settings/httpSetting'

const axiosInstance = axios.create({
  baseURL: import.meta.env.DEV ? import.meta.env.VITE_DEV_PATH : import.meta.env.VITE_PRO_PATH,
  timeout: ResultEnum.TIMEOUT,
})

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokenInfo = getLocalStorage(StorageEnum.GO_ACCESS_TOKEN_STORE)
    const accessToken = tokenInfo?.accessToken
    if (accessToken) {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${accessToken}`
    }
    config.headers = config.headers || {}
    const tenantId = tokenInfo?.tenantId || defaultTenantId
    if (!config.headers['tenant-id']) {
      config.headers['tenant-id'] = tenantId
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

function handleUnauthorized(msg?: string) {
  clearLocalStorage(StorageEnum.GO_ACCESS_TOKEN_STORE)
  clearLocalStorage(StorageEnum.GO_LOGIN_INFO_STORE)
  window['$message']?.error(msg || '登录已过期，请从管理后台重新打开编辑器')
}

// 响应拦截器
axiosInstance.interceptors.response.use(
  (res: AxiosResponse) => {
    // 文件流等无 code
    if (!res.data || typeof res.data !== 'object') return Promise.resolve(res.data)
    const { code, msg, message } = res.data as { code: number; msg?: string; message?: string }
    if (code === undefined || code === null) return Promise.resolve(res.data)
    // DEVICE CommonResult / R 成功码均为 0
    if (code === ResultEnum.DATA_SUCCESS || code === ResultEnum.SUCCESS) {
      return Promise.resolve(res.data)
    }
    // 未授权
    if (code === 401) {
      handleUnauthorized(msg || message)
      return Promise.reject(res.data)
    }
    // 重定向错误页
    if (ErrorPageNameMap.get(code)) redirectErrorPage(code)
    window['$message']?.error(msg || message || '请求失败')
    return Promise.reject(res.data)
  },
  (err: AxiosError) => {
    const status = err.response?.status
    if (status === 401) {
      handleUnauthorized()
    } else {
      window['$message']?.error(err.message || '网络异常')
    }
    return Promise.reject(err)
  }
)

export default axiosInstance

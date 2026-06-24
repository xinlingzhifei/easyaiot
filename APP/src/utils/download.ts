/**
 * 下载工具类 - 支持多端（H5、小程序、APP）
 */

import { isH5, isMpWeixin } from '@uni-helper/uni-env'
import { useTokenStore, useUserStore } from '@/store'
import { getEnvBaseUrl } from '@/utils'
import { stringifyQuery } from '@/http/tools/queryString'

/** 下载后端接口文件 */
export async function downloadApiFile(url: string, params?: Record<string, any>, fileName?: string): Promise<void> {
  const requestUrl = buildApiDownloadUrl(url, params)
  const header = buildDownloadHeader()
  if (isH5) {
    const response = await fetch(requestUrl, { headers: header as HeadersInit })
    if (!response.ok) {
      throw new Error('下载失败')
    }
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    try {
      await downloadFileH5(objectUrl, resolveDownloadFileName(response.headers.get('content-disposition'), fileName || 'download.xlsx'))
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
    return
  }

  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url: requestUrl,
      header,
      success: (res) => {
        if (res.statusCode !== 200) {
          uni.showToast({ icon: 'none', title: '下载失败' })
          reject(new Error('下载失败'))
          return
        }
        uni.openDocument({
          filePath: res.tempFilePath,
          success: () => resolve(),
          fail: reject,
        })
      },
      fail: reject,
    })
  })
}

/** 保存图片到相册 */
export async function saveImageToAlbum(url: string, fileName?: string): Promise<void> {
  if (isH5) {
    await downloadFileH5(url, fileName)
    return
  }
  // 小程序和 APP 端保存图片到相册
  return new Promise((resolve, reject) => {
    // 如果是网络图片，先下载
    if (url.startsWith('http')) {
      uni.downloadFile({
        url,
        success: (downloadResult) => {
          if (downloadResult.statusCode === 200) {
            saveToAlbum(downloadResult.tempFilePath, resolve, reject)
          } else {
            uni.showToast({ icon: 'none', title: '下载失败' })
            reject(new Error('Download failed'))
          }
        },
        fail: (err) => {
          uni.showToast({ icon: 'none', title: '下载失败' })
          reject(err)
        },
      })
    } else {
      // 本地图片直接保存
      saveToAlbum(url, resolve, reject)
    }
  })
}

/** 保存图片到相册（内部方法） */
function saveToAlbum(
  filePath: string,
  resolve: () => void,
  reject: (err: unknown) => void,
): void {
  uni.saveImageToPhotosAlbum({
    filePath,
    success: () => {
      uni.showToast({
        icon: 'success',
        title: '已保存到相册',
      })
      resolve()
    },
    fail: (err) => {
      // 微信小程序需要授权
      if (isMpWeixin && err.errMsg?.includes('auth deny')) {
        uni.showModal({
          title: '提示',
          content: '需要您授权保存相册权限',
          success: (res) => {
            if (res.confirm) {
              uni.openSetting({
                success: (settingRes) => {
                  if (settingRes.authSetting['scope.writePhotosAlbum']) {
                    // 重新尝试保存
                    saveToAlbum(filePath, resolve, reject)
                  } else {
                    reject(new Error('User denied'))
                  }
                },
              })
            } else {
              reject(new Error('User cancelled'))
            }
          },
        })
      } else {
        uni.showToast({
          icon: 'none',
          title: '保存失败',
        })
        reject(err)
      }
    },
  })
}

/** H5 端下载文件 */
async function downloadFileH5(url: string, fileName?: string): Promise<void> {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || resolveFileName(url)
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/** 构造后端下载地址 */
function buildApiDownloadUrl(url: string, params?: Record<string, any>) {
  let requestUrl = url
  if (!requestUrl.startsWith('http')) {
    // #ifdef H5
    if (JSON.parse(import.meta.env.VITE_APP_PROXY_ENABLE)) {
      requestUrl = import.meta.env.VITE_APP_PROXY_PREFIX + requestUrl
    } else {
      requestUrl = getEnvBaseUrl() + requestUrl
    }
    // #endif
    // #ifndef H5
    requestUrl = getEnvBaseUrl() + requestUrl
    // #endif
  }
  if (params) {
    const query = stringifyQuery(params)
    if (query) {
      requestUrl += requestUrl.includes('?') ? `&${query}` : `?${query}`
    }
  }
  return requestUrl
}

/** 构造下载请求头 */
function buildDownloadHeader() {
  const header: Record<string, any> = {}
  const token = useTokenStore().updateNowTime().validToken
  if (token) {
    header.Authorization = `Bearer ${token}`
  }
  const tenantId = useUserStore().tenantId
  if (tenantId) {
    header['tenant-id'] = tenantId
  }
  return header
}

/** 解析下载文件名 */
function resolveDownloadFileName(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) {
    return fallback
  }
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }
  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  return filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : fallback
}

/** 从 URL 中解析文件名 */
function resolveFileName(url: string): string {
  const defaultName = 'downloaded_file'
  try {
    const pathname = new URL(url).pathname
    return pathname.slice(pathname.lastIndexOf('/') + 1) || defaultName
  } catch {
    return url.slice(url.lastIndexOf('/') + 1) || defaultName
  }
}

/** 格式化文件大小 */
export function formatFileSize(size?: number): string {
  if (!size) {
    return '-'
  }
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`
  }
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/**
 * 获取静态资源完整 URL 地址
 * @param path 资源路径
 * @returns 完整的静态资源 URL 地址
 */
export function staticUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_STATIC_BASEURL || ''
  // 确保 path 以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

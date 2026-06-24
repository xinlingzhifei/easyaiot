/**
 * 业务图片展示地址解析（对齐 WEB alertMinioImage.ts）
 * - MinIO：/api/v1/buckets/... 经同源或网关代理
 * - VIDEO API：/video/... 前缀 /dev-api（浏览器直连 VIDEO，不经网关鉴权）
 * - 主机本地绝对路径：/data/... 经 VIDEO alert/image 代理
 */
import { getEnvBaseUrl, getEnvBaseUrlRoot } from '@/utils'

/** 浏览器直连 VIDEO 服务前缀（对齐 WEB VITE_GLOB_API_URL=/dev-api，不经网关鉴权） */
export function getVideoApiPrefix(): string {
  return (import.meta.env.VITE_APP_VIDEO_API_PREFIX || '/dev-api').replace(/\/$/, '')
}

export function isHostLocalMediaPath(path: string | null | undefined): boolean {
  if (!path)
    return false
  const p = String(path).trim()
  if (!p.startsWith('/'))
    return false
  if (p.startsWith('/api/') || p.startsWith('/video/'))
    return false
  return (
    p.startsWith('/data/')
    || p.startsWith('/mnt/')
    || p.startsWith('/app/')
    || p.startsWith('/tmp/')
  )
}

/** 为 API / MinIO / 流媒体路径补全可访问前缀 */
export function withApiPrefix(path: string): string {
  if (!path.startsWith('/'))
    return path

  const proxyPrefix = import.meta.env.VITE_APP_PROXY_PREFIX || '/admin-api'

  // #ifdef H5
  if (JSON.parse(import.meta.env.VITE_APP_PROXY_ENABLE)) {
    if (
      path.startsWith('/api/v1/buckets/')
      || path.startsWith('/live/')
      || path.startsWith('/ai/')
      || path.startsWith('/rtp/')
    ) {
      return path
    }
    if (path.startsWith('/video/')) {
      return resolveVideoApiPath(path)
    }
    if (path.startsWith('/infra/')) {
      return `${proxyPrefix}${path}`
    }
    if (path.startsWith(proxyPrefix))
      return path
  }
  // #endif

  const base = getEnvBaseUrl().replace(/\/$/, '')
  if (path.startsWith('/video/'))
    return resolveVideoApiPath(path)
  if (path.startsWith('/infra/'))
    return `${base}${path}`
  if (path.startsWith('/api/v1/buckets/'))
    return `${getEnvBaseUrlRoot()}${path}`
  return `${base}${path}`
}

function resolveVideoApiPath(path: string): string {
  return `${getVideoApiPrefix()}${path}`
}

function getSameOriginBase(): string {
  // #ifdef H5
  if (typeof window !== 'undefined' && window.location?.origin)
    return window.location.origin
  // #endif
  return getEnvBaseUrlRoot()
}

/** 将后端返回的 localhost 绝对地址改写为当前环境可访问的相对路径 */
function rewriteBackendAbsoluteUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const backendRoot = getEnvBaseUrlRoot()
    if (parsed.origin !== backendRoot)
      return url

    const path = `${parsed.pathname}${parsed.search}`
    const proxyPrefix = import.meta.env.VITE_APP_PROXY_PREFIX || '/admin-api'

    // #ifdef H5
    if (JSON.parse(import.meta.env.VITE_APP_PROXY_ENABLE)) {
      if (path.startsWith('/api/v1/buckets/') || path.startsWith('/live/') || path.startsWith('/ai/') || path.startsWith('/rtp/'))
        return path
      if (path.startsWith('/admin-api/video/'))
        return resolveVideoApiPath(path.replace(/^\/admin-api/, ''))
      if (path.startsWith('/admin-api/'))
        return path
      if (path.startsWith('/video/'))
        return resolveVideoApiPath(path)
      if (path.startsWith('/infra/'))
        return `${proxyPrefix}${path}`
    }
    // #endif

    return `${getEnvBaseUrl().replace(/\/$/, '')}${path.replace(/^\/admin-api/, '')}`
  }
  catch {
    return url
  }
}

export function resolveAlertImageDisplayUrl(imageUrl: string | null | undefined): string {
  if (imageUrl == null || String(imageUrl).trim() === '')
    return ''

  const u = String(imageUrl).trim()
  if (u.startsWith('blob:') || u.startsWith('wxfile:') || u.startsWith('file://'))
    return u
  if (u.startsWith('http://') || u.startsWith('https://'))
    return rewriteBackendAbsoluteUrl(u)
  if (u.startsWith('/api/v1/buckets/'))
    return `${getSameOriginBase()}${u}`
  if (u.startsWith('/video/'))
    return resolveVideoApiPath(u)
  if (isHostLocalMediaPath(u))
    return resolveVideoApiPath(`/video/alert/image?path=${encodeURIComponent(u)}`)
  if (u.startsWith('/'))
    return withApiPrefix(u)
  return u
}

/** 训练结果图：历史数据写在 model-train 桶，统一走 models 桶访问 */
export function resolveTrainResultsDisplayUrl(imageUrl: string | null | undefined): string {
  if (imageUrl == null || String(imageUrl).trim() === '')
    return ''
  let u = String(imageUrl).trim()
  if (u.includes('/api/v1/buckets/model-train/'))
    u = u.replace('/api/v1/buckets/model-train/', '/api/v1/buckets/models/')
  return resolveAlertImageDisplayUrl(u)
}

/** 模型管理封面图 */
export function resolveModelImageDisplayUrl(imageUrl: string | null | undefined): string {
  return resolveAlertImageDisplayUrl(imageUrl)
}

function isLocalMinioHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0'
}

function convertDirectMinioUrlToDownloadPath(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.replace(/^\/+/, '')
    const slashIdx = path.indexOf('/')
    if (slashIdx <= 0)
      return url
    const bucket = path.slice(0, slashIdx)
    const objectName = path.slice(slashIdx + 1)
    if (!objectName)
      return url
    return `/api/v1/buckets/${bucket}/objects/download?prefix=${encodeURIComponent(objectName)}`
  }
  catch {
    return url
  }
}

/** 人脸库 / 车牌库图片展示地址 */
export function resolveLibraryImageDisplayUrl(imageUrl: string | null | undefined): string {
  if (imageUrl == null || String(imageUrl).trim() === '')
    return ''
  const u = String(imageUrl).trim()
  if (u.startsWith('http://') || u.startsWith('https://')) {
    try {
      const parsed = new URL(u)
      if (isLocalMinioHost(parsed.hostname))
        return resolveAlertImageDisplayUrl(convertDirectMinioUrlToDownloadPath(u))
    }
    catch {
      return u
    }
    return rewriteBackendAbsoluteUrl(u)
  }
  return resolveAlertImageDisplayUrl(u)
}

/** 用户头像展示地址 */
export function resolveAvatarDisplayUrl(avatar?: string | null): string {
  if (!avatar)
    return '/static/images/default-avatar.png'
  if (avatar.startsWith('/static/'))
    return avatar
  return resolveAlertImageDisplayUrl(avatar) || '/static/images/default-avatar.png'
}

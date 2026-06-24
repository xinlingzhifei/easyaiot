import { useTokenStore, useUserStore } from '@/store'

/** Jessibuca 等浏览器直连拉流时附带的鉴权请求头 */
export function buildVideoPlayHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = useTokenStore().updateNowTime().validToken
  if (token)
    headers.Authorization = `Bearer ${token}`

  const tenantEnable = import.meta.env.VITE_APP_TENANT_ENABLE
  if (tenantEnable === 'true') {
    const tenantId = useUserStore().tenantId
    if (tenantId)
      headers['tenant-id'] = String(tenantId)
  }
  return headers
}

/** 播放地址是否需附带 JWT（经网关的 /admin-api 路径） */
export function needsAuthForPlayUrl(url: string): boolean {
  return url.includes('/admin-api/')
}

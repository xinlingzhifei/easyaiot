/** 设备实时流播放地址解析（对齐 WEB devicePlay.ts 核心逻辑） */

const LOCAL_STREAM_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])
const MEDIA_PROXY_PORTS = new Set(['8080', '6080'])

function isRemoteClusterStreamHost(streamHost: string, pageHostname: string): boolean {
  if (!streamHost || !pageHostname)
    return false
  if (LOCAL_STREAM_HOSTS.has(streamHost) || LOCAL_STREAM_HOSTS.has(pageHostname))
    return false
  return streamHost !== pageHostname
}

/** 将服务端 127.0.0.1/localhost 流地址改写为当前页面主机名 */
export function rewriteStreamUrlForBrowser(url: string): string {
  const trimmed = url?.trim()
  if (!trimmed)
    return trimmed

  // #ifdef H5
  if (typeof window === 'undefined')
    return trimmed

  try {
    const parsed = new URL(trimmed)
    const pageHost = window.location.hostname
    if (!pageHost || LOCAL_STREAM_HOSTS.has(pageHost))
      return trimmed
    if (!LOCAL_STREAM_HOSTS.has(parsed.hostname))
      return trimmed
    parsed.hostname = pageHost
    return parsed.toString()
  }
  catch {
    return trimmed
  }
  // #endif

  // #ifndef H5
  return trimmed
  // #endif
}

/** 将流地址 host:port 改写为当前页面 host，便于 H5 经 Vite/nginx 代理拉流 */
export function rewriteStreamHostToPageHost(url: string): string {
  const trimmed = url?.trim()
  if (!trimmed)
    return trimmed

  // #ifdef H5
  if (typeof window === 'undefined')
    return trimmed

  try {
    const parsed = new URL(trimmed)
    const pageHost = window.location.host
    if (!pageHost)
      return trimmed

    const streamHost = parsed.hostname
    const pageHostname = window.location.hostname
    const streamPort = parsed.port || (parsed.protocol === 'https:' ? '443' : '80')

    if (isRemoteClusterStreamHost(streamHost, pageHostname))
      return trimmed

    if (MEDIA_PROXY_PORTS.has(streamPort)) {
      parsed.host = pageHost
      return parsed.toString()
    }

    parsed.host = pageHost
    return parsed.toString()
  }
  catch {
    return trimmed
  }
  // #endif

  // #ifndef H5
  return trimmed
  // #endif
}

/** RTMP 转 HTTP-FLV */
export function convertRtmpToHttp(rtmpUrl: string): string | null {
  const trimmed = rtmpUrl?.trim()
  if (!trimmed || !trimmed.startsWith('rtmp://'))
    return null
  try {
    const url = new URL(trimmed)
    let path = url.pathname.replace(/^\//, '')
    if (!path)
      path = 'live'
    if (!path.endsWith('.flv'))
      path = `${path}.flv`
    return rewriteStreamUrlForBrowser(`http://${url.hostname}:8080/${path}`)
  }
  catch {
    return null
  }
}

function toBrowserPlayUrl(stream?: string | null): string {
  const trimmed = stream?.trim()
  if (!trimmed)
    return ''
  const httpUrl = trimmed.startsWith('rtmp://') ? convertRtmpToHttp(trimmed) : trimmed
  if (!httpUrl)
    return ''
  return rewriteStreamHostToPageHost(httpUrl)
}

export interface DeviceStreamFields {
  http_stream?: string | null
  rtmp_stream?: string | null
  ai_http_stream?: string | null
  ai_rtmp_stream?: string | null
}

/** 设备是否配置了可直连播放的流地址（对齐 WEB hasDirectPlayStream） */
export function hasDirectPlayStream(device: DeviceStreamFields, enableAi = false): boolean {
  if (enableAi)
    return !!(device.ai_http_stream?.trim() || device.ai_rtmp_stream?.trim())
  return !!(device.http_stream?.trim() || device.rtmp_stream?.trim())
}

/** 解析设备实时预览播放地址（优先原始流，非 AI 流） */
export function resolveDevicePlayUrl(device: DeviceStreamFields, enableAi = false): string {
  if (enableAi) {
    return toBrowserPlayUrl(device.ai_http_stream) || toBrowserPlayUrl(device.ai_rtmp_stream)
      || toBrowserPlayUrl(device.http_stream) || toBrowserPlayUrl(device.rtmp_stream)
  }
  return toBrowserPlayUrl(device.http_stream) || toBrowserPlayUrl(device.rtmp_stream)
}

/** 是否为 FLV 直播流 */
export function isFlvPlayUrl(url?: string | null): boolean {
  if (!url)
    return false
  return /\.flv(\?|$)/i.test(url) || url.includes('/live/') || url.includes('/ai/') || url.includes('/rtp/')
}

/** 从 WVP 点播结果中选取浏览器可播地址（对齐 WEB pickWvpPlayUrl） */
export function pickWvpPlayUrl(streamContent: Record<string, any> | null | undefined): string {
  if (!streamContent)
    return ''
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const candidates = isHttps
    ? [
        streamContent.wss_flv,
        streamContent.https_flv,
        streamContent.wss_fmp4,
        streamContent.https_fmp4,
        streamContent.ws_flv,
        streamContent.flv,
        streamContent.fmp4,
      ]
    : [
        streamContent.ws_flv,
        streamContent.flv,
        streamContent.ws_fmp4,
        streamContent.fmp4,
        streamContent.https_flv,
        streamContent.wss_flv,
      ]
  for (const raw of candidates) {
    const url = toBrowserPlayUrl(raw)
    if (url)
      return url
  }
  return toBrowserPlayUrl(streamContent.rtmp)
}

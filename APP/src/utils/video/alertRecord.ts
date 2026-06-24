import { queryAlertRecord } from '@/api/video/alert'
import { withApiPrefix } from '@/utils/mediaDisplay'

export type AlertRecordLike = {
  id?: number | string
  device_id?: string
  time?: string
  record_path?: string | null
  video_url?: string | null
  url?: string | null
}

function isMinioRecordDownloadPath(path: string | null | undefined): boolean {
  if (!path)
    return false
  const p = path.trim()
  if (p.startsWith('/api/v1/buckets/') && p.includes('/objects/download'))
    return true
  if (p.startsWith('http://') || p.startsWith('https://'))
    return p.includes('/api/v1/buckets/') || p.includes('/objects/download')
  return false
}

function isHostLocalMediaPath(path: string): boolean {
  const p = path.trim()
  return p.startsWith('/data/') || p.startsWith('/app/') || (p.startsWith('/') && /\.flv$/i.test(p))
}

/** 是否为点播/录像文件 URL（非实时流） */
export function isVodPlaybackUrl(url: string | null | undefined): boolean {
  if (!url)
    return false
  const u = String(url).trim()
  return (
    u.includes('/video/alert/record')
    || u.includes('/video/record/space/')
    || (u.includes('/api/v1/buckets/') && u.includes('/objects/download'))
  )
}

/** 将 MinIO/相对路径转为可播放的完整 URL */
export function resolveAlertVideoUrl(videoUrl: string): string {
  if (!videoUrl)
    return ''
  const trimmed = videoUrl.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://'))
    return trimmed

  if (trimmed.startsWith('/api/v1/buckets'))
    return withApiPrefix(trimmed)
  if (trimmed.startsWith('/video/'))
    return withApiPrefix(trimmed)
  if (isHostLocalMediaPath(trimmed))
    return withApiPrefix(`/video/alert/record?path=${encodeURIComponent(trimmed)}`)
  if (trimmed.startsWith('/'))
    return withApiPrefix(trimmed)
  return trimmed
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** 解析告警录像播放地址 */
export async function resolveAlertRecordVideoUrl(
  record: AlertRecordLike,
  options?: { timeRange?: number, retryDelayMs?: number },
): Promise<string | null> {
  const timeRange = options?.timeRange ?? 300
  const retryDelayMs = options?.retryDelayMs ?? 2500

  const directRaw = record.video_url || record.url
  if (directRaw) {
    const videoUrl = resolveAlertVideoUrl(String(directRaw).trim())
    if (videoUrl)
      return videoUrl
  }

  const directPath = record.record_path?.trim()
  if (directPath) {
    if (isMinioRecordDownloadPath(directPath) || directPath.startsWith('/video/') || isHostLocalMediaPath(directPath))
      return resolveAlertVideoUrl(directPath)
  }

  if (!record.device_id || !record.time)
    return null

  const params = {
    device_id: String(record.device_id),
    alert_time: record.time,
    time_range: timeRange,
    ...(record.id != null ? { alert_id: record.id } : {}),
  }

  const tryQuery = async () => {
    const result = await queryAlertRecord(params)
    const url = result?.video_url || result?.file_path
    return url ? resolveAlertVideoUrl(String(url)) : null
  }

  let url = await tryQuery()
  if (!url && retryDelayMs > 0) {
    await sleep(retryDelayMs)
    url = await tryQuery()
  }
  return url
}

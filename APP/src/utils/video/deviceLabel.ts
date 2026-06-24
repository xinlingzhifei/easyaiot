/** 国标虚拟源前缀 */
const GB28181_SOURCE_PREFIX = 'gb28181://'

export function isGb28181Device(source?: string | null, deviceKind?: string): boolean {
  if (source?.trim().toLowerCase().startsWith(GB28181_SOURCE_PREFIX))
    return true
  if (deviceKind === 'gb28181' || deviceKind === 'gb28181_sip')
    return true
  return false
}

export function isNvrRtspSource(source?: string | null): boolean {
  const s = (source || '').trim().toLowerCase()
  if (!s.startsWith('rtsp://'))
    return false
  return s.includes('/streaming/channels/') || s.includes('cam/realmonitor')
}

export function isNvrChannelDevice(
  device: {
    nvr_id?: number | null
    device_kind?: string
    source?: string | null
  },
  nvrs?: Array<{ id?: number, ip?: string }>,
): boolean {
  if (device.device_kind === 'nvr_channel')
    return true
  if (device.nvr_id && device.nvr_id > 0)
    return true
  if (!isNvrRtspSource(device.source))
    return false
  if (!nvrs?.length)
    return false
  const host = (device.source || '').trim().match(/^rtsp:\/\/(?:[^@/]+@)?([^/:]+)/i)?.[1]
  if (!host)
    return false
  return nvrs.some(n => (n.ip || '').trim() === host)
}

export function formatNvrDisplayName(nvr: {
  name?: string | null
  device_name?: string | null
  ip?: string | null
  id?: number
}): string {
  const name = (nvr.name || nvr.device_name || '').trim()
  if (name)
    return name
  const ip = (nvr.ip || '').trim()
  if (ip)
    return `[NVR] ${ip}`
  if (nvr.id != null)
    return `[NVR] NVR-${nvr.id}`
  return '[NVR]'
}

export function gb28181VirtualDeviceId(sipDeviceId: string, channelId: string): string {
  return `gb28181_${sipDeviceId}_${channelId}`
}

export function parseGb28181Source(source?: string | null): { deviceId: string, channelId: string } | null {
  if (!source?.trim().toLowerCase().startsWith(GB28181_SOURCE_PREFIX))
    return null
  const rest = source.trim().slice(GB28181_SOURCE_PREFIX.length)
  const slash = rest.indexOf('/')
  if (slash <= 0)
    return null
  const deviceId = rest.slice(0, slash).trim()
  const channelId = rest.slice(slash + 1).replace(/^\/+/, '').trim()
  if (!deviceId || !channelId)
    return null
  return { deviceId, channelId }
}

export function shouldPlayViaGb28181(record: Record<string, any> | null | undefined): boolean {
  if (!record)
    return false
  if (parseGb28181Source(record.source))
    return true
  const sip = String(record.deviceIdentification || '').trim()
  const ch = String(record.channelId || '').trim()
  if (sip && ch && sip !== ch)
    return true
  if (record.deviceId && record.channelId && record.deviceId !== record.channelId)
    return true
  return false
}

/** 解析国标点播用的 SIP 设备 ID 与通道 ID */
export function getGb28181PlayIds(
  record: Record<string, any> | null | undefined,
): { sipDeviceId: string, channelId: string } | null {
  if (!record)
    return null
  const parsed = parseGb28181Source(record.source)
  if (parsed)
    return { sipDeviceId: parsed.deviceId, channelId: parsed.channelId }
  const sipDeviceId = String(record.deviceIdentification || record.deviceId || '').trim()
  const channelId = String(record.channelId || '').trim()
  if (!sipDeviceId || !channelId || sipDeviceId === channelId)
    return null
  return { sipDeviceId, channelId }
}

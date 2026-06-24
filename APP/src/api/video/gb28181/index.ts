import { http } from '@/http/http'
import { gb28181VirtualDeviceId } from '@/utils/video/deviceLabel'

const GB28181_PREFIX = '/gb28181/device/query'

export interface Gb28181Device {
  deviceIdentification?: string
  deviceId?: string
  name?: string
  ip?: string
  localIp?: string
  onLine?: boolean
  on_line?: boolean
  online?: boolean
  channelCount?: number
  subCount?: number
  manufacturer?: string
  manufacture?: string
  model?: string
  mediaServerId?: string
}

export interface Gb28181Channel {
  id?: string | number
  name?: string
  channelName?: string
  deviceName?: string
  deviceIdentification?: string
  deviceId?: string
  channelId?: string
  parentId?: string
  parentDeviceId?: string
  ip?: string
  onLine?: boolean
  online?: boolean
  manufacturer?: string
  manufacture?: string
}

function normalizePageResponse(res: any): { data: any[], total: number } {
  const body = res?.data ?? res
  const page = body?.data ?? body
  const list = page?.list
    ?? page?.records
    ?? page?.rows
    ?? (Array.isArray(page) ? page : [])
  const total = page?.total ?? body?.total ?? res?.total ?? list.length
  return { data: list, total: Number(total) || 0 }
}

function normalizeDeviceList(list: any[]): Gb28181Device[] {
  return (list || []).map(item => ({
    ...item,
    deviceIdentification: item.deviceIdentification ?? item.deviceId,
    localIp: item.localIp ?? item.ip,
  }))
}

function normalizeWvpChannelItem(item: Record<string, any>, parentSipDeviceId?: string): Gb28181Channel {
  const sipDeviceId = String(
    parentSipDeviceId
    || item.parentDeviceId
    || item.parentId
    || item.deviceIdentification
    || '',
  ).trim()

  const channelGbId = String(
    item.channelId
    || item.deviceChannelId
    || item.gbDeviceId
    || item.gbId
    || '',
  ).trim()

  let resolvedChannelId = channelGbId
  if (!resolvedChannelId && item.deviceId && String(item.deviceId) !== sipDeviceId)
    resolvedChannelId = String(item.deviceId).trim()
  if (!resolvedChannelId && item.id != null && String(item.id) !== sipDeviceId)
    resolvedChannelId = String(item.id).trim()

  const name = item.name || item.channelName || item.deviceName || resolvedChannelId || '-'

  return {
    ...item,
    deviceIdentification: sipDeviceId,
    deviceId: sipDeviceId,
    channelId: resolvedChannelId,
    name,
    manufacturer: item.manufacturer ?? item.manufacture ?? '',
  }
}

function resolveWvpSipDeviceId(wvp: Record<string, any>): string {
  return String(
    wvp.deviceIdentification ?? wvp.deviceId ?? wvp.id ?? wvp.gbId ?? '',
  ).trim()
}

/** 分页查询国标 SIP 设备 */
export async function queryGbDeviceList(params: {
  page?: number
  count?: number
  query?: string
  status?: boolean
} = {}) {
  const res = await http.get<any>(`${GB28181_PREFIX}/devices`, params, undefined, { original: true })
  const { data, total } = normalizePageResponse(res)
  return { data: normalizeDeviceList(data), total }
}

/** 拉取全部国标 SIP 设备 */
export async function queryAllGbDevices(params: {
  query?: string
  status?: boolean
} = {}) {
  const pageSize = 500
  let page = 1
  let all: Gb28181Device[] = []
  let total = 0
  const maxPages = 200
  do {
    const res = await queryGbDeviceList({ ...params, page, count: pageSize })
    const batch = res.data ?? []
    if (!batch.length)
      break
    total = res.total ?? all.length + batch.length
    all = all.concat(batch)
    if (batch.length < pageSize || all.length >= total)
      break
    page += 1
  } while (page <= maxPages)
  return { data: all, total: all.length }
}

/** 获取国标设备通道列表 */
export async function getGbDeviceChannels(deviceId: string) {
  const res = await http.get<any>(`${GB28181_PREFIX}/devices/${deviceId}/channels`, {
    page: 1,
    count: 10000,
  }, undefined, { original: true })
  const { data, total } = normalizePageResponse(res)
  const list = (data || []).map((item: any) => normalizeWvpChannelItem(item, deviceId))
  return { data: list, total }
}

export function resolveGbSipDeviceId(device: Gb28181Device): string {
  return resolveWvpSipDeviceId(device)
}

export function isGbChannelOnline(channel: Gb28181Channel): boolean {
  return !!(channel.onLine ?? channel.online)
}

/** 国标通道点播（WVP） */
export function playByDeviceAndChannel(deviceId: string, channelId: string) {
  return http.get<any>(`/gb28181/play/start/${deviceId}/${channelId}`, undefined, undefined, { original: true })
}

export function gbChannelToDeviceInfo(channel: Gb28181Channel, sipDeviceId: string) {
  const sip = String(sipDeviceId || channel.deviceIdentification || channel.deviceId || '').trim()
  const channelId = String(channel.channelId || '').trim()
  const name = channel.name || channel.channelName || channelId || '-'
  return {
    id: gb28181VirtualDeviceId(sip, channelId),
    name,
    source: channelId ? `gb28181://${sip}/${channelId}` : undefined,
    device_kind: 'gb28181',
    ip: channel.ip || '-',
    online: isGbChannelOnline(channel),
    manufacturer: channel.manufacturer || channel.manufacture,
  }
}

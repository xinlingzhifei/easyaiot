import type { DeviceInfo, NvrInfo } from '@/api/video/camera'
import { getAllDevices, getNvrList } from '@/api/video/camera'
import type { Gb28181Device } from '@/api/video/gb28181'
import { queryAllGbDevices, resolveGbSipDeviceId } from '@/api/video/gb28181'
import {
  formatNvrDisplayName,
  isGb28181Device,
  isNvrChannelDevice,
} from '@/utils/video/deviceLabel'

export type DeviceRootRowKind = 'direct' | 'nvr' | 'gb28181'

export interface DeviceRootRow {
  id: string
  rowKind: DeviceRootRowKind
  name: string
  subtitle: string
  online?: boolean
  device_kind: string
  channelCount?: number
  device?: DeviceInfo
  nvrId?: number
  sipDeviceId?: string
}

export interface FetchRootDeviceListParams {
  search?: string
  online?: boolean
}

function filterStandaloneDirectDevices(devices: DeviceInfo[], nvrs: NvrInfo[]): DeviceInfo[] {
  const nvrBrief = nvrs.map(n => ({ id: n.id, ip: n.ip }))
  return devices.filter(d => !isNvrChannelDevice(d, nvrBrief) && !isGb28181Device(d.source, d.device_kind))
}

function matchesOnlineFilter(online: boolean | undefined, value?: boolean): boolean {
  if (online === undefined)
    return true
  return !!value === online
}

function nvrToRootRow(nvr: NvrInfo): DeviceRootRow {
  const nvrId = nvr.id!
  return {
    id: `nvr_${nvrId}`,
    rowKind: 'nvr',
    name: formatNvrDisplayName(nvr),
    subtitle: `${nvr.ip || '-'}${nvr.port ? `:${nvr.port}` : ''}`,
    online: true,
    device_kind: 'nvr',
    channelCount: nvr.camera_count ?? 0,
    nvrId,
  }
}

function gbToRootRow(device: Gb28181Device): DeviceRootRow | null {
  const sipDeviceId = resolveGbSipDeviceId(device)
  if (!sipDeviceId)
    return null
  return {
    id: `gb_sip_${sipDeviceId}`,
    rowKind: 'gb28181',
    name: (device.name || sipDeviceId).trim(),
    subtitle: device.localIp || device.ip || sipDeviceId,
    online: !!(device.onLine ?? device.on_line ?? device.online),
    device_kind: 'gb28181_sip',
    channelCount: Number(device.channelCount ?? device.subCount ?? 0) || 0,
    sipDeviceId,
  }
}

function directToRootRow(device: DeviceInfo): DeviceRootRow {
  return {
    id: device.id,
    rowKind: 'direct',
    name: device.name || device.id,
    subtitle: device.ip || device.id,
    online: device.online,
    device_kind: device.device_kind || 'direct',
    device,
  }
}

/** 拉取顶层设备列表：直连 IPC + NVR + 国标 SIP（不含通道） */
export async function fetchRootDeviceList(params: FetchRootDeviceListParams = {}): Promise<DeviceRootRow[]> {
  const search = params.search?.trim() || undefined
  const online = params.online

  const [allDevices, gbRes, nvrs] = await Promise.all([
    getAllDevices({ search }),
    queryAllGbDevices({
      query: search,
      status: online,
    }).catch(() => ({ data: [] as Gb28181Device[], total: 0 })),
    getNvrList(false).catch(() => [] as NvrInfo[]),
  ])

  const direct = filterStandaloneDirectDevices(allDevices, nvrs)
    .filter(d => matchesOnlineFilter(online, d.online))
    .map(directToRootRow)

  const nvrRows = nvrs
    .filter(n => n.id != null)
    .filter((n) => {
      if (!search)
        return true
      const keyword = search.toLowerCase()
      const name = formatNvrDisplayName(n).toLowerCase()
      const ip = (n.ip || '').toLowerCase()
      return name.includes(keyword) || ip.includes(keyword)
    })
    .filter(n => matchesOnlineFilter(online, true))
    .map(nvrToRootRow)

  const seenSip = new Set<string>()
  const gbRows: DeviceRootRow[] = []
  for (const device of gbRes.data || []) {
    const row = gbToRootRow(device)
    if (!row || seenSip.has(row.sipDeviceId!))
      continue
    seenSip.add(row.sipDeviceId!)
    if (matchesOnlineFilter(online, row.online))
      gbRows.push(row)
  }

  return [...direct, ...nvrRows, ...gbRows]
}

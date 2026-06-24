import type { IResponse } from '@/http/types'
import { http } from '@/http/http'

export interface DeviceInfo {
  id: string
  name: string
  source?: string
  ip?: string
  port?: number
  online?: boolean
  device_kind?: string
  manufacturer?: string
  model?: string
  rtsp_direct?: string | null
  http_stream?: string
  rtmp_stream?: string
  ai_http_stream?: string
  ai_rtmp_stream?: string
  enable_forward?: boolean
  nvr_id?: number | null
  nvr_channel?: number
  nvr_label?: string | null
  has_location?: boolean
  address?: string | null
  created_at?: string
}

export interface DeviceListResult {
  data: DeviceInfo[]
  total: number
}

export interface DeviceListParams {
  pageNo?: number
  pageSize?: number
  search?: string
  deviceName?: string
  online?: boolean
}

export interface NvrInfo {
  id?: number
  ip: string
  port?: number
  name?: string
  device_name?: string
  model?: string
  vendor?: string
  vendor_label?: string
  rtsp_url?: string
  camera_count?: number
  cameras?: DeviceInfo[]
}

/** 获取摄像头设备分页列表（保留 total 供分页使用） */
export async function getDeviceList(params: DeviceListParams): Promise<DeviceListResult> {
  const res = await http.get<DeviceInfo[]>('/video/camera/list', {
    ...params,
    search: params.search ?? params.deviceName,
  }, undefined, { original: true }) as IResponse<DeviceInfo[]>
  const data = Array.isArray(res.data) ? res.data : []
  return {
    data,
    total: Number(res.total) || data.length,
  }
}

/** 拉取全部摄像头（自动翻页） */
export async function getAllDevices(params: Omit<DeviceListParams, 'pageNo' | 'pageSize'> = {}): Promise<DeviceInfo[]> {
  const pageSize = 500
  let pageNo = 1
  let all: DeviceInfo[] = []
  let total = 0
  const maxPages = 200
  do {
    const { data, total: t } = await getDeviceList({ ...params, pageNo, pageSize })
    total = t
    if (!data.length)
      break
    all = all.concat(data)
    if (all.length >= total)
      break
    pageNo += 1
  } while (pageNo <= maxPages)
  return all
}

/** 获取 NVR 列表 */
export async function getNvrList(includeCameras = false): Promise<NvrInfo[]> {
  const res = await http.get<NvrInfo[] | { data?: NvrInfo[] }>('/video/camera/nvr/list', {
    include_cameras: includeCameras ? 'true' : 'false',
  })
  if (Array.isArray(res))
    return res
  return res?.data ?? []
}

/** 获取 NVR 详情（含挂载通道） */
export function getNvrDetail(nvrId: number, includeCameras = true) {
  return http.get<NvrInfo>(`/video/camera/nvr/${nvrId}`, {
    include_cameras: includeCameras ? 'true' : 'false',
  })
}

/** 获取设备详情 */
export function getDeviceInfo(deviceId: string) {
  return http.get<DeviceInfo>(`/video/camera/device/${deviceId}`)
}

/** 启动流媒体转发 */
export function startStreamForwarding(deviceId: string) {
  return http.post(`/video/camera/device/${deviceId}/stream/start`, {}, undefined, undefined, { hideErrorToast: true })
}

/** 停止流媒体转发 */
export function stopStreamForwarding(deviceId: string) {
  return http.post(`/video/camera/device/${deviceId}/stream/stop`, {}, undefined, undefined, { hideErrorToast: true })
}

/** 获取流媒体转发状态 */
export function getStreamStatus(deviceId: string) {
  return http.get<{ status?: string }>(`/video/camera/device/${deviceId}/stream/status`, undefined, undefined, { hideErrorToast: true })
}

/** secure_link 流签名票据 */
export interface StreamTicketResp {
  e: number
  st: string
}

/** 为受保护的流路径（/ai /live /rtp）签发短期 secure_link 票据 */
export function signStreamTicket(path: string, ttl = 90) {
  return http.post<StreamTicketResp>(`/video/camera/stream/ticket/sign`, { path, ttl })
}

export function getDeviceKindText(kind?: string): string {
  const map: Record<string, string> = {
    direct: '直连 IPC',
    gb28181: '国标设备',
    gb28181_sip: '国标 SIP',
    nvr: 'NVR',
    nvr_channel: 'NVR 通道',
  }
  return map[kind || ''] || kind || '摄像头'
}

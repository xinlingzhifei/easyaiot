import { http } from '@/http/http'

const PREFIX = '/video/stream-forward'
const LONG_RUNNING_TIMEOUT = 120000

export interface StreamForwardTask {
  id: number
  task_name: string
  task_code?: string
  device_ids?: string[]
  device_names?: string[]
  output_format?: 'rtmp' | 'rtsp'
  output_quality?: 'low' | 'medium' | 'high'
  output_bitrate?: string
  status?: number
  is_enabled: boolean
  run_status?: 'running' | 'stopped' | 'restarting'
  exception_reason?: string
  service_server_ip?: string
  service_port?: number
  service_process_id?: number
  service_last_heartbeat?: string
  service_log_path?: string
  schedule_policy?: 'local' | 'auto' | 'node'
  prefer_gpu?: boolean
  target_node_id?: number | null
  node_id?: number | null
  total_streams?: number
  last_process_time?: string
  last_success_time?: string
  description?: string
  created_at?: string
  updated_at?: string
}

export interface StreamForwardTaskListResult {
  data?: StreamForwardTask[]
  total?: number
}

export interface StreamForwardTaskListParams {
  pageNo?: number
  pageSize?: number
  search?: string
  device_id?: string
  is_enabled?: boolean | 0 | 1
}

export interface StreamForwardTaskStatus {
  task_id: number
  task_name: string
  server_ip?: string
  port?: number
  process_id?: number
  last_heartbeat?: string
  log_path?: string
  status: 'running' | 'stopped'
  run_status: 'running' | 'stopped' | 'restarting'
  total_streams: number
}

export interface StreamForwardTaskStream {
  device_id: string
  device_name: string
  rtmp_stream: string
  http_stream: string
  source: string
  cover_image_path?: string
}

export interface StreamForwardTaskLogs {
  logs: string
  total_lines: number
  log_file: string
  is_all_file: boolean
}

export interface StreamForwardTaskPayload {
  task_name: string
  device_ids?: string[]
  output_format?: 'rtmp' | 'rtsp'
  output_quality?: 'low' | 'medium' | 'high'
  output_bitrate?: string
  description?: string
  is_enabled?: boolean
  schedule_policy?: 'local' | 'auto' | 'node'
  prefer_gpu?: boolean
  target_node_id?: number | null
}

/** 推流转发任务分页列表 */
export function listStreamForwardTasks(params?: StreamForwardTaskListParams) {
  const query = { ...params }
  if (query.is_enabled !== undefined && query.is_enabled !== null) {
    query.is_enabled = query.is_enabled === true || query.is_enabled === 1 ? 1 : 0
  }
  return http.get<StreamForwardTaskListResult>(`${PREFIX}/task/list`, query)
}

/** 获取推流转发任务详情 */
export function getStreamForwardTask(taskId: number) {
  return http.get<StreamForwardTask>(`${PREFIX}/task/${taskId}`)
}

/** 创建推流转发任务 */
export function createStreamForwardTask(data: StreamForwardTaskPayload) {
  return http.post<StreamForwardTask>(`${PREFIX}/task`, data, undefined, undefined, {
    hideErrorToast: true,
    timeout: LONG_RUNNING_TIMEOUT,
  })
}

/** 更新推流转发任务 */
export function updateStreamForwardTask(taskId: number, data: Partial<StreamForwardTaskPayload>) {
  return http.put<StreamForwardTask & { sync_action?: 'rebalance' | 'full_restart' | null }>(
    `${PREFIX}/task/${taskId}`,
    data,
    undefined,
    undefined,
    { hideErrorToast: true, timeout: LONG_RUNNING_TIMEOUT },
  )
}

/** 删除推流转发任务 */
export function deleteStreamForwardTask(taskId: number) {
  return http.delete(`${PREFIX}/task/${taskId}`)
}

/** 启动推流转发任务 */
export function startStreamForwardTask(taskId: number) {
  return http.post<StreamForwardTask>(`${PREFIX}/task/${taskId}/start`, {}, undefined, undefined, {
    hideErrorToast: true,
    timeout: LONG_RUNNING_TIMEOUT,
  })
}

/** 停止推流转发任务 */
export function stopStreamForwardTask(taskId: number) {
  return http.post<StreamForwardTask>(`${PREFIX}/task/${taskId}/stop`, {}, undefined, undefined, {
    hideErrorToast: true,
    timeout: LONG_RUNNING_TIMEOUT,
  })
}

/** 重启推流转发任务 */
export function restartStreamForwardTask(taskId: number) {
  return http.post<StreamForwardTask>(`${PREFIX}/task/${taskId}/restart`, {}, undefined, undefined, {
    hideErrorToast: true,
    timeout: LONG_RUNNING_TIMEOUT,
  })
}

/** 获取推流转发任务服务状态 */
export function getStreamForwardTaskStatus(taskId: number) {
  return http.get<StreamForwardTaskStatus>(`${PREFIX}/task/${taskId}/status`)
}

/** 获取推流转发任务日志 */
export function getStreamForwardTaskLogs(taskId: number, params?: { lines?: number, date?: string }) {
  return http.get<StreamForwardTaskLogs>(`${PREFIX}/task/${taskId}/logs`, params)
}

/** 获取推流转发任务关联的摄像头推流地址 */
export function getStreamForwardTaskStreams(taskId: number) {
  return http.get<StreamForwardTaskStream[]>(`${PREFIX}/task/${taskId}/streams`)
}

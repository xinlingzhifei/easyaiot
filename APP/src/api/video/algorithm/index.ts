import { http } from '@/http/http'

export interface AlgorithmTask {
  id: number
  task_name: string
  task_code?: string
  task_type: 'realtime' | 'snap' | 'patrol'
  device_ids?: string[]
  device_names?: string[]
  model_ids?: number[]
  model_names?: string
  is_enabled: boolean
  status?: number
  exception_reason?: string
  total_frames?: number
  total_detections?: number
  total_captures?: number
  last_process_time?: string
  extract_interval?: number
  cron_expression?: string
  alert_event_enabled?: boolean
}

export interface AlgorithmTaskListResult {
  data?: AlgorithmTask[]
  total?: number
}

export interface AlgorithmTaskListParams {
  pageNo?: number
  pageSize?: number
  search?: string
  device_id?: string
  task_type?: 'realtime' | 'snap' | 'patrol'
  is_enabled?: boolean
}

/** 算法任务分页列表 */
export function listAlgorithmTasks(params?: AlgorithmTaskListParams) {
  return http.get<AlgorithmTaskListResult>('/video/algorithm/task/list', params)
}

/** 获取算法任务详情 */
export function getAlgorithmTask(taskId: number) {
  return http.get<AlgorithmTask>(`/video/algorithm/task/${taskId}`)
}

/** 启动算法任务 */
export function startAlgorithmTask(taskId: number) {
  return http.post<AlgorithmTask>(`/video/algorithm/task/${taskId}/start`, {})
}

/** 停止算法任务 */
export function stopAlgorithmTask(taskId: number) {
  return http.post<AlgorithmTask>(`/video/algorithm/task/${taskId}/stop`, {})
}

/** 重启算法任务 */
export function restartAlgorithmTask(taskId: number) {
  return http.post<AlgorithmTask>(`/video/algorithm/task/${taskId}/restart`, {})
}

export function getAlgorithmTaskTypeText(type?: string): string {
  if (type === 'realtime')
    return '实时'
  if (type === 'snap')
    return '抓拍'
  if (type === 'patrol')
    return '巡检'
  return type || '-'
}

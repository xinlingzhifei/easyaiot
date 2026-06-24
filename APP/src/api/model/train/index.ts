import { http } from '@/http/http'

export interface TrainTask {
  id: number
  name?: string
  task_name?: string
  dataset_name?: string
  dataset_version?: string
  start_time?: string
  progress?: number
  status?: string
  schedule_policy?: string
  service_server_ip?: string
  minio_model_path?: string
  can_resume?: boolean
  published_model_id?: number | null
  hyperparameters?: unknown
}

export interface TrainTaskListResult {
  data?: TrainTask[]
  list?: TrainTask[]
  total?: number
}

export interface TrainTaskListParams {
  pageNo?: number
  pageSize?: number
  task_name?: string
  progress_filter?: string
}

/** 训练任务分页列表 */
export function getTrainTaskPage(params?: TrainTaskListParams) {
  return http.get<TrainTaskListResult>('/model/train_task/list', params)
}

/** 获取训练任务详情 */
export function getTrainTaskDetail(taskId: number) {
  return http.get<TrainTask>(`/model/train_task/${taskId}`)
}

/** 停止训练任务 */
export function stopTrain(taskId: number) {
  return http.post(`/model/train_task/${taskId}/stop`)
}

/** 获取训练日志 */
export function getTrainLogs(taskId: number) {
  return http.get<string | { logs?: string }>(`/model/train_task/${taskId}/logs`)
}

/** 获取训练状态 */
export function getTrainStatus(taskId: number) {
  return http.get<TrainTask>(`/model/train_task/${taskId}/status`)
}

/** 删除训练任务 */
export function deleteTrainTask(taskId: number) {
  return http.delete(`/model/train_task/delete/${taskId}`)
}

import { useTokenStore, useUserStore } from '@/store'
import { getEnvBaseUrl } from '@/utils'
import { http } from '@/http/http'

export interface InferenceTask {
  id: number
  model_id?: number
  model_name?: string
  inference_type?: string
  input_source?: string
  output_source?: string
  status?: string
  create_time?: string
  parameters?: string
}

export interface InferenceTaskListResult {
  data?: InferenceTask[]
  list?: InferenceTask[]
  total?: number
}

export interface InferenceTaskListParams {
  pageNo?: number
  pageSize?: number
  model_id?: number
}

/** 推理任务历史列表 */
export function getInferenceTasks(params?: InferenceTaskListParams) {
  return http.get<InferenceTaskListResult>('/model/inference_task/list', params)
}

/** 获取推理任务详情 */
export function getInferenceTaskDetail(recordId: number) {
  return http.get<InferenceTask>(`/model/inference_task/detail/${recordId}`)
}

/** 删除推理记录 */
export function deleteInferenceTask(recordId: number) {
  return http.delete(`/model/inference_task/delete/${recordId}`)
}

function resolveUploadUrl(path: string): string {
  // #ifdef H5
  if (JSON.parse(import.meta.env.VITE_APP_PROXY_ENABLE)) {
    return import.meta.env.VITE_APP_PROXY_PREFIX + path
  }
  // #endif
  return getEnvBaseUrl() + path
}

/** 预设模型选项 */
export const PRESET_MODEL_OPTIONS = [
  { value: 'yolov8', label: 'Yolov8 预设' },
  { value: 'yolov11', label: 'Yolov11 预设' },
  { value: 'yolov26', label: 'Yolov26 预设' },
]

export function isPresetModelId(modelId?: string | number): boolean {
  return ['yolov8', 'yolov11', 'yolov26'].includes(String(modelId))
}

function resolveApiModelId(modelId: number | string): number | string {
  if (isPresetModelId(modelId))
    return 0
  const parsed = Number(modelId)
  return Number.isNaN(parsed) ? modelId : parsed
}

/** 图片推理（uni.uploadFile  multipart） */
export function runImageInference(modelId: number | string, filePath: string, parameters?: Record<string, unknown>): Promise<any> {
  return new Promise((resolve, reject) => {
    const tokenStore = useTokenStore()
    const token = tokenStore.updateNowTime().validToken
    const apiModelId = resolveApiModelId(modelId)
    const url = resolveUploadUrl(`/model/inference_task/${apiModelId}/inference/run`)
    const header: Record<string, string> = {
      Authorization: token ? `Bearer ${token}` : '',
    }
    if (import.meta.env.VITE_APP_TENANT_ENABLE === 'true') {
      const tenantId = useUserStore().tenantId
      if (tenantId)
        header['tenant-id'] = String(tenantId)
    }

    uni.uploadFile({
      url,
      filePath,
      name: 'file',
      formData: {
        inference_type: 'image',
        parameters: JSON.stringify({
          conf_thres: 0.25,
          iou_thres: 0.45,
          ...parameters,
        }),
        ...(modelId === 'yolov8' ? { model_file_path: 'yolov8n.pt' } : {}),
        ...(modelId === 'yolov11' ? { model_file_path: 'yolo11n.pt' } : {}),
        ...(modelId === 'yolov26' ? { model_file_path: 'yolo26n.pt' } : {}),
      },
      header: {
        ...header,
      },
      timeout: 600000,
      success: (res) => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          if (data.code === 0 || data.code === 200) {
            resolve(data.data ?? data)
          }
          else {
            uni.showToast({ icon: 'none', title: data.msg || data.message || '推理失败' })
            reject(data)
          }
        }
        catch (e) {
          reject(e)
        }
      },
      fail: reject,
    })
  })
}

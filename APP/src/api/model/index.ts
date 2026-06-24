import { http } from '@/http/http'

export interface ModelInfo {
  id: number
  name: string
  version?: string
  description?: string
  status?: number
  imageUrl?: string
  filePath?: string
  classNames?: string[]
  selectedClassNames?: string[]
  createTime?: string
}

export interface ModelListResult {
  data?: ModelInfo[]
  total?: number
}

export interface ModelListParams {
  pageNo?: number
  pageSize?: number
  name?: string
  search?: string
  status?: number
}

/** 模型分页列表 */
export function getModelPage(params?: ModelListParams) {
  return http.get<ModelListResult>('/model/list', {
    ...params,
    name: params?.name ?? params?.search,
  })
}

/** 获取模型详情 */
export function getModelDetail(modelId: number) {
  return http.get<ModelInfo>(`/model/${modelId}`)
}

/** 删除模型 */
export function deleteModel(modelId: number) {
  return http.post<boolean>(`/model/${modelId}/delete`)
}

/** 获取模型检测类别 */
export function getModelClasses(modelId: number) {
  return http.get<{ classNames?: string[], selectedClassNames?: string[] }>(`/model/${modelId}/classes`)
}

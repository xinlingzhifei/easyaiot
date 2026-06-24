/** 解析推理 API 响应，供移动端内嵌展示 */
import { resolveAlertImageDisplayUrl } from '@/utils/mediaDisplay'

export interface InferenceResultView {
  inputImageUrl?: string
  resultImageUrl?: string
  detectionCount?: number
  averageConfidence?: number
  recordId?: number
  status?: string
}

function resolveMediaUrl(path?: string): string {
  if (!path)
    return ''
  if (path.startsWith('blob:') || path.startsWith('wxfile:') || path.startsWith('file://'))
    return path
  return resolveAlertImageDisplayUrl(path)
}

function pickResultPayload(res: any): Record<string, any> {
  if (!res || typeof res !== 'object')
    return {}
  if (res.result && typeof res.result === 'object')
    return res.result
  if (res.data?.result && typeof res.data.result === 'object')
    return res.data.result
  if (res.data && typeof res.data === 'object' && !Array.isArray(res.data))
    return res.data
  return res
}

function calcAverageConfidence(result: Record<string, any>): number {
  if (result.average_confidence != null)
    return Math.round(Number(result.average_confidence) * 100)
  const detections = result.detections
  if (Array.isArray(detections) && detections.length > 0) {
    const total = detections.reduce((sum: number, det: any) => sum + (Number(det.confidence) || 0), 0)
    return Math.round((total / detections.length) * 100)
  }
  return 0
}

/** 从 runInference / getInferenceTaskDetail 响应中提取展示数据 */
export function parseInferenceResult(res: any): InferenceResultView {
  const payload = pickResultPayload(res)
  const resultImageRaw = payload.result_url
    || payload.output_url
    || payload.output_source
    || payload.output_path
    || res?.output_source
    || res?.output_url
  const inputImageRaw = payload.image_url
    || payload.input_source
    || res?.input_source

  return {
    inputImageUrl: resolveMediaUrl(inputImageRaw),
    resultImageUrl: resolveMediaUrl(resultImageRaw),
    detectionCount: Number(payload.detection_count ?? payload.detectionCount ?? 0) || 0,
    averageConfidence: calcAverageConfidence(payload),
    recordId: res?.record_id ?? res?.id ?? payload.record_id,
    status: res?.status ?? payload.status,
  }
}

/** 从历史记录项提取展示数据 */
export function parseInferenceHistoryItem(item: Record<string, any>): InferenceResultView {
  return parseInferenceResult(item)
}

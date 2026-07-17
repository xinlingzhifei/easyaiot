export const ACTIVE_TRAIN_STATUSES = ['preparing', 'Train', 'train', 'running', 'stopping']
export const RETRAINABLE_STATUSES = ['stopped', 'completed', 'error', 'failed']

export function isTrainTaskActive(status?: string): boolean {
  return ACTIVE_TRAIN_STATUSES.includes(String(status || ''))
}

export function canRetrainTrainTask(status?: string): boolean {
  return RETRAINABLE_STATUSES.includes(String(status || ''))
}

export function canPublishTrainTask(record?: { status?: string, minio_model_path?: string }): boolean {
  return String(record?.status || '') === 'completed' && !!(record?.minio_model_path || '').trim()
}

export function canResumeTrainTask(record?: { status?: string, can_resume?: boolean, checkpoint_dir?: string }): boolean {
  if (String(record?.status || '') !== 'stopped')
    return false
  if (record?.can_resume === true)
    return true
  return !!(record?.checkpoint_dir || '').trim()
}

export function getCompletedEpochs(record?: { completed_epochs?: number, hyperparameters?: unknown }): number {
  if (record?.completed_epochs != null)
    return Number(record.completed_epochs) || 0
  const hp = parseTrainHyperparameters(record?.hyperparameters)
  return Number(hp.completed_epochs) || 0
}

export function parseTrainHyperparameters(raw: unknown) {
  try {
    const hp = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!hp || typeof hp !== 'object')
      return {}
    return {
      epochs: hp.epochs ?? 100,
      batch_size: hp.batch_size ?? 16,
      imgsz: hp.img_size ?? hp.imgsz ?? 640,
      modelPath: hp.model_arch ?? 'yolov8n.pt',
      use_gpu: hp.use_gpu !== false,
      taskName: hp.task_base_name ?? '',
      datasetSource: hp.dataset_source ?? 'local',
      completed_epochs: hp.completed_epochs ?? 0,
    }
  }
  catch {
    return {}
  }
}

export function resolveTaskBaseNameFromRecord(record: Record<string, unknown>): string {
  const hp = parseTrainHyperparameters(record.hyperparameters)
  if (hp.taskName)
    return hp.taskName
  let base = String(record.name || record.task_name || '').trim()
  const taskId = record.id as number | undefined
  if (taskId != null && base.endsWith(`_${taskId}`))
    base = base.slice(0, -(`_${taskId}`).length)
  const dsName = String(record.dataset_name || '').trim()
  const dsVersion = String(record.dataset_version || '').trim()
  for (const part of [dsVersion, dsName]) {
    if (part && base.endsWith(`_${part}`))
      base = base.slice(0, -(part.length + 1))
  }
  if (/^(train_)?download\?prefix=/i.test(base) || /^train_task_/.test(base))
    return 'train'
  return base || 'train'
}

export function isCloudDatasetPath(path?: string): boolean {
  if (!path)
    return false
  if (path.startsWith('/api/v1/buckets/'))
    return true
  return path.includes('://') && !path.startsWith('file://')
}

export function getTrainStatusText(status?: string): string {
  const s = String(status || '')
  const map: Record<string, string> = {
    preparing: '准备中',
    Train: '训练中',
    train: '训练中',
    running: '训练中',
    stopping: '停止中',
    stopped: '已停止',
    completed: '已完成',
    error: '失败',
    failed: '失败',
    pending: '未开始',
  }
  return map[s] || s || '未知'
}

export function getTrainStatusTagType(status?: string): 'primary' | 'success' | 'warning' | 'danger' | 'default' {
  if (isTrainTaskActive(status))
    return 'primary'
  if (status === 'completed')
    return 'success'
  if (status === 'stopped')
    return 'warning'
  if (status === 'error' || status === 'failed')
    return 'danger'
  return 'default'
}

export function getModelStatusText(status?: number | string): string {
  const s = Number(status)
  if (s === 0)
    return '未部署'
  if (s === 1)
    return '已部署'
  if (s === 3)
    return '已下线'
  return '未知'
}

export function getModelStatusTagType(status?: number | string): 'primary' | 'success' | 'warning' | 'default' {
  const s = Number(status)
  if (s === 1)
    return 'success'
  if (s === 3)
    return 'warning'
  return 'default'
}

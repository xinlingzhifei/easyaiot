export const ACTIVE_TRAIN_STATUSES = ['preparing', 'Train', 'train', 'running', 'stopping']

export function isTrainTaskActive(status?: string): boolean {
  return ACTIVE_TRAIN_STATUSES.includes(String(status || ''))
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

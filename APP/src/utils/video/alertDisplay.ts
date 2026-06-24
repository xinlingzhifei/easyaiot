/** 告警列表展示与筛选共用常量（对齐 WEB alertDisplay.ts） */

export const ALERT_EVENT_OPTIONS = [
  { value: '', label: '全部' },
  { value: '行人检测', label: '行人检测' },
  { value: 'face_library_match', label: '人脸库匹配' },
  { value: 'plate_library_match', label: '车牌库匹配' },
] as const

const ALERT_EVENT_LABEL_MAP: Record<string, string> = {
  face_library_match: '人脸库匹配',
  plate_library_match: '车牌库匹配',
  行人检测: '行人检测',
}

export function formatAlertEvent(event?: string | null): string {
  if (!event)
    return '-'
  return ALERT_EVENT_LABEL_MAP[event] || event
}

export function getAlertEventTagType(event?: string | null): 'primary' | 'success' | 'warning' | 'danger' | 'default' {
  if (event === 'face_library_match')
    return 'primary'
  if (event === 'plate_library_match')
    return 'success'
  if (event === '行人检测')
    return 'warning'
  return 'default'
}

type AlertPersonRecord = {
  event?: string | null
  matched_person_name?: string | null
  source_event?: string | null
}

export function formatAlertListTitle(record: AlertPersonRecord): string {
  const personName = record.matched_person_name ? String(record.matched_person_name) : ''
  const sourceEvent = record.source_event ? String(record.source_event) : ''
  if (personName && sourceEvent)
    return `${personName} · ${formatAlertEvent(sourceEvent)}`
  if (personName)
    return `${formatAlertEvent(record.event)} · ${personName}`
  return formatAlertEvent(record.event)
}

export function getTaskTypeText(taskType?: string | null): string {
  if (taskType === 'realtime')
    return '实时'
  if (taskType === 'snap' || taskType === 'snapshot')
    return '抓拍'
  if (taskType === 'patrol')
    return '巡检'
  return taskType || '-'
}

/** 是否为抓拍类任务（无关联告警录像） */
export function isSnapAlertTask(record: {
  task_type?: string | null
  information?: unknown
}): boolean {
  let taskType = record.task_type
  if (!taskType && record.information) {
    if (typeof record.information === 'object' && record.information !== null) {
      taskType = (record.information as { task_type?: string }).task_type
    }
    else if (typeof record.information === 'string') {
      try {
        const info = JSON.parse(record.information)
        taskType = info?.task_type
      }
      catch {
        // ignore
      }
    }
  }
  return taskType === 'snap' || taskType === 'snapshot'
}

export function getTaskTypeTagType(taskType?: string | null): 'primary' | 'success' | 'warning' | 'danger' | 'default' {
  if (taskType === 'realtime')
    return 'primary'
  if (taskType === 'snap' || taskType === 'snapshot')
    return 'success'
  if (taskType === 'patrol')
    return 'warning'
  return 'default'
}

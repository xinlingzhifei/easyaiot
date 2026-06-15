/** 告警列表展示与筛选共用常量 */

export const ALERT_EVENT_OPTIONS = [
  { value: null, label: '全部' },
  { value: '行人检测', label: '行人检测' },
  { value: 'face_library_match', label: '人脸库匹配' },
  { value: 'plate_library_match', label: '车牌库匹配' },
] as const;

const ALERT_EVENT_LABEL_MAP: Record<string, string> = {
  face_library_match: '人脸库匹配',
  plate_library_match: '车牌库匹配',
  行人检测: '行人检测',
};

export function formatAlertEvent(event?: string | null): string {
  if (!event) return '-';
  return ALERT_EVENT_LABEL_MAP[event] || event;
}

export function getAlertEventTagColor(event?: string | null): string {
  if (event === 'face_library_match') return 'purple';
  if (event === 'plate_library_match') return 'cyan';
  if (event === '行人检测') return 'orange';
  return 'default';
}

type AlertPersonRecord = {
  event?: string | null;
  matched_person_name?: string | null;
  source_event?: string | null;
};

/** 人脸库匹配告警：读取已录入人员姓名 */
export function getAlertMatchedPersonName(record: AlertPersonRecord): string | undefined {
  if (record.matched_person_name) {
    return String(record.matched_person_name);
  }
  return undefined;
}

/** 人脸库匹配告警：读取触发的算法告警事件 */
export function getAlertSourceEvent(record: AlertPersonRecord): string | undefined {
  if (record.source_event) {
    return String(record.source_event);
  }
  return undefined;
}

/** 列表/大屏标题：人员姓名 + 触发告警 */
export function formatAlertListTitle(record: AlertPersonRecord & { event?: string | null }): string {
  const personName = getAlertMatchedPersonName(record);
  const sourceEvent = getAlertSourceEvent(record);
  if (personName && sourceEvent) {
    return `${personName} · ${formatAlertEvent(sourceEvent)}`;
  }
  if (personName) {
    return `${formatAlertEvent(record.event)} · ${personName}`;
  }
  return formatAlertEvent(record.event);
}

export function normalizeAlertBusinessTagsParam(tags: unknown): string | undefined {
  if (Array.isArray(tags)) {
    const normalized = tags.map((t) => String(t).trim()).filter(Boolean);
    return normalized.length ? normalized.join(',') : undefined;
  }
  if (typeof tags === 'string' && tags.trim()) {
    return tags.trim();
  }
  return undefined;
}

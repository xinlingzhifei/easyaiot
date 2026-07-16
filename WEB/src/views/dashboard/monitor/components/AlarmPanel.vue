<template>
  <div class="alarm-panel">
    <div class="panel-header">
      <div class="header-title">告警事件</div>
      <div class="header-count">
        今日告警 <span class="count-number">{{ todayAlarmCount }}</span> 次
      </div>
    </div>
    
    <div class="panel-content">
      <div
        v-for="alarm in alarmList"
        :key="alarm.id"
        class="alarm-item"
        @click="handleAlarmClick(alarm)"
      >
        <div class="alarm-image">
          <img 
            v-if="getImageUrl(alarm) && !alarm.imageError" 
            :src="getImageUrl(alarm)" 
            alt="告警图片"
            class="alarm-img"
            @error="handleImageError(alarm)"
            @load="handleImageLoad(alarm)"
          />
          <div v-else class="alarm-icon">
            <Icon 
              :icon="getAlarmIcon(alarm.type)" 
              :size="32"
              :color="getAlarmColor(alarm.level)"
            />
          </div>
        </div>
        
        <div class="alarm-info">
          <div class="alarm-title">{{ alarm.title || alarm.event || '未知事件' }}</div>
          <div class="alarm-meta">
            <span 
              :class="['task-type-tag', getTaskTypeClass(alarm)]"
            >
              {{ getTaskTypeText(alarm) }}
            </span>
            <span :class="['disposition-tag', getDispositionStatusClass(alarm)]">
              {{ getDispositionStatusText(alarm) }}
            </span>
            <span class="alarm-location">{{ alarm.device_name || alarm.location || '未知设备' }}</span>
          </div>
          <div class="alarm-time">{{ alarm.time }}</div>
        </div>
      </div>
      
      <div v-if="alarmList.length === 0" class="empty-state">
        <Icon icon="ant-design:inbox-outlined" :size="48" />
        <div class="empty-text">暂无告警信息</div>
      </div>
    </div>
    <div class="boxfoot"></div>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '@/components/Icon'
import { resolveAlertImageDisplayUrl } from '@/utils/alertMinioImage'

defineOptions({
  name: 'AlarmPanel'
})

withDefaults(defineProps<{
  alarmList?: any[]
  todayAlarmCount?: number
}>(), {
  alarmList: () => [],
  todayAlarmCount: 0,
})

const emit = defineEmits<{
  'play-alarm': [alarm: any]
}>()

const handleAlarmClick = (alarm: any) => {
  emit('play-alarm', alarm)
}

// 获取告警图标
const getAlarmIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    fire: 'ant-design:fire-outlined',
    smoke: 'ant-design:cloud-outlined',
    intrusion: 'ant-design:warning-outlined',
    default: 'ant-design:exclamation-circle-outlined'
  }
  return iconMap[type] || iconMap.default
}

// 获取告警颜色
const getAlarmColor = (level: string) => {
  const colorMap: Record<string, string> = {
    '一级': '#ff4d4f',
    '二级': '#ff9800',
    '三级': '#ffc107',
    '四级': '#1890ff'
  }
  return colorMap[level] || '#ff4d4f'
}

// 获取任务类型
const getTaskType = (alarm: any): string | null => {
  // 优先从 information 字段中获取 task_type
  let taskType = null
  if (alarm.information) {
    if (typeof alarm.information === 'object' && alarm.information.task_type) {
      taskType = alarm.information.task_type
    } else if (typeof alarm.information === 'string') {
      try {
        const info = JSON.parse(alarm.information)
        taskType = info?.task_type
      } catch (e) {
        // 解析失败，忽略
      }
    }
  }
  
  // 如果 information 中没有，尝试从 alarm 本身获取
  if (!taskType && alarm.task_type) {
    taskType = alarm.task_type
  }
  
  return taskType
}

// 获取任务类型文本
const getTaskTypeText = (alarm: any): string => {
  const taskType = getTaskType(alarm)
  
  // 根据 task_type 返回文本
  if (taskType === 'snap' || taskType === 'snapshot') {
    return '抓拍'
  } else {
    return '实时'
  }
}

// 获取任务类型样式类
const getTaskTypeClass = (alarm: any): string => {
  const taskType = getTaskType(alarm)
  
  // 根据 task_type 返回样式类
  if (taskType === 'snap' || taskType === 'snapshot') {
    return 'task-type-snap'
  } else {
    return 'task-type-realtime'
  }
}

type DispositionStatus = 'unconfirmed' | 'confirmed' | 'processed' | 'false-positive'

const normalizeStatusValue = (value: unknown) => String(value ?? '').trim().toLowerCase()

const getDispositionStatus = (alarm: any): DispositionStatus => {
  const rawStatus = [
    alarm?.disposition_status,
    alarm?.review_status,
    alarm?.handle_status,
    alarm?.status,
    alarm?.state,
  ].map(normalizeStatusValue).find(Boolean) || ''

  if (
    alarm?.is_false_positive === true ||
    alarm?.false_positive === true ||
    rawStatus.includes('false') ||
    rawStatus.includes('误报')
  ) {
    return 'false-positive'
  }

  if (
    alarm?.processed_at ||
    alarm?.handled_at ||
    alarm?.closed_at ||
    ['processed', 'handled', 'closed', 'resolved', 'done', '已处理'].includes(rawStatus)
  ) {
    return 'processed'
  }

  if (
    alarm?.confirmed_at ||
    alarm?.ack_at ||
    alarm?.acknowledged_at ||
    ['confirmed', 'ack', 'acknowledged', 'reviewed', '已确认'].includes(rawStatus)
  ) {
    return 'confirmed'
  }

  return 'unconfirmed'
}

const getDispositionStatusText = (alarm: any): string => {
  const textMap: Record<DispositionStatus, string> = {
    unconfirmed: '未确认',
    confirmed: '已确认',
    processed: '已处理',
    'false-positive': '误报',
  }
  return textMap[getDispositionStatus(alarm)]
}

const getDispositionStatusClass = (alarm: any): string => {
  return `disposition-${getDispositionStatus(alarm)}`
}

// 获取图片展示 URL（与告警列表页一致，兼容 mini 本地路径 /video/alert/image）
const getImageUrl = (alarm: any): string | undefined => {
  if (alarm.image) return alarm.image
  const raw = alarm.image_url
  if (!raw) return undefined
  const resolved = resolveAlertImageDisplayUrl(raw)
  return resolved || undefined
}

// 处理图片加载错误
const handleImageError = (alarm: any) => {
  // 标记图片加载失败，显示占位图标
  alarm.imageError = true
}

// 处理图片加载成功
const handleImageLoad = (alarm: any) => {
  // 确保清除错误标记
  alarm.imageError = false
}
</script>

<style lang="less" scoped>
.alarm-panel {
  width: 320px;
  height: 100%;
  padding: 0;
  background: var(--dashboard-panel);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--dashboard-border);
  box-shadow: 0 16px 42px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  border-radius: var(--dashboard-radius);
  padding: 3px;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(56, 189, 248, 0.08), transparent 34%, transparent 70%, rgba(245, 158, 11, 0.05)),
      radial-gradient(circle at top left, rgba(56, 189, 248, 0.12), transparent 46%);
    pointer-events: none;
    border-radius: var(--dashboard-radius);
  }
}

.panel-header {
  text-align: left;
  background: rgba(8, 22, 39, 0.72);
  border-bottom: 1px solid var(--dashboard-border);
  color: var(--dashboard-text);
  font-size: 16px;
  height: 60px;
  line-height: 1.2;
  letter-spacing: 0;
  padding: 10px 14px;
  display: flex;
  flex-direction: row;
  gap: 4px;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;

  .header-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--dashboard-text);
    line-height: 1.2;
  }

  .header-count {
    font-size: 12px;
    color: var(--dashboard-muted);
    line-height: 1.2;

    .count-number {
      color: var(--dashboard-accent);
      font-weight: 700;
      font-size: 18px;
      font-variant-numeric: tabular-nums;
    }
  }
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.04);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(56, 189, 248, 0.36);
    border-radius: 3px;

    &:hover {
      background: rgba(56, 189, 248, 0.58);
    }
  }
}

.alarm-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  margin-bottom: 12px;
  background: rgba(7, 19, 34, 0.76);
  border: 1px solid var(--dashboard-border);
  border-radius: var(--dashboard-radius);
  border-left: 3px solid var(--dashboard-accent);
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
  position: relative;
  cursor: pointer;

  &:hover {
    background: rgba(12, 31, 55, 0.92);
    border-color: var(--dashboard-border-strong);
    transform: translateX(3px);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.alarm-image {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: var(--dashboard-radius);
  overflow: hidden;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;

  .alarm-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: pointer;
  }

  .alarm-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.alarm-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.alarm-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dashboard-text);
  line-height: 1.4;
}

.alarm-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.task-type-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 10px;
  border-radius: var(--dashboard-radius);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;

  &.task-type-realtime {
    background: rgba(56, 189, 248, 0.14);
    color: #bdefff;
    border: 1px solid rgba(56, 189, 248, 0.34);

    &:hover {
      transform: translateY(-1px);
      background: rgba(56, 189, 248, 0.22);
    }
  }

  &.task-type-snap {
    background: rgba(34, 197, 94, 0.14);
    color: #bbf7d0;
    border: 1px solid rgba(34, 197, 94, 0.32);

    &:hover {
      transform: translateY(-1px);
      background: rgba(34, 197, 94, 0.22);
    }
  }
}

.disposition-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 58px;
  padding: 3px 8px;
  border-radius: var(--dashboard-radius);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: 1px solid rgba(184, 203, 224, 0.22);
  background: rgba(184, 203, 224, 0.1);
  color: rgba(230, 241, 255, 0.72);

  &.disposition-confirmed {
    color: #bdefff;
    border-color: rgba(56, 189, 248, 0.34);
    background: rgba(56, 189, 248, 0.14);
  }

  &.disposition-processed {
    color: #bbf7d0;
    border-color: rgba(34, 197, 94, 0.32);
    background: rgba(34, 197, 94, 0.14);
  }

  &.disposition-false-positive {
    color: #fed7aa;
    border-color: rgba(245, 158, 11, 0.36);
    background: rgba(245, 158, 11, 0.14);
  }
}

.alarm-location {
  font-size: 12px;
  color: var(--dashboard-muted);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alarm-time {
  font-size: 12px;
  color: rgba(184, 203, 224, 0.56);
  font-variant-numeric: tabular-nums;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(184, 203, 224, 0.52);

  .empty-text {
    margin-top: 16px;
    font-size: 14px;
  }
}

</style>

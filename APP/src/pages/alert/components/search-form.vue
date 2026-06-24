<template>
  <view class="flex items-center bg-white pr-24rpx">
    <view class="flex-1" @click="visible = true">
      <wd-search :placeholder="placeholder" hide-cancel disabled />
    </view>
    <view class="text-28rpx text-[#1890ff]" @click="emit('clear-all')">
      清空
    </view>
  </view>

  <wd-popup
    v-model="visible"
    position="top"
    :custom-style="getTopPopupStyle()"
    :modal-style="getTopPopupModalStyle()"
    @close="visible = false"
  >
    <view class="yd-search-form-container">
      <view class="yd-search-form-item">
        <view class="yd-search-form-label">
          任务名称
        </view>
        <wd-input v-model="formData.task_name" placeholder="模糊搜索" clearable />
      </view>
      <view class="yd-search-form-item">
        <view class="yd-search-form-label">
          告警事件
        </view>
        <wd-radio-group v-model="formData.event" type="button">
          <wd-radio v-for="opt in ALERT_EVENT_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </wd-radio>
        </wd-radio-group>
      </view>
      <yd-search-date-range v-model="formData.timeRange" label="告警时间" />
      <view class="yd-search-form-actions">
        <wd-button class="flex-1" variant="plain" @click="handleReset">
          重置
        </wd-button>
        <wd-button class="flex-1" type="primary" @click="handleSearch">
          搜索
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from 'vue'
import { getTopPopupModalStyle, getTopPopupStyle } from '@/utils'
import { ALERT_EVENT_OPTIONS } from '@/utils/video/alertDisplay'
import { formatDate, formatDateRange } from '@/utils/date'

const emit = defineEmits<{
  search: [data: Record<string, any>]
  reset: []
  'clear-all': []
}>()

const visible = ref(false)
const formData = reactive({
  task_name: '',
  event: '',
  timeRange: [undefined, undefined] as [number | undefined, number | undefined],
})

const placeholder = computed(() => {
  const parts: string[] = []
  if (formData.task_name)
    parts.push(formData.task_name)
  if (formData.event) {
    const label = ALERT_EVENT_OPTIONS.find(o => o.value === formData.event)?.label
    if (label && label !== '全部')
      parts.push(label)
  }
  if (formData.timeRange?.[0] && formData.timeRange?.[1]) {
    parts.push(`${formatDate(formData.timeRange[0])}~${formatDate(formData.timeRange[1])}`)
  }
  return parts.length ? parts.join(' | ') : '搜索告警事件'
})

function handleSearch() {
  visible.value = false
  const [begin, end] = formatDateRange(formData.timeRange) || []
  emit('search', {
    task_name: formData.task_name || undefined,
    event: formData.event || undefined,
    begin_datetime: begin,
    end_datetime: end,
  })
}

function handleReset() {
  formData.task_name = ''
  formData.event = ''
  formData.timeRange = [undefined, undefined]
  visible.value = false
  emit('reset')
}
</script>

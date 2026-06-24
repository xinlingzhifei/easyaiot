<template>
  <wd-popup v-model="visible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0; max-height: 85vh;">
    <view class="p-32rpx">
      <view class="mb-24rpx text-center text-32rpx font-semibold">
        训练详情
      </view>
      <view v-if="task" class="max-h-70vh overflow-y-auto">
        <view class="mb-24rpx flex items-center justify-between">
          <view class="text-34rpx font-semibold text-[#333]">
            {{ task.name || task.task_name }}
          </view>
          <wd-tag :type="getTrainStatusTagType(task.status)" plain>
            {{ getTrainStatusText(task.status) }}
          </wd-tag>
        </view>

        <view class="mb-24rpx">
          <view class="mb-8rpx flex justify-between text-26rpx text-[#666]">
            <text>训练进度</text>
            <text>{{ Math.round(task.progress ?? 0) }}%</text>
          </view>
          <wd-progress :percentage="Math.min(100, Math.max(0, task.progress ?? 0))" />
        </view>

        <view class="rounded-12rpx bg-[#f7f8f9] p-24rpx">
          <view v-for="row in detailRows" :key="row.label" class="mb-16rpx flex text-28rpx last:mb-0">
            <view class="w-180rpx flex-shrink-0 text-[#999]">
              {{ row.label }}
            </view>
            <view class="flex-1 break-all text-[#333]">
              {{ row.value }}
            </view>
          </view>
        </view>

        <view v-if="logs" class="mt-24rpx">
          <view class="mb-12rpx text-28rpx font-semibold text-[#666]">
            训练日志
          </view>
          <scroll-view scroll-y class="max-h-300rpx rounded-8rpx bg-[#1e1e1e] p-16rpx">
            <text class="whitespace-pre-wrap text-22rpx text-[#d4d4d4]">{{ logs }}</text>
          </scroll-view>
        </view>

        <view v-if="isTrainTaskActive(task.status)" class="mt-32rpx">
          <wd-button type="warning" block :loading="stopping" @click="handleStop">
            停止训练
          </wd-button>
        </view>
      </view>
    </view>
  </wd-popup>
</template>

<script lang="ts" setup>
import type { TrainTask } from '@/api/model/train'
import { computed, ref } from 'vue'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { getTrainLogs, getTrainTaskDetail, stopTrain } from '@/api/model/train'
import { getTrainStatusTagType, getTrainStatusText, isTrainTaskActive } from '@/utils/model/trainTaskUtils'
import { formatDateTime } from '@/utils/date'

const emit = defineEmits<{ refresh: [] }>()
const toast = useToast()
const visible = ref(false)
const task = ref<TrainTask | null>(null)
const logs = ref('')
const stopping = ref(false)

const detailRows = computed(() => {
  if (!task.value)
    return []
  const t = task.value
  return [
    { label: '数据集', value: t.dataset_name || '-' },
    { label: '版本', value: t.dataset_version || '-' },
    { label: '调度策略', value: t.schedule_policy || '-' },
    { label: '训练节点', value: t.service_server_ip || '-' },
    { label: '开始时间', value: formatDateTime(t.start_time) || '-' },
    { label: '模型路径', value: t.minio_model_path || '-' },
  ]
})

async function loadDetail(taskId: number) {
  try {
    task.value = await getTrainTaskDetail(taskId)
  }
  catch {
    // ignore
  }
  try {
    const res = await getTrainLogs(taskId)
    if (typeof res === 'string') {
      logs.value = res
    }
    else {
      logs.value = (res as any)?.logs || JSON.stringify(res, null, 2)
    }
  }
  catch {
    logs.value = ''
  }
}

async function handleStop() {
  if (!task.value)
    return
  stopping.value = true
  try {
    await stopTrain(task.value.id)
    toast.success('已发送停止指令')
    await loadDetail(task.value.id)
    emit('refresh')
  }
  catch {
    toast.error('停止失败')
  }
  finally {
    stopping.value = false
  }
}

async function open(item: TrainTask) {
  visible.value = true
  task.value = item
  logs.value = ''
  await loadDetail(item.id)
}

defineExpose({ open })
</script>

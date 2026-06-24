<template>
  <wd-popup v-model="visible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0; max-height: 90vh;">
    <view class="p-32rpx">
      <view class="mb-24rpx text-center text-32rpx font-semibold">
        推流任务详情
      </view>
      <view v-if="task" class="max-h-75vh overflow-y-auto">
        <view class="mb-24rpx flex items-center justify-between">
          <view class="min-w-0 flex-1 truncate text-34rpx font-semibold text-[#333]">
            {{ task.task_name }}
          </view>
          <wd-tag :type="task.is_enabled ? 'success' : 'default'" plain>
            {{ task.is_enabled ? '运行中' : '已停止' }}
          </wd-tag>
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

        <view v-if="serviceStatus" class="mt-24rpx">
          <view class="mb-12rpx text-28rpx font-semibold text-[#666]">
            服务状态
          </view>
          <view class="rounded-12rpx bg-[#f7f8f9] p-24rpx text-26rpx text-[#333]">
            <view class="mb-8rpx">
              状态：{{ serviceStatus.status === 'running' ? '运行中' : '已停止' }}
            </view>
            <view v-if="serviceStatus.server_ip" class="mb-8rpx">
              节点：{{ serviceStatus.server_ip }}{{ serviceStatus.port ? `:${serviceStatus.port}` : '' }}
            </view>
            <view v-if="serviceStatus.process_id" class="mb-8rpx">
              进程 ID：{{ serviceStatus.process_id }}
            </view>
            <view v-if="serviceStatus.last_heartbeat" class="mb-8rpx">
              最后心跳：{{ formatDateTime(serviceStatus.last_heartbeat) }}
            </view>
            <view>
              推流路数：{{ serviceStatus.total_streams ?? 0 }}
            </view>
          </view>
        </view>

        <view v-if="streams.length" class="mt-24rpx">
          <view class="mb-12rpx text-28rpx font-semibold text-[#666]">
            推流地址
          </view>
          <view
            v-for="stream in streams"
            :key="stream.device_id"
            class="mb-16rpx rounded-12rpx bg-[#f7f8f9] p-20rpx last:mb-0"
          >
            <view class="mb-8rpx text-28rpx font-medium text-[#333]">
              {{ stream.device_name }}
            </view>
            <view v-if="stream.http_stream" class="mb-4rpx break-all text-24rpx text-[#666]">
              HTTP：{{ stream.http_stream }}
            </view>
            <view v-if="stream.rtmp_stream" class="break-all text-24rpx text-[#666]">
              RTMP：{{ stream.rtmp_stream }}
            </view>
          </view>
        </view>

        <view v-if="logs" class="mt-24rpx">
          <view class="mb-12rpx text-28rpx font-semibold text-[#666]">
            运行日志
          </view>
          <scroll-view scroll-y class="max-h-300rpx rounded-8rpx bg-[#1e1e1e] p-16rpx">
            <text class="whitespace-pre-wrap text-22rpx text-[#d4d4d4]">{{ logs }}</text>
          </scroll-view>
        </view>

        <view class="mt-32rpx flex flex-wrap gap-16rpx">
          <wd-button
            v-if="!task.is_enabled"
            class="flex-1"
            type="primary"
            :loading="actionLoading"
            @click="handleStart"
          >
            启动
          </wd-button>
          <wd-button
            v-else
            class="flex-1"
            type="warning"
            :loading="actionLoading"
            @click="handleStop"
          >
            停止
          </wd-button>
          <wd-button
            class="flex-1"
            plain
            :loading="actionLoading"
            @click="handleRestart"
          >
            重启
          </wd-button>
        </view>

        <view class="mt-16rpx flex gap-16rpx">
          <wd-button class="flex-1" plain @click="handleEdit">
            编辑
          </wd-button>
          <wd-button class="flex-1" type="danger" plain :loading="actionLoading" @click="handleDelete">
            删除
          </wd-button>
        </view>
      </view>
    </view>
  </wd-popup>
</template>

<script lang="ts" setup>
import type { StreamForwardTask, StreamForwardTaskStatus, StreamForwardTaskStream } from '@/api/video/streamForward'
import { computed, ref } from 'vue'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import {
  deleteStreamForwardTask,
  getStreamForwardTask,
  getStreamForwardTaskLogs,
  getStreamForwardTaskStatus,
  getStreamForwardTaskStreams,
  restartStreamForwardTask,
  startStreamForwardTask,
  stopStreamForwardTask,
} from '@/api/video/streamForward'
import { formatClusterRuntime, formatSchedulePolicy } from '@/utils/video/clusterRuntime'
import { formatDateTime } from '@/utils/date'
import { formatDeviceNames, getOutputFormatText, getOutputQualityText } from '@/utils/video/streamForwardUtils'

const emit = defineEmits<{ refresh: [], edit: [task: StreamForwardTask] }>()
const toast = useToast()
const visible = ref(false)
const task = ref<StreamForwardTask | null>(null)
const serviceStatus = ref<StreamForwardTaskStatus | null>(null)
const streams = ref<StreamForwardTaskStream[]>([])
const logs = ref('')
const actionLoading = ref(false)

const detailRows = computed(() => {
  if (!task.value)
    return []
  const t = task.value
  return [
    { label: '任务编号', value: t.task_code || String(t.id) },
    { label: '关联摄像头', value: formatDeviceNames(t.device_names) },
    { label: '输出格式', value: getOutputFormatText(t.output_format) },
    { label: '输出质量', value: getOutputQualityText(t.output_quality) },
    { label: '调度策略', value: formatSchedulePolicy(t.schedule_policy, t) },
    { label: '运行节点', value: formatClusterRuntime(t) },
    { label: '推流路数', value: String(t.total_streams ?? 0) },
    { label: '最近处理', value: formatDateTime(t.last_process_time) || '-' },
    { label: '异常原因', value: t.exception_reason || '-' },
    { label: '任务描述', value: t.description || '-' },
  ]
})

async function loadExtraData() {
  if (!task.value)
    return
  const taskId = task.value.id
  serviceStatus.value = null
  streams.value = []
  logs.value = ''

  try {
    serviceStatus.value = await getStreamForwardTaskStatus(taskId)
  }
  catch {
    // ignore
  }

  try {
    const res = await getStreamForwardTaskStreams(taskId)
    streams.value = Array.isArray(res) ? res : []
  }
  catch {
    streams.value = []
  }

  try {
    const res = await getStreamForwardTaskLogs(taskId, { lines: 200 })
    logs.value = (res as any)?.logs || (typeof res === 'string' ? res : '')
  }
  catch {
    logs.value = ''
  }
}

async function reloadTask() {
  if (!task.value)
    return
  try {
    task.value = await getStreamForwardTask(task.value.id)
    await loadExtraData()
  }
  catch {
    // ignore
  }
}

async function handleStart() {
  if (!task.value)
    return
  actionLoading.value = true
  try {
    const res = await startStreamForwardTask(task.value.id) as any
    if (res?.already_running)
      toast.warning('任务运行中')
    else
      toast.success('启动成功')
    setTimeout(() => reloadTask().then(() => emit('refresh')), 1500)
  }
  catch (err: any) {
    toast.error(err?.msg || '启动失败')
  }
  finally {
    actionLoading.value = false
  }
}

async function handleStop() {
  if (!task.value)
    return
  actionLoading.value = true
  try {
    await stopStreamForwardTask(task.value.id)
    toast.success('停止成功')
    await reloadTask()
    emit('refresh')
  }
  catch (err: any) {
    toast.error(err?.msg || '停止失败')
  }
  finally {
    actionLoading.value = false
  }
}

async function handleRestart() {
  if (!task.value)
    return
  actionLoading.value = true
  try {
    await restartStreamForwardTask(task.value.id)
    toast.success('重启成功')
    setTimeout(() => reloadTask().then(() => emit('refresh')), 1500)
  }
  catch (err: any) {
    toast.error(err?.msg || '重启失败')
  }
  finally {
    actionLoading.value = false
  }
}

function handleEdit() {
  if (!task.value)
    return
  visible.value = false
  emit('edit', task.value)
}

function handleDelete() {
  if (!task.value)
    return
  uni.showModal({
    title: '确认删除',
    content: `确定删除任务「${task.value.task_name}」吗？`,
    success: async (res) => {
      if (!res.confirm || !task.value)
        return
      actionLoading.value = true
      try {
        await deleteStreamForwardTask(task.value.id)
        toast.success('删除成功')
        visible.value = false
        emit('refresh')
      }
      catch (err: any) {
        toast.error(err?.msg || '删除失败')
      }
      finally {
        actionLoading.value = false
      }
    },
  })
}

async function open(item: StreamForwardTask) {
  visible.value = true
  task.value = item
  await reloadTask()
}

defineExpose({ open })
</script>

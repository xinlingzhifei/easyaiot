<template>
  <view class="yd-page-container yd-page-container-paging">
    <wd-navbar title="模型训练" placeholder safe-area-inset-top fixed>
      <template #right>
        <view class="flex items-center gap-16rpx pr-16rpx">
          <view class="text-28rpx text-[#1890ff]" @click="handleCreate">
            新建
          </view>
          <AppNavUserButton />
        </view>
      </template>
    </wd-navbar>

    <SearchForm @search="handleQuery" @reset="handleReset" />

    <z-paging
      ref="pagingRef"
      v-model="list"
      :fixed="false"
      class="min-h-0 flex-1"
      :default-page-size="10"
      empty-view-text="暂无训练任务"
      @query="queryList"
    >
      <view class="p-24rpx">
        <view
          v-for="item in list"
          :key="item.id"
          class="mb-24rpx overflow-hidden rounded-12rpx bg-white shadow-sm"
          @click="handleDetail(item)"
        >
          <view class="p-24rpx">
            <view class="mb-16rpx flex items-start justify-between gap-16rpx">
              <view class="min-w-0 flex-1">
                <view class="truncate text-32rpx font-semibold text-[#333]">
                  {{ item.name || item.task_name }}
                </view>
                <view class="mt-8rpx text-26rpx text-[#999]">
                  {{ item.dataset_name || '-' }} · {{ item.dataset_version || '-' }}
                </view>
              </view>
              <wd-tag :type="getTrainStatusTagType(item.status)" plain>
                {{ getTrainStatusText(item.status) }}
              </wd-tag>
            </view>

            <view class="mb-12rpx">
              <view class="mb-8rpx flex justify-between text-24rpx text-[#666]">
                <text>进度</text>
                <text>{{ Math.round(item.progress ?? 0) }}%</text>
              </view>
              <wd-progress :percentage="Math.min(100, Math.max(0, item.progress ?? 0))" />
            </view>

            <view class="flex justify-between text-24rpx text-[#999]">
              <text>{{ item.schedule_policy || 'local' }}</text>
              <text>{{ formatDateTime(item.start_time) }}</text>
            </view>

            <view v-if="isTrainTaskActive(item.status)" class="mt-16rpx" @click.stop>
              <wd-button size="small" type="warning" @click="handleQuickStop(item)">
                停止训练
              </wd-button>
            </view>
          </view>
        </view>
      </view>
    </z-paging>

    <DetailPopup ref="detailPopupRef" @refresh="reload" @resume="handleResume" @retrain="handleRetrain" />
    <EditPopup ref="editPopupRef" @success="reload" />
  </view>
</template>

<script lang="ts" setup>
import type { TrainTask } from '@/api/model/train'
import { onUnmounted, ref } from 'vue'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { getTrainTaskPage, stopTrain } from '@/api/model/train'
import AppNavUserButton from '@/components/app-nav-user-button.vue'
import { formatDateTime } from '@/utils/date'
import { parseListResponse } from '@/utils/listResponse'
import { getTrainStatusTagType, getTrainStatusText, isTrainTaskActive } from '@/utils/model/trainTaskUtils'
import DetailPopup from './components/detail-popup.vue'
import EditPopup from './components/edit-popup.vue'
import SearchForm from './components/search-form.vue'

definePage({
  style: {
    navigationStyle: 'custom',
  },
})

const toast = useToast()
const list = ref<TrainTask[]>([])
const pagingRef = ref<any>()
const queryParams = ref<Record<string, any>>({})
const detailPopupRef = ref<InstanceType<typeof DetailPopup>>()
const editPopupRef = ref<InstanceType<typeof EditPopup>>()
let pollTimer: ReturnType<typeof setInterval> | null = null

async function queryList(pageNo: number, pageSize: number) {
  try {
    const res = await getTrainTaskPage({ ...queryParams.value, pageNo, pageSize })
    const { list: data, total } = parseListResponse<TrainTask>(res, ['data', 'list'])
    pagingRef.value?.completeByTotal(data, total)
    setupPolling(data)
  }
  catch {
    pagingRef.value?.complete(false)
  }
}

function setupPolling(data: TrainTask[]) {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  const hasActive = data.some(item => isTrainTaskActive(item.status))
  if (hasActive) {
    pollTimer = setInterval(() => {
      pagingRef.value?.refresh()
    }, 10000)
  }
}

onUnmounted(() => {
  if (pollTimer)
    clearInterval(pollTimer)
})

function handleQuery(data?: Record<string, any>) {
  queryParams.value = { ...data }
  reload()
}

function handleReset() {
  handleQuery()
}

function reload() {
  pagingRef.value?.reload()
}

function handleCreate() {
  editPopupRef.value?.openCreate()
}

function handleResume(item: TrainTask) {
  editPopupRef.value?.openResume(item)
}

function handleRetrain(item: TrainTask) {
  editPopupRef.value?.openRetrain(item)
}

function handleDetail(item: TrainTask) {
  detailPopupRef.value?.open(item)
}

async function handleQuickStop(item: TrainTask) {
  try {
    await stopTrain(item.id)
    toast.success('已发送停止指令')
    reload()
  }
  catch {
    toast.error('停止失败')
  }
}
</script>

<template>
  <view class="yd-page-container yd-page-container-paging">
    <wd-navbar title="推流转发" placeholder safe-area-inset-top fixed>
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
      empty-view-text="暂无推流任务"
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
                  {{ item.task_name }}
                </view>
                <view class="mt-8rpx truncate text-26rpx text-[#999]">
                  {{ formatDeviceNames(item.device_names) }}
                </view>
              </view>
              <wd-tag :type="item.is_enabled ? 'success' : 'default'" plain>
                {{ item.is_enabled ? '运行中' : '已停止' }}
              </wd-tag>
            </view>

            <view class="flex flex-wrap gap-12rpx">
              <wd-tag type="primary" plain>
                {{ getOutputFormatText(item.output_format) }}
              </wd-tag>
              <wd-tag plain>
                质量 {{ getOutputQualityText(item.output_quality) }}
              </wd-tag>
              <wd-tag plain>
                {{ formatSchedulePolicy(item.schedule_policy, item) }}
              </wd-tag>
            </view>

            <view class="mt-16rpx flex justify-between text-26rpx text-[#666]">
              <text class="truncate">{{ formatClusterRuntime(item) }}</text>
              <text>{{ item.total_streams ?? 0 }} 路</text>
            </view>

            <view class="mt-16rpx flex gap-16rpx" @click.stop>
              <wd-button
                v-if="!item.is_enabled"
                size="small"
                type="primary"
                @click="handleQuickStart(item)"
              >
                启动
              </wd-button>
              <wd-button
                v-else
                size="small"
                type="warning"
                @click="handleQuickStop(item)"
              >
                停止
              </wd-button>
              <wd-button
                size="small"
                plain
                @click="handleDetail(item)"
              >
                详情
              </wd-button>
            </view>
          </view>
        </view>
      </view>
    </z-paging>

    <DetailPopup ref="detailPopupRef" @refresh="reload" @edit="handleEdit" />
    <EditPopup ref="editPopupRef" @success="reload" />
  </view>
</template>

<script lang="ts" setup>
import type { StreamForwardTask } from '@/api/video/streamForward'
import { ref } from 'vue'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import {
  listStreamForwardTasks,
  startStreamForwardTask,
  stopStreamForwardTask,
} from '@/api/video/streamForward'
import AppNavUserButton from '@/components/app-nav-user-button.vue'
import { parseListResponse } from '@/utils/listResponse'
import { formatClusterRuntime, formatSchedulePolicy } from '@/utils/video/clusterRuntime'
import {
  formatDeviceNames,
  getOutputFormatText,
  getOutputQualityText,
} from '@/utils/video/streamForwardUtils'
import DetailPopup from './components/detail-popup.vue'
import EditPopup from './components/edit-popup.vue'
import SearchForm from './components/search-form.vue'

definePage({
  style: {
    navigationStyle: 'custom',
  },
})

const toast = useToast()
const list = ref<StreamForwardTask[]>([])
const pagingRef = ref<any>()
const queryParams = ref<Record<string, any>>({})
const detailPopupRef = ref<InstanceType<typeof DetailPopup>>()
const editPopupRef = ref<InstanceType<typeof EditPopup>>()

async function queryList(pageNo: number, pageSize: number) {
  try {
    const res = await listStreamForwardTasks({ ...queryParams.value, pageNo, pageSize })
    const { list: data, total } = parseListResponse<StreamForwardTask>(res, ['data'])
    pagingRef.value?.completeByTotal(data, total)
  }
  catch {
    pagingRef.value?.complete(false)
  }
}

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

function handleDetail(item: StreamForwardTask) {
  detailPopupRef.value?.open(item)
}

function handleCreate() {
  editPopupRef.value?.openCreate()
}

function handleEdit(item: StreamForwardTask) {
  editPopupRef.value?.openEdit(item)
}

async function handleQuickStart(item: StreamForwardTask) {
  try {
    const res = await startStreamForwardTask(item.id) as any
    if (res?.already_running)
      toast.warning('任务运行中')
    else
      toast.success('任务已启动')
    item.is_enabled = true
    setTimeout(() => reload(), 2000)
  }
  catch {
    toast.error('启动失败')
  }
}

async function handleQuickStop(item: StreamForwardTask) {
  try {
    await stopStreamForwardTask(item.id)
    toast.success('任务已停止')
    item.is_enabled = false
  }
  catch {
    toast.error('停止失败')
  }
}
</script>

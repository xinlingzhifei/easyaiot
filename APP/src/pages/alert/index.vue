<template>
  <view class="yd-page-container yd-page-container-paging">
    <wd-navbar title="告警事件" placeholder safe-area-inset-top fixed>
      <template #right>
        <AppNavUserButton />
      </template>
    </wd-navbar>

    <SearchForm @search="handleQuery" @reset="handleReset" @clear-all="handleClearAll" />

    <z-paging
      ref="pagingRef"
      v-model="list"
      :fixed="false"
      class="min-h-0 flex-1"
      :default-page-size="10"
      empty-view-text="暂无告警"
      @query="queryList"
    >
      <view class="p-24rpx">
        <view
          v-for="item in list"
          :key="String(item.id)"
          class="mb-24rpx overflow-hidden rounded-12rpx bg-white shadow-sm"
          @click="handleDetail(item)"
        >
          <view class="flex">
            <image
              v-if="item.image_url"
              :src="resolveAlertImageDisplayUrl(item.image_url)"
              mode="aspectFill"
              class="h-180rpx w-180rpx flex-shrink-0 bg-[#f0f0f0]"
            />
            <view class="min-w-0 flex-1 p-24rpx">
              <view class="mb-12rpx flex items-start justify-between gap-12rpx">
                <view class="line-clamp-2 flex-1 text-30rpx font-semibold text-[#333]">
                  {{ formatAlertListTitle(item) }}
                </view>
                <wd-tag :type="getAlertEventTagType(item.event)" plain>
                  {{ formatAlertEvent(item.event) }}
                </wd-tag>
              </view>
              <view class="mb-8rpx truncate text-26rpx text-[#666]">
                {{ item.device_name || item.device_id }}
              </view>
              <view class="mb-8rpx truncate text-26rpx text-[#999]">
                {{ item.task_name || '-' }}
              </view>
              <view class="flex items-center justify-between text-24rpx text-[#999]">
                <wd-tag :type="getTaskTypeTagType(item.task_type)" plain>
                  {{ getTaskTypeText(item.task_type) }}
                </wd-tag>
                <text>{{ formatDateTime(item.time) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </z-paging>

    <DetailPopup ref="detailPopupRef" />
  </view>
</template>

<script lang="ts" setup>
import type { AlertRecord } from '@/api/video/alert'
import { ref } from 'vue'
import { useDialog } from '@wot-ui/ui/components/wd-dialog'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { clearAllAlarms, queryAlarmList } from '@/api/video/alert'
import AppNavUserButton from '@/components/app-nav-user-button.vue'
import { formatDateTime } from '@/utils/date'
import { parseListResponse } from '@/utils/listResponse'
import {
  formatAlertEvent,
  formatAlertListTitle,
  getAlertEventTagType,
  getTaskTypeTagType,
  getTaskTypeText,
} from '@/utils/video/alertDisplay'
import { resolveAlertImageDisplayUrl } from '@/utils/mediaDisplay'
import DetailPopup from './components/detail-popup.vue'
import SearchForm from './components/search-form.vue'

definePage({
  style: {
    navigationStyle: 'custom',
  },
})

const toast = useToast()
const dialog = useDialog()
const list = ref<AlertRecord[]>([])
const pagingRef = ref<any>()
const queryParams = ref<Record<string, any>>({})
const detailPopupRef = ref<InstanceType<typeof DetailPopup>>()

async function queryList(pageNo: number, pageSize: number) {
  try {
    const res = await queryAlarmList({ ...queryParams.value, pageNo, pageSize })
    const { list: data, total } = parseListResponse<AlertRecord>(res, ['alert_list'])
    pagingRef.value?.completeByTotal(data, total)
  }
  catch {
    pagingRef.value?.complete(false)
  }
}

function handleQuery(data?: Record<string, any>) {
  queryParams.value = { ...data }
  pagingRef.value?.reload()
}

function handleReset() {
  handleQuery()
}

function handleDetail(item: AlertRecord) {
  detailPopupRef.value?.open(item)
}

async function handleClearAll() {
  try {
    await dialog.confirm({
      title: '清空告警',
      msg: '确定清空全部告警记录？此操作不可恢复。',
    })
  }
  catch {
    return
  }
  try {
    await clearAllAlarms()
    toast.success('已清空全部告警')
    pagingRef.value?.reload()
  }
  catch {
    toast.error('清空失败')
  }
}
</script>

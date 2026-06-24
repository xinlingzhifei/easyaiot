<template>
  <view class="yd-page-container yd-page-container-paging">
    <wd-navbar title="设备列表" placeholder safe-area-inset-top fixed>
      <template #right>
        <AppNavUserButton />
      </template>
    </wd-navbar>

    <SearchForm @search="handleQuery" @reset="handleReset" />

    <z-paging
      ref="pagingRef"
      v-model="list"
      :fixed="false"
      class="min-h-0 flex-1"
      :default-page-size="10"
      empty-view-text="暂无设备"
      @query="queryList"
    >
      <view class="p-24rpx">
        <view
          v-for="item in list"
          :key="item.id"
          class="mb-24rpx overflow-hidden rounded-12rpx bg-white shadow-sm"
          @click="handleItemClick(item)"
        >
          <view class="p-24rpx">
            <view class="mb-16rpx flex items-start justify-between gap-16rpx">
              <view class="min-w-0 flex-1">
                <view class="truncate text-32rpx text-[#333] font-semibold">
                  {{ item.name }}
                </view>
                <view class="mt-8rpx truncate text-26rpx text-[#999]">
                  {{ item.subtitle }}
                </view>
              </view>
              <view class="flex flex-shrink-0 items-center gap-12rpx">
                <wd-tag v-if="item.rowKind === 'direct'" :type="item.online ? 'success' : 'danger'" plain>
                  {{ item.online ? '在线' : '离线' }}
                </wd-tag>
                <wd-tag v-else-if="item.rowKind === 'gb28181'" :type="item.online ? 'success' : 'danger'" plain>
                  {{ item.online ? '在线' : '离线' }}
                </wd-tag>
                <wd-icon v-if="item.rowKind !== 'direct'" name="arrow-right" size="32rpx" color="#ccc" />
              </view>
            </view>

            <view class="flex flex-wrap gap-12rpx">
              <wd-tag type="primary" plain>
                {{ getDeviceKindText(item.device_kind) }}
              </wd-tag>
              <wd-tag v-if="item.channelCount != null" plain>
                {{ item.channelCount }} 路通道
              </wd-tag>
              <wd-tag v-if="item.device?.has_location" type="success" plain>
                已定位
              </wd-tag>
            </view>
          </view>
        </view>
      </view>
    </z-paging>

    <DetailPopup ref="detailPopupRef" />
  </view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { getDeviceKindText } from '@/api/video/camera'
import AppNavUserButton from '@/components/app-nav-user-button.vue'
import type { DeviceRootRow } from '@/utils/video/deviceList'
import { fetchRootDeviceList } from '@/utils/video/deviceList'
import DetailPopup from './components/detail-popup.vue'
import SearchForm from './components/search-form.vue'

definePage({
  type: 'home',
  style: {
    navigationStyle: 'custom',
  },
})

const list = ref<DeviceRootRow[]>([])
const pagingRef = ref<any>()
const queryParams = ref<Record<string, any>>({})
const detailPopupRef = ref<InstanceType<typeof DetailPopup>>()
const cachedRows = ref<DeviceRootRow[]>([])

async function loadAllRows() {
  cachedRows.value = await fetchRootDeviceList({
    search: queryParams.value.search,
    online: queryParams.value.online,
  })
}

async function queryList(pageNo: number, pageSize: number) {
  try {
    if (pageNo === 1 || !cachedRows.value.length)
      await loadAllRows()
    const start = (pageNo - 1) * pageSize
    const page = cachedRows.value.slice(start, start + pageSize)
    pagingRef.value?.completeByTotal(page, cachedRows.value.length)
  } catch {
    cachedRows.value = []
    pagingRef.value?.complete(false)
  }
}

function handleQuery(data?: Record<string, any>) {
  queryParams.value = { ...data }
  cachedRows.value = []
  pagingRef.value?.reload()
}

function handleReset() {
  handleQuery()
}

function handleItemClick(item: DeviceRootRow) {
  if (item.rowKind === 'nvr' && item.nvrId != null) {
    uni.navigateTo({
      url: `/pages/device/nvr/index?nvrId=${item.nvrId}&title=${encodeURIComponent(item.name)}`,
    })
    return
  }
  if (item.rowKind === 'gb28181' && item.sipDeviceId) {
    uni.navigateTo({
      url: `/pages/device/gb28181/index?sipId=${encodeURIComponent(item.sipDeviceId)}&title=${encodeURIComponent(item.name)}`,
    })
    return
  }
  if (item.device)
    detailPopupRef.value?.open(item.device)
}
</script>

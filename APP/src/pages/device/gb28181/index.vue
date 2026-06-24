<template>
  <view class="yd-page-container yd-page-container-paging">
    <wd-navbar :title="pageTitle" left-arrow placeholder safe-area-inset-top fixed @click-left="handleBack">
      <template #right>
        <AppNavUserButton />
      </template>
    </wd-navbar>

    <z-paging
      ref="pagingRef"
      v-model="list"
      :fixed="false"
      class="min-h-0 flex-1"
      :default-page-size="10"
      empty-view-text="暂无国标通道"
      @query="queryList"
    >
      <view class="p-24rpx">
        <DeviceItemCard
          v-for="item in list"
          :key="item.id"
          :item="item"
          @click="handleDetail(item)"
        />
      </view>
    </z-paging>

    <DetailPopup ref="detailPopupRef" />
  </view>
</template>

<script lang="ts" setup>
import type { DeviceInfo } from '@/api/video/camera'
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { gbChannelToDeviceInfo, getGbDeviceChannels } from '@/api/video/gb28181'
import AppNavUserButton from '@/components/app-nav-user-button.vue'
import DetailPopup from '../components/detail-popup.vue'
import DeviceItemCard from '../components/device-item-card.vue'

definePage({
  style: {
    navigationStyle: 'custom',
  },
})

const list = ref<DeviceInfo[]>([])
const pagingRef = ref<any>()
const detailPopupRef = ref<InstanceType<typeof DetailPopup>>()
const pageTitle = ref('国标设备')
const sipId = ref('')
const cachedChannels = ref<DeviceInfo[]>([])

onLoad((options) => {
  sipId.value = decodeURIComponent(options?.sipId || '')
  if (options?.title)
    pageTitle.value = decodeURIComponent(options.title)
})

async function loadChannels() {
  if (!sipId.value)
    return
  const { data } = await getGbDeviceChannels(sipId.value)
  cachedChannels.value = (data || []).map(ch => gbChannelToDeviceInfo(ch, sipId.value))
}

async function queryList(pageNo: number, pageSize: number) {
  try {
    if (pageNo === 1 || !cachedChannels.value.length)
      await loadChannels()
    const start = (pageNo - 1) * pageSize
    const page = cachedChannels.value.slice(start, start + pageSize)
    pagingRef.value?.completeByTotal(page, cachedChannels.value.length)
  } catch {
    cachedChannels.value = []
    pagingRef.value?.complete(false)
  }
}

function handleDetail(item: DeviceInfo) {
  detailPopupRef.value?.open(item)
}

function handleBack() {
  uni.navigateBack()
}
</script>

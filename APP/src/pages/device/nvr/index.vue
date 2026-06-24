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
      empty-view-text="暂无挂载摄像头"
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
import { getNvrDetail } from '@/api/video/camera'
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
const pageTitle = ref('NVR 通道')
const nvrId = ref<number>(0)
const cachedCameras = ref<DeviceInfo[]>([])

onLoad((options) => {
  nvrId.value = Number(options?.nvrId || 0)
  if (options?.title)
    pageTitle.value = decodeURIComponent(options.title)
})

async function loadCameras() {
  if (!nvrId.value)
    return
  const detail = await getNvrDetail(nvrId.value, true)
  cachedCameras.value = (detail?.cameras || []).map(cam => ({
    ...cam,
    device_kind: cam.device_kind || 'nvr_channel',
  }))
}

async function queryList(pageNo: number, pageSize: number) {
  try {
    if (pageNo === 1 || !cachedCameras.value.length)
      await loadCameras()
    const start = (pageNo - 1) * pageSize
    const page = cachedCameras.value.slice(start, start + pageSize)
    pagingRef.value?.completeByTotal(page, cachedCameras.value.length)
  } catch {
    cachedCameras.value = []
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

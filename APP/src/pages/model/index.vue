<template>
  <view class="yd-page-container yd-page-container-paging">
    <wd-navbar title="模型管理" placeholder safe-area-inset-top fixed>
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
      empty-view-text="暂无模型"
      @query="queryList"
    >
      <view class="p-24rpx">
        <view
          v-for="item in list"
          :key="item.id"
          class="mb-24rpx overflow-hidden rounded-12rpx bg-white shadow-sm"
          @click="handleDetail(item)"
        >
          <view class="flex p-24rpx">
            <image
              v-if="item.imageUrl"
              :src="resolveModelImageDisplayUrl(item.imageUrl)"
              mode="aspectFill"
              class="mr-24rpx h-120rpx w-120rpx flex-shrink-0 rounded-12rpx bg-[#f0f0f0]"
            />
            <view v-else class="mr-24rpx h-120rpx w-120rpx flex flex-shrink-0 items-center justify-center rounded-12rpx bg-[#f0f0f0]">
              <view class="i-carbon-cube text-48rpx text-[#ccc]" />
            </view>
            <view class="min-w-0 flex-1">
              <view class="mb-8rpx flex items-start justify-between gap-12rpx">
                <view class="truncate text-32rpx font-semibold text-[#333]">
                  {{ item.name }}
                </view>
                <wd-tag :type="getModelStatusTagType(item.status)" plain>
                  {{ getModelStatusText(item.status) }}
                </wd-tag>
              </view>
              <view class="mb-8rpx text-26rpx text-[#999]">
                版本 v{{ item.version || '-' }}
              </view>
              <view class="line-clamp-2 text-26rpx text-[#666]">
                {{ item.description || '暂无描述' }}
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
import type { ModelInfo } from '@/api/model'
import { ref } from 'vue'
import { getModelPage } from '@/api/model'
import AppNavUserButton from '@/components/app-nav-user-button.vue'
import { getModelStatusTagType, getModelStatusText } from '@/utils/model/trainTaskUtils'
import { resolveModelImageDisplayUrl } from '@/utils/mediaDisplay'
import { parseListResponse } from '@/utils/listResponse'
import DetailPopup from './components/detail-popup.vue'
import SearchForm from './components/search-form.vue'

definePage({
  style: {
    navigationStyle: 'custom',
  },
})

const list = ref<ModelInfo[]>([])
const pagingRef = ref<any>()
const queryParams = ref<Record<string, any>>({})
const detailPopupRef = ref<InstanceType<typeof DetailPopup>>()

async function queryList(pageNo: number, pageSize: number) {
  try {
    const res = await getModelPage({ ...queryParams.value, pageNo, pageSize })
    const { list: data, total } = parseListResponse<ModelInfo>(res, ['data'])
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

function handleDetail(item: ModelInfo) {
  detailPopupRef.value?.open(item)
}
</script>

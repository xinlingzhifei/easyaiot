<template>
  <view v-if="visible" class="mt-24rpx">
    <view class="mb-16rpx flex items-center justify-between">
      <view class="text-30rpx font-semibold text-[#333]">
        推理结果
      </view>
      <view v-if="detectionCount != null" class="text-26rpx text-[#1890ff]">
        检测到 {{ detectionCount }} 个目标
      </view>
    </view>

    <view v-if="averageConfidence != null && detectionCount" class="mb-16rpx text-24rpx text-[#999]">
      平均置信度 {{ averageConfidence }}%
    </view>

    <view class="grid grid-cols-2 gap-16rpx">
      <view class="overflow-hidden rounded-12rpx bg-[#f7f8f9]">
        <view class="px-16rpx py-8rpx text-center text-22rpx text-[#999]">
          原图
        </view>
        <image
          v-if="inputImageUrl"
          :src="inputImageUrl"
          mode="widthFix"
          class="w-full"
          @click="preview(inputImageUrl)"
        />
        <view v-else class="flex h-200rpx items-center justify-center text-24rpx text-[#ccc]">
          无原图
        </view>
      </view>
      <view class="overflow-hidden rounded-12rpx bg-[#f7f8f9]">
        <view class="px-16rpx py-8rpx text-center text-22rpx text-[#999]">
          检测结果
        </view>
        <image
          v-if="resultImageUrl"
          :src="resultImageUrl"
          mode="widthFix"
          class="w-full"
          @click="preview(resultImageUrl)"
        />
        <view v-else class="flex h-200rpx items-center justify-center text-24rpx text-[#ccc]">
          暂无结果图
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps<{
  inputImageUrl?: string
  resultImageUrl?: string
  detectionCount?: number
  averageConfidence?: number
}>()

const visible = computed(() => !!(props.inputImageUrl || props.resultImageUrl))

function preview(url: string) {
  if (url)
    uni.previewImage({ urls: [url] })
}
</script>

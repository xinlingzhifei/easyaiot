<template>
  <view
    class="mb-24rpx overflow-hidden rounded-12rpx bg-white shadow-sm"
    @click="emit('click')"
  >
    <view class="p-24rpx">
      <view class="mb-16rpx flex items-start justify-between gap-16rpx">
        <view class="min-w-0 flex-1">
          <view class="truncate text-32rpx text-[#333] font-semibold">
            {{ item.name || item.id }}
          </view>
          <view class="mt-8rpx truncate text-26rpx text-[#999]">
            {{ subtitle }}
          </view>
        </view>
        <wd-tag v-if="showOnline" :type="item.online ? 'success' : 'danger'" plain>
          {{ item.online ? '在线' : '离线' }}
        </wd-tag>
      </view>

      <view class="flex flex-wrap gap-12rpx">
        <wd-tag type="primary" plain>
          {{ getDeviceKindText(item.device_kind) }}
        </wd-tag>
        <wd-tag v-if="item.has_location" type="success" plain>
          已定位
        </wd-tag>
        <wd-tag v-if="item.nvr_label" plain>
          {{ item.nvr_label }}
        </wd-tag>
        <wd-tag v-if="item.nvr_channel != null && item.nvr_channel > 0" plain>
          CH{{ item.nvr_channel }}
        </wd-tag>
      </view>

      <view v-if="item.address" class="mt-16rpx truncate text-26rpx text-[#666]">
        {{ item.address }}
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type { DeviceInfo } from '@/api/video/camera'
import { computed } from 'vue'
import { getDeviceKindText } from '@/api/video/camera'

const props = withDefaults(defineProps<{
  item: DeviceInfo
  showOnline?: boolean
}>(), {
  showOnline: true,
})

const emit = defineEmits<{
  click: []
}>()

const subtitle = computed(() => {
  const ip = props.item.ip
  if (ip)
    return props.item.port ? `${ip}:${props.item.port}` : ip
  return props.item.id
})
</script>

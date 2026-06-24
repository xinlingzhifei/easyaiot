<template>
  <view class="live-stream-player overflow-hidden rounded-12rpx bg-black">
    <!-- #ifdef H5 -->
    <JessibucaPlayer
      v-if="playUrl"
      :key="playUrl"
      :play-url="playUrl"
      :vod-mode="vodMode"
      :height="height"
    />
    <view v-else class="flex items-center justify-center bg-[#f0f0f0] text-26rpx text-[#999]" :style="{ height }">
      暂无播放地址
    </view>
    <!-- #endif -->
    <!-- #ifndef H5 -->
    <video
      v-if="playUrl"
      :src="playUrl"
      class="w-full"
      :style="{ height }"
      :autoplay="autoplay"
      :controls="true"
      :show-center-play-btn="true"
      object-fit="contain"
    />
    <view v-else class="flex items-center justify-center bg-[#f0f0f0] text-26rpx text-[#999]" :style="{ height }">
      暂无播放地址
    </view>
    <!-- #endif -->
  </view>
</template>

<script lang="ts" setup>
import JessibucaPlayer from '@/components/jessibuca-player.vue'

withDefaults(defineProps<{
  playUrl?: string
  autoplay?: boolean
  /** 点播/录像文件（非实时流） */
  vodMode?: boolean
  height?: string
}>(), {
  playUrl: '',
  autoplay: true,
  vodMode: false,
  height: '400rpx',
})
</script>

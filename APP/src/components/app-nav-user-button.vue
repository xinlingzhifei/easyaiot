<template>
  <view class="flex items-center justify-center px-16rpx" @click.stop="handleClick">
    <wd-img
      :src="avatar"
      width="56rpx"
      height="56rpx"
      mode="aspectFill"
      round
    />
  </view>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useUserStore } from '@/store'
import { resolveAvatarDisplayUrl } from '@/utils/mediaDisplay'

const userStore = useUserStore()
const { userInfo } = storeToRefs(userStore)

const avatar = computed(() => resolveAvatarDisplayUrl(userInfo.value.avatar))

function handleClick() {
  uni.switchTab({ url: '/pages/user/index' })
}
</script>

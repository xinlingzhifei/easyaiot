<template>
  <view class="auth-header">
    <view class="auth-header__brand">
      <view class="auth-header__logo-wrap">
        <wd-img
          class="auth-header__logo"
          src="/static/logo.png"
          width="120rpx"
          height="120rpx"
          mode="aspectFit"
        />
      </view>
      <view class="auth-header__title">
        {{ title }}
      </view>
      <view v-if="subtitle" class="auth-header__subtitle">
        {{ subtitle }}
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
  subtitle?: string
}>(), {
  subtitle: '',
})

const title = import.meta.env.VITE_APP_TITLE
</script>

<style lang="scss" scoped>
$auth-text: #1a2332;
$auth-text-secondary: #64748b;

.auth-header {
  position: relative;
  z-index: 1;
  padding: calc(env(safe-area-inset-top) + 72rpx) 48rpx 32rpx;

  &__brand {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__logo-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 140rpx;
    height: 140rpx;
    margin-bottom: 28rpx;
  }

  &__logo {
    width: 120rpx;
    height: 120rpx;
  }

  &__title {
    font-size: 44rpx;
    font-weight: 700;
    color: $auth-text;
    letter-spacing: 1rpx;
  }

  &__subtitle {
    margin-top: 14rpx;
    font-size: 26rpx;
    font-weight: 400;
    color: $auth-text-secondary;
    letter-spacing: 3rpx;
  }
}

@media (min-width: 768px) {
  .auth-header {
    padding: 40px 36px 24px;
  }
}
</style>

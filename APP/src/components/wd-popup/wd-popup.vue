<script setup lang="ts">
import WdPopupNative from '@wot-ui/ui/components/wd-popup/wd-popup.vue'
import { POPUP_Z_INDEX } from '@/constants/layer'

defineOptions({
  inheritAttrs: false,
})
</script>

<template>
  <WdPopupNative
    root-portal
    :z-index="POPUP_Z_INDEX"
    v-bind="$attrs"
  >
    <slot />
  </WdPopupNative>
</template>

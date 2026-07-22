<template>
  <n-space class="go-mt-0" :wrap="false">
    <n-button v-for="item in comBtnList" :key="item.title" :type="item.type" ghost @click="item.event">
      <template #icon>
        <component :is="item.icon"></component>
      </template>
      <span>{{ item.title }}</span>
    </n-button>
  </n-space>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderIcon, goDialog, fetchPathByName, routerTurnByPath, fetchRouteParamsLocation } from '@/utils'
import { PreviewEnum } from '@/enums/pageEnum'
import { useRoute } from 'vue-router'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { syncData, saveToBackend } from '../../ContentEdit/components/EditTools/hooks/useSyncUpdate.hook'
import { useSync } from '@/views/chart/hooks/useSync.hook'
import { publishProjectApi } from '@/api/path'
import { icon } from '@/plugins'
import { cloneDeep } from 'lodash'

const { BrowsersOutlineIcon, SendIcon, AnalyticsIcon, DownloadOutlineIcon } = icon.ionicons5
const chartEditStore = useChartEditStore()
const { dataSyncUpdate } = useSync()

const routerParamsInfo = useRoute()

// 预览：先保存再打开预览页（从后台加载）
const previewHandle = async () => {
  const path = fetchPathByName(PreviewEnum.CHART_PREVIEW_NAME, 'href')
  if (!path) return
  const { id } = routerParamsInfo.params
  const previewId = typeof id === 'string' ? id : id[0]
  try {
    await dataSyncUpdate(true)
  } catch (e) {
    // ignore
  }
  routerTurnByPath(path, [previewId], undefined, true)
}

// 发布
const sendHandle = () => {
  const id = fetchRouteParamsLocation()
  goDialog({
    message: '确认发布当前大屏？',
    positiveText: '发布',
    onPositiveCallback: async () => {
      try {
        await dataSyncUpdate(true)
        await publishProjectApi({ id, state: 1 })
        window['$message'].success('发布成功')
      } catch (e) {
        // 拦截器已提示
      }
    }
  })
}

const btnList = [
  {
    select: true,
    title: '同步内容',
    type: 'primary',
    icon: renderIcon(AnalyticsIcon),
    event: syncData
  },
  {
    select: true,
    title: '保存',
    type: 'primary',
    icon: renderIcon(DownloadOutlineIcon),
    event: saveToBackend
  },
  {
    select: true,
    title: '预览',
    icon: renderIcon(BrowsersOutlineIcon),
    event: previewHandle
  },
  {
    select: true,
    title: '发布',
    icon: renderIcon(SendIcon),
    event: sendHandle
  }
]

const comBtnList = computed(() => {
  if (chartEditStore.getEditCanvas.isCodeEdit) {
    return btnList
  }
  const cloneList = cloneDeep(btnList)
  // 非代码编辑模式去掉「同步内容」
  cloneList.shift()
  return cloneList
})
</script>

<style lang="scss" scoped>
@include deep() {
  .n-button {
    --n-padding: 5px 10px;
  }
}
</style>

import { watch } from 'vue'
import { useRoute } from 'vue-router'
import throttle from 'lodash/throttle'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { EditCanvasTypeEnum } from '@/store/modules/chartEditStore/chartEditStore.d'
import { useSync } from '@/views/chart/hooks/useSync.hook'
import { ChartEnum } from '@/enums/pageEnum'
import { SavePageEnum } from '@/enums/editPageEnum'
import { goDialog } from '@/utils'

const { updateComponent, dataSyncFetch, dataSyncUpdate } = useSync()
const chartEditStore = useChartEditStore()

export const syncData = () => {
  goDialog({
    message: '是否覆盖源视图内容，此操作不可撤回?',
    isMaskClosable: true,
    transformOrigin: 'center',
    onPositiveCallback: () => {
      window['$message'].success('正在同步编辑器...')
      dispatchEvent(new CustomEvent(SavePageEnum.CHART, { detail: chartEditStore.getStorageInfo() }))
    }
  })
}

/** 保存到后台 */
export const saveToBackend = () => {
  dataSyncUpdate()
}

// 同步数据到预览页
export const syncDataToPreview = () => {
  dispatchEvent(new CustomEvent(SavePageEnum.CHART_TO_PREVIEW, { detail: chartEditStore.getStorageInfo() }))
}

// 侦听器更新
const useSyncUpdateHandle = () => {
  // 更新处理
  const updateFn = (e: any) => {
    window['$message'].success('正在进行更新...')
    updateComponent(e!.detail, true)
  }

  // 页面关闭处理
  const closeFn = () => {
    chartEditStore.setEditCanvas(EditCanvasTypeEnum.IS_CODE_EDIT, false)
  }

  // 开启侦听
  const use = () => {
    // 进入编辑页时从后台加载
    dataSyncFetch()

    // 失焦同步数据
    addEventListener('blur', syncDataToPreview)

    // 监听编辑器保存事件 刷新工作台图表
    addEventListener(SavePageEnum.JSON, updateFn)

    // 监听编辑页关闭
    addEventListener(SavePageEnum.CLOSE, throttle(closeFn, 1000))
  }

  // 关闭侦听
  const unUse = () => {
    removeEventListener('blur', syncDataToPreview)
    removeEventListener(SavePageEnum.JSON, updateFn)
  }

  // 路由变更时处理
  const watchHandler = (toName: any, fromName: any) => {
    if (fromName == ChartEnum.CHART_HOME_NAME) {
      unUse()
    }
    if (toName == ChartEnum.CHART_HOME_NAME) {
      use()
    }
  }

  return watchHandler
}

export const useSyncUpdate = () => {
  const routerParamsInfo = useRoute()
  watch(() => routerParamsInfo.name, useSyncUpdateHandle(), { immediate: true })
}

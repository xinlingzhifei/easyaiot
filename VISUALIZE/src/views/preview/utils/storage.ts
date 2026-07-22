import { JSONParse } from '@/utils'
import { ChartEditStorage } from '@/store/modules/chartEditStore/chartEditStore.d'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { fetchProjectApi } from '@/api/path'
import { useSync } from '@/views/chart/hooks/useSync.hook'

const chartEditStore = useChartEditStore()

export interface ChartEditStorageType extends ChartEditStorage {
  id: string
}

// 根据路由 id 从后台加载画布
export const getSessionStorageInfo = async () => {
  const urlHash = document.location.hash
  const toPathArray = urlHash.split('/')
  const id = toPathArray && toPathArray[toPathArray.length - 1]
  if (!id) return

  try {
    const res: any = await fetchProjectApi(id)
    const project = res?.data
    if (!project) {
      window['$message']?.warning('项目不存在')
      return
    }
    if (project.content) {
      const content =
        typeof project.content === 'string' ? JSONParse(project.content) : project.content
      const { updateComponent } = useSync()
      await updateComponent(content as ChartEditStorage, true)
      return { id, ...(content as ChartEditStorage) }
    }
    return { id } as ChartEditStorageType
  } catch (e) {
    return
  }
}

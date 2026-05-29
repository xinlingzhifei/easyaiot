<template>
  <div class="video-monitor">
    <div class="monitor-header">
      <div class="header-title">实时监控</div>
      <div class="enable-ai-wrap">
        <a-checkbox v-model:checked="enableAi">启用 AI</a-checkbox>
      </div>
      <div class="header-time">{{ currentTime }}</div>
      <div class="header-location">{{ currentLocation }}</div>
      <!-- 分屏切换工具栏 -->
      <div class="split-toolbar">
        <div
          v-for="layout in splitLayouts"
          :key="layout.value"
          :class="['split-btn', { active: currentLayout === layout.value }]"
          :title="layout.label"
          @click="switchLayout(layout.value)"
        >
          {{ layout.label }}
        </div>
      </div>
    </div>

    <div class="monitor-content" :class="`layout-${currentLayout}`">
      <!-- 根据当前布局渲染视频窗口 -->
      <div
        v-for="(video, index) in displayVideos"
        :key="video.id || index"
        :class="['video-window', getVideoClass(index)]"
        :style="getVideoStyle(index)"
        @click="handleVideoClick(index)"
        @contextmenu.prevent="handleVideoRightClick(index, $event)"
      >
        <div class="video-container">
          <div v-if="!video.url" class="video-placeholder">
            <img src="@/assets/images/bigscreen/camera-icon.svg" alt="摄像头" class="camera-icon" />
            <div class="placeholder-text">{{ video.name || `视频${index + 1}` }}</div>
          </div>
          <Jessibuca
            v-else
            :playUrl="video.url"
            :hasAudio="false"
            :ref="el => setVideoRef(el, index)"
            class="video-player"
          />
          <div class="video-label">{{ video.name || `视频${index + 1}` }}</div>
          <div v-if="index === activeVideoIndex" class="video-active-indicator"></div>
        </div>
      </div>
    </div>
    
    <!-- 告警录像列表 -->
    <div class="alert-record-list">
      <div class="alert-record-header">
        <span class="header-title">告警录像</span>
        <span class="header-count">共 {{ alertRecordList.length }} 条</span>
      </div>
      <div class="alert-record-wrapper">
        <!-- 左滑动按钮 -->
        <div
          v-if="canScrollLeft"
          class="scroll-btn scroll-btn-left"
          @click="scrollLeft"
        >
          <Icon icon="ant-design:left-outlined" :size="20" />
        </div>
        <!-- 右滑动按钮 -->
        <div
          v-if="canScrollRight"
          class="scroll-btn scroll-btn-right"
          @click="scrollRight"
        >
          <Icon icon="ant-design:right-outlined" :size="20" />
        </div>
        <div
          ref="scrollContainerRef"
          class="alert-record-scroll"
          @scroll="handleScroll"
        >
          <div
            v-for="(record, index) in alertRecordList"
            :key="record.id || index"
            class="alert-record-item"
            @click="handleRecordClick(record)"
          >
            <div class="record-info">
              <div class="record-title">{{ record.event || record.title || '未知事件' }}</div>
              <div class="record-meta">
                <span class="record-device">{{ record.device_name || record.device_id || '未知设备' }}</span>
                <span class="record-time">{{ formatTime(record.time) }}</span>
                <Icon icon="ant-design:play-circle-outlined" :size="20" class="play-icon" />
              </div>
            </div>
          </div>
          <div v-if="alertRecordList.length === 0" class="empty-records">
            <Icon icon="ant-design:inbox-outlined" :size="32" />
            <span>暂无告警录像</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="boxfoot"></div>
    
    <!-- 视频播放器弹窗 -->
    <DialogPlayer @register="registerPlayerModal" />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Checkbox as ACheckbox } from 'ant-design-vue'
import { Icon } from '@/components/Icon'
import { queryAlarmList } from '@/api/device/calculate'
import { resolveAlertRecordVideoUrl } from '@/utils/alertRecord'
import { useMessage } from '@/hooks/web/useMessage'
import Jessibuca from '@/components/Player/module/jessibuca.vue'
import DialogPlayer from '@/components/VideoPlayer/DialogPlayer.vue'
import { useModal } from '@/components/Modal'
import { resolveAlertImageDisplayUrl } from '@/utils/alertMinioImage'
import { formatCameraDeviceLabel, isGb28181Device } from '@/views/camera/utils/deviceLabel'
import {
  AI_PLAY_FALLBACK_MS,
  pickDirectPlayUrls,
  resolveGbChannelPlayUrls,
} from '@/views/camera/utils/devicePlay'
import { parseGbChannelKey } from '@/views/camera/utils/gb28181Tree'
import type { MonitorTreeDeviceNode } from '@/api/device/camera'

defineOptions({
  name: 'VideoMonitor'
})

const props = defineProps<{
  device?: any
  videoList?: any[]
}>()

const emit = defineEmits<{
  'video-list-change': [videos: any[]]
}>()

const { createMessage } = useMessage()

// 播放器弹窗
const [registerPlayerModal, { openModal: openPlayerModal }] = useModal()

const currentTime = ref('')
const activeVideoIndex = ref(0)
const currentLayout = ref('1')
/** 勾选后点播 AI 流（检测框由算法任务烧录在此路流上） */
const enableAi = ref(true)
const videoRefs = ref<(InstanceType<typeof Jessibuca> | null)[]>([])
const alertRecordList = ref<any[]>([])
const loadingRecords = ref(false)
const scrollContainerRef = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const internalVideoList = ref<any[]>([])

// 防重复提示：记录最近提示的时间和内容
let lastVideoErrorTime = 0
let lastVideoErrorMsg = ''

// 获取录像播放地址（参考录像空间的处理方式）
const getVideoUrl = (videoUrl: string): string => {
  if (!videoUrl) return ''
  // 如果是完整URL，直接返回
  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
    return videoUrl
  }
  // 如果是相对路径（以/api/v1/buckets开头），添加前端启动地址前缀
  if (videoUrl.startsWith('/api/v1/buckets')) {
    return `${window.location.origin}${videoUrl}`
  }
  // 其他相对路径，拼接API前缀
  if (videoUrl.startsWith('/')) {
    return `${import.meta.env.VITE_GLOB_API_URL || ''}${videoUrl}`
  }
  // 其他情况直接返回
  return videoUrl
}

// 防重复提示函数：3秒内相同错误只提示一次
function showVideoErrorOnce(message: string) {
  const now = Date.now()
  // 如果3秒内提示过相同内容，则不再提示
  if (now - lastVideoErrorTime < 3000 && lastVideoErrorMsg === message) {
    return
  }
  lastVideoErrorTime = now
  lastVideoErrorMsg = message
  createMessage.warn(message)
}

// 分屏布局配置
const splitLayouts = [
  { value: '1', label: '1分屏' },
  { value: '4', label: '4分屏' },
  { value: '6', label: '6分屏' },
  { value: '8', label: '8分屏' },
  { value: '9', label: '9分屏' },
  { value: '16', label: '16分屏' }
]

// 设置视频引用
const setVideoRef = (el: any, index: number) => {
  if (el) {
    videoRefs.value[index] = el
  }
}

// 获取视频列表（填充到需要的数量）
const videoListWithPlaceholder = computed(() => {
  // 合并内部列表和props列表
  const baseList = props.videoList || []
  const maxCount = getMaxVideoCount(currentLayout.value)
  
  // 初始化内部列表（如果为空）
  if (internalVideoList.value.length === 0 && baseList.length > 0) {
    internalVideoList.value = baseList.map((v, i) => ({
      ...v,
      id: v.id || `video-${i}`,
      url: v.url || '',
      name: v.name || `视频${i + 1}`
    }))
  }
  
  // 确保内部列表长度足够
  while (internalVideoList.value.length < maxCount) {
    internalVideoList.value.push({
      id: `placeholder-${internalVideoList.value.length}`,
      url: '',
      name: `视频${internalVideoList.value.length + 1}`
    })
  }
  
  return internalVideoList.value.slice(0, maxCount)
})

// 获取当前布局需要的最大视频数量
const getMaxVideoCount = (layout: string) => {
  const count = parseInt(layout)
  return isNaN(count) ? 1 : count
}

// 显示的视频列表
const displayVideos = computed(() => {
  return videoListWithPlaceholder.value
})

// 获取正在播放的视频列表（有URL的视频）
const activeVideos = computed(() => {
  return internalVideoList.value.filter(video => video && video.url && video.url.trim() !== '')
})

// 获取当前应该显示的 location
const currentLocation = computed(() => {
  // 如果有正在播放的视频，优先使用第一个视频的 location
  if (activeVideos.value.length > 0) {
    const firstVideo = activeVideos.value[0]
    // 如果视频对象有 location，使用它
    if (firstVideo.location) {
      return firstVideo.location
    }
    // 如果视频对象没有 location，但 props.device 有，使用 props.device 的 location
    if (props.device?.location) {
      return props.device.location
    }
  }
  // 如果没有正在播放的视频，重置为初始状态
  return '未选择设备'
})

const aiFallbackTimers = new Map<number, number>()

function clearAiFallbackTimer(screenIdx: number) {
  const timerId = aiFallbackTimers.get(screenIdx)
  if (timerId != null) {
    window.clearTimeout(timerId)
    aiFallbackTimers.delete(screenIdx)
  }
}

// 切换布局
const switchLayout = (layout: string) => {
  currentLayout.value = layout
  activeVideoIndex.value = 0
}

// 获取视频窗口的类名
const getVideoClass = (index: number) => {
  const classes: string[] = []

  if (index === activeVideoIndex.value) {
    classes.push('active')
  }

  return classes.join(' ')
}

// 获取视频窗口的样式（用于特殊布局）
const getVideoStyle = (index: number) => {
  const layout = currentLayout.value

  // 6分屏：左上大屏（2x2）+ 5个小屏，网格：3行3列
  if (layout === '6') {
    if (index === 0) {
      // 左上大屏，占据2行2列
      return {
        gridColumn: '1 / 3',
        gridRow: '1 / 3'
      }
    } else {
      // 其他5个小屏：第1行第3列、第2行第3列、第3行第1、2、3列
      const pos = index - 1
      if (pos === 0) {
        // 第1行第3列
        return {
          gridColumn: '3',
          gridRow: '1'
        }
      } else if (pos === 1) {
        // 第2行第3列
        return {
          gridColumn: '3',
          gridRow: '2'
        }
      } else {
        // 第3行的3个位置
        return {
          gridColumn: `${pos - 1}`,
          gridRow: '3'
        }
      }
    }
  }

  // 8分屏：左侧大屏（2x2）+ 右侧3个小屏（一列）+ 下侧4个小屏，网格：3行4列
  if (layout === '8') {
    if (index === 0) {
      // 左侧大屏，占据第1-2行，第1-2列（2x2）
      return {
        gridColumn: '1 / 4',
        gridRow: '1 / 3'
      }
    } else if (index < 4) {
      // 右侧3个小屏：全部放在第4列，垂直排列
      const pos = index - 1
      if (pos === 0) {
        // 第1行第4列
        return {
          gridColumn: '4',
          gridRow: '1'
        }
      } else if (pos === 1) {
        // 第2行第4列
        return {
          gridColumn: '4',
          gridRow: '2'
        }
      } else {
        // 第3行第4列
        return {
          gridColumn: '4',
          gridRow: '3'
        }
      }
    } else {
      // 下侧4个小屏：第3行第1、2、3列，第4列已经被占用
      const pos = index - 4
      return {
        gridColumn: `${pos + 1}`,
        gridRow: '3'
      }
    }
  }

  return {}
}

// 处理视频点击
const handleVideoClick = (index: number) => {
  activeVideoIndex.value = index
  // 可以在这里添加全屏或其他操作
}

// 处理视频右键点击
const handleVideoRightClick = (index: number, event: MouseEvent) => {
  // 移除该位置的视频流
  if (internalVideoList.value[index]) {
    // 先清理视频元素
    if (videoRefs.value[index]) {
      const jessibucaInstance = videoRefs.value[index]
      try {
        // 检查实例是否存在且有效
        if (jessibucaInstance && typeof jessibucaInstance.destroy === 'function') {
          // 检查 jessibuca 实例是否存在
          if (jessibucaInstance.jessibuca) {
            jessibucaInstance.destroy()
          }
        }
      } catch (error) {
        console.warn('销毁播放器实例时出错:', error)
        // 即使销毁失败，也继续清理
      }
      // 清空引用
      videoRefs.value[index] = null
    }
    
    // 更新视频列表
    internalVideoList.value[index] = {
      id: `placeholder-${index}`,
      url: '',
      name: `视频${index + 1}`
    }
    
    createMessage.success('已移除视频流')
  }
}

// 查找空屏幕
const findEmptyScreen = (): number | null => {
  const maxCount = getMaxVideoCount(currentLayout.value)
  // 确保内部列表已初始化
  if (internalVideoList.value.length === 0) {
    return 0
  }
  
  for (let i = 0; i < maxCount; i++) {
    const video = internalVideoList.value[i]
    // 判断是否为空屏幕：没有视频对象，或者没有URL，或者URL为空字符串
    if (!video || !video.url || video.url.trim() === '') {
      return i
    }
  }
  return null
}

function resolveTargetScreenIndex(): number | null {
  if (currentLayout.value === '1') return 0
  return findEmptyScreen()
}

async function startPlayAtScreen(
  targetIndex: number,
  payload: {
    id: string
    name: string
    url: string
    deviceId?: string
    location?: string
    device?: MonitorTreeDeviceNode
    fallbackUrl?: string | null
    preferAi?: boolean
  },
) {
  clearAiFallbackTimer(targetIndex)
  if (videoRefs.value[targetIndex]) {
    const existingInstance = videoRefs.value[targetIndex]
    try {
      if (existingInstance?.destroy && existingInstance.jessibuca) {
        existingInstance.destroy()
      }
    } catch (error) {
      console.warn('销毁现有播放器实例失败:', error)
    }
    videoRefs.value[targetIndex] = null
  }

  internalVideoList.value[targetIndex] = {
    id: payload.id,
    url: payload.url,
    name: payload.name,
    deviceId: payload.deviceId,
    location: payload.location || '',
    device: payload.device,
  }

  await nextTick()

  const tryPlay = (retryCount = 0) => {
    const jessibucaInstance = videoRefs.value[targetIndex]
    if (jessibucaInstance?.play) {
      try {
        jessibucaInstance.play()
      } catch (error) {
        console.error('播放失败:', error)
        createMessage.error('播放失败，请重试')
      }
      return
    }
    if (retryCount < 15) {
      setTimeout(() => tryPlay(retryCount + 1), 150)
    } else {
      createMessage.error('播放器初始化失败，请重试')
    }
  }
  setTimeout(() => tryPlay(), 200)

  const fallbackUrl = payload.fallbackUrl?.trim()
  if (!payload.preferAi || !fallbackUrl || fallbackUrl === payload.url) return

  const primaryUrl = payload.url
  const timerId = window.setTimeout(async () => {
    aiFallbackTimers.delete(targetIndex)
    const slot = internalVideoList.value[targetIndex]
    if (!slot || slot.url !== primaryUrl) return
    if (videoRefs.value[targetIndex]?.playing) return

    createMessage.warning(
      'AI 流暂不可用（请确认算法任务已启动且 ZLM 已收到推流），已切换为原始画面（无检测框）',
    )
    internalVideoList.value[targetIndex] = { ...slot, url: fallbackUrl }
    await nextTick()
    videoRefs.value[targetIndex]?.play?.()
  }, AI_PLAY_FALLBACK_MS)
  aiFallbackTimers.set(targetIndex, timerId)
}

async function resolvePlayUrlsForDevice(dev: MonitorTreeDeviceNode) {
  if (isGb28181Device(dev.source, dev.device_kind)) {
    return { url: null as string | null, fallbackUrl: null as string | null | undefined }
  }
  return pickDirectPlayUrls(dev, enableAi.value)
}

async function reloadVideoAtIndex(index: number) {
  const slot = internalVideoList.value[index]
  if (!slot?.url || !slot.deviceId) return

  const playId = slot.deviceId
  if (playId.startsWith('gb_ch_')) {
    const gb = parseGbChannelKey(playId)
    if (!gb) return
    const deviceNode = (slot as any).device as MonitorTreeDeviceNode | undefined
    const { url, fallbackUrl, preferAi } = await resolveGbChannelPlayUrls(
      gb.sipDeviceId,
      gb.channelId,
      { enableAi: enableAi.value, synced: deviceNode },
    )
    if (url) {
      await startPlayAtScreen(index, {
        id: slot.id,
        name: slot.name,
        url,
        deviceId: playId,
        location: slot.location,
        fallbackUrl,
        preferAi,
      })
    }
    return
  }

  const dev = (slot as any).device as MonitorTreeDeviceNode | undefined
  if (!dev) return

  const { url, fallbackUrl, preferAi } = await resolvePlayUrlsForDevice(dev)
  if (!url) {
    createMessage.warn(enableAi.value ? '该设备暂无 AI 流或原始流地址' : '该设备暂无播放地址')
    return
  }
  await startPlayAtScreen(index, {
    id: slot.id,
    name: slot.name,
    url,
    deviceId: playId,
    location: slot.location,
    fallbackUrl,
    preferAi,
  })
}

async function reloadAllVideosForAiToggle() {
  const tasks: Promise<void>[] = []
  internalVideoList.value.forEach((slot, idx) => {
    if (slot?.url) tasks.push(reloadVideoAtIndex(idx))
  })
  await Promise.all(tasks)
}

watch(enableAi, () => {
  reloadAllVideosForAiToggle()
})

// 播放设备流（与分屏监控一致：启用 AI 时优先 AI 流，无则回退原始流）
const playDeviceStream = async (device: any) => {
  const dev: MonitorTreeDeviceNode = (device.device || device) as MonitorTreeDeviceNode
  const playId = String(device.id || dev.id || '')
  const displayName = device.name || formatCameraDeviceLabel(dev) || playId

  const maxCount = getMaxVideoCount(currentLayout.value)
  if (internalVideoList.value.length === 0) {
    for (let i = 0; i < maxCount; i++) {
      internalVideoList.value.push({
        id: `placeholder-${i}`,
        url: '',
        name: `视频${i + 1}`,
      })
    }
  }

  const targetIndex = resolveTargetScreenIndex()
  if (targetIndex === null) {
    createMessage.warning('当前没有空屏幕，请右键点击占用屏幕移除后再试')
    return
  }

  if (playId.startsWith('gb_ch_')) {
    const gb = parseGbChannelKey(playId)
    if (!gb) {
      createMessage.warning('无效国标通道')
      return
    }
    const { url, fallbackUrl, preferAi } = await resolveGbChannelPlayUrls(
      gb.sipDeviceId,
      gb.channelId,
      { enableAi: enableAi.value, synced: dev },
    )
    if (!url) {
      createMessage.warn(
        enableAi.value
          ? '国标通道 AI 流不可用，请确认算法任务已启动；WVP 点播也失败，请检查通道状态'
          : '国标通道拉流失败，请检查 WVP 服务与通道状态',
      )
      return
    }
    await startPlayAtScreen(targetIndex, {
      id: `video-${playId}-${targetIndex}`,
      name: displayName,
      url,
      deviceId: playId,
      location: device.location || '',
      device: dev,
      fallbackUrl,
      preferAi,
    })
    return
  }

  if (isGb28181Device(dev.source, dev.device_kind)) {
    createMessage.info('请展开上级国标设备并选择通道')
    return
  }

  const { url, fallbackUrl, preferAi } = await resolvePlayUrlsForDevice(dev)
  if (!url) {
    createMessage.warning(
      enableAi.value
        ? '该设备暂无 AI 流或原始流播放地址，请先在设备列表中配置'
        : '该设备暂无可用播放地址，请先在设备列表中配置流地址',
    )
    return
  }

  await startPlayAtScreen(targetIndex, {
    id: `video-${playId}-${targetIndex}`,
    name: displayName,
    url,
    deviceId: playId,
    location: device.location || '',
    device: dev,
    fallbackUrl,
    preferAi,
  })
}

// 暴露方法给父组件
defineExpose({
  playDeviceStream,
})

// 更新时间
const updateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 监听设备变化
watch(() => props.device, (newDevice) => {
  if (newDevice) {
    // 这里可以加载新设备的视频流
  }
}, { immediate: true })

// 监听视频列表变化
watch(() => props.videoList, (newList) => {
  if (newList && newList.length > 0) {
    // 如果内部列表为空，则初始化内部列表
    if (internalVideoList.value.length === 0) {
      internalVideoList.value = newList.map((v, i) => ({
        ...v,
        id: v.id || `video-${i}`,
        url: v.url || '',
        name: v.name || `视频${i + 1}`
      }))
    }
  }
}, { immediate: true })

// 监听布局变化，调整内部视频列表
watch(() => currentLayout.value, (newLayout) => {
  const maxCount = getMaxVideoCount(newLayout)
  // 如果当前列表长度超过新布局的最大数量，截断
  if (internalVideoList.value.length > maxCount) {
    internalVideoList.value = internalVideoList.value.slice(0, maxCount)
  }
})

// 监听正在播放的视频列表变化，通知父组件
watch(activeVideos, (newVideos) => {
  emit('video-list-change', newVideos.map(v => ({ name: v.name, id: v.id })))
}, { deep: true, immediate: true })

// 检查滚动状态
const checkScrollStatus = () => {
  if (!scrollContainerRef.value) return
  const container = scrollContainerRef.value
  canScrollLeft.value = container.scrollLeft > 0
  canScrollRight.value = container.scrollLeft < container.scrollWidth - container.clientWidth - 1
}

// 向左滑动
const scrollLeft = () => {
  if (!scrollContainerRef.value) return
  const container = scrollContainerRef.value
  const scrollAmount = 220 // 每次滑动一个卡片宽度 + gap
  container.scrollBy({
    left: -scrollAmount,
    behavior: 'smooth'
  })
}

// 向右滑动
const scrollRight = () => {
  if (!scrollContainerRef.value) return
  const container = scrollContainerRef.value
  const scrollAmount = 220 // 每次滑动一个卡片宽度 + gap
  container.scrollBy({
    left: scrollAmount,
    behavior: 'smooth'
  })
}

// 处理滚动事件
const handleScroll = () => {
  checkScrollStatus()
}

// 加载告警录像列表
const loadAlertRecords = async () => {
  try {
    loadingRecords.value = true
    const response = await queryAlarmList({
      pageNo: 1,
      pageSize: 20, // 显示最近20条
    })
    if (response && response.alert_list) {
      alertRecordList.value = response.alert_list.map((item: any) => {
        let imageUrl = resolveAlertImageDisplayUrl(item.image_url) || null
        
        // 如果没有level字段，根据event类型设置默认级别
        let level = item.level || '告警'
        if (!item.level) {
          // 可以根据event类型设置默认级别
          if (item.event && (item.event.includes('火') || item.event.includes('fire'))) {
            level = '一级'
          } else if (item.event && (item.event.includes('烟') || item.event.includes('smoke'))) {
            level = '二级'
          }
        }
        
        return {
          ...item,
          image: imageUrl,
          level: level
        }
      })
    }
  } catch (error) {
    console.error('加载告警录像列表失败', error)
    alertRecordList.value = []
  } finally {
    loadingRecords.value = false
  }
}

// 格式化时间
const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

// 处理录像点击
const handleRecordClick = async (record: any) => {
  if (!record.device_id || !record.time) {
    createMessage.warn('缺少必要信息：设备ID或告警时间')
    return
  }

  try {
    const videoUrl = await resolveAlertRecordVideoUrl({
      id: record.id,
      device_id: record.device_id,
      time: record.time,
      record_path: record.record_path,
    })
    if (videoUrl) {
      openPlayerModal(true, {
        id: record.device_id,
        http_stream: videoUrl,
      })
      lastVideoErrorTime = 0
      lastVideoErrorMsg = ''
    } else {
      showVideoErrorOnce('暂未找到该时间段的录像文件，请稍后再试')
    }
  } catch (error: any) {
    console.error('查询录像失败:', error)
    const errorData = error?.response?.data || error?.data
    showVideoErrorOnce(errorData?.message || error?.message || '查询录像失败，请稍后重试')
  }
}

let timeTimer: any = null
let recordTimer: any = null
let delayTimer: any = null
let scrollCheckTimer: any = null
let isMounted = false

onMounted(() => {
  isMounted = true
  
  updateTime()
  timeTimer = setInterval(updateTime, 1000)
  
  // 初始加载告警录像列表
  loadAlertRecords()
  
  // 错峰刷新：延迟2秒开始，每5秒刷新一次告警录像列表（2秒、7秒、12秒...）
  delayTimer = setTimeout(() => {
    // 检查组件是否仍然挂载
    if (!isMounted) return
    
    loadAlertRecords()
    
    // 再次检查组件是否仍然挂载
    if (!isMounted) return
    
    recordTimer = setInterval(() => {
      // 每次执行前检查组件是否仍然挂载
      if (!isMounted) {
        if (recordTimer) {
          clearInterval(recordTimer)
          recordTimer = null
        }
        return
      }
      
      loadAlertRecords()
    }, 5000)
  }, 2000)
  
  // 等待DOM渲染后检查滚动状态
  scrollCheckTimer = setTimeout(() => {
    if (isMounted) {
      checkScrollStatus()
    }
  }, 100)
  
  // 监听窗口大小变化
  window.addEventListener('resize', checkScrollStatus)
})

onUnmounted(() => {
  isMounted = false
  
  // 清理延迟定时器
  if (delayTimer) {
    clearTimeout(delayTimer)
    delayTimer = null
  }
  
  if (scrollCheckTimer) {
    clearTimeout(scrollCheckTimer)
    scrollCheckTimer = null
  }
  
  if (timeTimer) {
    clearInterval(timeTimer)
    timeTimer = null
  }
  
  if (recordTimer) {
    clearInterval(recordTimer)
    recordTimer = null
  }
  
  window.removeEventListener('resize', checkScrollStatus)

  aiFallbackTimers.forEach((id) => window.clearTimeout(id))
  aiFallbackTimers.clear()
  
  // 清理所有视频播放器实例
  videoRefs.value.forEach((ref) => {
    if (ref && ref.jessibuca) {
      ref.destroy()
    }
  })
  videoRefs.value = []
})

// 监听告警列表变化，更新滚动状态
watch(() => alertRecordList.value, () => {
  setTimeout(() => {
    checkScrollStatus()
  }, 100)
}, { deep: true })
</script>

<style lang="less" scoped>
.video-monitor {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, rgba(15, 34, 73, 0.8), rgba(24, 46, 90, 0.6));
  border: 1px solid rgba(52, 134, 218, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), inset 0 0 30px rgba(52, 134, 218, 0.1);
  border-radius: 8px;
  padding: 3px;
  position: relative;
  z-index: 10;
  min-height: 0;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      linear-gradient(90deg, transparent 0%, rgba(52, 134, 218, 0.05) 50%, transparent 100%),
      radial-gradient(circle at top left, rgba(52, 134, 218, 0.1), transparent 50%);
    pointer-events: none;
    border-radius: 8px;
  }
}

.monitor-header {
  flex-shrink: 0;
  height: 50px;
  min-height: 50px;
  background: rgba(52, 134, 218, 0.08);
  border-bottom: 1px solid rgba(52, 134, 218, 0.3);
  color: #fff;
  font-size: 14px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 1;

  .header-title {
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
  }

  .header-time {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
  }

  .header-location {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    flex: 1;
  }

  .enable-ai-wrap {
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 12px;
    background: rgba(52, 134, 218, 0.15);
    border: 1px solid rgba(52, 134, 218, 0.3);
    border-radius: 4px;
    flex-shrink: 0;

    :deep(.ant-checkbox-wrapper) {
      color: rgba(200, 220, 255, 0.95) !important;
      font-size: 14px;
      line-height: 1;
      white-space: nowrap;
    }

    :deep(.ant-checkbox-wrapper:hover .ant-checkbox-inner) {
      border-color: #3486da !important;
    }

    :deep(.ant-checkbox .ant-checkbox-inner) {
      width: 16px;
      height: 16px;
      background-color: rgba(15, 34, 73, 0.6) !important;
      border-color: rgba(52, 134, 218, 0.6) !important;
    }

    :deep(.ant-checkbox-checked .ant-checkbox-inner) {
      background-color: #3486da !important;
      border-color: #3486da !important;
    }

    :deep(.ant-checkbox-checked .ant-checkbox-inner::after) {
      border-color: #fff !important;
    }

    :deep(.ant-checkbox + span) {
      color: rgba(200, 220, 255, 0.95) !important;
      padding-inline-start: 8px;
    }
  }

  .split-toolbar {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-left: auto;

    .split-btn {
      min-width: 60px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(52, 134, 218, 0.15);
      border: 1px solid rgba(52, 134, 218, 0.3);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s;
      color: rgba(200, 220, 255, 0.9);
      font-size: 12px;
      padding: 0 8px;
      white-space: nowrap;

      &:hover {
        background: rgba(52, 134, 218, 0.25);
        border-color: rgba(52, 134, 218, 0.6);
        color: #ffffff;
        box-shadow: 0 0 8px rgba(52, 134, 218, 0.3);
      }

      &.active {
        background: linear-gradient(135deg, rgba(52, 134, 218, 0.3), rgba(48, 82, 174, 0.2));
        border-color: #3486da;
        color: #ffffff;
        box-shadow: 0 0 12px rgba(52, 134, 218, 0.5);
      }
    }
  }
}

.monitor-content {
  flex: 1;
  min-height: 0;
  display: grid;
  gap: 4px;
  padding: 4px;
  overflow: hidden;
  background:
    linear-gradient(rgba(52, 134, 218, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(52, 134, 218, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
  background-color: #000;

  // 1分屏 - 全屏单画面
  &.layout-1 {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }

  // 4分屏 - 2行2列
  &.layout-4 {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
  }

  // 6分屏 - 左上大屏（2x2）+ 5个小屏，网格：3行3列
  &.layout-6 {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
  }

  // 8分屏 - 左侧大屏（2x2）+ 右侧3个小屏（一列）+ 下侧4个小屏，网格：3行4列
  &.layout-8 {
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(3, 1fr);
  }

  // 9分屏 - 3行3列
  &.layout-9 {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
  }

  // 16分屏 - 4行4列
  &.layout-16 {
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
  }
}

.video-window {
  position: relative;
  background: #000;
  border: 2px solid rgba(52, 134, 218, 0.3);
  border-radius: 2px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: rgba(52, 134, 218, 0.6);
    transform: scale(1.01);
    z-index: 10;
  }

  &.active {
    border-color: #3486da;
    box-shadow: 0 0 10px rgba(52, 134, 218, 0.5);
    z-index: 5;
  }

  .video-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: #000;

    .video-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.4);

      .camera-icon {
        width: 72px;
        height: 72px;
        opacity: 0.7;
        filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 8px rgba(74, 144, 226, 0.2));
        transition: all 0.3s ease;
      }

      &:hover .camera-icon {
        opacity: 0.95;
        transform: scale(1.08);
        filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 12px rgba(74, 144, 226, 0.4));
      }

      .placeholder-text {
        margin-top: 8px;
        font-size: 12px;
      }
    }

    .video-player {
      width: 100%;
      height: 100%;
    }

    .video-label {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
      color: #ffffff;
      font-size: 12px;
      padding: 4px 8px;
      text-align: left;
      pointer-events: none;
    }

    .video-active-indicator {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 8px;
      height: 8px;
      background: #3486da;
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(52, 134, 218, 0.8);
    }
  }
}

.alert-record-list {
  flex-shrink: 0;
  height: 140px;
  min-height: 140px;
  background: linear-gradient(to bottom, rgba(48, 82, 174, 0.35), rgba(52, 134, 218, 0.25));
  border-top: 1px solid rgba(52, 134, 218, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.alert-record-header {
  height: 36px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(12, 40, 84, 0.8);
  border-bottom: 1px solid rgba(52, 134, 218, 0.2);

  .header-title {
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
  }

  .header-count {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }
}

.alert-record-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(52, 134, 218, 0.3);
  border: 1px solid rgba(52, 134, 218, 0.5);
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s;
  color: #ffffff;
  backdrop-filter: blur(4px);

  &:hover {
    background: rgba(52, 134, 218, 0.5);
    border-color: #3486da;
    transform: translateY(-50%) scale(1.1);
  }

  &:active {
    transform: translateY(-50%) scale(0.95);
  }
}

.scroll-btn-left {
  left: 8px;
}

.scroll-btn-right {
  right: 8px;
}

.alert-record-scroll {
  width: 100%;
  height: 100%;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  overflow-x: auto;
  overflow-y: hidden;
  align-items: center;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(52, 134, 218, 0.5);
    border-radius: 3px;

    &:hover {
      background: rgba(52, 134, 218, 0.7);
    }
  }
}

.alert-record-item {
  flex-shrink: 0;
  width: 200px;
  height: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(52, 134, 218, 0.3);
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #3486da;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(52, 134, 218, 0.3);
  }
}

.record-thumbnail {
  position: relative;
  width: 100%;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);

  .thumbnail-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumbnail-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.4);
  }

  .record-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
    background: rgba(52, 134, 218, 0.8);
    color: #ffffff;
    border: 1px solid #3486da;
  }
}

.record-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  width: 100%;
}

.record-title {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);

  .record-device {
    flex: 0 1 auto;
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .record-time {
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    margin-left: 8px;
    white-space: nowrap;
  }

  .play-icon {
    flex-shrink: 0;
    color: rgba(52, 134, 218, 0.9);
    margin-left: 8px;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      color: #3486da;
      transform: scale(1.1);
    }
  }
}

.empty-records {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

.boxfoot {
  position: absolute;
  bottom: 0;
  width: 100%;
  left: 0;

  &:before, &:after {
    position: absolute;
    width: 17px;
    height: 17px;
    content: "";
    border-bottom: 3px solid #3486da;
    bottom: -2px;
  }

  &:before {
    border-left: 3px solid #3486da;
    left: -2px;
  }

  &:after {
    border-right: 3px solid #3486da;
    right: -2px;
  }
}
</style>

<template>
  <!-- #ifdef H5 -->
  <view class="jessibuca-player relative overflow-hidden bg-black" :style="containerStyle">
    <view v-if="errorMessage" class="flex h-full items-center justify-center px-24rpx text-center text-26rpx text-[#faad14]">
      {{ errorMessage }}
    </view>
    <div
      v-show="!errorMessage"
      ref="containerRef"
      class="jessibuca-container h-full w-full"
    />
    <view v-if="loading && !errorMessage" class="absolute inset-0 flex items-center justify-center bg-black/40 text-26rpx text-white">
      {{ vodMode ? '录像加载中...' : '加载中...' }}
    </view>
  </view>
  <!-- #endif -->
  <!-- #ifndef H5 -->
  <view class="flex items-center justify-center bg-black text-26rpx text-[#999]" :style="containerStyle">
    当前平台暂不支持 SRS 流播放，请使用 H5 端
  </view>
  <!-- #endif -->
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { rewriteStreamHostToPageHost } from '@/utils/video/deviceStream'
import { buildVideoPlayHeaders, needsAuthForPlayUrl } from '@/utils/video/playAuth'
import { clearTicketForUrl, isProtectedStreamUrl, signStreamUrl } from '@/utils/video/streamTicket'

const props = withDefaults(defineProps<{
  playUrl?: string
  vodMode?: boolean
  height?: string
}>(), {
  playUrl: '',
  vodMode: false,
  height: '400rpx',
})

const emit = defineEmits<{
  streamError: [payload: { type: string, detail?: unknown }]
}>()

const containerRef = ref<HTMLElement | null>(null)
const errorMessage = ref('')
const loading = ref(false)
let jessibuca: any = null
let protectedRetries = 0
let setupSeq = 0
const maxProtectedRetries = 2

const containerStyle = computed(() => ({
  height: props.height,
  width: '100%',
}))

function getJessibucaClass() {
  return (window as any).Jessibuca
}

function clearContainer() {
  const container = containerRef.value
  if (container)
    container.innerHTML = ''
}

async function destroyPlayer() {
  if (jessibuca) {
    try {
      await jessibuca.destroy()
    }
    catch {
      // ignore
    }
    jessibuca = null
  }
  clearContainer()
  loading.value = false
  errorMessage.value = ''
}

function createPlayer() {
  const JessibucaClass = getJessibucaClass()
  const container = containerRef.value
  if (!JessibucaClass || !container)
    return false

  clearContainer()

  const pageHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const vod = props.vodMode === true

  jessibuca = new JessibucaClass({
    container,
    decoder: '/static/js/jessibuca/decoder.js',
    videoBuffer: vod ? 0.5 : 0.2,
    isResize: true,
    isFlv: vod,
    useWCS: pageHttps && !vod,
    useMSE: vod ? false : true,
    autoWasm: true,
    loadingText: vod ? '录像加载中...' : '加载中...',
    debug: false,
    supportDblclickFullscreen: true,
    showBandwidth: false,
    operateBtns: {
      fullscreen: false,
      screenshot: false,
      play: false,
      audio: false,
    },
    forceNoOffscreen: true,
    isNotMute: true,
    timeout: vod ? 60 : 10,
    loadingTimeout: vod ? 60 : 10,
    heartTimeout: vod ? 120 : 10,
    loadingTimeoutReplay: !vod,
    heartTimeoutReplay: !vod,
    wasmDecodeErrorReplay: true,
  })

  jessibuca.on('play', () => {
    loading.value = false
    errorMessage.value = ''
    protectedRetries = 0
  })

  jessibuca.on('start', () => {
    loading.value = false
    errorMessage.value = ''
  })

  jessibuca.on('videoInfo', () => {
    loading.value = false
    errorMessage.value = ''
  })

  jessibuca.on('loadingTimeout', () => {
    loading.value = false
    if (maybeRenewOnError())
      return
    errorMessage.value = '录像加载超时，请稍后重试'
    emit('streamError', { type: 'loadingTimeout' })
  })

  jessibuca.on('error', (error: unknown) => {
    loading.value = false
    if (maybeRenewOnError())
      return
    errorMessage.value = '视频加载失败，请检查流是否已启动'
    emit('streamError', { type: 'error', detail: error })
  })

  jessibuca.on('timeout', () => {
    loading.value = false
    if (maybeRenewOnError())
      return
    errorMessage.value = '视频加载超时，请稍后重试'
    emit('streamError', { type: 'timeout' })
  })

  return true
}

function maybeRenewOnError(): boolean {
  if (!props.playUrl || !isProtectedStreamUrl(props.playUrl))
    return false
  if (protectedRetries >= maxProtectedRetries)
    return false
  protectedRetries++
  clearTicketForUrl(props.playUrl)
  void startPlay(true)
  return true
}

async function waitForContainer(maxRetry = 20): Promise<boolean> {
  for (let i = 0; i < maxRetry; i++) {
    await nextTick()
    if (containerRef.value)
      return true
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  return !!containerRef.value
}

async function startPlay(forceRefresh = false, seq = setupSeq) {
  const force = forceRefresh === true
  const url = props.playUrl?.trim()
  if (!url || seq !== setupSeq)
    return

  if (!jessibuca) {
    const ready = await waitForContainer()
    if (!ready || seq !== setupSeq)
      return
    if (!createPlayer() || seq !== setupSeq)
      return
  }

  loading.value = true
  errorMessage.value = ''

  const originalPlayUrl = url
  let target = rewriteStreamHostToPageHost(originalPlayUrl)

  if (isProtectedStreamUrl(target)) {
    try {
      target = await signStreamUrl(target, { forceRefresh: force })
    }
    catch {
      target = rewriteStreamHostToPageHost(originalPlayUrl)
    }
    if (seq !== setupSeq || props.playUrl?.trim() !== originalPlayUrl || !jessibuca) {
      loading.value = false
      return
    }
  }

  if (seq !== setupSeq || !jessibuca)
    return

  try {
    const playOptions = needsAuthForPlayUrl(target) ? { headers: buildVideoPlayHeaders() } : undefined
    jessibuca.play(target, playOptions)
  }
  catch {
    loading.value = false
    errorMessage.value = '播放器启动失败'
  }
}

async function setupPlayer(url: string) {
  const seq = ++setupSeq
  protectedRetries = 0

  if (!url) {
    await destroyPlayer()
    return
  }

  await destroyPlayer()
  if (seq !== setupSeq)
    return

  await startPlay(false, seq)
}

watch(
  () => props.playUrl,
  (url) => {
    // #ifdef H5
    void setupPlayer(url?.trim() || '')
    // #endif
  },
  { immediate: true },
)

watch(
  () => props.vodMode,
  () => {
    // #ifdef H5
    if (props.playUrl?.trim())
      void setupPlayer(props.playUrl.trim())
    // #endif
  },
)

onBeforeUnmount(() => {
  setupSeq++
  void destroyPlayer()
})

defineExpose({ play: () => startPlay(), destroy: destroyPlayer })
</script>

<style scoped>
.jessibuca-container :deep(video) {
  max-height: 100%;
  object-fit: contain;
}
</style>

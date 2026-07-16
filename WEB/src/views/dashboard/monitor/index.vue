<template>
  <div
    class="monitor-dashboard"
    :class="{ 'monitor-dashboard--embedded': dashboardOverlayReleased }"
    data-testid="monitor-dashboard"
  >
    <!-- 顶部头部 -->
    <MonitorHeader
      :active-videos="activeVideos"
      :today-alarm-count="todayAlarmCount"
      :dashboard-health="dashboardHealth"
      :last-updated-text="lastUpdatedText"
      @admin-entry="releaseDashboardOverlay"
    />

    <section class="command-center-metrics" data-testid="command-center-metrics">
      <article
        v-for="metric in commandMetrics"
        :key="metric.key"
        class="command-metric"
        :class="{ 'command-metric--alert': metric.key === 'alerts' }"
      >
        <span class="command-metric__label">{{ metric.label }}</span>
        <span class="command-metric__reading">
          <strong>{{ metric.value }}</strong>
          <small>{{ metric.unit }}</small>
        </span>
      </article>
    </section>

    <main class="command-center-grid">
      <MonitorSidebar
        class="command-center-devices"
        :selected-device="selectedDevice"
        @device-change="handleDeviceChange"
        @device-play="handleDevicePlay"
      />

      <VideoMonitor
        ref="videoMonitorRef"
        class="command-center-video"
        :device="selectedDevice"
        :video-list="videoList"
        :alert-record-list="alarmList"
        @video-list-change="handleVideoListChange"
      />

      <AlarmPanel
        class="command-center-alerts"
        :alarm-list="alarmList"
        :today-alarm-count="todayAlarmCount"
        :dashboard-health="dashboardHealth"
        :refreshing="refreshing"
        @play-alarm="handlePlayAlarm"
        @retry="refreshDashboardData"
      />
    </main>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import MonitorHeader from './components/Header.vue'
import MonitorSidebar from './components/Sidebar.vue'
import VideoMonitor from './components/VideoMonitor.vue'
import AlarmPanel from './components/AlarmPanel.vue'
import { useDashboardData } from './useDashboardData'

defineOptions({
  name: 'MonitorDashboard'
})

const videoMonitorRef = ref<InstanceType<typeof VideoMonitor> | null>(null)
const dashboardOverlayReleased = ref(false)

// 选中的设备；国标树节点的 gb_ch_* 仅用于播放，接口授权必须使用同步后的真实设备 ID。
const selectedDevice = ref<any>(null)
const activeDeviceId = computed(() => {
  const candidate = selectedDevice.value?.device?.id ?? selectedDevice.value?.id
  const deviceId = String(candidate ?? '').trim()
  return !deviceId || deviceId.startsWith('gb_ch_') ? '' : deviceId
})

const {
  alarmList,
  dashboardHealth,
  lastUpdatedText,
  refreshDashboardData,
  refreshing,
  statistics,
  todayAlarmCount,
} = useDashboardData(activeDeviceId)

function releaseDashboardOverlay() {
  dashboardOverlayReleased.value = true
  const style = document.getElementById('monitor-dashboard-style')
  if (style) {
    document.head.removeChild(style)
  }
}

defineExpose({ releaseDashboardOverlay })

// 视频列表
const videoList = ref([
  { id: '1', url: '', name: '主视频' },
  { id: '2', url: '', name: '视频1' },
  { id: '3', url: '', name: '视频2' },
  { id: '4', url: '', name: '视频3' },
  { id: '5', url: '', name: '视频4' },
  { id: '6', url: '', name: '视频5' },
  { id: '7', url: '', name: '视频6' }
])

// 正在播放的视频列表
const activeVideos = ref<any[]>([])

const commandMetrics = computed(() => {
  const hasDeviceScope = !!activeDeviceId.value
  return [
    {
      key: 'devices',
      label: '在线设备',
      value: hasDeviceScope ? statistics.value.cameraCount : '—',
      unit: '路',
    },
    {
      key: 'playing',
      label: '播放中',
      value: activeVideos.value.length,
      unit: '路',
    },
    {
      key: 'models',
      label: 'AI 模型',
      value: hasDeviceScope ? statistics.value.modelCount : '—',
      unit: '个',
    },
    {
      key: 'alerts',
      label: '今日告警',
      value: hasDeviceScope ? todayAlarmCount.value : '—',
      unit: '次',
    },
  ]
})

/** 大屏层 z-index 为 9999，需抬高挂载在 body 上的弹层，否则确认框/提示会被挡住 */
const MONITOR_OVERLAY_Z_INDEX = 10050

// 动态添加样式，隐藏顶部导航栏、标签页和左侧菜单，让大屏覆盖整个屏幕
onMounted(() => {
  if (!document.getElementById('monitor-dashboard-style')) {
    const style = document.createElement('style')
    style.id = 'monitor-dashboard-style'
    style.textContent = `
      .ant-layout-header,
      .layout-multiple-header,
      .layout-tabs,
      .layout-footer,
      [class*="layout-header"],
      [class*="layout-multiple-header"],
      [class*="multiple-tabs"],
      [class*="layout-footer"] {
        display: none !important;
      }
      .ant-layout-sider,
      .layout-sider-wrapper,
      [class*="layout-sider"] {
        display: none !important;
      }
      .ant-layout-content,
      .layout-content {
        padding: 0 !important;
        margin: 0 !important;
        height: 100vh !important;
        overflow: hidden !important;
      }
      .ant-layout-main {
        height: 100vh !important;
        overflow: hidden !important;
        margin-left: 0 !important;
      }
      .ant-modal-root,
      .ant-modal-wrap,
      .ant-modal-mask,
      .ant-message,
      .ant-notification {
        z-index: ${MONITOR_OVERLAY_Z_INDEX} !important;
      }
    `
    document.head.appendChild(style)
  }
})

onUnmounted(() => {
  const style = document.getElementById('monitor-dashboard-style')
  if (style) {
    document.head.removeChild(style)
  }
})

// 设备切换
const handleDeviceChange = (device: any) => {
  selectedDevice.value = device
  // 这里可以加载新设备的视频流
}

// 设备播放
const handleDevicePlay = (device: any) => {
  if (videoMonitorRef.value) {
    videoMonitorRef.value.playDeviceStream(device)
  }
}

// 告警事件点击播放录像
const handlePlayAlarm = (alarm: any) => {
  if (videoMonitorRef.value) {
    videoMonitorRef.value.playAlertRecord(alarm)
  }
}

// 处理视频列表变化
const handleVideoListChange = (videos: any[]) => {
  activeVideos.value = videos
}

</script>

<style lang="less">
.monitor-dashboard {
  --dashboard-bg: #070b11;
  --dashboard-bg-soft: #0b111a;
  --dashboard-panel: rgba(13, 20, 30, 0.96);
  --dashboard-panel-strong: rgba(16, 25, 37, 0.98);
  --dashboard-border: rgba(199, 169, 102, 0.2);
  --dashboard-border-strong: rgba(199, 169, 102, 0.46);
  --dashboard-accent: #c7a966;
  --dashboard-blue: #c7a966;
  --dashboard-green: #22c55e;
  --dashboard-danger: #f97373;
  --dashboard-text: #e6f1ff;
  --dashboard-muted: rgba(184, 203, 224, 0.68);
  --dashboard-radius: 6px;

  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  max-height: 100vh;
  background: var(--dashboard-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--dashboard-text);
  font-size: 14px;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -2;
    background:
      linear-gradient(rgba(199, 169, 102, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(199, 169, 102, 0.03) 1px, transparent 1px);
    background-size: 48px 48px;
  }

  a {
    text-decoration: none;
    color: var(--dashboard-blue);
  }
}

.monitor-dashboard--embedded {
  pointer-events: none;
  opacity: 0;
}

.command-center-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 12px 18px 10px;
}

.command-metric {
  min-height: 64px;
  padding: 11px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: var(--dashboard-panel);
  border: 1px solid var(--dashboard-border);
  border-radius: var(--dashboard-radius);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
}

.command-metric__label {
  color: var(--dashboard-muted);
  font-size: 12px;
  letter-spacing: 0.08em;
}

.command-metric__reading {
  display: flex;
  align-items: baseline;
  gap: 5px;

  strong {
    color: var(--dashboard-text);
    font-size: 25px;
    line-height: 1;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }

  small {
    color: var(--dashboard-muted);
    font-size: 11px;
  }
}

.command-metric--alert .command-metric__reading strong {
  color: var(--dashboard-accent);
}

.command-center-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr) minmax(280px, 340px);
  gap: 12px;
  padding: 0 18px 18px;
  overflow: hidden;
  box-sizing: border-box;
}

.command-center-devices,
.command-center-video,
.command-center-alerts {
  min-width: 0;
  min-height: 0;
}

@media (max-width: 1366px) {
  .command-center-grid {
    grid-template-columns: minmax(220px, 260px) minmax(0, 1fr) minmax(260px, 300px);
  }
}

@media (max-width: 1100px) {
  .monitor-dashboard {
    overflow-y: auto;
  }

  .command-center-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .command-center-grid {
    flex: none;
    grid-template-columns: 1fr;
    grid-template-rows: minmax(560px, 70vh) minmax(360px, 48vh) minmax(360px, 48vh);
    overflow: visible;
  }
}
</style>

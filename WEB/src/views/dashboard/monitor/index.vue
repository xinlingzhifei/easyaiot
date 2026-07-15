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
    
    <!-- 主体内容 -->
    <div class="monitor-content">
      <!-- 左侧导航 -->
      <MonitorSidebar 
        :selected-device="selectedDevice"
        :statistics="statistics"
        @device-change="handleDeviceChange"
        @device-play="handleDevicePlay"
      />
      
      <!-- 中央视频监控区域 -->
      <div class="monitor-center">
        <VideoMonitor 
          ref="videoMonitorRef"
          :device="selectedDevice"
          :video-list="videoList"
          :alert-record-list="alarmList"
          @video-list-change="handleVideoListChange"
        />
      </div>
      
      <!-- 右侧告警信息 -->
      <AlarmPanel 
        :alarm-list="alarmList"
        :today-alarm-count="todayAlarmCount"
        @play-alarm="handlePlayAlarm"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
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
const {
  alarmList,
  dashboardHealth,
  lastUpdatedText,
  statistics,
  todayAlarmCount,
} = useDashboardData()

function releaseDashboardOverlay() {
  dashboardOverlayReleased.value = true
  const style = document.getElementById('monitor-dashboard-style')
  if (style) {
    document.head.removeChild(style)
  }
}

defineExpose({ releaseDashboardOverlay })

// 选中的设备
const selectedDevice = ref<any>({
  id: '1',
  name: '',
  location: ''
})

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
  --dashboard-bg: #07111f;
  --dashboard-bg-soft: #0c1b2d;
  --dashboard-panel: rgba(9, 25, 45, 0.86);
  --dashboard-panel-strong: rgba(11, 30, 53, 0.94);
  --dashboard-border: rgba(95, 174, 229, 0.24);
  --dashboard-border-strong: rgba(116, 197, 242, 0.45);
  --dashboard-accent: #f59e0b;
  --dashboard-blue: #38bdf8;
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
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 30rem),
    radial-gradient(circle at 86% 6%, rgba(245, 158, 11, 0.13), transparent 24rem),
    linear-gradient(180deg, var(--dashboard-bg) 0%, var(--dashboard-bg-soft) 48%, #050d18 100%);
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
      linear-gradient(rgba(95, 174, 229, 0.055) 1px, transparent 1px),
      linear-gradient(90deg, rgba(95, 174, 229, 0.045) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.35));
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      linear-gradient(90deg, rgba(0, 0, 0, 0.42), transparent 24%, transparent 76%, rgba(0, 0, 0, 0.38)),
      radial-gradient(circle at center, transparent 42%, rgba(0, 0, 0, 0.36));
    pointer-events: none;
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

.monitor-content {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
  padding: 0 18px 18px;
  gap: 14px;
  box-sizing: border-box;
  margin-top: 10px;
}

.monitor-center {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>

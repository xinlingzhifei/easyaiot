<template>
  <div class="monitor-header">
    <div class="header-left">
      <div class="brand-mark">yF</div>
      <div class="brand-copy">
        <div class="title-row">
          <h1 class="platform-title" data-testid="monitor-platform-title">{{ dashboardTitle }}</h1>
          <PlatformBrandingFab />
        </div>
        <div class="platform-subtitle">实时监控运维中心</div>
      </div>
    </div>

    <div class="header-center">
      <div class="status-metric">
        <span class="metric-label">播放中</span>
        <strong class="metric-value">{{ activeVideoCount }}</strong>
        <span class="metric-unit">路</span>
      </div>
      <div class="status-metric status-metric--warning">
        <span class="metric-label">今日告警</span>
        <strong class="metric-value">{{ safeTodayAlarmCount }}</strong>
        <span class="metric-unit">次</span>
      </div>
      <div
        :class="['status-metric', 'status-metric--health', `status-metric--${safeDashboardHealth.status}`]"
        :title="safeDashboardHealth.detail"
      >
        <span class="metric-label">系统状态</span>
        <strong class="metric-value">{{ safeDashboardHealth.label }}</strong>
      </div>
    </div>

    <div class="header-right">
      <div class="refresh-info" :title="safeDashboardHealth.detail">
        更新 {{ safeLastUpdatedText }}
      </div>
      <div class="date-time">
        {{ currentDate }} {{ currentDay }}
      </div>
      <div class="user-info">
        <button
          type="button"
          class="user-role"
          data-testid="monitor-admin-entry"
          :aria-label="adminEntryLabel"
          @click="handleGoToAdmin"
        >
          {{ adminEntryLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { resolveAdminEntryTarget } from '../adminEntry'
import { usePlatformBranding } from '@/hooks/web/usePlatformBranding'
import PlatformBrandingFab from './PlatformBrandingFab.vue'
import type { DashboardHealth } from '../useDashboardData'

defineOptions({
  name: 'MonitorHeader'
})

defineProps<{
  activeVideos?: any[]
  todayAlarmCount?: number
  dashboardHealth?: DashboardHealth
  lastUpdatedText?: string
}>()

const emit = defineEmits<{
  (e: 'admin-entry'): void
}>()

const router = useRouter()
const adminEntryLabel = '管理后台'
const { config } = usePlatformBranding()
const dashboardTitle = computed(() => config.value.dashboardTitle)
const activeVideoCount = computed(() => props.activeVideos?.length ?? 0)
const safeTodayAlarmCount = computed(() => props.todayAlarmCount ?? 0)
const safeDashboardHealth = computed<DashboardHealth>(() => props.dashboardHealth ?? {
  status: 'loading',
  label: '检查中',
  detail: '等待接口刷新',
  lastUpdatedAt: null,
})
const safeLastUpdatedText = computed(() => props.lastUpdatedText || '--')

const handleGoToAdmin = () => {
  emit('admin-entry')
  router.push(resolveAdminEntryTarget(router))
}

const currentDate = ref('')
const currentDay = ref('')

const updateDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  currentDate.value = `${year}年${month}月${day}日`
  
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentDay.value = weekDays[now.getDay()]
}

let timer: any = null

onMounted(() => {
  updateDateTime()
  timer = setInterval(updateDateTime, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style lang="less" scoped>
.monitor-header {
  height: 78px;
  background:
    linear-gradient(180deg, rgba(10, 28, 50, 0.96), rgba(7, 17, 31, 0.88)),
    var(--dashboard-panel);
  border-bottom: 1px solid var(--dashboard-border);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.28), inset 0 -1px 0 rgba(255, 255, 255, 0.04);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  padding: 0 26px;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(56, 189, 248, 0.12), transparent 28%, transparent 72%, rgba(245, 158, 11, 0.08)),
      linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.04), transparent);
    pointer-events: none;
  }
}

.header-left {
  flex: 1;
  min-width: 300px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-mark {
  width: 38px;
  height: 38px;
  border-radius: var(--dashboard-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #07111f;
  background: linear-gradient(135deg, #fbbf24, var(--dashboard-accent));
  font-size: 15px;
  font-weight: 800;
  box-shadow: 0 0 22px rgba(245, 158, 11, 0.28);
  position: relative;
  z-index: 1;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  z-index: 1;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  position: relative;
  z-index: 1;
}

.platform-title {
  color: var(--dashboard-text);
  text-align: left;
  font-size: 32px;
  line-height: 1.2;
  letter-spacing: 0;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 0 18px rgba(56, 189, 248, 0.22);

  a {
    color: #fff;
  }
}

.platform-subtitle {
  color: var(--dashboard-muted);
  font-size: 12px;
  line-height: 1;
}

.header-center {
  flex: 1.2;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.status-metric {
  min-width: 112px;
  height: 42px;
  padding: 0 12px;
  border: 1px solid var(--dashboard-border);
  border-radius: var(--dashboard-radius);
  background: rgba(8, 22, 39, 0.74);
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);

  .metric-label,
  .metric-unit {
    color: var(--dashboard-muted);
    font-size: 12px;
    white-space: nowrap;
  }

  .metric-value {
    color: var(--dashboard-blue);
    font-size: 18px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
}

.status-metric--warning .metric-value {
  color: var(--dashboard-accent);
}

.status-metric--online .metric-value {
  color: var(--dashboard-green);
}

.status-metric--degraded .metric-value {
  color: var(--dashboard-accent);
}

.status-metric--offline .metric-value {
  color: var(--dashboard-danger);
}

.status-metric--loading .metric-value {
  color: var(--dashboard-muted);
}

.status-metric--health {
  min-width: 126px;
}

.header-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 14px;
  min-width: 300px;
  position: relative;
  z-index: 1;
}

.refresh-info {
  max-width: 128px;
  font-size: 12px;
  color: var(--dashboard-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-time {
  font-size: 14px;
  color: var(--dashboard-muted);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-role {
  appearance: none;
  font-family: inherit;
  font-size: 14px;
  color: var(--dashboard-text);
  padding: 8px 16px;
  background: rgba(56, 189, 248, 0.12);
  border-radius: var(--dashboard-radius);
  border: 1px solid var(--dashboard-border-strong);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
  position: relative;
  z-index: 1;

  &:hover {
    background: rgba(56, 189, 248, 0.2);
    border-color: rgba(125, 211, 252, 0.68);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

@media (max-width: 1366px) {
  .monitor-header {
    height: 72px;
    gap: 12px;
    padding: 0 16px;
  }

  .header-left {
    min-width: 246px;
    gap: 10px;
  }

  .brand-mark {
    width: 34px;
    height: 34px;
  }

  .platform-title {
    font-size: 26px;
  }

  .platform-subtitle {
    display: none;
  }

  .header-center {
    flex: 1 1 auto;
    gap: 6px;
  }

  .status-metric {
    min-width: 92px;
    height: 38px;
    padding: 0 8px;
    gap: 4px;

    .metric-label,
    .metric-unit {
      font-size: 11px;
    }

    .metric-value {
      font-size: 16px;
    }
  }

  .status-metric--health {
    min-width: 104px;
  }

  .header-right {
    min-width: 220px;
    gap: 8px;
  }

  .refresh-info {
    max-width: 96px;
  }

  .date-time {
    display: none;
  }

  .user-role {
    padding: 7px 12px;
    font-size: 13px;
  }
}
</style>

<template>
  <div class="monitor-header">
    <div class="header-left">
      <div class="date-time">
        {{ currentDate }} {{ currentDay }}
      </div>
    </div>
    
    <div class="header-center">
      <h1 class="platform-title">逸飞 AI 智眼管控平台</h1>
    </div>
    
    <div class="header-right">
      <div class="user-info">
        <span class="user-role" @click="handleGoToAdmin">管理后台</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

defineOptions({
  name: 'MonitorHeader'
})

const props = defineProps<{
  activeVideos?: any[]
}>()

const router = useRouter()

const handleGoToAdmin = () => {
  router.push('/camera/index')
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
  height: clamp(64px, 7.2vh, 78px);
  background: linear-gradient(135deg, rgba(15, 34, 73, 0.8), rgba(24, 46, 90, 0.6));
  border-bottom: 1px solid rgba(52, 134, 218, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), inset 0 0 30px rgba(52, 134, 218, 0.1);
  position: relative;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(360px, 1.4fr) minmax(150px, 1fr);
  align-items: center;
  column-gap: clamp(12px, 1.2vw, 24px);
  padding: 0 clamp(16px, 1.6vw, 30px);
  box-sizing: border-box;
  
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
  }
}

.header-left {
  min-width: 0;
  display: flex;
  align-items: center;
}

.date-time {
  font-size: clamp(14px, 0.9vw, 16px);
  color: rgba(200, 220, 255, 0.95);
  font-weight: 500;
  text-shadow: 0 0 8px rgba(52, 134, 218, 0.5);
  position: relative;
  z-index: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-center {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.platform-title {
  color: #ffffff;
  text-align: center;
  font-size: clamp(24px, 2.1vw, 40px);
  line-height: 1.2;
  letter-spacing: 0;
  font-weight: bold;
  margin: 0;
  max-width: 100%;
  overflow: hidden;
  text-shadow: 0 0 8px rgba(52, 134, 218, 0.5);
  text-overflow: ellipsis;
  white-space: nowrap;
  position: relative;
  z-index: 1;

  a {
    color: #fff;
  }
}

.header-right {
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.user-info {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-role {
  font-size: clamp(14px, 0.9vw, 16px);
  color: rgba(200, 220, 255, 0.95);
  padding: 6px 16px;
  background: rgba(52, 134, 218, 0.15);
  border-radius: 4px;
  border: 1px solid rgba(52, 134, 218, 0.3);
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  z-index: 1;
  white-space: nowrap;
  
  &:hover {
    background: rgba(52, 134, 218, 0.25);
    border-color: rgba(52, 134, 218, 0.6);
    color: #ffffff;
    box-shadow: 0 0 12px rgba(52, 134, 218, 0.3);
  }
}

@media (max-width: 1100px) {
  .monitor-header {
    height: auto;
    min-height: 68px;
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: 6px;
    padding: 8px 16px;
  }

  .header-center {
    order: 3;
    grid-column: 1 / -1;
  }

  .header-right {
    justify-content: flex-end;
  }
}

@media (max-width: 640px) {
  .monitor-header {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
  }

  .header-left,
  .header-right {
    justify-content: center;
  }

  .header-center {
    grid-column: auto;
  }
}
</style>

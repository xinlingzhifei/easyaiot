/** GPUStack 控制台地址与默认登录信息（与 .scripts/docker 部署配置一致，可通过环境变量覆盖） */

const trimEnv = (value: string | undefined) => (value ?? '').trim()

/** 当前会话内是否已关闭提示（内存态：路由切换仍生效，F5 强刷后重置） */
let gpustackMonitorTipDismissed = false

/** 用户是否已关闭算力监控提示条（摄像头/模型管理共用，仅当前页面会话） */
export function isGpuStackMonitorTipDismissed(): boolean {
  return gpustackMonitorTipDismissed
}

export function setGpuStackMonitorTipDismissed(): void {
  gpustackMonitorTipDismissed = true
}

export function getGpuStackConsoleUrl(): string {
  const configured = trimEnv(import.meta.env.VITE_GPUSTACK_URL)
  if (configured) {
    return configured.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location
    return `${protocol}//${hostname}:10180`
  }
  return 'http://localhost:10180'
}

export const GPUSTACK_DEFAULT_USERNAME =
  trimEnv(import.meta.env.VITE_GPUSTACK_USERNAME) || 'admin'

export const GPUSTACK_DEFAULT_PASSWORD =
  trimEnv(import.meta.env.VITE_GPUSTACK_PASSWORD) || 'basiclab@iotp4JWmQSvzdh0z4mF'

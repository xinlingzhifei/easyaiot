import defaultLogo from '@/assets/images/logo.png'
import legacyDefaultDarkBg from '@/assets/images/dark-bg.png'
import legacyDefaultLightBg from '@/assets/images/light-bg.png'
import defaultLoginBg from '@/assets/svg/login-yfeiEye.svg'
import { resolveLoginBrandingValues } from '@/utils/loginBrandingDefaults'
import { clearLocalStorage, getLocalStorage, setLocalStorage } from '@/utils/storage'

export const PLATFORM_BRANDING_STORAGE_KEY = 'PLATFORM_BRANDING_CONFIG'
export const PLATFORM_BRANDING_FAB_HIDDEN_KEY = 'PLATFORM_BRANDING_FAB_HIDDEN'
export const DEFAULT_LOGIN_NAME = '逸飞 AI 智眼管控平台'
const LEGACY_DEFAULT_LOGIN_NAME = '逸飞AI智眼系统'

export interface PlatformBrandingConfig {
  /** 管理后台平台名称（侧边栏、浏览器标题等） */
  platformName: string
  /** 管理后台平台 Logo */
  platformLogo: string
  /** 大屏顶部标题 */
  dashboardTitle: string
  /** 登录页左侧名称 */
  loginName: string
  /** 登录页 Logo */
  loginLogo: string
  /** 登录表单标题，留空则使用 i18n 默认文案 */
  loginFormTitle: string
  /** 登录页浅色背景 */
  loginBgLight: string
  /** 登录页深色背景 */
  loginBgDark: string
}

export function getDefaultPlatformBranding(): PlatformBrandingConfig {
  const envTitle = import.meta.env.VITE_GLOB_APP_TITLE || '云边端一体化智能算法应用平台'
  return {
    platformName: envTitle,
    platformLogo: defaultLogo,
    dashboardTitle: '云边端一体算法预警监控平台',
    loginName: DEFAULT_LOGIN_NAME,
    loginLogo: defaultLogo,
    loginFormTitle: '',
    loginBgLight: defaultLoginBg,
    loginBgDark: defaultLoginBg,
  }
}

export function loadPlatformBrandingConfig(): PlatformBrandingConfig {
  const defaults = getDefaultPlatformBranding()
  const raw = getLocalStorage(PLATFORM_BRANDING_STORAGE_KEY)
  if (!raw || typeof raw !== 'object') {
    return { ...defaults }
  }
  const data = raw as Partial<PlatformBrandingConfig>
  const loginBranding = resolveLoginBrandingValues(data, {
    current: {
      loginName: defaults.loginName,
      loginBgLight: defaults.loginBgLight,
      loginBgDark: defaults.loginBgDark,
    },
    legacy: {
      loginName: LEGACY_DEFAULT_LOGIN_NAME,
      loginBgLight: legacyDefaultLightBg,
      loginBgDark: legacyDefaultDarkBg,
    },
  })
  return {
    platformName: pickString(data.platformName, defaults.platformName),
    platformLogo: pickString(data.platformLogo, defaults.platformLogo),
    dashboardTitle: pickString(data.dashboardTitle, defaults.dashboardTitle),
    loginName: loginBranding.loginName,
    loginLogo: pickString(data.loginLogo, defaults.loginLogo),
    loginFormTitle: pickString(data.loginFormTitle, defaults.loginFormTitle),
    loginBgLight: loginBranding.loginBgLight,
    loginBgDark: loginBranding.loginBgDark,
  }
}

export function savePlatformBrandingConfig(config: PlatformBrandingConfig): void {
  setLocalStorage(PLATFORM_BRANDING_STORAGE_KEY, config)
}

export function clearPlatformBrandingConfig(): void {
  clearLocalStorage(PLATFORM_BRANDING_STORAGE_KEY)
}

export function loadFabHiddenState(): boolean {
  return getLocalStorage(PLATFORM_BRANDING_FAB_HIDDEN_KEY) === true
}

export function saveFabHiddenState(hidden: boolean): void {
  setLocalStorage(PLATFORM_BRANDING_FAB_HIDDEN_KEY, hidden)
}

function pickString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

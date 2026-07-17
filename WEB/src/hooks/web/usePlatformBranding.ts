import { reactive, toRefs } from 'vue'
import {
  clearPlatformBrandingConfig,
  getDefaultPlatformBranding,
  loadFabHiddenState,
  loadPlatformBrandingConfig,
  type PlatformBrandingConfig,
  saveFabHiddenState,
  savePlatformBrandingConfig,
} from '@/utils/platformBrandingStorage'

const STYLE_ID = 'platform-branding-style'

const state = reactive({
  config: loadPlatformBrandingConfig(),
  fabHidden: loadFabHiddenState(),
  defaults: getDefaultPlatformBranding(),
})

function escapeCssUrl(url: string): string {
  return url.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function applyBrandingToDom(config: PlatformBrandingConfig): void {
  let el = document.getElementById(STYLE_ID)
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }

  const lightBg = escapeCssUrl(config.loginBgLight)
  const darkBg = escapeCssUrl(config.loginBgDark)

  el.textContent = `
    html:not([data-theme='dark']) .xingyuv-login {
      background: url("${lightBg}") center center / cover no-repeat !important;
    }
    html[data-theme='dark'] .xingyuv-login {
      background: url("${darkBg}") center center / cover no-repeat !important;
    }
  `
}

applyBrandingToDom(state.config)

export function usePlatformBranding() {
  function updateConfig(partial: Partial<PlatformBrandingConfig>): boolean {
    const next = { ...state.config, ...partial }
    const ok = savePlatformBrandingConfig(next)
    if (!ok)
      return false
    Object.assign(state.config, next)
    applyBrandingToDom(state.config)
    return true
  }

  function resetConfig(): void {
    const defaults = getDefaultPlatformBranding()
    Object.assign(state.config, defaults)
    clearPlatformBrandingConfig()
    applyBrandingToDom(state.config)
  }

  function setFabHidden(hidden: boolean): void {
    state.fabHidden = hidden
    saveFabHiddenState(hidden)
  }

  return {
    ...toRefs(state),
    updateConfig,
    resetConfig,
    setFabHidden,
  }
}

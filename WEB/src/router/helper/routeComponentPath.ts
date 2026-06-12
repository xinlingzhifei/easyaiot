export function normalizeViewComponentPath(component: string) {
  return component
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^src\/views\//, '')
    .replace(/^views\//, '')
    .replace(/\.(vue|tsx)$/i, '')
}

const legacyViewComponentAliases: Record<string, string> = {
  'system/social/client/index': 'system/oauth2/client/index',
  'system/social/user/index': 'system/user/index',
  'infra/testDemo/index': 'infra/codegen/index',
  'infra/demo/demo01/index': 'infra/codegen/index',
  'video/components/Channel/index': 'gb28181/components/Channel/index',
}

export function resolveViewComponentPath(component: string) {
  const normalizedComponent = normalizeViewComponentPath(component)
  return legacyViewComponentAliases[normalizedComponent] ?? normalizedComponent
}

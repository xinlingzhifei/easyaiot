export interface LocalBackRoute {
  path?: string
  name?: string | symbol
  meta?: {
    title?: unknown
  }
  children?: LocalBackRoute[]
}

function normalizedTitle(route: LocalBackRoute): string {
  return String(route.meta?.title ?? '').trim()
}

function hasEquivalentRoute(routes: LocalBackRoute[], localRoute: LocalBackRoute): boolean {
  const localTitle = normalizedTitle(localRoute)
  return routes.some((route) => {
    if (route.name && localRoute.name && route.name === localRoute.name) return true
    if (route.path && localRoute.path && route.path === localRoute.path) return true
    if (localTitle && normalizedTitle(route) === localTitle) return true
    return hasEquivalentRoute(route.children ?? [], localRoute)
  })
}

export function resolveRequiredLocalBackRoutes<T extends LocalBackRoute>(
  backendRoutes: LocalBackRoute[],
  localRoutes: T[],
): T[] {
  return localRoutes.filter((route) => !hasEquivalentRoute(backendRoutes, route))
}

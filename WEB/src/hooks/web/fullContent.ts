import type { RouteLocationNormalizedLoaded } from 'vue-router'

type FullContentRoute = Pick<RouteLocationNormalizedLoaded, 'query' | 'meta'>

export function resolveFullContent(route: FullContentRoute, globalFullContent: boolean): boolean {
  if (route.query && Reflect.has(route.query, '__full__'))
    return true

  return Boolean(route.meta?.fullContent) || globalFullContent
}

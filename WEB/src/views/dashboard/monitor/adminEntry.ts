import type { RouteLocationRaw, RouteRecordNormalized, Router } from 'vue-router'

export const ADMIN_ENTRY_ROUTE_NAME = 'ComputeNodeIndex'
export const ADMIN_ENTRY_PARENT_ROUTE_NAME = 'NodeManage'
export const ADMIN_ENTRY_CLUSTER_PATH = '/node/index'
export const ADMIN_ENTRY_CLUSTER_TITLE = '\u96c6\u7fa4\u7ba1\u7406'

export const ADMIN_ENTRY_FALLBACK_ROUTE: RouteLocationRaw = {
  path: ADMIN_ENTRY_CLUSTER_PATH,
}

type AdminEntryRouter = Pick<Router, 'hasRoute'> & Partial<Pick<Router, 'getRoutes'>>

function normalizeRouteText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function isClusterManagementRoute(route: RouteRecordNormalized): boolean {
  const title = normalizeRouteText(route.meta?.title)
  const name = normalizeRouteText(route.name)
  const path = normalizeRouteText(route.path)

  return (
    title.includes(ADMIN_ENTRY_CLUSTER_TITLE) ||
    name === normalizeRouteText(ADMIN_ENTRY_ROUTE_NAME) ||
    name === normalizeRouteText(ADMIN_ENTRY_PARENT_ROUTE_NAME) ||
    path === '/node' ||
    path === ADMIN_ENTRY_CLUSTER_PATH ||
    path.startsWith('/node/')
  )
}

function routeToTarget(route: RouteRecordNormalized): RouteLocationRaw {
  if (route.name)
    return { name: route.name }

  return { path: route.path }
}

export function resolveAdminEntryTarget(router: AdminEntryRouter): RouteLocationRaw {
  if (router.hasRoute(ADMIN_ENTRY_ROUTE_NAME))
    return { name: ADMIN_ENTRY_ROUTE_NAME }

  if (router.hasRoute(ADMIN_ENTRY_PARENT_ROUTE_NAME))
    return { name: ADMIN_ENTRY_PARENT_ROUTE_NAME }

  const clusterRoute = router.getRoutes?.().find(isClusterManagementRoute)
  if (clusterRoute)
    return routeToTarget(clusterRoute)

  return ADMIN_ENTRY_FALLBACK_ROUTE
}

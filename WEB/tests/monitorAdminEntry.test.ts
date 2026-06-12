import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ADMIN_ENTRY_FALLBACK_ROUTE,
  ADMIN_ENTRY_ROUTE_NAME,
  resolveAdminEntryTarget,
} from '../src/views/dashboard/monitor/adminEntry'

assert.equal(ADMIN_ENTRY_ROUTE_NAME, 'ComputeNodeIndex')

assert.deepEqual(
  resolveAdminEntryTarget({ hasRoute: () => true }),
  { name: ADMIN_ENTRY_ROUTE_NAME },
  'The dashboard admin entry should prefer the compute-node page only when that route is registered.',
)

assert.deepEqual(
  resolveAdminEntryTarget({ hasRoute: () => false }),
  ADMIN_ENTRY_FALLBACK_ROUTE,
  'The dashboard admin entry should fall back to the admin shell instead of pushing an unregistered route.',
)

assert.deepEqual(
  ADMIN_ENTRY_FALLBACK_ROUTE,
  { path: '/dashboard/index', query: { __full__: 'false' } },
  'The fallback should leave full-screen mode without leaving the registered dashboard route.',
)

const monitorHeader = readFileSync(resolve('src/views/dashboard/monitor/components/Header.vue'), 'utf8')
const permissionStore = readFileSync(resolve('src/store/modules/permission.ts'), 'utf8')

assert.doesNotMatch(
  monitorHeader,
  /router\.push\(['"]\/node\/index['"]\)/,
  'The dashboard admin entry must not hard-code /node/index because backend menu mode may not register it.',
)

assert.match(
  monitorHeader,
  /resolveAdminEntryTarget\(router\)/,
  'The dashboard admin entry should resolve a safe target before navigating.',
)

assert.match(
  permissionStore,
  /import\s+node\s+from\s+['"]@\/router\/routes\/modules\/node['"]/,
  'Back-end permission mode should import the local cluster-management route.',
)

assert.match(
  permissionStore,
  /transformRouteToMenu\(\[dashboard,\s+\.\.\.requiredLocalBackRoutes,\s+\.\.\.routeList\]\)/,
  'Back-end permission mode should include the local cluster-management route in the visible menu list.',
)

assert.match(
  permissionStore,
  /routes\s+=\s+\[PAGE_NOT_FOUND_ROUTE,\s+dashboard,\s+\.\.\.requiredLocalBackRoutes,\s+\.\.\.routeList\]/,
  'Back-end permission mode should register the local cluster-management route so the admin entry can navigate to it.',
)

import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const readSource = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8')

const calculateApi = readSource('src/api/device/calculate.ts')
const dashboardData = readSource('src/views/dashboard/monitor/useDashboardData.ts')
const indexView = readSource('src/views/dashboard/monitor/index.vue')

assert.match(
  calculateApi,
  /retryRequest:\s*\{\s*isOpenRetry:\s*false,\s*count:\s*0,\s*waitTime:\s*0\s*\}/,
  'Dashboard polling must disable the global retry loop.',
)
assert.doesNotMatch(
  calculateApi,
  /localStorage\.getItem\(['"]jwt_token['"]\)/,
  'Dashboard API calls must rely on the shared Authorization interceptor.',
)
assert.match(
  calculateApi,
  /getDashboardStatistics\s*=\s*async\s*\(params:\s*\{\s*device_id:\s*string\s*\}\)/,
  'Dashboard statistics must require a camera scope.',
)
assert.match(
  dashboardData,
  /useDashboardData\(activeDeviceId:\s*ComputedRef<string>\)/,
  'The shared dashboard data source must receive the active camera ID.',
)
assert.match(
  dashboardData,
  /getDashboardStatistics\(\{\s*device_id:\s*deviceId\s*\}\)/,
  'Statistics polling must carry the active camera ID.',
)
assert.match(
  dashboardData,
  /queryAlarmList\(\{[\s\S]*?device_id:\s*deviceId[\s\S]*?\},\s*\{\s*polling:\s*true\s*\}\)/,
  'Alert polling must carry the active camera ID and disable retries.',
)
assert.match(
  indexView,
  /const activeDeviceId = computed\([\s\S]*?device\?\.id[\s\S]*?gb_ch_/,
  'The command center must derive a real backend device ID and reject GB UI-only IDs.',
)
assert.match(
  indexView,
  /useDashboardData\(activeDeviceId\)/,
  'The command center must pass its selected device scope to the shared data source.',
)

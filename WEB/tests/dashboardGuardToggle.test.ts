import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const sidebar = readFileSync(
  fileURLToPath(
    new URL('../src/views/dashboard/monitor/components/Sidebar.vue', import.meta.url),
  ),
  'utf8',
)

assert.doesNotMatch(
  sidebar,
  /data-testid="dashboard-guard-toggle"|<ASwitch|启用识别|guardChecked|handleGuardSwitchChange/,
  'The dashboard sidebar should not expose the removed recognition switch.',
)

assert.doesNotMatch(
  sidebar,
  /dashboardGuardTask|startDashboardGuardTask|stopDashboardGuardTask|GUARD_SCOPE_STORAGE_KEY|createAlgorithmTask|listAlgorithmTasks/,
  'The dashboard sidebar should not start or stop backend recognition tasks.',
)

assert.doesNotMatch(
  sidebar,
  /withDirectoryTreeSelectable/,
  'Directory nodes should not become selectable only for recognition scope selection.',
)

assert.match(
  sidebar,
  /treeData\.value = bundle\.treeItems/,
  'The dashboard sidebar should keep the monitor tree play-focused and use the original selectable flags.',
)

assert.match(
  sidebar,
  /emit\('device-play', payload\)/,
  'GB28181 channel leaves should still play from the dashboard tree.',
)

assert.match(
  sidebar,
  /emit\('device-play', \{[\s\S]*http_stream: device\.http_stream,[\s\S]*rtmp_stream: device\.rtmp_stream/,
  'Direct camera leaves should still pass playable stream fields to the video monitor.',
)

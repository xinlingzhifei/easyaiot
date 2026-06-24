import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const videoMonitor = readFileSync(
  fileURLToPath(
    new URL('../src/views/dashboard/monitor/components/VideoMonitor.vue', import.meta.url),
  ),
  'utf8',
)

assert.match(
  videoMonitor,
  /data-testid="monitor-ai-toggle"|<a-checkbox|AI_TOGGLE_STORAGE_KEY|readPersistedEnableAi|persistEnableAi|const enableAi/,
  'The dashboard video monitor should expose one AI recognition toggle in the video header.',
)

assert.match(
  videoMonitor,
  /dashboardGuardTask|startDashboardGuardTask|stopDashboardGuardTask|listAlgorithmTasks|createAlgorithmTask/,
  'Enabling AI from the dashboard video monitor should start or stop backend recognition tasks.',
)

assert.match(
  videoMonitor,
  /async function ensureDashboardAiRecognitionForDevices[\s\S]*await startDashboardGuardTask\(\{ scope, api: dashboardGuardApi \}\)/,
  'The dashboard AI toggle should call the shared backend recognition task starter.',
)

assert.match(
  videoMonitor,
  /watch\(enableAi,[\s\S]*ensureDashboardAiRecognitionForVisibleDevices\(\)[\s\S]*reloadAllVideosForAiToggle\(\)/,
  'Toggling AI on should start recognition for visible videos and then reload them through the AI stream path.',
)

assert.match(
  videoMonitor,
  /return pickDirectPlayUrls\(dev,\s*enableAi\.value\)/,
  'Dashboard direct camera playback should prefer the AI stream only after the video header toggle is enabled.',
)

assert.match(
  videoMonitor,
  /resolveGbChannelPlayUrls\([\s\S]*\{\s*enableAi:\s*enableAi\.value,\s*synced:\s*playDevice\s*\}/,
  'Dashboard GB28181 channel playback should request the AI stream only after the video header toggle is enabled.',
)

assert.match(
  videoMonitor,
  /loadGbChannelSyncedDevice[\s\S]*if \(!id \|\| id\.startsWith\('gb_ch_'\)\) return ''/,
  'GB28181 AI recognition should resolve the synced camera device and never start tasks against gb_ch_* UI ids.',
)

assert.match(
  videoMonitor,
  /AI_PLAY_FALLBACK_MS|preferAi|fallbackUrl/,
  'Dashboard AI playback should keep the original stream fallback while the algorithm stream warms up.',
)

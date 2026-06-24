import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const videoMonitor = readFileSync(
  fileURLToPath(
    new URL('../src/views/dashboard/monitor/components/VideoMonitor.vue', import.meta.url),
  ),
  'utf8',
)

assert.doesNotMatch(
  videoMonitor,
  /data-testid="monitor-ai-toggle"|<a-checkbox|AI_TOGGLE_STORAGE_KEY|readPersistedEnableAi|persistEnableAi|const enableAi/,
  'The dashboard video monitor should not expose or persist an AI recognition toggle.',
)

assert.doesNotMatch(
  videoMonitor,
  /dashboardGuardTask|startDashboardGuardTask|stopDashboardGuardTask|listAlgorithmTasks|createAlgorithmTask/,
  'Dashboard video playback should not start backend recognition tasks.',
)

assert.match(
  videoMonitor,
  /return pickDirectPlayUrls\(dev,\s*false\)/,
  'Dashboard direct camera playback should always prefer the original stream.',
)

assert.match(
  videoMonitor,
  /resolveGbChannelPlayUrls\([\s\S]*\{\s*enableAi:\s*false,/,
  'Dashboard GB28181 channel playback should always request the raw WVP stream.',
)

assert.doesNotMatch(
  videoMonitor,
  /AI_PLAY_FALLBACK_MS|preferAi|fallbackUrl/,
  'Dashboard playback should not keep the removed AI fallback path alive.',
)

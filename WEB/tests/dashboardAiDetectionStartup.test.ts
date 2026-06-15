import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const videoMonitor = readFileSync(
  fileURLToPath(
    new URL('../src/views/dashboard/monitor/components/VideoMonitor.vue', import.meta.url),
  ),
  'utf8',
)

const devicePlay = readFileSync(
  fileURLToPath(new URL('../src/views/camera/utils/devicePlay.ts', import.meta.url)),
  'utf8',
)

assert.match(
  videoMonitor,
  /startDashboardGuardTask/,
  'The dashboard AI toggle should start backend recognition, not only switch playback URLs.',
)

assert.match(
  videoMonitor,
  /async function ensureDashboardAiRecognitionForDevices/,
  'VideoMonitor should have one helper that starts recognition for currently played devices.',
)

assert.match(
  videoMonitor,
  /watch\(enableAi,\s*async\s*\(checked\)[\s\S]*ensureDashboardAiRecognitionForVisibleDevices\(\)[\s\S]*reloadAllVideosForAiToggle\(\)/,
  'Turning on dashboard AI should start recognition before reloading streams to the AI output.',
)

assert.match(
  videoMonitor,
  /const playDeviceStream = async[\s\S]*if \(enableAi\.value\)[\s\S]*ensureDashboardAiRecognitionForDevices/,
  'Playing a device while AI is already enabled should start recognition for that device before resolving the AI stream.',
)

assert.match(
  videoMonitor,
  /loadGbChannelSyncedDevice/,
  'GB28181 channel playback with AI enabled should resolve the synced database device before starting recognition.',
)

assert.match(
  videoMonitor,
  /function getDashboardAiDeviceId[\s\S]*startsWith\('gb_ch_'\)[\s\S]*return ''/,
  'Dashboard AI recognition must never send a front-end GB28181 pseudo id like gb_ch_* to the backend algorithm task API.',
)

assert.match(
  videoMonitor,
  /const recognition = await ensureGbDashboardAiRecognition\(gb, dev\)/,
  'GB28181 AI startup should use the synced database device helper, not the fallback front-end channel payload.',
)

assert.match(
  videoMonitor,
  /ensureDashboardAiRecognitionForDevices\(collectDashboardAiDevices\(aiDevice\)\)/,
  'The GB28181 AI helper should add the resolved synced device to the dashboard recognition scope.',
)

assert.match(
  videoMonitor,
  /国标通道尚未同步到设备库，无法启动 AI 识别/,
  'Unsynced GB28181 channels should show a clear warning instead of silently playing raw video without detection boxes.',
)

assert.doesNotMatch(
  devicePlay,
  /const aiReady = await probeStreamPlayable\(aiUrl\)[\s\S]*if \(!aiReady\)[\s\S]*return \{ url: videoUrl \}/,
  'AI playback should not permanently fall back to the original stream because the AI output was not ready during a short pre-probe.',
)

assert.match(
  devicePlay,
  /return \{ url: aiUrl, fallbackUrl: videoUrl, preferAi: true \}/,
  'When an AI stream address exists, the player should try it first and keep the original stream only as a timeout fallback.',
)

assert.doesNotMatch(
  devicePlay,
  /if \(synced\?\.id\) \{\s*return synced;\s*\}/,
  'A shallow synced GB28181 tree node without AI stream fields should not bypass the device-detail request.',
)

assert.match(
  devicePlay,
  /const lookupId =\s*syncedId && !syncedId\.startsWith\('gb_ch_'\)[\s\S]*getDeviceInfo\(lookupId\)/,
  'GB28181 AI playback should fetch the synced device detail so ai_http_stream can be used for detection boxes.',
)

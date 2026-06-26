import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const devicePlaySource = readFileSync(
  fileURLToPath(new URL('../src/views/camera/utils/devicePlay.ts', import.meta.url)),
  'utf8',
)

assert.match(
  devicePlaySource,
  /const aiPlayable = await probeStreamPlayable\(aiUrl\);[\s\S]*if \(!aiPlayable\) \{\s*return \{ url: videoUrl \};\s*\}/,
  'AI playback should probe for real media bytes and immediately use the original stream when the AI stream is empty.',
)

assert.match(
  devicePlaySource,
  /export const AI_PLAY_FALLBACK_MS = 10000;/,
  'AI playback fallback should not leave monitor cells loading for a full minute.',
)

assert.match(
  devicePlaySource,
  /const aiPlayerEngine = pickLivePlayerEngine\(\{[\s\S]*url,[\s\S]*videoCodec: wvpSource\.videoCodec[\s\S]*\}\);[\s\S]*playerEngine: aiPlayerEngine/,
  'GB28181 AI FLV streams must use a player engine derived from the AI URL instead of inheriting a WebRTC fallback engine.',
)

assert.match(
  devicePlaySource,
  /if \(!isAiStreamPlayUrl\(url\) && wvpSource\.url\) \{\s*return wvpSource;\s*\}/,
  'GB28181 AI fallback should use the fresh WVP play/start source instead of stale synced device http_stream values.',
)

const dashboardMonitorSource = readFileSync(
  fileURLToPath(
    new URL('../src/views/dashboard/monitor/components/VideoMonitor.vue', import.meta.url),
  ),
  'utf8',
)
const splitScreenMonitorSource = readFileSync(
  fileURLToPath(
    new URL('../src/views/camera/components/SplitScreenMonitor/MonitorPanel.vue', import.meta.url),
  ),
  'utf8',
)

for (const source of [dashboardMonitorSource, splitScreenMonitorSource]) {
  assert.doesNotMatch(
    source,
    /ZLM 已收到推流/,
    'AI fallback warning should not imply the AI stream must appear in ZLM when the AI output is served by the media server /ai path.',
  )
  assert.match(
    source,
    /媒体服务器已收到 AI 推流/,
    'AI fallback warning should point operators to the actual AI media output path.',
  )
}

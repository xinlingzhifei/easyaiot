import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const videoMonitor = readFileSync(
  fileURLToPath(
    new URL('../src/views/dashboard/monitor/components/VideoMonitor.vue', import.meta.url),
  ),
  'utf8',
)

const sharedPlayer = readFileSync(
  fileURLToPath(new URL('../src/components/Player/module/jessibuca.vue', import.meta.url)),
  'utf8',
)

assert.match(
  videoMonitor,
  /const VIDEO_STATE_STORAGE_KEY = 'yfeieye\.dashboard\.monitor\.videoState'/,
  'Dashboard live video should keep a stable storage key for restoring visible streams after route navigation.',
)

assert.doesNotMatch(
  videoMonitor,
  /AI_TOGGLE_STORAGE_KEY|readPersistedEnableAi|persistEnableAi|const enableAi/,
  'Dashboard live video should no longer restore a hidden AI choice when the user returns to the page.',
)

assert.match(
  videoMonitor,
  /return pickDirectPlayUrls\(dev,\s*false\)/,
  'Dashboard direct camera playback should always resolve the original stream after route navigation.',
)

assert.match(
  videoMonitor,
  /resolveGbChannelPlayUrls\([\s\S]*\{\s*enableAi:\s*false,/,
  'Dashboard GB28181 playback should always resolve the raw WVP stream after route navigation.',
)

assert.match(
  videoMonitor,
  /async function playSavedSlot[\s\S]*const \{ url, playerEngine, videoCodec \} = await resolveGbChannelPlayUrls[\s\S]*playerEngine,[\s\S]*videoCodec,/,
  'Restored GB28181 dashboard slots should keep player engine and codec metadata so H265/WVP streams render.',
)

assert.match(
  videoMonitor,
  /window\.sessionStorage\.setItem\(VIDEO_STATE_STORAGE_KEY, JSON\.stringify\(state\)\)/,
  'Dashboard live video should persist the playing slots before route navigation destroys the component.',
)

assert.match(
  videoMonitor,
  /function readPersistedVideoState\(\)[\s\S]*window\.sessionStorage\.getItem\(VIDEO_STATE_STORAGE_KEY\)/,
  'Dashboard live video should read the previous playing slots when the user returns to the page.',
)

assert.match(
  videoMonitor,
  /async function restorePersistedVideoState\(\)[\s\S]*reloadVideoAtIndex\(index\)/,
  'Dashboard live video should reload restored devices instead of only rendering stale placeholder data.',
)

assert.match(
  videoMonitor,
  /onActivated\(\(\) => \{[\s\S]*resumeDashboardVideosAfterRouteReturn\(\)/,
  'Dashboard live video should reconnect when a cached monitor route is activated again.',
)

assert.match(
  videoMonitor,
  /internalVideoList\.value\[targetIndex\] = \{[\s\S]*videoCodec: payload\.videoCodec \|\| '',[\s\S]*persistDashboardVideoState\(\)/,
  'Dashboard live video should save a stream immediately after assigning it to a screen.',
)

assert.match(
  videoMonitor,
  /internalVideoList\.value\[index\] = \{[\s\S]*name: `[^`]*\$\{index \+ 1\}`[\s\S]*persistDashboardVideoState\(\)/,
  'Dashboard live video should update persisted state when a stream is removed from a screen.',
)

assert.doesNotMatch(
  videoMonitor,
  /setTimeout\(\(\) => tryPlay\(\), 200\)/,
  'Dashboard live video should rely on the player prop watcher/mounted hook instead of issuing a delayed duplicate play call.',
)

assert.doesNotMatch(
  videoMonitor,
  /jessibucaInstance\.play\(\)/,
  'Dashboard live video should not call the child player after assigning playUrl because that causes duplicate stream initialization.',
)

assert.doesNotMatch(
  videoMonitor,
  /videoRefs\.value\[targetIndex\]\?\.play\?\.\(\)/,
  'Dashboard AI fallback should switch the playUrl only; the player watcher owns the actual reconnect.',
)

assert.doesNotMatch(
  sharedPlayer,
  /\$refs\.easyWasmPlayer\.play\(target\)/,
  'The shared H265/WASM player path should pass videoUrl to EasyPlayer and let EasyPlayer own the actual play call.',
)

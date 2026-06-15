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
  /function readPersistedEnableAi\(\)[\s\S]*return false/,
  'Dashboard live video should still default to the original stream when no persisted AI choice exists.',
)

assert.match(
  videoMonitor,
  /const AI_TOGGLE_STORAGE_KEY = 'yfeieye\.dashboard\.monitor\.enableAi'/,
  'Dashboard AI toggle should use a stable storage key so route navigation can restore the user choice.',
)

assert.match(
  videoMonitor,
  /const VIDEO_STATE_STORAGE_KEY = 'yfeieye\.dashboard\.monitor\.videoState'/,
  'Dashboard live video should keep a stable storage key for restoring visible streams after route navigation.',
)

assert.match(
  videoMonitor,
  /const enableAi = ref\(readPersistedEnableAi\(\)\)/,
  'Dashboard AI toggle should initialize from the persisted session value when the user returns to the page.',
)

assert.match(
  videoMonitor,
  /window\.sessionStorage\.setItem\(AI_TOGGLE_STORAGE_KEY, String\(checked\)\)/,
  'Dashboard AI toggle should persist user changes before route navigation destroys the component.',
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

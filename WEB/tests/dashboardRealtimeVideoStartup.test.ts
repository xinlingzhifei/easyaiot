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
  /const enableAi = ref\(readPersistedEnableAi\(\)\)/,
  'Dashboard AI toggle should initialize from the persisted session value when the user returns to the page.',
)

assert.match(
  videoMonitor,
  /window\.sessionStorage\.setItem\(AI_TOGGLE_STORAGE_KEY, String\(checked\)\)/,
  'Dashboard AI toggle should persist user changes before route navigation destroys the component.',
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

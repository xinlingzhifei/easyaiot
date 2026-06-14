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
  /const enableAi = ref\(false\)/,
  'Dashboard live video should start with the original stream by default; AI probing must be opt-in so first paint is not blocked.',
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

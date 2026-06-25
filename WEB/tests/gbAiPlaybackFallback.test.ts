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

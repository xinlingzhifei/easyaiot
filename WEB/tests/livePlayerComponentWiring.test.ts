import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const sharedPlayer = readFileSync(
  fileURLToPath(new URL('../src/components/Player/module/jessibuca.vue', import.meta.url)),
  'utf8',
)
const dialogPlayer = readFileSync(
  fileURLToPath(new URL('../src/components/VideoPlayer/DialogPlayer.vue', import.meta.url)),
  'utf8',
)
const easyPlayer = readFileSync(
  fileURLToPath(new URL('../src/components/VideoPlayer/EasyPlayer.vue', import.meta.url)),
  'utf8',
)

assert.match(
  sharedPlayer,
  /import EasyPlayer from ["']@\/components\/VideoPlayer\/EasyPlayer\.vue["']/,
  'The shared live player wrapper should import EasyPlayer for WASM decoding.',
)
assert.match(
  sharedPlayer,
  /shouldUseWasmLivePlayer/,
  'The shared live player wrapper should use the codec/player strategy.',
)
assert.match(
  sharedPlayer,
  /<EasyPlayer[\s\S]*v-if="useEasyWasm"/,
  'The shared live player wrapper should render EasyPlayer for H265/H264-style WASM playback.',
)
assert.match(
  sharedPlayer,
  /playerEngine/,
  'The shared live player wrapper should accept an explicit player engine override.',
)

assert.match(
  dialogPlayer,
  /pickWvpPlaySource/,
  'DialogPlayer should preserve WVP codec metadata when choosing the play source.',
)
assert.match(
  dialogPlayer,
  /:playerEngine="state\.playerEngine"/,
  'DialogPlayer should pass the selected player engine to the shared live player wrapper.',
)

assert.match(
  easyPlayer,
  /:id="playerId"/,
  'EasyPlayer should use a per-instance DOM id instead of the old global easyplayer id.',
)
assert.match(
  easyPlayer,
  /window\.WasmPlayer/,
  'EasyPlayer should use the globally loaded EasyWasmPlayer constructor safely.',
)

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
const monitorPanel = readFileSync(
  fileURLToPath(
    new URL('../src/views/camera/components/SplitScreenMonitor/MonitorPanel.vue', import.meta.url),
  ),
  'utf8',
)
const videoMonitor = readFileSync(
  fileURLToPath(
    new URL('../src/views/dashboard/monitor/components/VideoMonitor.vue', import.meta.url),
  ),
  'utf8',
)
const easyPlayer = readFileSync(
  fileURLToPath(new URL('../src/components/VideoPlayer/EasyPlayer.vue', import.meta.url)),
  'utf8',
)
const zlmRepairScript = readFileSync(
  fileURLToPath(new URL('../../.scripts/docker/fix_zlmediakit.sh', import.meta.url)),
  'utf8',
)
const zlmClusterTemplate = readFileSync(
  fileURLToPath(new URL('../../.scripts/media-cluster/zlm/config.ini.template', import.meta.url)),
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
  /<EasyPlayer[\s\S]*v-(?:else-)?if="useEasyWasm"/,
  'The shared live player wrapper should render EasyPlayer for H265/H264-style WASM playback.',
)
assert.match(
  sharedPlayer,
  /<video[\s\S]*v-if="useNativeVideo"[\s\S]*class="native-video-player"/,
  'The shared live player wrapper should render a native video element for HEVC fMP4 when the browser supports it.',
)
assert.match(
  sharedPlayer,
  /useNativeVideo\(\)[\s\S]*playerEngine === 'native'/,
  'The shared live player wrapper should honor the native player engine selected by the stream strategy.',
)
assert.match(
  sharedPlayer,
  /playerEngine/,
  'The shared live player wrapper should accept an explicit player engine override.',
)
assert.match(
  sharedPlayer,
  /videoCodec/,
  'The shared live player wrapper should accept explicit codec metadata.',
)
assert.match(
  sharedPlayer,
  /shouldUseWasmLivePlayer\(\{[\s\S]*videoCodec: this\.videoCodec/,
  'The shared live player wrapper should use explicit codec metadata when choosing the engine.',
)
assert.match(
  sharedPlayer,
  /:decodeType="easyWasmDecodeType"/,
  'The shared live player wrapper should pass a codec-aware decode type to EasyPlayer.',
)
assert.match(
  sharedPlayer,
  /nativeVideoUrl = target/,
  'The shared live player wrapper should pass the signed stream URL to the native video element.',
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
  monitorPanel,
  /:playerEngine="state\.playCells\[i - 1\]!\.playerEngine \|\| ''"/,
  'Split-screen monitor cells should pass the selected player engine to the shared player.',
)
assert.match(
  monitorPanel,
  /:videoCodec="state\.playCells\[i - 1\]!\.videoCodec \|\| ''"/,
  'Split-screen monitor cells should pass codec metadata to the shared player.',
)
assert.match(
  monitorPanel,
  /playerEngine\?: string \| null/,
  'Split-screen monitor cells should persist player engine metadata across reloads.',
)
assert.match(
  monitorPanel,
  /videoCodec\?: string \| null/,
  'Split-screen monitor cells should persist codec metadata across reloads.',
)

assert.match(
  videoMonitor,
  /:playerEngine="video\.playerEngine \|\| ''"/,
  'Dashboard monitor cells should pass the selected player engine to the shared player.',
)
assert.match(
  videoMonitor,
  /:videoCodec="video\.videoCodec \|\| ''"/,
  'Dashboard monitor cells should pass codec metadata to the shared player.',
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
assert.match(
  easyPlayer,
  /decodeType/,
  'EasyPlayer should expose EasyWasmPlayer decodeType so H265 can force software decoding.',
)

assert.match(
  zlmRepairScript,
  /\[rtmp\][\s\S]*directProxy=1[\s\S]*enhanced=0/,
  'ZLMediaKit repair config should disable enhanced FLV for EasyWasmPlayer H265 compatibility.',
)
assert.match(
  zlmClusterTemplate,
  /\[rtmp\][\s\S]*directProxy=1[\s\S]*enhanced=0/,
  'ZLMediaKit cluster template should disable enhanced FLV for EasyWasmPlayer H265 compatibility.',
)

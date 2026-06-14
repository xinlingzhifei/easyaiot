import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const streamForwardApi = readFileSync(
  fileURLToPath(new URL('../src/api/device/stream_forward.ts', import.meta.url)),
  'utf8',
)
const directRtspPanel = readFileSync(
  fileURLToPath(new URL('../src/views/camera/components/DeviceCreate/panels/DirectRtspPanel.vue', import.meta.url)),
  'utf8',
)

assert.match(
  streamForwardApi,
  /export const ensureEdgeStreamForwardTask/,
  'Stream-forward API should expose Edge RTSP task creation.',
)
assert.match(
  streamForwardApi,
  /ensure-edge-task/,
  'Edge RTSP task API should call the backend route.',
)
assert.match(
  directRtspPanel,
  /listScheduleNodes/,
  'Direct RTSP creation should load selectable Edge/compute nodes.',
)
assert.match(
  directRtspPanel,
  /edge_node_id/,
  'Direct RTSP creation should include an Edge node selector field.',
)
assert.match(
  directRtspPanel,
  /access_mode/,
  'Direct RTSP creation should let the user choose local or Edge access mode.',
)
assert.match(
  directRtspPanel,
  /ensureEdgeStreamForwardTask/,
  'Direct RTSP creation should enqueue Edge outbound access when Edge mode is selected.',
)
assert.match(
  directRtspPanel,
  /ensureDeviceStreamForwardTask/,
  'Direct RTSP creation should keep the existing local stream-forward path.',
)

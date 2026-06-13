import * as assert from 'node:assert/strict'

import {
  detectVideoCodecFromUrl,
  getStreamVideoCodec,
  normalizeVideoCodec,
  pickLivePlayerEngine,
  pickWvpPlaySource,
} from '../src/views/camera/utils/livePlayer'

assert.equal(normalizeVideoCodec('H.265'), 'h265')
assert.equal(normalizeVideoCodec('HEVC'), 'h265')
assert.equal(normalizeVideoCodec('H264'), 'h264')
assert.equal(normalizeVideoCodec('AVC'), 'h264')
assert.equal(normalizeVideoCodec('MPEG-4'), 'mpeg4')
assert.equal(normalizeVideoCodec('MJPEG'), 'mjpeg')
assert.equal(normalizeVideoCodec('JPEG'), 'mjpeg')
assert.equal(normalizeVideoCodec(''), 'unknown')

assert.equal(
  detectVideoCodecFromUrl('https://eye.yfeiai.com/rtp/demo.live.flv?originTypeStr=rtp_push&videoCodec=H265'),
  'h265',
)
assert.equal(detectVideoCodecFromUrl('not a url'), 'unknown')

assert.equal(
  getStreamVideoCodec({
    mediaInfo: { videoCodec: 'HEVC' },
    tracks: [{ codec_type: 0, codec_id_name: 'H264' }],
  }),
  'h265',
)
assert.equal(
  getStreamVideoCodec({
    tracks: [{ codec_type: 0, codec_id_name: 'H264' }],
  }),
  'h264',
)

assert.equal(pickLivePlayerEngine({ videoCodec: 'H265' }), 'easywasm')
assert.equal(pickLivePlayerEngine({ videoCodec: 'H264' }), 'easywasm')
assert.equal(pickLivePlayerEngine({ videoCodec: 'MPEG4' }), 'easywasm')
assert.equal(pickLivePlayerEngine({ videoCodec: 'MJPEG' }), 'easywasm')
assert.equal(
  pickLivePlayerEngine({
    url: 'https://eye.yfeiai.com/rtp/demo.live.flv?videoCodec=HEVC',
  }),
  'easywasm',
)
assert.equal(pickLivePlayerEngine({ videoCodec: 'VP9' }), 'jessibuca')

const source = pickWvpPlaySource({
  flv: 'http://eye.yfeiai.com:6080/rtp/demo.live.flv?videoCodec=H265',
  https_flv: 'https://eye.yfeiai.com/rtp/demo.live.flv?videoCodec=H265',
  ws_flv: 'ws://eye.yfeiai.com:6080/rtp/demo.live.flv?videoCodec=H265',
  wss_flv: '',
  mediaInfo: { videoCodec: 'H265' },
}, {
  isHttps: true,
})

assert.deepEqual(source, {
  url: 'https://eye.yfeiai.com/rtp/demo.live.flv?videoCodec=H265',
  videoCodec: 'h265',
  playerEngine: 'easywasm',
})

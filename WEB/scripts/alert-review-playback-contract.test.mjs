import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const playbackSource = readFileSync('src/utils/alertRecordPlayback.ts', 'utf8')
const workbenchSource = readFileSync('src/views/alert/components/AlertReviewWorkbench.vue', 'utf8')
const dialogPlayerSource = readFileSync('src/components/VideoPlayer/DialogPlayer.vue', 'utf8')
const jessibucaSource = readFileSync('src/components/Player/module/jessibuca.vue', 'utf8')

assert.match(playbackSource, /seek_time\?: string \| null/)
assert.match(playbackSource, /playback_offset_seconds\?: number \| null/)
assert.match(playbackSource, /function resolvePlaybackSeekContext/)
assert.match(playbackSource, /playback_offset_seconds: seekContext\.playbackOffsetSeconds/)

assert.match(workbenchSource, /record_start_time: reviewSegment\.value\?\.startTime/)
assert.match(workbenchSource, /record_start_time: segment\.startTime/)

assert.match(dialogPlayerSource, /seekOffsetSeconds: 0/)
assert.match(dialogPlayerSource, /data-testid="alert-review-dialog-player-stage"/)
assert.match(dialogPlayerSource, /:data-seek-time="state\.seekTime"/)
assert.match(dialogPlayerSource, /:data-playback-offset-seconds="state\.seekOffsetSeconds"/)
assert.match(dialogPlayerSource, /:seekOffsetSeconds="state\.seekOffsetSeconds"/)
assert.match(dialogPlayerSource, /shouldUseNativeSeekPlayback\(streamUrl, state\.seekOffsetSeconds\)/)

assert.match(jessibucaSource, /seekOffsetSeconds:/)
assert.match(jessibucaSource, /applyNativeSeek\(\)/)
assert.match(jessibucaSource, /video\.currentTime = offset/)

console.log('alert review playback contract tests OK')

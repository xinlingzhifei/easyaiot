import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const playbackSource = readFileSync('src/utils/alertRecordPlayback.ts', 'utf8')
const workbenchSource = readFileSync('src/views/alert/components/AlertReviewWorkbench.vue', 'utf8')
const alertPageSource = readFileSync('src/views/alert/index.vue', 'utf8')
const dialogPlayerSource = readFileSync('src/components/VideoPlayer/DialogPlayer.vue', 'utf8')
const jessibucaSource = readFileSync('src/components/Player/module/jessibuca.vue', 'utf8')
const snapApiSource = readFileSync('src/api/device/snap.ts', 'utf8')
const snapGallerySource = readFileSync('src/views/camera/components/SnapSpace/SnapSpaceImageGallery.vue', 'utf8')

assert.match(playbackSource, /seek_time\?: string \| null/)
assert.match(playbackSource, /playback_offset_seconds\?: number \| null/)
assert.match(playbackSource, /function resolvePlaybackSeekContext/)
assert.match(playbackSource, /playback_offset_seconds: seekContext\.playbackOffsetSeconds/)

assert.match(workbenchSource, /record_start_time: reviewSegment\.value\?\.startTime/)
assert.match(workbenchSource, /record_start_time: segment\.startTime/)
assert.match(
  workbenchSource,
  /createAlertReviewEvidenceExportJob\(activeCase\.value\.id, \{[\s\S]*?format: 'mp4'/,
  'ordinary evidence export must request a real MP4 artifact',
)

assert.match(alertPageSource, /seek_time: record\['seek_time'\]/)
assert.match(alertPageSource, /record_start_time: record\['record_start_time'\]/)
assert.match(alertPageSource, /playback_offset_seconds: record\['playback_offset_seconds'\]/)
assert.match(alertPageSource, /video_url: record\['video_url'\]/)
assert.match(alertPageSource, /url: record\['url'\]/)

assert.match(dialogPlayerSource, /seekOffsetSeconds: 0/)
assert.match(dialogPlayerSource, /data-testid="alert-review-dialog-player-stage"/)
assert.match(dialogPlayerSource, /:data-seek-time="state\.seekTime"/)
assert.match(dialogPlayerSource, /:data-playback-offset-seconds="state\.seekOffsetSeconds"/)
assert.match(dialogPlayerSource, /:seekOffsetSeconds="state\.seekOffsetSeconds"/)
assert.match(dialogPlayerSource, /shouldUseNativeSeekPlayback\(streamUrl, state\.seekOffsetSeconds, state\.seekTime\)/)
assert.match(dialogPlayerSource, /seekTime: string/)
assert.match(dialogPlayerSource, /playback_format=mp4/)

assert.match(jessibucaSource, /seekOffsetSeconds:/)
assert.match(jessibucaSource, /applyNativeSeek\(\)/)
assert.match(jessibucaSource, /video\.currentTime = offset/)
assert.match(jessibucaSource, /offset < 0/)

assert.match(snapApiSource, /export const loadSnapImageObjectUrl = async/)
assert.match(snapApiSource, /responseType: 'blob'/)
assert.match(snapGallerySource, /loadSnapImageObjectUrl/)
assert.match(snapGallerySource, /snapImageObjectUrls/)
assert.match(snapGallerySource, /URL\.revokeObjectURL/)
assert.match(snapGallerySource, /onBeforeUnmount/)

console.log('alert review playback contract tests OK')

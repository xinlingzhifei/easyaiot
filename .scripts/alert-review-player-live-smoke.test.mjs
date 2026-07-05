import assert from 'node:assert/strict';

import {
  assertSmokeResult,
  parseArgs,
  requiredOptionErrors,
} from './alert-review-player-live-smoke.mjs';

const parsed = parseArgs([
  '--workbench-url=https://example.test/yfeieye/alert?tab=review',
  '--review-row-text=RV-20260702-001',
  '--action-testid=alert-review-detail-seek',
  '--expected-seek-time=2026-07-02T08:00:02',
  '--expected-record-path-contains=east-gate-080000.mp4',
  '--expected-offset-seconds=2',
  '--wait-text=线索复核',
  '--local-storage=token=abc',
  '--cookie=session=xyz',
], {});

assert.equal(parsed.workbenchUrl, 'https://example.test/yfeieye/alert?tab=review');
assert.equal(parsed.reviewRowText, 'RV-20260702-001');
assert.equal(parsed.actionTestId, 'alert-review-detail-seek');
assert.equal(parsed.expectedSeekTime, '2026-07-02T08:00:02');
assert.equal(parsed.expectedRecordPathContains, 'east-gate-080000.mp4');
assert.equal(parsed.expectedOffsetSeconds, 2);
assert.deepEqual(parsed.localStoragePairs, [{ key: 'token', value: 'abc' }]);
assert.deepEqual(parsed.cookiePairs, [{ name: 'session', value: 'xyz' }]);

const envParsed = parseArgs([], {
  YFEIEYE_REVIEW_PLAYER_SMOKE_URL: 'https://env.example/review',
  YFEIEYE_REVIEW_PLAYER_SMOKE_ROW_TEXT: 'RV-env',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_SEEK_TIME: '2026-07-02T08:00:02',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_RECORD_PATH_CONTAINS: 'record.mp4',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_OFFSET_SECONDS: '2',
});
assert.equal(envParsed.workbenchUrl, 'https://env.example/review');
assert.equal(envParsed.expectedOffsetSeconds, 2);

const missing = requiredOptionErrors(parseArgs([], {}));
assert.ok(missing.some(error => error.includes('workbench-url')));
assert.ok(missing.some(error => error.includes('review-row-text')));
assert.ok(missing.some(error => error.includes('expected-seek-time')));
assert.ok(missing.some(error => error.includes('expected-record-path-contains')));
assert.ok(missing.some(error => error.includes('expected-offset-seconds')));

assertSmokeResult(
  {
    clickedRow: true,
    clickedAction: true,
    seekTime: '2026-07-02T08:00:02',
    currentUrl: 'https://example.test/video/east-gate-080000.mp4',
    recordPath: 'mock://record/east-gate-080000.mp4',
    playbackOffsetSeconds: 2,
  },
  parsed,
);

assert.throws(
  () => assertSmokeResult({ clickedRow: true, clickedAction: true, seekTime: 'wrong', currentUrl: 'x', playbackOffsetSeconds: 2 }, parsed),
  /expected seek_time/,
);

console.log('alert review player live smoke tests OK');

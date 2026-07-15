import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createDecipheriv } from 'node:crypto';
import * as playerLiveSmokeModule from './alert-review-player-live-smoke.mjs';

import {
  assertSmokeResult,
  buildProductionAuthStoragePairs,
  parseArgs,
  requiredOptionErrors,
  sanitizeSmokeResultForOutput,
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

const authParsed = parseArgs([], {
  YFEIEYE_REVIEW_PLAYER_SMOKE_ACCESS_TOKEN: 'access-token-1',
  YFEIEYE_REVIEW_PLAYER_SMOKE_TENANT_ID: '42',
  YFEIEYE_REVIEW_PLAYER_SMOKE_STORAGE_PREFIX: 'IOT_ADMIN__PRODUCTION__2.1.0-SNAPSHOT__',
});
assert.equal(authParsed.accessToken, 'access-token-1');
assert.equal(authParsed.tenantId, 42);
const authStoragePairs = buildProductionAuthStoragePairs(authParsed, 1_783_748_800_000);
assert.equal(authStoragePairs[0].key, 'jwt_token');
assert.equal(authStoragePairs[0].value, 'access-token-1');
assert.equal(
  authStoragePairs[1].key,
  'IOT_ADMIN__PRODUCTION__2.1.0-SNAPSHOT__COMMON__LOCAL__KEY__',
);
assert.equal(authStoragePairs[1].value.includes('access-token-1'), false);
const decryptedAuthCache = decryptAuthCache(authStoragePairs[1].value);
assert.equal(decryptedAuthCache.value.ACCESS_TOKEN__.value, 'access-token-1');
assert.equal(decryptedAuthCache.value.TENANT_ID__.value, 42);
assert.ok(decryptedAuthCache.expire > 1_783_748_800_000);

const nativeParsed = parseArgs([
  '--workbench-url=https://example.test/yfeieye/alert?tab=review',
  '--review-row-text=RV-20260702-001',
  '--action-testid=alert-review-detail-seek',
  '--expected-seek-time=2026-07-02T08:00:02',
  '--expected-record-path-contains=east-gate-080000.mp4',
  '--expected-offset-seconds=0',
  '--assert-native-current-time',
], {});
assert.equal(nativeParsed.assertNativeCurrentTime, true);

const envParsed = parseArgs([], {
  YFEIEYE_REVIEW_PLAYER_SMOKE_URL: 'https://env.example/review',
  YFEIEYE_REVIEW_PLAYER_SMOKE_ROW_TEXT: 'RV-env',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_SEEK_TIME: '2026-07-02T08:00:02',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_RECORD_PATH_CONTAINS: 'record.mp4',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_OFFSET_SECONDS: '2',
});
assert.equal(envParsed.workbenchUrl, 'https://env.example/review');
assert.equal(envParsed.expectedOffsetSeconds, 2);

function decryptAuthCache(ciphertext) {
  const decipher = createDecipheriv(
    'aes-128-ctr',
    Buffer.from('_11111000001111@', 'utf8'),
    Buffer.from('@11111000001111_', 'utf8'),
  );
  const padded = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);
  const padding = padded[padded.length - 1];
  return JSON.parse(padded.subarray(0, padded.length - padding).toString('utf8'));
}

const missing = requiredOptionErrors(parseArgs([], {}));
assert.ok(missing.some(error => error.includes('workbench-url')));
assert.ok(missing.some(error => error.includes('review-row-text')));
assert.ok(missing.some(error => error.includes('expected-seek-time')));
assert.ok(missing.some(error => error.includes('expected-record-path-contains')));
assert.ok(missing.some(error => error.includes('expected-offset-seconds')));

const localWorkbench = parseArgs([
  '--workbench-url=http://localhost:5173/yfeieye/alert?tab=review',
  '--review-row-text=RV-local',
  '--expected-seek-time=2026-07-02T08:00:02',
  '--expected-record-path-contains=east-gate-080000.mp4',
  '--expected-offset-seconds=2',
], {});
assert.ok(
  requiredOptionErrors(localWorkbench).includes('player live smoke workbench URL must not use a local/mock URL without --allow-local-endpoints'),
);

const localWorkbenchAllowed = parseArgs([
  '--workbench-url=http://localhost:5173/yfeieye/alert?tab=review',
  '--review-row-text=RV-local',
  '--expected-seek-time=2026-07-02T08:00:02',
  '--expected-record-path-contains=east-gate-080000.mp4',
  '--expected-offset-seconds=2',
  '--allow-local-endpoints',
], {});
assert.equal(localWorkbenchAllowed.allowLocalEndpoints, true);
assert.deepEqual(requiredOptionErrors(localWorkbenchAllowed), []);

assertSmokeResult(
  {
    clickedRow: true,
    clickedAction: true,
    seekTime: '2026-07-02T08:00:02',
    currentUrl: 'https://example.test/video/east-gate-080000.mp4',
    recordPath: 'https://example.test/video/east-gate-080000.mp4',
    playbackOffsetSeconds: 2,
  },
  parsed,
);

assert.throws(
  () => assertSmokeResult({
    clickedRow: true,
    clickedAction: true,
    seekTime: '2026-07-02T08:00:02',
    currentUrl: 'https://example.test/video/east-gate-080000.mp4',
    recordPath: 'mock://record/east-gate-080000.mp4',
    playbackOffsetSeconds: 2,
  }, parsed),
  /player live smoke result used local\/mock media evidence/,
);

assert.doesNotThrow(
  () => assertSmokeResult({
    clickedRow: true,
    clickedAction: true,
    seekTime: '2026-07-02T08:00:02',
    currentUrl: 'http://localhost:5173/mock/east-gate-080000.mp4',
    recordPath: 'mock://record/east-gate-080000.mp4',
    playbackOffsetSeconds: 2,
  }, localWorkbenchAllowed),
);

assert.throws(
  () => assertSmokeResult({
    clickedRow: true,
    clickedAction: true,
    seekTime: '2026-07-02T08:00:02',
    currentUrl: 'https://example.test/video/east-gate-080000.mp4',
    recordPath: 'https://example.test/video/east-gate-080000.mp4',
    playbackOffsetSeconds: 0,
    nativeCurrentTime: null,
  }, nativeParsed),
  /expected native video currentTime evidence/,
);

assert.doesNotThrow(
  () => assertSmokeResult({
    clickedRow: true,
    clickedAction: true,
    seekTime: '2026-07-02T08:00:02',
    currentUrl: 'https://example.test/video/east-gate-080000.mp4',
    recordPath: 'https://example.test/video/east-gate-080000.mp4',
    playbackOffsetSeconds: 0,
    nativeCurrentTime: 0.4,
    nativeCurrentSrc: 'https://example.test/video/east-gate-080000.mp4',
    nativeReadyState: 4,
    nativePaused: false,
    nativeDuration: 30,
    nativeError: null,
    nativePlayingObserved: true,
  }, nativeParsed),
);

assert.throws(
  () => assertSmokeResult({
    clickedRow: true,
    clickedAction: true,
    seekTime: '2026-07-02T08:00:02',
    currentUrl: 'https://example.test/video/east-gate-080000.mp4',
    recordPath: 'https://example.test/video/east-gate-080000.mp4',
    playbackOffsetSeconds: 0,
    nativeCurrentTime: 0,
    nativeCurrentSrc: 'https://example.test/video/east-gate-080000.mp4',
    nativeReadyState: 0,
    nativePaused: true,
    nativeDuration: null,
    nativeError: { code: 4, message: 'MEDIA_ERR_SRC_NOT_SUPPORTED' },
    nativePlayingObserved: false,
  }, nativeParsed),
  /native video failed to load|native video metadata was not decoded|native video did not enter playing state/,
);

assert.throws(
  () => assertSmokeResult({ clickedRow: true, clickedAction: true, seekTime: 'wrong', currentUrl: 'x', playbackOffsetSeconds: 2 }, parsed),
  /expected seek_time/,
);

const rawSignedResult = {
  clickedRow: true,
  clickedAction: true,
  seekTime: '2026-07-02T08:00:02',
  recordPath: 'record.mp4?token=record-secret#record-fragment',
  currentUrl: 'https://media.example.test/video/east-gate-080000.mp4?token=current-secret&signature=abc#current-fragment',
  nativeCurrentSrc: 'https://media.example.test/video/east-gate-080000.mp4?token=native-secret#native-fragment',
  playbackOffsetSeconds: 2,
};
assert.deepEqual(sanitizeSmokeResultForOutput(rawSignedResult), {
  ...rawSignedResult,
  recordPath: 'record.mp4',
  currentUrl: 'https://media.example.test/video/east-gate-080000.mp4',
  nativeCurrentSrc: 'https://media.example.test/video/east-gate-080000.mp4',
});
assert.match(rawSignedResult.recordPath, /record-secret/);
assert.match(rawSignedResult.currentUrl, /current-secret/);
assert.match(rawSignedResult.nativeCurrentSrc, /native-secret/);

let signedPathError;
try {
  assertSmokeResult({
    clickedRow: true,
    clickedAction: true,
    seekTime: '2026-07-02T08:00:02',
    recordPath: 'record.mp4?token=failure-record-secret#failure-record-fragment',
    currentUrl: 'https://media.example.test/video/wrong.mp4?token=failure-current-secret#failure-current-fragment',
    playbackOffsetSeconds: 2,
  }, parsed);
} catch (error) {
  signedPathError = error;
}
assert.ok(signedPathError instanceof Error);
assert.equal(signedPathError.message.includes('failure-record-secret'), false);
assert.equal(signedPathError.message.includes('failure-current-secret'), false);
assert.match(signedPathError.message, /record\.mp4/);
assert.match(signedPathError.message, /https:\/\/media\.example\.test\/video\/wrong\.mp4/);

const signedCliFailure = spawnSync(process.execPath, [
  '.scripts/alert-review-player-live-smoke.mjs',
  '--bogus=record.mp4?token=player-cli-failure-secret#player-cli-failure-fragment',
], { encoding: 'utf8' });
assert.equal(signedCliFailure.status, 1);
assert.equal(signedCliFailure.stderr.includes('player-cli-failure-secret'), false);
assert.match(signedCliFailure.stderr, /--bogus=record\.mp4/);

assert.equal(typeof playerLiveSmokeModule.navigate, 'function');
assert.equal(typeof playerLiveSmokeModule.resolveNavigationTimeoutMs, 'function');
assert.equal(playerLiveSmokeModule.resolveNavigationTimeoutMs(120_000), 120_000);
assert.equal(playerLiveSmokeModule.resolveNavigationTimeoutMs(undefined), 30_000);
assert.equal(playerLiveSmokeModule.resolveNavigationTimeoutMs(900_000), 300_000);
const navigationCalls = [];
const navigationCdp = {
  async send(method, params) {
    navigationCalls.push({ method, params });
    return {};
  },
};
let waitedNavigationTimeoutMs;
await playerLiveSmokeModule.navigate(
  navigationCdp,
  'https://release.example/review',
  120_000,
  {
    waitForExpression: async (_cdp, _expression, timeoutMs) => {
      waitedNavigationTimeoutMs = timeoutMs;
    },
  },
);
assert.deepEqual(navigationCalls, [{
  method: 'Page.navigate',
  params: { url: 'https://release.example/review' },
}]);
assert.equal(waitedNavigationTimeoutMs, 120_000);

console.log('alert review player live smoke tests OK');

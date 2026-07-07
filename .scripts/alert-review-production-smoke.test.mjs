import assert from 'node:assert/strict';

import {
  buildSmokeSteps,
  formatStepCommand,
  parseArgs,
  requiredOptionErrors,
  runProductionSmoke,
} from './alert-review-production-smoke.mjs';
import {
  evaluateStatus,
  releaseEntriesForTrackedPaths,
} from './verify-alert-review-release-package.mjs';

const parsed = parseArgs([
  '--device-base-url=http://device.local/api',
  '--token=token-1',
  '--operator-user-id=9001',
  '--device-alert-time=2026-07-05T10:00:00',
  '--device-profile=device-video-web',
  '--video-alert-record-query-url=http://video.local/video/record/availability',
  '--video-record-coverage-query-url=http://video.local/video/record/availability',
  '--video-record-base-url=http://video.local/video/record',
  '--video-record-export-url=http://video.local/video/record/export',
  '--video-device-id=device-01',
  '--video-camera-id=camera-01',
  '--video-alert-time=2026-07-05 10:00:00',
  '--player-workbench-url=http://web.local/yfeieye/alert/review',
  '--player-review-row-text=RV-20260705-001',
  '--player-action-testid=alert-review-detail-seek',
  '--player-expected-seek-time=2026-07-05T10:00:30',
  '--player-expected-record-path-contains=device-01',
  '--player-expected-offset-seconds=30',
  '--player-wait-text=线索复核工作台',
], {});

assert.equal(parsed.deviceBaseUrl, 'http://device.local/api');
assert.equal(parsed.token, 'token-1');
assert.equal(parsed.operatorUserId, 9001);
assert.equal(parsed.deviceAlertTime, '2026-07-05T10:00:00');
assert.equal(parsed.videoDeviceId, 'device-01');
assert.equal(parsed.videoCameraId, 'camera-01');
assert.equal(parsed.playerExpectedOffsetSeconds, 30);

const fromEnv = parseArgs([], {
  YFEIEYE_DEVICE_BASE_URL: 'https://device.env/admin-api',
  YFEIEYE_DEVICE_AUTH_TOKEN: 'env-token',
  YFEIEYE_DEVICE_SMOKE_OPERATOR_USER_ID: '9200',
  YFEIEYE_DEVICE_SMOKE_ALERT_TIME: '2026-07-05T11:00:00',
  YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL: 'https://video.env/video/record/availability',
  YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL: 'https://video.env/video/record/availability',
  YFEIEYE_VIDEO_RECORD_BASE_URL: 'https://video.env/video/record',
  YFEIEYE_VIDEO_RECORD_EXPORT_URL: 'https://video.env/video/record/export',
  YFEIEYE_VIDEO_SMOKE_DEVICE_ID: 'env-device',
  YFEIEYE_VIDEO_SMOKE_ALERT_TIME: '2026-07-05 11:00:00',
  YFEIEYE_REVIEW_PLAYER_SMOKE_URL: 'https://web.env/review',
  YFEIEYE_REVIEW_PLAYER_SMOKE_ROW_TEXT: 'RV-ENV',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_SEEK_TIME: '2026-07-05T11:00:10',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_RECORD_PATH_CONTAINS: 'env-device',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_OFFSET_SECONDS: '10',
});
assert.equal(fromEnv.deviceBaseUrl, 'https://device.env/admin-api');
assert.equal(fromEnv.videoDeviceId, 'env-device');
assert.equal(fromEnv.playerExpectedOffsetSeconds, 10);

assert.deepEqual(requiredOptionErrors(parseArgs([], {})), [
  'missing --device-base-url or YFEIEYE_DEVICE_BASE_URL',
  'missing --token or YFEIEYE_DEVICE_AUTH_TOKEN',
  'missing --operator-user-id or YFEIEYE_DEVICE_SMOKE_OPERATOR_USER_ID',
  'missing --device-alert-time or YFEIEYE_DEVICE_SMOKE_ALERT_TIME',
  'missing --video-alert-record-query-url or YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL',
  'missing --video-record-coverage-query-url or YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL',
  'missing --video-record-base-url or YFEIEYE_VIDEO_RECORD_BASE_URL',
  'missing --video-record-export-url or YFEIEYE_VIDEO_RECORD_EXPORT_URL',
  'missing --video-device-id or YFEIEYE_VIDEO_SMOKE_DEVICE_ID',
  'missing --video-alert-time or YFEIEYE_VIDEO_SMOKE_ALERT_TIME',
  'missing --player-workbench-url or YFEIEYE_REVIEW_PLAYER_SMOKE_URL',
  'missing --player-review-row-text or YFEIEYE_REVIEW_PLAYER_SMOKE_ROW_TEXT',
  'missing --player-expected-seek-time or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_SEEK_TIME',
  'missing --player-expected-record-path-contains or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_RECORD_PATH_CONTAINS',
  'missing --player-expected-offset-seconds or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_OFFSET_SECONDS',
]);

const steps = buildSmokeSteps(parsed, {
  nodePath: 'node',
  scriptDir: '.scripts',
});
assert.deepEqual(steps.map((step) => step.name), ['LiveDevice', 'LiveVideo', 'LivePlayer']);
assert.deepEqual(steps[0].args.slice(0, 5), [
  '.scripts/alert-review-device-integration-smoke.mjs',
  '--device-base-url=http://device.local/api',
  '--token=token-1',
  '--operator-user-id=9001',
  '--alert-time=2026-07-05T10:00:00',
]);
assert.ok(steps[1].args.includes('--record-export-url=http://video.local/video/record/export'));
assert.ok(steps[1].args.includes('--camera-id=camera-01'));
assert.ok(steps[2].args.includes('--expected-offset-seconds=30'));
assert.equal(
  formatStepCommand(steps[0]),
  'node .scripts/alert-review-device-integration-smoke.mjs --device-base-url=http://device.local/api --token=*** --operator-user-id=9001 --alert-time=2026-07-05T10:00:00 --profile=device-video-web',
);

const calls = [];
const smoke = await runProductionSmoke(parsed, {
  nodePath: 'node',
  scriptDir: '.scripts',
  runCommand: async (step) => {
    calls.push(step.name);
    return { status: 0 };
  },
});
assert.equal(smoke.ok, true);
assert.deepEqual(calls, ['LiveDevice', 'LiveVideo', 'LivePlayer']);
assert.deepEqual(smoke.steps.map((step) => step.status), ['passed', 'passed', 'passed']);

await assert.rejects(
  () => runProductionSmoke(parsed, {
    nodePath: 'node',
    scriptDir: '.scripts',
    runCommand: async (step) => ({ status: step.name === 'LiveVideo' ? 1 : 0 }),
  }),
  /LiveVideo failed with exit code 1/,
);

const untrackedProductionSmoke = evaluateStatus(`
?? .scripts/alert-review-production-smoke.mjs
?? .scripts/alert-review-production-smoke.test.mjs
`);
assert.equal(untrackedProductionSmoke.ok, false);
assert.equal(untrackedProductionSmoke.blockers[0].group, 'FR release gate tooling');
assert.equal(untrackedProductionSmoke.blockers[1].group, 'FR release gate tooling');

const trackedProductionSmokeEntries = releaseEntriesForTrackedPaths([
  '.scripts/alert-review-production-smoke.mjs',
  '.scripts/alert-review-production-smoke.test.mjs',
]);
assert.equal(trackedProductionSmokeEntries.length, 2);

console.log('alert review production smoke tests OK');

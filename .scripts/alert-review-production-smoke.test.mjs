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
  '--device-playback-allowed-camera-ids=camera-01',
  '--device-playback-denied-camera-ids=camera-02',
  '--device-playback-material-uri=playback-url.mp4',
  '--video-alert-record-query-url=http://video.local/video/record/availability',
  '--video-record-coverage-query-url=http://video.local/video/record/availability',
  '--video-record-base-url=http://video.local/video/record',
  '--video-record-export-url=http://video.local/video/record/export',
  '--video-device-id=device-01',
  '--video-camera-id=camera-01',
  '--video-alert-time=2026-07-05 10:00:00',
  '--video-record-drift-retention-hours=24',
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
assert.deepEqual(parsed.devicePlaybackAllowedCameraIds, ['camera-01']);
assert.deepEqual(parsed.devicePlaybackDeniedCameraIds, ['camera-02']);
assert.equal(parsed.devicePlaybackMaterialUri, 'playback-url.mp4');
assert.equal(parsed.videoDeviceId, 'device-01');
assert.equal(parsed.videoCameraId, 'camera-01');
assert.equal(parsed.videoRecordDriftRetentionHours, 24);
assert.equal(parsed.playerExpectedOffsetSeconds, 30);
assert.equal(parsed.allowLocalEndpoints, false);

const evidenceOutputParsed = parseArgs(['--evidence-output-file=artifacts/review-smoke.json'], {});
assert.equal(evidenceOutputParsed.evidenceOutputFile, 'artifacts/review-smoke.json');

const localEndpointsAllowed = parseArgs([
  '--device-base-url=http://127.0.0.1:48080/admin-api',
  '--token=token-1',
  '--operator-user-id=9001',
  '--device-alert-time=2026-07-05T10:00:00',
  '--device-playback-allowed-camera-ids=camera-01',
  '--device-playback-denied-camera-ids=camera-02',
  '--video-alert-record-query-url=http://127.0.0.1:6000/video/record/availability',
  '--video-record-coverage-query-url=http://127.0.0.1:6000/video/record/availability',
  '--video-record-base-url=http://127.0.0.1:6000/video/record',
  '--video-record-export-url=http://127.0.0.1:6000/video/record/export',
  '--video-device-id=device-01',
  '--video-alert-time=2026-07-05 10:00:00',
  '--video-record-drift-retention-hours=24',
  '--player-workbench-url=http://127.0.0.1:5173/yfeieye/alert/review',
  '--player-review-row-text=RV-20260705-001',
  '--player-expected-seek-time=2026-07-05T10:00:30',
  '--player-expected-record-path-contains=device-01',
  '--player-expected-offset-seconds=30',
  '--allow-local-endpoints',
], {});
assert.equal(localEndpointsAllowed.allowLocalEndpoints, true);
assert.deepEqual(requiredOptionErrors(localEndpointsAllowed), []);

const fromEnv = parseArgs([], {
  YFEIEYE_DEVICE_BASE_URL: 'https://device.env/admin-api',
  YFEIEYE_DEVICE_AUTH_TOKEN: 'env-token',
  YFEIEYE_DEVICE_SMOKE_OPERATOR_USER_ID: '9200',
  YFEIEYE_DEVICE_SMOKE_ALERT_TIME: '2026-07-05T11:00:00',
  YFEIEYE_DEVICE_PLAYBACK_ALLOWED_CAMERA_IDS: 'env-camera-allow',
  YFEIEYE_DEVICE_PLAYBACK_DENIED_CAMERA_IDS: 'env-camera-deny',
  YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL: 'https://video.env/video/record/availability',
  YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL: 'https://video.env/video/record/availability',
  YFEIEYE_VIDEO_RECORD_BASE_URL: 'https://video.env/video/record',
  YFEIEYE_VIDEO_RECORD_EXPORT_URL: 'https://video.env/video/record/export',
  YFEIEYE_VIDEO_SMOKE_DEVICE_ID: 'env-device',
  YFEIEYE_VIDEO_SMOKE_ALERT_TIME: '2026-07-05 11:00:00',
  YFEIEYE_VIDEO_RECORD_DRIFT_RETENTION_HOURS: '72',
  YFEIEYE_REVIEW_PLAYER_SMOKE_URL: 'https://web.env/review',
  YFEIEYE_REVIEW_PLAYER_SMOKE_ROW_TEXT: 'RV-ENV',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_SEEK_TIME: '2026-07-05T11:00:10',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_RECORD_PATH_CONTAINS: 'env-device',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_OFFSET_SECONDS: '10',
  YFEIEYE_PRODUCTION_SMOKE_ALLOW_LOCAL_ENDPOINTS: 'true',
  YFEIEYE_PRODUCTION_SMOKE_EVIDENCE_FILE: 'artifacts/env-smoke.json',
});
assert.equal(fromEnv.deviceBaseUrl, 'https://device.env/admin-api');
assert.deepEqual(fromEnv.devicePlaybackAllowedCameraIds, ['env-camera-allow']);
assert.deepEqual(fromEnv.devicePlaybackDeniedCameraIds, ['env-camera-deny']);
assert.equal(fromEnv.videoDeviceId, 'env-device');
assert.equal(fromEnv.videoRecordDriftRetentionHours, 72);
assert.equal(fromEnv.playerExpectedOffsetSeconds, 10);
assert.equal(fromEnv.evidenceOutputFile, 'artifacts/env-smoke.json');

assert.deepEqual(requiredOptionErrors(parseArgs([], {})), [
  'missing --device-base-url or YFEIEYE_DEVICE_BASE_URL',
  'missing --token or YFEIEYE_DEVICE_AUTH_TOKEN',
  'missing --operator-user-id or YFEIEYE_DEVICE_SMOKE_OPERATOR_USER_ID',
  'missing --device-alert-time or YFEIEYE_DEVICE_SMOKE_ALERT_TIME',
  'missing --device-playback-allowed-camera-ids or YFEIEYE_DEVICE_PLAYBACK_ALLOWED_CAMERA_IDS',
  'missing --device-playback-denied-camera-ids or YFEIEYE_DEVICE_PLAYBACK_DENIED_CAMERA_IDS',
  'missing --video-alert-record-query-url or YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL',
  'missing --video-record-coverage-query-url or YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL',
  'missing --video-record-base-url or YFEIEYE_VIDEO_RECORD_BASE_URL',
  'missing --video-record-export-url or YFEIEYE_VIDEO_RECORD_EXPORT_URL',
  'missing --video-device-id or YFEIEYE_VIDEO_SMOKE_DEVICE_ID',
  'missing --video-alert-time or YFEIEYE_VIDEO_SMOKE_ALERT_TIME',
  'missing --video-record-drift-retention-hours or YFEIEYE_VIDEO_RECORD_DRIFT_RETENTION_HOURS',
  'missing --player-workbench-url or YFEIEYE_REVIEW_PLAYER_SMOKE_URL',
  'missing --player-review-row-text or YFEIEYE_REVIEW_PLAYER_SMOKE_ROW_TEXT',
  'missing --player-expected-seek-time or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_SEEK_TIME',
  'missing --player-expected-record-path-contains or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_RECORD_PATH_CONTAINS',
  'missing --player-expected-offset-seconds or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_OFFSET_SECONDS',
]);

assert.deepEqual(requiredOptionErrors(parseArgs([
  '--device-base-url=http://localhost:48080/admin-api',
  '--token=token-1',
  '--operator-user-id=9001',
  '--device-alert-time=2026-07-05T10:00:00',
  '--device-playback-allowed-camera-ids=camera-01',
  '--device-playback-denied-camera-ids=camera-02',
  '--video-alert-record-query-url=http://127.0.0.1:6000/video/record/availability',
  '--video-record-coverage-query-url=http://video.mock/video/record/availability',
  '--video-record-base-url=file:///tmp/video/record',
  '--video-record-export-url=http://localhost:6000/video/record/export',
  '--video-device-id=device-01',
  '--video-alert-time=2026-07-05 10:00:00',
  '--video-record-drift-retention-hours=24',
  '--player-workbench-url=http://localhost:5173/mock-workbench',
  '--player-review-row-text=RV-20260705-001',
  '--player-expected-seek-time=2026-07-05T10:00:30',
  '--player-expected-record-path-contains=device-01',
  '--player-expected-offset-seconds=30',
], {})), [
  'production smoke endpoint --device-base-url must not use a local/mock URL without --allow-local-endpoints',
  'production smoke endpoint --video-alert-record-query-url must not use a local/mock URL without --allow-local-endpoints',
  'production smoke endpoint --video-record-coverage-query-url must not use a local/mock URL without --allow-local-endpoints',
  'production smoke endpoint --video-record-base-url must not use a local/mock URL without --allow-local-endpoints',
  'production smoke endpoint --video-record-export-url must not use a local/mock URL without --allow-local-endpoints',
  'production smoke endpoint --player-workbench-url must not use a local/mock URL without --allow-local-endpoints',
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
assert.ok(steps[0].args.includes('--playback-allowed-camera-ids=camera-01'));
assert.ok(steps[0].args.includes('--playback-denied-camera-ids=camera-02'));
assert.ok(steps[0].args.includes('--playback-material-uri=playback-url.mp4'));
assert.ok(steps[1].args.includes('--record-export-url=http://video.local/video/record/export'));
assert.ok(steps[1].args.includes('--camera-id=camera-01'));
assert.ok(steps[1].args.includes('--record-drift-retention-hours=24'));
assert.ok(steps[2].args.includes('--expected-offset-seconds=30'));
assert.equal(
  formatStepCommand(steps[0]),
  'node .scripts/alert-review-device-integration-smoke.mjs --device-base-url=http://device.local/api --token=*** --operator-user-id=9001 --alert-time=2026-07-05T10:00:00 --profile=device-video-web --playback-material-uri=playback-url.mp4 --playback-allowed-camera-ids=camera-01 --playback-denied-camera-ids=camera-02',
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

const evidenceWrites = [];
const smokeWithEvidence = await runProductionSmoke({
  ...parsed,
  evidenceOutputFile: 'artifacts/review-smoke.json',
}, {
  nodePath: 'node',
  scriptDir: '.scripts',
  now: sequencedNow([
    '2026-07-07T00:00:00.000Z',
    '2026-07-07T00:00:00.100Z',
    '2026-07-07T00:00:00.300Z',
    '2026-07-07T00:00:00.400Z',
    '2026-07-07T00:00:00.900Z',
    '2026-07-07T00:00:01.000Z',
    '2026-07-07T00:00:01.700Z',
    '2026-07-07T00:00:02.000Z',
  ]),
  writeFile: (file, content) => {
    evidenceWrites.push({ file, content });
  },
  runCommand: async (step) => ({
    status: 0,
    stdout: step.name === 'LiveDevice'
      ? `alert review DEVICE integration smoke passed
{
  "status": "passed",
  "profile": "device-video-web",
  "reviewItemId": 1001,
  "reviewCaseId": 2001,
  "exportJobNo": "EXP-20260707-001",
  "manifestValid": true,
  "videoExportRequested": true,
  "playback": {
    "grantedDecision": "granted",
    "deniedDecision": "denied",
    "deniedReasons": ["camera_not_allowed"]
  },
  "checkpoints": ["ingest_created", "record_coverage_synced", "evidence_download_audited"]
}
`
      : step.name === 'LiveVideo'
        ? `alert review VIDEO live smoke passed
{
  "checkpoints": ["alert_record_query_ok", "record_storage_drift_patrol_ok", "record_export_manifest_verified"],
  "storageDriftSummary": {
    "healthy": true,
    "recordCount": 3,
    "issueCount": 0,
    "issueReasons": {}
  },
  "exportResult": {
    "exportId": "review-export-1",
    "downloadUrl": "/downloads/review-export-1.mp4",
    "manifestUrl": "/manifests/review-export-1.json"
  }
}
`
        : `alert review player live smoke passed
{
  "clickedRow": true,
  "clickedAction": true,
  "seekTime": "2026-07-05T10:00:30",
  "recordPath": "mock://record/device-01/20260705-100000.mp4",
  "currentUrl": "https://media.example.test/records/device-01/20260705-100000.mp4?token=media-secret&signature=abc#playback",
  "playbackOffsetSeconds": 30,
  "nativeCurrentTime": 30.25
}
`,
  }),
});
assert.equal(smokeWithEvidence.ok, true);
assert.equal(evidenceWrites.length, 1);
assert.equal(evidenceWrites[0].file, 'artifacts/review-smoke.json');
const evidenceReport = JSON.parse(evidenceWrites[0].content);
assert.equal(evidenceReport.ok, true);
assert.equal(evidenceReport.status, 'passed');
assert.equal(evidenceReport.startedAt, '2026-07-07T00:00:00.000Z');
assert.equal(evidenceReport.finishedAt, '2026-07-07T00:00:02.000Z');
assert.equal(evidenceReport.durationMs, 2000);
assert.equal(evidenceReport.allowLocalEndpoints, false);
assert.deepEqual(evidenceReport.steps.map((step) => step.status), ['passed', 'passed', 'passed']);
assert.equal(evidenceReport.steps[0].command.includes('--token=***'), true);
assert.deepEqual(evidenceReport.steps[0].summary, {
  checkpoints: ['ingest_created', 'record_coverage_synced', 'evidence_download_audited'],
  playback: {
    grantedDecision: 'granted',
    deniedDecision: 'denied',
    deniedReasons: ['camera_not_allowed'],
  },
  status: 'passed',
  profile: 'device-video-web',
  reviewItemId: 1001,
  reviewCaseId: 2001,
  exportJobNo: 'EXP-20260707-001',
  manifestValid: true,
  videoExportRequested: true,
});
assert.deepEqual(evidenceReport.steps[1].summary.storageDriftSummary, {
  healthy: true,
  recordCount: 3,
  issueCount: 0,
  issueReasons: {},
});
assert.deepEqual(evidenceReport.steps[1].summary.checkpoints, [
  'alert_record_query_ok',
  'record_storage_drift_patrol_ok',
  'record_export_manifest_verified',
]);
assert.deepEqual(evidenceReport.steps[2].summary.player, {
  clickedRow: true,
  clickedAction: true,
  seekTime: '2026-07-05T10:00:30',
  recordPath: 'mock://record/device-01/20260705-100000.mp4',
  currentUrl: 'https://media.example.test/records/device-01/20260705-100000.mp4',
  playbackOffsetSeconds: 30,
  nativeCurrentTime: 30.25,
});
assert.equal(evidenceReport.steps[1].stdout, undefined);
assert.equal(evidenceReport.steps[2].stdout, undefined);
assert.equal(JSON.stringify(evidenceReport).includes('token-1'), false);
assert.equal(JSON.stringify(evidenceReport).includes('media-secret'), false);

const failedEvidenceWrites = [];
await assert.rejects(
  () => runProductionSmoke(parsed, {
    nodePath: 'node',
    scriptDir: '.scripts',
    runCommand: async (step) => ({ status: step.name === 'LiveVideo' ? 1 : 0 }),
  }),
  /LiveVideo failed with exit code 1/,
);

await assert.rejects(
  () => runProductionSmoke({
    ...parsed,
    evidenceOutputFile: 'artifacts/review-smoke-failed.json',
  }, {
    nodePath: 'node',
    scriptDir: '.scripts',
    now: sequencedNow([
      '2026-07-07T00:00:00.000Z',
      '2026-07-07T00:00:00.100Z',
      '2026-07-07T00:00:00.200Z',
      '2026-07-07T00:00:00.300Z',
      '2026-07-07T00:00:00.600Z',
      '2026-07-07T00:00:00.700Z',
    ]),
    writeFile: (file, content) => {
      failedEvidenceWrites.push({ file, content });
    },
    runCommand: async (step) => ({ status: step.name === 'LiveVideo' ? 2 : 0 }),
  }),
  /LiveVideo failed with exit code 2/,
);
assert.equal(failedEvidenceWrites.length, 1);
assert.equal(failedEvidenceWrites[0].file, 'artifacts/review-smoke-failed.json');
const failedEvidenceReport = JSON.parse(failedEvidenceWrites[0].content);
assert.equal(failedEvidenceReport.ok, false);
assert.equal(failedEvidenceReport.status, 'failed');
assert.equal(failedEvidenceReport.finishedAt, '2026-07-07T00:00:00.700Z');
assert.deepEqual(failedEvidenceReport.steps.map((step) => step.status), ['passed', 'failed']);
assert.equal(failedEvidenceReport.steps[1].name, 'LiveVideo');
assert.equal(failedEvidenceReport.steps[1].exitCode, 2);
assert.equal(failedEvidenceReport.steps[1].error, 'LiveVideo failed with exit code 2');
assert.equal(JSON.stringify(failedEvidenceReport).includes('token-1'), false);

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

function sequencedNow(values) {
  let index = 0;
  return () => new Date(values[Math.min(index++, values.length - 1)]);
}

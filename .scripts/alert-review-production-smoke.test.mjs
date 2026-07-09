import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

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

const STANDARD_STORAGE_DRIFT_REASON_KEYS = [
  'file_missing',
  'retention_expired',
  'disk_full',
  'cache_flush_failed',
];

const parsed = parseArgs([
  '--device-base-url=https://device.release.example/api',
  '--token=token-1',
  '--operator-user-id=9001',
  '--device-alert-time=2026-07-05T10:00:00',
  '--device-profile=device-video-web',
  '--device-playback-allowed-camera-ids=camera-01',
  '--device-playback-denied-camera-ids=camera-02',
  '--device-playback-review-item-id=1001',
  '--device-playback-review-case-id=2001',
  '--device-playback-material-uri=playback-url.mp4',
  '--video-alert-record-query-url=https://video.release.example/video/record/availability',
  '--video-record-coverage-query-url=https://video.release.example/video/record/availability',
  '--video-record-base-url=https://video.release.example/video/record',
  '--video-record-export-url=https://video.release.example/video/record/export',
  '--video-device-id=device-01',
  '--video-camera-id=camera-01',
  '--video-alert-time=2026-07-05 10:00:00',
  '--video-record-drift-retention-hours=24',
  '--video-manifest-verifier-script=.scripts/record-export-manifest-verifier.mjs',
  '--player-workbench-url=https://web.release.example/yfeieye/alert/review?token=command-secret&signature=cmd#frag',
  '--player-review-row-text=RV-20260705-001',
  '--player-action-testid=alert-review-detail-seek',
  '--player-expected-seek-time=2026-07-05T10:00:30',
  '--player-expected-record-path-contains=device-01',
  '--player-expected-offset-seconds=30',
  '--player-coverage-expected-seek-time=2026-07-05T10:00:00',
  '--player-coverage-expected-record-path-contains=device-01',
  '--player-coverage-expected-offset-seconds=0',
  '--player-case-timeline-expected-seek-time=2026-07-05T10:00:00',
  '--player-case-timeline-expected-record-path-contains=device-01',
  '--player-case-timeline-expected-offset-seconds=0',
  '--evidence-output-file=artifacts/review-production-smoke.json',
  '--player-wait-text=线索复核工作台',
], {});

assert.equal(parsed.deviceBaseUrl, 'https://device.release.example/api');
assert.equal(parsed.token, 'token-1');
assert.equal(parsed.operatorUserId, 9001);
assert.equal(parsed.deviceAlertTime, '2026-07-05T10:00:00');
assert.deepEqual(parsed.devicePlaybackAllowedCameraIds, ['camera-01']);
assert.deepEqual(parsed.devicePlaybackDeniedCameraIds, ['camera-02']);
assert.equal(parsed.devicePlaybackReviewItemId, 1001);
assert.equal(parsed.devicePlaybackReviewCaseId, 2001);
assert.equal(parsed.devicePlaybackMaterialUri, 'playback-url.mp4');
assert.equal(parsed.videoDeviceId, 'device-01');
assert.equal(parsed.videoCameraId, 'camera-01');
assert.equal(parsed.videoRecordDriftRetentionHours, 24);
assert.equal(parsed.videoManifestVerifierScript, '.scripts/record-export-manifest-verifier.mjs');
assert.equal(parsed.playerWorkbenchUrl, 'https://web.release.example/yfeieye/alert/review?token=command-secret&signature=cmd#frag');
assert.equal(parsed.playerExpectedOffsetSeconds, 30);
assert.equal(parsed.playerCoverageExpectedOffsetSeconds, 0);
assert.equal(parsed.playerCaseTimelineExpectedOffsetSeconds, 0);
assert.equal(parsed.evidenceOutputFile, 'artifacts/review-production-smoke.json');
assert.equal(parsed.allowLocalEndpoints, false);

assert.deepEqual(requiredOptionErrors({
  ...parsed,
  videoManifestVerifierScript: '',
}), [
  'missing --video-manifest-verifier-script or YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT',
]);

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
  '--player-coverage-expected-seek-time=2026-07-05T10:00:00',
  '--player-coverage-expected-record-path-contains=device-01',
  '--player-coverage-expected-offset-seconds=0',
  '--player-case-timeline-expected-seek-time=2026-07-05T10:00:00',
  '--player-case-timeline-expected-record-path-contains=device-01',
  '--player-case-timeline-expected-offset-seconds=0',
  '--evidence-output-file=artifacts/local-review-production-smoke.json',
  '--allow-local-endpoints',
], {});
assert.equal(localEndpointsAllowed.allowLocalEndpoints, true);
assert.deepEqual(requiredOptionErrors(localEndpointsAllowed), []);
assert.ok(
  buildSmokeSteps(localEndpointsAllowed, { nodePath: 'node', scriptDir: '.scripts' })[2].args.includes('--allow-local-endpoints'),
);
assert.ok(
  buildSmokeSteps(localEndpointsAllowed, { nodePath: 'node', scriptDir: '.scripts' })[3].args.includes('--allow-local-endpoints'),
);
assert.ok(
  buildSmokeSteps(localEndpointsAllowed, { nodePath: 'node', scriptDir: '.scripts' })[4].args.includes('--allow-local-endpoints'),
);
assert.ok(
  buildSmokeSteps(localEndpointsAllowed, { nodePath: 'node', scriptDir: '.scripts' })[5].args.includes('--allow-local-endpoints'),
);

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
  YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT: '.scripts/record-export-manifest-verifier.mjs',
  YFEIEYE_REVIEW_PLAYER_SMOKE_URL: 'https://web.env/review',
  YFEIEYE_REVIEW_PLAYER_SMOKE_ROW_TEXT: 'RV-ENV',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_SEEK_TIME: '2026-07-05T11:00:10',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_RECORD_PATH_CONTAINS: 'env-device',
  YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_OFFSET_SECONDS: '10',
  YFEIEYE_REVIEW_PLAYER_COVERAGE_EXPECTED_SEEK_TIME: '2026-07-05T11:00:00',
  YFEIEYE_REVIEW_PLAYER_COVERAGE_EXPECTED_RECORD_PATH_CONTAINS: 'env-device',
  YFEIEYE_REVIEW_PLAYER_COVERAGE_EXPECTED_OFFSET_SECONDS: '0',
  YFEIEYE_REVIEW_PLAYER_CASE_TIMELINE_EXPECTED_SEEK_TIME: '2026-07-05T11:00:00',
  YFEIEYE_REVIEW_PLAYER_CASE_TIMELINE_EXPECTED_RECORD_PATH_CONTAINS: 'env-device',
  YFEIEYE_REVIEW_PLAYER_CASE_TIMELINE_EXPECTED_OFFSET_SECONDS: '0',
  YFEIEYE_PRODUCTION_SMOKE_ALLOW_LOCAL_ENDPOINTS: 'true',
  YFEIEYE_PRODUCTION_SMOKE_EVIDENCE_FILE: 'artifacts/env-smoke.json',
});
assert.equal(fromEnv.deviceBaseUrl, 'https://device.env/admin-api');
assert.deepEqual(fromEnv.devicePlaybackAllowedCameraIds, ['env-camera-allow']);
assert.deepEqual(fromEnv.devicePlaybackDeniedCameraIds, ['env-camera-deny']);
assert.equal(fromEnv.videoDeviceId, 'env-device');
assert.equal(fromEnv.videoRecordDriftRetentionHours, 72);
assert.equal(fromEnv.videoManifestVerifierScript, '.scripts/record-export-manifest-verifier.mjs');
assert.equal(fromEnv.playerExpectedOffsetSeconds, 10);
assert.equal(fromEnv.playerCoverageExpectedOffsetSeconds, 0);
assert.equal(fromEnv.playerCaseTimelineExpectedOffsetSeconds, 0);
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
  'missing --video-manifest-verifier-script or YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT',
  'missing --player-workbench-url or YFEIEYE_REVIEW_PLAYER_SMOKE_URL',
  'missing --player-review-row-text or YFEIEYE_REVIEW_PLAYER_SMOKE_ROW_TEXT',
  'missing --player-expected-seek-time or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_SEEK_TIME',
  'missing --player-expected-record-path-contains or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_RECORD_PATH_CONTAINS',
  'missing --player-expected-offset-seconds or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_OFFSET_SECONDS',
  'missing --player-coverage-expected-seek-time or YFEIEYE_REVIEW_PLAYER_COVERAGE_EXPECTED_SEEK_TIME',
  'missing --player-coverage-expected-record-path-contains or YFEIEYE_REVIEW_PLAYER_COVERAGE_EXPECTED_RECORD_PATH_CONTAINS',
  'missing --player-coverage-expected-offset-seconds or YFEIEYE_REVIEW_PLAYER_COVERAGE_EXPECTED_OFFSET_SECONDS',
  'missing --player-case-timeline-expected-seek-time or YFEIEYE_REVIEW_PLAYER_CASE_TIMELINE_EXPECTED_SEEK_TIME',
  'missing --player-case-timeline-expected-record-path-contains or YFEIEYE_REVIEW_PLAYER_CASE_TIMELINE_EXPECTED_RECORD_PATH_CONTAINS',
  'missing --player-case-timeline-expected-offset-seconds or YFEIEYE_REVIEW_PLAYER_CASE_TIMELINE_EXPECTED_OFFSET_SECONDS',
  'missing --evidence-output-file or YFEIEYE_PRODUCTION_SMOKE_EVIDENCE_FILE',
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
  '--video-manifest-verifier-script=.scripts/record-export-manifest-verifier.mjs',
  '--player-workbench-url=http://localhost:5173/mock-workbench',
  '--player-review-row-text=RV-20260705-001',
  '--player-expected-seek-time=2026-07-05T10:00:30',
  '--player-expected-record-path-contains=device-01',
  '--player-expected-offset-seconds=30',
  '--player-coverage-expected-seek-time=2026-07-05T10:00:00',
  '--player-coverage-expected-record-path-contains=device-01',
  '--player-coverage-expected-offset-seconds=0',
  '--player-case-timeline-expected-seek-time=2026-07-05T10:00:00',
  '--player-case-timeline-expected-record-path-contains=device-01',
  '--player-case-timeline-expected-offset-seconds=0',
  '--evidence-output-file=artifacts/local-endpoint-rejection.json',
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
  pnpmPath: 'pnpm',
  scriptDir: '.scripts',
});
assert.deepEqual(steps.map((step) => step.name), [
  'W2:typecheck',
  'LiveDevice',
  'LiveVideo',
  'LivePlayer:detail',
  'LivePlayer:coverage',
  'LivePlayer:case-timeline',
]);
assert.deepEqual(steps[0].args, ['--dir', 'WEB', 'run', 'type:check']);
assert.deepEqual(steps[1].args.slice(0, 5), [
  '.scripts/alert-review-device-integration-smoke.mjs',
  '--device-base-url=https://device.release.example/api',
  '--token=token-1',
  '--operator-user-id=9001',
  '--alert-time=2026-07-05T10:00:00',
]);
assert.ok(steps[1].args.includes('--playback-allowed-camera-ids=camera-01'));
assert.ok(steps[1].args.includes('--playback-denied-camera-ids=camera-02'));
assert.ok(steps[1].args.includes('--playback-review-item-id=1001'));
assert.ok(steps[1].args.includes('--playback-review-case-id=2001'));
assert.ok(steps[1].args.includes('--playback-material-uri=playback-url.mp4'));
assert.ok(steps[2].args.includes('--record-export-url=https://video.release.example/video/record/export'));
assert.ok(steps[2].args.includes('--camera-id=camera-01'));
assert.ok(steps[2].args.includes('--record-drift-retention-hours=24'));
assert.ok(steps[2].args.includes('--manifest-verifier-script=.scripts/record-export-manifest-verifier.mjs'));
assert.ok(steps[3].args.includes('--action-testid=alert-review-detail-seek'));
assert.ok(steps[3].args.includes('--expected-offset-seconds=30'));
assert.ok(steps[4].args.includes('--action-testid=alert-review-coverage-seek'));
assert.ok(steps[4].args.includes('--expected-offset-seconds=0'));
assert.ok(steps[5].args.includes('--action-testid=alert-review-case-timeline-seek'));
assert.ok(steps[5].args.includes('--expected-offset-seconds=0'));
assert.equal(
  formatStepCommand(steps[1]),
  'node .scripts/alert-review-device-integration-smoke.mjs --device-base-url=https://device.release.example/api --token=*** --operator-user-id=9001 --alert-time=2026-07-05T10:00:00 --profile=device-video-web --playback-review-item-id=1001 --playback-review-case-id=2001 --playback-material-uri=playback-url.mp4 --playback-allowed-camera-ids=camera-01 --playback-denied-camera-ids=camera-02',
);

const help = spawnSync(process.execPath, ['.scripts/alert-review-production-smoke.mjs', '--help'], {
  encoding: 'utf8',
});
assert.equal(help.status, 0);
assert.match(help.stdout, /W2:typecheck -> LiveDevice -> LiveVideo -> LivePlayer:detail/);
assert.match(help.stdout, /full frontend typecheck/);
assert.match(help.stdout, /--pm-on-fail=ignore/);

const calls = [];
const smoke = await runProductionSmoke(parsed, {
  nodePath: 'node',
  scriptDir: '.scripts',
  writeFile: () => {},
  runCommand: async (step) => {
    calls.push(step.name);
    return { status: 0, stdout: summaryStdoutForStep(step.name) };
  },
});
assert.equal(smoke.ok, true);
assert.deepEqual(calls, ['W2:typecheck', 'LiveDevice', 'LiveVideo', 'LivePlayer:detail', 'LivePlayer:coverage', 'LivePlayer:case-timeline']);
assert.deepEqual(smoke.steps.map((step) => step.status), ['passed', 'passed', 'passed', 'passed', 'passed', 'passed']);

const pnpmGuardRetryCalls = [];
const pnpmGuardRetryWrites = [];
const pnpmGuardRetrySmoke = await runProductionSmoke({
  ...parsed,
  evidenceOutputFile: 'artifacts/pnpm-guard-retry.json',
}, {
  nodePath: 'node',
  scriptDir: '.scripts',
  writeFile: (file, content) => {
    pnpmGuardRetryWrites.push({ file, content });
  },
  runCommand: async (step) => {
    pnpmGuardRetryCalls.push({ name: step.name, args: step.args });
    if (step.name === 'W2:typecheck' && !step.args.includes('--pm-on-fail=ignore')) {
      return {
        status: 1,
        stderr: [
          '[ERROR] This project is configured to use 11.3.0 of pnpm. Your current pnpm is v11.5.2',
          'Corepack invoked pnpm with this version, and pnpm does not switch versions when running under corepack.',
          'If you want to bypass this version check, you can set the "pmOnFail" configuration to "warn" or "ignore"',
        ].join('\n'),
      };
    }
    return { status: 0, stdout: summaryStdoutForStep(step.name) };
  },
});
assert.equal(pnpmGuardRetrySmoke.ok, true);
assert.deepEqual(pnpmGuardRetryCalls.slice(0, 2), [
  { name: 'W2:typecheck', args: ['--dir', 'WEB', 'run', 'type:check'] },
  { name: 'W2:typecheck', args: ['--dir', 'WEB', '--pm-on-fail=ignore', 'run', 'type:check'] },
]);
assert.deepEqual(pnpmGuardRetryCalls.slice(2).map((call) => call.name), ['LiveDevice', 'LiveVideo', 'LivePlayer:detail', 'LivePlayer:coverage', 'LivePlayer:case-timeline']);
assert.equal(pnpmGuardRetryWrites.length, 1);
const pnpmGuardRetryReport = JSON.parse(pnpmGuardRetryWrites[0].content);
assert.equal(pnpmGuardRetryReport.steps[0].name, 'W2:typecheck');
assert.equal(pnpmGuardRetryReport.steps[0].summary.typecheckRetry.reason, 'pnpm_version_guard');
assert.match(pnpmGuardRetryReport.steps[0].summary.typecheckRetry.originalCommand, /^pnpm(\.cmd)? --dir WEB run type:check$/);
assert.match(pnpmGuardRetryReport.steps[0].summary.typecheckRetry.retryCommand, /^pnpm(\.cmd)? --dir WEB --pm-on-fail=ignore run type:check$/);

await assert.rejects(
  () => runProductionSmoke(parsed, {
    nodePath: 'node',
    scriptDir: '.scripts',
    writeFile: () => {},
    runCommand: async () => ({ status: 0 }),
  }),
  /production smoke step LiveDevice did not emit required evidence summary/,
);

await assert.rejects(
  () => runProductionSmoke(parsed, {
    nodePath: 'node',
    scriptDir: '.scripts',
    writeFile: () => {},
    runCommand: async (step) => ({
      status: 0,
      stdout: summaryStdoutForStep(step.name, {
        playerRecordPath: 'mock://record/device-01/20260705-100000.mp4',
      }),
    }),
  }),
  /production smoke step LivePlayer:detail used local\/mock player media evidence/,
);

const evidenceWrites = [];
const smokeWithEvidence = await runProductionSmoke({
  ...parsed,
  evidenceOutputFile: 'artifacts/review-smoke.json',
}, {
  nodePath: 'node',
  scriptDir: '.scripts',
  now: sequencedNow([
    '2026-07-07T00:00:00.000Z',
    '2026-07-07T00:00:00.050Z',
    '2026-07-07T00:00:00.100Z',
    '2026-07-07T00:00:00.200Z',
    '2026-07-07T00:00:00.400Z',
    '2026-07-07T00:00:00.500Z',
    '2026-07-07T00:00:01.000Z',
    '2026-07-07T00:00:01.100Z',
    '2026-07-07T00:00:01.800Z',
    '2026-07-07T00:00:01.900Z',
    '2026-07-07T00:00:02.200Z',
    '2026-07-07T00:00:02.300Z',
    '2026-07-07T00:00:02.800Z',
    '2026-07-07T00:00:03.000Z',
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
  "eventIds": [7500],
  "exportJobNo": "EXP-20260707-001",
  "manifestValid": true,
  "videoExportRequested": true,
  "playback": {
    "grantedDecision": "granted",
    "deniedDecision": "denied",
    "deniedReasons": ["camera_not_allowed"]
  },
  "checkpoints": [
    "ingest_review_item",
    "review_rule_saved",
    "record_coverage_synced",
    "review_case_created",
    "evidence_export_ready",
    "manifest_verified",
    "evidence_download_audited",
    "playback_url_granted",
    "playback_url_denied"
  ]
}
`
      : step.name === 'LiveVideo'
        ? `alert review VIDEO live smoke passed
{
  "checkpoints": [
    "alert_record_query_ok",
    "record_coverage_query_ok",
    "record_base_space_resolved",
    "record_storage_drift_patrol_ok",
    "record_export_posted",
    "record_export_download_ready",
    "record_export_download_probed",
    "record_export_manifest_verified"
  ],
  "storageDriftSummary": {
    "healthy": true,
    "recordCount": 3,
    "issueCount": 0,
    "issueReasons": {},
    "standardReasonKeys": ["file_missing", "retention_expired", "disk_full", "cache_flush_failed"]
  },
  "exportResult": {
    "exportId": "review-export-1",
    "downloadUrl": "/downloads/review-export-1.mp4",
    "manifestUrl": "/manifests/review-export-1.json"
  },
  "manifestSignature": {
    "algorithm": "hmac-sha256",
    "keyId": "2026-q2",
    "signatureVersion": "v2"
  },
  "manifestStorageLifecycle": {
    "storageType": "object_storage",
    "status": "persisted",
    "expiresAt": "2026-07-20T00:00:00Z",
    "exportPackageObjectKey": "review-export-1/content.bin"
  },
  "manifestVerification": {
    "valid": true,
    "signatureValid": true,
    "signatureKeyAvailable": true,
    "keyId": "2026-q2",
    "signatureVersion": "v2",
    "violations": []
  }
}
`
        : step.name === 'LivePlayer:coverage'
          ? `alert review player live smoke passed
{
  "clickedRow": true,
  "clickedAction": true,
  "seekTime": "2026-07-05T10:00:00",
  "recordPath": "https://media.example.test/records/device-01/20260705-100000.mp4",
  "currentUrl": "https://media.example.test/records/device-01/20260705-100000.mp4?token=coverage-secret",
  "playbackOffsetSeconds": 0,
  "nativeCurrentTime": 0.15
}
`
          : step.name === 'LivePlayer:case-timeline'
            ? `alert review player live smoke passed
{
  "clickedRow": true,
  "clickedAction": true,
  "seekTime": "2026-07-05T10:00:00",
  "recordPath": "https://media.example.test/records/device-01/20260705-100000.mp4",
  "currentUrl": "https://media.example.test/records/device-01/20260705-100000.mp4?token=case-secret",
  "playbackOffsetSeconds": 0,
  "nativeCurrentTime": 0
}
`
            : `alert review player live smoke passed
{
  "player": {
    "clickedRow": true,
    "clickedAction": true,
    "seekTime": "2026-07-05T10:00:30",
    "recordPath": "https://media.example.test/records/device-01/20260705-100000.mp4",
    "currentUrl": "https://media.example.test/records/device-01/20260705-100000.mp4?token=wrapped-media-secret&signature=abc#playback",
    "playbackOffsetSeconds": 30,
    "nativeCurrentTime": 30.25,
    "debugToken": "wrapped-debug-secret"
  }
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
assert.equal(evidenceReport.finishedAt, '2026-07-07T00:00:03.000Z');
assert.equal(evidenceReport.durationMs, 3000);
assert.equal(evidenceReport.allowLocalEndpoints, false);
assert.deepEqual(evidenceReport.steps.map((step) => step.status), ['passed', 'passed', 'passed', 'passed', 'passed', 'passed']);
assert.equal(evidenceReport.steps[0].name, 'W2:typecheck');
assert.match(evidenceReport.steps[0].command, /^pnpm(\.cmd)? --dir WEB run type:check$/);
assert.equal(evidenceReport.steps[1].command.includes('--token=***'), true);
assert.equal(evidenceReport.steps[3].command.includes('--workbench-url=https://web.release.example/yfeieye/alert/review '), true);
assert.deepEqual(evidenceReport.steps[1].summary, {
  checkpoints: [
    'ingest_review_item',
    'review_rule_saved',
    'record_coverage_synced',
    'review_case_created',
    'evidence_export_ready',
    'manifest_verified',
    'evidence_download_audited',
    'playback_url_granted',
    'playback_url_denied',
  ],
  playback: {
    grantedDecision: 'granted',
    deniedDecision: 'denied',
    deniedReasons: ['camera_not_allowed'],
  },
  status: 'passed',
  profile: 'device-video-web',
  reviewItemId: 1001,
  reviewCaseId: 2001,
  eventIds: [7500],
  exportJobNo: 'EXP-20260707-001',
  auditChain: {
    action: 'export_downloaded',
    reviewCaseId: 2001,
    reviewItemIds: [1001],
    eventIds: [7500],
    exportJobNo: 'EXP-20260707-001',
  },
  manifestValid: true,
  videoExportRequested: true,
});
assert.deepEqual(evidenceReport.steps[2].summary.storageDriftSummary, {
  healthy: true,
  recordCount: 3,
  issueCount: 0,
  issueReasons: {},
  standardReasonKeys: STANDARD_STORAGE_DRIFT_REASON_KEYS,
});
assert.deepEqual(evidenceReport.steps[2].summary.checkpoints, [
  'alert_record_query_ok',
  'record_coverage_query_ok',
  'record_base_space_resolved',
  'record_storage_drift_patrol_ok',
  'record_export_posted',
  'record_export_download_ready',
  'record_export_download_probed',
  'record_export_manifest_verified',
]);
assert.deepEqual(evidenceReport.steps[2].summary.manifestSignature, {
  algorithm: 'hmac-sha256',
  keyId: '2026-q2',
  signatureVersion: 'v2',
});
assert.deepEqual(evidenceReport.steps[2].summary.manifestStorageLifecycle, {
  storageType: 'object_storage',
  status: 'persisted',
  expiresAt: '2026-07-20T00:00:00Z',
  exportPackageObjectKey: 'review-export-1/content.bin',
});
assert.deepEqual(evidenceReport.steps[2].summary.manifestVerification, {
  valid: true,
  signatureValid: true,
  signatureKeyAvailable: true,
  keyId: '2026-q2',
  signatureVersion: 'v2',
  violations: [],
});
assert.deepEqual(evidenceReport.steps[3].summary.player, {
  entry: 'detail',
  actionTestId: 'alert-review-detail-seek',
  reviewRowText: 'RV-20260705-001',
  reviewItemId: 1001,
  reviewCaseId: 2001,
  expectedSeekTime: '2026-07-05T10:00:30',
  expectedRecordPathContains: 'device-01',
  expectedOffsetSeconds: 30,
  clickedRow: true,
  clickedAction: true,
  seekTime: '2026-07-05T10:00:30',
  recordPath: 'https://media.example.test/records/device-01/20260705-100000.mp4',
  currentUrl: 'https://media.example.test/records/device-01/20260705-100000.mp4',
  playbackOffsetSeconds: 30,
  nativeCurrentTime: 30.25,
});
assert.deepEqual(evidenceReport.steps[4].summary.player, {
  entry: 'coverage',
  actionTestId: 'alert-review-coverage-seek',
  reviewRowText: 'RV-20260705-001',
  reviewItemId: 1001,
  reviewCaseId: 2001,
  expectedSeekTime: '2026-07-05T10:00:00',
  expectedRecordPathContains: 'device-01',
  expectedOffsetSeconds: 0,
  clickedRow: true,
  clickedAction: true,
  seekTime: '2026-07-05T10:00:00',
  recordPath: 'https://media.example.test/records/device-01/20260705-100000.mp4',
  currentUrl: 'https://media.example.test/records/device-01/20260705-100000.mp4',
  playbackOffsetSeconds: 0,
  nativeCurrentTime: 0.15,
});
assert.deepEqual(evidenceReport.steps[5].summary.player, {
  entry: 'case-timeline',
  actionTestId: 'alert-review-case-timeline-seek',
  reviewRowText: 'RV-20260705-001',
  reviewItemId: 1001,
  reviewCaseId: 2001,
  expectedSeekTime: '2026-07-05T10:00:00',
  expectedRecordPathContains: 'device-01',
  expectedOffsetSeconds: 0,
  clickedRow: true,
  clickedAction: true,
  seekTime: '2026-07-05T10:00:00',
  recordPath: 'https://media.example.test/records/device-01/20260705-100000.mp4',
  currentUrl: 'https://media.example.test/records/device-01/20260705-100000.mp4',
  playbackOffsetSeconds: 0,
  nativeCurrentTime: 0,
});
assert.equal(evidenceReport.steps[2].stdout, undefined);
assert.equal(evidenceReport.steps[3].stdout, undefined);
assert.equal(evidenceReport.steps[4].stdout, undefined);
assert.equal(evidenceReport.steps[5].stdout, undefined);
assert.equal(JSON.stringify(evidenceReport).includes('token-1'), false);
assert.equal(JSON.stringify(evidenceReport).includes('command-secret'), false);
assert.equal(JSON.stringify(evidenceReport).includes('media-secret'), false);
assert.equal(JSON.stringify(evidenceReport).includes('wrapped-media-secret'), false);
assert.equal(JSON.stringify(evidenceReport).includes('wrapped-debug-secret'), false);
assert.equal(JSON.stringify(evidenceReport).includes('coverage-secret'), false);
assert.equal(JSON.stringify(evidenceReport).includes('case-secret'), false);

const failedEvidenceWrites = [];
await assert.rejects(
  () => runProductionSmoke(parsed, {
    nodePath: 'node',
    scriptDir: '.scripts',
    writeFile: () => {},
    runCommand: async (step) => ({ status: step.name === 'LiveVideo' ? 1 : 0, stdout: summaryStdoutForStep(step.name) }),
  }),
  /LiveVideo failed with exit code 1/,
);

await assert.rejects(
  () => runProductionSmoke(parsed, {
    nodePath: 'node',
    scriptDir: '.scripts',
    writeFile: () => {},
    runCommand: async (step) => ({
      status: 0,
      stdout: step.name === 'LiveDevice'
        ? JSON.stringify({
            status: 'passed',
            profile: 'device-video-web',
            reviewItemId: 1001,
            reviewCaseId: 2001,
            manifestValid: true,
            videoExportRequested: true,
            checkpoints: [
              'ingest_review_item',
              'review_rule_saved',
              'record_coverage_synced',
              'review_case_created',
              'evidence_export_ready',
              'manifest_verified',
              'evidence_download_audited',
              'playback_url_granted',
              'playback_url_denied',
            ],
          })
        : summaryStdoutForStep(step.name),
    }),
  }),
  /production smoke step LiveDevice missing auditChain exportJobNo evidence/,
);

await assert.rejects(
  () => runProductionSmoke(parsed, {
    nodePath: 'node',
    scriptDir: '.scripts',
    writeFile: () => {},
    runCommand: async (step) => {
      if (step.name !== 'LiveVideo') {
        return { status: 0, stdout: summaryStdoutForStep(step.name) };
      }
      return {
        status: 0,
        stdout: JSON.stringify({
          checkpoints: [
            'alert_record_query_ok',
            'record_coverage_query_ok',
            'record_base_space_resolved',
            'record_storage_drift_patrol_ok',
            'record_export_posted',
            'record_export_download_ready',
            'record_export_download_probed',
            'record_export_manifest_verified',
          ],
          storageDriftSummary: {
            healthy: true,
            recordCount: 3,
            issueCount: 0,
            issueReasons: {},
          },
          exportResult: {
            exportId: 'review-export-1',
            downloadUrl: '/downloads/review-export-1.mp4',
            manifestUrl: '/manifests/review-export-1.json',
          },
          manifestSignature: {
            algorithm: 'hmac-sha256',
            keyId: '2026-q2',
            signatureVersion: 'v2',
          },
          manifestStorageLifecycle: {
            storageType: 'object_storage',
            status: 'persisted',
            expiresAt: '2026-07-20T00:00:00Z',
            exportPackageObjectKey: 'review-export-1/content.bin',
          },
          manifestVerification: {
            valid: true,
            signatureValid: true,
            signatureKeyAvailable: true,
            keyId: '2026-q2',
            signatureVersion: 'v2',
            violations: [],
          },
        }),
      };
    },
  }),
  /production smoke step LiveVideo missing standard storage drift reason evidence: file_missing/,
);

await assert.rejects(
  () => runProductionSmoke(parsed, {
    nodePath: 'node',
    scriptDir: '.scripts',
    writeFile: () => {},
    runCommand: async (step) => {
      if (step.name !== 'LiveVideo') {
        return { status: 0, stdout: summaryStdoutForStep(step.name) };
      }
      return {
        status: 0,
        stdout: JSON.stringify({
          checkpoints: [
            'alert_record_query_ok',
            'record_coverage_query_ok',
            'record_base_space_resolved',
            'record_storage_drift_patrol_ok',
            'record_export_posted',
            'record_export_download_ready',
            'record_export_download_probed',
            'record_export_manifest_verified',
          ],
          storageDriftSummary: {
            healthy: true,
            recordCount: 3,
            issueCount: 0,
            issueReasons: {},
            standardReasonKeys: STANDARD_STORAGE_DRIFT_REASON_KEYS,
          },
          exportResult: {
            exportId: 'review-export-1',
            downloadUrl: '/downloads/review-export-1.mp4',
            manifestUrl: '/manifests/review-export-1.json',
          },
          manifestSignature: {
            algorithm: 'hmac-sha256',
            keyId: '2026-q2',
            signatureVersion: 'v2',
          },
          manifestStorageLifecycle: {
            storageType: 'object_storage',
            status: 'persisted',
            expiresAt: '2026-07-20T00:00:00Z',
            exportPackageObjectKey: 'review-export-1/content.bin',
          },
        }),
      };
    },
  }),
  /production smoke step LiveVideo missing valid manifest verifier evidence/,
);

await assert.rejects(
  () => runProductionSmoke(parsed, {
    nodePath: 'node',
    scriptDir: '.scripts',
    writeFile: () => {},
    runCommand: async (step) => {
      if (step.name !== 'LiveVideo') {
        return { status: 0, stdout: summaryStdoutForStep(step.name) };
      }
      return {
        status: 0,
        stdout: JSON.stringify({
          checkpoints: [
            'alert_record_query_ok',
            'record_coverage_query_ok',
            'record_base_space_resolved',
            'record_storage_drift_patrol_ok',
            'record_export_posted',
            'record_export_download_ready',
            'record_export_download_probed',
            'record_export_manifest_verified',
          ],
          storageDriftSummary: {
            healthy: true,
            recordCount: 3,
            issueCount: 0,
            issueReasons: {},
            standardReasonKeys: STANDARD_STORAGE_DRIFT_REASON_KEYS,
          },
          exportResult: {
            exportId: 'review-export-1',
            downloadUrl: '/downloads/review-export-1.mp4',
            manifestUrl: '/manifests/review-export-1.json',
          },
          manifestSignature: {
            algorithm: 'hmac-sha256',
            keyId: '2026-q2',
            signatureVersion: 'v2',
          },
          manifestStorageLifecycle: {
            storageType: 'object_storage',
            status: 'persisted',
            expiresAt: '2026-07-20T00:00:00Z',
            exportPackageObjectKey: 'review-export-1/content.bin',
          },
          manifestVerification: {
            valid: true,
            signatureValid: false,
            signatureKeyAvailable: false,
            keyId: '2026-q2',
            signatureVersion: 'v2',
            violations: [],
          },
        }),
      };
    },
  }),
  /production smoke step LiveVideo missing HMAC manifest verifier signature evidence/,
);

await assert.rejects(
  () => runProductionSmoke(parsed, {
    nodePath: 'node',
    scriptDir: '.scripts',
    writeFile: () => {},
    runCommand: async (step) => {
      if (step.name !== 'LiveVideo') {
        return { status: 0, stdout: summaryStdoutForStep(step.name) };
      }
      return {
        status: 0,
        stdout: JSON.stringify({
          checkpoints: [
            'alert_record_query_ok',
            'record_coverage_query_ok',
            'record_base_space_resolved',
            'record_storage_drift_patrol_ok',
            'record_export_posted',
            'record_export_download_ready',
            'record_export_download_probed',
            'record_export_manifest_verified',
          ],
          storageDriftSummary: {
            healthy: true,
            recordCount: 3,
            issueCount: 0,
            issueReasons: {},
            standardReasonKeys: STANDARD_STORAGE_DRIFT_REASON_KEYS,
          },
          exportResult: {
            exportId: 'review-export-1',
            downloadUrl: '/downloads/review-export-1.mp4',
            manifestUrl: '/manifests/review-export-1.json',
          },
          manifestSignature: {
            algorithm: 'hmac-sha256',
            keyId: '2026-q2',
            signatureVersion: 'v2',
          },
          manifestVerification: {
            valid: true,
            signatureValid: true,
            signatureKeyAvailable: true,
            keyId: '2026-q2',
            signatureVersion: 'v2',
            violations: [],
          },
        }),
      };
    },
  }),
  /production smoke step LiveVideo missing persisted manifest storage lifecycle evidence/,
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
      '2026-07-07T00:00:00.050Z',
      '2026-07-07T00:00:00.100Z',
      '2026-07-07T00:00:00.200Z',
      '2026-07-07T00:00:00.400Z',
      '2026-07-07T00:00:00.500Z',
      '2026-07-07T00:00:00.800Z',
      '2026-07-07T00:00:00.900Z',
    ]),
    writeFile: (file, content) => {
      failedEvidenceWrites.push({ file, content });
    },
    runCommand: async (step) => ({ status: step.name === 'LiveVideo' ? 2 : 0, stdout: summaryStdoutForStep(step.name) }),
  }),
  /LiveVideo failed with exit code 2/,
);
assert.equal(failedEvidenceWrites.length, 1);
assert.equal(failedEvidenceWrites[0].file, 'artifacts/review-smoke-failed.json');
const failedEvidenceReport = JSON.parse(failedEvidenceWrites[0].content);
assert.equal(failedEvidenceReport.ok, false);
assert.equal(failedEvidenceReport.status, 'failed');
assert.equal(failedEvidenceReport.finishedAt, '2026-07-07T00:00:00.900Z');
assert.deepEqual(failedEvidenceReport.steps.map((step) => step.status), ['passed', 'passed', 'failed']);
assert.equal(failedEvidenceReport.steps[2].name, 'LiveVideo');
assert.equal(failedEvidenceReport.steps[2].exitCode, 2);
assert.equal(failedEvidenceReport.steps[2].error, 'LiveVideo failed with exit code 2');
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

function summaryStdoutForStep(name, options = {}) {
  const playerRecordPath = options.playerRecordPath || 'https://media.example.test/records/device-01/20260705-100000.mp4';
  if (name === 'LiveDevice') {
    return JSON.stringify({
      status: 'passed',
      profile: 'device-video-web',
      reviewItemId: 1001,
      reviewCaseId: 2001,
      eventIds: [7500],
      exportJobNo: 'EXP-20260707-001',
      manifestValid: true,
      videoExportRequested: true,
      checkpoints: [
        'ingest_review_item',
        'review_rule_saved',
        'record_coverage_synced',
        'review_case_created',
        'evidence_export_ready',
        'manifest_verified',
        'evidence_download_audited',
        'playback_url_granted',
        'playback_url_denied',
      ],
    });
  }
  if (name === 'LiveVideo') {
    return JSON.stringify({
      checkpoints: [
        'alert_record_query_ok',
        'record_coverage_query_ok',
        'record_base_space_resolved',
        'record_storage_drift_patrol_ok',
        'record_export_posted',
        'record_export_download_ready',
        'record_export_download_probed',
        'record_export_manifest_verified',
      ],
      storageDriftSummary: {
        healthy: true,
        recordCount: 3,
        issueCount: 0,
        issueReasons: {},
        standardReasonKeys: STANDARD_STORAGE_DRIFT_REASON_KEYS,
      },
      exportResult: {
        exportId: 'review-export-1',
        downloadUrl: '/downloads/review-export-1.mp4',
        manifestUrl: '/manifests/review-export-1.json',
      },
      manifestSignature: {
        algorithm: 'hmac-sha256',
        keyId: '2026-q2',
        signatureVersion: 'v2',
      },
      manifestStorageLifecycle: {
        storageType: 'object_storage',
        status: 'persisted',
        expiresAt: '2026-07-20T00:00:00Z',
        exportPackageObjectKey: 'review-export-1/content.bin',
      },
      manifestVerification: {
        valid: true,
        signatureValid: true,
        signatureKeyAvailable: true,
        keyId: '2026-q2',
        signatureVersion: 'v2',
        verifier: 'record-export-manifest-verifier',
        canonicalHash: 'sha256:manifest',
      },
    });
  }
  if (name === 'LivePlayer:coverage' || name === 'LivePlayer:case-timeline') {
    return JSON.stringify({
      clickedRow: true,
      clickedAction: true,
      seekTime: '2026-07-05T10:00:00',
      recordPath: playerRecordPath,
      playbackOffsetSeconds: 0,
    });
  }
  if (name === 'LivePlayer:detail') {
    return JSON.stringify({
      clickedRow: true,
      clickedAction: true,
      seekTime: '2026-07-05T10:00:30',
      recordPath: playerRecordPath,
      playbackOffsetSeconds: 30,
    });
  }
  return '';
}

function sequencedNow(values) {
  let index = 0;
  return () => new Date(values[Math.min(index++, values.length - 1)]);
}

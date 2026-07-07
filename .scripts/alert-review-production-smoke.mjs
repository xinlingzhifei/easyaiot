import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function parseArgs(args, env = process.env) {
  const parsed = {
    deviceBaseUrl: env.YFEIEYE_DEVICE_BASE_URL || '',
    token: env.YFEIEYE_DEVICE_AUTH_TOKEN || '',
    operatorUserId: numberOrNaN(env.YFEIEYE_DEVICE_SMOKE_OPERATOR_USER_ID),
    deviceAlertTime: env.YFEIEYE_DEVICE_SMOKE_ALERT_TIME || '',
    deviceProfile: env.YFEIEYE_DEVICE_SMOKE_PROFILE || 'release',
    devicePlaybackReviewItemId: numberOrNaN(env.YFEIEYE_DEVICE_PLAYBACK_REVIEW_ITEM_ID),
    devicePlaybackReviewCaseId: numberOrNaN(env.YFEIEYE_DEVICE_PLAYBACK_REVIEW_CASE_ID),
    devicePlaybackMaterialUri: env.YFEIEYE_DEVICE_PLAYBACK_MATERIAL_URI || '',
    devicePlaybackAllowedCameraIds: parseCsvList(env.YFEIEYE_DEVICE_PLAYBACK_ALLOWED_CAMERA_IDS),
    devicePlaybackDeniedCameraIds: parseCsvList(env.YFEIEYE_DEVICE_PLAYBACK_DENIED_CAMERA_IDS),
    devicePlaybackReason: env.YFEIEYE_DEVICE_PLAYBACK_REASON || '',
    videoAlertRecordQueryUrl: env.YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL || '',
    videoRecordCoverageQueryUrl: env.YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL || '',
    videoRecordBaseUrl: env.YFEIEYE_VIDEO_RECORD_BASE_URL || '',
    videoRecordExportUrl: env.YFEIEYE_VIDEO_RECORD_EXPORT_URL || '',
    videoDeviceId: env.YFEIEYE_VIDEO_SMOKE_DEVICE_ID || '',
    videoCameraId: env.YFEIEYE_VIDEO_SMOKE_CAMERA_ID || '',
    videoAlertTime: env.YFEIEYE_VIDEO_SMOKE_ALERT_TIME || '',
    playerWorkbenchUrl: env.YFEIEYE_REVIEW_PLAYER_SMOKE_URL || '',
    playerReviewRowText: env.YFEIEYE_REVIEW_PLAYER_SMOKE_ROW_TEXT || '',
    playerActionTestId: env.YFEIEYE_REVIEW_PLAYER_SMOKE_ACTION_TESTID || 'alert-review-detail-seek',
    playerExpectedSeekTime: env.YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_SEEK_TIME || '',
    playerExpectedRecordPathContains: env.YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_RECORD_PATH_CONTAINS || '',
    playerExpectedOffsetSeconds: numberOrNaN(env.YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_OFFSET_SECONDS),
    playerWaitText: env.YFEIEYE_REVIEW_PLAYER_SMOKE_WAIT_TEXT || '',
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg.startsWith('--device-base-url=')) {
      parsed.deviceBaseUrl = arg.slice('--device-base-url='.length);
    } else if (arg.startsWith('--token=')) {
      parsed.token = arg.slice('--token='.length);
    } else if (arg.startsWith('--operator-user-id=')) {
      parsed.operatorUserId = numberOrNaN(arg.slice('--operator-user-id='.length));
    } else if (arg.startsWith('--device-alert-time=')) {
      parsed.deviceAlertTime = arg.slice('--device-alert-time='.length);
    } else if (arg.startsWith('--device-profile=')) {
      parsed.deviceProfile = arg.slice('--device-profile='.length);
    } else if (arg.startsWith('--device-playback-review-item-id=')) {
      parsed.devicePlaybackReviewItemId = numberOrNaN(arg.slice('--device-playback-review-item-id='.length));
    } else if (arg.startsWith('--device-playback-review-case-id=')) {
      parsed.devicePlaybackReviewCaseId = numberOrNaN(arg.slice('--device-playback-review-case-id='.length));
    } else if (arg.startsWith('--device-playback-material-uri=')) {
      parsed.devicePlaybackMaterialUri = arg.slice('--device-playback-material-uri='.length);
    } else if (arg.startsWith('--device-playback-allowed-camera-ids=')) {
      parsed.devicePlaybackAllowedCameraIds = parseCsvList(arg.slice('--device-playback-allowed-camera-ids='.length));
    } else if (arg.startsWith('--device-playback-denied-camera-ids=')) {
      parsed.devicePlaybackDeniedCameraIds = parseCsvList(arg.slice('--device-playback-denied-camera-ids='.length));
    } else if (arg.startsWith('--device-playback-reason=')) {
      parsed.devicePlaybackReason = arg.slice('--device-playback-reason='.length);
    } else if (arg.startsWith('--video-alert-record-query-url=')) {
      parsed.videoAlertRecordQueryUrl = arg.slice('--video-alert-record-query-url='.length);
    } else if (arg.startsWith('--video-record-coverage-query-url=')) {
      parsed.videoRecordCoverageQueryUrl = arg.slice('--video-record-coverage-query-url='.length);
    } else if (arg.startsWith('--video-record-base-url=')) {
      parsed.videoRecordBaseUrl = arg.slice('--video-record-base-url='.length);
    } else if (arg.startsWith('--video-record-export-url=')) {
      parsed.videoRecordExportUrl = arg.slice('--video-record-export-url='.length);
    } else if (arg.startsWith('--video-device-id=')) {
      parsed.videoDeviceId = arg.slice('--video-device-id='.length);
    } else if (arg.startsWith('--video-camera-id=')) {
      parsed.videoCameraId = arg.slice('--video-camera-id='.length);
    } else if (arg.startsWith('--video-alert-time=')) {
      parsed.videoAlertTime = arg.slice('--video-alert-time='.length);
    } else if (arg.startsWith('--player-workbench-url=')) {
      parsed.playerWorkbenchUrl = arg.slice('--player-workbench-url='.length);
    } else if (arg.startsWith('--player-review-row-text=')) {
      parsed.playerReviewRowText = arg.slice('--player-review-row-text='.length);
    } else if (arg.startsWith('--player-action-testid=')) {
      parsed.playerActionTestId = arg.slice('--player-action-testid='.length);
    } else if (arg.startsWith('--player-expected-seek-time=')) {
      parsed.playerExpectedSeekTime = arg.slice('--player-expected-seek-time='.length);
    } else if (arg.startsWith('--player-expected-record-path-contains=')) {
      parsed.playerExpectedRecordPathContains = arg.slice('--player-expected-record-path-contains='.length);
    } else if (arg.startsWith('--player-expected-offset-seconds=')) {
      parsed.playerExpectedOffsetSeconds = numberOrNaN(arg.slice('--player-expected-offset-seconds='.length));
    } else if (arg.startsWith('--player-wait-text=')) {
      parsed.playerWaitText = arg.slice('--player-wait-text='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

export function requiredOptionErrors(options) {
  const errors = [];
  requireText(errors, options.deviceBaseUrl, 'missing --device-base-url or YFEIEYE_DEVICE_BASE_URL');
  requireText(errors, options.token, 'missing --token or YFEIEYE_DEVICE_AUTH_TOKEN');
  requirePositiveNumber(errors, options.operatorUserId, 'missing --operator-user-id or YFEIEYE_DEVICE_SMOKE_OPERATOR_USER_ID');
  requireText(errors, options.deviceAlertTime, 'missing --device-alert-time or YFEIEYE_DEVICE_SMOKE_ALERT_TIME');
  requireList(errors, options.devicePlaybackAllowedCameraIds, 'missing --device-playback-allowed-camera-ids or YFEIEYE_DEVICE_PLAYBACK_ALLOWED_CAMERA_IDS');
  requireList(errors, options.devicePlaybackDeniedCameraIds, 'missing --device-playback-denied-camera-ids or YFEIEYE_DEVICE_PLAYBACK_DENIED_CAMERA_IDS');
  requireText(errors, options.videoAlertRecordQueryUrl, 'missing --video-alert-record-query-url or YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL');
  requireText(errors, options.videoRecordCoverageQueryUrl, 'missing --video-record-coverage-query-url or YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL');
  requireText(errors, options.videoRecordBaseUrl, 'missing --video-record-base-url or YFEIEYE_VIDEO_RECORD_BASE_URL');
  requireText(errors, options.videoRecordExportUrl, 'missing --video-record-export-url or YFEIEYE_VIDEO_RECORD_EXPORT_URL');
  requireText(errors, options.videoDeviceId, 'missing --video-device-id or YFEIEYE_VIDEO_SMOKE_DEVICE_ID');
  requireText(errors, options.videoAlertTime, 'missing --video-alert-time or YFEIEYE_VIDEO_SMOKE_ALERT_TIME');
  requireText(errors, options.playerWorkbenchUrl, 'missing --player-workbench-url or YFEIEYE_REVIEW_PLAYER_SMOKE_URL');
  requireText(errors, options.playerReviewRowText, 'missing --player-review-row-text or YFEIEYE_REVIEW_PLAYER_SMOKE_ROW_TEXT');
  requireText(errors, options.playerExpectedSeekTime, 'missing --player-expected-seek-time or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_SEEK_TIME');
  requireText(errors, options.playerExpectedRecordPathContains, 'missing --player-expected-record-path-contains or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_RECORD_PATH_CONTAINS');
  requirePositiveNumber(errors, options.playerExpectedOffsetSeconds, 'missing --player-expected-offset-seconds or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_OFFSET_SECONDS');
  return errors;
}

export function buildSmokeSteps(options, runtime = {}) {
  const nodePath = runtime.nodePath || process.execPath;
  const scriptDir = runtime.scriptDir || '.scripts';
  return [
    {
      name: 'LiveDevice',
      command: nodePath,
      args: compact([
        `${scriptDir}/alert-review-device-integration-smoke.mjs`,
        `--device-base-url=${options.deviceBaseUrl}`,
        `--token=${options.token}`,
        `--operator-user-id=${options.operatorUserId}`,
        `--alert-time=${options.deviceAlertTime}`,
        `--profile=${options.deviceProfile}`,
        positiveNumberArg('--playback-review-item-id', options.devicePlaybackReviewItemId),
        positiveNumberArg('--playback-review-case-id', options.devicePlaybackReviewCaseId),
        hasText(options.devicePlaybackMaterialUri) ? `--playback-material-uri=${options.devicePlaybackMaterialUri}` : '',
        cameraListArg('--playback-allowed-camera-ids', options.devicePlaybackAllowedCameraIds),
        cameraListArg('--playback-denied-camera-ids', options.devicePlaybackDeniedCameraIds),
        hasText(options.devicePlaybackReason) ? `--playback-reason=${options.devicePlaybackReason}` : '',
      ]),
    },
    {
      name: 'LiveVideo',
      command: nodePath,
      args: compact([
        `${scriptDir}/alert-review-video-live-smoke.mjs`,
        `--alert-record-query-url=${options.videoAlertRecordQueryUrl}`,
        `--record-coverage-query-url=${options.videoRecordCoverageQueryUrl}`,
        `--record-base-url=${options.videoRecordBaseUrl}`,
        `--record-export-url=${options.videoRecordExportUrl}`,
        `--device-id=${options.videoDeviceId}`,
        hasText(options.videoCameraId) ? `--camera-id=${options.videoCameraId}` : '',
        `--alert-time=${options.videoAlertTime}`,
      ]),
    },
    {
      name: 'LivePlayer',
      command: nodePath,
      args: compact([
        `${scriptDir}/alert-review-player-live-smoke.mjs`,
        `--workbench-url=${options.playerWorkbenchUrl}`,
        `--review-row-text=${options.playerReviewRowText}`,
        `--action-testid=${options.playerActionTestId}`,
        `--expected-seek-time=${options.playerExpectedSeekTime}`,
        `--expected-record-path-contains=${options.playerExpectedRecordPathContains}`,
        `--expected-offset-seconds=${options.playerExpectedOffsetSeconds}`,
        hasText(options.playerWaitText) ? `--wait-text=${options.playerWaitText}` : '',
      ]),
    },
  ];
}

export async function runProductionSmoke(options, dependencies = {}) {
  const errors = requiredOptionErrors(options);
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
  const steps = buildSmokeSteps(options, dependencies);
  const runCommand = dependencies.runCommand || defaultRunCommand;
  const results = [];
  for (const step of steps) {
    const result = await runCommand(step);
    const status = Number(result?.status ?? 1);
    if (status !== 0) {
      throw new Error(`${step.name} failed with exit code ${status}`);
    }
    results.push({
      name: step.name,
      status: 'passed',
    });
  }
  return {
    ok: true,
    steps: results,
  };
}

export function formatStepCommand(step) {
  return `${step.command} ${step.args.map(maskSensitiveArg).join(' ')}`;
}

function defaultRunCommand(step) {
  console.log(`running ${step.name}: ${formatStepCommand(step)}`);
  return spawnSync(step.command, step.args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    windowsHide: true,
  });
}

function maskSensitiveArg(arg) {
  return String(arg).startsWith('--token=') ? '--token=***' : arg;
}

function requireText(errors, value, message) {
  if (!hasText(value)) {
    errors.push(message);
  }
}

function requirePositiveNumber(errors, value, message) {
  if (!Number.isFinite(value) || value <= 0) {
    errors.push(message);
  }
}

function requireList(errors, values, message) {
  if (!Array.isArray(values) || values.length === 0) {
    errors.push(message);
  }
}

function positiveNumberArg(name, value) {
  return Number.isFinite(value) && value > 0 ? `${name}=${value}` : '';
}

function cameraListArg(name, values) {
  return Array.isArray(values) && values.length > 0 ? `${name}=${values.join(',')}` : '';
}

function compact(values) {
  return values.filter((value) => value !== undefined && value !== null && String(value) !== '');
}

function hasText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function numberOrNaN(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return Number.NaN;
  }
  return Number(value);
}

function parseCsvList(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return [];
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function printHelp() {
  console.log(`Usage: node .scripts/alert-review-production-smoke.mjs \\
  --device-base-url=http://DEVICE/admin-api --token=JWT_TOKEN \\
  --operator-user-id=9200 --device-alert-time="2026-07-05T10:00:00" \\
  --device-playback-allowed-camera-ids=camera-01 --device-playback-denied-camera-ids=camera-02 \\
  --video-alert-record-query-url=http://VIDEO/video/record/availability \\
  --video-record-coverage-query-url=http://VIDEO/video/record/availability \\
  --video-record-base-url=http://VIDEO/video/record \\
  --video-record-export-url=http://VIDEO/video/record/export \\
  --video-device-id=DEVICE_ID --video-alert-time="2026-07-05 10:00:00" \\
  --player-workbench-url=http://WEB/... --player-review-row-text=RV-... \\
  --player-expected-seek-time="2026-07-05T10:00:30" \\
  --player-expected-record-path-contains=DEVICE_ID \\
  --player-expected-offset-seconds=30

Runs the release FR-32 production smoke in order:
LiveDevice -> LiveVideo -> LivePlayer. Each step uses real deployed services,
real recording metadata, export verification, download audit, playback-url
allow/deny authorization, and player seek assertions from the dedicated smoke
scripts.`);
}

async function runCli() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const result = await runProductionSmoke(options);
  console.log('alert review production smoke passed');
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

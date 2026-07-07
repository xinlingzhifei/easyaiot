import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
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
    videoRecordDriftRetentionHours: numberOrNaN(env.YFEIEYE_VIDEO_RECORD_DRIFT_RETENTION_HOURS),
    playerWorkbenchUrl: env.YFEIEYE_REVIEW_PLAYER_SMOKE_URL || '',
    playerReviewRowText: env.YFEIEYE_REVIEW_PLAYER_SMOKE_ROW_TEXT || '',
    playerActionTestId: env.YFEIEYE_REVIEW_PLAYER_SMOKE_ACTION_TESTID || 'alert-review-detail-seek',
    playerExpectedSeekTime: env.YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_SEEK_TIME || '',
    playerExpectedRecordPathContains: env.YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_RECORD_PATH_CONTAINS || '',
    playerExpectedOffsetSeconds: numberOrNaN(env.YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_OFFSET_SECONDS),
    playerCoverageActionTestId: env.YFEIEYE_REVIEW_PLAYER_COVERAGE_ACTION_TESTID || 'alert-review-coverage-seek',
    playerCoverageExpectedSeekTime: env.YFEIEYE_REVIEW_PLAYER_COVERAGE_EXPECTED_SEEK_TIME || '',
    playerCoverageExpectedRecordPathContains: env.YFEIEYE_REVIEW_PLAYER_COVERAGE_EXPECTED_RECORD_PATH_CONTAINS || '',
    playerCoverageExpectedOffsetSeconds: numberOrNaN(env.YFEIEYE_REVIEW_PLAYER_COVERAGE_EXPECTED_OFFSET_SECONDS),
    playerCaseTimelineActionTestId: env.YFEIEYE_REVIEW_PLAYER_CASE_TIMELINE_ACTION_TESTID || 'alert-review-case-timeline-seek',
    playerCaseTimelineExpectedSeekTime: env.YFEIEYE_REVIEW_PLAYER_CASE_TIMELINE_EXPECTED_SEEK_TIME || '',
    playerCaseTimelineExpectedRecordPathContains: env.YFEIEYE_REVIEW_PLAYER_CASE_TIMELINE_EXPECTED_RECORD_PATH_CONTAINS || '',
    playerCaseTimelineExpectedOffsetSeconds: numberOrNaN(env.YFEIEYE_REVIEW_PLAYER_CASE_TIMELINE_EXPECTED_OFFSET_SECONDS),
    playerWaitText: env.YFEIEYE_REVIEW_PLAYER_SMOKE_WAIT_TEXT || '',
    allowLocalEndpoints: parseBoolean(env.YFEIEYE_PRODUCTION_SMOKE_ALLOW_LOCAL_ENDPOINTS, false),
    evidenceOutputFile: env.YFEIEYE_PRODUCTION_SMOKE_EVIDENCE_FILE || '',
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--allow-local-endpoints') {
      parsed.allowLocalEndpoints = true;
    } else if (arg.startsWith('--evidence-output-file=')) {
      parsed.evidenceOutputFile = arg.slice('--evidence-output-file='.length);
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
    } else if (arg.startsWith('--video-record-drift-retention-hours=')) {
      parsed.videoRecordDriftRetentionHours = numberOrNaN(arg.slice('--video-record-drift-retention-hours='.length));
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
    } else if (arg.startsWith('--player-coverage-action-testid=')) {
      parsed.playerCoverageActionTestId = arg.slice('--player-coverage-action-testid='.length);
    } else if (arg.startsWith('--player-coverage-expected-seek-time=')) {
      parsed.playerCoverageExpectedSeekTime = arg.slice('--player-coverage-expected-seek-time='.length);
    } else if (arg.startsWith('--player-coverage-expected-record-path-contains=')) {
      parsed.playerCoverageExpectedRecordPathContains = arg.slice('--player-coverage-expected-record-path-contains='.length);
    } else if (arg.startsWith('--player-coverage-expected-offset-seconds=')) {
      parsed.playerCoverageExpectedOffsetSeconds = numberOrNaN(arg.slice('--player-coverage-expected-offset-seconds='.length));
    } else if (arg.startsWith('--player-case-timeline-action-testid=')) {
      parsed.playerCaseTimelineActionTestId = arg.slice('--player-case-timeline-action-testid='.length);
    } else if (arg.startsWith('--player-case-timeline-expected-seek-time=')) {
      parsed.playerCaseTimelineExpectedSeekTime = arg.slice('--player-case-timeline-expected-seek-time='.length);
    } else if (arg.startsWith('--player-case-timeline-expected-record-path-contains=')) {
      parsed.playerCaseTimelineExpectedRecordPathContains = arg.slice('--player-case-timeline-expected-record-path-contains='.length);
    } else if (arg.startsWith('--player-case-timeline-expected-offset-seconds=')) {
      parsed.playerCaseTimelineExpectedOffsetSeconds = numberOrNaN(arg.slice('--player-case-timeline-expected-offset-seconds='.length));
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
  requirePositiveNumber(errors, options.videoRecordDriftRetentionHours, 'missing --video-record-drift-retention-hours or YFEIEYE_VIDEO_RECORD_DRIFT_RETENTION_HOURS');
  requireText(errors, options.playerWorkbenchUrl, 'missing --player-workbench-url or YFEIEYE_REVIEW_PLAYER_SMOKE_URL');
  requireText(errors, options.playerReviewRowText, 'missing --player-review-row-text or YFEIEYE_REVIEW_PLAYER_SMOKE_ROW_TEXT');
  requireText(errors, options.playerExpectedSeekTime, 'missing --player-expected-seek-time or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_SEEK_TIME');
  requireText(errors, options.playerExpectedRecordPathContains, 'missing --player-expected-record-path-contains or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_RECORD_PATH_CONTAINS');
  requireNonNegativeNumber(errors, options.playerExpectedOffsetSeconds, 'missing --player-expected-offset-seconds or YFEIEYE_REVIEW_PLAYER_SMOKE_EXPECTED_OFFSET_SECONDS');
  requireText(errors, options.playerCoverageExpectedSeekTime, 'missing --player-coverage-expected-seek-time or YFEIEYE_REVIEW_PLAYER_COVERAGE_EXPECTED_SEEK_TIME');
  requireText(errors, options.playerCoverageExpectedRecordPathContains, 'missing --player-coverage-expected-record-path-contains or YFEIEYE_REVIEW_PLAYER_COVERAGE_EXPECTED_RECORD_PATH_CONTAINS');
  requireNonNegativeNumber(errors, options.playerCoverageExpectedOffsetSeconds, 'missing --player-coverage-expected-offset-seconds or YFEIEYE_REVIEW_PLAYER_COVERAGE_EXPECTED_OFFSET_SECONDS');
  requireText(errors, options.playerCaseTimelineExpectedSeekTime, 'missing --player-case-timeline-expected-seek-time or YFEIEYE_REVIEW_PLAYER_CASE_TIMELINE_EXPECTED_SEEK_TIME');
  requireText(errors, options.playerCaseTimelineExpectedRecordPathContains, 'missing --player-case-timeline-expected-record-path-contains or YFEIEYE_REVIEW_PLAYER_CASE_TIMELINE_EXPECTED_RECORD_PATH_CONTAINS');
  requireNonNegativeNumber(errors, options.playerCaseTimelineExpectedOffsetSeconds, 'missing --player-case-timeline-expected-offset-seconds or YFEIEYE_REVIEW_PLAYER_CASE_TIMELINE_EXPECTED_OFFSET_SECONDS');
  if (!options.allowLocalEndpoints) {
    requireReleaseEndpoint(errors, '--device-base-url', options.deviceBaseUrl);
    requireReleaseEndpoint(errors, '--video-alert-record-query-url', options.videoAlertRecordQueryUrl);
    requireReleaseEndpoint(errors, '--video-record-coverage-query-url', options.videoRecordCoverageQueryUrl);
    requireReleaseEndpoint(errors, '--video-record-base-url', options.videoRecordBaseUrl);
    requireReleaseEndpoint(errors, '--video-record-export-url', options.videoRecordExportUrl);
    requireReleaseEndpoint(errors, '--player-workbench-url', options.playerWorkbenchUrl);
  }
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
        `--record-drift-retention-hours=${options.videoRecordDriftRetentionHours}`,
        options.allowLocalEndpoints ? '--allow-local-endpoints' : '',
      ]),
    },
    ...buildPlayerSmokeSteps(options, nodePath, scriptDir),
  ];
}

function buildPlayerSmokeSteps(options, nodePath, scriptDir) {
  return [
    playerSmokeStep('LivePlayer:detail', options.playerActionTestId, options.playerExpectedSeekTime, options.playerExpectedRecordPathContains, options.playerExpectedOffsetSeconds, options, nodePath, scriptDir),
    playerSmokeStep('LivePlayer:coverage', options.playerCoverageActionTestId, options.playerCoverageExpectedSeekTime, options.playerCoverageExpectedRecordPathContains, options.playerCoverageExpectedOffsetSeconds, options, nodePath, scriptDir),
    playerSmokeStep('LivePlayer:case-timeline', options.playerCaseTimelineActionTestId, options.playerCaseTimelineExpectedSeekTime, options.playerCaseTimelineExpectedRecordPathContains, options.playerCaseTimelineExpectedOffsetSeconds, options, nodePath, scriptDir),
  ];
}

function playerSmokeStep(name, actionTestId, expectedSeekTime, expectedRecordPathContains, expectedOffsetSeconds, options, nodePath, scriptDir) {
  return {
    name,
    command: nodePath,
    args: compact([
      `${scriptDir}/alert-review-player-live-smoke.mjs`,
      `--workbench-url=${options.playerWorkbenchUrl}`,
      `--review-row-text=${options.playerReviewRowText}`,
      `--action-testid=${actionTestId}`,
      `--expected-seek-time=${expectedSeekTime}`,
      `--expected-record-path-contains=${expectedRecordPathContains}`,
      `--expected-offset-seconds=${expectedOffsetSeconds}`,
      hasText(options.playerWaitText) ? `--wait-text=${options.playerWaitText}` : '',
    ]),
    evidenceContext: {
      player: compactObject({
        entry: name.replace('LivePlayer:', ''),
        actionTestId,
        reviewRowText: options.playerReviewRowText,
        reviewItemId: Number.isFinite(options.devicePlaybackReviewItemId) ? options.devicePlaybackReviewItemId : undefined,
        reviewCaseId: Number.isFinite(options.devicePlaybackReviewCaseId) ? options.devicePlaybackReviewCaseId : undefined,
        expectedSeekTime,
        expectedRecordPathContains,
        expectedOffsetSeconds,
      }),
    },
  };
}

export async function runProductionSmoke(options, dependencies = {}) {
  const errors = requiredOptionErrors(options);
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
  const reportStartedAt = currentInstant(dependencies);
  const evidenceReport = {
    ok: false,
    status: 'running',
    startedAt: reportStartedAt.iso,
    finishedAt: null,
    durationMs: null,
    allowLocalEndpoints: options.allowLocalEndpoints === true,
    steps: [],
  };
  const steps = buildSmokeSteps(options, dependencies);
  const runCommand = dependencies.runCommand || defaultRunCommand;
  const results = [];
  for (const step of steps) {
    const stepStartedAt = currentInstant(dependencies);
    let result;
    try {
      result = await runCommand(step);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stepFinishedAt = currentInstant(dependencies);
      evidenceReport.steps.push(buildEvidenceStep(step, 'failed', stepStartedAt, stepFinishedAt, null, message));
      finishEvidenceReport(evidenceReport, false, reportStartedAt, currentInstant(dependencies));
      writeEvidenceReport(options, evidenceReport, dependencies);
      throw error;
    }
    const status = Number(result?.status ?? 1);
    const stepFinishedAt = currentInstant(dependencies);
    if (status !== 0) {
      const message = `${step.name} failed with exit code ${status}`;
      evidenceReport.steps.push(buildEvidenceStep(step, 'failed', stepStartedAt, stepFinishedAt, status, message, result));
      finishEvidenceReport(evidenceReport, false, reportStartedAt, currentInstant(dependencies));
      writeEvidenceReport(options, evidenceReport, dependencies);
      throw new Error(message);
    }
    results.push({
      name: step.name,
      status: 'passed',
    });
    evidenceReport.steps.push(buildEvidenceStep(step, 'passed', stepStartedAt, stepFinishedAt, status, null, result));
  }
  finishEvidenceReport(evidenceReport, true, reportStartedAt, currentInstant(dependencies));
  writeEvidenceReport(options, evidenceReport, dependencies);
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
  const result = spawnSync(step.command, step.args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  return result;
}

function maskSensitiveArg(arg) {
  const value = String(arg);
  if (value.startsWith('--token=')) {
    return '--token=***';
  }
  const match = value.match(/^(--[^=]+=)(https?:\/\/.+)$/);
  if (!match) {
    return arg;
  }
  return `${match[1]}${stripUrlSecrets(match[2])}`;
}

function stripUrlSecrets(value) {
  return String(value).replace(/[?#].*$/, '');
}

function buildEvidenceStep(step, status, startedAt, finishedAt, exitCode, error, result) {
  const entry = {
    name: step.name,
    status,
    command: formatStepCommand(step),
    exitCode,
    startedAt: startedAt.iso,
    finishedAt: finishedAt.iso,
    durationMs: durationMs(startedAt, finishedAt),
  };
  if (hasText(error)) {
    entry.error = error;
  }
  const summary = mergeEvidenceSummary(step.evidenceContext, childSmokeSummary(result));
  if (summary) {
    entry.summary = summary;
  }
  return entry;
}

function mergeEvidenceSummary(context, childSummary) {
  if (!context && !childSummary) {
    return null;
  }
  const summary = { ...(context || {}) };
  if (context?.player || childSummary?.player) {
    summary.player = {
      ...(context?.player || {}),
      ...(childSummary?.player || {}),
    };
  }
  for (const [key, value] of Object.entries(childSummary || {})) {
    if (key !== 'player') {
      summary[key] = value;
    }
  }
  return Object.keys(summary).length ? summary : null;
}

function childSmokeSummary(result) {
  const payload = parseLastJsonObject(result?.stdout);
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const summary = {};
  if (Array.isArray(payload.checkpoints)) {
    summary.checkpoints = payload.checkpoints;
  }
  if (payload.storageDriftSummary && typeof payload.storageDriftSummary === 'object') {
    summary.storageDriftSummary = payload.storageDriftSummary;
  }
  if (payload.exportResult && typeof payload.exportResult === 'object') {
    summary.exportResult = payload.exportResult;
  }
  if (payload.playback && typeof payload.playback === 'object') {
    summary.playback = payload.playback;
  }
  if (payload.player && typeof payload.player === 'object') {
    summary.player = buildPlayerSmokeSummary(payload.player);
  }
  const playerSummary = buildPlayerSmokeSummary(payload);
  if (playerSummary) {
    summary.player = playerSummary;
  }
  if (hasText(payload.status)) {
    summary.status = payload.status;
  }
  if (hasText(payload.profile)) {
    summary.profile = payload.profile;
  }
  copyIfPresent(summary, payload, 'reviewItemId');
  copyIfPresent(summary, payload, 'reviewCaseId');
  copyIfPresent(summary, payload, 'exportJobNo');
  copyIfPresent(summary, payload, 'manifestValid');
  copyIfPresent(summary, payload, 'videoExportRequested');
  return Object.keys(summary).length ? summary : null;
}

function buildPlayerSmokeSummary(payload) {
  const player = {};
  copyBooleanIfPresent(player, payload, 'clickedRow');
  copyBooleanIfPresent(player, payload, 'clickedAction');
  copyTextIfPresent(player, payload, 'seekTime');
  copyTextIfPresent(player, payload, 'recordPath');
  copySanitizedUrlIfPresent(player, payload, 'currentUrl');
  copyNumberIfPresent(player, payload, 'playbackOffsetSeconds');
  copyNumberIfPresent(player, payload, 'nativeCurrentTime');
  return Object.keys(player).length ? player : null;
}

function copyBooleanIfPresent(target, source, key) {
  if (typeof source[key] === 'boolean') {
    target[key] = source[key];
  }
}

function copyTextIfPresent(target, source, key) {
  if (hasText(source[key])) {
    target[key] = source[key];
  }
}

function copySanitizedUrlIfPresent(target, source, key) {
  if (hasText(source[key])) {
    target[key] = stripUrlSecrets(source[key]);
  }
}

function copyNumberIfPresent(target, source, key) {
  if (Number.isFinite(source[key])) {
    target[key] = source[key];
  }
}

function copyIfPresent(target, source, key) {
  if (source[key] !== undefined && source[key] !== null) {
    target[key] = source[key];
  }
}

function parseLastJsonObject(value) {
  if (!hasText(value)) {
    return null;
  }
  const text = String(value);
  for (let index = text.lastIndexOf('{'); index >= 0; index = text.lastIndexOf('{', index - 1)) {
    const candidate = text.slice(index).trim();
    try {
      const parsed = JSON.parse(candidate);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      // Keep scanning earlier braces; child smoke logs may contain text before JSON.
    }
  }
  return null;
}

function finishEvidenceReport(report, ok, startedAt, finishedAt) {
  report.ok = ok;
  report.status = ok ? 'passed' : 'failed';
  report.finishedAt = finishedAt.iso;
  report.durationMs = durationMs(startedAt, finishedAt);
}

function writeEvidenceReport(options, report, dependencies) {
  if (!hasText(options.evidenceOutputFile)) {
    return;
  }
  const content = JSON.stringify(report, null, 2);
  if (dependencies.writeFile) {
    dependencies.writeFile(options.evidenceOutputFile, content);
    return;
  }
  mkdirSync(dirname(options.evidenceOutputFile), { recursive: true });
  writeFileSync(options.evidenceOutputFile, content, 'utf8');
}

function currentInstant(dependencies) {
  const value = dependencies.now ? dependencies.now() : new Date();
  const date = value instanceof Date ? value : new Date(value);
  return {
    iso: date.toISOString(),
    time: date.getTime(),
  };
}

function durationMs(startedAt, finishedAt) {
  return Math.max(0, finishedAt.time - startedAt.time);
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

function requireNonNegativeNumber(errors, value, message) {
  if (!Number.isFinite(value) || value < 0) {
    errors.push(message);
  }
}

function requireList(errors, values, message) {
  if (!Array.isArray(values) || values.length === 0) {
    errors.push(message);
  }
}

function requireReleaseEndpoint(errors, optionName, value) {
  if (!hasText(value) || !looksLocalOrMockEndpoint(value)) {
    return;
  }
  errors.push(`production smoke endpoint ${optionName} must not use a local/mock URL without --allow-local-endpoints`);
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

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && String(entry) !== ''),
  );
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

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }
  return !['0', 'false', 'no'].includes(String(value).trim().toLowerCase());
}

function looksLocalOrMockEndpoint(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return false;
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    return true;
  }
  const hostname = String(url.hostname || '').toLowerCase();
  return url.protocol === 'file:'
    || url.protocol === 'mock:'
    || hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || hostname === '[::1]'
    || hostname === '0.0.0.0'
    || hostname.endsWith('.local')
    || hostname.includes('mock')
    || raw.toLowerCase().includes('/mock');
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
  --video-record-drift-retention-hours=24 \\
  --player-workbench-url=http://WEB/... --player-review-row-text=RV-... \\
  --player-expected-seek-time="2026-07-05T10:00:30" \\
  --player-expected-record-path-contains=DEVICE_ID \\
  --player-expected-offset-seconds=30 \\
  --player-coverage-expected-seek-time="2026-07-05T10:00:00" \\
  --player-coverage-expected-record-path-contains=DEVICE_ID \\
  --player-coverage-expected-offset-seconds=0 \\
  --player-case-timeline-expected-seek-time="2026-07-05T10:00:00" \\
  --player-case-timeline-expected-record-path-contains=DEVICE_ID \\
  --player-case-timeline-expected-offset-seconds=0 \\
  [--evidence-output-file=artifacts/production-smoke.json] [--allow-local-endpoints]

Runs the release FR-32 production smoke in order:
LiveDevice -> LiveVideo -> LivePlayer:detail -> LivePlayer:coverage ->
LivePlayer:case-timeline. Each step uses real deployed services, real recording
metadata, export verification, download audit, playback-url allow/deny authorization,
recording DB/disk drift patrol, and player seek assertions from the dedicated smoke
scripts. Localhost/mock/file endpoints are rejected unless --allow-local-endpoints
is supplied for co-located real-service smoke. Evidence output is written as a
sanitized JSON report with masked token-bearing step commands.`);
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

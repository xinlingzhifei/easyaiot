import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_TIME_RANGE_SECONDS = 300;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_EXPORT_POLL_ATTEMPTS = 5;
const DEFAULT_EXPORT_POLL_INTERVAL_MS = 1_000;

export function parseArgs(args, env = process.env) {
  const parsed = {
    alertRecordQueryUrl: env.YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL || '',
    recordCoverageQueryUrl: env.YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL || '',
    recordBaseUrl: env.YFEIEYE_VIDEO_RECORD_BASE_URL || '',
    recordExportUrl: env.YFEIEYE_VIDEO_RECORD_EXPORT_URL || '',
    deviceId: env.YFEIEYE_VIDEO_SMOKE_DEVICE_ID || '',
    cameraId: env.YFEIEYE_VIDEO_SMOKE_CAMERA_ID || '',
    alertTime: env.YFEIEYE_VIDEO_SMOKE_ALERT_TIME || '',
    timeRangeSeconds: Number(env.YFEIEYE_VIDEO_SMOKE_TIME_RANGE || DEFAULT_TIME_RANGE_SECONDS),
    sourceAlertId: env.YFEIEYE_VIDEO_SMOKE_ALERT_ID || 'live-smoke-alert',
    reviewCaseId: env.YFEIEYE_VIDEO_SMOKE_REVIEW_CASE_ID || 'live-smoke-case',
    reviewItemId: env.YFEIEYE_VIDEO_SMOKE_REVIEW_ITEM_ID || 'live-smoke-item',
    format: env.YFEIEYE_VIDEO_SMOKE_EXPORT_FORMAT || 'mp4',
    timeoutMs: Number(env.YFEIEYE_VIDEO_SMOKE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    exportPollAttempts: Number(env.YFEIEYE_VIDEO_SMOKE_EXPORT_POLL_ATTEMPTS || DEFAULT_EXPORT_POLL_ATTEMPTS),
    exportPollIntervalMs: Number(env.YFEIEYE_VIDEO_SMOKE_EXPORT_POLL_INTERVAL_MS || DEFAULT_EXPORT_POLL_INTERVAL_MS),
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg.startsWith('--alert-record-query-url=')) {
      parsed.alertRecordQueryUrl = arg.slice('--alert-record-query-url='.length);
    } else if (arg.startsWith('--record-coverage-query-url=')) {
      parsed.recordCoverageQueryUrl = arg.slice('--record-coverage-query-url='.length);
    } else if (arg.startsWith('--record-base-url=')) {
      parsed.recordBaseUrl = arg.slice('--record-base-url='.length);
    } else if (arg.startsWith('--record-export-url=')) {
      parsed.recordExportUrl = arg.slice('--record-export-url='.length);
    } else if (arg.startsWith('--device-id=')) {
      parsed.deviceId = arg.slice('--device-id='.length);
    } else if (arg.startsWith('--camera-id=')) {
      parsed.cameraId = arg.slice('--camera-id='.length);
    } else if (arg.startsWith('--alert-time=')) {
      parsed.alertTime = arg.slice('--alert-time='.length);
    } else if (arg.startsWith('--time-range=')) {
      parsed.timeRangeSeconds = Number(arg.slice('--time-range='.length));
    } else if (arg.startsWith('--source-alert-id=')) {
      parsed.sourceAlertId = arg.slice('--source-alert-id='.length);
    } else if (arg.startsWith('--review-case-id=')) {
      parsed.reviewCaseId = arg.slice('--review-case-id='.length);
    } else if (arg.startsWith('--review-item-id=')) {
      parsed.reviewItemId = arg.slice('--review-item-id='.length);
    } else if (arg.startsWith('--format=')) {
      parsed.format = arg.slice('--format='.length);
    } else if (arg.startsWith('--timeout-ms=')) {
      parsed.timeoutMs = Number(arg.slice('--timeout-ms='.length));
    } else if (arg.startsWith('--export-poll-attempts=')) {
      parsed.exportPollAttempts = Number(arg.slice('--export-poll-attempts='.length));
    } else if (arg.startsWith('--export-poll-interval-ms=')) {
      parsed.exportPollIntervalMs = Number(arg.slice('--export-poll-interval-ms='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!parsed.recordCoverageQueryUrl && parsed.alertRecordQueryUrl) {
    parsed.recordCoverageQueryUrl = parsed.alertRecordQueryUrl;
  }
  if (!parsed.cameraId && parsed.deviceId) {
    parsed.cameraId = parsed.deviceId;
  }
  if (!Number.isFinite(parsed.timeRangeSeconds) || parsed.timeRangeSeconds <= 0) {
    parsed.timeRangeSeconds = DEFAULT_TIME_RANGE_SECONDS;
  }
  if (!Number.isFinite(parsed.timeoutMs) || parsed.timeoutMs <= 0) {
    parsed.timeoutMs = DEFAULT_TIMEOUT_MS;
  }
  if (!Number.isFinite(parsed.exportPollAttempts) || parsed.exportPollAttempts <= 0) {
    parsed.exportPollAttempts = DEFAULT_EXPORT_POLL_ATTEMPTS;
  }
  if (!Number.isFinite(parsed.exportPollIntervalMs) || parsed.exportPollIntervalMs < 0) {
    parsed.exportPollIntervalMs = DEFAULT_EXPORT_POLL_INTERVAL_MS;
  }

  return parsed;
}

export function requiredOptionErrors(options) {
  const errors = [];
  if (!hasText(options.alertRecordQueryUrl)) {
    errors.push('missing --alert-record-query-url or YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL');
  }
  if (!hasText(options.recordCoverageQueryUrl)) {
    errors.push('missing --record-coverage-query-url or YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL');
  }
  if (!hasText(options.recordBaseUrl)) {
    errors.push('missing --record-base-url or YFEIEYE_VIDEO_RECORD_BASE_URL');
  }
  if (!hasText(options.recordExportUrl)) {
    errors.push('missing --record-export-url or YFEIEYE_VIDEO_RECORD_EXPORT_URL');
  }
  if (!hasText(options.deviceId)) {
    errors.push('missing --device-id or YFEIEYE_VIDEO_SMOKE_DEVICE_ID');
  }
  if (!hasText(options.alertTime)) {
    errors.push('missing --alert-time or YFEIEYE_VIDEO_SMOKE_ALERT_TIME');
  }
  return errors;
}

export function buildAvailabilityUrl(baseUrl, options, extraParams = {}) {
  const url = new URL(baseUrl);
  url.searchParams.set('device_id', options.deviceId);
  if (hasText(options.cameraId)) {
    url.searchParams.set('camera_id', options.cameraId);
  }
  url.searchParams.set('alert_time', options.alertTime);
  url.searchParams.set('time_range', String(options.timeRangeSeconds));
  if (hasText(options.sourceAlertId)) {
    url.searchParams.set('alert_id', options.sourceAlertId);
  }
  for (const [key, value] of Object.entries(extraParams)) {
    if (value !== undefined && value !== null && String(value) !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export function selectPlayableSegment(payload) {
  const data = responseData(payload);
  const rows = firstList(data, 'segments', 'records', 'items', 'recordings', 'timeline_merged', 'timelineMerged', 'timeline');
  const candidates = rows.length ? rows : [data];
  for (const row of candidates) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const status = firstText(row.status, row.coverage_status, row.coverageStatus);
    const recordUri = firstText(row.record_uri, row.recordUri, row.play_url, row.playUrl, row.video_url, row.videoUrl, row.url, row.file_path);
    const exportable = firstPresent(row.exportable, row.can_export, row.canExport);
    if (!hasText(recordUri) || String(status || '').toLowerCase() === 'missing' || exportable === false) {
      continue;
    }
    return {
      raw: row,
      status,
      recordUri,
      startTime: firstText(row.start_time, row.startTime, row.begin_time, row.beginTime, row.event_time, row.eventTime),
      endTime: firstText(row.end_time, row.endTime, row.stop_time, row.stopTime),
    };
  }
  return null;
}

export function buildExportBody(options, segment) {
  const body = {
    review_case_id: options.reviewCaseId,
    review_item_id: options.reviewItemId,
    device_id: options.deviceId,
    camera_id: options.cameraId,
    source_alert_id: options.sourceAlertId,
    start_time: segment.startTime,
    end_time: segment.endTime,
    record_uri: segment.recordUri,
    format: options.format || 'mp4',
  };
  for (const key of Object.keys(body)) {
    if (body[key] === undefined || body[key] === null || body[key] === '') {
      delete body[key];
    }
  }
  return body;
}

export async function runSmoke(options, dependencies = {}) {
  const errors = requiredOptionErrors(options);
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
  const fetchImpl = dependencies.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('global fetch is unavailable; use Node.js 18+ or provide fetchImpl');
  }

  const checkpoints = [];
  const alertRecord = await fetchJson(fetchImpl, buildAvailabilityUrl(options.alertRecordQueryUrl, options), {
    timeoutMs: options.timeoutMs,
    label: 'alert record query',
  });
  const alertSegment = selectPlayableSegment(alertRecord);
  if (!alertSegment) {
    throw new Error('alert record query returned no playable record segment');
  }
  checkpoints.push('alert_record_query_ok');

  const coverage = await fetchJson(fetchImpl, buildAvailabilityUrl(options.recordCoverageQueryUrl, options, {
    begin_time: alertSegment.startTime,
    end_time: alertSegment.endTime,
  }), {
    timeoutMs: options.timeoutMs,
    label: 'record coverage query',
  });
  const coverageSegment = selectPlayableSegment(coverage);
  if (!coverageSegment) {
    throw new Error('record coverage query returned no playable/exportable record segment');
  }
  checkpoints.push('record_coverage_query_ok');

  const recordSpace = await fetchJson(fetchImpl, `${stripTrailingSlash(options.recordBaseUrl)}/space/device/${encodeURIComponent(options.deviceId)}`, {
    timeoutMs: options.timeoutMs,
    label: 'record base space lookup',
  });
  const spaceData = responseData(recordSpace);
  if (!hasText(firstText(spaceData.id, spaceData.space_id, spaceData.spaceId))) {
    throw new Error('record base URL did not resolve a record space for the smoke device');
  }
  checkpoints.push('record_base_space_resolved');

  const exportResponse = await fetchJson(fetchImpl, options.recordExportUrl, {
    timeoutMs: options.timeoutMs,
    label: 'record export',
    method: 'POST',
    body: buildExportBody(options, coverageSegment),
  });
  const exportResult = normalizeExportResult(exportResponse);
  if (!hasText(exportResult.exportId) && !hasText(exportResult.downloadUrl)) {
    throw new Error('record export response did not include export_id or download_url');
  }
  checkpoints.push('record_export_posted');
  const readyExportResult = await waitForExportDownload(fetchImpl, options, exportResult);
  checkpoints.push('record_export_download_ready');
  await probeDownloadUrl(fetchImpl, options, readyExportResult.downloadUrl);
  checkpoints.push('record_export_download_probed');
  await verifyExportManifest(fetchImpl, options, readyExportResult);
  checkpoints.push('record_export_manifest_verified');

  return {
    ok: true,
    checkpoints,
    alertRecord: { segment: alertSegment },
    coverage: { segment: coverageSegment },
    recordSpace: spaceData,
    exportResult: readyExportResult,
  };
}

async function fetchJson(fetchImpl, url, options) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs) : null;
  try {
    const response = await fetchImpl(url, {
      method: options.method || 'GET',
      headers: options.body ? { 'content-type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller?.signal,
    });
    const text = typeof response.text === 'function' ? await response.text() : '';
    let payload;
    try {
      payload = text ? JSON.parse(text) : await response.json();
    } catch {
      payload = text;
    }
    if (!response.ok) {
      throw new Error(`${options.label} failed with HTTP ${response.status} ${response.statusText || ''}: ${summarizePayload(payload)}`);
    }
    return payload;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function normalizeExportResult(payload) {
  const data = responseData(payload);
  return {
    exportId: firstText(data.export_id, data.exportId, data.id, data.task_id, data.taskId),
    downloadUrl: firstText(data.download_url, data.downloadUrl, data.export_uri, data.exportUri, data.url),
    manifestUrl: firstText(data.manifest_url, data.manifestUrl, data.manifest_uri, data.manifestUri),
    status: firstText(data.status, data.state),
    message: firstText(data.message, data.msg),
  };
}

async function waitForExportDownload(fetchImpl, options, exportResult) {
  if (hasText(exportResult.downloadUrl)) {
    return exportResult;
  }
  if (!hasText(exportResult.exportId)) {
    throw new Error('record export response did not include a download_url and cannot be polled without export_id');
  }
  let latest = exportResult;
  for (let attempt = 0; attempt < options.exportPollAttempts; attempt += 1) {
    if (attempt > 0 && options.exportPollIntervalMs > 0) {
      await delay(options.exportPollIntervalMs);
    }
    const statusPayload = await fetchJson(fetchImpl, buildExportStatusUrl(options.recordExportUrl, exportResult.exportId), {
      timeoutMs: options.timeoutMs,
      label: 'record export status',
    });
    latest = normalizeExportResult(statusPayload);
    if (!hasText(latest.exportId)) {
      latest.exportId = exportResult.exportId;
    }
    if (hasText(latest.downloadUrl)) {
      return latest;
    }
    if (String(latest.status || '').toLowerCase() === 'failed') {
      throw new Error(`record export failed before download was ready: ${latest.message || latest.exportId}`);
    }
  }
  throw new Error(`record export did not expose a download_url after ${options.exportPollAttempts} poll attempt(s): ${exportResult.exportId}`);
}

async function probeDownloadUrl(fetchImpl, options, downloadUrl) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs) : null;
  try {
    const response = await fetchImpl(resolveDownloadUrl(downloadUrl, options.recordExportUrl), {
      method: 'HEAD',
      signal: controller?.signal,
    });
    if (!response.ok) {
      throw new Error(`record export download probe failed with HTTP ${response.status} ${response.statusText || ''}`.trim());
    }
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function verifyExportManifest(fetchImpl, options, exportResult) {
  if (!hasText(exportResult.manifestUrl)) {
    throw new Error('record export response did not include manifest_url for reproducible evidence verification');
  }
  const manifest = responseData(await fetchJson(fetchImpl, resolveDownloadUrl(exportResult.manifestUrl, options.recordExportUrl), {
    timeoutMs: options.timeoutMs,
    label: 'record export manifest',
  }));
  const version = firstText(manifest.manifestVersion, manifest.manifest_version, manifest.version);
  if (Number(version) !== 2) {
    throw new Error('record export manifest is not manifestVersion 2');
  }
  const recordSegments = firstList(manifest, 'recordSegments', 'record_segments');
  const sourceSegments = firstList(manifest, 'sourceSegments', 'source_segments', 'sources', 'inputs', 'recordSegments', 'record_segments');
  if (!hasText(firstText(
    manifest.ffmpegCommandHash,
    manifest.ffmpeg_command_hash,
    manifest.commandHash,
    manifest.command_hash,
  )) && !sourceSegments.some((segment) => hasText(firstText(
    segment.ffmpegCommandHash,
    segment.ffmpeg_command_hash,
    segment.commandHash,
    segment.command_hash,
  )))) {
    throw new Error('record export manifest missing ffmpeg command hash');
  }
  const clipParams = firstPresent(manifest.clipParams, manifest.clip_params, manifest.clip, manifest.trim);
  const hasSegmentClipParams = sourceSegments.some((segment) => hasText(firstText(
    segment.clipStartTime,
    segment.clip_start_time,
  )) && hasText(firstText(
    segment.clipEndTime,
    segment.clip_end_time,
  )));
  if ((!clipParams || typeof clipParams !== 'object') && !hasSegmentClipParams) {
    throw new Error('record export manifest missing clip params');
  }
  const concatOrder = firstList(manifest, 'concatOrder', 'concat_order', 'stitchOrder', 'stitch_order');
  const hasSegmentConcatOrder = recordSegments.length > 0 && recordSegments.every((segment) => hasText(firstText(
    segment.recordUri,
    segment.record_uri,
    segment.uri,
  )) && firstPresent(segment.index, segment.order, segment.sequence) !== undefined);
  if (!concatOrder.length && !hasSegmentConcatOrder) {
    throw new Error('record export manifest missing concat order');
  }
  if (!sourceSegments.length || sourceSegments.some((segment) => !hasText(firstText(
    segment.sourceHash,
    segment.source_hash,
    segment.sha256,
    segment.hash,
    segment.checksum,
  )))) {
    throw new Error('record export manifest missing source segment hashes');
  }
  const outputs = firstList(manifest, 'outputs', 'files', 'artifacts');
  if (!outputs.length || outputs.some((output) => !hasText(firstText(
    output.fileHash,
    output.file_hash,
    output.sha256,
    output.hash,
    output.checksum,
  )))) {
    throw new Error('record export manifest missing output file hashes');
  }
}

function resolveDownloadUrl(downloadUrl, baseUrl) {
  return new URL(downloadUrl, baseUrl).toString();
}

function buildExportStatusUrl(recordExportUrl, exportId) {
  return `${stripTrailingSlash(recordExportUrl)}/${encodeURIComponent(exportId)}`;
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function responseData(payload) {
  if (payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object') {
    return payload.data;
  }
  return payload && typeof payload === 'object' ? payload : {};
}

function firstList(object, ...keys) {
  for (const key of keys) {
    const value = object?.[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function firstText(...values) {
  const value = firstPresent(...values);
  return value === undefined || value === null ? '' : String(value);
}

function hasText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function summarizePayload(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return text.length > 500 ? `${text.slice(0, 500)}...` : text;
}

function printHelp() {
  console.log(`Usage: node .scripts/alert-review-video-live-smoke.mjs \\
  --alert-record-query-url=http://VIDEO/video/record/availability \\
  --record-coverage-query-url=http://VIDEO/video/record/availability \\
  --record-base-url=http://VIDEO/video/record \\
  --record-export-url=http://VIDEO/video/record/export \\
  --device-id=DEVICE_ID --alert-time="YYYY-MM-DD HH:mm:ss" [--camera-id=CAMERA_ID] \\
  [--export-poll-attempts=5] [--export-poll-interval-ms=1000]

Runs a real FR-21/FR-32 VIDEO smoke: alert record lookup, coverage lookup,
record-base space lookup, export POST, export download readiness, a HEAD probe
against the resolved download URL, and manifest v2 reproducibility fields
(ffmpeg command hash, source hashes, clip params, concat order, output hashes).
The smoke must use a real device with real recording metadata; no mock server
is started.`);
}

async function runCli() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const result = await runSmoke(options);
  console.log('alert review VIDEO live smoke passed');
  console.log(JSON.stringify({
    checkpoints: result.checkpoints,
    exportResult: result.exportResult,
  }, null, 2));
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

import assert from 'node:assert/strict';

import {
  buildAvailabilityUrl,
  buildExportBody,
  parseArgs,
  requiredOptionErrors,
  runSmoke,
  selectPlayableSegment,
} from './alert-review-video-live-smoke.mjs';
import {
  evaluateStatus,
  releaseEntriesForTrackedPaths,
} from './verify-alert-review-release-package.mjs';

const parsed = parseArgs([
  '--alert-record-query-url=http://video.local/video/record/availability',
  '--record-coverage-query-url=http://video.local/video/record/availability',
  '--record-base-url=http://video.local/video/record',
  '--record-export-url=http://video.local/video/record/export',
  '--device-id=device-01',
  '--camera-id=camera-01',
  '--alert-time=2026-07-05 10:00:00',
  '--time-range=120',
  '--source-alert-id=alert-001',
  '--record-drift-retention-hours=24',
]);
assert.equal(parsed.alertRecordQueryUrl, 'http://video.local/video/record/availability');
assert.equal(parsed.recordCoverageQueryUrl, 'http://video.local/video/record/availability');
assert.equal(parsed.recordBaseUrl, 'http://video.local/video/record');
assert.equal(parsed.recordExportUrl, 'http://video.local/video/record/export');
assert.equal(parsed.deviceId, 'device-01');
assert.equal(parsed.cameraId, 'camera-01');
assert.equal(parsed.alertTime, '2026-07-05 10:00:00');
assert.equal(parsed.timeRangeSeconds, 120);
assert.equal(parsed.sourceAlertId, 'alert-001');
assert.equal(parsed.recordDriftRetentionHours, 24);

const fromEnv = parseArgs([], {
  YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL: 'http://env/video/record/availability',
  YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL: 'http://env/video/record/availability',
  YFEIEYE_VIDEO_RECORD_BASE_URL: 'http://env/video/record',
  YFEIEYE_VIDEO_RECORD_EXPORT_URL: 'http://env/video/record/export',
  YFEIEYE_VIDEO_SMOKE_DEVICE_ID: 'env-device',
  YFEIEYE_VIDEO_SMOKE_ALERT_TIME: '2026-07-05 11:00:00',
  YFEIEYE_VIDEO_RECORD_DRIFT_RETENTION_HOURS: '72',
});
assert.equal(fromEnv.deviceId, 'env-device');
assert.equal(fromEnv.cameraId, 'env-device');
assert.equal(fromEnv.timeRangeSeconds, 300);
assert.equal(fromEnv.recordDriftRetentionHours, 72);

assert.deepEqual(requiredOptionErrors(parseArgs([], {})), [
  'missing --alert-record-query-url or YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL',
  'missing --record-coverage-query-url or YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL',
  'missing --record-base-url or YFEIEYE_VIDEO_RECORD_BASE_URL',
  'missing --record-export-url or YFEIEYE_VIDEO_RECORD_EXPORT_URL',
  'missing --device-id or YFEIEYE_VIDEO_SMOKE_DEVICE_ID',
  'missing --alert-time or YFEIEYE_VIDEO_SMOKE_ALERT_TIME',
  'missing --record-drift-retention-hours or YFEIEYE_VIDEO_RECORD_DRIFT_RETENTION_HOURS',
]);

const availabilityUrl = buildAvailabilityUrl('http://video.local/video/record/availability', parsed);
assert.match(availabilityUrl, /^http:\/\/video\.local\/video\/record\/availability\?/);
assert.match(availabilityUrl, /device_id=device-01/);
assert.match(availabilityUrl, /camera_id=camera-01/);
assert.match(availabilityUrl, /alert_time=2026-07-05\+10%3A00%3A00/);
assert.match(availabilityUrl, /time_range=120/);
assert.match(availabilityUrl, /alert_id=alert-001/);

const playable = selectPlayableSegment({
  data: {
    segments: [
      { status: 'missing', start_time: '2026-07-05T09:59:00', end_time: '2026-07-05T09:59:30' },
      {
        status: 'motion',
        start_time: '2026-07-05T10:00:00',
        end_time: '2026-07-05T10:01:00',
        record_uri: '/video/record/space/7/video/live/device-01/clip.mp4',
        exportable: true,
      },
    ],
  },
});
assert.equal(playable.recordUri, '/video/record/space/7/video/live/device-01/clip.mp4');
assert.equal(playable.startTime, '2026-07-05T10:00:00');

assert.equal(selectPlayableSegment({ data: { segments: [{ status: 'missing' }] } }), null);

assert.deepEqual(
  buildExportBody(parsed, playable),
  {
    review_case_id: 'live-smoke-case',
    review_item_id: 'live-smoke-item',
    device_id: 'device-01',
    camera_id: 'camera-01',
    source_alert_id: 'alert-001',
    start_time: '2026-07-05T10:00:00',
    end_time: '2026-07-05T10:01:00',
    record_uri: '/video/record/space/7/video/live/device-01/clip.mp4',
    format: 'mp4',
  },
);

const calls = [];
const fakeFetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  if (String(url).includes('/space/device/device-01')) {
    return jsonResponse({ code: 0, data: { id: 7, device_id: 'device-01' } });
  }
  if (String(url).includes('/space/7/videos/drift')) {
    const requestUrl = new URL(String(url));
    assert.equal(requestUrl.searchParams.get('device_id'), 'device-01');
    assert.equal(requestUrl.searchParams.get('retention_hours'), '24');
    return jsonResponse({
      code: 0,
      data: {
        space_id: 7,
        device_id: 'device-01',
        summary: {
          record_count: 3,
          issue_count: 0,
          issue_reasons: {},
          healthy: true,
        },
      },
    });
  }
  if (String(url).endsWith('/manifests/review-export-1.json')) {
    return jsonResponse({
      manifestVersion: 2,
      recordSegments: [
        {
          index: 0,
          recordUri: '/video/record/space/7/video/live/device-01/clip.mp4',
          sourceHash: 'sha256:source-segment',
          clipStartTime: '2026-07-05T10:00:00',
          clipEndTime: '2026-07-05T10:01:00',
          ffmpegCommandHash: 'sha256:ffmpeg-command',
        },
      ],
      files: [
        {
          path: 'review-export-1.mp4',
          role: 'export_package',
          hash: 'sha256:output-file',
        },
      ],
    });
  }
  if (String(url).endsWith('/video/record/export/review-export-1')) {
    return jsonResponse({
      code: 0,
      data: {
        export_id: 'review-export-1',
        status: 'ready',
        download_url: '/downloads/review-export-1.mp4',
        manifest_url: '/manifests/review-export-1.json',
      },
    });
  }
  if (String(url).endsWith('/downloads/review-export-1.mp4')) {
    assert.equal(init.method, 'HEAD');
    return jsonResponse({}, 200);
  }
  if (init.method === 'POST') {
    assert.equal(JSON.parse(init.body).record_uri, '/video/record/space/7/video/live/device-01/clip.mp4');
    return jsonResponse({ code: 0, data: { export_id: 'review-export-1', status: 'pending' } });
  }
  return jsonResponse({
    code: 0,
    data: {
      segments: [
        {
          status: 'available',
          start_time: '2026-07-05T10:00:00',
          end_time: '2026-07-05T10:01:00',
          record_uri: '/video/record/space/7/video/live/device-01/clip.mp4',
          exportable: true,
        },
      ],
    },
  });
};

const smoke = await runSmoke(parsed, { fetchImpl: fakeFetch });
assert.deepEqual(smoke.checkpoints, [
  'alert_record_query_ok',
  'record_coverage_query_ok',
  'record_base_space_resolved',
  'record_storage_drift_patrol_ok',
  'record_export_posted',
  'record_export_download_ready',
  'record_export_download_probed',
  'record_export_manifest_verified',
]);
assert.equal(smoke.exportResult.exportId, 'review-export-1');
assert.equal(smoke.exportResult.downloadUrl, '/downloads/review-export-1.mp4');
assert.equal(smoke.exportResult.manifestUrl, '/manifests/review-export-1.json');
assert.equal(smoke.storageDrift.summary.record_count, 3);
assert.equal(calls.length, 8);

const failedDriftFetch = async (url, init = {}) => {
  if (String(url).includes('/space/7/videos/drift')) {
    return jsonResponse({
      code: 0,
      data: {
        summary: {
          record_count: 3,
          issue_count: 2,
          issue_reasons: {
            file_missing: 1,
            disk_full: 1,
          },
          healthy: false,
        },
      },
    });
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: failedDriftFetch }),
  /record storage drift patrol reported 2 issue\(s\): file_missing=1, disk_full=1/,
);

const failedDownloadFetch = async (url, init = {}) => {
  if (String(url).endsWith('/downloads/review-export-1.mp4')) {
    assert.equal(init.method, 'HEAD');
    return jsonResponse({ message: 'missing export file' }, 404);
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: failedDownloadFetch }),
  /record export download probe failed with HTTP 404/,
);

const missingManifestFetch = async (url, init = {}) => {
  if (String(url).endsWith('/video/record/export/review-export-1')) {
    return jsonResponse({ code: 0, data: { export_id: 'review-export-1', status: 'ready', download_url: '/downloads/review-export-1.mp4' } });
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: missingManifestFetch }),
  /record export response did not include manifest_url/,
);

const incompleteManifestFetch = async (url, init = {}) => {
  if (String(url).endsWith('/manifests/review-export-1.json')) {
    return jsonResponse({
      manifestVersion: 2,
      ffmpegCommandHash: 'sha256:ffmpeg-command',
      sourceSegments: [
        {
          recordUri: '/video/record/space/7/video/live/device-01/clip.mp4',
          sourceHash: 'sha256:source-segment',
        },
      ],
      outputs: [
        {
          path: 'review-export-1.mp4',
          sha256: 'output-sha256',
        },
      ],
    });
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: incompleteManifestFetch }),
  /record export manifest missing clip params/,
);

await assert.rejects(
  () => runSmoke(parseArgs([], {}), { fetchImpl: fakeFetch }),
  /missing --alert-record-query-url/,
);

const untrackedLiveSmoke = evaluateStatus(`
?? .scripts/alert-review-video-live-smoke.mjs
?? .scripts/alert-review-video-live-smoke.test.mjs
`);
assert.equal(untrackedLiveSmoke.ok, false);
assert.equal(untrackedLiveSmoke.blockers[0].group, 'FR release gate tooling');
assert.equal(untrackedLiveSmoke.blockers[1].group, 'FR release gate tooling');

const trackedSmokeEntries = releaseEntriesForTrackedPaths([
  '.scripts/alert-review-video-live-smoke.mjs',
  '.scripts/alert-review-video-live-smoke.test.mjs',
]);
assert.equal(trackedSmokeEntries.length, 2);

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'ERROR',
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

console.log('alert review VIDEO live smoke tests OK');

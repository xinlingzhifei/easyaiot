import assert from 'node:assert/strict';

import {
  buildAvailabilityUrl,
  buildExportBody,
  parseArgs,
  requiredOptionErrors,
  runSmoke,
  selectPlayableSegment,
  summarizeCliResult,
} from './alert-review-video-live-smoke.mjs';
import {
  evaluateStatus,
  releaseEntriesForTrackedPaths,
} from './verify-alert-review-release-package.mjs';

const SOURCE_SEGMENT_HASH = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OUTPUT_FILE_HASH = 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const FFMPEG_COMMAND_HASH = 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

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
  '--allow-local-endpoints',
]);

const releaseParsed = parseArgs([
  '--alert-record-query-url=https://video.release.example/video/record/availability',
  '--record-coverage-query-url=https://video.release.example/video/record/availability',
  '--record-base-url=https://video.release.example/video/record',
  '--record-export-url=https://video.release.example/video/record/export',
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
assert.equal(parsed.allowLocalEndpoints, true);

const parsedWithVerifier = parseArgs([
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
  '--manifest-verifier-script=.scripts/record-export-manifest-verifier.mjs',
  '--allow-local-endpoints',
]);
assert.equal(parsedWithVerifier.manifestVerifierScript, '.scripts/record-export-manifest-verifier.mjs');

const fromEnv = parseArgs([], {
  YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL: 'http://env/video/record/availability',
  YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL: 'http://env/video/record/availability',
  YFEIEYE_VIDEO_RECORD_BASE_URL: 'http://env/video/record',
  YFEIEYE_VIDEO_RECORD_EXPORT_URL: 'http://env/video/record/export',
  YFEIEYE_VIDEO_SMOKE_DEVICE_ID: 'env-device',
  YFEIEYE_VIDEO_SMOKE_ALERT_TIME: '2026-07-05 11:00:00',
  YFEIEYE_VIDEO_RECORD_DRIFT_RETENTION_HOURS: '72',
  YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT: '.scripts/record-export-manifest-verifier.mjs',
});
assert.equal(fromEnv.deviceId, 'env-device');
assert.equal(fromEnv.cameraId, 'env-device');
assert.equal(fromEnv.timeRangeSeconds, 300);
assert.equal(fromEnv.recordDriftRetentionHours, 72);
assert.equal(fromEnv.manifestVerifierScript, '.scripts/record-export-manifest-verifier.mjs');
assert.equal(fromEnv.allowLocalEndpoints, false);

assert.deepEqual(requiredOptionErrors(parseArgs([], {})), [
  'missing --alert-record-query-url or YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL',
  'missing --record-coverage-query-url or YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL',
  'missing --record-base-url or YFEIEYE_VIDEO_RECORD_BASE_URL',
  'missing --record-export-url or YFEIEYE_VIDEO_RECORD_EXPORT_URL',
  'missing --device-id or YFEIEYE_VIDEO_SMOKE_DEVICE_ID',
  'missing --alert-time or YFEIEYE_VIDEO_SMOKE_ALERT_TIME',
  'missing --record-drift-retention-hours or YFEIEYE_VIDEO_RECORD_DRIFT_RETENTION_HOURS',
]);

assert.deepEqual(requiredOptionErrors(parseArgs([
  '--alert-record-query-url=http://127.0.0.1:6000/video/record/availability',
  '--record-coverage-query-url=http://video.mock/video/record/availability',
  '--record-base-url=file:///tmp/video/record',
  '--record-export-url=http://localhost:6000/video/record/export',
  '--device-id=device-01',
  '--alert-time=2026-07-05 10:00:00',
  '--record-drift-retention-hours=24',
], {})), [
  'VIDEO live smoke endpoint --alert-record-query-url must not use a local/mock URL without --allow-local-endpoints',
  'VIDEO live smoke endpoint --record-coverage-query-url must not use a local/mock URL without --allow-local-endpoints',
  'VIDEO live smoke endpoint --record-base-url must not use a local/mock URL without --allow-local-endpoints',
  'VIDEO live smoke endpoint --record-export-url must not use a local/mock URL without --allow-local-endpoints',
]);

assert.deepEqual(requiredOptionErrors(parseArgs([
  '--alert-record-query-url=http://127.0.0.1:6000/video/record/availability',
  '--record-coverage-query-url=http://video.mock/video/record/availability',
  '--record-base-url=file:///tmp/video/record',
  '--record-export-url=http://localhost:6000/video/record/export',
  '--device-id=device-01',
  '--alert-time=2026-07-05 10:00:00',
  '--record-drift-retention-hours=24',
  '--allow-local-endpoints',
], {})), []);

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
    async_worker: true,
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
          sourceHash: SOURCE_SEGMENT_HASH,
          clipStartTime: '2026-07-05T10:00:00',
          clipEndTime: '2026-07-05T10:01:00',
          ffmpegCommandHash: FFMPEG_COMMAND_HASH,
        },
      ],
      files: [
        {
          path: 'review-export-1.mp4',
          role: 'export_package',
          hash: OUTPUT_FILE_HASH,
          storage: {
            storageType: 'object_storage',
            artifactRole: 'export_package',
            objectKey: 'review-export-1/content.bin',
            expiresAt: '2026-07-20T00:00:00Z',
            lifecycleStatus: 'retained',
          },
        },
      ],
      storageLifecycle: {
        storageType: 'object_storage',
        storeRoot: 's3://evidence-exports',
        status: 'retained',
        expiresAt: '2026-07-20T00:00:00Z',
        artifactKeys: {
          exportPackage: 'review-export-1/content.bin',
        },
      },
      signature: {
        algorithm: 'hmac-sha256',
        keyId: '2026-q2',
        signatureVersion: 'v2',
        value: 'hmac-sha256:signed-manifest',
      },
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
    return jsonResponse({}, 200, {
      'content-length': '1048576',
      'content-type': 'video/mp4',
    });
  }
  if (init.method === 'POST') {
    const body = JSON.parse(init.body);
    assert.equal(body.record_uri, '/video/record/space/7/video/live/device-01/clip.mp4');
    assert.equal(body.async_worker, true);
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
const cliSummary = summarizeCliResult(smoke);
assert.deepEqual(cliSummary.storageDriftSummary, {
  healthy: true,
  recordCount: 3,
  issueCount: 0,
  issueReasons: {},
});
assert.deepEqual(cliSummary.manifestSignature, {
  algorithm: 'hmac-sha256',
  keyId: '2026-q2',
  signatureVersion: 'v2',
});
assert.deepEqual(cliSummary.manifestStorageLifecycle, {
  storageType: 'object_storage',
  status: 'retained',
  expiresAt: '2026-07-20T00:00:00Z',
  exportPackageObjectKey: 'review-export-1/content.bin',
});

const mockRecordUriFetch = async (url, init = {}) => {
  if (init.method === 'POST') {
    const body = JSON.parse(init.body);
    assert.equal(body.record_uri, 'mock://record/device-01/clip.mp4');
    return jsonResponse({ code: 0, data: { export_id: 'review-export-1', status: 'pending' } });
  }
  if (String(url).includes('/space/device/device-01')
    || String(url).includes('/space/7/videos/drift')
    || String(url).endsWith('/video/record/export/review-export-1')
    || String(url).endsWith('/downloads/review-export-1.mp4')
    || String(url).endsWith('/manifests/review-export-1.json')) {
    return fakeFetch(url, init);
  }
  return jsonResponse({
    code: 0,
    data: {
      segments: [
        {
          status: 'available',
          start_time: '2026-07-05T10:00:00',
          end_time: '2026-07-05T10:01:00',
          record_uri: 'mock://record/device-01/clip.mp4',
          exportable: true,
        },
      ],
    },
  });
};
await assert.rejects(
  () => runSmoke(releaseParsed, { fetchImpl: mockRecordUriFetch }),
  /VIDEO live smoke returned local\/mock record URI/,
);

const relativeMockRecordUriFetch = async (url, init = {}) => {
  if (init.method === 'POST') {
    const body = JSON.parse(init.body);
    assert.equal(body.record_uri, 'mock/device-01/clip.mp4');
    return jsonResponse({ code: 0, data: { export_id: 'review-export-1', status: 'pending' } });
  }
  if (String(url).includes('/space/device/device-01')
    || String(url).includes('/space/7/videos/drift')
    || String(url).endsWith('/video/record/export/review-export-1')
    || String(url).endsWith('/downloads/review-export-1.mp4')
    || String(url).endsWith('/manifests/review-export-1.json')) {
    return fakeFetch(url, init);
  }
  return jsonResponse({
    code: 0,
    data: {
      segments: [
        {
          status: 'available',
          start_time: '2026-07-05T10:00:00',
          end_time: '2026-07-05T10:01:00',
          record_uri: 'mock/device-01/clip.mp4',
          exportable: true,
        },
      ],
    },
  });
};
await assert.rejects(
  () => runSmoke(releaseParsed, { fetchImpl: relativeMockRecordUriFetch }),
  /VIDEO live smoke returned local\/mock record URI/,
);

const inlineRecordUriFetch = async (url, init = {}) => {
  if (init.method === 'POST') {
    const body = JSON.parse(init.body);
    assert.equal(body.record_uri, 'data:video/mp4;base64,AAAA');
    return jsonResponse({ code: 0, data: { export_id: 'review-export-1', status: 'pending' } });
  }
  if (String(url).includes('/space/device/device-01')
    || String(url).includes('/space/7/videos/drift')
    || String(url).endsWith('/video/record/export/review-export-1')
    || String(url).endsWith('/downloads/review-export-1.mp4')
    || String(url).endsWith('/manifests/review-export-1.json')) {
    return fakeFetch(url, init);
  }
  return jsonResponse({
    code: 0,
    data: {
      segments: [
        {
          status: 'available',
          start_time: '2026-07-05T10:00:00',
          end_time: '2026-07-05T10:01:00',
          record_uri: 'data:video/mp4;base64,AAAA',
          exportable: true,
        },
      ],
    },
  });
};
await assert.rejects(
  () => runSmoke(releaseParsed, { fetchImpl: inlineRecordUriFetch }),
  /VIDEO live smoke returned inline\/opaque media evidence/,
);

const protocolRelativeLocalRecordUriFetch = async (url, init = {}) => {
  if (init.method === 'POST') {
    const body = JSON.parse(init.body);
    assert.equal(body.record_uri, '//localhost/video/device-01/clip.mp4');
    return jsonResponse({ code: 0, data: { export_id: 'review-export-1', status: 'pending' } });
  }
  if (String(url).includes('/space/device/device-01')
    || String(url).includes('/space/7/videos/drift')
    || String(url).endsWith('/video/record/export/review-export-1')
    || String(url).endsWith('/downloads/review-export-1.mp4')
    || String(url).endsWith('/manifests/review-export-1.json')) {
    return fakeFetch(url, init);
  }
  return jsonResponse({
    code: 0,
    data: {
      segments: [
        {
          status: 'available',
          start_time: '2026-07-05T10:00:00',
          end_time: '2026-07-05T10:01:00',
          record_uri: '//localhost/video/device-01/clip.mp4',
          exportable: true,
        },
      ],
    },
  });
};
await assert.rejects(
  () => runSmoke(releaseParsed, { fetchImpl: protocolRelativeLocalRecordUriFetch }),
  /VIDEO live smoke returned local\/mock record URI/,
);

const localFilePathFetch = async (url, init = {}) => {
  if (init.method === 'POST') {
    const body = JSON.parse(init.body);
    assert.equal(body.record_uri, '/var/lib/yfeieye/video/device-01/clip.mp4');
    return jsonResponse({ code: 0, data: { export_id: 'review-export-1', status: 'pending' } });
  }
  if (String(url).includes('/space/device/device-01')
    || String(url).includes('/space/7/videos/drift')
    || String(url).endsWith('/video/record/export/review-export-1')
    || String(url).endsWith('/downloads/review-export-1.mp4')
    || String(url).endsWith('/manifests/review-export-1.json')) {
    return fakeFetch(url, init);
  }
  return jsonResponse({
    code: 0,
    data: {
      segments: [
        {
          status: 'available',
          start_time: '2026-07-05T10:00:00',
          end_time: '2026-07-05T10:01:00',
          file_path: '/var/lib/yfeieye/video/device-01/clip.mp4',
          exportable: true,
        },
      ],
    },
  });
};
await assert.rejects(
  () => runSmoke(releaseParsed, { fetchImpl: localFilePathFetch }),
  /VIDEO live smoke returned local file path evidence/,
);

const absoluteRecordUriFetch = async (url, init = {}) => {
  if (init.method === 'POST') {
    const body = JSON.parse(init.body);
    assert.equal(body.record_uri, 'C:\\yfeieye\\video\\device-01\\clip.mp4');
    return jsonResponse({ code: 0, data: { export_id: 'review-export-1', status: 'pending' } });
  }
  if (String(url).includes('/space/device/device-01')
    || String(url).includes('/space/7/videos/drift')
    || String(url).endsWith('/video/record/export/review-export-1')
    || String(url).endsWith('/downloads/review-export-1.mp4')
    || String(url).endsWith('/manifests/review-export-1.json')) {
    return fakeFetch(url, init);
  }
  return jsonResponse({
    code: 0,
    data: {
      segments: [
        {
          status: 'available',
          start_time: '2026-07-05T10:00:00',
          end_time: '2026-07-05T10:01:00',
          record_uri: 'C:\\yfeieye\\video\\device-01\\clip.mp4',
          exportable: true,
        },
      ],
    },
  });
};
await assert.rejects(
  () => runSmoke(releaseParsed, { fetchImpl: absoluteRecordUriFetch }),
  /VIDEO live smoke returned local file path evidence/,
);

const mockDownloadUrlFetch = async (url, init = {}) => {
  if (String(url).endsWith('/video/record/export/review-export-1')) {
    return jsonResponse({
      code: 0,
      data: {
        export_id: 'review-export-1',
        status: 'ready',
        download_url: 'mock://download/review-export-1.mp4',
        manifest_url: '/manifests/review-export-1.json',
      },
    });
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(releaseParsed, { fetchImpl: mockDownloadUrlFetch }),
  /VIDEO live smoke returned local\/mock download URL/,
);

const localManifestUrlFetch = async (url, init = {}) => {
  if (String(url).endsWith('/video/record/export/review-export-1')) {
    return jsonResponse({
      code: 0,
      data: {
        export_id: 'review-export-1',
        status: 'ready',
        download_url: '/downloads/review-export-1.mp4',
        manifest_url: 'http://localhost/manifests/review-export-1.json',
      },
    });
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(releaseParsed, { fetchImpl: localManifestUrlFetch }),
  /VIDEO live smoke returned local\/mock manifest URL/,
);

const verifierCalls = [];
const smokeWithVerifier = await runSmoke(parsedWithVerifier, {
  fetchImpl: fakeFetch,
  verifyManifest: async ({ manifest, manifestUrl }) => {
    verifierCalls.push({ manifest, manifestUrl });
    return {
      valid: true,
      signatureValid: true,
      signatureKeyAvailable: true,
      keyId: '2026-q2',
      signatureVersion: 'v2',
      violations: [],
    };
  },
});
assert.equal(verifierCalls.length, 1);
assert.equal(verifierCalls[0].manifest.signature.keyId, '2026-q2');
assert.equal(verifierCalls[0].manifestUrl, 'http://video.local/manifests/review-export-1.json');
assert.deepEqual(smokeWithVerifier.manifestVerification, {
  valid: true,
  signatureValid: true,
  signatureKeyAvailable: true,
  keyId: '2026-q2',
  signatureVersion: 'v2',
  violations: [],
});
assert.deepEqual(summarizeCliResult(smokeWithVerifier).manifestVerification, smokeWithVerifier.manifestVerification);

await assert.rejects(
  () => runSmoke(parsedWithVerifier, {
    fetchImpl: fakeFetch,
    verifyManifest: async () => ({
      valid: false,
      signatureValid: false,
      signatureKeyAvailable: false,
      keyId: '2026-q2',
      signatureVersion: 'v2',
      violations: ['missing_hmac_key'],
    }),
  }),
  /record export manifest verifier failed: missing_hmac_key/,
);

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

const nonVideoDownloadFetch = async (url, init = {}) => {
  if (String(url).endsWith('/downloads/review-export-1.mp4')) {
    assert.equal(init.method, 'HEAD');
    return jsonResponse({ message: 'not a video export' }, 200, {
      'content-length': '64',
      'content-type': 'application/json',
    });
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: nonVideoDownloadFetch }),
  /record export download probe returned non-video content-type: application\/json/,
);

const invalidManifestHashFetch = async (url, init = {}) => {
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
          ffmpegCommandHash: FFMPEG_COMMAND_HASH,
        },
      ],
      files: [
        {
          path: 'review-export-1.mp4',
          role: 'export_package',
          hash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          storage: {
            storageType: 'object_storage',
            artifactRole: 'export_package',
            objectKey: 'review-export-1/content.bin',
            expiresAt: '2026-07-20T00:00:00Z',
            lifecycleStatus: 'retained',
          },
        },
      ],
      storageLifecycle: {
        storageType: 'object_storage',
        storeRoot: 's3://evidence-exports',
        status: 'retained',
        expiresAt: '2026-07-20T00:00:00Z',
        artifactKeys: {
          exportPackage: 'review-export-1/content.bin',
        },
      },
      signature: {
        algorithm: 'hmac-sha256',
        keyId: '2026-q2',
        signatureVersion: 'v2',
        value: 'hmac-sha256:signed-manifest',
      },
    });
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: invalidManifestHashFetch }),
  /record export manifest invalid source segment hash: sha256:source-segment/,
);

const invalidOutputHashFetch = async (url, init = {}) => {
  if (String(url).endsWith('/manifests/review-export-1.json')) {
    return jsonResponse({
      manifestVersion: 2,
      recordSegments: [
        {
          index: 0,
          recordUri: '/video/record/space/7/video/live/device-01/clip.mp4',
          sourceHash: SOURCE_SEGMENT_HASH,
          clipStartTime: '2026-07-05T10:00:00',
          clipEndTime: '2026-07-05T10:01:00',
          ffmpegCommandHash: FFMPEG_COMMAND_HASH,
        },
      ],
      files: [
        {
          path: 'review-export-1.mp4',
          role: 'export_package',
          hash: 'output-file',
          storage: {
            storageType: 'object_storage',
            artifactRole: 'export_package',
            objectKey: 'review-export-1/content.bin',
            expiresAt: '2026-07-20T00:00:00Z',
            lifecycleStatus: 'retained',
          },
        },
      ],
      storageLifecycle: {
        storageType: 'object_storage',
        storeRoot: 's3://evidence-exports',
        status: 'retained',
        expiresAt: '2026-07-20T00:00:00Z',
        artifactKeys: {
          exportPackage: 'review-export-1/content.bin',
        },
      },
      signature: {
        algorithm: 'hmac-sha256',
        keyId: '2026-q2',
        signatureVersion: 'v2',
        value: 'hmac-sha256:signed-manifest',
      },
    });
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: invalidOutputHashFetch }),
  /record export manifest invalid output file hash: output-file/,
);

const invalidFfmpegCommandHashFetch = async (url, init = {}) => {
  if (String(url).endsWith('/manifests/review-export-1.json')) {
    return jsonResponse({
      manifestVersion: 2,
      recordSegments: [
        {
          index: 0,
          recordUri: '/video/record/space/7/video/live/device-01/clip.mp4',
          sourceHash: SOURCE_SEGMENT_HASH,
          clipStartTime: '2026-07-05T10:00:00',
          clipEndTime: '2026-07-05T10:01:00',
          ffmpegCommandHash: 'sha256:ffmpeg-command',
        },
      ],
      files: [
        {
          path: 'review-export-1.mp4',
          role: 'export_package',
          hash: OUTPUT_FILE_HASH,
          storage: {
            storageType: 'object_storage',
            artifactRole: 'export_package',
            objectKey: 'review-export-1/content.bin',
            expiresAt: '2026-07-20T00:00:00Z',
            lifecycleStatus: 'retained',
          },
        },
      ],
      storageLifecycle: {
        storageType: 'object_storage',
        storeRoot: 's3://evidence-exports',
        status: 'retained',
        expiresAt: '2026-07-20T00:00:00Z',
        artifactKeys: {
          exportPackage: 'review-export-1/content.bin',
        },
      },
      signature: {
        algorithm: 'hmac-sha256',
        keyId: '2026-q2',
        signatureVersion: 'v2',
        value: 'hmac-sha256:signed-manifest',
      },
    });
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: invalidFfmpegCommandHashFetch }),
  /record export manifest invalid ffmpeg command hash: sha256:ffmpeg-command/,
);

const invalidClipWindowFetch = async (url, init = {}) => {
  if (String(url).endsWith('/manifests/review-export-1.json')) {
    return jsonResponse({
      manifestVersion: 2,
      recordSegments: [
        {
          index: 0,
          recordUri: '/video/record/space/7/video/live/device-01/clip.mp4',
          sourceHash: SOURCE_SEGMENT_HASH,
          clipStartTime: '2026-07-05T10:01:00',
          clipEndTime: '2026-07-05T10:00:00',
          ffmpegCommandHash: FFMPEG_COMMAND_HASH,
        },
      ],
      files: [
        {
          path: 'review-export-1.mp4',
          role: 'export_package',
          hash: OUTPUT_FILE_HASH,
          storage: {
            storageType: 'object_storage',
            artifactRole: 'export_package',
            objectKey: 'review-export-1/content.bin',
            expiresAt: '2026-07-20T00:00:00Z',
            lifecycleStatus: 'retained',
          },
        },
      ],
      storageLifecycle: {
        storageType: 'object_storage',
        storeRoot: 's3://evidence-exports',
        status: 'retained',
        expiresAt: '2026-07-20T00:00:00Z',
        artifactKeys: {
          exportPackage: 'review-export-1/content.bin',
        },
      },
      signature: {
        algorithm: 'hmac-sha256',
        keyId: '2026-q2',
        signatureVersion: 'v2',
        value: 'hmac-sha256:signed-manifest',
      },
    });
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: invalidClipWindowFetch }),
  /record export manifest invalid clip window: 2026-07-05T10:01:00 -> 2026-07-05T10:00:00/,
);

const duplicateConcatOrderFetch = async (url, init = {}) => {
  if (String(url).endsWith('/manifests/review-export-1.json')) {
    return jsonResponse({
      manifestVersion: 2,
      recordSegments: [
        {
          index: 0,
          recordUri: '/video/record/space/7/video/live/device-01/clip-a.mp4',
          sourceHash: SOURCE_SEGMENT_HASH,
          clipStartTime: '2026-07-05T10:00:00',
          clipEndTime: '2026-07-05T10:00:30',
          ffmpegCommandHash: FFMPEG_COMMAND_HASH,
        },
        {
          index: 0,
          recordUri: '/video/record/space/7/video/live/device-01/clip-b.mp4',
          sourceHash: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
          clipStartTime: '2026-07-05T10:00:30',
          clipEndTime: '2026-07-05T10:01:00',
          ffmpegCommandHash: FFMPEG_COMMAND_HASH,
        },
      ],
      files: [
        {
          path: 'review-export-1.mp4',
          role: 'export_package',
          hash: OUTPUT_FILE_HASH,
          storage: {
            storageType: 'object_storage',
            artifactRole: 'export_package',
            objectKey: 'review-export-1/content.bin',
            expiresAt: '2026-07-20T00:00:00Z',
            lifecycleStatus: 'retained',
          },
        },
      ],
      storageLifecycle: {
        storageType: 'object_storage',
        storeRoot: 's3://evidence-exports',
        status: 'retained',
        expiresAt: '2026-07-20T00:00:00Z',
        artifactKeys: {
          exportPackage: 'review-export-1/content.bin',
        },
      },
      signature: {
        algorithm: 'hmac-sha256',
        keyId: '2026-q2',
        signatureVersion: 'v2',
        value: 'hmac-sha256:signed-manifest',
      },
    });
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: duplicateConcatOrderFetch }),
  /record export manifest duplicate concat order index: 0/,
);

function rootConcatOrderManifest(concatOrder) {
  return {
    manifestVersion: 2,
    concatOrder,
    recordSegments: [
      {
        index: 0,
        recordUri: '/video/record/space/7/video/live/device-01/clip-a.mp4',
        sourceHash: SOURCE_SEGMENT_HASH,
        clipStartTime: '2026-07-05T10:00:00',
        clipEndTime: '2026-07-05T10:00:30',
        ffmpegCommandHash: FFMPEG_COMMAND_HASH,
      },
      {
        index: 1,
        recordUri: '/video/record/space/7/video/live/device-01/clip-b.mp4',
        sourceHash: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        clipStartTime: '2026-07-05T10:00:30',
        clipEndTime: '2026-07-05T10:01:00',
        ffmpegCommandHash: FFMPEG_COMMAND_HASH,
      },
    ],
    files: [
      {
        path: 'review-export-1.mp4',
        role: 'export_package',
        hash: OUTPUT_FILE_HASH,
        storage: {
          storageType: 'object_storage',
          artifactRole: 'export_package',
          objectKey: 'review-export-1/content.bin',
          expiresAt: '2026-07-20T00:00:00Z',
          lifecycleStatus: 'retained',
        },
      },
    ],
    storageLifecycle: {
      storageType: 'object_storage',
      storeRoot: 's3://evidence-exports',
      status: 'retained',
      expiresAt: '2026-07-20T00:00:00Z',
      artifactKeys: {
        exportPackage: 'review-export-1/content.bin',
      },
    },
    signature: {
      algorithm: 'hmac-sha256',
      keyId: '2026-q2',
      signatureVersion: 'v2',
      value: 'hmac-sha256:signed-manifest',
    },
  };
}

const duplicateRootConcatOrderFetch = async (url, init = {}) => {
  if (String(url).endsWith('/manifests/review-export-1.json')) {
    return jsonResponse(rootConcatOrderManifest([0, 0]));
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: duplicateRootConcatOrderFetch }),
  /record export manifest duplicate concat order index: 0/,
);

const missingRootConcatOrderReferenceFetch = async (url, init = {}) => {
  if (String(url).endsWith('/manifests/review-export-1.json')) {
    return jsonResponse(rootConcatOrderManifest([0, 2]));
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: missingRootConcatOrderReferenceFetch }),
  /record export manifest concat order references missing segment index: 2/,
);

const omittedRootConcatOrderSegmentFetch = async (url, init = {}) => {
  if (String(url).endsWith('/manifests/review-export-1.json')) {
    return jsonResponse(rootConcatOrderManifest([0]));
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: omittedRootConcatOrderSegmentFetch }),
  /record export manifest concat order omits segment index: 1/,
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

const missingStorageLifecycleFetch = async (url, init = {}) => {
  if (String(url).endsWith('/manifests/review-export-1.json')) {
    return jsonResponse({
      manifestVersion: 2,
      recordSegments: [
        {
          index: 0,
          recordUri: '/video/record/space/7/video/live/device-01/clip.mp4',
          sourceHash: SOURCE_SEGMENT_HASH,
          clipStartTime: '2026-07-05T10:00:00',
          clipEndTime: '2026-07-05T10:01:00',
          ffmpegCommandHash: FFMPEG_COMMAND_HASH,
        },
      ],
      files: [
        {
          path: 'review-export-1.mp4',
          role: 'export_package',
          hash: OUTPUT_FILE_HASH,
        },
      ],
      signature: {
        algorithm: 'hmac-sha256',
        keyId: '2026-q2',
        signatureVersion: 'v2',
        value: 'hmac-sha256:signed-manifest',
      },
    });
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: missingStorageLifecycleFetch }),
  /record export manifest missing storage lifecycle/,
);

const unsignedManifestFetch = async (url, init = {}) => {
  if (String(url).endsWith('/manifests/review-export-1.json')) {
    return jsonResponse({
      manifestVersion: 2,
      recordSegments: [
        {
          index: 0,
          recordUri: '/video/record/space/7/video/live/device-01/clip.mp4',
          sourceHash: SOURCE_SEGMENT_HASH,
          clipStartTime: '2026-07-05T10:00:00',
          clipEndTime: '2026-07-05T10:01:00',
          ffmpegCommandHash: FFMPEG_COMMAND_HASH,
        },
      ],
      files: [
        {
          path: 'review-export-1.mp4',
          role: 'export_package',
          hash: OUTPUT_FILE_HASH,
        },
      ],
    });
  }
  return fakeFetch(url, init);
};
await assert.rejects(
  () => runSmoke(parsed, { fetchImpl: unsignedManifestFetch }),
  /record export manifest missing HMAC signature metadata/,
);

const incompleteManifestFetch = async (url, init = {}) => {
  if (String(url).endsWith('/manifests/review-export-1.json')) {
    return jsonResponse({
      manifestVersion: 2,
      ffmpegCommandHash: FFMPEG_COMMAND_HASH,
      sourceSegments: [
        {
          recordUri: '/video/record/space/7/video/live/device-01/clip.mp4',
          sourceHash: SOURCE_SEGMENT_HASH,
        },
      ],
      outputs: [
        {
          path: 'review-export-1.mp4',
          sha256: OUTPUT_FILE_HASH,
        },
      ],
      signature: {
        algorithm: 'hmac-sha256',
        keyId: '2026-q2',
        signatureVersion: 'v2',
        value: 'hmac-sha256:signed-manifest',
      },
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

function jsonResponse(body, status = 200, headers = {}) {
  const headerMap = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)]));
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'ERROR',
    headers: {
      get(name) {
        return headerMap.get(String(name).toLowerCase()) || null;
      },
    },
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

console.log('alert review VIDEO live smoke tests OK');

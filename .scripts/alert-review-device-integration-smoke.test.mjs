import assert from 'node:assert/strict';

import {
  REQUIRED_CHECKPOINTS,
  buildSmokeBody,
  buildSmokeUrl,
  parseArgs,
  requiredOptionErrors,
  runSmoke,
  validateSmokeResult,
} from './alert-review-device-integration-smoke.mjs';
import {
  evaluateStatus,
  releaseEntriesForTrackedPaths,
} from './verify-alert-review-release-package.mjs';

const parsed = parseArgs([
  '--device-base-url=http://device.local/api',
  '--token=token-1',
  '--operator-user-id=9001',
  '--alert-time=2026-07-05T10:00:00',
  '--profile=device-video-web',
  '--timeout-ms=5000',
], {});
assert.equal(parsed.deviceBaseUrl, 'http://device.local/api');
assert.equal(parsed.token, 'token-1');
assert.equal(parsed.operatorUserId, 9001);
assert.equal(parsed.alertTime, '2026-07-05T10:00:00');
assert.equal(parsed.profile, 'device-video-web');
assert.equal(parsed.includeVideoExport, true);
assert.equal(parsed.timeoutMs, 5000);

const fromEnv = parseArgs([], {
  YFEIEYE_DEVICE_BASE_URL: 'https://release-device.local/admin-api',
  YFEIEYE_DEVICE_AUTH_TOKEN: 'env-token',
  YFEIEYE_DEVICE_SMOKE_OPERATOR_USER_ID: '9200',
  YFEIEYE_DEVICE_SMOKE_ALERT_TIME: '2026-07-05T11:00:00',
});
assert.equal(fromEnv.deviceBaseUrl, 'https://release-device.local/admin-api');
assert.equal(fromEnv.token, 'env-token');
assert.equal(fromEnv.operatorUserId, 9200);
assert.equal(fromEnv.profile, 'release');
assert.equal(fromEnv.includeVideoExport, true);

assert.deepEqual(requiredOptionErrors(parseArgs([], {})), [
  'missing --device-base-url or YFEIEYE_DEVICE_BASE_URL',
  'missing --token or YFEIEYE_DEVICE_AUTH_TOKEN',
  'missing --operator-user-id or YFEIEYE_DEVICE_SMOKE_OPERATOR_USER_ID',
  'missing --alert-time or YFEIEYE_DEVICE_SMOKE_ALERT_TIME',
]);

assert.equal(
  buildSmokeUrl(parsed),
  'http://device.local/api/system/supervision/alert-review/integration-smoke',
);

assert.deepEqual(buildSmokeBody(parsed), {
  operatorUserId: 9001,
  includeVideoExport: true,
  alertTime: '2026-07-05T10:00:00',
  profile: 'device-video-web',
});

const validPayload = {
  status: 'passed',
  reviewItemId: 1001,
  reviewCaseId: 2001,
  exportJobNo: 'REJ-1',
  manifestValid: true,
  videoExportRequested: true,
  checkpoints: [
    'device_api_reachable',
    'video_record_query_checked',
    ...REQUIRED_CHECKPOINTS,
    'sample_web_contract_renderable',
  ],
};
const validated = validateSmokeResult(validPayload);
assert.equal(validated.ok, true);
assert.deepEqual(validated.checkpoints, validPayload.checkpoints);

const calls = [];
const smoke = await runSmoke(parsed, {
  fetchImpl: async (url, init = {}) => {
    calls.push({ url: String(url), init });
    assert.equal(String(url), 'http://device.local/api/system/supervision/alert-review/integration-smoke');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.authorization, 'Bearer token-1');
    assert.equal(init.headers['content-type'], 'application/json');
    assert.deepEqual(JSON.parse(init.body), buildSmokeBody(parsed));
    return jsonResponse({ code: 0, data: validPayload });
  },
});
assert.equal(smoke.ok, true);
assert.equal(smoke.result.reviewItemId, 1001);
assert.equal(calls.length, 1);

await assert.rejects(
  () => runSmoke(parseArgs([], {}), { fetchImpl: async () => jsonResponse({}) }),
  /missing --device-base-url/,
);

await assert.rejects(
  () => runSmoke(parsed, {
    fetchImpl: async () => jsonResponse({
      code: 0,
      data: {
        ...validPayload,
        checkpoints: REQUIRED_CHECKPOINTS.filter((checkpoint) => checkpoint !== 'evidence_download_audited'),
      },
    }),
  }),
  /missing smoke checkpoint: evidence_download_audited/,
);

await assert.rejects(
  () => runSmoke(parsed, {
    fetchImpl: async () => jsonResponse({
      code: 0,
      data: {
        ...validPayload,
        manifestValid: false,
      },
    }),
  }),
  /integration smoke manifestValid was not true/,
);

await assert.rejects(
  () => runSmoke(parsed, {
    fetchImpl: async () => jsonResponse({
      code: 0,
      data: {
        ...validPayload,
        videoExportRequested: false,
      },
    }),
  }),
  /integration smoke videoExportRequested was not true/,
);

const untrackedDeviceSmoke = evaluateStatus(`
?? .scripts/alert-review-device-integration-smoke.mjs
?? .scripts/alert-review-device-integration-smoke.test.mjs
`);
assert.equal(untrackedDeviceSmoke.ok, false);
assert.equal(untrackedDeviceSmoke.blockers[0].group, 'FR release gate tooling');
assert.equal(untrackedDeviceSmoke.blockers[1].group, 'FR release gate tooling');

const trackedDeviceSmokeEntries = releaseEntriesForTrackedPaths([
  '.scripts/alert-review-device-integration-smoke.mjs',
  '.scripts/alert-review-device-integration-smoke.test.mjs',
]);
assert.equal(trackedDeviceSmokeEntries.length, 2);

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'ERROR',
    async text() {
      return JSON.stringify(body);
    },
  };
}

console.log('alert review DEVICE integration smoke tests OK');

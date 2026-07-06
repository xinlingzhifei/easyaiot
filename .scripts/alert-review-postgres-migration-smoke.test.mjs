import assert from 'node:assert/strict';

import {
  MIGRATION_FILES,
  buildBootstrapSql,
  buildConcurrentDuplicateIdentityInsertSql,
  buildConcurrentReviewSegmentBootstrapSql,
  buildConcurrentReviewSegmentInsertSql,
  buildPostMigrationAssertionSql,
  parseArgs,
  summarizeConcurrentDuplicateResults,
  summarizeConcurrentReviewSegmentResults,
} from './alert-review-postgres-migration-smoke.mjs';
import {
  evaluateStatus,
  releaseEntriesForTrackedPaths,
} from './verify-alert-review-release-package.mjs';

assert.deepEqual(MIGRATION_FILES, [
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260702__alert_review_frigate_hardening.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260704__alert_review_segment_tenant_scope.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260705__alert_review_review_data_backfill.sql',
]);

const bootstrapSql = buildBootstrapSql();
assert.match(bootstrapSql, /CREATE TABLE system_supervision_alert_review_item/);
assert.match(bootstrapSql, /source_alert_ids TEXT/);
assert.match(bootstrapSql, /a-shared/);
assert.match(bootstrapSql, /system_supervision_alert_review_segment/);
assert.match(bootstrapSql, /review_data TEXT/);
assert.match(bootstrapSql, /legacy-correlation/);

const assertionSql = buildPostMigrationAssertionSql();
assert.match(assertionSql, /system_supervision_alert_review_ingest_identity/);
assert.match(assertionSql, /expected tenant-scoped ingest identity backfill/);
assert.match(assertionSql, /unique_violation/);
assert.match(assertionSql, /exclusion_violation/);
assert.match(assertionSql, /expected open active ReviewSegment to block later same-camera segment/);
assert.match(assertionSql, /expected ReviewData backfill to normalize legacy rows/);
assert.match(assertionSql, /reviewDataVersion/);
assert.match(assertionSql, /reviewSegment/);

const concurrentInsertSql = buildConcurrentDuplicateIdentityInsertSql();
assert.match(concurrentInsertSql, /video:alert:a-race/);
assert.match(concurrentInsertSql, /system_supervision_alert_review_ingest_identity/);

const concurrentSegmentBootstrapSql = buildConcurrentReviewSegmentBootstrapSql();
assert.match(concurrentSegmentBootstrapSql, /a-segment-race-1/);
assert.match(concurrentSegmentBootstrapSql, /a-segment-race-2/);
assert.match(concurrentSegmentBootstrapSql, /camera-segment-race-01/);

const concurrentSegmentInsertSql = buildConcurrentReviewSegmentInsertSql({
  reviewItemId: 7001,
  segmentNo: 'seg-race-1',
});
assert.match(concurrentSegmentInsertSql, /review_item_id, segment_no, tenant_id, camera_id/);
assert.match(concurrentSegmentInsertSql, /7001, 'seg-race-1'/);
assert.match(concurrentSegmentInsertSql, /camera-segment-race-01/);
assert.match(concurrentSegmentInsertSql, /NULL, false/);

assert.equal(
  summarizeConcurrentDuplicateResults([
    { status: 0, stdout: 'INSERT 0 1', stderr: '' },
    {
      status: 3,
      stdout: '',
      stderr: 'ERROR: duplicate key value violates unique constraint "uk_supervision_alert_review_ingest_identity"',
    },
  ]),
  'concurrent duplicate ingest identity smoke passed',
);
assert.throws(
  () => summarizeConcurrentDuplicateResults([
    { status: 0, stdout: 'INSERT 0 1', stderr: '' },
    { status: 0, stdout: 'INSERT 0 1', stderr: '' },
  ]),
  /expected exactly one concurrent duplicate identity insert to succeed/,
);

assert.equal(
  summarizeConcurrentReviewSegmentResults([
    { status: 0, stdout: 'INSERT 0 1', stderr: '' },
    {
      status: 3,
      stdout: '',
      stderr: 'ERROR: conflicting key value violates exclusion constraint "ex_supervision_alert_review_segment_camera_time"',
    },
  ]),
  'concurrent ReviewSegment overlap smoke passed',
);
assert.throws(
  () => summarizeConcurrentReviewSegmentResults([
    { status: 0, stdout: 'INSERT 0 1', stderr: '' },
    { status: 0, stdout: 'INSERT 0 1', stderr: '' },
  ]),
  /expected exactly one concurrent ReviewSegment insert to succeed/,
);

assert.deepEqual(parseArgs(['--container=pg-review', '--database=yfeieye_smoke']), {
  container: 'pg-review',
  database: 'yfeieye_smoke',
  repoRoot: process.cwd(),
  keepDatabase: false,
  help: false,
});
assert.equal(parseArgs(['--help']).help, true);
assert.throws(() => parseArgs(['--bogus']), /Unknown argument/);

const untrackedSmoke = evaluateStatus(`
?? .scripts/alert-review-postgres-migration-smoke.mjs
?? .scripts/alert-review-postgres-migration-smoke.test.mjs
`);
assert.equal(untrackedSmoke.ok, false);
assert.equal(untrackedSmoke.blockers[0].group, 'FR release gate tooling');
assert.equal(untrackedSmoke.blockers[1].group, 'FR release gate tooling');

const trackedSmokeEntries = releaseEntriesForTrackedPaths([
  '.scripts/alert-review-postgres-migration-smoke.mjs',
  '.scripts/alert-review-postgres-migration-smoke.test.mjs',
]);
assert.equal(trackedSmokeEntries.length, 2);

console.log('alert review postgres migration smoke tests OK');

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  MIGRATION_FILES,
  buildBootstrapSql,
  buildConcurrentDuplicateIdentityInsertSql,
  buildConcurrentReviewStatusBootstrapSql,
  buildConcurrentReviewStatusUpdateSql,
  buildConcurrentReviewSegmentBootstrapSql,
  buildConcurrentReviewSegmentInsertSql,
  buildPsqlInvocation,
  databaseUrlForDatabase,
  buildPostMigrationAssertionSql,
  parseArgs,
  summarizeConcurrentDuplicateResults,
  summarizeConcurrentReviewStatusResults,
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
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260706__alert_review_media_permissions.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260707__alert_review_item_media_audit.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708__alert_review_segment_status_transition.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_2__alert_review_scheduler_jobs.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_3__alert_review_report_ack.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_4__alert_review_runtime_outbox_notify_templates.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_5__alert_review_runtime_outbox_delivery.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_6__alert_review_runtime_outbox_claim.sql',
]);

const schedulerJobMigrationSql = readFileSync(MIGRATION_FILES.find((file) => file.includes('scheduler_jobs')), 'utf8');
assert.doesNotMatch(schedulerJobMigrationSql, /existing\.id\s*=\s*seed\.id/);
assert.match(schedulerJobMigrationSql, /WHERE existing\.handler_name = seed\.handler_name/);
assert.match(schedulerJobMigrationSql, /existing\.handler_param IS NOT DISTINCT FROM seed\.handler_param/);
assert.match(schedulerJobMigrationSql, /supervisionAlertReviewEvidenceExportWorkerJob/);
assert.match(schedulerJobMigrationSql, /supervisionAlertReviewOperationsReportJob/);
assert.match(schedulerJobMigrationSql, /'shift'/);
assert.match(schedulerJobMigrationSql, /'daily'/);

const reportAckMigrationSql = readFileSync(MIGRATION_FILES.find((file) => file.includes('report_ack')), 'utf8');
assert.match(reportAckMigrationSql, /system_supervision_alert_review_report_ack/);
assert.match(reportAckMigrationSql, /report_key VARCHAR\(128\) NOT NULL/);
assert.match(reportAckMigrationSql, /acknowledgement_status VARCHAR\(32\) NOT NULL/);
assert.match(reportAckMigrationSql, /uk_supervision_alert_review_report_ack_key/);

const runtimeOutboxNotifyTemplateMigrationSql = readFileSync(
  MIGRATION_FILES.find((file) => file.includes('runtime_outbox_notify_templates')),
  'utf8',
);
assert.match(runtimeOutboxNotifyTemplateMigrationSql, /system_notify_template/);
assert.match(runtimeOutboxNotifyTemplateMigrationSql, /YFEIEYE_REVIEW_RUNTIME_ALERT/);
assert.match(runtimeOutboxNotifyTemplateMigrationSql, /YFEIEYE_REVIEW_OPERATIONS_REPORT/);
assert.match(runtimeOutboxNotifyTemplateMigrationSql, /existing\.code = seed\.code/);

const runtimeOutboxDeliveryMigrationSql = readFileSync(
  MIGRATION_FILES.find((file) => file.includes('runtime_outbox_delivery')),
  'utf8',
);
assert.match(runtimeOutboxDeliveryMigrationSql, /system_supervision_alert_review_runtime_outbox_delivery/);
assert.match(runtimeOutboxDeliveryMigrationSql, /recipient_user_id BIGINT NOT NULL/);
assert.match(runtimeOutboxDeliveryMigrationSql, /notify_message_id BIGINT/);
assert.match(runtimeOutboxDeliveryMigrationSql, /uk_supervision_alert_review_runtime_outbox_delivery_recipient/);
assert.match(runtimeOutboxDeliveryMigrationSql, /FOREIGN KEY \(outbox_id\)/);

const runtimeOutboxClaimMigrationSql = readFileSync(
  MIGRATION_FILES.find((file) => file.includes('runtime_outbox_claim')),
  'utf8',
);
assert.match(runtimeOutboxClaimMigrationSql, /claim_token VARCHAR\(128\)/);
assert.match(runtimeOutboxClaimMigrationSql, /claimed_by BIGINT/);
assert.match(runtimeOutboxClaimMigrationSql, /claimed_at TIMESTAMP/);
assert.match(runtimeOutboxClaimMigrationSql, /idx_supervision_alert_review_runtime_outbox_claim/);

const bootstrapSql = buildBootstrapSql();
assert.match(bootstrapSql, /CREATE SEQUENCE system_menu_seq/);
assert.match(bootstrapSql, /CREATE TABLE system_menu/);
assert.match(bootstrapSql, /CREATE TABLE infra_job/);
assert.match(bootstrapSql, /CREATE TABLE system_notify_template/);
assert.match(bootstrapSql, /CREATE TABLE system_supervision_alert_review_runtime_outbox/);
assert.match(bootstrapSql, /CREATE TABLE system_supervision_alert_review_item/);
assert.match(bootstrapSql, /source_alert_ids TEXT/);
assert.match(bootstrapSql, /a-shared/);
assert.match(bootstrapSql, /system_supervision_alert_review_segment/);
assert.match(bootstrapSql, /review_case_id BIGINT NOT NULL/);
assert.match(bootstrapSql, /review_data TEXT/);
assert.match(bootstrapSql, /legacy-correlation/);

const assertionSql = buildPostMigrationAssertionSql();
assert.match(assertionSql, /system_supervision_alert_review_ingest_identity/);
assert.match(assertionSql, /expected tenant-scoped ingest identity backfill/);
assert.match(assertionSql, /unique_violation/);
assert.match(assertionSql, /exclusion_violation/);
assert.match(assertionSql, /expected open active ReviewSegment to block later same-camera segment/);
assert.match(assertionSql, /expected duplicate active ReviewSegment review_item_id to be rejected/);
assert.match(assertionSql, /expected deleted duplicate ReviewSegment review_item_id to be allowed/);
assert.match(assertionSql, /expected ReviewData backfill to normalize legacy rows/);
assert.match(assertionSql, /reviewDataVersion/);
assert.match(assertionSql, /reviewSegment/);
assert.match(assertionSql, /system:supervision-alert-review:media:playback/);
assert.match(assertionSql, /expected review media permission seeds to be present/);
assert.match(assertionSql, /expected paused alert review scheduler job seeds to be present/);
assert.match(assertionSql, /supervisionAlertReviewEventReconcileJob/);
assert.match(assertionSql, /supervisionAlertReviewEvidenceExportWorkerJob/);
assert.match(assertionSql, /supervisionAlertReviewOperationsReportJob/);
assert.match(assertionSql, /YFEIEYE_REVIEW_RUNTIME_ALERT/);
assert.match(assertionSql, /YFEIEYE_REVIEW_OPERATIONS_REPORT/);
assert.match(assertionSql, /expected runtime outbox notify templates to be seeded/);
assert.match(assertionSql, /system_supervision_alert_review_runtime_outbox_delivery/);
assert.match(assertionSql, /expected runtime outbox delivery recipient idempotency index to exist/);
assert.match(assertionSql, /expected runtime outbox claim columns to exist/);
assert.match(assertionSql, /expected runtime outbox claim index to exist/);
assert.match(assertionSql, /expected review case audit to allow pre-case media audit rows/);
assert.match(assertionSql, /idx_supervision_alert_review_case_audit_item/);
assert.match(assertionSql, /expected stale review status version update to affect no rows/);
assert.match(assertionSql, /expected repeated same-status reviewer update to be idempotent/);
assert.match(assertionSql, /expected ended ReviewSegment reopen to be rejected/);
assert.match(assertionSql, /tr_supervision_alert_review_segment_status_transition/);

const concurrentInsertSql = buildConcurrentDuplicateIdentityInsertSql();
assert.match(concurrentInsertSql, /video:alert:a-race/);
assert.match(concurrentInsertSql, /system_supervision_alert_review_ingest_identity/);

const concurrentReviewStatusBootstrapSql = buildConcurrentReviewStatusBootstrapSql();
assert.match(concurrentReviewStatusBootstrapSql, /review-status-race/);
assert.match(concurrentReviewStatusBootstrapSql, /pending_review/);
assert.match(concurrentReviewStatusBootstrapSql, /8001/);

const concurrentReviewStatusUpdateSql = buildConcurrentReviewStatusUpdateSql();
assert.match(concurrentReviewStatusUpdateSql, /UPDATE system_supervision_alert_review_item/);
assert.match(concurrentReviewStatusUpdateSql, /review_status = 'reviewed'/);
assert.match(concurrentReviewStatusUpdateSql, /version = version \+ 1/);
assert.match(concurrentReviewStatusUpdateSql, /id = 8001/);
assert.match(concurrentReviewStatusUpdateSql, /version = 0/);

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
  summarizeConcurrentReviewStatusResults([
    { status: 0, stdout: 'UPDATE 1', stderr: '' },
    { status: 0, stdout: 'UPDATE 0', stderr: '' },
  ]),
  'concurrent review status version smoke passed',
);
assert.throws(
  () => summarizeConcurrentReviewStatusResults([
    { status: 0, stdout: 'UPDATE 1', stderr: '' },
    { status: 0, stdout: 'UPDATE 1', stderr: '' },
  ]),
  /expected exactly one concurrent review status update to win the version race/,
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
  databaseUrl: null,
  database: 'yfeieye_smoke',
  repoRoot: process.cwd(),
  keepDatabase: false,
  help: false,
});
assert.deepEqual(parseArgs([
  '--database-url=postgresql://ci:secret@db.example:5432/postgres?sslmode=require',
  '--database=yfeieye_smoke',
]), {
  container: null,
  databaseUrl: 'postgresql://ci:secret@db.example:5432/postgres?sslmode=require',
  database: 'yfeieye_smoke',
  repoRoot: process.cwd(),
  keepDatabase: false,
  help: false,
});
assert.equal(
  databaseUrlForDatabase(
    'postgresql://ci:secret@db.example:5432/postgres?sslmode=require',
    'yfeieye_alert_review_smoke',
  ),
  'postgresql://ci:secret@db.example:5432/yfeieye_alert_review_smoke?sslmode=require',
);
assert.deepEqual(
  buildPsqlInvocation({
    container: null,
    databaseUrl: 'postgresql://ci:secret@db.example:5432/postgres?sslmode=require',
  }, 'yfeieye_alert_review_smoke'),
  {
    command: 'psql',
    args: ['-v', 'ON_ERROR_STOP=1'],
    env: {
      PGDATABASE: 'yfeieye_alert_review_smoke',
      PGHOST: 'db.example',
      PGPASSWORD: 'secret',
      PGPORT: '5432',
      PGSSLMODE: 'require',
      PGUSER: 'ci',
    },
    label: 'psql/yfeieye_alert_review_smoke',
  },
);
assert.equal(
  JSON.stringify(buildPsqlInvocation({
    container: null,
    databaseUrl: 'postgresql://ci:secret@db.example:5432/postgres?sslmode=require',
  }, 'yfeieye_alert_review_smoke').args).includes('secret'),
  false,
);
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

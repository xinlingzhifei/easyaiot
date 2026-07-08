import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIGRATION_FILES = [
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
];

export function parseArgs(args, cwd = process.cwd()) {
  const parsed = {
    container: null,
    database: `yfeieye_alert_review_migration_smoke_${Date.now()}`,
    repoRoot: cwd,
    keepDatabase: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--keep-database') {
      parsed.keepDatabase = true;
    } else if (arg.startsWith('--container=')) {
      parsed.container = arg.slice('--container='.length);
    } else if (arg.startsWith('--database=')) {
      parsed.database = arg.slice('--database='.length);
    } else if (arg.startsWith('--repo-root=')) {
      parsed.repoRoot = resolve(arg.slice('--repo-root='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

export function buildBootstrapSql() {
  return `
CREATE SEQUENCE system_menu_seq START WITH 10000;

CREATE TABLE system_menu (
  id BIGINT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL DEFAULT '',
  type SMALLINT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  parent_id BIGINT NOT NULL DEFAULT 0,
  path VARCHAR(200),
  icon VARCHAR(100),
  component VARCHAR(255),
  component_name VARCHAR(255),
  status SMALLINT NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  keep_alive BOOLEAN NOT NULL DEFAULT TRUE,
  always_show BOOLEAN NOT NULL DEFAULT TRUE,
  creator VARCHAR(64),
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updater VARCHAR(64),
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE infra_job (
  id BIGINT PRIMARY KEY,
  name VARCHAR(32) NOT NULL,
  status SMALLINT NOT NULL,
  handler_name VARCHAR(64) NOT NULL,
  handler_param VARCHAR(255),
  cron_expression VARCHAR(32) NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  retry_interval INTEGER NOT NULL DEFAULT 0,
  monitor_timeout INTEGER NOT NULL DEFAULT 0,
  creator VARCHAR(64),
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updater VARCHAR(64),
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE system_notify_template (
  id BIGINT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  code VARCHAR(128) NOT NULL,
  type SMALLINT NOT NULL,
  nickname VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  params TEXT,
  status SMALLINT NOT NULL DEFAULT 0,
  remark VARCHAR(512),
  creator VARCHAR(64),
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updater VARCHAR(64),
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE system_supervision_alert_review_runtime_outbox (
  id BIGSERIAL PRIMARY KEY,
  run_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  alert_key VARCHAR(128) NOT NULL,
  payload TEXT,
  outbox_status VARCHAR(64) NOT NULL DEFAULT 'pending',
  operator_user_id BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  creator VARCHAR(64),
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updater VARCHAR(64),
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO system_menu(
  id, name, permission, type, sort, parent_id, path, icon, component, component_name,
  status, visible, keep_alive, always_show, creator, create_time, updater, update_time, deleted
)
VALUES (
  9001, '旧复核录像播放', 'system:supervision-alert-review:media:playback', 3, 10, 0, '', '#', NULL, NULL,
  0, TRUE, TRUE, TRUE, 'system', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP, 1
);

CREATE TABLE system_supervision_alert_review_item (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT,
  source_system VARCHAR(64) NOT NULL,
  source_alert_type VARCHAR(128),
  source_alert_ids TEXT,
  object_label VARCHAR(128),
  first_alert_time TIMESTAMP,
  review_status VARCHAR(64),
  camera_id VARCHAR(128),
  zone_code VARCHAR(128),
  rule_code VARCHAR(128),
  last_alert_time TIMESTAMP,
  review_data TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE system_supervision_alert_review_case_audit (
  id BIGSERIAL PRIMARY KEY,
  review_case_id BIGINT NOT NULL,
  review_item_id BIGINT,
  happened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE system_supervision_alert_review_segment (
  id BIGSERIAL PRIMARY KEY,
  review_item_id BIGINT NOT NULL,
  segment_no VARCHAR(128) NOT NULL,
  camera_id VARCHAR(128) NOT NULL,
  severity VARCHAR(64) NOT NULL,
  segment_status VARCHAR(64) NOT NULL DEFAULT 'active',
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  object_ids TEXT,
  zone_codes TEXT,
  source_alert_ids TEXT,
  segment_events TEXT,
  segment_metadata TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  creator VARCHAR(64),
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updater VARCHAR(64),
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO system_supervision_alert_review_item(
  id, tenant_id, source_system, source_alert_type, source_alert_ids, object_label, first_alert_time,
  review_status, camera_id, zone_code, rule_code, last_alert_time, review_data, deleted
)
VALUES
  (1, 1001, 'video', 'motion', E'a-shared\\na-unique-1\\na-shared', 'person', '2026-07-05 10:00',
   'pending_review', 'camera-01', 'zone-a', 'rule-a', '2026-07-05 10:00',
   '{"correlationId":"legacy-correlation","confidence":0.87,"bbox":[1,2,3,4]}', false),
  (2, 2002, 'video', 'alert', E'a-shared\\na-unique-2', 'car', '2026-07-05 10:00',
   'pending_review', 'camera-01', 'zone-a', 'rule-a', '2026-07-05 10:00', NULL, false),
  (3, 1001, 'video', 'alert', 'a-shared', 'dog', '2026-07-05 10:10',
   'pending_review', 'camera-02', 'zone-b', 'rule-b', '2026-07-05 10:10',
   '{"reviewDataVersion":1,"labels":["dog"],"zones":["zone-b"],"objectIds":[],"objects":[{"label":"dog"}],"detections":[{"sourceAlertId":"a-shared","alertTime":"2026-07-05 10:10:00","cameraId":"camera-02"}],"reviewSegment":{"segmentId":"legacy-seg","cameraId":"camera-02","severity":"alert","status":"active","startTime":"2026-07-05 10:10:00","endTime":"2026-07-05 10:10:00","sourceAlertIds":["a-shared"]}}', false);

INSERT INTO system_supervision_alert_review_segment(
  review_item_id, segment_no, camera_id, severity, segment_status, start_time, end_time, deleted
)
VALUES
  (1, 'seg-tenant-1001', 'camera-01', 'alert', 'active', '2026-07-05 10:00', '2026-07-05 10:05', false),
  (2, 'seg-tenant-2002', 'camera-01', 'alert', 'active', '2026-07-05 10:01', '2026-07-05 10:04', false);
`;
}

export function buildPostMigrationAssertionSql() {
  return `
DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM system_menu
    WHERE permission IN (
      'system:supervision-alert-review:media:playback',
      'system:supervision-alert-review:media:export',
      'system:supervision-alert-review:media:download',
      'system:supervision-alert-review:media:manifest'
    )
      AND type = 3
      AND status = 0
      AND deleted = 0
  ) <> 4 THEN
    RAISE EXCEPTION 'expected review media permission seeds to be present';
  END IF;

  IF (
    SELECT count(*)
    FROM system_menu
    WHERE permission = 'system:supervision-alert-review:media:playback'
      AND deleted = 0
  ) <> 1 THEN
    RAISE EXCEPTION 'expected review media permission migration to restore existing playback seed without duplicates';
  END IF;

  IF (
    SELECT count(*)
    FROM infra_job
    WHERE handler_name IN (
      'supervisionAlertReviewRuntimePatrolJob',
      'supervisionAlertReviewRuntimeOutboxJob',
      'supervisionAlertReviewEventReconcileJob',
      'supervisionAlertReviewEvidenceExportWorkerJob',
      'supervisionAlertReviewSemanticIndexJob',
      'supervisionAlertReviewOperationsReportJob'
    )
      AND status = 2
      AND deleted = 0
  ) <> 7 THEN
    RAISE EXCEPTION 'expected paused alert review scheduler job seeds to be present';
  END IF;

  IF (
    SELECT count(*)
    FROM infra_job
    WHERE handler_name = 'supervisionAlertReviewEventReconcileJob'
      AND cron_expression = '0 0/5 * * * ?'
      AND status = 2
      AND deleted = 0
  ) <> 1 THEN
    RAISE EXCEPTION 'expected event reconcile scheduler seed to be paused and deduplicated';
  END IF;

  IF (
    SELECT count(*)
    FROM infra_job
    WHERE handler_name = 'supervisionAlertReviewEvidenceExportWorkerJob'
      AND handler_param = '20'
      AND cron_expression = '0 0/2 * * * ?'
      AND status = 2
      AND deleted = 0
  ) <> 1 THEN
    RAISE EXCEPTION 'expected evidence export worker scheduler seed to be paused and deduplicated';
  END IF;

  IF (
    SELECT count(*)
    FROM infra_job
    WHERE handler_name = 'supervisionAlertReviewOperationsReportJob'
      AND handler_param IN ('shift', 'daily')
      AND status = 2
      AND deleted = 0
  ) <> 2 THEN
    RAISE EXCEPTION 'expected operations report scheduler seeds to cover shift and daily reports';
  END IF;

  IF (
    SELECT count(*)
    FROM system_notify_template
    WHERE code IN (
      'YFEIEYE_REVIEW_RUNTIME_ALERT',
      'YFEIEYE_REVIEW_OPERATIONS_REPORT'
    )
      AND status = 0
      AND deleted = 0
  ) <> 2 THEN
    RAISE EXCEPTION 'expected runtime outbox notify templates to be seeded';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'system_supervision_alert_review_runtime_outbox_delivery'
  ) THEN
    RAISE EXCEPTION 'expected runtime outbox delivery table to exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'system_supervision_alert_review_runtime_outbox_delivery'
      AND indexname = 'uk_supervision_alert_review_runtime_outbox_delivery_recipient'
  ) THEN
    RAISE EXCEPTION 'expected runtime outbox delivery recipient idempotency index to exist';
  END IF;

  IF (
    SELECT count(*)
    FROM information_schema.columns
    WHERE table_name = 'system_supervision_alert_review_runtime_outbox'
      AND column_name IN ('claim_token', 'claimed_by', 'claimed_at')
  ) <> 3 THEN
    RAISE EXCEPTION 'expected runtime outbox claim columns to exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'system_supervision_alert_review_runtime_outbox'
      AND indexname = 'idx_supervision_alert_review_runtime_outbox_claim'
  ) THEN
    RAISE EXCEPTION 'expected runtime outbox claim index to exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'system_supervision_alert_review_case_audit'
      AND column_name = 'review_case_id'
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'expected review case audit to allow pre-case media audit rows';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'system_supervision_alert_review_case_audit'
      AND indexname = 'idx_supervision_alert_review_case_audit_item'
  ) THEN
    RAISE EXCEPTION 'expected review item media audit lookup index to exist';
  END IF;

  IF (
    SELECT count(*)
    FROM system_supervision_alert_review_ingest_identity
    WHERE deleted = FALSE
  ) <> 4 THEN
    RAISE EXCEPTION 'expected tenant-scoped ingest identity backfill to deduplicate historical source alerts into 4 rows';
  END IF;

  IF (
    SELECT count(*)
    FROM system_supervision_alert_review_ingest_identity
    WHERE tenant_id = 1001
      AND source_system = 'video'
      AND identity_key = 'video:alert:a-shared'
      AND deleted = FALSE
  ) <> 1 THEN
    RAISE EXCEPTION 'expected tenant-scoped ingest identity backfill for tenant 1001 shared alert';
  END IF;

  IF (
    SELECT count(*)
    FROM system_supervision_alert_review_ingest_identity
    WHERE tenant_id = 2002
      AND source_system = 'video'
      AND identity_key = 'video:alert:a-shared'
      AND deleted = FALSE
  ) <> 1 THEN
    RAISE EXCEPTION 'expected tenant-scoped ingest identity backfill for tenant 2002 shared alert';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM system_supervision_alert_review_item
    WHERE id = 1
      AND (review_data::jsonb ->> 'reviewDataVersion') = '1'
      AND (review_data::jsonb -> 'labels') @> '["person"]'::jsonb
      AND (review_data::jsonb -> 'zones') @> '["zone-a"]'::jsonb
      AND jsonb_array_length(review_data::jsonb -> 'objectIds') = 0
      AND jsonb_array_length(review_data::jsonb -> 'objects') = 1
      AND jsonb_array_length(review_data::jsonb -> 'detections') = 1
      AND (review_data::jsonb #>> '{detections,0,source}') = 'migration_backfill'
      AND (review_data::jsonb #>> '{detections,0,sourceAlertId}') = 'a-shared'
      AND (review_data::jsonb #>> '{reviewSegment,cameraId}') = 'camera-01'
      AND (review_data::jsonb #>> '{reviewSegment,severity}') = 'detection'
      AND (review_data::jsonb #>> '{reviewSegment,status}') = 'active'
      AND (review_data::jsonb -> 'reviewSegment' -> 'sourceAlertIds') @> '["a-shared","a-unique-1"]'::jsonb
      AND (review_data::jsonb ->> 'correlationId') = 'legacy-correlation'
  ) THEN
    RAISE EXCEPTION 'expected ReviewData backfill to normalize legacy rows';
  END IF;

  IF (
    SELECT count(*)
    FROM system_supervision_alert_review_item
    WHERE deleted = FALSE
      AND (
        review_data IS NULL
        OR btrim(review_data) = ''
        OR (review_data::jsonb ->> 'reviewDataVersion') IS DISTINCT FROM '1'
        OR jsonb_typeof(review_data::jsonb -> 'labels') IS DISTINCT FROM 'array'
        OR jsonb_typeof(review_data::jsonb -> 'zones') IS DISTINCT FROM 'array'
        OR jsonb_typeof(review_data::jsonb -> 'objectIds') IS DISTINCT FROM 'array'
        OR jsonb_typeof(review_data::jsonb -> 'objects') IS DISTINCT FROM 'array'
        OR jsonb_typeof(review_data::jsonb -> 'detections') IS DISTINCT FROM 'array'
        OR jsonb_typeof(review_data::jsonb -> 'reviewSegment') IS DISTINCT FROM 'object'
      )
  ) <> 0 THEN
    RAISE EXCEPTION 'expected ReviewData backfill to leave no legacy schema drift rows';
  END IF;
END $$;

DO $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE system_supervision_alert_review_item
  SET review_status = 'reviewed',
      version = version + 1
  WHERE id = 1
    AND review_status = 'pending_review'
    AND version = 0;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'expected first review status version update to affect one row';
  END IF;

  UPDATE system_supervision_alert_review_item
  SET review_status = 'ignored',
      version = version + 1
  WHERE id = 1
    AND version = 0;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'expected stale review status version update to affect no rows';
  END IF;

  UPDATE system_supervision_alert_review_item
  SET review_status = 'reviewed'
  WHERE id = 1
    AND review_status = 'reviewed'
    AND version = 1;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'expected repeated same-status reviewer update to be idempotent';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM system_supervision_alert_review_item
    WHERE id = 1
      AND review_status = 'reviewed'
      AND version = 1
  ) THEN
    RAISE EXCEPTION 'expected repeated same-status reviewer update to keep version stable';
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO system_supervision_alert_review_ingest_identity(
      tenant_id, review_item_id, source_system, identity_key, source_alert_id, deleted
    )
    VALUES (1001, 999, 'video', 'video:alert:a-shared', 'a-shared', false);
    RAISE EXCEPTION 'expected duplicate tenant/source identity to be rejected';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END $$;

INSERT INTO system_supervision_alert_review_item(
  id, tenant_id, source_system, source_alert_type, source_alert_ids, object_label, first_alert_time,
  review_status, camera_id, zone_code, rule_code, last_alert_time, review_data, deleted
)
VALUES (4, 1001, 'video', 'alert', 'a-overlap', 'person', '2026-07-05 10:02',
  'pending_review', 'camera-01', 'zone-a', 'rule-a', '2026-07-05 10:02', NULL, false);

DO $$
BEGIN
  BEGIN
    INSERT INTO system_supervision_alert_review_segment(
      review_item_id, segment_no, tenant_id, camera_id, severity, segment_status, start_time, end_time, deleted
    )
    VALUES (4, 'seg-overlap-tenant-1001', 1001, 'camera-01', 'alert', 'active', '2026-07-05 10:02', '2026-07-05 10:03', false);
    RAISE EXCEPTION 'expected same-tenant camera/time overlap to be rejected';
  EXCEPTION WHEN exclusion_violation THEN
    NULL;
  END;
END $$;

INSERT INTO system_supervision_alert_review_item(
  id, tenant_id, source_system, source_alert_type, source_alert_ids, object_label, first_alert_time,
  review_status, camera_id, zone_code, rule_code, last_alert_time, review_data, deleted
)
VALUES
  (5, 1001, 'video', 'motion', 'a-open-active-1', 'person', '2026-07-05 11:00',
   'pending_review', 'camera-open-01', 'zone-a', 'rule-a', '2026-07-05 11:00', NULL, false),
  (6, 1001, 'video', 'motion', 'a-open-active-2', 'person', '2026-07-05 11:01',
   'pending_review', 'camera-open-01', 'zone-a', 'rule-a', '2026-07-05 11:01', NULL, false);

DO $$
BEGIN
  INSERT INTO system_supervision_alert_review_segment(
    review_item_id, segment_no, tenant_id, camera_id, severity, segment_status, start_time, end_time, deleted
  )
  VALUES (5, 'seg-open-active-tenant-1001', 1001, 'camera-open-01', 'detection', 'active', '2026-07-05 11:00', NULL, false);
  BEGIN
    INSERT INTO system_supervision_alert_review_segment(
      review_item_id, segment_no, tenant_id, camera_id, severity, segment_status, start_time, end_time, deleted
    )
    VALUES (6, 'seg-open-active-overlap-tenant-1001', 1001, 'camera-open-01', 'detection', 'active', '2026-07-05 11:01', NULL, false);
    RAISE EXCEPTION 'expected open active ReviewSegment to block later same-camera segment';
  EXCEPTION WHEN exclusion_violation THEN
    NULL;
  END;
END $$;

INSERT INTO system_supervision_alert_review_item(
  id, tenant_id, source_system, source_alert_type, source_alert_ids, object_label, first_alert_time,
  review_status, camera_id, zone_code, rule_code, last_alert_time, review_data, deleted
)
VALUES
  (7, 1001, 'video', 'motion', 'a-transition-1', 'person', '2026-07-05 11:10',
   'pending_review', 'camera-transition-01', 'zone-a', 'rule-a', '2026-07-05 11:10', NULL, false),
  (8, 1001, 'video', 'motion', 'a-transition-2', 'person', '2026-07-05 11:20',
   'pending_review', 'camera-transition-01', 'zone-a', 'rule-a', '2026-07-05 11:20', NULL, false);

INSERT INTO system_supervision_alert_review_segment(
  review_item_id, segment_no, tenant_id, camera_id, severity, segment_status, start_time, end_time, deleted
)
VALUES
  (7, 'seg-transition-active', 1001, 'camera-transition-01', 'detection', 'active', '2026-07-05 11:10', NULL, false),
  (8, 'seg-transition-ended', 1001, 'camera-transition-01', 'alert', 'ended', '2026-07-05 11:20', '2026-07-05 11:21', false);

UPDATE system_supervision_alert_review_segment
SET segment_status = 'alert',
    severity = 'alert'
WHERE segment_no = 'seg-transition-active';

DO $$
BEGIN
  BEGIN
    UPDATE system_supervision_alert_review_segment
    SET segment_status = 'active'
    WHERE segment_no = 'seg-transition-ended';
    RAISE EXCEPTION 'expected ended ReviewSegment reopen to be rejected';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tr_supervision_alert_review_segment_status_transition'
  ) THEN
    RAISE EXCEPTION 'expected ReviewSegment status transition trigger to exist';
  END IF;
END $$;

SELECT 'alert review postgres migration smoke passed' AS result;
`;
}

export function buildConcurrentDuplicateIdentityInsertSql() {
  return `
INSERT INTO system_supervision_alert_review_ingest_identity(
  tenant_id, review_item_id, source_system, identity_key, source_alert_id, deleted
)
VALUES (3003, 3003, 'video', 'video:alert:a-race', 'a-race', false);
`;
}

export function buildConcurrentReviewStatusBootstrapSql() {
  return `
INSERT INTO system_supervision_alert_review_item(
  id, tenant_id, source_system, source_alert_ids, review_status, camera_id, zone_code, rule_code, last_alert_time, version, deleted
)
VALUES (8001, 5005, 'video', 'review-status-race', 'pending_review', 'camera-review-status-race-01', 'zone-a', 'rule-a', '2026-07-05 13:00', 0, false);
`;
}

export function buildConcurrentReviewStatusUpdateSql() {
  return `
UPDATE system_supervision_alert_review_item
SET review_status = 'reviewed',
    version = version + 1
WHERE id = 8001
  AND review_status = 'pending_review'
  AND version = 0;
`;
}

export function buildConcurrentReviewSegmentBootstrapSql() {
  return `
INSERT INTO system_supervision_alert_review_item(
  id, tenant_id, source_system, source_alert_ids, review_status, camera_id, zone_code, rule_code, last_alert_time, deleted
)
VALUES
  (7001, 4004, 'video', 'a-segment-race-1', 'pending_review', 'camera-segment-race-01', 'zone-a', 'rule-a', '2026-07-05 12:00', false),
  (7002, 4004, 'video', 'a-segment-race-2', 'pending_review', 'camera-segment-race-01', 'zone-a', 'rule-a', '2026-07-05 12:00', false);
`;
}

export function buildConcurrentReviewSegmentInsertSql({ reviewItemId, segmentNo }) {
  return `
INSERT INTO system_supervision_alert_review_segment(
  review_item_id, segment_no, tenant_id, camera_id, severity, segment_status, start_time, end_time, deleted
)
VALUES (${reviewItemId}, '${segmentNo}', 4004, 'camera-segment-race-01', 'detection', 'active', '2026-07-05 12:00', NULL, false);
`;
}

export function summarizeConcurrentDuplicateResults(results) {
  const successCount = results.filter((result) => result.status === 0).length;
  const duplicateCount = results.filter((result) =>
    `${result.stdout ?? ''}\n${result.stderr ?? ''}`.includes('duplicate key value violates unique constraint'),
  ).length;
  if (successCount !== 1 || duplicateCount !== 1) {
    throw new Error(
      [
        'expected exactly one concurrent duplicate identity insert to succeed and one to hit the unique constraint',
        ...results.map((result, index) =>
          `process ${index + 1}: status=${result.status} stdout=${JSON.stringify(result.stdout)} stderr=${JSON.stringify(result.stderr)}`,
        ),
      ].join('\n'),
    );
  }
  return 'concurrent duplicate ingest identity smoke passed';
}

export function summarizeConcurrentReviewStatusResults(results) {
  const updateOneCount = results.filter((result) =>
    result.status === 0 && /\bUPDATE 1\b/.test(`${result.stdout ?? ''}\n${result.stderr ?? ''}`),
  ).length;
  const updateZeroCount = results.filter((result) =>
    result.status === 0 && /\bUPDATE 0\b/.test(`${result.stdout ?? ''}\n${result.stderr ?? ''}`),
  ).length;
  if (updateOneCount !== 1 || updateZeroCount !== 1) {
    throw new Error(
      [
        'expected exactly one concurrent review status update to win the version race and one stale update to affect zero rows',
        ...results.map((result, index) =>
          `process ${index + 1}: status=${result.status} stdout=${JSON.stringify(result.stdout)} stderr=${JSON.stringify(result.stderr)}`,
        ),
      ].join('\n'),
    );
  }
  return 'concurrent review status version smoke passed';
}

export function summarizeConcurrentReviewSegmentResults(results) {
  const successCount = results.filter((result) => result.status === 0).length;
  const exclusionCount = results.filter((result) =>
    `${result.stdout ?? ''}\n${result.stderr ?? ''}`.includes('violates exclusion constraint'),
  ).length;
  if (successCount !== 1 || exclusionCount !== 1) {
    throw new Error(
      [
        'expected exactly one concurrent ReviewSegment insert to succeed and one to hit the exclusion constraint',
        ...results.map((result, index) =>
          `process ${index + 1}: status=${result.status} stdout=${JSON.stringify(result.stdout)} stderr=${JSON.stringify(result.stderr)}`,
        ),
      ].join('\n'),
    );
  }
  return 'concurrent ReviewSegment overlap smoke passed';
}

function printHelp() {
  console.log(`Usage: node .scripts/alert-review-postgres-migration-smoke.mjs --container=NAME [--database=NAME] [--repo-root=PATH] [--keep-database]

Runs FR-01/FR-20/FR-24/FR-30/FR-33/FR-35 alert review PostgreSQL migration smoke against an existing Docker PostgreSQL container.
The target container must accept: docker exec -i NAME psql -U postgres -d DATABASE.
The smoke creates a temporary database, applies V20260702, V20260704, V20260705, V20260706, V20260707, V20260708, V20260708_2, V20260708_3, V20260708_4, V20260708_5, and V20260708_6, and verifies ingest identity, ReviewSegment constraints, status transitions, ReviewData backfill, media permission seeds, scheduler job seeds, report acknowledgement DDL, operations report seeds, runtime outbox notify templates, runtime outbox recipient delivery idempotency, runtime outbox claim columns, item media audit lookup, and concurrent races.`);
}

function assertSafeDatabaseName(database) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(database)) {
    throw new Error(`Unsafe database name: ${database}`);
  }
}

function runDockerPsql(container, database, sql) {
  const result = spawnSync(
    'docker',
    ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1'],
    {
      input: sql,
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      [
        `psql failed in ${container}/${database} with exit ${result.status}`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
  return result.stdout;
}

function runDockerCommand(args) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      [`docker ${args.join(' ')} failed with exit ${result.status}`, result.stdout, result.stderr]
        .filter(Boolean)
        .join('\n'),
    );
  }
  return result.stdout;
}

function runDockerPsqlAsync(container, database, sql) {
  return new Promise((resolveResult) => {
    const child = spawn(
      'docker',
      ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1'],
      {
        windowsHide: true,
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      resolveResult({ status: -1, stdout, stderr: `${stderr}\n${error.message}` });
    });
    child.on('close', (status) => {
      resolveResult({ status, stdout, stderr });
    });
    child.stdin.end(sql);
  });
}

function readMigrationSql(repoRoot, migrationFile) {
  const path = resolve(repoRoot, migrationFile);
  if (!existsSync(path)) {
    throw new Error(`Migration file not found: ${path}`);
  }
  return readFileSync(path, 'utf8');
}

export async function runSmoke(options) {
  if (!options.container) {
    throw new Error('Missing required --container=NAME');
  }
  assertSafeDatabaseName(options.database);

  runDockerCommand(['exec', options.container, 'pg_isready', '-U', 'postgres']);
  runDockerPsql(
    options.container,
    'postgres',
    `DROP DATABASE IF EXISTS ${options.database};\nCREATE DATABASE ${options.database};\n`,
  );

  try {
    runDockerPsql(options.container, options.database, buildBootstrapSql());
    for (const migrationFile of MIGRATION_FILES) {
      runDockerPsql(options.container, options.database, readMigrationSql(options.repoRoot, migrationFile));
    }
    const assertionOutput = runDockerPsql(options.container, options.database, buildPostMigrationAssertionSql());
    const concurrentOutput = await runConcurrentDuplicateIdentitySmoke(options);
    runDockerPsql(options.container, options.database, buildConcurrentReviewStatusBootstrapSql());
    const concurrentReviewStatusOutput = await runConcurrentReviewStatusSmoke(options);
    runDockerPsql(options.container, options.database, buildConcurrentReviewSegmentBootstrapSql());
    const concurrentSegmentOutput = await runConcurrentReviewSegmentSmoke(options);
    return `${assertionOutput}${concurrentOutput}\n${concurrentReviewStatusOutput}\n${concurrentSegmentOutput}\n`;
  } finally {
    if (!options.keepDatabase) {
      runDockerPsql(options.container, 'postgres', `DROP DATABASE IF EXISTS ${options.database};\n`);
    }
  }
}

async function runConcurrentDuplicateIdentitySmoke(options) {
  const results = await Promise.all([
    runDockerPsqlAsync(options.container, options.database, buildConcurrentDuplicateIdentityInsertSql()),
    runDockerPsqlAsync(options.container, options.database, buildConcurrentDuplicateIdentityInsertSql()),
  ]);
  return summarizeConcurrentDuplicateResults(results);
}

async function runConcurrentReviewStatusSmoke(options) {
  const results = await Promise.all([
    runDockerPsqlAsync(options.container, options.database, buildConcurrentReviewStatusUpdateSql()),
    runDockerPsqlAsync(options.container, options.database, buildConcurrentReviewStatusUpdateSql()),
  ]);
  return summarizeConcurrentReviewStatusResults(results);
}

async function runConcurrentReviewSegmentSmoke(options) {
  const results = await Promise.all([
    runDockerPsqlAsync(
      options.container,
      options.database,
      buildConcurrentReviewSegmentInsertSql({ reviewItemId: 7001, segmentNo: 'seg-race-1' }),
    ),
    runDockerPsqlAsync(
      options.container,
      options.database,
      buildConcurrentReviewSegmentInsertSql({ reviewItemId: 7002, segmentNo: 'seg-race-2' }),
    ),
  ]);
  return summarizeConcurrentReviewSegmentResults(results);
}

async function runCli() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const output = await runSmoke(options);
  process.stdout.write(output);
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

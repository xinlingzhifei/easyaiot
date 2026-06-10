CREATE TABLE IF NOT EXISTS system_supervision_event (
  id BIGSERIAL PRIMARY KEY,
  event_no VARCHAR(64) NOT NULL,
  tenant_id BIGINT,
  org_id BIGINT,
  site_type VARCHAR(32) NOT NULL DEFAULT 'prison',
  source_system VARCHAR(64) NOT NULL,
  source_alert_id VARCHAR(128),
  source_alert_type VARCHAR(128),
  source_alert_time TIMESTAMP,
  source_payload_hash VARCHAR(128),
  device_id VARCHAR(128),
  camera_id VARCHAR(128),
  location_id VARCHAR(128),
  person_id VARCHAR(128),
  person_confidence NUMERIC(8,4),
  event_type VARCHAR(64) NOT NULL,
  event_level VARCHAR(8) NOT NULL,
  event_status VARCHAR(64) NOT NULL,
  current_owner_dept_id BIGINT,
  current_owner_user_id BIGINT,
  close_result VARCHAR(64),
  close_reason TEXT,
  close_check_status VARCHAR(64) NOT NULL DEFAULT 'not_checked',
  evidence_status VARCHAR(64) NOT NULL DEFAULT 'missing_soft',
  sensitivity_level VARCHAR(64) NOT NULL DEFAULT 'normal',
  upgraded_from_level VARCHAR(8),
  upgrade_reason TEXT,
  merged_into_event_id BIGINT,
  dispatched_at TIMESTAMP,
  accepted_at TIMESTAMP,
  handled_at TIMESTAMP,
  rechecked_at TIMESTAMP,
  closed_at TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 0,
  creator VARCHAR(64),
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updater VARCHAR(64),
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_event_open_alert
ON system_supervision_event(source_system, source_alert_id)
WHERE deleted = FALSE AND event_status <> 'closed' AND source_alert_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS system_supervision_task (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,
  task_no VARCHAR(64) NOT NULL,
  task_type VARCHAR(64) NOT NULL,
  task_status VARCHAR(64) NOT NULL,
  assigned_dept_id BIGINT,
  assigned_role VARCHAR(64) NOT NULL,
  assigned_user_id BIGINT,
  due_at TIMESTAMP,
  accepted_at TIMESTAMP,
  arrived_at TIMESTAMP,
  submitted_at TIMESTAMP,
  result_category VARCHAR(64),
  handling_note TEXT,
  rework_count INTEGER NOT NULL DEFAULT 0,
  creator VARCHAR(64),
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updater VARCHAR(64),
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_supervision_task_event_id
ON system_supervision_task(event_id);

CREATE TABLE IF NOT EXISTS system_supervision_action (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,
  task_id BIGINT,
  action_type VARCHAR(64) NOT NULL,
  channel VARCHAR(64),
  action_status VARCHAR(64) NOT NULL,
  receiver_user_id BIGINT,
  result_payload TEXT,
  failure_reason TEXT,
  creator VARCHAR(64),
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updater VARCHAR(64),
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_supervision_action_event_id
ON system_supervision_action(event_id);

CREATE TABLE IF NOT EXISTS system_supervision_evidence_item (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,
  source_type VARCHAR(64) NOT NULL,
  material_type VARCHAR(64) NOT NULL,
  material_uri VARCHAR(512),
  related_record_id VARCHAR(128),
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  required_for_level VARCHAR(8),
  collect_status VARCHAR(64) NOT NULL,
  missing_reason TEXT,
  sensitivity_level VARCHAR(64) NOT NULL DEFAULT 'normal',
  creator VARCHAR(64),
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updater VARCHAR(64),
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_supervision_evidence_event_id
ON system_supervision_evidence_item(event_id);

CREATE TABLE IF NOT EXISTS system_supervision_close_check_result (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,
  rule_version VARCHAR(64) NOT NULL,
  check_result VARCHAR(64) NOT NULL,
  hard_block_items TEXT NOT NULL,
  soft_warning_items TEXT NOT NULL,
  exception_reason TEXT,
  checked_by BIGINT,
  checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creator VARCHAR(64),
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updater VARCHAR(64),
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN NOT NULL DEFAULT FALSE
);

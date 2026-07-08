ALTER TABLE system_supervision_alert_review_runtime_outbox
  ADD COLUMN IF NOT EXISTS claim_token VARCHAR(128);

ALTER TABLE system_supervision_alert_review_runtime_outbox
  ADD COLUMN IF NOT EXISTS claimed_by BIGINT;

ALTER TABLE system_supervision_alert_review_runtime_outbox
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_runtime_outbox_claim
ON system_supervision_alert_review_runtime_outbox(outbox_status, claim_token)
WHERE deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_runtime_outbox_claimed_at
ON system_supervision_alert_review_runtime_outbox(outbox_status, claimed_at)
WHERE deleted = FALSE;

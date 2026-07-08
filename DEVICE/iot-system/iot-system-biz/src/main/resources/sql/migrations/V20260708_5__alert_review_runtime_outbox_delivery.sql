-- Track per-recipient runtime outbox delivery attempts.
-- This prevents partial notification retries from resending messages to recipients
-- that already received the same outbox/template delivery.
CREATE TABLE IF NOT EXISTS system_supervision_alert_review_runtime_outbox_delivery (
  id BIGSERIAL PRIMARY KEY,
  outbox_id BIGINT NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  alert_key VARCHAR(128) NOT NULL,
  channel VARCHAR(64) NOT NULL,
  recipient_user_id BIGINT NOT NULL,
  template_code VARCHAR(128) NOT NULL,
  delivery_status VARCHAR(32) NOT NULL,
  notify_message_id BIGINT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  last_attempt_at TIMESTAMP,
  delivered_at TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 0,
  creator VARCHAR(64),
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updater VARCHAR(64),
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_supervision_alert_review_runtime_outbox_delivery_outbox
    FOREIGN KEY (outbox_id)
    REFERENCES system_supervision_alert_review_runtime_outbox(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_alert_review_runtime_outbox_delivery_recipient
ON system_supervision_alert_review_runtime_outbox_delivery(outbox_id, channel, recipient_user_id, template_code)
WHERE deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_runtime_outbox_delivery_status
ON system_supervision_alert_review_runtime_outbox_delivery(delivery_status, last_attempt_at);

CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_runtime_outbox_delivery_alert
ON system_supervision_alert_review_runtime_outbox_delivery(event_type, alert_key);

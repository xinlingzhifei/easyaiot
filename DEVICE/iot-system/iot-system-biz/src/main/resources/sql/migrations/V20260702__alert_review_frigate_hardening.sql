CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE system_supervision_alert_review_item
  ADD COLUMN IF NOT EXISTS tenant_id BIGINT;

DROP INDEX IF EXISTS idx_supervision_alert_review_workbench;
CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_workbench
ON system_supervision_alert_review_item(tenant_id, review_status, camera_id, last_alert_time);

DROP INDEX IF EXISTS idx_supervision_alert_review_merge;
CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_merge
ON system_supervision_alert_review_item(tenant_id, source_system, camera_id, zone_code, rule_code, review_status, last_alert_time);

CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_alert_review_segment_item
ON system_supervision_alert_review_segment(review_item_id)
WHERE deleted = FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_supervision_alert_review_segment_time'
  ) THEN
    ALTER TABLE system_supervision_alert_review_segment
      ADD CONSTRAINT ck_supervision_alert_review_segment_time
      CHECK (end_time IS NULL OR end_time >= start_time);
  END IF;
END $$;

ALTER TABLE system_supervision_alert_review_segment
  DROP CONSTRAINT IF EXISTS ex_supervision_alert_review_segment_camera_time;

ALTER TABLE system_supervision_alert_review_segment
  ADD CONSTRAINT ex_supervision_alert_review_segment_camera_time
  EXCLUDE USING gist (
    camera_id WITH =,
    tsrange(start_time, COALESCE(end_time, 'infinity'::timestamp), '[)') WITH &&
  )
  WHERE (deleted = FALSE);

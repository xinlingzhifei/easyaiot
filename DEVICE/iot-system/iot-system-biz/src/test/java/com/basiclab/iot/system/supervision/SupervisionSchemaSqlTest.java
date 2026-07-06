package com.basiclab.iot.system.supervision;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SupervisionSchemaSqlTest {

    private static final String SCHEMA_RESOURCE = "sql/supervision_event_closure_v1.sql";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Test
    void schemaCreatesOnlySupervisionTables() throws IOException {
        String sql = readSchemaSql();

        assertEquals(Set.of(
                "system_supervision_event",
                "system_supervision_task",
                "system_supervision_action",
                "system_supervision_evidence_item",
                "system_supervision_alert_review_item",
                "system_supervision_alert_review_ingest_identity",
                "system_supervision_alert_review_segment",
                "system_supervision_alert_review_user_status",
                "system_supervision_alert_review_evidence",
                "system_supervision_alert_review_rule",
                "system_supervision_alert_review_case",
                "system_supervision_alert_review_case_item",
                "system_supervision_alert_review_case_audit",
                "system_supervision_alert_review_semantic_index",
                "system_supervision_alert_review_export_job",
                "system_supervision_alert_review_runtime_lock",
                "system_supervision_alert_review_runtime_run",
                "system_supervision_alert_review_runtime_outbox",
                "system_supervision_close_check_result"
        ), extractCreatedTables(sql));
    }

    @Test
    void schemaIsAdditiveOnly() throws IOException {
        String lowerSql = readSchemaSql().toLowerCase();

        assertFalse(lowerSql.contains("alter table "));
        assertFalse(lowerSql.contains("drop table "));
        assertFalse(lowerSql.contains("truncate table "));
        assertFalse(lowerSql.contains("insert into "));
        assertFalse(lowerSql.contains("update "));
        assertFalse(lowerSql.contains("delete from "));
    }

    @Test
    void schemaDefinesIdempotencyAndLookupIndexes() throws IOException {
        String sql = readSchemaSql();

        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_event_open_alert"));
        assertTrue(sql.contains("ON system_supervision_event(source_system, source_alert_id)"));
        assertTrue(sql.contains("event_status <> 'closed'"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_task_event_id"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_action_event_id"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_evidence_event_id"));
        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_alert_review_item_no"));
        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_alert_review_ingest_identity"));
        assertTrue(sql.contains("ON system_supervision_alert_review_ingest_identity(tenant_id, source_system, identity_key)"));
        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_alert_review_segment_no"));
        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_alert_review_segment_item"));
        assertTrue(sql.contains("ON system_supervision_alert_review_segment(review_item_id)"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_segment_camera_time"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_segment_status"));
        assertTrue(sql.contains("CONSTRAINT ck_supervision_alert_review_segment_time"));
        assertTrue(sql.contains("CONSTRAINT ck_supervision_alert_review_segment_status"));
        assertTrue(sql.contains("CONSTRAINT ck_supervision_alert_review_segment_severity"));
        assertTrue(sql.contains("CONSTRAINT ex_supervision_alert_review_segment_camera_time"));
        assertTrue(sql.contains("camera_id WITH ="));
        assertTrue(sql.contains("tsrange(start_time, COALESCE(end_time, 'infinity'::timestamp), '[)') WITH &&"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_workbench"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_merge"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_event"));
        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_alert_review_user_status"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_user_reviewed"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_evidence_item_time"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_rule_enabled"));
        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_alert_review_case_no"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_case_time"));
        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_alert_review_case_item"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_case_item_case"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_rule_suggestion"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_case_audit_case"));
        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_alert_review_semantic_item"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_semantic_filter"));
        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_alert_review_export_job_no"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_export_job_case"));
        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_alert_review_runtime_lock"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_runtime_lock_until"));
        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_alert_review_runtime_run"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_runtime_run_status"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_runtime_outbox_status"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_supervision_alert_review_runtime_outbox_run"));
    }

    @Test
    void reviewSegmentOverlapUsesHalfOpenIntervalsSoAdjacentSegmentsCanSplitCleanly() throws Exception {
        String sql = readSchemaSql();
        LocalDateTime start = LocalDateTime.of(2026, 7, 4, 10, 0);
        LocalDateTime end = start.plusMinutes(2);
        Method overlaps = Class
                .forName("com.basiclab.iot.system.dal.pgsql.supervision.SupervisionAlertReviewSegmentMapper")
                .getDeclaredMethod("overlaps", LocalDateTime.class, LocalDateTime.class,
                        LocalDateTime.class, LocalDateTime.class);
        overlaps.setAccessible(true);

        assertTrue(sql.contains("tsrange(start_time, COALESCE(end_time, 'infinity'::timestamp), '[)')"));
        assertFalse((Boolean) overlaps.invoke(null, end, end.plusMinutes(1), start, end));
        assertTrue((Boolean) overlaps.invoke(null, end.minusSeconds(1), end.plusMinutes(1), start, end));
        assertTrue((Boolean) overlaps.invoke(null, end, end.plusMinutes(1), start, null));
    }

    @Test
    void tablesKeepLifecycleAuditAndSoftDeleteColumns() throws IOException {
        String sql = readSchemaSql();

        for (String tableName : extractCreatedTables(sql)) {
            String tableBody = extractTableBody(sql, tableName);
            assertTrue(tableBody.contains("creator VARCHAR(64)"));
            assertTrue(tableBody.contains("create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"));
            assertTrue(tableBody.contains("updater VARCHAR(64)"));
            assertTrue(tableBody.contains("update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"));
            assertTrue(tableBody.contains("deleted BOOLEAN NOT NULL DEFAULT FALSE"));
        }
    }

    @Test
    void eventTableKeepsAlertSourceAndClosureFields() throws IOException {
        String eventTable = extractTableBody(readSchemaSql(), "system_supervision_event");

        assertTrue(eventTable.contains("source_system VARCHAR(64) NOT NULL"));
        assertTrue(eventTable.contains("source_alert_id VARCHAR(128)"));
        assertTrue(eventTable.contains("event_level VARCHAR(8) NOT NULL"));
        assertTrue(eventTable.contains("event_status VARCHAR(64) NOT NULL"));
        assertTrue(eventTable.contains("close_result VARCHAR(64)"));
        assertTrue(eventTable.contains("close_check_status VARCHAR(64) NOT NULL DEFAULT 'not_checked'"));
        assertTrue(eventTable.contains("evidence_status VARCHAR(64) NOT NULL DEFAULT 'missing_soft'"));
        assertTrue(eventTable.contains("closed_at TIMESTAMP"));
    }

    @Test
    void alertReviewTablesKeepClueEvidenceAndRegionRuleFields() throws IOException {
        String sql = readSchemaSql();
        String reviewItemTable = extractTableBody(sql, "system_supervision_alert_review_item");
        String ingestIdentityTable = extractTableBody(sql, "system_supervision_alert_review_ingest_identity");
        String reviewSegmentTable = extractTableBody(sql, "system_supervision_alert_review_segment");
        String evidenceTable = extractTableBody(sql, "system_supervision_alert_review_evidence");
        String userStatusTable = extractTableBody(sql, "system_supervision_alert_review_user_status");
        String ruleTable = extractTableBody(sql, "system_supervision_alert_review_rule");
        String caseTable = extractTableBody(sql, "system_supervision_alert_review_case");
        String caseItemTable = extractTableBody(sql, "system_supervision_alert_review_case_item");
        String caseAuditTable = extractTableBody(sql, "system_supervision_alert_review_case_audit");
        String semanticIndexTable = extractTableBody(sql, "system_supervision_alert_review_semantic_index");
        String exportJobTable = extractTableBody(sql, "system_supervision_alert_review_export_job");
        String runtimeLockTable = extractTableBody(sql, "system_supervision_alert_review_runtime_lock");
        String runtimeRunTable = extractTableBody(sql, "system_supervision_alert_review_runtime_run");
        String runtimeOutboxTable = extractTableBody(sql, "system_supervision_alert_review_runtime_outbox");

        assertTrue(reviewItemTable.contains("review_item_no VARCHAR(64) NOT NULL"));
        assertTrue(reviewItemTable.contains("tenant_id BIGINT"));
        assertTrue(reviewItemTable.contains("source_alert_ids TEXT NOT NULL"));
        assertTrue(reviewItemTable.contains("review_data TEXT"));
        assertTrue(reviewItemTable.contains("review_status VARCHAR(64) NOT NULL DEFAULT 'pending_review'"));
        assertTrue(reviewItemTable.contains("rule_suggestion TEXT"));
        assertTrue(reviewItemTable.contains("rule_suggestion_status VARCHAR(64)"));
        assertTrue(reviewItemTable.contains("rule_suggestion_updated_at TIMESTAMP"));
        assertTrue(reviewItemTable.contains("event_id BIGINT"));
        assertTrue(reviewItemTable.contains("record_evidence_status VARCHAR(64) NOT NULL DEFAULT 'missing'"));
        assertTrue(reviewItemTable.contains("record_evidence_checked_at TIMESTAMP"));
        assertTrue(reviewItemTable.contains("record_evidence_message VARCHAR(256)"));
        assertTrue(sql.contains("ON system_supervision_alert_review_item(tenant_id, review_status, camera_id, last_alert_time)"));
        assertTrue(sql.contains("ON system_supervision_alert_review_item(tenant_id, source_system, camera_id, zone_code, rule_code, review_status, last_alert_time)"));
        assertTrue(ingestIdentityTable.contains("tenant_id BIGINT NOT NULL DEFAULT 0"));
        assertTrue(ingestIdentityTable.contains("review_item_id BIGINT NOT NULL"));
        assertTrue(ingestIdentityTable.contains("source_system VARCHAR(64) NOT NULL"));
        assertTrue(ingestIdentityTable.contains("identity_key VARCHAR(256) NOT NULL"));
        assertTrue(ingestIdentityTable.contains("source_alert_id VARCHAR(128)"));
        assertTrue(ingestIdentityTable.contains("source_payload_hash VARCHAR(128)"));
        assertTrue(reviewSegmentTable.contains("review_item_id BIGINT NOT NULL"));
        assertTrue(reviewSegmentTable.contains("segment_no VARCHAR(128) NOT NULL"));
        assertTrue(reviewSegmentTable.contains("camera_id VARCHAR(128) NOT NULL"));
        assertTrue(reviewSegmentTable.contains("severity VARCHAR(64) NOT NULL"));
        assertTrue(reviewSegmentTable.contains("segment_status VARCHAR(64) NOT NULL DEFAULT 'active'"));
        assertTrue(reviewSegmentTable.contains("CONSTRAINT ck_supervision_alert_review_segment_status"));
        assertTrue(reviewSegmentTable.contains("CONSTRAINT ck_supervision_alert_review_segment_severity"));
        assertTrue(reviewSegmentTable.contains("start_time TIMESTAMP NOT NULL"));
        assertTrue(reviewSegmentTable.contains("end_time TIMESTAMP"));
        assertTrue(reviewSegmentTable.contains("object_ids TEXT"));
        assertTrue(reviewSegmentTable.contains("zone_codes TEXT"));
        assertTrue(reviewSegmentTable.contains("source_alert_ids TEXT"));
        assertTrue(reviewSegmentTable.contains("segment_events TEXT"));
        assertTrue(reviewSegmentTable.contains("segment_metadata TEXT"));
        assertTrue(userStatusTable.contains("review_item_id BIGINT NOT NULL"));
        assertTrue(userStatusTable.contains("user_id BIGINT NOT NULL"));
        assertTrue(userStatusTable.contains("has_been_reviewed BOOLEAN NOT NULL DEFAULT FALSE"));
        assertTrue(userStatusTable.contains("reviewed_at TIMESTAMP"));
        assertTrue(evidenceTable.contains("review_item_id BIGINT NOT NULL"));
        assertTrue(evidenceTable.contains("material_type VARCHAR(64) NOT NULL"));
        assertTrue(evidenceTable.contains("material_uri VARCHAR(512)"));
        assertTrue(evidenceTable.contains("happened_at TIMESTAMP NOT NULL"));
        assertTrue(ruleTable.contains("zone_code VARCHAR(128)"));
        assertTrue(ruleTable.contains("object_label VARCHAR(128)"));
        assertTrue(ruleTable.contains("min_stay_seconds INTEGER"));
        assertTrue(ruleTable.contains("inertia_frames INTEGER"));
        assertTrue(ruleTable.contains("loitering_seconds INTEGER"));
        assertTrue(ruleTable.contains("enabled BOOLEAN NOT NULL DEFAULT TRUE"));
        assertTrue(caseTable.contains("case_no VARCHAR(64) NOT NULL"));
        assertTrue(caseTable.contains("primary_review_item_id BIGINT"));
        assertTrue(caseTable.contains("owner_user_id BIGINT"));
        assertTrue(caseTable.contains("notes TEXT"));
        assertTrue(caseTable.contains("camera_ids TEXT"));
        assertTrue(caseTable.contains("start_time TIMESTAMP"));
        assertTrue(caseItemTable.contains("review_case_id BIGINT NOT NULL"));
        assertTrue(caseItemTable.contains("review_item_id BIGINT NOT NULL"));
        assertTrue(caseItemTable.contains("sort_order INTEGER NOT NULL DEFAULT 0"));
        assertTrue(caseAuditTable.contains("review_case_id BIGINT NOT NULL"));
        assertTrue(caseAuditTable.contains("review_item_id BIGINT"));
        assertTrue(caseAuditTable.contains("action_type VARCHAR(64) NOT NULL"));
        assertTrue(caseAuditTable.contains("action_note TEXT"));
        assertTrue(caseAuditTable.contains("metadata TEXT"));
        assertTrue(semanticIndexTable.contains("review_item_id BIGINT NOT NULL"));
        assertTrue(semanticIndexTable.contains("camera_id VARCHAR(128)"));
        assertTrue(semanticIndexTable.contains("first_alert_time TIMESTAMP"));
        assertTrue(semanticIndexTable.contains("last_alert_time TIMESTAMP"));
        assertTrue(semanticIndexTable.contains("index_status VARCHAR(64) NOT NULL DEFAULT 'pending'"));
        assertTrue(semanticIndexTable.contains("document TEXT NOT NULL"));
        assertTrue(semanticIndexTable.contains("embedding_key VARCHAR(128)"));
        assertTrue(semanticIndexTable.contains("embedding_model VARCHAR(128)"));
        assertTrue(semanticIndexTable.contains("embedding_vector_hash VARCHAR(128)"));
        assertTrue(semanticIndexTable.contains("retry_count INTEGER NOT NULL DEFAULT 0"));
        assertTrue(semanticIndexTable.contains("last_error TEXT"));
        assertTrue(semanticIndexTable.contains("indexed_at TIMESTAMP"));
        assertTrue(exportJobTable.contains("job_no VARCHAR(64) NOT NULL"));
        assertTrue(exportJobTable.contains("status VARCHAR(64) NOT NULL DEFAULT 'pending'"));
        assertTrue(exportJobTable.contains("package_no VARCHAR(64) NOT NULL"));
        assertTrue(exportJobTable.contains("review_case_id BIGINT NOT NULL"));
        assertTrue(exportJobTable.contains("review_item_ids TEXT NOT NULL"));
        assertTrue(exportJobTable.contains("manifest TEXT"));
        assertTrue(exportJobTable.contains("file_hash VARCHAR(128) NOT NULL"));
        assertTrue(exportJobTable.contains("expires_at TIMESTAMP"));
        assertTrue(exportJobTable.contains("operator_user_id BIGINT"));
        assertTrue(exportJobTable.contains("export_reason TEXT"));
        assertTrue(exportJobTable.contains("bound_event_ids TEXT"));
        assertTrue(runtimeLockTable.contains("lock_name VARCHAR(128) NOT NULL"));
        assertTrue(runtimeLockTable.contains("owner_user_id BIGINT"));
        assertTrue(runtimeLockTable.contains("locked_until TIMESTAMP"));
        assertTrue(runtimeLockTable.contains("last_locked_at TIMESTAMP"));
        assertTrue(runtimeRunTable.contains("run_id VARCHAR(64) NOT NULL"));
        assertTrue(runtimeRunTable.contains("status VARCHAR(64) NOT NULL"));
        assertTrue(runtimeRunTable.contains("attempt_count INTEGER NOT NULL DEFAULT 0"));
        assertTrue(runtimeRunTable.contains("alerts TEXT"));
        assertTrue(runtimeRunTable.contains("recommended_actions TEXT"));
        assertTrue(runtimeRunTable.contains("metadata TEXT"));
        assertTrue(runtimeOutboxTable.contains("run_id VARCHAR(64) NOT NULL"));
        assertTrue(runtimeOutboxTable.contains("event_type VARCHAR(64) NOT NULL"));
        assertTrue(runtimeOutboxTable.contains("alert_key VARCHAR(128) NOT NULL"));
        assertTrue(runtimeOutboxTable.contains("outbox_status VARCHAR(64) NOT NULL DEFAULT 'pending'"));
        assertTrue(runtimeOutboxTable.contains("retry_count INTEGER NOT NULL DEFAULT 0"));
    }

    @Test
    void alertReviewHardeningMigrationIsSplitForProductionRelease() throws IOException {
        Path migration = Path.of("src/main/resources/sql/migrations/V20260702__alert_review_frigate_hardening.sql");

        assertTrue(Files.exists(migration), "production migration should exist");
        String migrationSql = Files.readString(migration, StandardCharsets.UTF_8);
        assertTrue(migrationSql.contains("uk_supervision_alert_review_segment_item"));
        assertTrue(migrationSql.contains("ADD COLUMN IF NOT EXISTS tenant_id BIGINT"));
        assertTrue(migrationSql.contains("ON system_supervision_alert_review_item(tenant_id, review_status, camera_id, last_alert_time)"));
        assertTrue(migrationSql.contains("ON system_supervision_alert_review_item(tenant_id, source_system, camera_id, zone_code, rule_code, review_status, last_alert_time)"));
        assertTrue(migrationSql.contains("CREATE TABLE IF NOT EXISTS system_supervision_alert_review_ingest_identity"));
        assertTrue(migrationSql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uk_supervision_alert_review_ingest_identity"));
        assertTrue(migrationSql.contains("ON system_supervision_alert_review_ingest_identity(tenant_id, source_system, identity_key)"));
        assertTrue(migrationSql.contains("ON system_supervision_alert_review_segment(review_item_id)"));
        assertTrue(migrationSql.contains("UPDATE system_supervision_alert_review_segment segment"));
        assertTrue(migrationSql.contains("ON system_supervision_alert_review_segment(tenant_id, camera_id, start_time, end_time)"));
        assertTrue(migrationSql.contains("ck_supervision_alert_review_segment_time"));
        assertTrue(migrationSql.contains("ck_supervision_alert_review_segment_status"));
        assertTrue(migrationSql.contains("ck_supervision_alert_review_segment_severity"));
        assertTrue(migrationSql.contains("ex_supervision_alert_review_segment_camera_time"));
        assertTrue(migrationSql.contains("DROP CONSTRAINT IF EXISTS ex_supervision_alert_review_segment_camera_time"));
        assertTrue(migrationSql.contains("tenant_id WITH ="));
        assertTrue(migrationSql.contains("tsrange(start_time, COALESCE(end_time, 'infinity'::timestamp), '[)') WITH &&"));
        assertTrue(migrationSql.contains("system_supervision_alert_review_segment"));
    }

    @Test
    void alertReviewSegmentTenantScopeMigrationKeepsStatusAndSeverityConstraints() throws IOException {
        Path migration = Path.of("src/main/resources/sql/migrations/V20260704__alert_review_segment_tenant_scope.sql");

        assertTrue(Files.exists(migration), "tenant-scoped segment migration should exist");
        String migrationSql = Files.readString(migration, StandardCharsets.UTF_8);
        assertTrue(migrationSql.contains("ck_supervision_alert_review_segment_status"));
        assertTrue(migrationSql.contains("segment_status IN ('active', 'detection', 'alert', 'ended')"));
        assertTrue(migrationSql.contains("ck_supervision_alert_review_segment_severity"));
        assertTrue(migrationSql.contains("severity IN ('detection', 'alert')"));
        assertTrue(migrationSql.contains("tenant_id WITH ="));
        assertTrue(migrationSql.contains("camera_id WITH ="));
    }

    @Test
    void alertReviewReviewDataBackfillMigrationNormalizesLegacyRows() throws IOException {
        Path migration = Path.of("src/main/resources/sql/migrations/V20260705__alert_review_review_data_backfill.sql");

        assertTrue(Files.exists(migration), "reviewData backfill migration should exist");
        String migrationSql = Files.readString(migration, StandardCharsets.UTF_8);
        assertTrue(migrationSql.contains("system_supervision_alert_review_item"));
        assertTrue(migrationSql.contains("review_data::jsonb"));
        assertTrue(migrationSql.contains("reviewDataVersion"));
        assertTrue(migrationSql.contains("labels"));
        assertTrue(migrationSql.contains("zones"));
        assertTrue(migrationSql.contains("objectIds"));
        assertTrue(migrationSql.contains("objects"));
        assertTrue(migrationSql.contains("detections"));
        assertTrue(migrationSql.contains("reviewSegment"));
        assertTrue(migrationSql.contains("migration_backfill"));
    }

    @Test
    void alertReviewMediaPermissionMigrationSeedsMenuPermissions() throws IOException {
        Path migration = Path.of("src/main/resources/sql/migrations/V20260706__alert_review_media_permissions.sql");

        assertTrue(Files.exists(migration), "review media permission migration should exist");
        String migrationSql = Files.readString(migration, StandardCharsets.UTF_8);
        assertTrue(migrationSql.contains("system_menu"));
        assertTrue(migrationSql.contains("system_menu_seq"));
        assertTrue(migrationSql.contains("type = 3"));
        assertTrue(migrationSql.contains("system:supervision-alert-review:media:playback"));
        assertTrue(migrationSql.contains("system:supervision-alert-review:media:export"));
        assertTrue(migrationSql.contains("system:supervision-alert-review:media:download"));
        assertTrue(migrationSql.contains("system:supervision-alert-review:media:manifest"));
    }

    @Test
    void reviewDataJsonSchemaArtifactDefinesVersionedFrigateReviewFields() throws IOException {
        Path schema = Path.of("src/main/resources/schemas/alert-review-review-data-v1.schema.json");

        assertTrue(Files.exists(schema), "reviewData JSON schema artifact should exist");
        JsonNode root = OBJECT_MAPPER.readTree(Files.readString(schema, StandardCharsets.UTF_8));
        JsonNode properties = root.path("properties");
        String required = root.path("required").toString();

        assertEquals("https://json-schema.org/draft/2020-12/schema", root.path("$schema").asText());
        assertEquals("yfeieye.alertReview.reviewData.v1", root.path("$id").asText());
        assertEquals(1, properties.path("reviewDataVersion").path("const").asInt());
        assertEquals("array", properties.path("labels").path("type").asText());
        assertEquals("array", properties.path("zones").path("type").asText());
        assertEquals("array", properties.path("objectIds").path("type").asText());
        assertEquals("number", properties.path("confidence").path("type").asText());
        assertEquals("array", properties.path("bbox").path("type").asText());
        assertEquals(4, properties.path("bbox").path("minItems").asInt());
        assertEquals(4, properties.path("bbox").path("maxItems").asInt());
        assertEquals("string", properties.path("correlationId").path("type").asText());
        assertTrue(properties.has("reviewSegment"));
        assertTrue(required.contains("\"reviewDataVersion\""));
        assertTrue(required.contains("\"labels\""));
        assertTrue(required.contains("\"zones\""));
        assertTrue(required.contains("\"objectIds\""));
        assertTrue(required.contains("\"reviewSegment\""));
    }

    private static String readSchemaSql() throws IOException {
        InputStream inputStream = Thread.currentThread().getContextClassLoader().getResourceAsStream(SCHEMA_RESOURCE);
        assertNotNull(inputStream, SCHEMA_RESOURCE + " should exist on the classpath");
        try (inputStream) {
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static Set<String> extractCreatedTables(String sql) {
        Matcher matcher = Pattern.compile("(?im)^\\s*CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+([a-zA-Z0-9_]+)\\s*\\(")
                .matcher(sql);
        Set<String> tableNames = new LinkedHashSet<>();
        while (matcher.find()) {
            tableNames.add(matcher.group(1));
        }
        return tableNames;
    }

    private static String extractTableBody(String sql, String tableName) {
        Matcher matcher = Pattern.compile("(?is)CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+" + tableName + "\\s*\\((.*?)\\);")
                .matcher(sql);
        assertTrue(matcher.find(), tableName + " table should be defined");
        return matcher.group(1);
    }

}

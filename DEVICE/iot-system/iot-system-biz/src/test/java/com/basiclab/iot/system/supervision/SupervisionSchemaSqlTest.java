package com.basiclab.iot.system.supervision;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
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

    @Test
    void schemaCreatesOnlySupervisionTables() throws IOException {
        String sql = readSchemaSql();

        assertEquals(Set.of(
                "system_supervision_event",
                "system_supervision_task",
                "system_supervision_action",
                "system_supervision_evidence_item",
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

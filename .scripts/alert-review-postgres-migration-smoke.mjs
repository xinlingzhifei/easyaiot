import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIGRATION_FILES = [
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260702__alert_review_frigate_hardening.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260704__alert_review_segment_tenant_scope.sql',
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
CREATE TABLE system_supervision_alert_review_item (
  id BIGINT PRIMARY KEY,
  tenant_id BIGINT,
  source_system VARCHAR(64) NOT NULL,
  source_alert_ids TEXT,
  review_status VARCHAR(64),
  camera_id VARCHAR(128),
  zone_code VARCHAR(128),
  rule_code VARCHAR(128),
  last_alert_time TIMESTAMP,
  deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE system_supervision_alert_review_case_audit (
  id BIGSERIAL PRIMARY KEY,
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
  id, tenant_id, source_system, source_alert_ids, review_status, camera_id, zone_code, rule_code, last_alert_time, deleted
)
VALUES
  (1, 1001, 'video', E'a-shared\\na-unique-1\\na-shared', 'pending_review', 'camera-01', 'zone-a', 'rule-a', '2026-07-05 10:00', false),
  (2, 2002, 'video', E'a-shared\\na-unique-2', 'pending_review', 'camera-01', 'zone-a', 'rule-a', '2026-07-05 10:00', false),
  (3, 1001, 'video', 'a-shared', 'pending_review', 'camera-02', 'zone-b', 'rule-b', '2026-07-05 10:10', false);

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
  id, tenant_id, source_system, source_alert_ids, review_status, camera_id, zone_code, rule_code, last_alert_time, deleted
)
VALUES (4, 1001, 'video', 'a-overlap', 'pending_review', 'camera-01', 'zone-a', 'rule-a', '2026-07-05 10:02', false);

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
  id, tenant_id, source_system, source_alert_ids, review_status, camera_id, zone_code, rule_code, last_alert_time, deleted
)
VALUES
  (5, 1001, 'video', 'a-open-active-1', 'pending_review', 'camera-open-01', 'zone-a', 'rule-a', '2026-07-05 11:00', false),
  (6, 1001, 'video', 'a-open-active-2', 'pending_review', 'camera-open-01', 'zone-a', 'rule-a', '2026-07-05 11:01', false);

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

function printHelp() {
  console.log(`Usage: node .scripts/alert-review-postgres-migration-smoke.mjs --container=NAME [--database=NAME] [--repo-root=PATH] [--keep-database]

Runs FR-01/FR-20 alert review PostgreSQL migration smoke against an existing Docker PostgreSQL container.
The target container must accept: docker exec -i NAME psql -U postgres -d DATABASE.
The smoke creates a temporary database, applies V20260702 and V20260704, and verifies ingest identity and ReviewSegment constraints.`);
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
    return `${assertionOutput}${concurrentOutput}\n`;
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

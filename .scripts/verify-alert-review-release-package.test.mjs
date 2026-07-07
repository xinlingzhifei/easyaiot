import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  evaluateStatus,
  releaseEntriesForTrackedPaths,
  scanWebTypecheckGate,
  scanTextQuality,
} from './verify-alert-review-release-package.mjs';

const clean = evaluateStatus(`
 M README.md
?? scratch/local-note.txt
`);
assert.equal(clean.ok, true);
assert.deepEqual(clean.blockers, []);

const untrackedBackend = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/service/supervision/SupervisionAlertReviewServiceImpl.java
`);
assert.equal(untrackedBackend.ok, false);
assert.equal(untrackedBackend.blockers[0].reason, 'untracked');

const unstagedWorkbench = evaluateStatus(`
 M WEB/src/views/alert/components/AlertReviewWorkbench.vue
 M WEB/src/components/VideoPlayer/DialogPlayer.vue
`);
assert.equal(unstagedWorkbench.ok, false);
assert.equal(unstagedWorkbench.blockers[0].reason, 'unstaged');
assert.equal(unstagedWorkbench.blockers[1].group, 'WEB alert review workbench package');

const stagedWorkbench = evaluateStatus(`
A  WEB/src/views/alert/components/AlertReviewWorkbench.vue
M  DEVICE/iot-system/iot-system-biz/src/main/resources/sql/supervision_event_closure_v1.sql
`);
assert.equal(stagedWorkbench.ok, true);
assert.deepEqual(stagedWorkbench.blockers, []);

const untrackedGate = evaluateStatus(`
?? .scripts/verify-alert-review-release-package.mjs
?? .scripts/alert-review-visible-copy-scan.mjs
`);
assert.equal(untrackedGate.ok, false);
assert.equal(untrackedGate.blockers[0].group, 'FR release gate tooling');
assert.equal(untrackedGate.blockers[1].group, 'FR release gate tooling');

const trackedReleaseEntries = releaseEntriesForTrackedPaths([
  'README.md',
  'WEB/src/api/supervision/alertReview.ts',
  'WEB/scripts/alert-review-workbench-e2e-check.test.mjs',
  'WEB/scripts/alert-review-playback-contract.test.mjs',
  'WEB/src/components/VideoPlayer/DialogPlayer.vue',
  'WEB/src/components/Player/module/jessibuca.vue',
  'WEB/src/utils/withInstall.ts',
  'WEB/src/api/device/patrol.ts',
  '.scripts/verify-alert-review-release-package.mjs',
  '.scripts/record-export-manifest-verifier.mjs',
  '.scripts/alert-review-device-integration-smoke.mjs',
  '.scripts/alert-review-device-integration-smoke.test.mjs',
  '.scripts/alert-review-production-smoke.mjs',
  '.scripts/alert-review-production-smoke.test.mjs',
  '.scripts/alert-review-visible-copy-scan.mjs',
  '.scripts/alert-review-visible-copy-scan.test.mjs',
  '.scripts/alert-review-player-live-smoke.mjs',
  '.scripts/alert-review-player-live-smoke.test.mjs',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260704__alert_review_segment_tenant_scope.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260705__alert_review_review_data_backfill.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260706__alert_review_media_permissions.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260707__alert_review_item_media_audit.sql',
]);
assert.equal(trackedReleaseEntries.length, 21);
assert.deepEqual(
  trackedReleaseEntries.map((entry) => [entry.status, entry.path, entry.group]),
  [
    ['  ', 'WEB/src/api/supervision/alertReview.ts', 'WEB alert review workbench package'],
    ['  ', 'WEB/scripts/alert-review-workbench-e2e-check.test.mjs', 'WEB alert review workbench package'],
    ['  ', 'WEB/scripts/alert-review-playback-contract.test.mjs', 'WEB alert review workbench package'],
    ['  ', 'WEB/src/components/VideoPlayer/DialogPlayer.vue', 'WEB alert review workbench package'],
    ['  ', 'WEB/src/components/Player/module/jessibuca.vue', 'WEB alert review workbench package'],
    ['  ', 'WEB/src/utils/withInstall.ts', 'WEB alert review workbench package'],
    ['  ', 'WEB/src/api/device/patrol.ts', 'WEB alert review workbench package'],
    ['  ', '.scripts/verify-alert-review-release-package.mjs', 'FR release gate tooling'],
    ['  ', '.scripts/record-export-manifest-verifier.mjs', 'FR release gate tooling'],
    ['  ', '.scripts/alert-review-device-integration-smoke.mjs', 'FR release gate tooling'],
    ['  ', '.scripts/alert-review-device-integration-smoke.test.mjs', 'FR release gate tooling'],
    ['  ', '.scripts/alert-review-production-smoke.mjs', 'FR release gate tooling'],
    ['  ', '.scripts/alert-review-production-smoke.test.mjs', 'FR release gate tooling'],
    ['  ', '.scripts/alert-review-visible-copy-scan.mjs', 'FR release gate tooling'],
    ['  ', '.scripts/alert-review-visible-copy-scan.test.mjs', 'FR release gate tooling'],
    ['  ', '.scripts/alert-review-player-live-smoke.mjs', 'FR release gate tooling'],
    ['  ', '.scripts/alert-review-player-live-smoke.test.mjs', 'FR release gate tooling'],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260704__alert_review_segment_tenant_scope.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260705__alert_review_review_data_backfill.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260706__alert_review_media_permissions.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260707__alert_review_item_media_audit.sql',
      'DEVICE schema and migration',
    ],
  ],
);

const unstagedTenantMigration = evaluateStatus(`
 M DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260704__alert_review_segment_tenant_scope.sql
`);
assert.equal(unstagedTenantMigration.ok, false);
assert.equal(unstagedTenantMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedReviewDataMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260705__alert_review_review_data_backfill.sql
`);
assert.equal(untrackedReviewDataMigration.ok, false);
assert.equal(untrackedReviewDataMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedMediaPermissionMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260706__alert_review_media_permissions.sql
`);
assert.equal(untrackedMediaPermissionMigration.ok, false);
assert.equal(untrackedMediaPermissionMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedItemMediaAuditMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260707__alert_review_item_media_audit.sql
`);
assert.equal(untrackedItemMediaAuditMigration.ok, false);
assert.equal(untrackedItemMediaAuditMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedWorkbenchRunner = evaluateStatus(`
?? WEB/scripts/alert-review-workbench-e2e-check.test.mjs
?? WEB/scripts/alert-review-playback-contract.test.mjs
?? WEB/src/utils/withInstall.ts
`);
assert.equal(untrackedWorkbenchRunner.ok, false);
assert.equal(untrackedWorkbenchRunner.blockers[0].group, 'WEB alert review workbench package');
assert.equal(untrackedWorkbenchRunner.blockers[1].group, 'WEB alert review workbench package');
assert.equal(untrackedWorkbenchRunner.blockers[2].group, 'WEB alert review workbench package');

const mojibakeScan = scanTextQuality([
  {
    path: 'VIDEO/app/blueprints/record.py',
    content: "logger.error(f'\u9352\u6d98\u7f13\u590d\u6838\u8bc1\u636e\u5f55\u50cf\u5bfc\u51fa\u4efb\u52a1\u5931\u8d25: {str(e)}')",
  },
]);
assert.equal(mojibakeScan.ok, false);
assert.equal(mojibakeScan.blockers[0].reason, 'encoding_mojibake');

const patrolMojibakeScan = scanTextQuality([
  {
    path: 'WEB/src/api/device/patrol.ts',
    content: "/** \u93bd\u52eb\u511a\u6f8e\u6751\u8d30\u59ab\u20ac\u6d7c\u6c33\u7629 API */",
  },
]);
assert.equal(patrolMojibakeScan.ok, false);
assert.equal(patrolMojibakeScan.blockers[0].reason, 'encoding_mojibake');

const visibleCopyMojibakeScan = scanTextQuality([
  {
    path: 'VIDEO/app/blueprints/record.py',
    content: 'logger.error("\u935b\u5a45警录像导出失败")',
  },
]);
assert.equal(visibleCopyMojibakeScan.ok, false);
assert.equal(visibleCopyMojibakeScan.blockers[0].reason, 'encoding_mojibake');

const cleanTextScan = scanTextQuality([
  {
    path: 'VIDEO/app/blueprints/record.py',
    content: "logger.error(f'\u521b\u5efa\u590d\u6838\u8bc1\u636e\u5f55\u50cf\u5bfc\u51fa\u4efb\u52a1\u5931\u8d25: {str(e)}')",
  },
]);
assert.equal(cleanTextScan.ok, true);

const typecheckGateScan = scanWebTypecheckGate([
  {
    path: 'WEB/package.json',
    content: JSON.stringify({
      scripts: {
        'type:check': 'cross-env NODE_OPTIONS=--max-old-space-size=8192 vue-tsc --noEmit --skipLibCheck',
      },
    }),
  },
]);
assert.equal(typecheckGateScan.ok, true);

const missingTypecheckGateScan = scanWebTypecheckGate([
  {
    path: 'WEB/package.json',
    content: JSON.stringify({ scripts: { build: 'vite build' } }),
  },
]);
assert.equal(missingTypecheckGateScan.ok, false);
assert.equal(missingTypecheckGateScan.blockers[0].reason, 'web_typecheck_gate_missing');

const weakenedTypecheckGateScan = scanWebTypecheckGate([
  {
    path: 'WEB/package.json',
    content: JSON.stringify({ scripts: { 'type:check': 'tsc --noEmit' } }),
  },
]);
assert.equal(weakenedTypecheckGateScan.ok, false);
assert.equal(weakenedTypecheckGateScan.blockers[0].reason, 'web_typecheck_gate_weakened');

const requireClean = evaluateStatus(`
A  WEB/src/views/alert/components/AlertReviewWorkbench.vue
`, { requireClean: true });
assert.equal(requireClean.ok, false);
assert.equal(requireClean.blockers[0].reason, 'dirty');

const tempDir = mkdtempSync(join(tmpdir(), 'alert-review-release-package-'));
try {
  const statusPath = join(tempDir, 'status.txt');
  writeFileSync(
    statusPath,
    '?? DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/service/supervision/SupervisionAlertReviewServiceImpl.java\n',
  );
  const scriptPath = join(dirname(fileURLToPath(import.meta.url)), 'verify-alert-review-release-package.mjs');
  const cli = spawnSync(process.execPath, [scriptPath, `--status-file=${statusPath}`], {
    encoding: 'utf8',
  });

  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /untracked/);
  assert.match(cli.stderr, /SupervisionAlertReviewServiceImpl\.java/);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log('alert review release package verifier tests OK');

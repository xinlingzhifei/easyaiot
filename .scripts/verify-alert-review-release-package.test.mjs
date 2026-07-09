import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  evaluateStatus,
  releaseEntriesForTrackedPaths,
  scanLiveVideoEvidenceGate,
  scanMediaPermissionGate,
  scanReleaseTraceabilityGate,
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
  'WEB/src/utils/alertRecord.ts',
  'WEB/src/utils/alertRecordPlayback.ts',
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
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708__alert_review_segment_status_transition.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_2__alert_review_scheduler_jobs.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_3__alert_review_report_ack.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_4__alert_review_runtime_outbox_notify_templates.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_5__alert_review_runtime_outbox_delivery.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_6__alert_review_runtime_outbox_claim.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_7__alert_review_segment_end_time_guard.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_8__alert_review_segment_alert_severity_guard.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/dal/dataobject/supervision/SupervisionAlertReviewRuntimeOutboxDeliveryDO.java',
  'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/dal/pgsql/supervision/SupervisionAlertReviewRuntimeOutboxDeliveryMapper.java',
  'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/service/supervision/ReviewRuntimeOutboxNotifyDeliveryStore.java',
  'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/service/supervision/ReviewRuntimeOutboxNotifyDeliveryMapperStore.java',
  'DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/NotifyReviewRuntimeOutboxPublisherTest.java',
]);
assert.equal(trackedReleaseEntries.length, 36);
assert.deepEqual(
  trackedReleaseEntries.map((entry) => [entry.status, entry.path, entry.group]),
  [
    ['  ', 'WEB/src/api/supervision/alertReview.ts', 'WEB alert review workbench package'],
    ['  ', 'WEB/scripts/alert-review-workbench-e2e-check.test.mjs', 'WEB alert review workbench package'],
    ['  ', 'WEB/scripts/alert-review-playback-contract.test.mjs', 'WEB alert review workbench package'],
    ['  ', 'WEB/src/components/VideoPlayer/DialogPlayer.vue', 'WEB alert review workbench package'],
    ['  ', 'WEB/src/components/Player/module/jessibuca.vue', 'WEB alert review workbench package'],
    ['  ', 'WEB/src/utils/alertRecord.ts', 'WEB alert review workbench package'],
    ['  ', 'WEB/src/utils/alertRecordPlayback.ts', 'WEB alert review workbench package'],
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
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708__alert_review_segment_status_transition.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_2__alert_review_scheduler_jobs.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_3__alert_review_report_ack.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_4__alert_review_runtime_outbox_notify_templates.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_5__alert_review_runtime_outbox_delivery.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_6__alert_review_runtime_outbox_claim.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_7__alert_review_segment_end_time_guard.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_8__alert_review_segment_alert_severity_guard.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/dal/dataobject/supervision/SupervisionAlertReviewRuntimeOutboxDeliveryDO.java',
      'DEVICE review backend',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/dal/pgsql/supervision/SupervisionAlertReviewRuntimeOutboxDeliveryMapper.java',
      'DEVICE review backend',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/service/supervision/ReviewRuntimeOutboxNotifyDeliveryStore.java',
      'DEVICE review backend',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/service/supervision/ReviewRuntimeOutboxNotifyDeliveryMapperStore.java',
      'DEVICE review backend',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/NotifyReviewRuntimeOutboxPublisherTest.java',
      'DEVICE review regression tests',
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

const untrackedSegmentTransitionMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708__alert_review_segment_status_transition.sql
`);
assert.equal(untrackedSegmentTransitionMigration.ok, false);
assert.equal(untrackedSegmentTransitionMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedSchedulerJobsMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_2__alert_review_scheduler_jobs.sql
`);
assert.equal(untrackedSchedulerJobsMigration.ok, false);
assert.equal(untrackedSchedulerJobsMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedReportAckMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_3__alert_review_report_ack.sql
`);
assert.equal(untrackedReportAckMigration.ok, false);
assert.equal(untrackedReportAckMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedRuntimeOutboxNotifyTemplateMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_4__alert_review_runtime_outbox_notify_templates.sql
`);
assert.equal(untrackedRuntimeOutboxNotifyTemplateMigration.ok, false);
assert.equal(untrackedRuntimeOutboxNotifyTemplateMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedRuntimeOutboxDeliveryMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_5__alert_review_runtime_outbox_delivery.sql
`);
assert.equal(untrackedRuntimeOutboxDeliveryMigration.ok, false);
assert.equal(untrackedRuntimeOutboxDeliveryMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedRuntimeOutboxClaimMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_6__alert_review_runtime_outbox_claim.sql
`);
assert.equal(untrackedRuntimeOutboxClaimMigration.ok, false);
assert.equal(untrackedRuntimeOutboxClaimMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedSegmentEndTimeGuardMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_7__alert_review_segment_end_time_guard.sql
`);
assert.equal(untrackedSegmentEndTimeGuardMigration.ok, false);
assert.equal(untrackedSegmentEndTimeGuardMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedSegmentAlertSeverityGuardMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_8__alert_review_segment_alert_severity_guard.sql
`);
assert.equal(untrackedSegmentAlertSeverityGuardMigration.ok, false);
assert.equal(untrackedSegmentAlertSeverityGuardMigration.blockers[0].group, 'DEVICE schema and migration');

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

const missingRecordFallbackMojibakeScan = scanTextQuality([
  {
    path: 'docs/requirements/alert-review-frigate-fr01-fr38-hardening-review.md',
    content: 'renders as `\u7f02\u54c4\u7d8d\u50cf / \u5bf0\u546e\u589c\u52a8` with `VIDEO URL \u93c8\ue048\u53a4`',
  },
]);
assert.equal(missingRecordFallbackMojibakeScan.ok, false);
assert.equal(missingRecordFallbackMojibakeScan.blockers[0].reason, 'encoding_mojibake');

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

const completeMediaPermissionSeedContent = [
  'system:supervision-alert-review:media:playback',
  'system:supervision-alert-review:media:snapshot',
  'system:supervision-alert-review:media:export',
  'system:supervision-alert-review:media:download',
  'system:supervision-alert-review:media:manifest',
].join('; ');
const completeMediaPermissionConfigContent = [
  'camera-permission:',
  'action-permissions:',
  'playback:',
  'system:supervision-alert-review:media:playback',
  'snapshot:',
  'system:supervision-alert-review:media:snapshot',
  'coverage:',
  'export:',
  'system:supervision-alert-review:media:export',
  'download:',
  'system:supervision-alert-review:media:download',
  'manifest_verify:',
  'system:supervision-alert-review:media:manifest',
].join('\n');

const mediaPermissionGateScan = scanMediaPermissionGate([
  {
    path: 'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260706__alert_review_media_permissions.sql',
    content: completeMediaPermissionSeedContent,
  },
  {
    path: 'DEVICE/iot-system/iot-system-biz/src/main/resources/application.yaml',
    content: completeMediaPermissionConfigContent,
  },
]);
assert.equal(mediaPermissionGateScan.ok, true);

const missingSnapshotMediaPermissionGateScan = scanMediaPermissionGate([
  {
    path: 'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260706__alert_review_media_permissions.sql',
    content: completeMediaPermissionSeedContent.replace('system:supervision-alert-review:media:snapshot; ', ''),
  },
  {
    path: 'DEVICE/iot-system/iot-system-biz/src/main/resources/application.yaml',
    content: completeMediaPermissionConfigContent,
  },
]);
assert.equal(missingSnapshotMediaPermissionGateScan.ok, false);
assert.deepEqual(missingSnapshotMediaPermissionGateScan.blockers.map((blocker) => blocker.reason), [
  'media_permission_snapshot_seed_missing',
]);

const missingSnapshotMediaPermissionConfigGateScan = scanMediaPermissionGate([
  {
    path: 'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260706__alert_review_media_permissions.sql',
    content: completeMediaPermissionSeedContent,
  },
  {
    path: 'DEVICE/iot-system/iot-system-biz/src/main/resources/application.yaml',
    content: completeMediaPermissionConfigContent
      .replace('snapshot:\n', '')
      .replace('system:supervision-alert-review:media:snapshot\n', ''),
  },
]);
assert.equal(missingSnapshotMediaPermissionConfigGateScan.ok, false);
assert.deepEqual(missingSnapshotMediaPermissionConfigGateScan.blockers.map((blocker) => blocker.reason), [
  'media_permission_snapshot_action_config_missing',
]);

const completeLiveVideoSmokeContent = 'requiredOptionErrors; validateStorageDriftReport; REQUIRED_STORAGE_DRIFT_REASON_KEYS; storageDriftReasonKeys; standardReasonKeys; missing standard reason evidence; file_missing; retention_expired; disk_full; cache_flush_failed; validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); spawnSync(process.execPath; timeout: timeoutMs; ETIMEDOUT; timed out after; result.status !== 0; verifier failed with exit; missing --manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value); looksInlineOrOpaqueMediaEvidence(value); looksAbsoluteLocalPathEvidence(value); data:; blob:; about:; validateDownloadProbeHeaders(response); isVideoDownloadContentType(contentType); content-type; content-length; video/; application/octet-stream; isSha256Digest(value); [a-f0-9]{64}; invalid source segment hash; invalid output file hash; ffmpegCommandHashes; invalid ffmpeg command hash; validateClipWindows(sourceSegments); invalid clip window; validateManifestConcatOrder(recordSegments, concatOrder); normalizeConcatOrderEntry(entry); validateRootConcatOrderCoverage(segmentOrderEntries, orderEntries, recordSegments.length); concatOrder.map; entry.index; duplicate concat order index; invalid concat order index; references missing segment index; omits segment index; does not match segment count; raw.startsWith; mock/; mock\\; https:${raw}; recordUriSource; file_path;';
const completeProductionSmokeContent = 'requiredOptionErrors; liveVideoEvidenceError; liveDeviceEvidenceError; livePlayerEvidenceError; playerSmokeStep; --assert-native-current-time; Number.isFinite(player.nativeCurrentTime); missing native currentTime evidence; W2:typecheck; --pm-on-fail=ignore; pnpm_version_guard; typecheckRetry; REQUIRED_STORAGE_DRIFT_REASON_KEYS; summary.storageDriftSummary?.standardReasonKeys; missing standard storage drift reason evidence; file_missing; retention_expired; disk_full; cache_flush_failed; payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestStorageLifecycle; summary.manifestStorageLifecycle = payload.manifestStorageLifecycle; summary.manifestStorageLifecycle?.status; missing persisted manifest storage lifecycle evidence; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; summary.manifestVerification?.valid; summary.manifestVerification.signatureValid; summary.manifestVerification.signatureKeyAvailable; missing valid manifest verifier evidence; missing HMAC manifest verifier signature evidence; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT; evidenceOutputFile; missing --evidence-output-file; YFEIEYE_PRODUCTION_SMOKE_EVIDENCE_FILE; stepTimeoutMs; --step-timeout-ms; YFEIEYE_PRODUCTION_SMOKE_STEP_TIMEOUT_MS; timeout: step.timeoutMs; summary.timeout; timed out after; --timeout-ms=${options.stepTimeoutMs}; childSmokeSummary; evidence_download_audited; auditChain; eventIds; reviewItemIds; export_downloaded; missing auditChain exportJobNo evidence; liveDevicePlaybackEvidenceError; summary.playback; grantedDecision; deniedDecision; camera_not_allowed; missing playback URL allow/deny decision evidence; missing playback URL deny reason evidence; liveDeviceRuleEvidenceError; summary.ruleEvidence; inertiaFrames; loiteringSeconds; missing rule inertia/loitering evidence; missing rule inertiaFrames=3 evidence; missing rule loiteringSeconds=20 evidence;';
const productionSmokeTimeoutEvidenceContent = 'stepTimeoutMs; --step-timeout-ms; YFEIEYE_PRODUCTION_SMOKE_STEP_TIMEOUT_MS; timeout: step.timeoutMs; summary.timeout; timed out after; --timeout-ms=${options.stepTimeoutMs};';

const liveVideoEvidenceGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent,
  },
]);
assert.equal(liveVideoEvidenceGateScan.ok, true);

const missingLiveVideoManifestVerifierTimeoutGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent
      .replace('timeout: timeoutMs; ', '')
      .replace('ETIMEDOUT; ', '')
      .replace('timed out after; ', ''),
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent,
  },
]);
assert.equal(missingLiveVideoManifestVerifierTimeoutGateScan.ok, false);
assert.deepEqual(missingLiveVideoManifestVerifierTimeoutGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_manifest_verifier_timeout_missing',
]);

const missingLiveVideoStorageDriftReasonGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent
      .replace('REQUIRED_STORAGE_DRIFT_REASON_KEYS; ', '')
      .replace('storageDriftReasonKeys; ', '')
      .replace('standardReasonKeys; ', '')
      .replace('missing standard reason evidence; ', '')
      .replace('file_missing; ', '')
      .replace('retention_expired; ', '')
      .replace('disk_full; ', '')
      .replace('cache_flush_failed; ', ''),
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent,
  },
]);
assert.equal(missingLiveVideoStorageDriftReasonGateScan.ok, false);
assert.deepEqual(missingLiveVideoStorageDriftReasonGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_storage_drift_reason_evidence_missing',
]);

const missingProductionSmokeStorageDriftReasonGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('REQUIRED_STORAGE_DRIFT_REASON_KEYS; ', '')
      .replace('summary.storageDriftSummary?.standardReasonKeys; ', '')
      .replace('missing standard storage drift reason evidence; ', '')
      .replace('file_missing; ', '')
      .replace('retention_expired; ', '')
      .replace('disk_full; ', '')
      .replace('cache_flush_failed; ', ''),
  },
]);
assert.equal(missingProductionSmokeStorageDriftReasonGateScan.ok, false);
assert.deepEqual(missingProductionSmokeStorageDriftReasonGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_storage_drift_reason_evidence_missing',
]);

const missingProductionSmokePlayerNativeTimeGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('--assert-native-current-time; ', ''),
  },
]);
assert.equal(missingProductionSmokePlayerNativeTimeGateScan.ok, false);
assert.deepEqual(missingProductionSmokePlayerNativeTimeGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_player_native_time_assert_missing',
]);

const missingProductionSmokePlayerNativeTimeEvidenceGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('Number.isFinite(player.nativeCurrentTime); ', '')
      .replace('missing native currentTime evidence; ', ''),
  },
]);
assert.equal(missingProductionSmokePlayerNativeTimeEvidenceGateScan.ok, false);
assert.deepEqual(missingProductionSmokePlayerNativeTimeEvidenceGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_player_native_time_evidence_missing',
]);

const missingProductionSmokeTypecheckRetryGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('--pm-on-fail=ignore; ', '')
      .replace('pnpm_version_guard; ', '')
      .replace('typecheckRetry; ', ''),
  },
]);
assert.equal(missingProductionSmokeTypecheckRetryGateScan.ok, false);
assert.deepEqual(missingProductionSmokeTypecheckRetryGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_typecheck_pnpm_guard_retry_missing',
]);

const liveVideoCoverageUrlAliasGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: `${completeLiveVideoSmokeContent} recordCoverageQueryUrl = parsed.alertRecordQueryUrl;`,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent,
  },
]);
assert.equal(liveVideoCoverageUrlAliasGateScan.ok, false);
assert.deepEqual(liveVideoCoverageUrlAliasGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_coverage_url_alias_present',
]);

const missingLiveVideoManifestVerifierRequiredGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent
      .replace('missing --manifest-verifier-script; ', '')
      .replace('YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT; ', ''),
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent,
  },
]);
assert.equal(missingLiveVideoManifestVerifierRequiredGateScan.ok, false);
assert.deepEqual(missingLiveVideoManifestVerifierRequiredGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_manifest_verifier_required_missing',
]);

const missingProductionSmokeEvidenceFileRequiredGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('evidenceOutputFile; ', '')
      .replace('missing --evidence-output-file; ', '')
      .replace('YFEIEYE_PRODUCTION_SMOKE_EVIDENCE_FILE; ', ''),
  },
]);
assert.equal(missingProductionSmokeEvidenceFileRequiredGateScan.ok, false);
assert.deepEqual(missingProductionSmokeEvidenceFileRequiredGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_evidence_output_required_missing',
]);

const missingProductionSmokeStepTimeoutGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('stepTimeoutMs; ', '')
      .replace('--step-timeout-ms; ', '')
      .replace('YFEIEYE_PRODUCTION_SMOKE_STEP_TIMEOUT_MS; ', '')
      .replace('timeout: step.timeoutMs; ', '')
      .replace('summary.timeout; ', '')
      .replace('timed out after; ', ''),
  },
]);
assert.equal(missingProductionSmokeStepTimeoutGateScan.ok, false);
assert.deepEqual(missingProductionSmokeStepTimeoutGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_step_timeout_missing',
]);

const missingProductionSmokeChildTimeoutGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent.replace('--timeout-ms=${options.stepTimeoutMs}; ', ''),
  },
]);
assert.equal(missingProductionSmokeChildTimeoutGateScan.ok, false);
assert.deepEqual(missingProductionSmokeChildTimeoutGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_child_timeout_missing',
]);

const missingProductionSmokeManifestVerifierRequiredGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('videoManifestVerifierScript; ', '')
      .replace('missing --video-manifest-verifier-script; ', '')
      .replace('YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT; ', ''),
  },
]);
assert.equal(missingProductionSmokeManifestVerifierRequiredGateScan.ok, false);
assert.deepEqual(missingProductionSmokeManifestVerifierRequiredGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_manifest_verifier_required_missing',
]);

const missingProductionSmokeManifestVerifierEvidenceGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('summary.manifestVerification?.valid; ', '')
      .replace('missing valid manifest verifier evidence; ', ''),
  },
]);
assert.equal(missingProductionSmokeManifestVerifierEvidenceGateScan.ok, false);
assert.deepEqual(missingProductionSmokeManifestVerifierEvidenceGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_manifest_verifier_evidence_required_missing',
]);

const missingProductionSmokeManifestVerifierSignatureGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('summary.manifestVerification.signatureValid; ', '')
      .replace('summary.manifestVerification.signatureKeyAvailable; ', '')
      .replace('missing HMAC manifest verifier signature evidence; ', ''),
  },
]);
assert.equal(missingProductionSmokeManifestVerifierSignatureGateScan.ok, false);
assert.deepEqual(missingProductionSmokeManifestVerifierSignatureGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_manifest_verifier_signature_evidence_missing',
]);

const missingProductionSmokeManifestStorageLifecycleGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('payload.manifestStorageLifecycle; ', '')
      .replace('summary.manifestStorageLifecycle = payload.manifestStorageLifecycle; ', '')
      .replace('summary.manifestStorageLifecycle?.status; ', '')
      .replace('missing persisted manifest storage lifecycle evidence; ', ''),
  },
]);
assert.equal(missingProductionSmokeManifestStorageLifecycleGateScan.ok, false);
assert.deepEqual(missingProductionSmokeManifestStorageLifecycleGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_manifest_storage_lifecycle_missing',
]);

const missingLiveVideoEvidenceGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); hmac-sha256;',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.exportResult;',
  },
]);
assert.equal(missingLiveVideoEvidenceGateScan.ok, false);
assert.deepEqual(missingLiveVideoEvidenceGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_manifest_signature_summary_missing',
  'live_video_manifest_verifier_summary_missing',
  'live_video_media_evidence_gate_missing',
  'production_smoke_manifest_signature_summary_missing',
  'production_smoke_manifest_verifier_summary_missing',
  'production_smoke_manifest_verifier_required_missing',
]);

const missingLiveVideoSignatureValueGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); result.status !== 0; verifier failed with exit; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value); looksInlineOrOpaqueMediaEvidence(value); looksAbsoluteLocalPathEvidence(value); data:; blob:; about:; validateDownloadProbeHeaders(response); isVideoDownloadContentType(contentType); content-type; content-length; video/; application/octet-stream; isSha256Digest(value); [a-f0-9]{64}; invalid source segment hash; invalid output file hash; ffmpegCommandHashes; invalid ffmpeg command hash; validateClipWindows(sourceSegments); invalid clip window; validateManifestConcatOrder(recordSegments, concatOrder); normalizeConcatOrderEntry(entry); validateRootConcatOrderCoverage(segmentOrderEntries, orderEntries, recordSegments.length); concatOrder.map; entry.index; duplicate concat order index; invalid concat order index; references missing segment index; omits segment index; does not match segment count; raw.startsWith; mock/; mock\\; https:${raw}; recordUriSource; file_path;',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT;',
  },
]);
assert.equal(missingLiveVideoSignatureValueGateScan.ok, false);
assert.deepEqual(missingLiveVideoSignatureValueGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_manifest_signature_summary_missing',
]);

const missingLiveVideoVerifierExitGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); spawnSync(process.execPath); hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value); looksInlineOrOpaqueMediaEvidence(value); looksAbsoluteLocalPathEvidence(value); data:; blob:; about:; validateDownloadProbeHeaders(response); isVideoDownloadContentType(contentType); content-type; content-length; video/; application/octet-stream; isSha256Digest(value); [a-f0-9]{64}; invalid source segment hash; invalid output file hash; ffmpegCommandHashes; invalid ffmpeg command hash; validateClipWindows(sourceSegments); invalid clip window; validateManifestConcatOrder(recordSegments, concatOrder); normalizeConcatOrderEntry(entry); validateRootConcatOrderCoverage(segmentOrderEntries, orderEntries, recordSegments.length); concatOrder.map; entry.index; duplicate concat order index; invalid concat order index; references missing segment index; omits segment index; does not match segment count; raw.startsWith; mock/; mock\\; https:${raw}; recordUriSource; file_path;',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT;',
  },
]);
assert.equal(missingLiveVideoVerifierExitGateScan.ok, false);
assert.deepEqual(missingLiveVideoVerifierExitGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_manifest_verifier_summary_missing',
]);

const missingProductionSmokeAuditChainGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: `payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT; requiredOptionErrors; evidenceOutputFile; missing --evidence-output-file; YFEIEYE_PRODUCTION_SMOKE_EVIDENCE_FILE; ${productionSmokeTimeoutEvidenceContent} liveDeviceEvidenceError; childSmokeSummary; evidence_download_audited;`,
  },
]);
assert.equal(missingProductionSmokeAuditChainGateScan.ok, false);
assert.deepEqual(missingProductionSmokeAuditChainGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_audit_chain_summary_missing',
]);

const missingProductionSmokePlaybackAccessGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: `payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT; requiredOptionErrors; evidenceOutputFile; missing --evidence-output-file; YFEIEYE_PRODUCTION_SMOKE_EVIDENCE_FILE; ${productionSmokeTimeoutEvidenceContent} liveDeviceEvidenceError; childSmokeSummary; evidence_download_audited; auditChain; eventIds; reviewItemIds; export_downloaded; missing auditChain exportJobNo evidence;`,
  },
]);
assert.equal(missingProductionSmokePlaybackAccessGateScan.ok, false);
assert.deepEqual(missingProductionSmokePlaybackAccessGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_playback_access_evidence_missing',
]);

const missingProductionSmokeRuleSemanticsEvidenceGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: `payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT; requiredOptionErrors; evidenceOutputFile; missing --evidence-output-file; YFEIEYE_PRODUCTION_SMOKE_EVIDENCE_FILE; ${productionSmokeTimeoutEvidenceContent} liveDeviceEvidenceError; childSmokeSummary; evidence_download_audited; auditChain; eventIds; reviewItemIds; export_downloaded; missing auditChain exportJobNo evidence; liveDevicePlaybackEvidenceError; summary.playback; grantedDecision; deniedDecision; camera_not_allowed; missing playback URL allow/deny decision evidence; missing playback URL deny reason evidence;`,
  },
]);
assert.equal(missingProductionSmokeRuleSemanticsEvidenceGateScan.ok, false);
assert.deepEqual(missingProductionSmokeRuleSemanticsEvidenceGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_rule_semantics_evidence_missing',
]);

const missingLiveVideoFilePathGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); result.status !== 0; verifier failed with exit; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value);',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT;',
  },
]);
assert.equal(missingLiveVideoFilePathGateScan.ok, false);
assert.deepEqual(missingLiveVideoFilePathGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_media_evidence_gate_missing',
]);

const missingLiveVideoAbsolutePathGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); result.status !== 0; verifier failed with exit; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value); recordUriSource; file_path;',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT;',
  },
]);
assert.equal(missingLiveVideoAbsolutePathGateScan.ok, false);
assert.deepEqual(missingLiveVideoAbsolutePathGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_media_evidence_gate_missing',
]);

const missingLiveVideoProtocolRelativeGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); result.status !== 0; verifier failed with exit; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value); looksAbsoluteLocalPathEvidence(value); recordUriSource; file_path;',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT;',
  },
]);
assert.equal(missingLiveVideoProtocolRelativeGateScan.ok, false);
assert.deepEqual(missingLiveVideoProtocolRelativeGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_media_evidence_gate_missing',
]);

const missingLiveVideoRelativeMockPathGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); result.status !== 0; verifier failed with exit; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value); looksAbsoluteLocalPathEvidence(value); raw.startsWith; https:${raw}; recordUriSource; file_path;',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT;',
  },
]);
assert.equal(missingLiveVideoRelativeMockPathGateScan.ok, false);
assert.deepEqual(missingLiveVideoRelativeMockPathGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_media_evidence_gate_missing',
]);

const missingLiveVideoInlineMediaGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); result.status !== 0; verifier failed with exit; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value); looksAbsoluteLocalPathEvidence(value); raw.startsWith; mock/; mock\\; https:${raw}; recordUriSource; file_path;',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT;',
  },
]);
assert.equal(missingLiveVideoInlineMediaGateScan.ok, false);
assert.deepEqual(missingLiveVideoInlineMediaGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_media_evidence_gate_missing',
]);

const missingLiveVideoDownloadProbeHeaderGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); result.status !== 0; verifier failed with exit; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value); looksInlineOrOpaqueMediaEvidence(value); looksAbsoluteLocalPathEvidence(value); data:; blob:; about:; raw.startsWith; mock/; mock\\; https:${raw}; recordUriSource; file_path;',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT;',
  },
]);
assert.equal(missingLiveVideoDownloadProbeHeaderGateScan.ok, false);
assert.deepEqual(missingLiveVideoDownloadProbeHeaderGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_media_evidence_gate_missing',
]);

const missingLiveVideoManifestHashGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); result.status !== 0; verifier failed with exit; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value); looksInlineOrOpaqueMediaEvidence(value); looksAbsoluteLocalPathEvidence(value); data:; blob:; about:; validateDownloadProbeHeaders(response); isVideoDownloadContentType(contentType); content-type; content-length; video/; application/octet-stream; raw.startsWith; mock/; mock\\; https:${raw}; recordUriSource; file_path;',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT;',
  },
]);
assert.equal(missingLiveVideoManifestHashGateScan.ok, false);
assert.deepEqual(missingLiveVideoManifestHashGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_media_evidence_gate_missing',
]);

const missingLiveVideoFfmpegCommandHashGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); result.status !== 0; verifier failed with exit; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value); looksInlineOrOpaqueMediaEvidence(value); looksAbsoluteLocalPathEvidence(value); data:; blob:; about:; validateDownloadProbeHeaders(response); isVideoDownloadContentType(contentType); content-type; content-length; video/; application/octet-stream; isSha256Digest(value); [a-f0-9]{64}; invalid source segment hash; invalid output file hash; raw.startsWith; mock/; mock\\; https:${raw}; recordUriSource; file_path;',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT;',
  },
]);
assert.equal(missingLiveVideoFfmpegCommandHashGateScan.ok, false);
assert.deepEqual(missingLiveVideoFfmpegCommandHashGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_media_evidence_gate_missing',
]);

const missingLiveVideoClipWindowGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); result.status !== 0; verifier failed with exit; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value); looksInlineOrOpaqueMediaEvidence(value); looksAbsoluteLocalPathEvidence(value); data:; blob:; about:; validateDownloadProbeHeaders(response); isVideoDownloadContentType(contentType); content-type; content-length; video/; application/octet-stream; isSha256Digest(value); [a-f0-9]{64}; invalid source segment hash; invalid output file hash; ffmpegCommandHashes; invalid ffmpeg command hash; raw.startsWith; mock/; mock\\; https:${raw}; recordUriSource; file_path;',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT;',
  },
]);
assert.equal(missingLiveVideoClipWindowGateScan.ok, false);
assert.deepEqual(missingLiveVideoClipWindowGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_media_evidence_gate_missing',
]);

const missingLiveVideoConcatOrderGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); result.status !== 0; verifier failed with exit; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value); looksInlineOrOpaqueMediaEvidence(value); looksAbsoluteLocalPathEvidence(value); data:; blob:; about:; validateDownloadProbeHeaders(response); isVideoDownloadContentType(contentType); content-type; content-length; video/; application/octet-stream; isSha256Digest(value); [a-f0-9]{64}; invalid source segment hash; invalid output file hash; ffmpegCommandHashes; invalid ffmpeg command hash; validateClipWindows(sourceSegments); invalid clip window; raw.startsWith; mock/; mock\\; https:${raw}; recordUriSource; file_path;',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT;',
  },
]);
assert.equal(missingLiveVideoConcatOrderGateScan.ok, false);
assert.deepEqual(missingLiveVideoConcatOrderGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_media_evidence_gate_missing',
]);

const missingLiveVideoRootConcatOrderGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); result.status !== 0; verifier failed with exit; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value); looksInlineOrOpaqueMediaEvidence(value); looksAbsoluteLocalPathEvidence(value); data:; blob:; about:; validateDownloadProbeHeaders(response); isVideoDownloadContentType(contentType); content-type; content-length; video/; application/octet-stream; isSha256Digest(value); [a-f0-9]{64}; invalid source segment hash; invalid output file hash; ffmpegCommandHashes; invalid ffmpeg command hash; validateClipWindows(sourceSegments); invalid clip window; validateManifestConcatOrder(recordSegments, concatOrder); duplicate concat order index; invalid concat order index; raw.startsWith; mock/; mock\\; https:${raw}; recordUriSource; file_path;',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT;',
  },
]);
assert.equal(missingLiveVideoRootConcatOrderGateScan.ok, false);
assert.deepEqual(missingLiveVideoRootConcatOrderGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_media_evidence_gate_missing',
]);

const missingLiveVideoRootConcatOrderCoverageGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: 'validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); result.status !== 0; verifier failed with exit; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); looksLocalOrMockMediaEvidence(value); looksInlineOrOpaqueMediaEvidence(value); looksAbsoluteLocalPathEvidence(value); data:; blob:; about:; validateDownloadProbeHeaders(response); isVideoDownloadContentType(contentType); content-type; content-length; video/; application/octet-stream; isSha256Digest(value); [a-f0-9]{64}; invalid source segment hash; invalid output file hash; ffmpegCommandHashes; invalid ffmpeg command hash; validateClipWindows(sourceSegments); invalid clip window; validateManifestConcatOrder(recordSegments, concatOrder); normalizeConcatOrderEntry(entry); concatOrder.map; entry.index; duplicate concat order index; invalid concat order index; raw.startsWith; mock/; mock\\; https:${raw}; recordUriSource; file_path;',
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: 'payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT;',
  },
]);
assert.equal(missingLiveVideoRootConcatOrderCoverageGateScan.ok, false);
assert.deepEqual(missingLiveVideoRootConcatOrderCoverageGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_media_evidence_gate_missing',
]);

const completeProdSmokeTraceabilityCommand = '- Production smoke with real VIDEO URLs:\n  `node .scripts/alert-review-production-smoke.mjs --device-base-url=... --token=... --operator-user-id=... --device-alert-time=... --device-playback-allowed-camera-ids=... --device-playback-denied-camera-ids=... --video-alert-record-query-url=... --video-record-coverage-query-url=... --video-record-base-url=... --video-record-export-url=... --video-device-id=... --video-alert-time=... --video-record-drift-retention-hours=24 --video-manifest-verifier-script=.scripts/record-export-manifest-verifier.mjs --step-timeout-ms=900000 --player-workbench-url=... --player-review-row-text=... --player-expected-seek-time=... --player-expected-record-path-contains=... --player-expected-offset-seconds=... --player-coverage-expected-seek-time=... --player-coverage-expected-record-path-contains=... --player-coverage-expected-offset-seconds=0 --player-case-timeline-expected-seek-time=... --player-case-timeline-expected-record-path-contains=... --player-case-timeline-expected-offset-seconds=0 --evidence-output-file=artifacts/production-smoke.json`';

const missingProdSmokeTraceabilityGateScan = scanReleaseTraceabilityGate([
  {
    path: 'docs/requirements/alert-review-frigate-fr01-fr38-hardening-review.md',
    content: [
      '- `ProdSmoke`: `node .scripts/alert-review-production-smoke.mjs --video-manifest-verifier-script=.scripts/record-export-manifest-verifier.mjs`',
      '- Production smoke with real VIDEO URLs:',
      completeProdSmokeTraceabilityCommand
        .split('\n')[1]
        .replace('--video-manifest-verifier-script=.scripts/record-export-manifest-verifier.mjs ', ''),
    ].join('\n'),
  },
]);
assert.equal(missingProdSmokeTraceabilityGateScan.ok, false);
assert.deepEqual(missingProdSmokeTraceabilityGateScan.blockers.map((blocker) => blocker.reason), [
  'fr38_prod_smoke_manifest_verifier_command_missing',
]);

const missingProdSmokeStepTimeoutTraceabilityGateScan = scanReleaseTraceabilityGate([
  {
    path: 'docs/requirements/alert-review-frigate-fr01-fr38-hardening-review.md',
    content: completeProdSmokeTraceabilityCommand.replace('--step-timeout-ms=900000 ', ''),
  },
]);
assert.equal(missingProdSmokeStepTimeoutTraceabilityGateScan.ok, false);
assert.deepEqual(missingProdSmokeStepTimeoutTraceabilityGateScan.blockers.map((blocker) => blocker.reason), [
  'fr38_prod_smoke_step_timeout_command_missing',
]);

const missingProdSmokeRealDevicePlayerTraceabilityGateScan = scanReleaseTraceabilityGate([
  {
    path: 'docs/requirements/alert-review-frigate-fr01-fr38-hardening-review.md',
    content: completeProdSmokeTraceabilityCommand
      .replace('--device-base-url=... ', '')
      .replace('--player-expected-offset-seconds=... ', ''),
  },
]);
assert.equal(missingProdSmokeRealDevicePlayerTraceabilityGateScan.ok, false);
assert.deepEqual(missingProdSmokeRealDevicePlayerTraceabilityGateScan.blockers.map((blocker) => blocker.reason), [
  'fr38_prod_smoke_device_base_command_missing',
  'fr38_prod_smoke_detail_player_offset_command_missing',
]);

const completeProdSmokeTraceabilityGateScan = scanReleaseTraceabilityGate([
  {
    path: 'docs/requirements/alert-review-frigate-fr01-fr38-hardening-review.md',
    content: completeProdSmokeTraceabilityCommand,
  },
]);
assert.equal(completeProdSmokeTraceabilityGateScan.ok, true);

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

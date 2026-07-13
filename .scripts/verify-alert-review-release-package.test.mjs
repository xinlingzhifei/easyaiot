import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as releasePackageVerifier from './verify-alert-review-release-package.mjs';

const {
  evaluateStatus,
  releaseEntriesForTrackedPaths,
  scanLiveVideoEvidenceGate,
  scanMediaPermissionGate,
  scanRawMinioProxyGate,
  scanReleaseTraceabilityGate,
  scanVideoIntegrationConfigGate,
  scanWebTypecheckGate,
  scanTextQuality,
} = releasePackageVerifier;

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
M  DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260701__supervision_event_closure_baseline.sql
`);
assert.equal(stagedWorkbench.ok, true);
assert.deepEqual(stagedWorkbench.blockers, []);

const untrackedGate = evaluateStatus(`
?? .scripts/verify-alert-review-release-package.mjs
?? .scripts/alert-review-visible-copy-scan.mjs
?? .scripts/configure-nginx-stream-secret.mjs
`);
assert.equal(untrackedGate.ok, false);
assert.equal(untrackedGate.blockers[0].group, 'FR release gate tooling');
assert.equal(untrackedGate.blockers[1].group, 'FR release gate tooling');
assert.equal(untrackedGate.blockers[2].group, 'FR release gate tooling');
assert.equal(
  releasePackageVerifier.TRACKED_RELEASE_PATHS.includes(
    '.scripts/configure-nginx-stream-secret.test.mjs',
  ),
  true,
);

const productionMediaDeploymentArtifacts = [
  '.scripts/docker/docker-compose.yml',
  '.scripts/docker/env.example',
  '.scripts/docker/install_middleware_linux.sh',
  '.scripts/docker/upload_minio_data.sh',
  'AI/docker-compose.yaml',
  'VIDEO/test_minio_bucket_policy.py',
];
const untrackedProductionMediaDeployment = evaluateStatus(
  productionMediaDeploymentArtifacts.map((path) => `?? ${path}`).join('\n'),
);
assert.equal(untrackedProductionMediaDeployment.ok, false);
assert.deepEqual(
  untrackedProductionMediaDeployment.blockers.map((entry) => entry.group),
  [
    'FR production media deployment',
    'FR production media deployment',
    'FR production media deployment',
    'FR production media deployment',
    'Protected media raw proxy package',
    'VIDEO record evidence package',
  ],
);
for (const path of productionMediaDeploymentArtifacts) {
  assert.equal(
    releasePackageVerifier.TRACKED_RELEASE_PATHS.includes(path),
    true,
    `${path} must remain part of the formal FR release package`,
  );
}
assert.equal(
  evaluateStatus('?? WEB/install_linux.sh').blockers[0]?.group,
  'Protected media raw proxy package',
);
assert.equal(
  releasePackageVerifier.TRACKED_RELEASE_PATHS.includes('WEB/install_linux.sh'),
  true,
);

const untrackedSegmentDataReconcile = evaluateStatus(`
?? .scripts/alert-review-segment-data-reconcile.mjs
`);
assert.equal(untrackedSegmentDataReconcile.ok, false);
assert.equal(untrackedSegmentDataReconcile.blockers[0].reason, 'untracked');
assert.equal(untrackedSegmentDataReconcile.blockers[0].group, 'FR release gate tooling');

const unstagedSegmentDataReconcileTest = evaluateStatus(`
 M .scripts/alert-review-segment-data-reconcile.test.mjs
`);
assert.equal(unstagedSegmentDataReconcileTest.ok, false);
assert.equal(unstagedSegmentDataReconcileTest.blockers[0].reason, 'unstaged');
assert.equal(unstagedSegmentDataReconcileTest.blockers[0].group, 'FR release gate tooling');

assert.deepEqual(
  releasePackageVerifier.TRACKED_RELEASE_PATHS?.filter((path) => path.includes('alert-review-segment-data-reconcile')),
  [
    '.scripts/alert-review-segment-data-reconcile.mjs',
    '.scripts/alert-review-segment-data-reconcile.test.mjs',
  ],
);

const untrackedBaselineMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260701__supervision_event_closure_baseline.sql
`);
assert.equal(untrackedBaselineMigration.ok, false);
assert.equal(untrackedBaselineMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedVideoTenantMigration = evaluateStatus(`
?? VIDEO/migrations/V20260712__record_snapshot_tenant_scope.sql
`);
assert.equal(untrackedVideoTenantMigration.ok, false);
assert.equal(untrackedVideoTenantMigration.blockers[0].group, 'VIDEO record evidence package');
assert.ok(
  releasePackageVerifier.TRACKED_RELEASE_PATHS.includes(
    'VIDEO/migrations/V20260712__record_snapshot_tenant_scope.sql',
  ),
);

const videoP0TenantArtifacts = [
  'VIDEO/migrations/V20260713__alert_image_playback_tenant_scope.sql',
  'VIDEO/app/blueprints/playback.py',
  'VIDEO/app/services/alert_service.py',
  'VIDEO/app/services/library_matching_service.py',
  'VIDEO/test_alert_media_serialization.py',
  'VIDEO/test_alert_tenant_scope.py',
  'VIDEO/test_playback_media_authorization.py',
];
const untrackedVideoP0TenantArtifacts = evaluateStatus(
  videoP0TenantArtifacts.map((path) => `?? ${path}`).join('\n'),
);
assert.equal(untrackedVideoP0TenantArtifacts.ok, false);
assert.deepEqual(
  untrackedVideoP0TenantArtifacts.blockers.map((entry) => entry.group),
  videoP0TenantArtifacts.map(() => 'VIDEO record evidence package'),
);
for (const path of videoP0TenantArtifacts) {
  assert.equal(
    releasePackageVerifier.TRACKED_RELEASE_PATHS.includes(path),
    true,
    `${path} must remain part of the formal FR release package`,
  );
}

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
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260701__supervision_event_closure_baseline.sql',
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
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_9__alert_review_merge_index_same_camera.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_10__alert_review_deleted_smallint.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260709__alert_review_scheduler_activation.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260710__alert_review_export_queue.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260711__alert_review_media_manage_permission.sql',
  'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/dal/dataobject/supervision/SupervisionAlertReviewRuntimeOutboxDeliveryDO.java',
  'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/dal/pgsql/supervision/SupervisionAlertReviewRuntimeOutboxDeliveryMapper.java',
  'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/service/supervision/ReviewRuntimeOutboxNotifyDeliveryStore.java',
  'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/service/supervision/ReviewRuntimeOutboxNotifyDeliveryMapperStore.java',
  'DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/NotifyReviewRuntimeOutboxPublisherTest.java',
]);
assert.equal(trackedReleaseEntries.length, 42);
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
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260701__supervision_event_closure_baseline.sql',
      'DEVICE schema and migration',
    ],
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
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_9__alert_review_merge_index_same_camera.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_10__alert_review_deleted_smallint.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260709__alert_review_scheduler_activation.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260710__alert_review_export_queue.sql',
      'DEVICE schema and migration',
    ],
    [
      '  ',
      'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260711__alert_review_media_manage_permission.sql',
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

const untrackedMergeIndexSameCameraMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_9__alert_review_merge_index_same_camera.sql
`);
assert.equal(untrackedMergeIndexSameCameraMigration.ok, false);
assert.equal(untrackedMergeIndexSameCameraMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedDeletedSmallintMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_10__alert_review_deleted_smallint.sql
`);
assert.equal(untrackedDeletedSmallintMigration.ok, false);
assert.equal(untrackedDeletedSmallintMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedSchedulerActivationMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260709__alert_review_scheduler_activation.sql
`);
assert.equal(untrackedSchedulerActivationMigration.ok, false);
assert.equal(untrackedSchedulerActivationMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedExportQueueMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260710__alert_review_export_queue.sql
`);
assert.equal(untrackedExportQueueMigration.ok, false);
assert.equal(untrackedExportQueueMigration.blockers[0].group, 'DEVICE schema and migration');

const untrackedMediaManageMigration = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260711__alert_review_media_manage_permission.sql
`);
assert.equal(untrackedMediaManageMigration.ok, false);
assert.equal(untrackedMediaManageMigration.blockers[0].group, 'DEVICE schema and migration');

const semanticTriggerConfirmationMigrationPath =
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260712__alert_review_semantic_trigger_confirmation.sql';
const untrackedSemanticTriggerConfirmationMigration = evaluateStatus(`
?? ${semanticTriggerConfirmationMigrationPath}
`);
assert.equal(untrackedSemanticTriggerConfirmationMigration.ok, false);
assert.equal(
  untrackedSemanticTriggerConfirmationMigration.blockers[0].group,
  'DEVICE schema and migration',
);
assert.ok(
  releasePackageVerifier.TRACKED_RELEASE_PATHS?.includes(semanticTriggerConfirmationMigrationPath),
  'semantic trigger confirmation migration must be included in the release package',
);

const semanticIndexClaimMigrationPath =
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260713__alert_review_semantic_index_claim.sql';
const untrackedSemanticIndexClaimMigration = evaluateStatus(`
?? ${semanticIndexClaimMigrationPath}
`);
assert.equal(untrackedSemanticIndexClaimMigration.ok, false);
assert.equal(
  untrackedSemanticIndexClaimMigration.blockers[0].group,
  'DEVICE schema and migration',
);
assert.ok(
  releasePackageVerifier.TRACKED_RELEASE_PATHS?.includes(semanticIndexClaimMigrationPath),
  'semantic index claim migration must be included in the release package',
);

const untrackedVideoRuntimeArtifacts = evaluateStatus(`
 M VIDEO/.gitignore
?? VIDEO/apply_migrations.py
?? VIDEO/bootstrap_schema.py
?? VIDEO/prepare_database.py
?? VIDEO/schema_lock.py
?? VIDEO/run.py
?? VIDEO/models.py
?? VIDEO/app/blueprints/alert.py
?? VIDEO/app/blueprints/device_detection_region.py
?? VIDEO/app/services/device_detection_region_service.py
?? VIDEO/app/services/dvr_upload_service.py
?? VIDEO/app/services/media_kafka_service.py
?? VIDEO/app/services/record_cache_flush_event_service.py
?? VIDEO/app/services/seekable_playback_service.py
?? VIDEO/migrations/V20260711__device_detection_region_rule_fields.sql
?? VIDEO/test_apply_migrations.py
?? VIDEO/test_device_detection_region_persistence.py
?? VIDEO/test_record_export_minio_smoke.py
?? VIDEO/test_seekable_playback.py
`);
assert.equal(untrackedVideoRuntimeArtifacts.ok, false);
assert.deepEqual(
  untrackedVideoRuntimeArtifacts.blockers.map((entry) => entry.group),
  Array(19).fill('VIDEO record evidence package'),
);

const untrackedManifestSignerTest = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/ReviewEvidenceManifestSignerTest.java
`);
assert.equal(untrackedManifestSignerTest.ok, false);
assert.equal(untrackedManifestSignerTest.blockers[0].group, 'DEVICE review regression tests');

const untrackedWorkbenchRunner = evaluateStatus(`
?? WEB/scripts/alert-review-workbench-e2e-check.test.mjs
?? WEB/scripts/alert-review-playback-contract.test.mjs
?? WEB/src/utils/withInstall.ts
`);
assert.equal(untrackedWorkbenchRunner.ok, false);
assert.equal(untrackedWorkbenchRunner.blockers[0].group, 'WEB alert review workbench package');
assert.equal(untrackedWorkbenchRunner.blockers[1].group, 'WEB alert review workbench package');
assert.equal(untrackedWorkbenchRunner.blockers[2].group, 'WEB alert review workbench package');

const untrackedSecurityAndRealUiArtifacts = evaluateStatus(`
?? DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/controller/admin/auth/vo/MediaPermissionCheckReqVO.java
?? DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/AlertReviewDataSchemaValidatorTest.java
?? VIDEO/app/services/media_authorization_service.py
?? VIDEO/test_media_authorization.py
?? WEB/src/views/alert/index.vue
?? WEB/src/views/camera/components/DeviceRegionDrawer/index.vue
`);
assert.equal(untrackedSecurityAndRealUiArtifacts.ok, false);
assert.deepEqual(
  untrackedSecurityAndRealUiArtifacts.blockers.map((entry) => entry.group),
  [
    'DEVICE review backend',
    'DEVICE review regression tests',
    'VIDEO record evidence package',
    'VIDEO record evidence package',
    'WEB alert review workbench package',
    'WEB alert review workbench package',
  ],
);

const newlyHardenedMediaArtifacts = [
  'VIDEO/app/services/local_media_path_service.py',
  'VIDEO/enforce_private_media_buckets.py',
  'VIDEO/app/services/media_janitor_service.py',
  'VIDEO/app/services/media_resource_guard.py',
  'VIDEO/app/services/playback_disk_guard_service.py',
  'VIDEO/app/utils/minio_bucket_policy.py',
  'VIDEO/test_local_media_path_security.py',
  'VIDEO/test_minio_bucket_policy.py',
  'VIDEO/test_tenant_media_maintenance.py',
  'WEB/src/api/device/snap.ts',
  'WEB/src/views/camera/components/SnapSpace/SnapSpaceImageGallery.vue',
];
const untrackedHardenedMediaArtifacts = evaluateStatus(
  newlyHardenedMediaArtifacts.map((path) => `?? ${path}`).join('\n'),
);
assert.equal(untrackedHardenedMediaArtifacts.ok, false);
assert.deepEqual(
  untrackedHardenedMediaArtifacts.blockers.map((entry) => entry.group),
  [
    'VIDEO record evidence package',
    'VIDEO record evidence package',
    'VIDEO record evidence package',
    'VIDEO record evidence package',
    'VIDEO record evidence package',
    'VIDEO record evidence package',
    'VIDEO record evidence package',
    'VIDEO record evidence package',
    'VIDEO record evidence package',
    'WEB alert review workbench package',
    'WEB alert review workbench package',
  ],
);
for (const path of newlyHardenedMediaArtifacts) {
  assert.equal(
    releasePackageVerifier.TRACKED_RELEASE_PATHS.includes(path),
    true,
    `${path} must remain part of the formal FR release package`,
  );
}

const videoRuntimeHardeningArtifacts = [
  'VIDEO/app/services/algorithm_task_daemon.py',
  'VIDEO/app/services/post_process_launcher_service.py',
  'VIDEO/app/services/stream_forward_launcher_service.py',
  'VIDEO/app/utils/face_model_paths.py',
  'VIDEO/app/utils/plate_model_paths.py',
  'VIDEO/app/utils/video_env.py',
  'VIDEO/test_subprocess_environment.py',
  'VIDEO/tests/test_realtime_algorithm_context.py',
];
const untrackedVideoRuntimeHardening = evaluateStatus(
  videoRuntimeHardeningArtifacts.map((path) => `?? ${path}`).join('\n'),
);
assert.equal(untrackedVideoRuntimeHardening.ok, false);
assert.deepEqual(
  untrackedVideoRuntimeHardening.blockers.map((entry) => entry.group),
  videoRuntimeHardeningArtifacts.map(() => 'VIDEO record evidence package'),
);
for (const path of videoRuntimeHardeningArtifacts) {
  assert.equal(
    releasePackageVerifier.TRACKED_RELEASE_PATHS.includes(path),
    true,
    `${path} must remain part of the formal FR release package`,
  );
}

const protectedMediaProxyArtifacts = [
  'AI/app/blueprints/minio_proxy.py',
  'AI/tests/test_minio_proxy.py',
  'APP/conf/nginx.conf',
  'WEB/conf/nginx.conf',
  'WEB/conf/nginx.mini.conf',
  'VIDEO/app/services/space_folder_tree_service.py',
  'VIDEO/app/services/space_group_save_time_service.py',
  'VIDEO/test_archive_atomicity.py',
  'VIDEO/test_record_space_tenant_listing.py',
  'VIDEO/test_snap_media_authorization.py',
];
const untrackedProtectedMediaProxyArtifacts = evaluateStatus(
  protectedMediaProxyArtifacts.map((path) => `?? ${path}`).join('\n'),
);
assert.equal(untrackedProtectedMediaProxyArtifacts.ok, false);
assert.deepEqual(
  untrackedProtectedMediaProxyArtifacts.blockers.map((entry) => entry.group),
  [
    'Protected media raw proxy package',
    'Protected media raw proxy package',
    'Protected media raw proxy package',
    'Protected media raw proxy package',
    'Protected media raw proxy package',
    'VIDEO record evidence package',
    'VIDEO record evidence package',
    'VIDEO record evidence package',
    'VIDEO record evidence package',
    'VIDEO record evidence package',
  ],
);
for (const path of protectedMediaProxyArtifacts) {
  assert.equal(
    releasePackageVerifier.TRACKED_RELEASE_PATHS.includes(path),
    true,
    `${path} must remain part of the formal FR release package`,
  );
}

const protectedMediaBuckets = [
  'record-space',
  'snap-space',
  'camera-screenshots',
  'alert-images',
  'record-archive',
  'snap-archive',
  'review-evidence',
];
const completeRawMinioProxyContent = `
_PROTECTED_MEDIA_BUCKETS = frozenset({
${protectedMediaBuckets.map((bucket) => `    '${bucket}',`).join('\n')}
})
def download_bucket_object(bucket_name):
    normalized_bucket = bucket_name.strip().lower()
    if normalized_bucket in _PROTECTED_MEDIA_BUCKETS:
        return jsonify({'reason': 'protected_media_bucket'}), 403
    return _download_from_minio(normalized_bucket, object_name, temp_path)
`;
const nginxBucketProxyContent = `
set $stream_secret "";
include /etc/nginx/yfeieye-secrets/yfeieye-stream-secret*.conf;
location ^~ /api/v1/buckets {
    proxy_pass http://ai-host:5000;
}
location ~ ^/(ai|live)/ {
    secure_link $arg_st,$arg_e;
    secure_link_md5 "$arg_e$uri $stream_secret";
    if ($secure_link = "") { return 403; }
    if ($secure_link = "0") { return 410; }
}
location ^~ /rtp/ {
    secure_link $arg_st,$arg_e;
    secure_link_md5 "$arg_e$uri $stream_secret";
    if ($secure_link = "") { return 403; }
    if ($secure_link = "0") { return 410; }
}
`;
const completeRawMinioProxyGateScan = scanRawMinioProxyGate([
  { path: 'AI/app/blueprints/minio_proxy.py', content: completeRawMinioProxyContent },
  { path: 'APP/conf/nginx.conf', content: nginxBucketProxyContent },
  { path: 'WEB/conf/nginx.conf', content: nginxBucketProxyContent },
  { path: 'WEB/conf/nginx.mini.conf', content: nginxBucketProxyContent },
  {
    path: 'WEB/install_linux.sh',
    content: 'node ../.scripts/configure-nginx-stream-secret.mjs --env-file=../VIDEO/.env.docker --skip-nginx-check',
  },
]);
assert.equal(completeRawMinioProxyGateScan.ok, true);

const missingStreamSecretInstallHookScan = scanRawMinioProxyGate([{
  path: 'WEB/install_linux.sh',
  content: 'docker compose up -d',
}]);
assert.equal(missingStreamSecretInstallHookScan.ok, false);
assert.deepEqual(
  missingStreamSecretInstallHookScan.blockers.map((blocker) => blocker.reason),
  ['stream_ticket_secret_install_hook_missing'],
);

const webInstallerSource = readFileSync('WEB/install_linux.sh', 'utf8');
const webUpdateFunction = webInstallerSource.match(/update_service\(\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(
  webUpdateFunction,
  /ensure_nginx_conf_for_profile/,
  'WEB update must generate and validate the stream-ticket secret before Compose starts',
);

const incompleteRawMinioDenylistScan = scanRawMinioProxyGate([{
  path: 'AI/app/blueprints/minio_proxy.py',
  content: completeRawMinioProxyContent.replace("    'review-evidence',\n", ''),
}]);
assert.equal(incompleteRawMinioDenylistScan.ok, false);
assert.deepEqual(incompleteRawMinioDenylistScan.blockers.map((blocker) => blocker.reason), [
  'raw_minio_protected_bucket_denylist_missing',
]);

const publicNginxBucketProxyScan = scanRawMinioProxyGate([
  { path: 'APP/conf/nginx.conf', content: nginxBucketProxyContent.replace('{', '{\n    allow all;') },
  { path: 'WEB/conf/nginx.conf', content: nginxBucketProxyContent.replace('{', '{\n    allow all;') },
  { path: 'WEB/conf/nginx.mini.conf', content: nginxBucketProxyContent.replace('{', '{\n    allow all;') },
]);
assert.equal(publicNginxBucketProxyScan.ok, false);
assert.deepEqual(publicNginxBucketProxyScan.blockers.map((blocker) => blocker.reason), [
  'raw_minio_nginx_bucket_allow_all',
  'raw_minio_nginx_bucket_allow_all',
  'raw_minio_nginx_bucket_allow_all',
]);

const insecureStreamTicketNginxContent = `
location ^~ /api/v1/buckets {
    proxy_pass http://ai-host:5000;
}
set $stream_secret "hardcoded-secret";
location ~ ^/(ai|live)/ {
    secure_link $arg_st,$arg_e;
    secure_link_md5 "$arg_e$uri $stream_secret";
    # if ($secure_link = "") { return 403; }
    # if ($secure_link = "0") { return 410; }
}
location ^~ /rtp/ {
    secure_link $arg_st,$arg_e;
    secure_link_md5 "$arg_e$uri $stream_secret";
}
`;
const insecureStreamTicketScan = scanRawMinioProxyGate([
  { path: 'APP/conf/nginx.conf', content: insecureStreamTicketNginxContent },
]);
assert.equal(insecureStreamTicketScan.ok, false);
assert.deepEqual(insecureStreamTicketScan.blockers.map((blocker) => blocker.reason), [
  'stream_ticket_hardcoded_secret',
  'stream_ticket_external_secret_missing',
  'stream_ticket_enforcement_missing',
]);

const missingStreamSecretMountScan = scanRawMinioProxyGate([
  { path: 'APP/conf/nginx.conf', content: nginxBucketProxyContent },
  { path: 'WEB/conf/nginx.conf', content: nginxBucketProxyContent },
  { path: 'WEB/conf/nginx.mini.conf', content: nginxBucketProxyContent },
  { path: 'APP/docker-compose.yaml', content: 'volumes:\n  - ./conf/nginx.conf:/etc/nginx/nginx.conf:ro\n' },
  { path: 'WEB/docker-compose.yaml', content: 'volumes:\n  - ./conf/nginx.conf:/etc/nginx/nginx.conf:ro\n' },
]);
assert.equal(missingStreamSecretMountScan.ok, false);
assert.deepEqual(missingStreamSecretMountScan.blockers.map((blocker) => blocker.reason), [
  'stream_ticket_secret_mount_missing',
  'stream_ticket_secret_mount_missing',
]);

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
const completeMediaManagePermissionSeedContent = 'system:supervision-alert-review:media:manage';
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
    path: 'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260711__alert_review_media_manage_permission.sql',
    content: completeMediaManagePermissionSeedContent,
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
    path: 'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260711__alert_review_media_manage_permission.sql',
    content: completeMediaManagePermissionSeedContent,
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

const missingManageMediaPermissionGateScan = scanMediaPermissionGate([
  {
    path: 'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260706__alert_review_media_permissions.sql',
    content: completeMediaPermissionSeedContent,
  },
  {
    path: 'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260711__alert_review_media_manage_permission.sql',
    content: '',
  },
  {
    path: 'DEVICE/iot-system/iot-system-biz/src/main/resources/application.yaml',
    content: completeMediaPermissionConfigContent,
  },
]);
assert.equal(missingManageMediaPermissionGateScan.ok, false);
assert.deepEqual(missingManageMediaPermissionGateScan.blockers.map((blocker) => blocker.reason), [
  'media_permission_manage_seed_missing',
]);

const missingSnapshotMediaPermissionConfigGateScan = scanMediaPermissionGate([
  {
    path: 'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260706__alert_review_media_permissions.sql',
    content: completeMediaPermissionSeedContent,
  },
  {
    path: 'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260711__alert_review_media_manage_permission.sql',
    content: completeMediaManagePermissionSeedContent,
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

const completeVideoIntegrationConfig = `
YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL=\${YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL:-http://video:6000/video/alert/record/query}
YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL=\${YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL:-http://video:6000/video/record/availability}
YFEIEYE_VIDEO_RECORD_BASE_URL=\${YFEIEYE_VIDEO_RECORD_BASE_URL:-http://video:6000/video/record}
YFEIEYE_VIDEO_RECORD_EXPORT_URL=\${YFEIEYE_VIDEO_RECORD_EXPORT_URL:-http://video:6000/video/record/export}
YFEIEYE_MEDIA_SERVICE_HMAC_SECRET=\${YFEIEYE_MEDIA_SERVICE_HMAC_SECRET:-}
YFEIEYE_REVIEW_RUNTIME_OUTBOX_NOTIFY_ENABLED=\${YFEIEYE_REVIEW_RUNTIME_OUTBOX_NOTIFY_ENABLED:-false}
YFEIEYE_REVIEW_RUNTIME_OUTBOX_NOTIFY_ADMIN_USER_IDS=\${YFEIEYE_REVIEW_RUNTIME_OUTBOX_NOTIFY_ADMIN_USER_IDS:-}
YFEIEYE_REVIEW_RUNTIME_ALERT_TEMPLATE_CODE=\${YFEIEYE_REVIEW_RUNTIME_ALERT_TEMPLATE_CODE:-YFEIEYE_REVIEW_RUNTIME_ALERT}
YFEIEYE_REVIEW_OPERATIONS_REPORT_TEMPLATE_CODE=\${YFEIEYE_REVIEW_OPERATIONS_REPORT_TEMPLATE_CODE:-YFEIEYE_REVIEW_OPERATIONS_REPORT}
`;
const videoIntegrationConfigScan = scanVideoIntegrationConfigGate([{
  path: 'DEVICE/docker-compose.yml',
  content: completeVideoIntegrationConfig,
}]);
assert.equal(videoIntegrationConfigScan.ok, true);

const completeVideoResourceControlConfig = [
  'YFEIEYE_FFMPEG_MAX_CONCURRENT=${YFEIEYE_FFMPEG_MAX_CONCURRENT:-1}',
  'YFEIEYE_FFMPEG_SLOT_WAIT_SECONDS=${YFEIEYE_FFMPEG_SLOT_WAIT_SECONDS:-30}',
  'YFEIEYE_FFMPEG_THREADS=${YFEIEYE_FFMPEG_THREADS:-1}',
  'YFEIEYE_FFMPEG_FILTER_THREADS=${YFEIEYE_FFMPEG_FILTER_THREADS:-1}',
  'YFEIEYE_FFMPEG_TIMEOUT_BASE_SECONDS=${YFEIEYE_FFMPEG_TIMEOUT_BASE_SECONDS:-30}',
  'YFEIEYE_FFMPEG_TIMEOUT_PER_MEDIA_SECOND=${YFEIEYE_FFMPEG_TIMEOUT_PER_MEDIA_SECOND:-4}',
  'YFEIEYE_FFMPEG_TIMEOUT_MAX_SECONDS=${YFEIEYE_FFMPEG_TIMEOUT_MAX_SECONDS:-600}',
  'YFEIEYE_MEDIA_DISK_MIN_FREE_BYTES=${YFEIEYE_MEDIA_DISK_MIN_FREE_BYTES:-2147483648}',
  'YFEIEYE_RECORD_EXPORT_STORE_MAX_BYTES=${YFEIEYE_RECORD_EXPORT_STORE_MAX_BYTES:-2147483648}',
  'YFEIEYE_RECORD_EXPORT_TEMP_DIR=/data/yfeieye-record-exports/tmp',
  'YFEIEYE_RECORD_EXPORT_TEMP_MAX_BYTES=${YFEIEYE_RECORD_EXPORT_TEMP_MAX_BYTES:-1073741824}',
  'YFEIEYE_RECORD_EXPORT_ORPHAN_TTL_SECONDS=${YFEIEYE_RECORD_EXPORT_ORPHAN_TTL_SECONDS:-3600}',
  'YFEIEYE_SEEKABLE_PLAYBACK_MAX_OUTPUT_BYTES=${YFEIEYE_SEEKABLE_PLAYBACK_MAX_OUTPUT_BYTES:-1073741824}',
].join('; ');

const missingVideoResourceControlScan = scanVideoIntegrationConfigGate([{
  path: 'VIDEO/docker-compose.yaml',
  content: [
    'python /app/prepare_database.py',
    'python /app/apply_migrations.py --verify-only',
    'exec python /app/run.py',
    'YFEIEYE_MEDIA_SERVICE_MAX_SKEW_SECONDS=${YFEIEYE_MEDIA_SERVICE_MAX_SKEW_SECONDS:-300}',
  ].join('; '),
}]);
assert.equal(missingVideoResourceControlScan.ok, false);
assert.deepEqual(missingVideoResourceControlScan.blockers.map((blocker) => blocker.reason), [
  'video_resource_control_compose_wiring_missing',
]);

const missingPlaybackTicketWindowScan = scanVideoIntegrationConfigGate([{
  path: 'VIDEO/docker-compose.yaml',
  content: [
    'python /app/prepare_database.py',
    'python /app/apply_migrations.py --verify-only',
    'exec python /app/run.py',
    'YFEIEYE_MEDIA_SERVICE_HMAC_SECRET=${YFEIEYE_MEDIA_SERVICE_HMAC_SECRET:-}',
    completeVideoResourceControlConfig,
  ].join('; '),
}]);
assert.equal(missingPlaybackTicketWindowScan.ok, false);
assert.deepEqual(missingPlaybackTicketWindowScan.blockers.map((blocker) => blocker.reason), [
  'video_integration_playback_ticket_window_missing',
]);

const missingVideoMigrationEntrypointScan = scanVideoIntegrationConfigGate([{
  path: 'VIDEO/docker-compose.yaml',
  content: [
    'YFEIEYE_MEDIA_SERVICE_MAX_SKEW_SECONDS=${YFEIEYE_MEDIA_SERVICE_MAX_SKEW_SECONDS:-300}',
    completeVideoResourceControlConfig,
  ].join('; '),
}]);
assert.equal(missingVideoMigrationEntrypointScan.ok, false);
assert.deepEqual(missingVideoMigrationEntrypointScan.blockers.map((blocker) => blocker.reason), [
  'video_production_migration_entrypoint_missing',
]);

const incompleteVideoMigrationRunnerScan = scanVideoIntegrationConfigGate([{
  path: 'VIDEO/apply_migrations.py',
  content: 'MIGRATION_FILES = []',
}]);
assert.equal(incompleteVideoMigrationRunnerScan.ok, false);
assert.deepEqual(incompleteVideoMigrationRunnerScan.blockers.map((blocker) => blocker.reason), [
  'video_production_migration_runner_incomplete',
]);

const unboundedVideoSchemaLockScan = scanVideoIntegrationConfigGate([{
  path: 'VIDEO/schema_lock.py',
  content: 'SELECT pg_advisory_lock(1)',
}]);
assert.equal(unboundedVideoSchemaLockScan.ok, false);
assert.deepEqual(unboundedVideoSchemaLockScan.blockers.map((blocker) => blocker.reason), [
  'video_schema_lock_not_bounded',
]);

const insecureVideoSecretOverrideScan = scanVideoIntegrationConfigGate([{
  path: 'VIDEO/docker-compose.yaml',
  content: [
    'python /app/prepare_database.py',
    'python /app/apply_migrations.py --verify-only',
    'exec python /app/run.py',
    'YFEIEYE_MEDIA_SERVICE_MAX_SKEW_SECONDS=${YFEIEYE_MEDIA_SERVICE_MAX_SKEW_SECONDS:-300}',
    'YFEIEYE_RECORD_EXPORT_HMAC_KEYS=${YFEIEYE_RECORD_EXPORT_HMAC_KEYS:-}',
    completeVideoResourceControlConfig,
  ].join('; '),
}]);
assert.equal(insecureVideoSecretOverrideScan.ok, false);
assert.deepEqual(insecureVideoSecretOverrideScan.blockers.map((blocker) => blocker.reason), [
  'video_production_secret_env_file_overridden',
]);

const incompleteVideoSecurityEnvContractScan = scanVideoIntegrationConfigGate([{
  path: 'VIDEO/env.example',
  content: 'YFEIEYE_MEDIA_AUTHORIZATION_URL=http://device',
}]);
assert.equal(incompleteVideoSecurityEnvContractScan.ok, false);
assert.deepEqual(incompleteVideoSecurityEnvContractScan.blockers.map((blocker) => blocker.reason), [
  'video_production_security_env_contract_missing',
]);

const aliasedVideoIntegrationConfigScan = scanVideoIntegrationConfigGate([{
  path: 'DEVICE/docker-compose.yml',
  content: completeVideoIntegrationConfig.replace(
    '/video/alert/record/query',
    '/video/record/availability',
  ),
}]);
assert.equal(aliasedVideoIntegrationConfigScan.ok, false);
assert.deepEqual(aliasedVideoIntegrationConfigScan.blockers.map((blocker) => blocker.reason), [
  'video_integration_alert_query_default_invalid',
  'video_integration_alert_coverage_defaults_aliased',
]);

const completeLiveVideoSmokeContent = 'requiredOptionErrors; sameReleaseEndpoint; record coverage URL must not equal alert record query URL; selectPlayableSegment; describeNonPlayableSegments; non_exportable_reason; nonExportableReason; exportable=false; record coverage query returned no playable/exportable record segment; validateCoverageClassification; STANDARD_COVERAGE_CLASSIFICATIONS; continuous; motion; alert; detection; normalizeCoverageClassification; normalized === \'all\'; normalized === \'record\'; normalized === \'recording\'; return \'continuous\'; coverageSummary; retainMode; coverageSource; record coverage query missing retain mode or source classification evidence; record coverage query returned non-standard retain mode or source classification; validateStorageDriftReport; REQUIRED_STORAGE_DRIFT_REASON_KEYS; storageDriftReasonKeys; standardReasonKeys; missing standard reason evidence; file_missing; retention_expired; disk_full; cache_flush_failed; validateManifestStorageLifecycle; validateManifestSignature(manifest); isHmacSha256SignatureValue(value); signature value is not canonical hmac-sha256; runManifestVerifierIfConfigured(); manifestSignature; manifestVerification; manifestVerifierScript; runManifestVerifierScript(scriptPath, manifest); spawnSync(process.execPath; timeout: timeoutMs; ETIMEDOUT; timed out after; result.status !== 0; verifier failed with exit; missing --manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT; hmac-sha256; signatureVersion; keyId; assertReleaseMediaEvidence(options, "record URI", value); assertReleaseSegmentMediaEvidence(options, segment); assertReleaseMediaEvidence(options, "download URL", value); assertReleaseMediaEvidence(options, "manifest URL", value); assertReleaseMediaEvidence(options, "export package storage reference", objectKey); looksLocalOrMockMediaEvidence(value); looksInlineOrOpaqueMediaEvidence(value); looksAbsoluteLocalPathEvidence(value); data:; blob:; about:; validateDownloadProbeHeaders(response); isVideoDownloadContentType(contentType); content-type; content-length; video/; application/octet-stream; isSha256Digest(value); [a-f0-9]{64}; invalid source segment hash; invalid output file hash; ffmpegCommandHashes; invalid ffmpeg command hash; validateClipWindows(sourceSegments); invalid clip window; validateManifestConcatOrder(recordSegments, concatOrder); normalizeConcatOrderEntry(entry); validateRootConcatOrderCoverage(segmentOrderEntries, orderEntries, recordSegments.length); concatOrder.map; entry.index; duplicate concat order index; invalid concat order index; references missing segment index; omits segment index; does not match segment count; raw.startsWith; mock/; mock\\; https:${raw}; recordUriSource; file_path;';
const completeRecordVideoServiceContent = '_normalize_gap_reason; _normalize_gap_reason_token; isalnum; normalized.strip(\'_\'); \'file_expired\': \'retention_expired\'; \'retention_expired\': \'retention\'; \'video_url_not_configured\': \'configuration\'; \'record_space_not_found\': \'configuration\'; \'file_missing\': \'filesystem\'; \'probe_failed\': \'probe\'; \'permission_denied\': \'permission\'; \'disk_full\': \'storage\'; \'cache_flush_failed\': \'cache\';';
const completeProductionSmokeContent = 'requiredOptionErrors; liveVideoEvidenceError; liveDeviceEvidenceError; livePlayerEvidenceError; buildSmokeSteps; W4:visible-copy; alert-review-visible-copy-scan.mjs; visible-copy files for replacement characters; playerSmokeStep; --assert-native-current-time; Number.isFinite(player.nativeCurrentTime); missing native currentTime evidence; W2:typecheck; --pm-on-fail=ignore; pnpm_version_guard; typecheckRetry; REQUIRED_STORAGE_DRIFT_REASON_KEYS; payload.coverageSummary; summary.coverageSummary = buildCoverageSummary(payload.coverageSummary); buildCoverageSummary(payload.coverageSummary); copyTextIfPresent(coverage, source, \'retainMode\'); copyTextIfPresent(coverage, source, \'coverageSource\'); summary.coverageSummary?.retainMode; summary.coverageSummary?.coverageSource; missing coverage retain/source evidence; payload.storageDriftSummary; summary.storageDriftSummary = buildStorageDriftSummary(payload.storageDriftSummary); copyBooleanIfPresent(storageDriftSummary, source, \'healthy\'); copyNumberIfPresent(storageDriftSummary, source, \'recordCount\'); copyNumberIfPresent(storageDriftSummary, source, \'issueCount\'); issueReasons; standardReasonKeys; summary.storageDriftSummary?.standardReasonKeys; missing standard storage drift reason evidence; file_missing; retention_expired; disk_full; cache_flush_failed; payload.exportResult; buildExportResultSummary(payload.exportResult); copyTextIfPresent(exportResult, source, \'exportId\'); copySanitizedUrlIfPresent(exportResult, source, \'downloadUrl\'); copySanitizedUrlIfPresent(exportResult, source, \'manifestUrl\'); payload.manifestSignature; summary.manifestSignature = buildManifestSignatureSummary(payload.manifestSignature); copyTextIfPresent(manifestSignature, source, \'algorithm\'); copyTextIfPresent(manifestSignature, source, \'keyId\'); copyTextIfPresent(manifestSignature, source, \'signatureVersion\'); payload.manifestStorageLifecycle; buildManifestStorageLifecycleSummary(payload.manifestStorageLifecycle); copyTextIfPresent(manifestStorageLifecycle, source, \'storageType\'); copyTextIfPresent(manifestStorageLifecycle, source, \'status\'); copyTextIfPresent(manifestStorageLifecycle, source, \'expiresAt\'); copyTextIfPresent(manifestStorageLifecycle, source, \'exportPackageObjectKey\'); summary.manifestStorageLifecycle?.status; missing persisted manifest storage lifecycle evidence; payload.manifestVerification; buildManifestVerificationSummary(payload.manifestVerification); copyBooleanIfPresent(manifestVerification, source, \'valid\'); copyBooleanIfPresent(manifestVerification, source, \'signatureValid\'); copyBooleanIfPresent(manifestVerification, source, \'signatureKeyAvailable\'); copyTextIfPresent(manifestVerification, source, \'keyId\'); copyTextIfPresent(manifestVerification, source, \'signatureVersion\'); violations; summary.manifestVerification?.valid; summary.manifestVerification.signatureValid; summary.manifestVerification.signatureKeyAvailable; missing valid manifest verifier evidence; missing HMAC manifest verifier signature evidence; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT; evidenceOutputFile; missing --evidence-output-file; YFEIEYE_PRODUCTION_SMOKE_EVIDENCE_FILE; stepTimeoutMs; --step-timeout-ms; YFEIEYE_PRODUCTION_SMOKE_STEP_TIMEOUT_MS; timeout: step.timeoutMs; summary.timeout; timed out after; --timeout-ms=${options.stepTimeoutMs}; childSmokeSummary; buildPlaybackAccessSummary(payload.playback); copyTextIfPresent(playback, source, \'grantedDecision\'); copyTextIfPresent(playback, source, \'deniedDecision\'); deniedReasons; copySanitizedUrlIfPresent(player, payload, \'recordPath\'); stripUrlSecrets; evidence_download_audited; auditChain; firstAuditScalar; firstAuditIdList; normalizeAuditScalar; eventIds; reviewItemIds; export_downloaded; missing auditChain exportJobNo evidence; liveDevicePlaybackEvidenceError; summary.playback; grantedDecision; deniedDecision; camera_not_allowed; missing playback URL allow/deny decision evidence; missing playback URL deny reason evidence; liveDeviceRuleEvidenceError; summary.ruleEvidence; buildRuleEvidenceSummary(payload); copyTextIfPresent(ruleEvidence, source, \'ruleCode\'); copyTextIfPresent(ruleEvidence, source, \'cameraId\'); copyTextIfPresent(ruleEvidence, source, \'zoneCode\'); copyTextIfPresent(ruleEvidence, source, \'objectLabel\'); copyNumberIfPresent(ruleEvidence, source, \'inertiaFrames\'); copyNumberIfPresent(ruleEvidence, source, \'loiteringSeconds\'); inertiaFrames; loiteringSeconds; missing rule inertia/loitering evidence; missing rule inertiaFrames=3 evidence; missing rule loiteringSeconds=20 evidence;';
const completeLiveVideoTokenContent = `${completeLiveVideoSmokeContent} parseArgs; token: env.YFEIEYE_VIDEO_SMOKE_TOKEN; arg.startsWith('--token='); !options.allowLocalEndpoints && !hasText(options.token); missing --token or YFEIEYE_VIDEO_SMOKE_TOKEN; runSmoke; withBearerAuthorization; const fetchImpl = withBearerAuthorization(rawFetchImpl, options.token);`;
const completeProductionSmokeTokenContent = `${completeProductionSmokeContent} formatStepCommand; --token=\${options.token}; maskSensitiveArg; value.startsWith('--token='); return '--token=***';`;
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
  {
    path: 'VIDEO/app/services/record_video_service.py',
    content: completeRecordVideoServiceContent,
  },
]);
assert.equal(liveVideoEvidenceGateScan.ok, true);

const liveVideoTokenGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoTokenContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeTokenContent,
  },
]);
assert.equal(liveVideoTokenGateScan.ok, true);

const missingLiveVideoReleaseTokenGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoTokenContent
      .replace('!options.allowLocalEndpoints && !hasText(options.token); ', '')
      .replace('missing --token or YFEIEYE_VIDEO_SMOKE_TOKEN; ', ''),
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeTokenContent,
  },
]);
assert.equal(missingLiveVideoReleaseTokenGateScan.ok, false);
assert.deepEqual(missingLiveVideoReleaseTokenGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_release_token_required_missing',
]);

const missingLiveVideoBearerWrapperGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoTokenContent.replace(
      'const fetchImpl = withBearerAuthorization(rawFetchImpl, options.token);',
      '',
    ),
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeTokenContent,
  },
]);
assert.equal(missingLiveVideoBearerWrapperGateScan.ok, false);
assert.deepEqual(missingLiveVideoBearerWrapperGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_bearer_wrapper_missing',
]);

const missingProductionSmokeLiveVideoTokenGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoTokenContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeTokenContent.replace('--token=${options.token}; ', ''),
  },
]);
assert.equal(missingProductionSmokeLiveVideoTokenGateScan.ok, false);
assert.deepEqual(missingProductionSmokeLiveVideoTokenGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_live_video_token_wiring_missing',
]);

const missingProductionSmokeTokenMaskGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoTokenContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeTokenContent
      .replace('maskSensitiveArg; ', '')
      .replace("value.startsWith('--token='); ", '')
      .replace("return '--token=***'; ", ''),
  },
]);
assert.equal(missingProductionSmokeTokenMaskGateScan.ok, false);
assert.deepEqual(missingProductionSmokeTokenMaskGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_token_log_mask_missing',
]);

const missingVideoRecordGapReasonCatalogScan = scanLiveVideoEvidenceGate([
  {
    path: 'VIDEO/app/services/record_video_service.py',
    content: completeRecordVideoServiceContent
      .replace("'file_expired': 'retention_expired'; ", '')
      .replace("'video_url_not_configured': 'configuration'; ", '')
      .replace("'file_missing': 'filesystem'; ", '')
      .replace("'probe_failed': 'probe'; ", '')
      .replace("'disk_full': 'storage'; ", '')
      .replace("'cache_flush_failed': 'cache'; ", ''),
  },
]);
assert.equal(missingVideoRecordGapReasonCatalogScan.ok, false);
assert.deepEqual(missingVideoRecordGapReasonCatalogScan.blockers.map((blocker) => blocker.reason), [
  'video_record_gap_reason_catalog_missing',
]);

const missingVideoRecordGapReasonTokenNormalizerScan = scanLiveVideoEvidenceGate([
  {
    path: 'VIDEO/app/services/record_video_service.py',
    content: completeRecordVideoServiceContent
      .replace('_normalize_gap_reason_token; ', '')
      .replace('isalnum; ', '')
      .replace("normalized.strip('_'); ", ''),
  },
]);
assert.equal(missingVideoRecordGapReasonTokenNormalizerScan.ok, false);
assert.deepEqual(missingVideoRecordGapReasonTokenNormalizerScan.blockers.map((blocker) => blocker.reason), [
  'video_record_gap_reason_catalog_missing',
]);

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

const missingProductionSmokeStorageDriftSummaryWhitelistGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('buildStorageDriftSummary(payload.storageDriftSummary); ', '')
      .replace('copyBooleanIfPresent(storageDriftSummary, source, \'healthy\'); ', '')
      .replace('copyNumberIfPresent(storageDriftSummary, source, \'recordCount\'); ', '')
      .replace('copyNumberIfPresent(storageDriftSummary, source, \'issueCount\'); ', '')
      .replace('issueReasons; ', '')
      .replace('standardReasonKeys; ', ''),
  },
]);
assert.equal(missingProductionSmokeStorageDriftSummaryWhitelistGateScan.ok, false);
assert.deepEqual(missingProductionSmokeStorageDriftSummaryWhitelistGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_storage_drift_summary_whitelist_missing',
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

const missingProductionSmokePlayerRecordPathSanitizerGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('copySanitizedUrlIfPresent(player, payload, \'recordPath\'); ', ''),
  },
]);
assert.equal(missingProductionSmokePlayerRecordPathSanitizerGateScan.ok, false);
assert.deepEqual(missingProductionSmokePlayerRecordPathSanitizerGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_player_record_path_sanitizer_missing',
]);

const missingProductionSmokeExportResultSanitizerGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('buildExportResultSummary(payload.exportResult); ', '')
      .replace('copySanitizedUrlIfPresent(exportResult, source, \'downloadUrl\'); ', '')
      .replace('copySanitizedUrlIfPresent(exportResult, source, \'manifestUrl\'); ', ''),
  },
]);
assert.equal(missingProductionSmokeExportResultSanitizerGateScan.ok, false);
assert.deepEqual(missingProductionSmokeExportResultSanitizerGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_export_result_sanitizer_missing',
]);

const missingProductionSmokeExportResultWhitelistGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('copyTextIfPresent(exportResult, source, \'exportId\'); ', ''),
  },
]);
assert.equal(missingProductionSmokeExportResultWhitelistGateScan.ok, false);
assert.deepEqual(missingProductionSmokeExportResultWhitelistGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_export_result_whitelist_missing',
]);

const rawSpreadProductionSmokeExportResultGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: `${completeProductionSmokeContent} const exportResult = { ...source };`,
  },
]);
assert.equal(rawSpreadProductionSmokeExportResultGateScan.ok, false);
assert.deepEqual(rawSpreadProductionSmokeExportResultGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_export_result_raw_spread_present',
]);

const missingProductionSmokeManifestVerificationWhitelistGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('buildManifestVerificationSummary(payload.manifestVerification); ', '')
      .replace('copyBooleanIfPresent(manifestVerification, source, \'valid\'); ', '')
      .replace('copyBooleanIfPresent(manifestVerification, source, \'signatureValid\'); ', '')
      .replace('copyBooleanIfPresent(manifestVerification, source, \'signatureKeyAvailable\'); ', '')
      .replace('copyTextIfPresent(manifestVerification, source, \'keyId\'); ', '')
      .replace('copyTextIfPresent(manifestVerification, source, \'signatureVersion\'); ', '')
      .replace('violations; ', ''),
  },
]);
assert.equal(missingProductionSmokeManifestVerificationWhitelistGateScan.ok, false);
assert.deepEqual(missingProductionSmokeManifestVerificationWhitelistGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_manifest_verification_whitelist_missing',
]);

const missingProductionSmokeManifestSignatureWhitelistGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('buildManifestSignatureSummary(payload.manifestSignature); ', '')
      .replace('copyTextIfPresent(manifestSignature, source, \'algorithm\'); ', '')
      .replace('copyTextIfPresent(manifestSignature, source, \'keyId\'); ', '')
      .replace('copyTextIfPresent(manifestSignature, source, \'signatureVersion\'); ', ''),
  },
]);
assert.equal(missingProductionSmokeManifestSignatureWhitelistGateScan.ok, false);
assert.deepEqual(missingProductionSmokeManifestSignatureWhitelistGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_manifest_signature_whitelist_missing',
]);

const missingProductionSmokeManifestStorageLifecycleWhitelistGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('buildManifestStorageLifecycleSummary(payload.manifestStorageLifecycle); ', '')
      .replace('copyTextIfPresent(manifestStorageLifecycle, source, \'storageType\'); ', '')
      .replace('copyTextIfPresent(manifestStorageLifecycle, source, \'status\'); ', '')
      .replace('copyTextIfPresent(manifestStorageLifecycle, source, \'expiresAt\'); ', '')
      .replace('copyTextIfPresent(manifestStorageLifecycle, source, \'exportPackageObjectKey\'); ', ''),
  },
]);
assert.equal(missingProductionSmokeManifestStorageLifecycleWhitelistGateScan.ok, false);
assert.deepEqual(missingProductionSmokeManifestStorageLifecycleWhitelistGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_manifest_storage_lifecycle_whitelist_missing',
]);

const missingProductionSmokePlaybackSummaryWhitelistGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('buildPlaybackAccessSummary(payload.playback); ', '')
      .replace('copyTextIfPresent(playback, source, \'grantedDecision\'); ', '')
      .replace('copyTextIfPresent(playback, source, \'deniedDecision\'); ', '')
      .replace('deniedReasons; ', ''),
  },
]);
assert.equal(missingProductionSmokePlaybackSummaryWhitelistGateScan.ok, false);
assert.deepEqual(missingProductionSmokePlaybackSummaryWhitelistGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_playback_summary_whitelist_missing',
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

const missingProductionSmokeVisibleCopyGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('W4:visible-copy; ', '')
      .replace('alert-review-visible-copy-scan.mjs; ', '')
      .replace('visible-copy files for replacement characters; ', ''),
  },
]);
assert.equal(missingProductionSmokeVisibleCopyGateScan.ok, false);
assert.deepEqual(missingProductionSmokeVisibleCopyGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_visible_copy_preflight_missing',
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

const missingLiveVideoCoverageUrlRuntimeAliasGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent
      .replace('sameReleaseEndpoint; ', '')
      .replace('record coverage URL must not equal alert record query URL; ', ''),
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent,
  },
]);
assert.equal(missingLiveVideoCoverageUrlRuntimeAliasGateScan.ok, false);
assert.deepEqual(missingLiveVideoCoverageUrlRuntimeAliasGateScan.blockers.map((blocker) => blocker.reason), [
  'live_video_coverage_url_runtime_alias_guard_missing',
]);

const missingLiveVideoNonExportableReasonSummaryScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent
      .replaceAll('describeNonPlayableSegments', '')
      .replaceAll('non_exportable_reason', ''),
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent,
  },
]);
assert.equal(missingLiveVideoNonExportableReasonSummaryScan.ok, false);
assert.deepEqual(missingLiveVideoNonExportableReasonSummaryScan.blockers.map((blocker) => blocker.reason), [
  'live_video_non_exportable_reason_summary_missing',
]);

const missingLiveVideoCoverageClassificationScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent
      .replaceAll('validateCoverageClassification', '')
      .replaceAll('coverageSummary', '')
      .replaceAll('retainMode', '')
      .replaceAll('coverageSource', '')
      .replaceAll('record coverage query missing retain mode or source classification evidence', ''),
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent,
  },
]);
assert.equal(missingLiveVideoCoverageClassificationScan.ok, false);
assert.deepEqual(missingLiveVideoCoverageClassificationScan.blockers.map((blocker) => blocker.reason), [
  'live_video_coverage_classification_evidence_missing',
]);

const missingLiveVideoCoverageClassificationCatalogScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent
      .replaceAll('STANDARD_COVERAGE_CLASSIFICATIONS', '')
      .replaceAll('continuous; motion; alert; detection; ', '')
      .replaceAll('record coverage query returned non-standard retain mode or source classification', ''),
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent,
  },
]);
assert.equal(missingLiveVideoCoverageClassificationCatalogScan.ok, false);
assert.deepEqual(missingLiveVideoCoverageClassificationCatalogScan.blockers.map((blocker) => blocker.reason), [
  'live_video_coverage_classification_catalog_missing',
]);

const missingLiveVideoCoverageClassificationNormalizerScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent
      .replaceAll('normalizeCoverageClassification', '')
      .replaceAll("normalized === 'all'; normalized === 'record'; normalized === 'recording'; return 'continuous'; ", ''),
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent,
  },
]);
assert.equal(missingLiveVideoCoverageClassificationNormalizerScan.ok, false);
assert.deepEqual(missingLiveVideoCoverageClassificationNormalizerScan.blockers.map((blocker) => blocker.reason), [
  'live_video_coverage_classification_normalizer_missing',
]);

const missingProductionSmokeCoverageClassificationScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replaceAll('payload.coverageSummary', '')
      .replaceAll('summary.coverageSummary', '')
      .replaceAll('buildCoverageSummary', '')
      .replaceAll('retainMode', '')
      .replaceAll('coverageSource', '')
      .replaceAll('missing coverage retain/source evidence', ''),
  },
]);
assert.equal(missingProductionSmokeCoverageClassificationScan.ok, false);
assert.deepEqual(missingProductionSmokeCoverageClassificationScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_coverage_classification_summary_missing',
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

const missingLiveVideoManifestStorageReferenceGuardScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent
      .replace('assertReleaseMediaEvidence(options, "export package storage reference", objectKey); ', ''),
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent,
  },
]);
assert.equal(missingLiveVideoManifestStorageReferenceGuardScan.ok, false);
assert.deepEqual(missingLiveVideoManifestStorageReferenceGuardScan.blockers.map((blocker) => blocker.reason), [
  'live_video_manifest_storage_reference_guard_missing',
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

const missingProductionSmokeAuditChainScalarWhitelistGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('firstAuditScalar; ', '')
      .replace('firstAuditIdList; ', '')
      .replace('normalizeAuditScalar; ', ''),
  },
]);
assert.equal(missingProductionSmokeAuditChainScalarWhitelistGateScan.ok, false);
assert.deepEqual(missingProductionSmokeAuditChainScalarWhitelistGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_audit_chain_scalar_whitelist_missing',
]);

const missingProductionSmokePlaybackAccessGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: `payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT; requiredOptionErrors; evidenceOutputFile; missing --evidence-output-file; YFEIEYE_PRODUCTION_SMOKE_EVIDENCE_FILE; ${productionSmokeTimeoutEvidenceContent} liveDeviceEvidenceError; childSmokeSummary; evidence_download_audited; auditChain; firstAuditScalar; firstAuditIdList; normalizeAuditScalar; eventIds; reviewItemIds; export_downloaded; missing auditChain exportJobNo evidence;`,
  },
]);
assert.equal(missingProductionSmokePlaybackAccessGateScan.ok, false);
assert.deepEqual(missingProductionSmokePlaybackAccessGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_playback_access_evidence_missing',
]);

const missingProductionSmokeRuleSemanticsEvidenceGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: `payload.manifestSignature; summary.manifestSignature = payload.manifestSignature; payload.manifestVerification; summary.manifestVerification = payload.manifestVerification; videoManifestVerifierScript; missing --video-manifest-verifier-script; YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT; requiredOptionErrors; evidenceOutputFile; missing --evidence-output-file; YFEIEYE_PRODUCTION_SMOKE_EVIDENCE_FILE; ${productionSmokeTimeoutEvidenceContent} liveDeviceEvidenceError; childSmokeSummary; evidence_download_audited; auditChain; firstAuditScalar; firstAuditIdList; normalizeAuditScalar; eventIds; reviewItemIds; export_downloaded; missing auditChain exportJobNo evidence; liveDevicePlaybackEvidenceError; summary.playback; grantedDecision; deniedDecision; camera_not_allowed; missing playback URL allow/deny decision evidence; missing playback URL deny reason evidence;`,
  },
]);
assert.equal(missingProductionSmokeRuleSemanticsEvidenceGateScan.ok, false);
assert.deepEqual(missingProductionSmokeRuleSemanticsEvidenceGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_rule_semantics_evidence_missing',
]);

const missingProductionSmokeRuleEvidenceWhitelistGateScan = scanLiveVideoEvidenceGate([
  {
    path: '.scripts/alert-review-video-live-smoke.mjs',
    content: completeLiveVideoSmokeContent,
  },
  {
    path: '.scripts/alert-review-production-smoke.mjs',
    content: completeProductionSmokeContent
      .replace('buildRuleEvidenceSummary(payload); ', '')
      .replace('copyTextIfPresent(ruleEvidence, source, \'ruleCode\'); ', '')
      .replace('copyTextIfPresent(ruleEvidence, source, \'cameraId\'); ', '')
      .replace('copyTextIfPresent(ruleEvidence, source, \'zoneCode\'); ', '')
      .replace('copyTextIfPresent(ruleEvidence, source, \'objectLabel\'); ', '')
      .replace('copyNumberIfPresent(ruleEvidence, source, \'inertiaFrames\'); ', '')
      .replace('copyNumberIfPresent(ruleEvidence, source, \'loiteringSeconds\'); ', ''),
  },
]);
assert.equal(missingProductionSmokeRuleEvidenceWhitelistGateScan.ok, false);
assert.deepEqual(missingProductionSmokeRuleEvidenceWhitelistGateScan.blockers.map((blocker) => blocker.reason), [
  'production_smoke_rule_evidence_whitelist_missing',
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

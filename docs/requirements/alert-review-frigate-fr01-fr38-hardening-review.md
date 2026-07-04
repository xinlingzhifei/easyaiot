# Alert Review FR-01 to FR-38 Hardening Review

Date: 2026-07-04

## Frigate-Inspired Boundary

yFeiEye should keep Frigate's useful business ideas, not copy its NVR stack:

- one review item groups related detections, alerts, snapshots, and recordings;
- object lifecycle rows can jump to the relevant recording time;
- zones, labels, object ids, confidence, bbox, and correlation ids must stay with the review item;
- review, export, and rule changes need replayable evidence and audit trails.

yFeiEye's source of truth is still the supervision closure model: alerts are clues, review cases are investigation workspaces, and converted events own closure state.

## Current Verdict

FR-01 to FR-38 are directionally correct and most core contracts now exist in DEVICE, VIDEO, and WEB. They are not yet production-complete. The remaining work is not more "alert features"; it is hardening in four areas:

1. runtime reliability: scheduled patrols, outbox consumers, locks, retry, drift repair;
2. real integration: live VIDEO URLs, real camera files, real ffmpeg, real object storage;
3. rule semantic consistency: one source for zone geometry, object point, inertia, loitering, shadow/apply/replay;
4. reproducible evidence: manifest v2, hashes, operator, event/case/item/job relation, verifier, download audit.

## FR Status Matrix

| FR | Capability | Current evidence in this branch | Still needs hardening before release |
| --- | --- | --- | --- |
| FR-01 | Alert review item aggregation | `SupervisionAlertReviewServiceTest` covers clue ingest, merge window, idempotency. | Add DB-level duplicate prevention for all ingest idempotency keys in production migration smoke. |
| FR-02 | Unified workbench entry for alerts, snapshots, recordings | `AlertReviewWorkbench.vue` renders evidence timeline and emits image/video actions. | Browser smoke must validate real playback action from alert list into workbench. |
| FR-03 | Review status actions | Tests cover reviewed, ignored, converted. | Add optimistic locking/idempotent repeated clicks for multi-reviewer operations. |
| FR-04 | Rule context and zone matching | Tests cover zone/object/stay rule match. | Keep region geometry in device-region source and prove drawer save writes back rule parameters. |
| FR-05 | Convert clue to supervision event | Tests cover idempotent event conversion, event projection, and scheduled reverse event reconciliation. | Configure the production scheduler trigger and define conflict policy after event rollback. |
| FR-06 | Automatic record evidence backfill | Tests cover resolver found/missing/retry. | Run against configured `yfeieye.video.alert-record-query-url` with a real VIDEO service. |
| FR-07 | Recording coverage window | DEVICE and VIDEO tests cover available/missing/motion/export segments; DEVICE coverage resolver now preserves retain mode, coverage source classification, exportability, non-exportable reason, and retain-until metadata from VIDEO. | Run live retain-mode/source classification and non-exportable reason smoke against real VIDEO recordings. |
| FR-08 | False-positive action and rule suggestion | Tests cover false-positive status and suggestion stats. | Enforce minimum sample count, risk note, scope, and before/after hit comparison in UI. |
| FR-09 | Cross-camera review case | Tests cover case timeline, clue dedupe, owner handoff, close-state guard, merge/split backend flow, case audit, and candidate matching by correlation/object/time/adjacency. | Add topology management UI and browser workflow controls. |
| FR-10 | Semantic search | Tests cover local and external semantic provider fallback. | Add persistent worker backlog alerts and index rebuild progress UI. |
| FR-11 | AI summary | Tests cover case timeline/evidence-aware summaries and external provider context. | Persist prompt/model/version, human confirmation, and sensitive-data masking. |
| FR-12 | Evidence export | DEVICE tests cover manifest job and VIDEO provider request; VIDEO now has a real local ffmpeg export smoke. | End-to-end production export must use live VIDEO URLs, object storage, checksum, and download expiry. |
| FR-13 | Review Detail Stream | Tests cover object lifecycle rows, `seekTime`, bbox, path, camera, zone. | Browser E2E must prove detail stream seeks a real player to the requested timestamp. |
| FR-14 | Async evidence export worker | VIDEO tests cover pending/running/ready/failed/retry/download audit/persistence. | Add production queue, backoff, cleanup, and object-storage lifecycle. |
| FR-15 | Rule safe apply | Tests cover accepted-before-applied, shadow evaluation, rollback. | Approval workflow must be enforced in controller permissions and UI, not only service tests. |
| FR-16 | Semantic trigger and shift/daily report | Tests cover trigger action payloads and shift report summary. | Add scheduled report delivery and operator acknowledgement. |
| FR-17 | Evidence-chain audit | Tests cover manifest verification, media access audit, bound events, downloads, and audit reverse lookup metadata for `reviewCaseId`, `reviewItemIds`, `eventIds`, and `exportJobNo`. | Audit all allow/deny reads for snapshots, recordings, manifests, downloads. |
| FR-18 | Rule replay validation | Tests cover replay before applying rule changes. | Persist rule version, sample window, false-negative estimate, and replay report per approval. |
| FR-19 | ReviewData JSON | Tests cover labels, zones, object ids, confidence, bbox, correlation, schema version, runtime schema drift alerts, compatibility repair for older rows missing `reviewDataVersion` / `reviewSegment`, and a standalone `alert-review-review-data-v1.schema.json` artifact. | Add production DB batch backfill check for historical rows. |
| FR-20 | ReviewSegment lifecycle | Tests cover active/detection/alert/ended, ended split behavior, ended truncation before late detection, half-open camera/time overlap boundaries, migration drop/recreate for the exclusion constraint, mapper-store rejection before overlapping segment insert, alert status no-downgrade after later detection heartbeats or merged detection clues, service-level concurrent same-camera ingest, symmetric merge windows, and event-time ordered `sourceAlertIds`. | Validate migration on PostgreSQL with `btree_gist`; add real DB transaction/cross-process race smoke. |
| FR-21 | Real VIDEO integration configuration | `application.yaml` still allows empty env values for safe degradation, while DEVICE `docker-compose.yml` now defaults iot-system to host VIDEO `/video/record/availability`, `/video/record`, and `/video/record/export`; coverage resolver can fall back from empty availability results to the dedicated record base URL for space discovery. | Run live ingest -> coverage -> export smoke against real camera recordings. |
| FR-22 | Recording DB/disk sync | VIDEO has metadata sync, coverage gap reasons, and a drift patrol API for DB record exists/file missing/expired/disk full/cache flush failed; DEVICE runtime health now consumes storage sync gap reasons as storage drift alerts, and scheduled runtime patrol can enqueue those alerts through a JobHandler. | Run the patrol against a real VIDEO service and decide reviewed metadata repair/delete policy. |
| FR-23 | Permission and audit enforcement | Media access audit API exists; evidence export, download, item timeline, detail stream, record coverage, case timeline, and manifest verification now resolve a server-side camera scope through `ReviewCameraPermissionResolver`; request `allowedCameraIds` can only narrow that scope, forged camera lists are denied and audited, `yfeieye.review.camera-permission` can fail closed, and review items now persist `tenant_id` with tenant-aware workbench/merge indexes. | Replace the temporary configured resolver with the real tenant/user/camera permission source and extend the same guard to the concrete playback URL endpoint once it is connected. |
| FR-24 | Runtime health and reconciliation | Tests cover health metrics, runtime reconcile, smoke checkpoints, `recordGapReasons`, storage drift notifications, reviewData schema drift, reviewSegment double-write drift, patrol action suggestions, outbox payload `action` hints, a `SupervisionAlertReviewRuntimePatrolJob`, and a runtime outbox consumer job that advances persisted pending alerts to published/failed. | Wire the consumer to the final external alert/notification channel and verify production scheduler configuration. |
| FR-25 | Runtime locks and patrol profile | Tests cover runtime patrol profile, locks, gap reasons, and `configure_video_record_query_url` action. | Add clustered deployment lock verification and stale-lock recovery. |
| FR-26 | Missing config degradation | Resolver failure now degrades to missing with standardized `video_url_not_configured`; workbench displays item and health reason summaries; compose defaults reduce local missing-config drift while env overrides can still intentionally degrade. | Prove live recording availability in production smoke. |
| FR-27 | Reproducible video export | VIDEO manifest stores file hash, source segment facts, clip params, ffmpeg command hash, and preserves the original source hash after download audit refresh. | Prove the same path with real VIDEO service recordings in production smoke. |
| FR-28 | Manifest v2 and verifier | Tests cover `manifestVersion=2`, `yfeieye.record-export.manifest.v2`, HMAC signature, offline verifier, and tampering. | Add key rotation plan and publish verifier artifact with release package. |
| FR-29 | Rule semantic consistency | Tests cover bottom-center geometry, inertia frames, loitering seconds. | Frontend rule drawer must expose and preserve the same semantics. |
| FR-30 | Event reverse status linkage | Review rows persist `reviewData.eventProjection`; `SupervisionAlertReviewEventReconcileJob` reconciles converted clues from event projection outside list query time; converted review items can still sync record evidence and export evidence packages but are guarded against late false-positive rollback. | Configure the production scheduler trigger and define conflict policy after event rollback. |
| FR-31 | Review case lifecycle | Case grouping, timeline, clue dedupe, owner handoff, close state, closed-case add rejection, merge-to-target, split-to-new-case, source case `merged` status, `case_audit` entries, owner/close/merge/split controller command mapping, and workbench lifecycle controls are covered at service/store/controller/browser-contract level. | Run release smoke against the real backend and operator workflow. |
| FR-32 | Production smoke | Integration smoke now covers ingest -> coverage -> case -> export -> verify -> download audit, with checkpoints and evidence audit trail regression. | Make deploy smoke mandatory against real VIDEO recordings and release environment. |
| FR-33 | Semantic index operations | Queue/evaluation/reindex contracts exist. | Add async worker retry, backlog alarm, index version, rebuild progress. |
| FR-34 | AI provenance | AI summary contract exists. | Persist prompt/model/provider/version, redaction status, human confirmation. |
| FR-35 | Operational reports | Shift report exists in service tests. | Expand daily/shift dimensions by unit, area, camera, rule, missing-record rate, export failure rate. |
| FR-36 | Frontend E2E | Workbench E2E contract script exists. | Run dual mode: contract mock and real dev-server API mock; include player seek verification. |
| FR-37 | Chinese encoding quality | Workbench contract now rejects replacement characters and common mojibake fragments, and asserts the required UTF-8 Chinese review/record/event labels are present. | Extend the same encoding scan to player, patrol, and remaining WEB/VIDEO visible copy before release. |
| FR-38 | Traceability | This document maps FRs to evidence and remaining gates. | Keep it updated with endpoint, table, test, and deployment command per FR. |

## FR Traceability Register

Command aliases used below:

- `J1`: `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewControllerTest,SupervisionAlertReviewServiceTest,SupervisionAlertReviewMapperStoreTest,HttpVideoResolverTest,SupervisionSchemaSqlTest" -DfailIfNoTests=false test`
- `V1`: `python -m pytest test_record_export.py test_record_availability.py -q`
- `W1`: `node scripts/alert-review-workbench-e2e-check.mjs`
- `W2`: `pnpm exec tsc --noEmit --skipLibCheck --pretty false --allowJs false`; full `pnpm type:check` remains a release blocker until it exits cleanly.
- `Smoke`: `POST /system/supervision/alert-review/integration-smoke` against release DEVICE + real VIDEO recordings.
- `Pkg`: `node .scripts/verify-alert-review-release-package.mjs`; use `--require-clean` for a release artifact that must come only from HEAD.

| FR | API / entry point | Tables / artifacts | Primary tests | Acceptance command |
| --- | --- | --- | --- | --- |
| FR-01 | `POST /system/supervision/alert-review/clues/ingest`, `GET /items` | `system_supervision_alert_review_item`, `system_supervision_alert_review_evidence` | `ingestCluesMergesNearbyAlertSnapshotsAndRecordsIntoOneReviewItem`, `ingestDuplicatePayloadHashKeepsReviewItemIdempotentWithoutExtraEvidence` | `J1`, `Smoke` |
| FR-02 | `GET /items/{reviewItemId}/timeline`, `AlertReviewWorkbench.vue` | `system_supervision_alert_review_evidence`, workbench SFC | `workbenchQueryAndSummarySupportEvidenceEventCaseAndReviewerPerspective`, workbench contract selectors | `J1`, `W1` |
| FR-03 | `POST /items/{id}/review`, `/ignore`, `/false-positive`, `/user-status` | `system_supervision_alert_review_item`, `system_supervision_alert_review_user_status` | `reviewStatusCanBeConfirmedOrIgnoredBeforeConversion`, `userReviewStatusTracksMultipleReviewersIndependently` | `J1` |
| FR-04 | `POST /rules`, `POST /rules/geometry-evaluate` | `system_supervision_alert_review_rule` | `regionRuleSuppliesRuleCodeOnlyWhenZoneObjectAndStayTimeMatch`, `ruleGeometryAndReplayUseZoneInertiaAndLoiteringSemanticsFromSavedRule` | `J1` |
| FR-05 | `POST /items/{id}/to-event`, runtime reconciliation | `system_supervision_event`, `system_supervision_alert_review_item.review_data` | `convertReviewItemToSupervisionEventUsesReviewItemAsIdempotentSource`, `eventReconcileJobPersistsReverseEventProjectionOutsideListQuery` | `J1`, `Smoke` |
| FR-06 | `POST /items/{id}/record-evidence/retry`, `yfeieye.video.alert-record-query-url` | `system_supervision_alert_review_evidence`, VIDEO record metadata | `ingestWithoutRecordUriBackfillsRecordEvidenceWhenResolverFindsRecord`, `alertRecordResolverParsesVideoPayloadAndRewritesRelativePlaybackUrl` | `J1`, `Smoke` |
| FR-07 | `GET /items/{id}/record-coverage`, `GET /video/record/availability` | VIDEO record metadata, `system_supervision_alert_review_evidence` | `recordCoverageReturnsAvailableOrMissingWindowSegments`, `coverageResolverPreservesRetainModeSourceAndNonExportableReason`, `test_build_recording_availability_returns_available_missing_motion_and_export` | `J1`, `V1`, `Smoke` |
| FR-08 | `POST /items/{id}/false-positive`, `/rule-suggestion/*` | `system_supervision_alert_review_item.rule_suggestion`, `system_supervision_alert_review_rule` | `falsePositiveActionMarksStatusAndCreatesRuleSuggestion`, `ruleSuggestionStatsAggregateFalsePositiveRateByCameraZoneLabelAndWindow` | `J1` |
| FR-09 | `POST /cases`, `/cases/{id}/items/{itemId}`, `/case-candidates` | `system_supervision_alert_review_case`, `system_supervision_alert_review_case_item`, `system_supervision_alert_review_case_audit` | `reviewCaseCollectsMultipleCameraCluesIntoOneTimeline`, `reviewCaseCandidatesUseAdjacentCameraZoneAndRegulatoryArea` | `J1`, `W1` |
| FR-10 | `GET /semantic-search`, `POST /semantic-index/reindex` | `system_supervision_alert_review_semantic_index` | `semanticSearchRanksReviewItemsByDetectionEvidenceContext`, `semanticSearchCanUseExternalProviderBeforeLocalKeywordFallback` | `J1` |
| FR-11 | `GET /cases/{id}/ai-summary` | AI summary response payload, `system_supervision_alert_review_case` | `aiSummaryAndEvidenceExportUseCaseTimelineEvidenceCoverageAndActions`, `aiSummaryCanUseExternalProviderWithCaseTimelineContext` | `J1` |
| FR-12 | `POST /cases/{id}/evidence-export`, `POST /cases/{id}/evidence-export-jobs`, `POST /video/record/export` | `system_supervision_alert_review_export_job`, VIDEO export store | `evidenceExportCreatesReadyJobWithIntegrityAuditAndEventBinding`, `test_record_export_route_posts_to_service` | `J1`, `V1`, `Smoke` |
| FR-13 | `GET /items/{id}/detail-stream`, workbench seek action | `reviewData.reviewSegment`, `system_supervision_alert_review_segment` | `reviewDetailStreamExpandsObjectsDetectionsAndSeekTimes`, workbench `alert-review-detail-seek` selector | `J1`, `W1`; real player seek smoke required |
| FR-14 | `GET/POST /video/record/export/{export_id}`, retry, audit, download routes | VIDEO export persistence, manifest files | `test_async_record_export_worker_moves_job_to_ready_with_hash_and_download`, `test_failed_async_record_export_can_retry_and_records_download_audit` | `V1`, `Smoke` |
| FR-15 | `POST /items/{id}/rule-suggestion/status`, `/revert`, `/rules/replay` | `system_supervision_alert_review_rule`, rule suggestion payload | `ruleSuggestionSafeApplyRequiresApprovalAndStoresShadowEvaluation`, `falsePositiveRuleSuggestionAppliesRuleConfigOnlyAfterApprovalAndCanRollback` | `J1` |
| FR-16 | `POST /semantic-index/queue`, operations report service path | `system_supervision_alert_review_semantic_index`, runtime report payload | `semanticTriggerMatchesIndexedItemsAndReturnsActions`, `shiftReportSummarizesReviewItemsAndEvidenceGaps` | `J1` |
| FR-17 | `GET /cases/{id}/evidence-audit`, `POST /evidence-export-jobs/{jobNo}/downloads` | `system_supervision_alert_review_case_audit`, `system_supervision_alert_review_export_job` | `evidenceAuditTrailListsHashesExporterDownloadsAndBoundEvents`, `evidenceManifestV2AndVerifierReconstructDecisionTrailAndAuditChain` | `J1`, `V1` |
| FR-18 | `POST /rules/replay` | `system_supervision_alert_review_rule`, replay report payload | `ruleReplayEvaluatesHistoricalItemsBeforeApplyingRuleChange`, `ruleGeometryUsesBottomCenterSemanticsAndReplayRequiresSafeVersionLifecycle` | `J1` |
| FR-19 | ReviewData JSON in ingest/update paths | `system_supervision_alert_review_item.review_data`, `alert-review-review-data-v1.schema.json` | `reviewItemKeepsFrigateLikeReviewDataFromDetectionContext`, `reviewDataJsonSchemaArtifactDefinesVersionedFrigateReviewFields` | `J1` |
| FR-20 | `GET /items/{id}/review-segment`, `POST /items/{id}/lifecycle` | `system_supervision_alert_review_segment`, `V20260702__alert_review_frigate_hardening.sql` | `concurrentIngestKeepsSingleActiveReviewSegmentForSameCameraWindow`, `reviewSegmentOverlapUsesHalfOpenIntervalsSoAdjacentSegmentsCanSplitCleanly`, `createRejectsOverlappingReviewSegmentBeforeSegmentInsert` | `J1`; PostgreSQL migration smoke required |
| FR-21 | `HttpAlertRecordEvidenceResolver`, `HttpVideoRecordCoverageResolver`, docker compose env | `application.yaml`, `DEVICE/docker-compose.yml` | `dockerComposeWiresReviewVideoUrlsToRealVideoRecordEndpointsByDefault`, `videoEvidenceExportProviderPostsExportWindowAndRewritesRelativeExportUrl` | `J1`, `Smoke` |
| FR-22 | `GET /video/record/space/{space_id}/videos/drift`, runtime patrol | VIDEO DB/file metadata, runtime health payload | `test_recording_storage_drift_patrol_reports_missing_expired_disk_and_cache_failures`, `runtimePatrolSurfacesRecordStorageDriftReasonsFromStorageSync` | `J1`, `V1`, `Smoke` |
| FR-23 | Media access guard on timeline, coverage, export, verify, download | audit entries in case audit store, permission resolver config | `evidenceExportRejectsUnauthorizedCameraMediaAndAuditsDenial`, `manifestVerificationRejectsUnauthorizedCameraMediaAndAuditsDenial`, `requestedCameraScopeCannotExpandServiceSideCameraPermission` | `J1`; real tenant/camera resolver smoke required |
| FR-24 | `GET /runtime-health`, `POST /runtime-reconcile`, `POST /runtime-patrol` | `system_supervision_alert_review_runtime_*` | `reviewReconciliationRepairsRecordAndSemanticDriftAndReportsHealthMetrics`, `runtimePatrolAndOutboxJobsCloseScheduledAlertDispatchLoop` | `J1` |
| FR-25 | runtime lock/run/outbox service path | `system_supervision_alert_review_runtime_lock`, `runtime_run`, `runtime_outbox` | `runtimePatrolProfileTraceAndGapReasonsHardenReviewOperations`, `runtimePatrolAndOutboxJobsCloseScheduledAlertDispatchLoop` | `J1`; clustered lock smoke required |
| FR-26 | missing VIDEO URL resolver branch, UI record reason display | `application.yaml`, workbench record reason labels | `alertRecordResolverReportsVideoUrlNotConfiguredWhenUrlIsEmpty`, `runtimeHealthReportsVideoUrlNotConfiguredReasonWhenResolverIsUnconfigured`, workbench reason contract | `J1`, `W1` |
| FR-27 | VIDEO export manifest source segment path | VIDEO manifest files and export artifacts | `test_real_ffmpeg_export_keeps_original_source_hash_after_download_audit`, `test_manifest_hmac_signature_verifier_checks_files_source_segments_and_clip_params` | `V1`, `Smoke` |
| FR-28 | `/video/record/export/{id}/manifest`, offline verifier | `record_export_manifest_verifier.py`, manifest v2 JSON | `test_manifest_verifier_cli_validates_canonical_hash_signature_and_tampering`, `test_manifest_hmac_signature_verifier_checks_files_source_segments_and_clip_params` | `V1`; release verifier artifact required |
| FR-29 | `POST /rules/geometry-evaluate`, rule drawer path | `system_supervision_alert_review_rule.geometry` | `ruleGeometryUsesBottomCenterSemanticsAndReplayRequiresSafeVersionLifecycle`, `ruleGeometryAndReplayUseZoneInertiaAndLoiteringSemanticsFromSavedRule` | `J1`, `W1`; real `DeviceRegionDrawer` save smoke required |
| FR-30 | event projection reconciliation path | `system_supervision_alert_review_item.event_id`, `review_data.eventProjection` | `convertedReviewItemCarriesLinkedEventProjection`, `convertedReviewItemAllowsEvidenceHardeningButRejectsFalsePositiveRollback` | `J1` |
| FR-31 | `/cases/{id}/owner`, `/close`, `/merge`, `/split` | `system_supervision_alert_review_case*` | `reviewCaseLifecycleKeepsOwnerDedupCloseAndAuditTrail`, `reviewCaseMergeAndSplitMoveCluesWithAuditTrail`, `caseLifecycleEndpointsMapHttpRequestsToServiceCommands` | `J1`, `W1` |
| FR-32 | `POST /integration-smoke` | smoke result payload, evidence audit chain | `integrationSmokeCoversReviewRecordCaseExportAndManifestVerification`, workbench mock checkpoint `evidence_download_audited` | `J1`, `W1`, `Smoke` |
| FR-33 | `POST /semantic-index/queue`, `GET /semantic-index/evaluation` | `system_supervision_alert_review_semantic_index` | `semanticIndexQueueSupportsAsyncBacklogEvaluation`, `semanticReindexPersistsLifecycleAndSearchCanUseIndexedDocument` | `J1`; async worker smoke required |
| FR-34 | AI summary provider path | AI summary payload, prompt/model metadata pending | `aiSummaryCanUseExternalProviderWithCaseTimelineContext`, `reviewIntelligenceProviderKeepsStructuredSummaryData` | `J1`; provenance persistence required |
| FR-35 | operations report service path | report payload, runtime health metrics | `shiftReportSummarizesReviewItemsAndEvidenceGaps`, `runtimePatrolProfileTraceAndGapReasonsHardenReviewOperations` | `J1` |
| FR-36 | workbench browser contract harness | `WEB/scripts/fixtures/alert-review-workbench-e2e/*` | `alert-review-workbench-e2e-check.mjs` browser harness | `W1`; real dev-server/API mock mode required |
| FR-37 | UTF-8 copy guard in workbench contract and ad-hoc scan | workbench SFC, patrol API, contract script | required Chinese copy guard, 2026-07-04 UTF-8 mojibake scan | `W1`, `W2`; broader visible-copy scan required |
| FR-38 | this traceability register and release package gate | `docs/requirements/alert-review-frigate-fr01-fr38-hardening-review.md`, `.scripts/verify-alert-review-release-package.mjs` | documentation grep for FR coverage and release gates, `verify-alert-review-release-package.test.mjs` | `rg "FR-0[1-9]|FR-[1-3][0-9]" docs/requirements/alert-review-frigate-fr01-fr38-hardening-review.md`, `Pkg` |

## Release Packaging Audit

Current local audit on 2026-07-04: the FR implementation has been staged as one intentional pre-commit release package. The executable `Pkg` gate first reported 75 FR release blockers (67 untracked files and 8 unstaged files); after targeted staging it passes in default pre-commit mode over 75 FR release paths. `Pkg --require-clean` remains a release-artifact blocker until the staged package is committed and the release is built from HEAD.

| Package group | Current examples | Current state | Release action |
| --- | --- | --- | --- |
| DEVICE review backend | `SupervisionAlertReviewController.java`, `SupervisionAlertReviewServiceImpl.java`, review DOs, mapper store, resolver/provider classes | Staged in the FR pre-commit package | Keep as one intentional FR backend package or the workbench endpoints will not exist after release |
| DEVICE schema and migration | `supervision_event_closure_v1.sql`, `V20260702__alert_review_frigate_hardening.sql`, `SupervisionSchemaSqlTest.java` | Staged in the FR pre-commit package | Commit both schema baseline and production migration; run PostgreSQL smoke with `btree_gist` before deploy |
| DEVICE regression tests | `SupervisionAlertReviewServiceTest.java`, `SupervisionAlertReviewControllerTest.java`, `HttpVideoResolverTest.java`, mapper/schema/permission tests | Staged in the FR pre-commit package | Keep tests with the feature package so future FR regressions remain executable |
| VIDEO evidence package | `record_export_service.py`, `record_video_service.py`, `record_export_manifest_verifier.py`, `test_record_export.py`, `test_record_availability.py` | Staged in the FR pre-commit package | Commit together with manifest verifier artifact and real recording smoke |
| WEB workbench package | `AlertReviewWorkbench.vue`, `WEB/src/api/supervision/alertReview.ts`, workbench E2E script and fixtures | Staged in the FR pre-commit package | Commit workbench assets and run contract plus full frontend type gate before publishing |
| Documentation | This FR-01 to FR-38 hardening review document | Staged in the FR pre-commit package | Keep with release notes so each FR maps to API, artifact, test, and gate |
| Release gate tooling | `.scripts/verify-alert-review-release-package.mjs`, `.scripts/verify-alert-review-release-package.test.mjs` | Staged in the FR pre-commit package | Commit the verifier itself so packaging drift is checked before every release |

Release packaging gates:

- `git status --short --untracked-files=all` must show no FR core implementation file as `??` after intentional staging or release packaging.
- `node .scripts/verify-alert-review-release-package.test.mjs` must pass, then `node .scripts/verify-alert-review-release-package.mjs` must pass before commit packaging; run it again with `--require-clean` after commit and before building a HEAD-only release artifact.
- `J1`, `V1`, `W1`, and `W2` must be rerun from the packaged tree, not only from the loose worktree.
- Full `pnpm type:check` must exit cleanly before release; the lightweight `tsc --allowJs false` check only proves ordinary TypeScript files.
- The production migration `DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260702__alert_review_frigate_hardening.sql` must be applied against a PostgreSQL environment with `btree_gist` enabled and a representative `system_supervision_alert_review_segment` dataset.
- The release smoke must use real DEVICE and VIDEO services, with configured alert record, record coverage, export, manifest, download audit, detail-stream seek, and case/event reverse-link paths.
- Do not ship while the worktree-only FR files remain outside the release package, while `pnpm type:check` still stalls, or before real VIDEO recording smoke proves playable/exportable evidence.

## Required Release Gates

### P0 gates

- Java regression:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewControllerTest,SupervisionAlertReviewServiceTest,SupervisionAlertReviewMapperStoreTest,HttpVideoResolverTest,SupervisionSchemaSqlTest" -DfailIfNoTests=false test`
- VIDEO regression:
  `python -m pytest test_record_export.py test_record_availability.py -q`
- Workbench contract:
  `pnpm test:alert-review-workbench`
- Full frontend type baseline:
  `pnpm type:check`
- Production smoke with real VIDEO URLs:
  `POST /system/supervision/alert-review/integration-smoke`

### P1 gates

- Region drawer saves `inertiaFrames` and `loiteringSeconds` and replay explains them.
- False-positive suggestions cannot apply live rules without accepted approval.
- Case lifecycle service/store/controller/browser contract supports dedupe, merge, split, owner, close, audit, and HTTP command mapping; release hardening still needs real backend/operator smoke.
- Runtime patrol, runtime outbox, and event reverse reconciliation have schedulable JobHandlers; production release must configure scheduler triggers, final alert/notification sink, and event rollback conflict policy.

### P2 gates

- ReviewData production batch migration/backfill check for historical rows.
- Manifest verifier artifact and HMAC key rotation notes.
- Semantic worker backlog and rebuild progress.
- Shift/daily report with responsibility, area, camera, and rule dimensions.

## Latest Local Verification

2026-07-03 and 2026-07-04 local checks:

- DEVICE review regression passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewControllerTest,SupervisionAlertReviewServiceTest,SupervisionAlertReviewMapperStoreTest,HttpVideoResolverTest,SupervisionSchemaSqlTest" -DfailIfNoTests=false test`
  Result: 94 tests, 0 failures, 0 errors.
- VIDEO regression passed:
  `python -m pytest test_record_export.py test_record_availability.py -q`
  Result: 21 passed.
- Workbench contract and case lifecycle controls passed:
  `node scripts/alert-review-workbench-e2e-check.mjs`
  Result: `Alert review workbench E2E contract OK`; includes owner, close, merge, split browser actions, UTF-8 Chinese copy guard, and the integration smoke `evidence_download_audited` checkpoint.
- Review VIDEO docker integration config and resolver regression passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=HttpVideoResolverTest" -DfailIfNoTests=false test`
  Result: 12 tests, 0 failures, 0 errors.
- ReviewSegment concurrent ingest and lifecycle hardening regression passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest,SupervisionAlertReviewMapperStoreTest,SupervisionSchemaSqlTest" -DfailIfNoTests=false test`
  Result: 83 tests, 0 failures, 0 errors.
- ReviewData standalone JSON schema artifact regression passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionSchemaSqlTest" -DfailIfNoTests=false test`
  Result: 9 tests, 0 failures, 0 errors.
- Lightweight frontend type baseline passed:
  `pnpm exec tsc --noEmit --skipLibCheck --pretty false --allowJs false`
  Result: exit 0.
- Frontend patrol API type baseline rechecked:
  `pnpm exec tsc --noEmit --skipLibCheck --pretty false --allowJs false`
  Result: exit 0; `WEB/src/api/device/patrol.ts` no longer reproduces the earlier ordinary TypeScript first-error signal in the current worktree.
- Workbench/patrol UTF-8 mojibake scan passed:
  `python -X utf8 -` scan over `WEB/scripts/alert-review-workbench-e2e-check.mjs`, `WEB/src/views/alert/components/AlertReviewWorkbench.vue`, and `WEB/src/api/device/patrol.ts`
  Result: 3 files OK for replacement-character and common multi-character mojibake fragments.
- ReviewData/ReviewSegment/event reverse reconciliation/case lifecycle regression passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest" -DfailIfNoTests=false test`
  Result: 74 tests, 0 failures, 0 errors.
- Evidence-chain reverse lookup metadata slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#evidenceAuditTrailListsHashesExporterDownloadsAndBoundEvents" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- Evidence-chain reverse lookup service regression passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest" -DfailIfNoTests=false test`
  Result: 74 tests, 0 failures, 0 errors.
- Release package verifier self-test passed:
  `node .scripts/verify-alert-review-release-package.test.mjs`
  Result: `alert review release package verifier tests OK`.
- Release package verifier blocked the loose worktree before staging:
  `node .scripts/verify-alert-review-release-package.mjs`
  Result: failed with 75 blockers, including 67 untracked and 8 unstaged FR release paths. This is an intentional P0 release stop until those files are staged/committed or otherwise included in the release package.
- Release package verifier passed after targeted staging:
  `node .scripts/verify-alert-review-release-package.mjs`
  Result: `Alert review release package verifier OK: 75 FR release path(s) checked; no loose FR core file blocked packaging.`
- HEAD-only release verifier still blocks until commit:
  `node .scripts/verify-alert-review-release-package.mjs --require-clean`
  Result: failed with staged `dirty` FR paths, as expected before the package is committed.
- Integration smoke download audit slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#integrationSmokeCoversReviewRecordCaseExportAndManifestVerification" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- Converted review item post-event policy slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#convertedReviewItemAllowsEvidenceHardeningButRejectsFalsePositiveRollback" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- Review case owner/close lifecycle slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#reviewCaseLifecycleKeepsOwnerDedupCloseAndAuditTrail" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- Review case merge/split lifecycle slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#reviewCaseMergeAndSplitMoveCluesWithAuditTrail" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- Review case lifecycle controller slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewControllerTest#caseLifecycleEndpointsMapHttpRequestsToServiceCommands" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- Event reverse reconciliation scheduler slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#eventReconcileJobPersistsReverseEventProjectionOutsideListQuery" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- Runtime patrol scheduler/outbox slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#runtimePatrolAndOutboxJobsCloseScheduledAlertDispatchLoop" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- Full frontend `pnpm type:check` is still blocked by local `vue-tsc` stall; see Current Open Risks.

## Current Open Risks

- Frontend full `vue-tsc` / `pnpm type:check` still stalls locally: the 2026-07-04 retry printed only the `cross-env NODE_OPTIONS=--max-old-space-size=8192 vue-tsc --noEmit --skipLibCheck` start line and produced no diagnostics or exit code for about 180 seconds before it was stopped. Lightweight `pnpm exec tsc --noEmit --skipLibCheck --pretty false --allowJs false` now exits 0 after clearing the patrol API, SimpleMenu event map, Table filter compatibility, TiandituMap OpenLayers, legacy design/store type exports, camera utility, alert form, and product data strict-type errors, but it is not a substitute for the full Vue SFC type gate.
- Release packaging is staged and passes `Pkg` default mode, but a HEAD-only release artifact is still blocked by `Pkg --require-clean` until the staged FR package is committed.
- Real VIDEO integration now has docker-compose defaults for local iot-system -> VIDEO record availability/base/export routes, and empty env values still degrade with `video_url_not_configured`; this does not yet prove live recording availability.
- Workbench Chinese copy is now guarded by the E2E contract against replacement characters/common mojibake fragments and required UTF-8 labels; the remaining release risk is the broader WEB/VIDEO visible-copy scan outside the workbench.
- Controller-level permission enforcement now has scoped parameters on export, download, timeline, detail stream, coverage, case timeline, and manifest verification endpoints; the remaining audit is to bind those parameters to the real tenant/user/camera permission source instead of caller-supplied lists.

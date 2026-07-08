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
| FR-01 | Alert review item aggregation | `SupervisionAlertReviewServiceTest` covers clue ingest, merge window, idempotency; `system_supervision_alert_review_ingest_identity` now projects ingest identity keys into a tenant-scoped unique table; `PG1` proves historical source-alert backfill, duplicate identity rejection, and cross-process duplicate identity racing against PostgreSQL 16. | Rerun `PG1` against the release database shape and keep application-level ingest concurrency smoke in the release environment. |
| FR-02 | Unified workbench entry for alerts, snapshots, recordings | `AlertReviewWorkbench.vue` renders evidence timeline, emits image/video actions, and now exposes a list-level record playback action that opens the first playable evidence through the same playback-url guard before emitting `viewVideo`. | Run the same list playback path against the release API/player, not only dev-api-mock. |
| FR-03 | Review status actions | Tests cover reviewed, ignored, converted, repeated same-status clicks as idempotent, conflicting reviewer actions rejected, MapperStore `review_status`/`version` conditional updates for stale concurrent writes, and `PG1` SQL for stale version rejection plus concurrent reviewer status races. | Rerun `PG1` against the release database shape for cross-process reviewer races. |
| FR-04 | Rule context and zone matching | Tests cover zone/object/stay rule match. | Keep region geometry in device-region source and prove drawer save writes back rule parameters. |
| FR-05 | Convert clue to supervision event | Tests cover idempotent event conversion, event projection, scheduled reverse event reconciliation, and event rollback/rework conflict policy. | Enable the seeded production scheduler job and run a real rollback/rework event smoke. |
| FR-06 | Automatic record evidence backfill | Tests cover resolver found/missing/retry. | Run against configured `yfeieye.video.alert-record-query-url` with a real VIDEO service. |
| FR-07 | Recording coverage window | DEVICE and VIDEO tests cover available/missing/motion/export segments; DEVICE coverage resolver now preserves retain mode, coverage source classification, exportability, non-exportable reason, and retain-until metadata from VIDEO; authorized coverage reads now attach returned record URIs to review evidence before auditing each returned URI. | Run live retain-mode/source classification and non-exportable reason smoke against real VIDEO recordings. |
| FR-08 | False-positive action and rule suggestion | Tests cover false-positive status, suggestion stats, minimum sample metadata, risk note, impact scope, and before/after hit comparison; the service refreshes current same-scope sample counts and blocks low-sample `accepted` / `applied` transitions, and the workbench hides accept/apply actions until `sampleRequirementMet` is true while still showing sample count, risk note, impact scope, and before/after hit estimates. | Run release smoke with real operator roles and real false-positive samples. |
| FR-09 | Cross-camera review case | Tests cover case timeline, clue dedupe, owner handoff, close-state guard, merge/split backend flow, case audit, candidate matching by correlation/object/time/adjacency, configured camera topology (`yfeieye.review.camera-topology.cameras`) for regulatory-area/adjacent-camera matches, `reviewData.caseCandidateMatch` payload explanations, and workbench topology candidate cards showing area/adjacent-camera/shared-object reasons with add-to-case action. | Add operator topology management UI for maintaining adjacency and regulatory-area source data instead of editing config by hand. |
| FR-10 | Semantic search | Tests cover local and external semantic provider fallback; workbench ops panel now exposes semantic backlog alarm level, rebuild progress, stale item count, and failed index count from the semantic index evaluation API. | Run production semantic worker schedule and real backlog smoke. |
| FR-11 | AI summary | Tests cover case timeline/evidence-aware summaries, external provider context, `aiProvenance` response metadata, persisted `ai_summary_generated` case audit traces, human confirmation/rejection audit transitions, reviewData plus timeline/action-note/material-URI prompt redaction for sensitive fields / phone / ID values, and configurable redaction policy version tracing. | Keep the same sanitizer on future provider payload fields and sign off the production catalog before release. |
| FR-12 | Evidence export | DEVICE tests cover manifest job and VIDEO provider request; VIDEO now has a real local ffmpeg export smoke. | End-to-end production export must use live VIDEO URLs, object storage, checksum, and download expiry. |
| FR-13 | Review Detail Stream | Tests cover object lifecycle rows, `seekTime`, bbox, path, camera, zone; workbench dev/API mock browser mode now verifies detail stream, coverage, and case timeline seek payloads reach the player event with exact `seek_time` and `record_path`; playback contract now preserves `seek_time`, computes `playback_offset_seconds`, lets native mp4 VOD consume that offset, `LivePlayer` can assert those fields against a deployed workbench without starting mocks, rejects local/mock workbench URLs and media evidence unless local endpoint mode is explicit, and `ProdSmoke` now runs separate `LivePlayer:detail`, `LivePlayer:coverage`, and `LivePlayer:case-timeline` steps with seek summaries plus entry/action/expected seek context preserved without raw stdout while rejecting local/mock player media evidence in release mode. | Run `LivePlayer`/`ProdSmoke` against a real release player and real recording URL. |
| FR-14 | Async evidence export worker | VIDEO tests cover pending/running/ready/failed/retry/download audit/persistence and manifest storage lifecycle metadata for persisted artifacts; DEVICE now has `processEvidenceExportQueue` plus a production `supervisionAlertReviewEvidenceExportWorkerJob` entry that scans pending/running/failed export jobs, rebuilds failed packages, records worker attempt metadata/backoff in the signed manifest, expires ready jobs after `expiresAt`, blocks non-ready/expired downloads, updates the persisted export job row, keeps manifest verification replayable, and is seeded paused in `V20260708_2`. | Run live VIDEO clipping/persistence smoke against real object storage. |
| FR-15 | Rule safe apply | Tests cover accepted-before-applied, shadow evaluation, rollback, controller permission annotations, and workbench UI permission gating for accept/apply/revert/replay rule actions. | Run release smoke for real operator roles and menu-permission assignments. |
| FR-16 | Semantic trigger and shift/daily report | Tests cover trigger action payloads, hit explanations, action previews, pending human confirmation status, shift report summary, report delivery plan, report acknowledgement persistence/idempotency, release API mapping, workbench acknowledgement action, scheduled report delivery through runtime outbox, runtime outbox publisher success/failure contract, configurable station-notify delivery through `NotifyReviewRuntimeOutboxPublisher`, per-recipient delivery idempotency after partial notification failure, pending-to-processing runtime outbox claim, and daily operational metrics for missing-record rate, export failure rate, semantic backlog, false-positive rate, unreviewed backlog count/rate, and responsibility-unit / area / camera / rule dimensions; `V20260708_3` adds the report acknowledgement table, `V20260708_4` seeds runtime outbox notify templates, `V20260708_5` adds recipient delivery tracking, and `V20260708_6` adds outbox claim fields. | Enable/tune the seeded report jobs, configure `yfeieye.review.runtime-outbox.notify.*` recipients/templates for the release tenant, wire an external dashboard push if station notify is not the final sink, and run release UI/API smoke against real operator roles. |
| FR-17 | Evidence-chain audit | Tests cover manifest verification, media access allow/deny audit, bound events, downloads, hash chaining, and audit reverse lookup metadata for `reviewCaseId`, `reviewItemIds`, `eventIds`, and `exportJobNo`; media access reads now enter the evidence audit trail with operator, camera, material URI, decision, denied reasons, and returned coverage record URIs; production smoke evidence now preserves DEVICE child summary identifiers such as `reviewItemId`, `reviewCaseId`, and `exportJobNo`, and each player smoke summary now carries `reviewItemId`, `reviewCaseId`, `reviewRowText`, entry, action id, and expected seek metadata without recording raw stdout, signed player URL query strings, or URL-valued step command query/hash secrets. | Run real playback/snapshot/download/manifest allow-deny audit smoke against deployed endpoints. |
| FR-18 | Rule replay validation | Tests cover replay before applying rule changes and rule suggestion approval now persists rule version, sample window, hit comparison, false-negative estimate, and replay report evidence; the workbench replay panel now explains rule version, sample window, hit comparison, and false-negative risk from the replay report. | Run release smoke against production historical samples. |
| FR-19 | ReviewData JSON | Tests cover labels, zones, object ids, confidence, bbox, correlation, schema version, runtime schema drift alerts, compatibility repair for older rows missing `reviewDataVersion` / `reviewSegment`, a standalone `alert-review-review-data-v1.schema.json` artifact, and production migration `V20260705` backfill of historical `review_data` rows. | Rerun `PG1` against the release PostgreSQL shape before deploy. |
| FR-20 | ReviewSegment lifecycle | Tests cover active/detection/alert/ended, ended split behavior, ended truncation before late detection, ended extension rejected when it would overlap a later active same-camera segment, half-open camera/time overlap boundaries, migration drop/recreate for the exclusion constraint, mapper-store rejection before overlapping segment insert, mapper-store fail-fast validation for missing cameraId and invalid segment status before insert, mapper-store persistence of non-ended segments as DB open intervals (`end_time IS NULL`), alert status no-downgrade after later detection heartbeats or merged detection clues, service-level concurrent same-camera ingest, symmetric merge windows, event-time ordered `sourceAlertIds`, DB-level status/severity checks, `V20260708` DB trigger rejection of status downgrade/reopen, and a PostgreSQL 16 `btree_gist` smoke for tenant-scoped `V20260702`/`V20260704` migration including open active same-camera overlap rejection plus concurrent ReviewSegment overlap racing with exactly one successful insert. | Rerun `PG1` against the release PostgreSQL shape. |
| FR-21 | Real VIDEO integration configuration | `application.yaml` still allows empty env values for safe degradation, while DEVICE `docker-compose.yml` now defaults iot-system to host VIDEO `/video/record/availability`, `/video/record`, and `/video/record/export`; coverage resolver can fall back from empty availability results to the dedicated record base URL for space discovery; `alert-review-video-live-smoke.mjs` now enforces the four real VIDEO URLs, real device/time parameters, async export worker request, export download readiness, resolved download URL reachability, recording storage drift patrol, manifest v2 reproducibility fields, manifest storage lifecycle metadata, and rejects local/mock/file endpoints plus returned record/download/manifest media evidence unless `--allow-local-endpoints` is explicitly supplied. | Run `LiveVideo` against real camera recordings in the release environment. |
| FR-22 | Recording DB/disk sync | VIDEO has metadata sync, coverage gap reasons, and a drift patrol API for DB record exists/file missing/expired/disk full/cache flush failed; DEVICE runtime health now consumes storage sync gap reasons as storage drift alerts, normalizes legacy `file_expired` into standard `retention_expired`, and scheduled runtime patrol can enqueue those alerts through a JobHandler; `LiveVideo` now calls `/video/record/space/{spaceId}/videos/drift` with a configured retention window, fails the release smoke if the report is unhealthy or has issues, and prints a compact `storageDriftSummary` into the CLI JSON evidence. | Run the patrol against a real VIDEO service and decide reviewed metadata repair/delete policy. |
| FR-23 | Permission and audit enforcement | Media access audit API exists; evidence export, download, item timeline, detail stream, record coverage, case timeline, manifest verification, evidence package verification, and server-side playback URL preparation now resolve a camera scope through `ReviewCameraPermissionResolver`; package verification and playback URL preparation bind audit operator identity to the logged-in user instead of request `operatorUserId`; coverage reads preserve the same media-in-case guard by attaching returned record URIs only after case/camera scope precheck and before auditing; workbench playback from detail stream, unified timeline coverage, coverage list, and case timeline now calls `GET /items/{reviewItemId}/playback-url` before emitting `viewVideo`, and uses only the backend returned `playbackUrl`; request `allowedCameraIds` can only narrow that scope, forged camera lists are denied and audited, `yfeieye.review.camera-permission` can fail closed, action-specific media permissions can be bound to the real `PermissionService`; `V20260706` seeds release `system_menu` button permissions for playback/export/download/manifest media actions; `V20260707` allows item-level media audit rows before a review case exists; review items now persist `tenant_id` with tenant-aware workbench/merge indexes; and `LiveDevice` can optionally verify deployed playback-url allow/deny decisions with `playback_url_granted` / `playback_url_denied` checkpoints. | Assign the seeded media permissions to release roles, replace configured camera maps with the final tenant/user/camera permission source, and run `ProdSmoke` with playback camera allow/deny params against deployed endpoints. |
| FR-24 | Runtime health and reconciliation | Tests cover health metrics, runtime reconcile, smoke checkpoints, `recordGapReasons`, `recordGapReasonCatalog`, storage drift notifications, reviewData schema drift, reviewSegment double-write drift, patrol action suggestions, outbox payload `action` hints, `SupervisionAlertReviewRuntimePatrolJob`, runtime outbox consumer job, publisher delivery confirmation before `published`, failed publish `retryCount/lastError`, configured station notify delivery, unconfigured notify routing failures that stay retryable, per-recipient notify delivery records, partial retry dedupe, pending-to-processing outbox claim before publisher delivery, stale `processing` claim timeout/reclaim without stealing fresh claims, scheduled report delivery messages, and paused scheduler seeds for patrol/outbox; `V20260708_6` adds runtime outbox claim columns/indexes. | Enable/tune the seeded jobs, configure station-notify recipients/templates or wire a separate final alert/report channel, and verify production scheduler execution across clustered nodes. |
| FR-25 | Runtime locks and patrol profile | Tests cover runtime patrol profile, locks, gap reasons, `configure_video_record_query_url` action, stale runtime lock recovery metadata, active-lock blocking, and conditional DB stale-lock takeover. | Run clustered deployment lock smoke across real scheduler nodes and verify stale-lock recovery under production clock skew. |
| FR-26 | Missing config degradation | Resolver failure now degrades to missing with standardized `video_url_not_configured`; runtime health exposes a standard missing-record reason catalog for unconfigured query, missing record space, missing file, probe failure, permission denial, and retention expiry; workbench displays item and health reason summaries, and the browser regression now proves the unconfigured VIDEO URL path renders as `缺录像/待手动补证` with `VIDEO URL 未配置`; compose defaults reduce local missing-config drift while env overrides can still intentionally degrade. | Prove live recording availability in production smoke. |
| FR-27 | Reproducible video export | VIDEO manifest stores file hash, source segment facts, clip params, ffmpeg command hash, persisted artifact storage references, lifecycle expiry/status, and preserves the original source hash after download audit refresh; synchronous and async VIDEO exports now return a stable manifest_url so LiveVideo can verify the persisted manifest, manifest v2 reproducibility fields, HMAC signature metadata, storage lifecycle metadata, reject local/mock/file returned export media references, and carry signer key/version metadata into smoke evidence. | Prove the same path with real VIDEO service recordings in production smoke. |
| FR-28 | Manifest v2 and verifier | Tests cover `manifestVersion=2`, `yfeieye.record-export.manifest.v2`, HMAC signature, HMAC keyring rotation by `keyId`, offline verifier wrapper, tampering, LiveVideo rejection of unsigned live export manifests, ProdSmoke evidence capture of manifest signature key/version metadata, and release-package scanning that blocks removal of that LiveVideo evidence contract. | Run verifier against production key custody/escrow and real exported evidence packages. |
| FR-29 | Rule semantic consistency | Tests cover bottom-center geometry, inertia frames, loitering seconds; workbench region drawer save now preserves `minStaySeconds`, `inertiaFrames`, and `loiteringSeconds` into review rule saves in the dev/API mock browser gate; `dev-api-real-drawer` now exercises the real `DeviceRegionDrawer` with mocked device-region/model APIs and verifies its saved region feeds the workbench rule payload; LiveDevice/ProdSmoke now require the backend integration smoke `review_rule_saved` checkpoint with `inertiaFrames=3` and `loiteringSeconds=20`. | Execute `ProdSmoke` against the release backend and real VIDEO/player services. |
| FR-30 | Event reverse status linkage | Review rows persist `reviewData.eventProjection`; `SupervisionAlertReviewEventReconcileJob` reconciles converted clues from event projection outside list query time; converted review items can still sync record evidence and export evidence packages but are guarded against late false-positive rollback; event rollback/rework projections now persist `conflictPolicy=keep_converted_review_item` plus conflict status metadata while the job summary reports conflict count; the workbench hides the false-positive action after conversion while keeping evidence and record coverage actions available; `V20260708_2` seeds the reconcile job paused. | Enable the seeded production scheduler job and run a real rollback/rework event smoke. |
| FR-31 | Review case lifecycle | Case grouping, timeline, clue dedupe, owner handoff, close state, closed-case add rejection, merge-to-target, split-to-new-case, source case `merged` status, `case_audit` entries, owner/close/merge/split controller command mapping, and workbench lifecycle controls are covered at service/store/controller/browser-contract level. | Run release smoke against the real backend and operator workflow. |
| FR-32 | Production smoke | Integration smoke now covers ingest -> rule save -> coverage -> case -> export -> verify -> download audit, with checkpoints and evidence audit trail regression; `LiveDevice` executes the deployed DEVICE endpoint and rejects missing checkpoint / invalid manifest / non-video-export responses, and can opt in to deployed playback-url allow/deny probes; `LiveVideo` covers the external VIDEO alert-record, coverage, record-base, recording DB/disk drift patrol, export, export download-ready, download URL reachability, manifest v2 reproducibility fields, and HMAC signature metadata without starting mocks, rejects local/mock/file endpoints and returned record/download/manifest media evidence by default, and emits `storageDriftSummary` plus `manifestSignature` key/version metadata in its CLI JSON; `ProdSmoke` now starts with `W2:typecheck`, then runs deployed workbench click-to-player seek assertions for detail stream, coverage, and case timeline as separate `LivePlayer:*` steps, requires playback allow/deny camera params, VIDEO drift retention config, all three player expected seek/record/offset inputs, rejects localhost/mock/file endpoints unless `--allow-local-endpoints` is explicitly supplied, passes that local-endpoint allowance through to `LiveVideo` and `LivePlayer:*`, stores sanitized child-smoke summaries plus sanitized step commands in the evidence JSON, including DEVICE review/export identifiers, LiveVideo signer key/version metadata, and whitelisted player entry/action/review/expected/actual seek evidence, fails even on child exit code 0 when required child evidence summaries are missing or incomplete, and rejects local/mock player media evidence in release mode. | Run `ProdSmoke` against real recordings, playback allow/deny camera scopes, and the release environment. |
| FR-33 | Semantic index operations | Queue/evaluation/reindex contracts now include a schedulable worker, failed-item retry, backlog alarm level, index version, rebuild progress, workbench-visible semantic ops status, and a paused semantic-index scheduler seed. | Enable/tune the seeded job and run it against a real semantic backlog. |
| FR-34 | AI provenance | AI summary `structuredData.aiProvenance` now returns provider, model, providerVersion, promptVersion, promptHash, redaction policy version, redaction status, redacted fields, human confirmation status, requester, and generated metadata; generation writes `case_audit.metadata` with provenance/hash counts and policy version; confirmation/rejection writes idempotent `ai_summary_confirmed` / `ai_summary_rejected` audit entries bound to prompt and summary hashes; provider requests redact reviewData sensitive keys plus timeline action notes/material URIs containing phone / ID values before prompt construction through `yfeieye.review.ai-summary.redaction.*` policy. | Sign off the production sensitive-key/value catalog and keep provider payload expansion behind the same sanitizer. |
| FR-35 | Operational reports | Shift and daily reports cover delivery plan, persisted/idempotent acknowledgement, release API/UI acknowledgement, same-reportKey delivery idempotency, scheduled delivery through `system_supervision_alert_review_runtime_outbox`, publisher-confirmed runtime outbox delivery, station-notify delivery through `NotifySendService`, per-recipient delivery dedupe, pending-to-processing claim before publish, stale processing claim reclaim, unreviewed backlog count/rate, missing-record rate, export failure rate, semantic backlog, false-positive rate, and responsibility-unit / area / camera / rule dimensions; `SupervisionAlertReviewOperationsReportJob` provides a schedulable report entry with `deliveryOutbox`, `V20260708_2` seeds paused shift/daily report jobs, `V20260708_3` persists operator acknowledgement by report key, `V20260708_4` seeds report notification templates, `V20260708_5` tracks runtime outbox delivery recipients, and `V20260708_6` tracks runtime outbox claim ownership. | Enable/tune the seeded report jobs, configure release recipients/templates, wire an external dashboard push if station notify is not enough, and run clustered release smoke against real operator dashboards. |
| FR-36 | Frontend E2E | Workbench E2E now has explicit `all`, `contract`, `dev-api-mock`, and `dev-api-real-drawer` modes, package-script aliases, invalid-mode runner coverage, exact player seek payload assertions, playback offset contract coverage, release player smoke tooling, region-rule save assertions, the release package verifier guards `WEB/package.json` so `type:check` cannot drop `vue-tsc --noEmit` unnoticed, and `ProdSmoke` executes `pnpm --dir WEB run type:check` before real-service smoke steps. | Keep rerunning full `vue-tsc` and real release API/player smoke execution as release blockers. |
| FR-37 | Chinese encoding quality | Workbench contract now rejects replacement characters and common mojibake fragments, asserts the required UTF-8 Chinese review/record/event labels, `alert-review-visible-copy-scan.mjs` covers workbench, player, patrol, playback utility, and VIDEO record/export visible-copy files, and the release package verifier now includes `WEB/src/api/device/patrol.ts` plus `WEB/src/utils/alertRecord*.ts` in the same text-quality gate while reusing the W4 mojibake pattern catalog. | Keep expanding W4 targets as new release-visible review/player/report files are added. |
| FR-38 | Traceability | This document maps FRs to evidence and remaining gates. | Keep it updated with endpoint, table, test, and deployment command per FR. |

## FR Traceability Register

Command aliases used below:

- `J1`: `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewControllerTest,SupervisionAlertReviewServiceTest,SupervisionAlertReviewMapperStoreTest,HttpVideoResolverTest,SupervisionSchemaSqlTest" -DfailIfNoTests=false test`
- `V1`: `python -m pytest test_record_export.py test_record_availability.py -q`
- `W1`: `pnpm test:alert-review-workbench`; split modes are `pnpm test:alert-review-workbench:contract`, `pnpm test:alert-review-workbench:dev-api-mock`, `pnpm test:alert-review-workbench:dev-api-real-drawer`, and runner validation `pnpm test:alert-review-workbench:runner`.
- `W2`: `pnpm run type:check`; full Vue SFC type checking must exit 0 from the release tree.
- `W3`: `pnpm test:alert-review-playback`; validates workbench-to-player `seek_time`, `record_start_time`, and `playback_offset_seconds` handoff.
- `W4`: `node .scripts/alert-review-visible-copy-scan.mjs`; scans workbench, player, patrol, playback utility, and VIDEO record/export visible-copy files for UTF-8 replacement characters and common mojibake fragments; `Pkg --require-clean` reuses the same mojibake pattern catalog for release-package text quality.
- `PG1`: `node .scripts/alert-review-postgres-migration-smoke.mjs --container=<postgres-container>` or `node .scripts/alert-review-postgres-migration-smoke.mjs --database-url=postgresql://.../postgres`; direct URL mode parses connection details into `PG*` environment variables so the password is not passed in `psql` argv; applies `V20260702`, `V20260704`, `V20260705`, `V20260706`, `V20260707`, `V20260708`, `V20260708_2`, `V20260708_3`, `V20260708_4`, `V20260708_5`, and `V20260708_6` to a temporary database and verifies FR-01 ingest identity, FR-03 review status/version stale writes and concurrent races, FR-19 ReviewData backfill, FR-20 ReviewSegment overlap and status-transition constraints, FR-23 media permission seeds, FR-23 item-level media audit lookup, FR-24/FR-30/FR-33/FR-35 paused scheduler seeds, FR-35 report acknowledgement DDL, runtime outbox notify template seeds, runtime outbox recipient delivery idempotency DDL, and runtime outbox claim columns/indexes against PostgreSQL.
- `Smoke`: `POST /system/supervision/alert-review/integration-smoke` against release DEVICE + real VIDEO recordings.
- `LiveDevice`: `node .scripts/alert-review-device-integration-smoke.mjs --device-base-url=... --token=... --operator-user-id=... --alert-time="YYYY-MM-DDTHH:mm:ss" [--playback-allowed-camera-ids=... --playback-denied-camera-ids=...]`; requires a deployed DEVICE service and fails unless the endpoint returns `passed`, `manifestValid=true`, `videoExportRequested=true`, and all ingest / coverage / case / export / verify / download-audit checkpoints; when playback camera params are supplied, it also requires playback URL allow/deny decisions to produce `playback_url_granted` and `playback_url_denied`.
- `LiveVideo`: `node .scripts/alert-review-video-live-smoke.mjs --alert-record-query-url=... --record-coverage-query-url=... --record-base-url=... --record-export-url=... --device-id=... --alert-time="YYYY-MM-DD HH:mm:ss" --record-drift-retention-hours=24`; requires a real VIDEO service and real recording metadata, rejects local/mock/file endpoints and returned `record_uri` / `download_url` / `manifest_url` media evidence unless `--allow-local-endpoints` is explicitly supplied for co-located real-service smoke, and fails unless the recording storage drift patrol is healthy, export status exposes a reachable `download_url`, and `manifest_url` manifest v2 includes ffmpeg command hash, source segment hashes, clip params, concat order, output hashes, and HMAC signature metadata (`algorithm`, `keyId`, signature version, value). Its CLI JSON prints `storageDriftSummary` plus `manifestSignature` key/version metadata for release evidence.
- `LivePlayer`: `node .scripts/alert-review-player-live-smoke.mjs --workbench-url=... --review-row-text=... --action-testid=alert-review-detail-seek --expected-seek-time=... --expected-record-path-contains=... --expected-offset-seconds=...`; requires a deployed workbench, auth state, and real recording-backed review row; local/mock workbench URLs and media evidence are rejected unless `--allow-local-endpoints` is supplied for co-located real-service smoke; `ProdSmoke` invokes it three times for detail stream, coverage, and case timeline.
- `ProdSmoke`: `node .scripts/alert-review-production-smoke.mjs --device-base-url=... --token=... --operator-user-id=... --device-alert-time=... --device-playback-allowed-camera-ids=... --device-playback-denied-camera-ids=... --video-alert-record-query-url=... --video-record-coverage-query-url=... --video-record-base-url=... --video-record-export-url=... --video-device-id=... --video-alert-time=... --video-record-drift-retention-hours=24 --player-workbench-url=... --player-review-row-text=... --player-expected-seek-time=... --player-expected-record-path-contains=... --player-expected-offset-seconds=... --player-coverage-expected-seek-time=... --player-coverage-expected-record-path-contains=... --player-coverage-expected-offset-seconds=0 --player-case-timeline-expected-seek-time=... --player-case-timeline-expected-record-path-contains=... --player-case-timeline-expected-offset-seconds=0`; runs `W2:typecheck`, `LiveDevice`, `LiveVideo`, and three `LivePlayer:*` steps sequentially and fails the release on the first failed type check, failed real-service smoke, missing child evidence summary, or local/mock player media evidence; localhost/mock/file endpoints are rejected unless `--allow-local-endpoints` is supplied for co-located real-service smoke and is propagated to VIDEO and player child smokes.
- `Pkg`: `node .scripts/verify-alert-review-release-package.mjs`; use `--require-clean` for a release artifact that must come only from HEAD.

| FR | API / entry point | Tables / artifacts | Primary tests | Acceptance command |
| --- | --- | --- | --- | --- |
| FR-01 | `POST /system/supervision/alert-review/clues/ingest`, `GET /items` | `system_supervision_alert_review_item`, `system_supervision_alert_review_ingest_identity`, `system_supervision_alert_review_evidence` | `ingestCluesMergesNearbyAlertSnapshotsAndRecordsIntoOneReviewItem`, `ingestDuplicatePayloadHashKeepsReviewItemIdempotentWithoutExtraEvidence`, `schemaDefinesIdempotencyAndLookupIndexes`, `alert-review-postgres-migration-smoke.mjs` | `J1`, `PG1`, `Smoke` |
| FR-02 | `GET /items/{reviewItemId}/timeline`, `GET /items/{reviewItemId}/playback-url`, `AlertReviewWorkbench.vue` | `system_supervision_alert_review_evidence`, workbench SFC, playback-url audit guard | `workbenchQueryAndSummarySupportEvidenceEventCaseAndReviewerPerspective`, workbench contract selectors, dev-api-mock `alert-review-list-playback` list playback event and playback preparation assertion | `J1`, `W1`, `LivePlayer` |
| FR-03 | `POST /items/{id}/review`, `/ignore`, `/false-positive`, `/user-status` | `system_supervision_alert_review_item`, `system_supervision_alert_review_user_status` | `reviewStatusCanBeConfirmedOrIgnoredBeforeConversion`, `reviewStatusActionsAreIdempotentAndRejectConflictingReviewerActions`, `updateReviewStatusRejectsConcurrentStatusConflict`, `userReviewStatusTracksMultipleReviewersIndependently`, `alert-review-postgres-migration-smoke.mjs` review status/version race smoke | `J1`, `PG1` |
| FR-04 | `POST /rules`, `POST /rules/geometry-evaluate` | `system_supervision_alert_review_rule` | `regionRuleSuppliesRuleCodeOnlyWhenZoneObjectAndStayTimeMatch`, `ruleGeometryAndReplayUseZoneInertiaAndLoiteringSemanticsFromSavedRule` | `J1` |
| FR-05 | `POST /items/{id}/to-event`, runtime reconciliation | `system_supervision_event`, `system_supervision_alert_review_item.review_data` | `convertReviewItemToSupervisionEventUsesReviewItemAsIdempotentSource`, `eventReconcileJobPersistsReverseEventProjectionOutsideListQuery` | `J1`, `Smoke` |
| FR-06 | `POST /items/{id}/record-evidence/retry`, `yfeieye.video.alert-record-query-url` | `system_supervision_alert_review_evidence`, VIDEO record metadata | `ingestWithoutRecordUriBackfillsRecordEvidenceWhenResolverFindsRecord`, `alertRecordResolverParsesVideoPayloadAndRewritesRelativePlaybackUrl` | `J1`, `Smoke` |
| FR-07 | `GET /items/{id}/record-coverage`, `GET /video/record/availability` | VIDEO record metadata, `system_supervision_alert_review_evidence` | `recordCoverageReturnsAvailableOrMissingWindowSegments`, `allowedRecordCoverageReadAuditsReturnedRecordUrisInEvidenceTrail`, `coverageResolverPreservesRetainModeSourceAndNonExportableReason`, `test_build_recording_availability_returns_available_missing_motion_and_export` | `J1`, `V1`, `Smoke` |
| FR-08 | `POST /items/{id}/false-positive`, `/rule-suggestion/*` | `system_supervision_alert_review_item.rule_suggestion`, `system_supervision_alert_review_rule`, workbench safety summary | `falsePositiveActionMarksStatusAndCreatesRuleSuggestion`, `lowSampleRuleSuggestionCannotBeAcceptedBeforeMoreReviewSamples`, `ruleSuggestionStatsAggregateFalsePositiveRateByCameraZoneLabelAndWindow`, workbench dev-api-mock rule suggestion safety summary and low-sample action hiding checks | `J1`, `W1` |
| FR-09 | `POST /cases`, `/cases/{id}/items/{itemId}`, `/case-candidates` | `system_supervision_alert_review_case`, `system_supervision_alert_review_case_item`, `system_supervision_alert_review_case_audit`, `reviewData.regulatoryArea` / `adjacentCameras` / `objectIds`, `reviewData.caseCandidateMatch`, `ConfiguredReviewCameraTopologyResolver` | `reviewCaseCollectsMultipleCameraCluesIntoOneTimeline`, `reviewCaseCandidatesUseAdjacentCameraZoneAndRegulatoryArea`, `reviewCaseCandidatesUseConfiguredCameraTopologyWhenReviewDataHasNoTopology`, workbench dev-api-mock topology candidate reason and add-to-case flow check | `J1`, `W1` |
| FR-10 | `GET /semantic-search`, `POST /semantic-index/reindex` | `system_supervision_alert_review_semantic_index` | `semanticSearchRanksReviewItemsByDetectionEvidenceContext`, `semanticSearchCanUseExternalProviderBeforeLocalKeywordFallback` | `J1` |
| FR-11 | `GET /cases/{id}/ai-summary`, `POST /cases/{id}/ai-summary/confirmation` | AI summary response payload with `structuredData.aiProvenance`, `system_supervision_alert_review_case_audit.metadata`, `ai_summary_confirmed` / `ai_summary_rejected` case audit entries, redacted provider prompt context, `ReviewAiSummaryRedactionPolicy` / `yfeieye.review.ai-summary.redaction.*` | `aiSummaryAndEvidenceExportUseCaseTimelineEvidenceCoverageAndActions`, `aiSummaryCanUseExternalProviderWithCaseTimelineContext`, `aiSummaryRedactsSensitiveReviewDataBeforeProviderAndAuditProvenance`, `aiSummaryRedactsTimelineNotesAndMaterialUrisBeforeProvider`, `aiSummaryRedactionPolicyCanBeOverriddenAndRecordedInProvenance`, `aiSummaryConfirmationKeepsGeneratedProvenanceAndIsIdempotentForSameStatus`, `aiSummaryConfirmationRequiresGeneratedSummaryAudit` | `J1` |
| FR-12 | `POST /cases/{id}/evidence-export`, `POST /cases/{id}/evidence-export-jobs`, `POST /video/record/export` | `system_supervision_alert_review_export_job`, VIDEO export store | `evidenceExportCreatesReadyJobWithIntegrityAuditAndEventBinding`, `test_record_export_route_posts_to_service` | `J1`, `V1`, `Smoke` |
| FR-13 | `GET /items/{id}/detail-stream`, workbench seek action | `reviewData.reviewSegment`, `system_supervision_alert_review_segment`, `DialogPlayer` playback payload, `.scripts/alert-review-player-live-smoke.mjs` | `reviewDetailStreamExpandsObjectsDetectionsAndSeekTimes`, workbench `alert-review-detail-seek`, `alert-review-coverage-seek`, and `alert-review-case-timeline-seek` payload assertions, `alert-review-playback-contract.test.mjs`, `alert-review-player-live-smoke.test.mjs` | `J1`, `W1`, `W3`, `LivePlayer` |
| FR-14 | `GET/POST /video/record/export/{export_id}`, retry, audit, download routes, DEVICE `processEvidenceExportQueue`, `supervisionAlertReviewEvidenceExportWorkerJob` | VIDEO export persistence, manifest files, DEVICE export job row and signed worker manifest metadata, `V20260708_2__alert_review_scheduler_jobs.sql` paused seed | `test_async_record_export_worker_moves_job_to_ready_with_hash_and_download`, `test_failed_async_record_export_can_retry_and_records_download_audit`, `evidenceExportWorkerRebuildsFailedJobsAndLeavesReplayableManifest`, `alert-review-postgres-migration-smoke.mjs` scheduler seed assertion | `V1`, `J1`, `PG1`, `Smoke` |
| FR-15 | `POST /items/{id}/rule-suggestion/status`, `/revert`, `/rules/replay`, workbench rule action buttons | `system_supervision_alert_review_rule`, rule suggestion payload, controller permission annotations, `AlertReviewWorkbench.vue` permission gating | `ruleSuggestionGovernanceEndpointsDeclareApprovalPermissions`, `ruleSuggestionSafeApplyRequiresApprovalAndStoresShadowEvaluation`, `falsePositiveRuleSuggestionAppliesRuleConfigOnlyAfterApprovalAndCanRollback`, workbench rule governance permission contract | `J1`, `W1` |
| FR-16 | `POST /semantic-index/queue`, `POST /operations-report`, `POST /operations-report/acknowledgement`, operations report service path | `system_supervision_alert_review_semantic_index`, `ReviewSemanticTriggerResult.hitExplanations` / `actionPreviews` / `humanConfirmationStatus`, `ReviewOperationsReport.deliveryPlan` / `acknowledgement`, `system_supervision_alert_review_report_ack`, `system_supervision_alert_review_runtime_outbox` `review_operations_report` payload, `system_supervision_alert_review_runtime_outbox_delivery`, `ReviewRuntimeOutboxPublisher`, `NotifyReviewRuntimeOutboxPublisher`, `ReviewRuntimeOutboxNotifyProperties`, `ReviewRuntimeOutboxNotifyDeliveryStore`, `V20260708_4__alert_review_runtime_outbox_notify_templates.sql`, `V20260708_5__alert_review_runtime_outbox_delivery.sql`, workbench operations report acknowledgement cell | `semanticTriggerMatchesIndexedItemsAndReturnsActions`, `shiftReportSummarizesReviewItemsAndEvidenceGaps`, `operationsReportAcknowledgementPersistsForSameReportScopeAndIsIdempotent`, `operationsReportEndpointsExposeAcknowledgementContractAndUseLoginUser`, workbench operations report acknowledgement contract, `dailyReportAggregatesOperationalMetricsByUnitAreaCameraAndRule`, `operationsReportJobGeneratesScheduledShiftAndDailyReports`, `runtimeOutboxPublisherFailureMarksMessageFailedForRetry`, `NotifyReviewRuntimeOutboxPublisherTest`, `alertReviewRuntimeOutboxNotifyMigrationSeedsTemplates`, `alertReviewRuntimeOutboxDeliveryMigrationTracksRecipientIdempotency` | `J1`, `W1`, `PG1` |
| FR-17 | `GET /cases/{id}/evidence-audit`, `POST /evidence-export-jobs/{jobNo}/downloads` | `system_supervision_alert_review_case_audit`, `system_supervision_alert_review_export_job` | `evidenceAuditTrailListsHashesExporterDownloadsAndBoundEvents`, `evidenceAuditTrailIncludesMediaAccessReadsWithOperatorAndReverseLookup`, `allowedRecordCoverageReadAuditsReturnedRecordUrisInEvidenceTrail`, `evidenceManifestV2AndVerifierReconstructDecisionTrailAndAuditChain` | `J1`, `V1` |
| FR-18 | `POST /rules/replay` | `system_supervision_alert_review_rule`, rule suggestion replay report payload, workbench replay report explanation | `ruleSuggestionSafeApplyRequiresApprovalAndStoresShadowEvaluation`, `ruleReplayEvaluatesHistoricalItemsBeforeApplyingRuleChange`, `ruleGeometryUsesBottomCenterSemanticsAndReplayRequiresSafeVersionLifecycle`, workbench dev-api-mock replay explanation check | `J1`, `W1` |
| FR-19 | ReviewData JSON in ingest/update paths | `system_supervision_alert_review_item.review_data`, `alert-review-review-data-v1.schema.json`, `V20260705__alert_review_review_data_backfill.sql` | `reviewItemKeepsFrigateLikeReviewDataFromDetectionContext`, `reviewDataJsonSchemaArtifactDefinesVersionedFrigateReviewFields`, `alertReviewReviewDataBackfillMigrationNormalizesLegacyRows`, `alert-review-postgres-migration-smoke.mjs` | `J1`, `PG1` |
| FR-20 | `GET /items/{id}/review-segment`, `POST /items/{id}/lifecycle` | `system_supervision_alert_review_segment`, `V20260702__alert_review_frigate_hardening.sql`, `V20260704__alert_review_segment_tenant_scope.sql`, `V20260708__alert_review_segment_status_transition.sql` | `concurrentIngestKeepsSingleActiveReviewSegmentForSameCameraWindow`, `reviewSegmentLifecycleRejectsEndedExtensionOverlappingLaterActiveSegment`, `reviewSegmentOverlapUsesHalfOpenIntervalsSoAdjacentSegmentsCanSplitCleanly`, `createRejectsOverlappingReviewSegmentBeforeSegmentInsert`, `createPersistsNonEndedReviewSegmentAsOpenInterval`, `createRejectsReviewSegmentWithoutCameraBeforeSegmentInsert`, `createRejectsInvalidReviewSegmentStatusBeforeSegmentInsert`, `alertReviewSegmentTenantScopeMigrationKeepsStatusAndSeverityConstraints`, local PostgreSQL tenant-scope migration smoke with open active overlap, status downgrade/reopen rejection, and concurrent ReviewSegment race cases | `J1`; release PostgreSQL migration smoke rerun required |
| FR-21 | `HttpAlertRecordEvidenceResolver`, `HttpVideoRecordCoverageResolver`, docker compose env | `application.yaml`, `DEVICE/docker-compose.yml`, `.scripts/alert-review-video-live-smoke.mjs` | `dockerComposeWiresReviewVideoUrlsToRealVideoRecordEndpointsByDefault`, `videoEvidenceExportProviderPostsExportWindowAndRewritesRelativeExportUrl`, `alert-review-video-live-smoke.test.mjs` | `J1`, `LiveVideo`, `Smoke` |
| FR-22 | `GET /video/record/space/{space_id}/videos/drift`, runtime patrol, `LiveVideo` drift checkpoint | VIDEO DB/file metadata, runtime health payload | `test_recording_storage_drift_patrol_reports_missing_expired_disk_and_cache_failures`, `runtimePatrolSurfacesRecordStorageDriftReasonsFromStorageSync`, `runtimeHealthExposesStandardRecordGapReasonCatalogAndNormalizesAliases`, `alert-review-video-live-smoke.test.mjs` | `J1`, `V1`, `LiveVideo`, `Smoke` |
| FR-23 | Media access guard on timeline, coverage, export, verify, download, playback URL preparation | audit entries in case audit store, item-level media audit lookup, permission resolver config, `PermissionService` action gate, `V20260706__alert_review_media_permissions.sql`, `V20260707__alert_review_item_media_audit.sql`, workbench backend playback URL preparation guard, `GET /items/{reviewItemId}/playback-url` | `evidenceExportRejectsUnauthorizedCameraMediaAndAuditsDenial`, `recordCoverageRejectsUnauthorizedCameraMediaAndAuditsDenial`, `allowedRecordCoverageReadAuditsReturnedRecordUrisInEvidenceTrail`, `manifestVerificationRejectsUnauthorizedCameraMediaAndAuditsDenial`, `evidencePackageVerificationRejectsUnauthorizedCameraMediaAndAuditsDenial`, `requestedCameraScopeCannotExpandServiceSideCameraPermission`, `evidencePackageVerificationUsesLoginUserInsteadOfRequestOperator`, `playbackUrlPreparationEnforcesCameraScopeAndAuditsAllowDeny`, `playbackUrlEndpointUsesLoginUserAndPreparesAuditedPlayback`, `configuredScopesRequireRealActionPermissionWhenPermissionServiceIsPresent`, `actionPermissionKeysAreNormalizedBeforeGateLookup`, `alertReviewMediaPermissionMigrationSeedsMenuPermissions`, `preCaseMediaAccessAuditRecordsAllowDenyAndCanBeListedByReviewItem`, `alertReviewItemMediaAuditMigrationAllowsPreCaseAuditRows`, `alert-review-postgres-migration-smoke.mjs`, `alert-review-device-integration-smoke.test.mjs` playback URL allow/deny probe, workbench contract/dev-api-mock playback preparation checks | `J1`, `PG1`, `W1`, `LiveDevice`; real tenant/camera resolver and deployed playback URL smoke still required |
| FR-24 | `GET /runtime-health`, `POST /runtime-reconcile`, `POST /runtime-patrol` | `system_supervision_alert_review_runtime_*`, `system_supervision_alert_review_runtime_outbox_delivery`, runtime outbox claim columns, `recordGapReasonCatalog` payload, `ReviewRuntimeOutboxPublisher`, `ReviewRuntimeOutboxDeliveryResult`, `NotifyReviewRuntimeOutboxPublisher`, `ReviewRuntimeOutboxNotifyProperties`, `ReviewRuntimeOutboxNotifyDeliveryMapperStore`, `V20260708_2__alert_review_scheduler_jobs.sql`, `V20260708_4__alert_review_runtime_outbox_notify_templates.sql`, `V20260708_5__alert_review_runtime_outbox_delivery.sql`, `V20260708_6__alert_review_runtime_outbox_claim.sql` | `reviewReconciliationRepairsRecordAndSemanticDriftAndReportsHealthMetrics`, `runtimePatrolAndOutboxJobsCloseScheduledAlertDispatchLoop`, `runtimeOutboxPublisherFailureMarksMessageFailedForRetry`, `runtimeOutboxPublishingClaimsPendingMessagesBeforeDelivery`, `runtimeOutboxPublishingReclaimsOnlyStaleProcessingMessages`, `runtimeOutboxClaimSqlReclaimsStaleProcessingRowsWithSkipLocked`, `runtimeHealthExposesStandardRecordGapReasonCatalogAndNormalizesAliases`, `NotifyReviewRuntimeOutboxPublisherTest`, `alert-review-postgres-migration-smoke.mjs` scheduler, notify template, delivery idempotency, and claim-column assertions | `J1`, `PG1`; clustered release execution still required |
| FR-25 | runtime lock/run/outbox service path | `system_supervision_alert_review_runtime_lock`, `runtime_run`, `runtime_outbox` | `runtimePatrolProfileTraceAndGapReasonsHardenReviewOperations`, `runtimePatrolAndOutboxJobsCloseScheduledAlertDispatchLoop`, `runtimePatrolRecoversExpiredClusterLockAndReportsPreviousOwner` | `J1`; release clustered lock smoke required |
| FR-26 | missing VIDEO URL resolver branch, UI record reason display | `application.yaml`, workbench record reason labels, runtime gap reason catalog | `alertRecordResolverReportsVideoUrlNotConfiguredWhenUrlIsEmpty`, `runtimeHealthReportsVideoUrlNotConfiguredReasonWhenResolverIsUnconfigured`, `runtimeHealthExposesStandardRecordGapReasonCatalogAndNormalizesAliases`, workbench dev-api-mock missing-config UI fallback label check | `J1`, `W1` |
| FR-27 | VIDEO export manifest source segment path | VIDEO manifest files and export artifacts | `test_real_ffmpeg_export_keeps_original_source_hash_after_download_audit`, `test_manifest_hmac_signature_verifier_checks_files_source_segments_and_clip_params` | `V1`, `Smoke` |
| FR-28 | `/video/record/export/{id}/manifest`, offline verifier | `record_export_manifest_verifier.py`, `.scripts/record-export-manifest-verifier.mjs`, manifest v2 JSON | `test_manifest_verifier_cli_validates_canonical_hash_signature_and_tampering`, `test_manifest_hmac_signature_verifier_checks_files_source_segments_and_clip_params`, `test_manifest_hmac_keyring_verifier_uses_manifest_key_id_after_rotation` | `V1`, `Pkg`; production key escrow smoke required |
| FR-29 | `POST /rules/geometry-evaluate`, rule drawer path, `POST /integration-smoke` | `system_supervision_alert_review_rule.geometry`, workbench region drawer save payload, integration smoke checkpoints | `ruleGeometryUsesBottomCenterSemanticsAndReplayRequiresSafeVersionLifecycle`, `ruleGeometryAndReplayUseZoneInertiaAndLoiteringSemanticsFromSavedRule`, workbench `saveAlertReviewRule` payload assertion for `inertiaFrames` and `loiteringSeconds`, workbench real `DeviceRegionDrawer` save smoke, `integrationSmokeCoversReviewRecordCaseExportAndManifestVerification`, `alert-review-device-integration-smoke.test.mjs`, `alert-review-production-smoke.test.mjs` | `J1`, `W1`, `LiveDevice`, `ProdSmoke`; release execution still required |
| FR-30 | event projection reconciliation path | `system_supervision_alert_review_item.event_id`, `review_data.eventProjection`, workbench converted action boundary, event reconcile job `conflict` summary, `V20260708_2__alert_review_scheduler_jobs.sql` | `convertedReviewItemCarriesLinkedEventProjection`, `eventReconcileKeepsConvertedItemWhenEventRollbackRequiresRework`, `convertedReviewItemAllowsEvidenceHardeningButRejectsFalsePositiveRollback`, workbench dev-api-mock converted row hides false-positive while keeping evidence and coverage actions, `alert-review-postgres-migration-smoke.mjs` scheduler seed assertion | `J1`, `W1`, `PG1` |
| FR-31 | `/cases/{id}/owner`, `/close`, `/merge`, `/split` | `system_supervision_alert_review_case*` | `reviewCaseLifecycleKeepsOwnerDedupCloseAndAuditTrail`, `reviewCaseMergeAndSplitMoveCluesWithAuditTrail`, `caseLifecycleEndpointsMapHttpRequestsToServiceCommands` | `J1`, `W1` |
| FR-32 | `POST /integration-smoke`, `GET /items/{reviewItemId}/playback-url`, `alert-review-device-integration-smoke.mjs`, `alert-review-video-live-smoke.mjs`, `alert-review-player-live-smoke.mjs`, `alert-review-production-smoke.mjs` | smoke result payload, evidence audit chain, deployed DEVICE checkpoint assertion, playback URL allow/deny probe checkpoints, real VIDEO endpoint checkpoints, export download readiness, download URL reachability, manifest v2 reproducibility fields, deployed detail/coverage/case-timeline player seek payloads, one-command production smoke orchestration, W2 typecheck preflight, sanitized production-smoke evidence report with child summaries, sanitized step commands, DEVICE audit identifiers, and LivePlayer entry/action/review/expected/actual seek summaries | `integrationSmokeCoversReviewRecordCaseExportAndManifestVerification`, workbench mock checkpoint `evidence_download_audited`, `alert-review-device-integration-smoke.test.mjs`, `alert-review-video-live-smoke.test.mjs`, `alert-review-player-live-smoke.test.mjs`, `alert-review-production-smoke.test.mjs` | `J1`, `W1`, `W2`, `ProdSmoke`, `Smoke` |
| FR-33 | `POST /semantic-index/queue`, `GET /semantic-index/evaluation`, `supervisionAlertReviewSemanticIndexJob`, workbench semantic ops panel | `system_supervision_alert_review_semantic_index`, `AlertReviewWorkbench.vue`, `V20260708_2__alert_review_scheduler_jobs.sql` | `semanticIndexQueueSupportsAsyncBacklogEvaluation`, `semanticReindexPersistsLifecycleAndSearchCanUseIndexedDocument`, `semanticIndexWorkerRetriesFailuresAndReportsBacklogProgress`, workbench dev-api-mock semantic backlog/progress UI check, `alert-review-postgres-migration-smoke.mjs` scheduler seed assertion | `J1`, `W1`, `PG1`; production scheduler/backlog smoke required |
| FR-34 | AI summary provider path and confirmation endpoint | AI summary `structuredData.aiProvenance`, `ai_summary_generated` case audit metadata, redaction policy version, redacted reviewData/timeline provider context, `ai_summary_confirmed` / `ai_summary_rejected` audit transitions | `aiSummaryCanUseExternalProviderWithCaseTimelineContext`, `aiSummaryRedactsSensitiveReviewDataBeforeProviderAndAuditProvenance`, `aiSummaryRedactsTimelineNotesAndMaterialUrisBeforeProvider`, `aiSummaryRedactionPolicyCanBeOverriddenAndRecordedInProvenance`, `aiSummaryConfirmationKeepsGeneratedProvenanceAndIsIdempotentForSameStatus`, `aiSummaryConfirmationRequiresGeneratedSummaryAudit`, `reviewIntelligenceProviderKeepsStructuredSummaryData`, `alertReviewTablesKeepClueEvidenceAndRegionRuleFields` | `J1`; production catalog signoff before release |
| FR-35 | operations report service path, release API, workbench acknowledgement action, and scheduler entry | report payload, report delivery plan, persisted acknowledgement, `system_supervision_alert_review_report_ack`, `system_supervision_alert_review_runtime_outbox` `deliver_operations_report` payload, `system_supervision_alert_review_runtime_outbox_delivery`, runtime outbox claim fields, `ReviewRuntimeOutboxPublisher`, `NotifyReviewRuntimeOutboxPublisher`, runtime health metrics, report dimension maps, `SupervisionAlertReviewOperationsReportJob`, `V20260708_2__alert_review_scheduler_jobs.sql` shift/daily seeds, `V20260708_3__alert_review_report_ack.sql` acknowledgement DDL, `V20260708_4__alert_review_runtime_outbox_notify_templates.sql` notify template seeds, `V20260708_5__alert_review_runtime_outbox_delivery.sql` delivery DDL, `V20260708_6__alert_review_runtime_outbox_claim.sql` claim DDL | `shiftReportSummarizesReviewItemsAndEvidenceGaps`, `operationsReportAcknowledgementPersistsForSameReportScopeAndIsIdempotent`, `operationsReportEndpointsExposeAcknowledgementContractAndUseLoginUser`, workbench operations report acknowledgement contract, `dailyReportAggregatesOperationalMetricsByUnitAreaCameraAndRule`, `operationsReportJobGeneratesScheduledShiftAndDailyReports`, `runtimeOutboxPublisherFailureMarksMessageFailedForRetry`, `runtimeOutboxPublishingClaimsPendingMessagesBeforeDelivery`, `runtimeOutboxPublishingReclaimsOnlyStaleProcessingMessages`, `NotifyReviewRuntimeOutboxPublisherTest`, `runtimePatrolProfileTraceAndGapReasonsHardenReviewOperations`, `runtimePatrolAndOutboxJobsCloseScheduledAlertDispatchLoop`, `alert-review-postgres-migration-smoke.mjs` operations report, notify template, delivery idempotency, and claim-column assertions | `J1`, `W1`, `PG1` |
| FR-36 | workbench browser contract harness and release player smoke | `WEB/scripts/fixtures/alert-review-workbench-e2e/*`, `WEB/scripts/alert-review-workbench-e2e-check.mjs`, `WEB/scripts/alert-review-workbench-e2e-check.test.mjs`, `WEB/scripts/alert-review-playback-contract.test.mjs`, `.scripts/alert-review-player-live-smoke.mjs`, `.scripts/alert-review-production-smoke.mjs` W2 preflight | `alert-review-workbench-e2e-check.mjs --mode=contract`, `--mode=dev-api-mock`, `--mode=dev-api-real-drawer`, invalid-mode runner test, playback offset contract test, player live smoke self-test, production smoke W2 step test | `W1`, `W2`, `W3`, `LivePlayer`, `ProdSmoke`; real release API smoke still required |
| FR-37 | UTF-8 copy guard in workbench contract and release visible-copy scan | workbench SFC, player components, patrol API, VIDEO record/export services, contract script | required Chinese copy guard, shared W4/release-package mojibake catalog, `alert-review-visible-copy-scan.mjs`, 2026-07-04 UTF-8 mojibake scan | `W1`, `W2`, `W4`, `Pkg` |
| FR-38 | this traceability register and release package gate | `docs/requirements/alert-review-frigate-fr01-fr38-hardening-review.md`, `.scripts/verify-alert-review-release-package.mjs` | documentation grep for FR coverage and release gates, `verify-alert-review-release-package.test.mjs` | `rg "FR-0[1-9]|FR-[1-3][0-9]" docs/requirements/alert-review-frigate-fr01-fr38-hardening-review.md`, `Pkg` |

## Release Packaging Audit

Current local audit started on 2026-07-04: the FR implementation had been staged as one intentional pre-commit release package. The executable `Pkg` gate first reported 75 FR release blockers (67 untracked files and 8 unstaged files); after targeted staging it passed in default pre-commit mode. On 2026-07-05 the verifier was extended to include `V20260704`, PG1 PostgreSQL smoke tooling, the workbench runner test, and `WEB/src/utils/withInstall.ts`. On 2026-07-06 it also tracks the offline manifest verifier wrapper, `V20260705` ReviewData backfill migration, and `V20260706` media permission seed migration. On 2026-07-07 it also tracks `WEB/src/api/device/patrol.ts` so patrol visible-copy encoding drift cannot sit outside the release package text scan, validates that `WEB/package.json` keeps a `type:check` gate backed by `vue-tsc --noEmit`, and shares the W4 mojibake pattern catalog with the release-package text-quality gate. On 2026-07-08, `LiveVideo` and `ProdSmoke` also guard standalone/live VIDEO smoke evidence against accidental local/mock/file endpoints and returned media evidence unless local endpoint allowance is explicit, `Pkg` blocks removal of LiveVideo manifest signature/verifier evidence propagation, `V20260708` adds a DB trigger for ReviewSegment status downgrade/reopen rejection, `V20260708_2` seeds paused alert-review scheduler jobs, `V20260708_3` persists operations report acknowledgements, `V20260708_4` seeds runtime outbox notify templates, `V20260708_5` tracks runtime outbox recipient delivery idempotency, `V20260708_6` tracks runtime outbox claim ownership, and `Pkg` now tracks `WEB/src/utils/alertRecord*.ts` plus `NotifyReviewRuntimeOutboxPublisherTest` so playback utility and runtime notify regression drift cannot sit outside the release package. `Pkg --require-clean` remains a release-artifact blocker until the package is committed and the release is built from HEAD.

| Package group | Current examples | Current state | Release action |
| --- | --- | --- | --- |
| DEVICE review backend | `SupervisionAlertReviewController.java`, `SupervisionAlertReviewServiceImpl.java`, review DOs, mapper store, resolver/provider classes | Staged in the FR pre-commit package | Keep as one intentional FR backend package or the workbench endpoints will not exist after release |
| DEVICE schema and migration | `supervision_event_closure_v1.sql`, `V20260702__alert_review_frigate_hardening.sql`, `V20260704__alert_review_segment_tenant_scope.sql`, `V20260705__alert_review_review_data_backfill.sql`, `V20260706__alert_review_media_permissions.sql`, `V20260707__alert_review_item_media_audit.sql`, `V20260708__alert_review_segment_status_transition.sql`, `V20260708_2__alert_review_scheduler_jobs.sql`, `V20260708_3__alert_review_report_ack.sql`, `V20260708_4__alert_review_runtime_outbox_notify_templates.sql`, `V20260708_5__alert_review_runtime_outbox_delivery.sql`, `V20260708_6__alert_review_runtime_outbox_claim.sql`, `SupervisionSchemaSqlTest.java` | Staged in the FR pre-commit package | Commit schema baseline and production migrations; run PostgreSQL smoke with `btree_gist` before deploy |
| DEVICE regression tests | `SupervisionAlertReviewServiceTest.java`, `SupervisionAlertReviewControllerTest.java`, `NotifyReviewRuntimeOutboxPublisherTest.java`, `HttpVideoResolverTest.java`, mapper/schema/permission tests | Staged in the FR pre-commit package | Keep tests with the feature package so future FR regressions remain executable |
| VIDEO evidence package | `record_export_service.py`, `record_video_service.py`, `record_export_manifest_verifier.py`, `.scripts/record-export-manifest-verifier.mjs`, `test_record_export.py`, `test_record_availability.py` | Staged in the FR pre-commit package | Commit together with real recording smoke |
| WEB workbench package | `AlertReviewWorkbench.vue`, `WEB/src/api/supervision/alertReview.ts`, workbench E2E script and fixtures | Staged in the FR pre-commit package | Commit workbench assets and run contract plus full frontend type gate before publishing |
| Documentation | This FR-01 to FR-38 hardening review document | Staged in the FR pre-commit package | Keep with release notes so each FR maps to API, artifact, test, and gate |
| Release gate tooling | `.scripts/verify-alert-review-release-package.mjs`, `.scripts/verify-alert-review-release-package.test.mjs`, `.scripts/record-export-manifest-verifier.mjs`, `.scripts/alert-review-postgres-migration-smoke.mjs`, `.scripts/alert-review-postgres-migration-smoke.test.mjs`, `.scripts/alert-review-device-integration-smoke.mjs`, `.scripts/alert-review-device-integration-smoke.test.mjs`, `.scripts/alert-review-production-smoke.mjs`, `.scripts/alert-review-production-smoke.test.mjs` | Staged in the FR pre-commit package | Commit the verifier and smoke tooling so packaging, migration, and deployed production smoke drift are checked before every release |

Release packaging gates:

- `git status --short --untracked-files=all` must show no FR core implementation file as `??` after intentional staging or release packaging.
- `node .scripts/verify-alert-review-release-package.test.mjs` and `node .scripts/alert-review-postgres-migration-smoke.test.mjs` must pass, then `node .scripts/verify-alert-review-release-package.mjs` must pass before commit packaging; run it again with `--require-clean` after commit and before building a HEAD-only release artifact.
- `J1`, `V1`, `W1`, `W2`, and `PG1` must be rerun from the packaged tree, not only from the loose worktree.
- Full `pnpm type:check` must exit cleanly before release; the lightweight `tsc --allowJs false` check only proves ordinary TypeScript files.
- The production migration `DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260702__alert_review_frigate_hardening.sql` has local PostgreSQL 16 `btree_gist` smoke coverage for tenant-scoped historical segment overlap; rerun it against the release database shape before deploy.
- The release smoke must use real DEVICE and VIDEO services, with configured alert record, record coverage, export, manifest, download audit, detail-stream seek, and case/event reverse-link paths.
- Do not ship while the worktree-only FR files remain outside the release package, while `pnpm run type:check` fails, or before real VIDEO recording smoke proves playable/exportable evidence.

Manifest verifier and HMAC key rotation:

- Sign new exports with `YFEIEYE_RECORD_EXPORT_HMAC_KEYS='{"2026-q3":"<active-secret>","2026-q2":"<previous-secret>"}'` and `YFEIEYE_RECORD_EXPORT_ACTIVE_KEY_ID=2026-q3`; the legacy `YFEIEYE_RECORD_EXPORT_HMAC_SECRET` / `YFEIEYE_RECORD_EXPORT_KEY_ID` pair remains supported for non-keyring deployments.
- Keep retired keys in the verifier keyring until every manifest signed by that `keyId` has expired or been archived with an escrowed verifier bundle; the verifier reads the manifest `signature.keyId` rather than the current active key.
- Verify release evidence with `node .scripts/record-export-manifest-verifier.mjs --manifest <manifest.json>` from the packaged tree, then archive the verifier output with the evidence package download audit.

## Required Release Gates

### P0 gates

- Java regression:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewControllerTest,SupervisionAlertReviewServiceTest,SupervisionAlertReviewMapperStoreTest,HttpVideoResolverTest,SupervisionSchemaSqlTest" -DfailIfNoTests=false test`
- VIDEO regression:
  `python -m pytest test_record_export.py test_record_availability.py -q`
- PostgreSQL migration smoke:
  `node .scripts/alert-review-postgres-migration-smoke.mjs --container=<postgres-container>`
  or `node .scripts/alert-review-postgres-migration-smoke.mjs --database-url=postgresql://.../postgres`
- Workbench contract:
  `pnpm test:alert-review-workbench`
- Full frontend type baseline:
  `pnpm type:check`
- Production smoke with real VIDEO URLs:
  `node .scripts/alert-review-production-smoke.mjs --device-base-url=... --token=... --operator-user-id=... --device-alert-time=... --device-playback-allowed-camera-ids=... --device-playback-denied-camera-ids=... --video-alert-record-query-url=... --video-record-coverage-query-url=... --video-record-base-url=... --video-record-export-url=... --video-device-id=... --video-alert-time=... --video-record-drift-retention-hours=24 --player-workbench-url=... --player-review-row-text=... --player-expected-seek-time=... --player-expected-record-path-contains=... --player-expected-offset-seconds=... --player-coverage-expected-seek-time=... --player-coverage-expected-record-path-contains=... --player-coverage-expected-offset-seconds=0 --player-case-timeline-expected-seek-time=... --player-case-timeline-expected-record-path-contains=... --player-case-timeline-expected-offset-seconds=0 --evidence-output-file=artifacts/production-smoke.json`

### P1 gates

- Region drawer saves `inertiaFrames` and `loiteringSeconds` and replay explains them.
- False-positive suggestions cannot apply live rules without accepted approval.
- Case lifecycle service/store/controller/browser contract supports dedupe, merge, split, owner, close, audit, and HTTP command mapping; release hardening still needs real backend/operator smoke.
- Runtime patrol, runtime outbox, event reverse reconciliation, semantic indexing, and shift/daily operations reports have paused scheduler seeds; event rollback conflict policy is code-covered, station-notify outbox delivery is available behind `yfeieye.review.runtime-outbox.notify.enabled`, and production release must enable/tune scheduler triggers, configure recipients/templates or wire the final external delivery sink, and run real rollback/rework plus backlog/report smokes.

### P2 gates

- ReviewData production backfill is now represented by `V20260705`; release still must rerun `PG1` against the release database shape.
- Production HMAC key custody/escrow smoke for the manifest verifier.
- Semantic worker production schedule and real backlog smoke.
- Shift/daily report with responsibility, area, camera, and rule dimensions.

## Latest Local Verification

2026-07-03 to 2026-07-08 local checks:
- FR-21/FR-32 VIDEO live-smoke endpoint safety passed after the RED failure showed standalone `LiveVideo` accepted local/mock endpoints and `ProdSmoke --allow-local-endpoints` did not pass that intent to the child VIDEO smoke:
  `node .scripts/alert-review-video-live-smoke.test.mjs`
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed with `Unknown argument: --allow-local-endpoints` and a missing child-step flag assertion; GREEN reruns passed after `LiveVideo` rejected local/mock/file endpoints by default, allowed explicit co-located local smoke, and `ProdSmoke` propagated `--allow-local-endpoints` to `LiveVideo`.

- FR-21/FR-27/FR-32 LiveVideo returned media evidence safety passed after the RED failure showed a real-looking release endpoint could still return mock/local `record_uri`, `download_url`, or `manifest_url` and satisfy the smoke:
  `node .scripts/alert-review-video-live-smoke.test.mjs`
  Result: RED first failed with `Missing expected rejection`; GREEN rerun passed after `LiveVideo` rejected local/mock/file returned record, download, and manifest media evidence in release mode while keeping explicit local-endpoint smoke allowed.

- FR-27/FR-28 LiveVideo manifest signature gate passed after the RED failure showed unsigned live export manifests still satisfied the VIDEO smoke:
  `node .scripts/alert-review-video-live-smoke.test.mjs`
  Result: RED first failed with `Missing expected rejection`; GREEN rerun passed after `LiveVideo` required `signature.algorithm=hmac-sha256`, `keyId`, signature version, and an `hmac-sha256:` signature value before accepting a manifest v2 export.

- FR-27/FR-28/FR-32 LiveVideo manifest signature evidence passed after the RED failure showed accepted manifest signature metadata was not preserved in CLI or production smoke evidence:
  `node .scripts/alert-review-video-live-smoke.test.mjs`
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed with `manifestSignature` undefined; GREEN reruns passed after `LiveVideo` returned and summarized signer `algorithm`, `keyId`, and signature version, and `ProdSmoke` whitelisted that summary into its sanitized evidence report.

- FR-28 release-package LiveVideo signature evidence gate passed after the RED failure showed `Pkg` did not prevent deleting manifest signature evidence propagation:
  `node .scripts/verify-alert-review-release-package.test.mjs`
  Result: RED first failed because `scanLiveVideoEvidenceGate` was missing; GREEN rerun passed after `Pkg` began scanning `LiveVideo` for `validateManifestSignature` / `manifestSignature` / `hmac-sha256` / `keyId` / signature version and `ProdSmoke` for manifest signature summary forwarding.

- FR-03 PostgreSQL reviewer status race smoke passed after the RED failure showed `PG1` had no review status/version concurrent race export:
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  Result: RED first failed because `alert-review-postgres-migration-smoke.mjs` did not export `buildConcurrentReviewStatusBootstrapSql`; GREEN rerun passed after `PG1` added stale `version=0` rejection, repeated same-status idempotency, and concurrent `review_status='reviewed'` race summarization with exactly one winning update.

- FR-29 backend rule-save release gate passed after RED showed integration smoke did not prove the release backend rule save path:
  `node .scripts/alert-review-device-integration-smoke.test.mjs`
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#integrationSmokeCoversReviewRecordCaseExportAndManifestVerification" -DfailIfNoTests=false test`
  Result: RED first failed because `REQUIRED_CHECKPOINTS` lacked `review_rule_saved` and the service smoke did not save a rule. GREEN reruns passed after `runIntegrationSmoke` saved a `camera-smoke/zone-smoke/person` rule with `inertiaFrames=3` and `loiteringSeconds=20`, and LiveDevice/ProdSmoke began treating `review_rule_saved` as release evidence.

- FR-29 real `DeviceRegionDrawer` save smoke passed after RED showed the runner did not support a real drawer mode:
  `node scripts/alert-review-workbench-e2e-check.test.mjs`
  `pnpm test:alert-review-workbench:dev-api-real-drawer`
  Result: RED first failed with unsupported `--mode=dev-api-real-drawer`; GREEN reruns passed after the E2E harness stopped aliasing `DeviceRegionDrawer`, mocked only its device-region/model APIs, verified the real drawer called `updateDeviceRegion`, and asserted `saveAlertReviewRule` carried `inertiaFrames=3` and `loiteringSeconds=20`.

- Frontend full type baseline passed from the packaged HEAD tree:
  `pnpm --pm-on-fail=ignore --dir WEB type:check`
  Result: the first `corepack pnpm --dir WEB type:check` attempt was blocked by local pnpm shim version `11.5.2` vs project `packageManager` `11.3.0`; rerunning with the documented pnpm `--pm-on-fail=ignore` escape executed `cross-env NODE_OPTIONS=--max-old-space-size=8192 vue-tsc --noEmit --skipLibCheck` and exited 0 after a long silent run.

- FR-32 production smoke orchestrator passed after the RED failure showed no one-command release gate existed for `LiveDevice -> LiveVideo -> LivePlayer`, and now runs `LivePlayer:detail`, `LivePlayer:coverage`, and `LivePlayer:case-timeline` as separate release steps:
  `node .scripts/alert-review-production-smoke.test.mjs`
  `node .scripts/verify-alert-review-release-package.test.mjs`
  Result: RED first failed with `ERR_MODULE_NOT_FOUND` for `alert-review-production-smoke.mjs`; the next failure showed the release package gate did not recognize the new script. GREEN reruns passed and now assert required real-service options, step order, fail-fast behavior, and release package tracking.

- FR-32 deployed DEVICE smoke CLI passed after the RED failure showed no executable root script existed for the release endpoint:
  `node .scripts/alert-review-device-integration-smoke.test.mjs`
  `node .scripts/verify-alert-review-release-package.test.mjs`
  Result: RED first failed with `ERR_MODULE_NOT_FOUND` for `alert-review-device-integration-smoke.mjs`; the next failure showed the release package gate did not recognize the new smoke script. GREEN reruns passed and now assert auth header, request body, required checkpoints, `manifestValid=true`, `videoExportRequested=true`, and release package tracking.

- FR-17 media access evidence-chain audit passed after the RED failure showed `media_access_granted` / `media_access_denied` case audits did not appear in `getEvidenceAuditTrail`:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#evidenceAuditTrailIncludesMediaAccessReadsWithOperatorAndReverseLookup" -DfailIfNoTests=false test`
  Result: RED first failed with `NoSuchElementException` while looking for `media_access_granted`; GREEN rerun passed 1 test, 0 failures, 0 errors, with operator, media action, camera, material URI, denied reasons, eventId, reviewItemId, and hash-chain metadata preserved in the evidence audit trail.

- FR-07/FR-17/FR-23 record coverage read audit passed after RED showed authorized coverage reads only wrote a generic media access audit without returned record URIs:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#allowedRecordCoverageReadAuditsReturnedRecordUrisInEvidenceTrail" -DfailIfNoTests=false test`
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#recordCoverageMergesVideoIndexIntervalsAndMissingGaps+allowedRecordCoverageReadAuditsReturnedRecordUrisInEvidenceTrail+recordCoverageRejectsUnauthorizedCameraMediaAndAuditsDenial+evidenceAuditTrailIncludesMediaAccessReadsWithOperatorAndReverseLookup" -DfailIfNoTests=false test`
  Result: RED first failed because expected coverage `recordUri` evidence lists were `[[null]]`; the first fix exposed `media_not_in_case`, so GREEN now attaches returned coverage record URIs to review evidence after case/camera scope precheck and before auditing. Focused rerun passed 1 test, 0 failures, 0 errors; related regression rerun passed 4 tests, 0 failures, 0 errors.

- FR-16/FR-35 operational reports now include unreviewed backlog count/rate after RED showed the daily report only covered missing-record, export, semantic, and false-positive metrics:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#dailyReportAggregatesOperationalMetricsByUnitAreaCameraAndRule" -DfailIfNoTests=false test`
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#shiftReportSummarizesReviewItemsAndEvidenceGaps+dailyReportAggregatesOperationalMetricsByUnitAreaCameraAndRule" -DfailIfNoTests=false test`
  Result: RED first failed with expected `unreviewedBacklogCount=1` but actual `null`; GREEN rerun passed the focused daily report test and the shift+daily regression pair, with top-level and dimension-level unreviewed backlog metrics.

- FR-16 semantic trigger review context now includes hit explanations, action previews, and pending human confirmation after RED showed the trigger result only exposed action payloads:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#semanticTriggerMatchesIndexedItemsAndReturnsActions" -DfailIfNoTests=false test`
  Result: RED first failed at test compile because `ReviewSemanticTriggerResult` had no `humanConfirmationStatus()`, `hitExplanations()`, or `actionPreviews()` accessors; GREEN rerun passed 1 test, 0 failures, 0 errors.

- FR-16/FR-35 operations reports now return a delivery plan and pending acknowledgement contract after RED showed `ReviewOperationsReport` had no `deliveryPlan()` or `acknowledgement()` accessors:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#shiftReportSummarizesReviewItemsAndEvidenceGaps" -DfailIfNoTests=false test`
  Result: RED first failed at test compile because the report record had no delivery/acknowledgement accessors; GREEN rerun passed 1 test, 0 failures, 0 errors.

- FR-16/FR-35 operations report acknowledgement now persists by report key and is idempotent:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#operationsReportAcknowledgementPersistsForSameReportScopeAndIsIdempotent,SupervisionSchemaSqlTest#alertReviewReportAckMigrationPersistsOperatorAcknowledgement+schemaCreatesOnlySupervisionTables+schemaDefinesIdempotencyAndLookupIndexes" -DfailIfNoTests=false test`
  Result: RED first failed at test compile because `ReviewReportAcknowledgement` and `ReviewReportAcknowledgementCommand` did not exist; GREEN rerun passed 4 tests, 0 failures, 0 errors after the service generated a stable `reportKey`, stored `acknowledgedBy/At/note` through `system_supervision_alert_review_report_ack`, and duplicate acknowledgement returned the original operator/note.

- FR-16/FR-35 operations report acknowledgement is now exposed through release API and the workbench ops panel:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewControllerTest#operationsReportEndpointsExposeAcknowledgementContractAndUseLoginUser" -DfailIfNoTests=false test`
  `node scripts/alert-review-workbench-e2e-check.mjs --mode=contract`
  Result: RED first failed with `POST /operations-report` returning 404 and the workbench contract missing the typed API, routes, and acknowledgement cell; GREEN rerun passed after the controller mapped report generation/acknowledgement requests through the login user and the workbench showed pending acknowledgement, executed the acknowledgement action, and updated the state to acknowledged.

- FR-16/FR-35 scheduled operations report delivery now enters the runtime outbox:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#operationsReportJobGeneratesScheduledShiftAndDailyReports" -DfailIfNoTests=false test`
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#operationsReportJobGeneratesScheduledShiftAndDailyReports+runtimePatrolAndOutboxJobsCloseScheduledAlertDispatchLoop" -DfailIfNoTests=false test`
  Result: RED first failed because `SupervisionAlertReviewOperationsReportJob` returned no `deliveryOutbox` and queued no `deliver_operations_report` message; GREEN reruns passed 1 test and then the 2-test adjacent runtime outbox suite after scheduled shift/daily reports reused `system_supervision_alert_review_runtime_outbox` with a `review_operations_report` payload, same-reportKey retries returned `deliveryOutbox=0`, and the existing outbox job published it.

- FR-24/FR-35 runtime outbox publishing now requires publisher confirmation before marking messages as published:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#runtimeOutboxPublisherFailureMarksMessageFailedForRetry" -DfailIfNoTests=false test`
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#runtimeOutboxPublisherFailureMarksMessageFailedForRetry+runtimePatrolAndOutboxJobsCloseScheduledAlertDispatchLoop+operationsReportJobGeneratesScheduledShiftAndDailyReports" -DfailIfNoTests=false test`
  Result: RED first failed at test compile because `ReviewRuntimeOutboxDeliveryResult` did not exist; GREEN reruns passed 1 focused test and then the 3-test adjacent patrol/report/outbox suite after `ReviewRuntimeOutboxPublisher` became an optional service dependency, defaulted to no-op delivery for existing deployments, and failed publisher results now leave the outbox row in `failed` with incremented `retryCount` and `lastError`.

- FR-16/FR-24/FR-35 runtime outbox can now deliver to configured station-notify recipients without fake success:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=NotifyReviewRuntimeOutboxPublisherTest" -DfailIfNoTests=false test`
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=NotifyReviewRuntimeOutboxPublisherTest,SupervisionSchemaSqlTest#alertReviewRuntimeOutboxNotifyMigrationSeedsTemplates" -DfailIfNoTests=false test`
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  `node .scripts/verify-alert-review-release-package.test.mjs`
  Result: RED first failed at test compile because `NotifyReviewRuntimeOutboxPublisher` and `ReviewRuntimeOutboxNotifyProperties` did not exist; GREEN reruns passed after `yfeieye.review.runtime-outbox.notify.enabled` conditionally binds a `NotifySendService` publisher, configured admin recipients receive runtime alert/report templates, missing notify routing returns `runtime_outbox_notify_recipients_not_configured` so the outbox remains retryable, `V20260708_4` seeds the default templates, and PG1/release-package tests track the new migration and regression test.

- FR-16/FR-24/FR-35 runtime outbox station-notify delivery now dedupes per recipient after partial failure:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=NotifyReviewRuntimeOutboxPublisherTest" -DfailIfNoTests=false test`
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  `node .scripts/verify-alert-review-release-package.test.mjs`
  Result: RED first failed at test compile because `ReviewRuntimeOutboxNotifyDeliveryStore` did not exist; GREEN reruns passed after `system_supervision_alert_review_runtime_outbox_delivery` and `V20260708_5` added per-recipient delivery records, `NotifyReviewRuntimeOutboxPublisher` skipped already delivered recipients on retry, and the release/PG smoke gates began tracking the delivery table and recipient idempotency index.

- FR-16/FR-24/FR-35 runtime outbox publishing now claims pending messages before delivery so concurrent workers do not publish the same row twice:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#runtimeOutboxPublishingClaimsPendingMessagesBeforeDelivery" -DfailIfNoTests=false test`
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#runtimePatrolAndOutboxJobsCloseScheduledAlertDispatchLoop+runtimeOutboxPublisherFailureMarksMessageFailedForRetry+runtimeOutboxPublishingClaimsPendingMessagesBeforeDelivery,SupervisionSchemaSqlTest#schemaDefinesIdempotencyAndLookupIndexes+alertReviewTablesKeepClueEvidenceAndRegionRuleFields+alertReviewRuntimeOutboxDeliveryMigrationTracksRecipientIdempotency+alertReviewRuntimeOutboxClaimMigrationTracksProcessingOwnership" -DfailIfNoTests=false test`
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  `node .scripts/verify-alert-review-release-package.test.mjs`
  Result: RED first failed because a nested publish call scanned the same pending outbox row (`expected 0 but was 1`); GREEN reruns passed after `claimPendingRuntimeOutbox` moved rows to `processing` with a per-run `claimToken`, PostgreSQL claim SQL uses `FOR UPDATE SKIP LOCKED`, `V20260708_6` added `claim_token/claimed_by/claimed_at` plus claim indexes, and PG/release-package gates track the new migration.

- FR-16/FR-24/FR-35 runtime outbox stale claim recovery now reclaims crashed-worker `processing` rows without stealing fresh claims:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#runtimeOutboxPublishingReclaimsOnlyStaleProcessingMessages" -DfailIfNoTests=false test`
  Result: RED first failed with `expected: <1> but was: <0>` because `processing` rows were never claimable; GREEN rerun passed after runtime outbox publish supplied a 10-minute reclaim threshold, in-memory and PostgreSQL claim logic accepted stale `processing` rows, fresh `processing` rows remained untouched, and mapper SQL kept `FOR UPDATE SKIP LOCKED`.

- FR-23 evidence package verification operator binding and media scope guard passed after RED failures showed request `operatorUserId` could override the logged-in user and package verification did not carry `allowedCameraIds` into manifest media enforcement:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewControllerTest#evidencePackageVerificationUsesLoginUserInsteadOfRequestOperator" -DfailIfNoTests=false test`
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest,SupervisionAlertReviewControllerTest" -DfailIfNoTests=false test`
  Result: RED first failed with JSON path `$.data.operatorUserId` expected `777` but was `9999`; this slice's RED failed at test compile because `ReviewEvidenceVerificationCommand` lacked `allowedCameraIds`; GREEN rerun passed 92 tests, 0 failures, 0 errors. Verification now resolves the operator through `currentOperatorUserId` and reuses manifest verification's camera scope enforcement for package verification.

- FR-23 configured camera scopes now require real action permission when `yfeieye.review.camera-permission.action-permissions` is configured:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=ConfiguredReviewCameraPermissionResolverTest#configuredScopesRequireRealActionPermissionWhenPermissionServiceIsPresent" -DfailIfNoTests=false test`
  Result: RED first failed at test compile because `ConfiguredReviewCameraPermissionResolver` had no action permission or `PermissionService` gate; GREEN rerun passed 1 test, 0 failures, 0 errors.

- FR-23 action-permission config keys now normalize before gate lookup so casing/whitespace cannot silently bypass the `PermissionService` gate:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=ConfiguredReviewCameraPermissionResolverTest#actionPermissionKeysAreNormalizedBeforeGateLookup" -DfailIfNoTests=false test`
  Result: RED first failed with expected `[]` but returned `[camera-01]`; GREEN rerun passed 1 test, 0 failures, 0 errors.

- FR-23 media action permissions now have release `system_menu` button seeds:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionSchemaSqlTest#alertReviewMediaPermissionMigrationSeedsMenuPermissions" -DfailIfNoTests=false test`
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  `node .scripts/verify-alert-review-release-package.test.mjs`
  Result: RED first failed because `V20260706__alert_review_media_permissions.sql` was missing and release/package tooling only tracked 14 entries; GREEN reruns passed 1 Java schema test plus both Node self-tests. `PG1` now includes `V20260706`, restores a pre-existing deleted playback permission row without duplicating it, and asserts playback/export/download/manifest permission seeds are present.

- FR-23 workbench case timeline playback now audits media access before opening the record URI:
  `pnpm test:alert-review-workbench:dev-api-mock`
  Result: RED first failed with `case timeline seek expected auditAlertReviewMediaAccess before opening media, got getAlertReviewEvidenceAudit`; GREEN rerun passed and asserts audit payload contains `reviewCaseId`, `reviewItemId`, `cameraId`, `materialUri`, and `actionType=playback` before the `viewVideo` event.

- FR-23 workbench active-case direct playback now audits detail stream, unified timeline coverage, and coverage-list media opens before emitting `viewVideo`:
  `pnpm test:alert-review-workbench:dev-api-mock`
  Result: RED first failed with `detail stream seek with active case expected auditAlertReviewMediaAccess before opening media, got createAlertReviewCase`; GREEN rerun passed and asserts the active review case id, review item id, camera id, material URI, and `actionType=playback` before each direct playback event.

- FR-23 pre-case media playback now writes item-level media access audit before opening detail stream, unified timeline, and coverage-list record URIs:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#preCaseMediaAccessAuditRecordsAllowDenyAndCanBeListedByReviewItem,SupervisionSchemaSqlTest#alertReviewTablesKeepClueEvidenceAndRegionRuleFields+alertReviewItemMediaAuditMigrationAllowsPreCaseAuditRows" -DfailIfNoTests=false test`
  `pnpm test:alert-review-workbench:dev-api-mock`
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  `node .scripts/verify-alert-review-release-package.test.mjs`
  Result: RED first exposed the missing item-level audit contract and the first GREEN verification caught a missing `assertNull` import; rerun passed 3 Java tests, dev-api-mock now asserts `auditAlertReviewItemMediaAccess` before pre-case playback, and release tooling tracks `V20260707__alert_review_item_media_audit.sql`.

- FR-23 workbench playback now uses backend playback URL preparation instead of audit-only playback:
  `pnpm --pm-on-fail=ignore --dir WEB exec node scripts/alert-review-workbench-e2e-check.mjs --mode=contract`
  `pnpm --pm-on-fail=ignore --dir WEB exec node scripts/alert-review-workbench-e2e-check.mjs --mode=dev-api-mock`
  Result: RED first failed because `prepareAlertReviewPlaybackUrl`, `/playback-url`, and `prepareWorkbenchPlayback` were missing; GREEN reruns passed contract and dev-api-mock, and the fixture now asserts detail stream, unified timeline, coverage, and case timeline playback call backend playback preparation before emitting `viewVideo`.

- FR-23/FR-32 release smoke can now exercise deployed playback-url allow/deny probes:
  `node .scripts/alert-review-device-integration-smoke.test.mjs`
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed on unknown playback smoke arguments; GREEN reruns passed after `LiveDevice` gained optional allow/deny `GET /items/{reviewItemId}/playback-url` probes and `ProdSmoke` began forwarding playback camera params into that step.

- FR-32 production smoke now requires playback allow/deny camera params:
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed because `requiredOptionErrors` did not include the playback allow/deny camera arguments; GREEN rerun passed after `ProdSmoke` began treating both as required release-gate inputs while keeping standalone `LiveDevice` flexible.

- FR-21/FR-32 production smoke now rejects local/mock endpoints by default:
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed because `ProdSmoke` accepted localhost / 127.0.0.1 / mock / file endpoints; GREEN rerun passed after endpoint validation began rejecting those URLs unless `--allow-local-endpoints` is explicitly provided for co-located real-service smoke.

- FR-32 production smoke now writes a sanitized evidence report:
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed on unknown `--evidence-output-file`; GREEN rerun passed after `ProdSmoke` writes success and failure JSON reports with masked token-bearing commands, step exit codes, timestamps, durations, and the final pass/fail status.

- FR-32 production smoke evidence now aggregates child-smoke summaries:
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed because `LiveVideo` stdout JSON was not parsed into the evidence report; GREEN rerun passed after `ProdSmoke` captures child stdout, echoes it to the console, and stores only sanitized summary fields such as checkpoints, `storageDriftSummary`, export result, playback, player, and status.

- FR-32 production smoke now rejects child-smoke false positives without required evidence summaries:
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed because all child commands could return exit code 0 with no JSON evidence and `ProdSmoke` still passed; GREEN rerun passed after `ProdSmoke` began requiring `LiveDevice` ingest/rule/coverage/case/export/manifest/download/playback checkpoints, `LiveVideo` coverage/drift/export/download/manifest evidence, and each `LivePlayer:*` click/seek/record/offset proof before marking a production smoke step passed.

- FR-13/FR-32 production smoke now rejects mock player media evidence in release mode:
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed because `LivePlayer` could report `mock://record/...` while the release `ProdSmoke` still passed; GREEN rerun passed after player evidence validation began rejecting local/mock `recordPath` / `currentUrl` values unless local endpoint mode is explicitly enabled.

- FR-13 standalone LivePlayer smoke now rejects local/mock endpoints in release mode:
  `node .scripts/alert-review-player-live-smoke.test.mjs`
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed because standalone `LivePlayer` accepted localhost workbench URLs and `mock://record/...` media results, and `ProdSmoke --allow-local-endpoints` was only passed to `LiveVideo`; GREEN reruns passed after `LivePlayer` gained `--allow-local-endpoints`, default release-mode rejection for local/mock workbench/media evidence, and `ProdSmoke` forwarded the same explicit local allowance to all player child smokes.

- FR-17/FR-32 production smoke evidence now preserves DEVICE audit identifiers:
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed because parsed DEVICE child summaries dropped `reviewItemId`, `reviewCaseId`, `exportJobNo`, `manifestValid`, and `videoExportRequested`; GREEN rerun passed after the production evidence summary whitelist included those fields without persisting raw stdout.

- FR-13/FR-32 production smoke evidence now preserves deployed player seek proof:
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed because parsed `LivePlayer` stdout with `seekTime`, `recordPath`, `currentUrl`, `playbackOffsetSeconds`, and `nativeCurrentTime` produced no evidence step summary, then failed again because signed player URL query strings could leak into evidence; GREEN rerun passed after `ProdSmoke` stores those fields under `summary.player`, strips `currentUrl` query/hash secrets, and avoids persisting raw stdout.

- FR-13/FR-32 production smoke now gates all three real player seek entrances:
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed on unknown `--player-coverage-*` args and then on the old single `LivePlayer` step assertion; GREEN rerun passed after `ProdSmoke` began requiring coverage and case-timeline expected seek/record/offset inputs, accepting zero-second player offsets, and running `LivePlayer:detail`, `LivePlayer:coverage`, and `LivePlayer:case-timeline` with separate sanitized evidence summaries.

- FR-13/FR-17/FR-32 production smoke player evidence now carries review/action context:
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed because `summary.player` only stored actual player fields and omitted entry, action id, review row, `reviewItemId`, `reviewCaseId`, and expected seek metadata; GREEN rerun passed after `ProdSmoke` merges step-level player evidence context with the child smoke result while keeping signed URLs stripped and raw stdout out of the evidence report.

- FR-17/FR-32 production smoke player evidence now sanitizes wrapped player payloads:
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed because a child smoke JSON shaped as `{ "player": { ... } }` copied signed `currentUrl` query strings and extra debug fields into evidence; GREEN rerun passed after wrapped player payloads began using the same field whitelist and URL stripping as bare `LivePlayer` output.

- FR-17/FR-32 production smoke step commands now strip signed URL query strings:
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed because the evidence command could preserve a signed workbench URL query/hash from `--workbench-url`; GREEN rerun passed after `formatStepCommand` kept `--token=***` and stripped query/hash from URL-valued args while leaving endpoint paths visible.

- FR-22/FR-32 live VIDEO smoke now requires a healthy recording storage drift patrol:
  `node .scripts/alert-review-video-live-smoke.test.mjs`
  `node .scripts/alert-review-production-smoke.test.mjs`
  Result: RED first failed on unknown drift retention args; GREEN reruns passed after `LiveVideo` began calling `/space/{spaceId}/videos/drift` with `retention_hours`, rejecting unhealthy drift reports, and `ProdSmoke` began requiring and forwarding `--video-record-drift-retention-hours`.

- FR-22 live VIDEO smoke output now includes compact drift evidence:
  `node .scripts/alert-review-video-live-smoke.test.mjs`
  Result: RED first failed because `summarizeCliResult` was not exported; GREEN rerun passed after the CLI JSON began including `storageDriftSummary` with health, checked record count, issue count, and issue reason counts.

- FR-36/W2 frontend typecheck gate is now protected by release tooling:
  `node .scripts/verify-alert-review-release-package.test.mjs`
  `pnpm --pm-on-fail=ignore --dir WEB type:check`
  Result: RED first failed because `scanWebTypecheckGate` was missing; GREEN reruns passed, `Pkg` now rejects a missing or weakened `WEB/package.json` `type:check` script, and full `vue-tsc --noEmit --skipLibCheck` exited 0 after a long silent run.

- FR-25 runtime stale-lock recovery passed after the RED failure showed no lock acquisition detail contract existed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#runtimePatrolRecoversExpiredClusterLockAndReportsPreviousOwner" -DfailIfNoTests=false test`
  Result: RED first failed at test compile for missing `ReviewRuntimeLockAcquisition`; GREEN rerun passed 1 test, 0 failures, 0 errors, and MapperStore now uses a conditional stale-lock takeover update.

- FR-33 semantic index worker retry/progress slice passed after the RED failure showed no worker contract existed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#semanticIndexWorkerRetriesFailuresAndReportsBacklogProgress" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors; includes failed-item retry, backlog alarm, index version, rebuild progress, and `supervisionAlertReviewSemanticIndexJob` smoke.

- FR-10/FR-33 workbench semantic ops status passed after RED showed the ops panel had no stable semantic backlog/progress cell:
  `pnpm test:alert-review-workbench:dev-api-mock`
  Result: RED first failed with `missing stable selector alert-review-ops-semantic`; GREEN rerun passed and asserts `evaluateAlertReviewSemanticIndex`, `critical`, `50%`, and `stale 1 / failed 1` are visible in the workbench.

- FR-09 workbench topology candidate explanation and add-to-case flow passed after RED showed no stable candidate card/action existed:
  `pnpm test:alert-review-workbench:dev-api-mock`
  Result: RED first failed with missing `alert-review-case-candidate` and `alert-review-candidate-add`; GREEN rerun passed and asserts `RV-20260702-002`, `topology area yard-east`, `adjacent cam-east-gate -> cam-yard-east`, `shared object person-1`, and `addAlertReviewItemToCase`.

- FR-09 configured camera topology candidate matching passed after RED showed no service-side topology resolver contract existed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#reviewCaseCandidatesUseConfiguredCameraTopologyWhenReviewDataHasNoTopology" -DfailIfNoTests=false test`
  Result: RED first failed at test compile for missing `ReviewCameraTopology` / `ReviewCameraTopologyResolver`; GREEN rerun passed 1 test and proves configured regulatory area plus adjacent camera topology can match candidates even when reviewData has no topology fields.

- FR-09 configured topology candidate explanation reached the backend payload and workbench cards after RED showed matches had no `reviewData.caseCandidateMatch` contract:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#reviewCaseCandidatesUseConfiguredCameraTopologyWhenReviewDataHasNoTopology" -DfailIfNoTests=false test`
  `pnpm test:alert-review-workbench:dev-api-mock`
  Result: RED first failed with missing backend `caseCandidateMatch` and the workbench timing out waiting for `topology area yard-east`; GREEN reruns passed, with candidate payload source `configured_camera_topology`, `regulatoryArea`, and adjacent-camera explanation rendered from nested metadata.

- FR-28 manifest HMAC keyring rotation and release verifier artifact passed after RED failures showed keyring exports still signed as plain sha256 and the release package gate did not recognize the wrapper:
  `python -m pytest test_record_export.py::TestRecordExportService::test_manifest_hmac_keyring_verifier_uses_manifest_key_id_after_rotation -q`
  `node .scripts/verify-alert-review-release-package.test.mjs`
  Result: 1 Python test passed; `alert review release package verifier tests OK`.

- FR-01 ingest identity DB hardening and FR-20 ReviewSegment SQL constraints passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionSchemaSqlTest" -DfailIfNoTests=false test`
  Result: 10 tests, 0 failures, 0 errors.
- FR-01/FR-20 PostgreSQL migration smoke script passed after the RED failure showed the reusable smoke runner was missing:
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  Result: RED first failed with `ERR_MODULE_NOT_FOUND`; GREEN rerun passed and confirmed migration file list, bootstrap/assertion SQL, argument parsing, and release package tracking.
- FR-01 ingest identity PostgreSQL smoke passed against a temporary `postgres:16` container:
  `node .scripts/alert-review-postgres-migration-smoke.mjs --container=yfeieye-fr-review-pg-race-70608 --database=yfeieye_alert_review_migration_smoke`
  Result: applied `V20260702` + `V20260704`; verified tenant-scoped historical source-alert backfill, duplicate identity unique rejection, cross-process duplicate identity racing with exactly one successful insert, and same-tenant ReviewSegment overlap rejection; temporary container removed.
- FR release package verifier tests passed after adding the PostgreSQL smoke tooling to tracked release paths:
  `node .scripts/verify-alert-review-release-package.test.mjs`
  Result: pass.
- FR-20 PostgreSQL migration smoke passed after the RED failure showed `V20260702` rejected cross-tenant historical segment overlap before `tenant_id` existed on segment exclusion:
  RED: temporary `postgres:16` rejected current `V20260702` with `could not create exclusion constraint "ex_supervision_alert_review_segment_camera_time"` for two different tenants on the same camera/time window.
  GREEN: temporary `postgres:16` applied `V20260702` + `V20260704` and verified tenant backfill, cross-tenant overlap migration, adjacent half-open segments allowed, same-tenant overlap rejected, invalid `segment_status` rejected, and duplicate active `review_item_id` rejected.
- FR-20 schema and mapper focused regression passed after tenant-scoped production migration hardening:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionSchemaSqlTest,SupervisionAlertReviewMapperStoreTest" -DfailIfNoTests=false test`
  Result: 16 tests, 0 failures, 0 errors.
- FR-20 MapperStore segment fail-fast validation passed after the RED failure showed missing cameraId and invalid segment status reached insert without application-level rejection:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewMapperStoreTest" -DfailIfNoTests=false test`
  Result: RED first failed 2 of 6 tests; GREEN rerun passed 6 tests, 0 failures, 0 errors.
- FR-01/FR-20 service and mapper regression passed after identity table wiring:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest,SupervisionAlertReviewMapperStoreTest" -DfailIfNoTests=false test`
  Result: 78 tests, 0 failures, 0 errors.
- FR-03 review status idempotency and conflict rejection passed after the RED failure showed repeated review clicks refreshed `reviewedAt`:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#reviewStatusActionsAreIdempotentAndRejectConflictingReviewerActions" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- FR-03 MapperStore DB conditional update guard passed after the RED failure showed stale 0-row updates were treated as success:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewMapperStoreTest#updateReviewStatusRejectsConcurrentStatusConflict" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- FR-08 false-positive suggestion safety metadata passed after the RED failure showed missing `minimumSampleCount`:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#falsePositiveActionMarksStatusAndCreatesRuleSuggestion" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- FR-08 workbench now surfaces false-positive rule suggestion safety metadata before approval actions:
  `pnpm test:alert-review-workbench:dev-api-mock`
  Result: RED first failed waiting for `rule suggestion sample safety summary`; GREEN rerun passed after the workbench displayed `sample`, `risk`, `impact`, `hits`, and `possible missed` rows from the rule suggestion payload.
- FR-08 low-sample rule suggestions are now blocked before approval/application:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#lowSampleRuleSuggestionCannotBeAcceptedBeforeMoreReviewSamples+falsePositiveRuleSuggestionAppliesRuleConfigOnlyAfterApprovalAndCanRollback+ruleSuggestionSafeApplyRequiresApprovalAndStoresShadowEvaluation" -DfailIfNoTests=false test`
  `pnpm test:alert-review-workbench:dev-api-mock`
  Result: RED first showed a 1/3 sample suggestion could be accepted and the workbench still rendered `accept`; GREEN reruns passed after the service refreshed same-scope sample counts, blocked `accepted` / `applied` when `sampleRequirementMet=false`, and the workbench hid accept/apply until the sample gate is met.
- FR-18 workbench now explains rule replay evidence before operators apply rule changes:
  `pnpm test:alert-review-workbench:dev-api-mock`
  Result: RED first failed waiting for `rule replay rule version`; GREEN rerun passed after the replay panel displayed rule version, sample window, hit comparison, and false-negative estimate from the replay report payload.
- FR-34 AI summary provenance passed after the RED failure showed missing `aiProvenance`:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#aiSummaryCanUseExternalProviderWithCaseTimelineContext" -DfailIfNoTests=false test`
  Result: RED first failed with missing provenance; GREEN rerun passed 1 test, 0 failures, 0 errors.
- FR-34 AI summary provenance persistence passed after RED failures showed missing `case_audit.metadata` and missing `ai_summary_generated` audit trace:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionSchemaSqlTest#alertReviewTablesKeepClueEvidenceAndRegionRuleFields,SupervisionAlertReviewServiceTest#aiSummaryCanUseExternalProviderWithCaseTimelineContext" -DfailIfNoTests=false test`
  Result: RED first failed 2 tests; GREEN rerun passed 2 tests, 0 failures, 0 errors.
- FR-34 AI summary human confirmation passed after the RED failure showed missing confirmation API records:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#aiSummaryConfirmationKeepsGeneratedProvenanceAndIsIdempotentForSameStatus+aiSummaryConfirmationRequiresGeneratedSummaryAudit" -DfailIfNoTests=false test`
  Result: RED first failed at test compile for missing confirmation API; GREEN rerun passed 2 tests, 0 failures, 0 errors.
- FR-34 AI summary PII redaction passed after the RED failure showed provider requests still received raw `reviewData.motion.personName`:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#aiSummaryRedactsSensitiveReviewDataBeforeProviderAndAuditProvenance" -DfailIfNoTests=false test`
  Result: RED first failed 1 test because provider saw `Resident Alice`; GREEN rerun passed 1 test, 0 failures, 0 errors.
- FR-34 AI summary timeline/material redaction passed after the RED failure showed provider timeline still contained raw phone/id/name values:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#aiSummaryRedactsTimelineNotesAndMaterialUrisBeforeProvider" -DfailIfNoTests=false test`
  Result: RED first failed 1 test because provider timeline still exposed raw values; GREEN rerun passed 1 test, 0 failures, 0 errors.
- FR-34 AI summary redaction policy passed after the RED failure showed the production policy type was missing:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#aiSummaryRedactionPolicyCanBeOverriddenAndRecordedInProvenance" -DfailIfNoTests=false test`
  Result: RED first failed at test compile for missing `ReviewAiSummaryRedactionPolicy`; GREEN rerun passed 1 test, 0 failures, 0 errors.
- FR-34 AI summary provider, PII redaction, timeline/material redaction, policy version, and human confirmation focused suite passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#aiSummaryCanUseExternalProviderWithCaseTimelineContext+aiSummaryRedactsSensitiveReviewDataBeforeProviderAndAuditProvenance+aiSummaryRedactsTimelineNotesAndMaterialUrisBeforeProvider+aiSummaryRedactionPolicyCanBeOverriddenAndRecordedInProvenance+aiSummaryConfirmationKeepsGeneratedProvenanceAndIsIdempotentForSameStatus+aiSummaryConfirmationRequiresGeneratedSummaryAudit" -DfailIfNoTests=false test`
  Result: 6 tests, 0 failures, 0 errors.
- FR-35 daily/shift operational report dimensions passed after the RED failure showed missing report metrics:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#shiftReportSummarizesReviewItemsAndEvidenceGaps+dailyReportAggregatesOperationalMetricsByUnitAreaCameraAndRule" -DfailIfNoTests=false test`
  Result: RED first failed because `missingRecordCount` was absent; GREEN focused suite passed 2 tests, 0 failures, 0 errors.
- FR-22/FR-24/FR-26 runtime record gap reason catalog passed after the RED failure showed missing `recordGapReasonCatalog()` on `ReviewRuntimeHealthReport`:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#runtimeHealthExposesStandardRecordGapReasonCatalogAndNormalizesAliases" -DfailIfNoTests=false test`
  Result: RED first failed at test compile; GREEN rerun passed 1 test, 0 failures, 0 errors.
- FR-22/FR-24/FR-26 focused runtime health gap reason regression passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#runtimePatrolSurfacesRecordStorageDriftReasonsFromStorageSync+runtimeHealthReportsVideoUrlNotConfiguredReasonWhenResolverIsUnconfigured+runtimeHealthExposesStandardRecordGapReasonCatalogAndNormalizesAliases" -DfailIfNoTests=false test`
  Result: 3 tests, 0 failures, 0 errors.
- FR-26 workbench missing-config fallback copy passed:
  `pnpm test:alert-review-workbench:dev-api-mock`
  Result: RED first failed waiting for `manual record evidence fallback label`; GREEN rerun passed after `video_url_not_configured` rendered as `缺录像/待手动补证` with `VIDEO URL 未配置`.
- FR-01/FR-03/FR-20 service, mapper, and schema regression passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest,SupervisionAlertReviewMapperStoreTest,SupervisionSchemaSqlTest" -DfailIfNoTests=false test`
  Result: 90 tests, 0 failures, 0 errors.
- DEVICE review regression passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewControllerTest,SupervisionAlertReviewServiceTest,SupervisionAlertReviewMapperStoreTest,HttpVideoResolverTest,SupervisionSchemaSqlTest" -DfailIfNoTests=false test`
  Result: 110 tests, 0 failures, 0 errors.
- WEB lightweight TypeScript gate passed after adding the runtime gap reason catalog API type:
  `pnpm exec tsc --noEmit --skipLibCheck --pretty false --allowJs false`
  Result: exit code 0, no diagnostics.
- VIDEO regression passed:
  `python -m pytest test_record_export.py test_record_availability.py -q`
  Result: 21 passed.
- Workbench E2E runner mode validation passed:
  `pnpm test:alert-review-workbench:runner`
  Result: `alert-review-workbench-e2e-check.test OK`; invalid `--mode` now fails before a false-positive browser pass.
- Workbench static contract mode passed:
  `pnpm test:alert-review-workbench:contract`
  Result: `Alert review workbench E2E contract OK`.
- Workbench dev-server/API mock browser mode passed:
  `pnpm test:alert-review-workbench:dev-api-mock`
  Result: `Alert review workbench E2E dev-api-mock OK`; includes exact detail stream / coverage / case timeline `seek_time` and `record_path` player-event assertions, region drawer `saveAlertReviewRule` payload assertions for `inertiaFrames` and `loiteringSeconds`, owner, close, merge, split browser actions, UTF-8 Chinese copy guard, and the integration smoke `evidence_download_audited` checkpoint.
- Workbench playback seek contract passed after the RED failure showed the real playback bridge did not preserve offset metadata:
  `pnpm test:alert-review-playback`
  Result: `alert review playback contract tests OK`; `AlertReviewWorkbench` now emits `record_start_time`, `playAlertRecordInModal` carries `seek_time` and `playback_offset_seconds`, and `DialogPlayer` uses native mp4 VOD seeking when a positive offset is available.
- Release player live smoke self-test passed after the RED failure showed no deployed-page player seek smoke runner:
  `node .scripts/alert-review-player-live-smoke.test.mjs`
  Result: `alert review player live smoke tests OK`; the CLI refuses to pass without a deployed workbench URL, review row, expected seek time, expected record path fragment, and expected offset seconds.
- Release visible-copy scan passed after the RED failure showed no reusable release scanner for player/patrol/VIDEO copy:
  `node .scripts/alert-review-visible-copy-scan.mjs`
  Result: `Alert review visible copy scan OK: 9 file(s) checked.`
- Patrol API mojibake guard passed after RED showed the visible-copy scanner and release verifier skipped the patrol mojibake pattern:
  `node .scripts/alert-review-visible-copy-scan.test.mjs`
  `node .scripts/verify-alert-review-release-package.test.mjs`
  `node .scripts/alert-review-visible-copy-scan.mjs`
  Result: RED first failed because the scanner returned `ok=true` for the patrol mojibake fixture, then the release verifier returned `ok=true` because `WEB/src/api/device/patrol.ts` was not part of the FR release path rules; GREEN reruns passed after both guards recognized the pattern and the release package verifier tracked the patrol API file.

- FR-37 release package text-quality gate now reuses the W4 visible-copy mojibake catalog:
  `node .scripts/verify-alert-review-release-package.test.mjs`
  `node .scripts/alert-review-visible-copy-scan.test.mjs`
  `node .scripts/alert-review-visible-copy-scan.mjs`
  Result: RED first failed because `scanTextQuality` returned `ok=true` for the W4-visible `\u935b\u5a45` mojibake fixture; GREEN reruns passed after `Pkg` reused `VISIBLE_COPY_MOJIBAKE_PATTERNS` while preserving its extra historical release-text patterns.

- FR-37 release text-quality gate no longer carries raw mojibake fixtures in source:
  `node .scripts/verify-alert-review-release-package.mjs --require-clean`
  `node scripts/alert-review-workbench-e2e-check.test.mjs` from `WEB`
  Result: RED first failed because `Pkg --require-clean` found a raw mojibake fragment in `WEB/scripts/alert-review-workbench-e2e-check.mjs`; GREEN reruns passed after the workbench E2E mojibake fragment catalog and test fixtures used escaped codepoints while preserving runtime detection.

- Workbench all-mode package gate passed:
  `pnpm test:alert-review-workbench`
  Result: `Alert review workbench E2E all OK`.
- Frontend barrel-import hardening recheck passed:
  `pnpm exec tsc --noEmit --skipLibCheck --pretty false --allowJs false`
  Result: exit 0.
- Workbench all-mode package gate rechecked after frontend barrel-import hardening:
  `pnpm test:alert-review-workbench`
  Result: `Alert review workbench E2E all OK`.
- Full Vue SFC type gate passed after frontend barrel-import and non-workbench type hardening:
  `pnpm run type:check`
  Result: exit code 0, no diagnostics.
- Workbench seek/mode changes lightweight TypeScript recheck passed:
  `pnpm exec tsc --noEmit --skipLibCheck --pretty false --allowJs false`
  Result: exit code 0, no diagnostics.
- Review VIDEO docker integration config and resolver regression passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=HttpVideoResolverTest" -DfailIfNoTests=false test`
  Result: 12 tests, 0 failures, 0 errors.
- ReviewSegment ended-extension overlap guard passed after the RED failure showed an already ended segment could be extended over a later active same-camera segment:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#reviewSegmentLifecycleRejectsEndedExtensionOverlappingLaterActiveSegment" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- ReviewSegment lifecycle neighbor regression passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#endedAlertReviewSegmentSplitsLateDetectionIntoNewSegment+endingMergedSegmentTruncatesBeforeLateDetectionSplitsNewActiveSegment+reviewSegmentLifecycleRejectsEndBeforeSegmentStart+reviewSegmentLifecycleRejectsInvalidStateAndReopenAfterEnded+reviewSegmentLifecycleRejectsEndedExtensionOverlappingLaterActiveSegment+reviewSegmentAlertStateDoesNotDowngradeWhenLaterDetectionHeartbeatArrives" -DfailIfNoTests=false test`
  Result: 6 tests, 0 failures, 0 errors.
- Alert review service full regression passed after the service-level overlap guard:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest" -DfailIfNoTests=false test`
  Result: 88 tests, 0 failures, 0 errors.
- Mapper-store open interval persistence passed after the RED failure showed non-ended ReviewSegment `end_time` was persisted as the start time instead of `NULL`:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewMapperStoreTest#createPersistsNonEndedReviewSegmentAsOpenInterval" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- PostgreSQL migration smoke self-test passed after the RED failure showed the smoke SQL did not cover open active same-camera overlap rejection:
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  Result: `alert review postgres migration smoke tests OK`.
- Mapper-store full regression passed after open interval persistence:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewMapperStoreTest" -DfailIfNoTests=false test`
  Result: 7 tests, 0 failures, 0 errors.
- PostgreSQL migration smoke self-test passed after adding concurrent ReviewSegment overlap race SQL/result summarization:
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  Result: `alert review postgres migration smoke tests OK`.
- Local Docker daemon was unavailable, so real container `PG1` was not rerun in this workspace:
  `docker ps --format "{{.Names}}\t{{.Image}}\t{{.Status}}"`
  Result: failed to connect to `dockerDesktopLinuxEngine`; release PostgreSQL smoke remains required.
- ReviewSegment concurrent ingest and lifecycle hardening regression passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest,SupervisionAlertReviewMapperStoreTest,SupervisionSchemaSqlTest" -DfailIfNoTests=false test`
  Result: 83 tests, 0 failures, 0 errors.
- ReviewData standalone JSON schema artifact regression passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionSchemaSqlTest" -DfailIfNoTests=false test`
  Result: 9 tests, 0 failures, 0 errors.
- FR-19 ReviewData production migration backfill self-test passed after RED showed `PG1` did not include a ReviewData historical-row migration:
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  `node .scripts/verify-alert-review-release-package.test.mjs`
  Result: both Node self-tests passed; `PG1` now tracks `V20260705__alert_review_review_data_backfill.sql`, seeds legacy `review_data`, and asserts `reviewDataVersion`, labels, zones, objectIds, objects, detections, reviewSegment, source alert ids, severity, and correlationId survive the production migration chain.
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
  Result: `alert review release package verifier tests OK`; the verifier now tracks `V20260704`, `V20260705`, `V20260706`, PG1 PostgreSQL smoke tooling, offline manifest verifier wrapper, LiveDevice smoke tooling, LiveVideo smoke tooling, LivePlayer smoke tooling, the workbench runner test, playback contract test, `WEB/src/utils/withInstall.ts`, and `WEB/src/api/device/patrol.ts`.
- Live VIDEO smoke script self-test passed:
  `node .scripts/alert-review-video-live-smoke.test.mjs`
  Result: `alert review VIDEO live smoke tests OK`; the smoke now polls `record-export-url/{export_id}` when VIDEO returns an async export id and refuses to pass until `download_url` is available and reachable through a HEAD probe.
- Live VIDEO smoke reproducibility gate passed after RED showed the smoke could finish without any manifest evidence:
  `node .scripts/alert-review-video-live-smoke.test.mjs`
  Result: RED first failed because checkpoints stopped at `record_export_download_probed`, then failed again when a manifest without clip params still passed; GREEN rerun passed after the smoke required `manifest_url`, fetched manifest v2, and verified ffmpeg command hash, source segment hashes, clip params, concat order, and output hashes before adding `record_export_manifest_verified`.
- VIDEO export payloads now expose persisted manifests to LiveVideo after RED showed service responses had no `manifest_url`:
  `python -m pytest test_record_export.py::TestRecordExportService::test_create_record_export_reuses_local_record_uri_as_download_url test_record_export.py::TestRecordExportService::test_async_record_export_worker_moves_job_to_ready_with_hash_and_download -q`
  `node .scripts/alert-review-video-live-smoke.test.mjs`
  Result: RED first failed with `KeyError: 'manifest_url'` on sync and async export payloads, then LiveVideo failed to parse VIDEO-shaped `recordSegments`; GREEN reruns passed after sync exports persisted a ready job/manifest and public export payloads exposed `/video/record/export/{export_id}/manifest`.
- Live VIDEO smoke refuses to pass without real configuration:
  `node .scripts/alert-review-video-live-smoke.mjs`
  Result: failed with missing `alert-record-query-url`, `record-coverage-query-url`, `record-base-url`, `record-export-url`, `device-id`, and `alert-time`; this is expected on an unconfigured developer machine and prevents a false positive real-VIDEO smoke.
- Release package verifier blocked the loose worktree before staging:
  `node .scripts/verify-alert-review-release-package.mjs`
  Result: failed with 29 current FR release blockers, including unstaged production migrations and untracked PG1/workbench tooling. This is an intentional P0 release stop until those files are staged/committed or otherwise included in the release package.
- Release package verifier passed after targeted staging:
  `node .scripts/verify-alert-review-release-package.mjs`
  Result: `Alert review release package verifier OK: 29 FR release path(s) checked; no loose FR core file blocked packaging.`
- HEAD-only release verifier still blocks until commit:
  `node .scripts/verify-alert-review-release-package.mjs --require-clean`
  Result: failed with staged `dirty` FR paths, as expected before the package is committed.
- Integration smoke download audit slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#integrationSmokeCoversReviewRecordCaseExportAndManifestVerification" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- Converted review item post-event policy slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#convertedReviewItemAllowsEvidenceHardeningButRejectsFalsePositiveRollback" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- FR-30 workbench post-conversion action boundary passed:
  `pnpm test:alert-review-workbench:dev-api-mock`
  Result: RED first failed with `converted review item should hide false-positive action`; GREEN rerun passed after the workbench hid false-positive on converted rows and kept evidence plus record coverage actions visible.
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
- Event rollback/rework conflict policy slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#eventReconcileKeepsConvertedItemWhenEventRollbackRequiresRework" -DfailIfNoTests=false test`
  Result: RED first failed because the event reconcile job/report did not expose a rollback conflict; GREEN rerun passed after converted review items kept `reviewStatus=converted`, `reviewData.eventProjection` recorded `conflictPolicy=keep_converted_review_item`, and the scheduled job summary exposed `conflict=1`.
- Runtime patrol scheduler/outbox slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#runtimePatrolAndOutboxJobsCloseScheduledAlertDispatchLoop" -DfailIfNoTests=false test`
  Result: 1 test, 0 failures, 0 errors.
- Alert review scheduler seed package slice passed:
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  `node .scripts/verify-alert-review-release-package.test.mjs`
  Result: PG1 now tracks `V20260708_2__alert_review_scheduler_jobs.sql`, bootstraps `infra_job`, and asserts paused patrol/outbox/event-reconcile/semantic-index scheduler seeds; the release verifier tracks the scheduler seed migration as a schema release path.
- Production smoke W2 typecheck preflight slice passed:
  `node .scripts/alert-review-production-smoke.test.mjs`
  `pnpm run type:check` from `WEB/`
  Result: RED first failed because `ProdSmoke` started at `LiveDevice`; GREEN rerun passed after the production smoke step order became `W2:typecheck -> LiveDevice -> LiveVideo -> LivePlayer:detail -> LivePlayer:coverage -> LivePlayer:case-timeline`, with the evidence report preserving the W2 step, and the full frontend `vue-tsc --noEmit --skipLibCheck` gate exited 0 locally.
- Operations report scheduler slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#operationsReportJobGeneratesScheduledShiftAndDailyReports" -DfailIfNoTests=false test`
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  Result: RED first failed at test compile because `SupervisionAlertReviewOperationsReportJob` was missing; GREEN rerun passed after the job generated scheduled shift/daily report summaries and `V20260708_2` seeded paused shift/daily report jobs with handler-param-aware de-duplication.
- Evidence export worker scheduler slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#evidenceExportWorkerRebuildsFailedJobsAndLeavesReplayableManifest" -DfailIfNoTests=false test`
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  `node .scripts/verify-alert-review-release-package.test.mjs`
  Result: RED first failed at test compile because the DEVICE export worker API/job handler was missing; GREEN rerun passed after failed export jobs could be rebuilt to `ready`, worker attempt metadata/backoff was signed into the manifest without breaking verification, and `V20260708_2` seeded the paused export worker job.
- Evidence export worker expiry cleanup slice passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest#evidenceExportDownloadExpiresAndWorkerCleansExpiredJobs" -DfailIfNoTests=false test`
  Result: RED first failed at test compile because `EXPORT_JOB_EXPIRED` was missing, then failed because failed/expired jobs were still downloadable or manifest verification was tied to downloadability; GREEN rerun passed after ready jobs past `expiresAt` are cleaned to `expired`, non-ready/expired downloads are rejected, and manifest verification remains replayable.
- VIDEO export storage lifecycle manifest slice passed:
  `python -m pytest test_record_export.py::TestRecordExportService::test_record_export_manifest_tracks_storage_lifecycle_for_persisted_artifacts -q`
  `node .scripts/alert-review-video-live-smoke.test.mjs`
  Result: RED first failed because VIDEO manifests had no `storageLifecycle`, LiveVideo did not reject manifests without storage lifecycle evidence, and the live export body did not force the async worker; GREEN rerun passed after persisted artifacts expose storage type, object key, expiry/status, CLI smoke summary preserves `manifestStorageLifecycle`, and LiveVideo posts `async_worker=true`.
- ReviewData backfill schema regression passed:
  `mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionSchemaSqlTest" -DfailIfNoTests=false test`
  Result: 11 tests, 0 failures, 0 errors.
- Local PG1 container execution was attempted again after adding `V20260706`:
  `docker ps --format "{{.Names}}\t{{.Image}}\t{{.Status}}"`
  Result: failed to connect to `dockerDesktopLinuxEngine`; the release PostgreSQL migration smoke remains required on an environment with Docker/PostgreSQL available.
- Local PG1 container execution was attempted again after adding `V20260705`:
  `docker ps --format "{{.Names}}\t{{.Image}}\t{{.Status}}"`
  Result: failed to connect to `dockerDesktopLinuxEngine`; the release PostgreSQL migration smoke remains required on an environment with Docker/PostgreSQL available.
- PG1 can now run against either Docker PostgreSQL or a direct maintenance database URL, so release migration smoke is no longer Docker Desktop-only:
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  Result: RED first failed because `buildPsqlInvocation` / direct URL support did not exist; GREEN rerun passed after `--database-url` parsing, database URL switching, and shared sync/async psql invocation were added while preserving the existing `--container` path.
- PG1 direct URL mode now keeps PostgreSQL passwords out of `psql` argv:
  `node .scripts/alert-review-postgres-migration-smoke.test.mjs`
  Result: RED first showed `postgresql://ci:secret@...` in the spawned args; GREEN rerun passed after direct URL execution moved host/user/password/database/sslmode into `PG*` environment variables while preserving the sanitized `psql/<database>` evidence label.
- Full frontend `pnpm run type:check` passed locally after narrowing heavy frontend barrel imports and clearing the remaining non-workbench Vue SFC type errors.

## Current Open Risks

- Frontend full `vue-tsc` / `pnpm run type:check` exits 0 locally after replacing heavyweight barrel imports with narrow imports and clearing the remaining non-workbench Vue SFC type errors in device logs/events/services, notice configuration, product, rulechain, and train-task modules.
- Release packaging has been committed into HEAD and `node .scripts/verify-alert-review-release-package.mjs --require-clean` exits 0 locally.
- Real VIDEO integration now has docker-compose defaults plus `LiveVideo` executable smoke coverage for alert-record, coverage, record-base, export, export download readiness, and resolved download URL reachability; `ProdSmoke` runs that together with deployed DEVICE and three deployed player seek entrances. Local live execution is still not proven because this workstation has no reachable `127.0.0.1:6000` VIDEO service, no deployed workbench URL/auth, and no real smoke device/time/row env configured.
- Workbench-to-player seek handoff now preserves `seek_time` plus `playback_offset_seconds`, native mp4 VOD can consume the offset, and `ProdSmoke` invokes `LivePlayer:detail`, `LivePlayer:coverage`, and `LivePlayer:case-timeline` without mocks.
- Workbench/player/patrol/playback utility/VIDEO review visible copy is now guarded by the E2E contract plus W4 release scan against replacement characters and common mojibake fragments; keep W4 target coverage current as new visible review surfaces are added.
- Controller-level permission enforcement now has scoped parameters on export, download, timeline, detail stream, coverage, case timeline, and manifest verification endpoints, and configured camera scopes can be gated by `PermissionService` action permissions; the remaining audit is to seed release menu permissions, replace configured camera maps with the final tenant/user/camera permission source, and bind the same guard to the concrete playback URL endpoint.

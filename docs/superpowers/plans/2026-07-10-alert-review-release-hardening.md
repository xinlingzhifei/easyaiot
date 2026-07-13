# Alert Review Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the FR-01~FR-38 P0/P1/P2 release gates on top of the existing alert-review implementation, prove every local gate with fresh evidence, and preserve explicit blockers for unavailable real environments.

**Architecture:** Keep DEVICE as the review/supervision coordinator and VIDEO as the recording/export authority. Extend existing contracts only where an open risk is still unverified: module-safe migration tests, release-package tracking, real-service smoke inputs, permissions/audit evidence, scheduler/runtime checks, and frontend baseline/workbench checks. Do not introduce a parallel media or event lifecycle.

**Tech Stack:** Java 21/Spring/Maven, PostgreSQL 16 SQL migrations, Python Flask/pytest/ffmpeg, Vue 3/TypeScript/vue-tsc, Node.js smoke scripts, Git release verifier.

---

### Task 1: Freeze the baseline and preserve user changes

**Files:**
- Inspect only: `DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/HttpVideoResolverTest.java`
- Inspect only: `DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/SupervisionSchemaSqlTest.java`
- Inspect only: `docs/requirements/alert-review-frigate-fr01-fr38-hardening-review.md`

- [ ] **Step 1: Capture the current worktree state**

```powershell
git status --short --branch
git diff -- DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/HttpVideoResolverTest.java DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/SupervisionSchemaSqlTest.java
```

Expected: only the two module-path test changes are dirty; do not reset or overwrite them.

- [ ] **Step 2: Run the focused Java baseline**

```powershell
cd DEVICE
mvn -pl iot-system/iot-system-biz -am "-Dtest=HttpVideoResolverTest,SupervisionSchemaSqlTest" -DfailIfNoTests=false test
```

Expected: 33 tests pass with exit code 0.

### Task 2: Finish ReviewSegment and ReviewData release proof

**Files:**
- Modify: `DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/HttpVideoResolverTest.java`
- Modify: `DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/SupervisionSchemaSqlTest.java`
- Inspect/modify only if a test exposes a gap: `DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260702__alert_review_frigate_hardening.sql`
- Inspect/modify only if a test exposes a gap: `DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260704__alert_review_segment_tenant_scope.sql`
- Inspect/modify only if a test exposes a gap: `DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260705__alert_review_review_data_backfill.sql`
- Inspect/modify only if a test exposes a gap: `DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708__alert_review_segment_status_transition.sql`
- Inspect/modify only if a test exposes a gap: `DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_7__alert_review_segment_end_time_guard.sql`
- Inspect/modify only if a test exposes a gap: `DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_8__alert_review_segment_alert_severity_guard.sql`
- Inspect/modify only if a test exposes a gap: `DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_9__alert_review_merge_index_same_camera.sql`

- [ ] **Step 1: Run the ReviewSegment lifecycle regression**

```powershell
cd DEVICE
mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewServiceTest,SupervisionAlertReviewMapperStoreTest,SupervisionSchemaSqlTest" -DfailIfNoTests=false test
```

Expected: lifecycle, overlap, status migration, and schema tests pass.

- [ ] **Step 2: Run the PostgreSQL migration self-test in offline mode**

```powershell
node .scripts/alert-review-postgres-migration-smoke.test.mjs
node .scripts/verify-alert-review-release-package.test.mjs
```

Expected: migration smoke and release-package self-tests pass; if a required migration is not tracked, add a failing assertion first, then add only the missing production migration/package anchor.

- [ ] **Step 3: Run PG1 against PostgreSQL 16 when a database URL/container is available**

```powershell
node .scripts/alert-review-postgres-migration-smoke.mjs --database-url="$env:ALERT_REVIEW_PG_URL"
```

Expected: active same-camera overlap rejects, adjacent half-open boundaries pass, duplicate active `review_item_id` rejects, soft-deleted duplicates pass, invalid status/end-time/severity transitions reject, and concurrent overlap leaves exactly one winner. If the variable is absent, record `BLOCKED: no PostgreSQL 16 endpoint` without weakening the test.

### Task 3: Verify VIDEO configuration, real export evidence, and recording drift

**Files:**
- Inspect/modify only if contract tests fail: `VIDEO/app/services/record_export_service.py`
- Inspect/modify only if contract tests fail: `VIDEO/app/services/record_space_service.py`
- Inspect/modify only if contract tests fail: `VIDEO/app/services/record_video_service.py`
- Inspect/modify only if contract tests fail: `VIDEO/app/blueprints/record.py`
- Inspect/modify only if contract tests fail: `.scripts/alert-review-video-live-smoke.mjs`
- Inspect/modify only if contract tests fail: `.scripts/alert-review-production-smoke.mjs`

- [ ] **Step 1: Run VIDEO unit and local ffmpeg tests**

```powershell
cd VIDEO
python -m pytest test_record_export.py test_record_availability.py test_alert_record_query.py -q
```

Expected: coverage reason catalog, real ffmpeg manifest hashes, async worker lifecycle, download audit, and drift patrol tests pass.

- [ ] **Step 2: Run smoke script self-tests**

```powershell
cd ..
node .scripts/alert-review-video-live-smoke.test.mjs
node .scripts/alert-review-production-smoke.test.mjs
```

Expected: scripts reject aliased/local/mock/file URLs, require all four explicit VIDEO URLs, require manifest v2/storage drift evidence, and preserve sanitized child summaries.

- [ ] **Step 3: Run real VIDEO smoke only with explicit release parameters**

Keep the release origins split: set DEVICE `YFEIEYE_VIDEO_PUBLIC_PLAY_HOST=https://eye.yfeiai.com/yfeieye/dev-api`, keep DEVICE query/coverage/base/export URLs on the private VIDEO endpoint, and keep VIDEO `MEDIA_HTTP_PLAY_HOST=https://eye.yfeiai.com` for `/live`, `/ai`, and `/rtp` stream URLs.

```powershell
node .scripts/alert-review-video-live-smoke.mjs `
  --alert-record-query-url="$env:YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL" `
  --record-coverage-query-url="$env:YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL" `
  --record-base-url="$env:YFEIEYE_VIDEO_RECORD_BASE_URL" `
  --record-export-url="$env:YFEIEYE_VIDEO_RECORD_EXPORT_URL" `
  --device-id="$env:ALERT_REVIEW_VIDEO_DEVICE_ID" `
  --alert-time="$env:ALERT_REVIEW_VIDEO_ALERT_TIME" `
  --manifest-verifier-script=.scripts/record-export-manifest-verifier.mjs `
  --evidence-output-file=artifacts/live-video.json
```

Expected: a real camera recording is queried, coverage is classified, ffmpeg export is persisted, manifest is verified offline, download URL returns video bytes, and storage drift is healthy. Missing variables must produce a non-zero exit plus the exact missing-configuration reason.

### Task 4: Verify permissions, audit chain, rules, cases, and runtime jobs

**Files:**
- Inspect/modify only if regression exposes a gap: `DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/SupervisionAlertReviewServiceTest.java`
- Inspect/modify only if regression exposes a gap: `DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/SupervisionAlertReviewControllerTest.java`
- Inspect/modify only if regression exposes a gap: `DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/job/supervision/SupervisionAlertReviewRuntimePatrolJob.java`
- Inspect/modify only if regression exposes a gap: `DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/job/supervision/SupervisionAlertReviewRuntimeOutboxJob.java`
- Inspect/modify only if regression exposes a gap: `DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/job/supervision/SupervisionAlertReviewEventReconcileJob.java`
- Inspect/modify only if regression exposes a gap: `DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260708_2__alert_review_scheduler_jobs.sql`

- [ ] **Step 1: Run the complete DEVICE alert-review regression**

```powershell
cd DEVICE
mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewControllerTest,SupervisionAlertReviewServiceTest,SupervisionAlertReviewMapperStoreTest,HttpVideoResolverTest,SupervisionSchemaSqlTest" -DfailIfNoTests=false test
```

Expected: permissions fail closed, allow/deny audit rows carry user/tenant/camera, review cases and rule state transitions are idempotent, runtime patrol/outbox/reconcile jobs produce retryable summaries, and export/manifest audit metadata is reversible.

- [ ] **Step 2: Verify browser rule/workbench contracts**

```powershell
cd ..
pnpm test:alert-review-workbench:contract
pnpm test:alert-review-workbench:dev-api-mock
node .scripts/alert-review-visible-copy-scan.mjs
```

Expected: `inertiaFrames`, `loiteringSeconds`, replay explanation, topology cards, converted-item action policy, missing-video fallback copy, and real drawer save selectors pass with UTF-8-safe visible text.

### Task 5: Clear frontend type and player seek gates

**Files:**
- Inspect/modify only if typecheck fails: `WEB/src/api/device/patrol.ts`
- Inspect/modify only if typecheck fails: `WEB/src/components/FormDesign/**`
- Inspect/modify only if typecheck fails: `WEB/src/components/Player/**`
- Inspect/modify only if typecheck fails: `WEB/src/views/train/**`
- Inspect/modify only if seek contract fails: `WEB/src/views/alert/components/AlertReviewWorkbench.vue`
- Inspect/modify only if seek contract fails: `.scripts/alert-review-player-live-smoke.mjs`

- [ ] **Step 1: Run the full frontend type baseline**

```powershell
pnpm --dir WEB --pm-on-fail=ignore run type:check
```

Expected: `vue-tsc --noEmit --skipLibCheck` exits 0. The retry flag is only for Corepack/pnpm version-guard noise; compiler errors remain failures.

- [ ] **Step 2: Run playback contract tests**

```powershell
node .scripts/alert-review-playback-contract.test.mjs
node .scripts/alert-review-player-live-smoke.test.mjs
```

Expected: detail stream, coverage, and case timeline each preserve exact `seek_time`, `record_path`, and offset; release mode rejects local/mock media and requires native `video.currentTime` evidence.

- [ ] **Step 3: Run deployed player smoke when a real workbench URL is available**

```powershell
node .scripts/alert-review-player-live-smoke.mjs `
  --workbench-url="$env:ALERT_REVIEW_PLAYER_WORKBENCH_URL" `
  --review-row-text="$env:ALERT_REVIEW_PLAYER_ROW_TEXT" `
  --expected-seek-time="$env:ALERT_REVIEW_PLAYER_SEEK_TIME" `
  --coverage-expected-seek-time="$env:ALERT_REVIEW_PLAYER_COVERAGE_SEEK_TIME" `
  --case-timeline-expected-seek-time="$env:ALERT_REVIEW_PLAYER_CASE_SEEK_TIME" `
  --assert-native-current-time
```

Expected: all three real player entrances jump to their recording timestamps. Missing deployed URL/auth is a release blocker, not a pass.

### Task 6: Update the FR release table and package gate

**Files:**
- Modify: `docs/requirements/alert-review-frigate-fr01-fr38-hardening-review.md`
- Modify only if package verifier finds a gap: `.scripts/verify-alert-review-release-package.mjs`
- Modify only if acceptance inventory is missing: `.scripts/alert-review-production-smoke.test.mjs`

- [ ] **Step 1: Reconcile FR-01~FR-38 rows with executed evidence**

For each row, keep the API, table/artifact, primary test, and acceptance command. Mark real VIDEO/PG1/player/role smoke as `blocked` when parameters are unavailable; never replace an unexecuted command with a mock command.

- [ ] **Step 2: Run package and clean-tree gates**

```powershell
node .scripts/verify-alert-review-release-package.mjs
git diff --check
git status --short
```

Expected: no loose FR core files or untracked production migrations. Existing unrelated user changes must remain visible and must not be staged accidentally.

- [ ] **Step 3: Commit only scoped changes**

```powershell
git add DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/HttpVideoResolverTest.java DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision/SupervisionSchemaSqlTest.java docs/requirements/alert-review-frigate-fr01-fr38-hardening-review.md
git commit -m "test: close alert review release gates"
```

Expected: commit contains only test/path and FR release documentation changes unless a failing regression required a narrowly scoped production fix.

### Task 7: Final evidence and handoff

- [ ] **Step 1: Re-run the full local release gate set**

```powershell
cd DEVICE; mvn -pl iot-system/iot-system-biz -am "-Dtest=SupervisionAlertReviewControllerTest,SupervisionAlertReviewServiceTest,SupervisionAlertReviewMapperStoreTest,HttpVideoResolverTest,SupervisionSchemaSqlTest" -DfailIfNoTests=false test
cd ..\VIDEO; python -m pytest test_record_export.py test_record_availability.py test_alert_record_query.py -q
cd ..; pnpm test:alert-review-workbench; pnpm --dir WEB --pm-on-fail=ignore run type:check
node .scripts/verify-alert-review-release-package.mjs --require-clean
```

- [ ] **Step 2: Record blockers with commands and evidence paths**

If PG1, LiveVideo, LivePlayer, or deployed role smoke cannot run, record the exact command, missing endpoint/credential, exit code, and expected next action in the FR table and final report.

- [ ] **Step 3: Do not claim release complete until all P0 real-environment gates are green**

The local code/test/package result can be reported as complete only for the verified subset. Release readiness remains blocked while any required real VIDEO, PostgreSQL, object storage, permission-role, or player seek evidence is missing.

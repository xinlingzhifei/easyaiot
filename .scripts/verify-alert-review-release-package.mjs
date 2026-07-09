import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { VISIBLE_COPY_MOJIBAKE_PATTERNS } from './alert-review-visible-copy-scan.mjs';

export const FR_RELEASE_PATH_RULES = [
  {
    group: 'FR release gate tooling',
    match: /^\.scripts\/(verify-alert-review-release-package|record-export-manifest-verifier|alert-review-postgres-migration-smoke|alert-review-video-live-smoke|alert-review-device-integration-smoke|alert-review-production-smoke|alert-review-visible-copy-scan|alert-review-player-live-smoke)(\.test)?\.mjs$/,
  },
  {
    group: 'DEVICE review backend',
    match:
      /^DEVICE\/iot-system\/iot-system-biz\/src\/main\/java\/com\/basiclab\/iot\/system\/(controller\/admin\/supervision|dal\/dataobject\/supervision|dal\/pgsql\/supervision|job\/supervision|service\/supervision)\//,
  },
  {
    group: 'DEVICE schema and migration',
    match:
      /^DEVICE\/iot-system\/iot-system-biz\/src\/main\/resources\/(schemas\/alert-review-|sql\/migrations\/(V2026070[245678]__alert_review_(frigate_hardening|segment_tenant_scope|review_data_backfill|media_permissions|item_media_audit|segment_status_transition)|V20260708_2__alert_review_scheduler_jobs|V20260708_3__alert_review_report_ack|V20260708_4__alert_review_runtime_outbox_notify_templates|V20260708_5__alert_review_runtime_outbox_delivery|V20260708_6__alert_review_runtime_outbox_claim|V20260708_7__alert_review_segment_end_time_guard|V20260708_8__alert_review_segment_alert_severity_guard)\.sql|sql\/supervision_event_closure_v1\.sql)/,
  },
  {
    group: 'DEVICE review regression tests',
    match:
      /^DEVICE\/iot-system\/iot-system-biz\/src\/test\/java\/com\/basiclab\/iot\/system\/supervision\/(ConfiguredReviewCameraPermissionResolver|HttpVideoResolver|NotifyReviewRuntimeOutboxPublisherTest|SupervisionAlertReview|SupervisionSchemaSqlTest)/,
  },
  {
    group: 'DEVICE video integration config',
    match: /^DEVICE\/(docker-compose\.yml|iot-system\/iot-system-biz\/src\/main\/resources\/application\.yaml)$/,
  },
  {
    group: 'VIDEO record evidence package',
    match:
      /^VIDEO\/(app\/blueprints\/record\.py|app\/services\/record_(export|export_manifest_verifier|video).*|test_record_(availability|export)\.py|docker-compose\.yaml)$/,
  },
  {
    group: 'WEB alert review workbench package',
    match:
      /^WEB\/(package\.json|scripts\/(alert-review-workbench-e2e-check(\.test)?|alert-review-playback-contract\.test)\.mjs|scripts\/fixtures\/alert-review-workbench-e2e\/|src\/api\/(supervision\/alertReview|device\/patrol)\.ts|src\/components\/(VideoPlayer\/DialogPlayer\.vue|Player\/module\/jessibuca\.vue)|src\/utils\/(alertRecord|alertRecordPlayback|withInstall)\.ts|src\/views\/alert\/components\/AlertReviewWorkbench\.vue)/,
  },
  {
    group: 'FR documentation package',
    match: /^docs\/(requirements\/alert-review-frigate-fr01-fr38-hardening-review\.md|superpowers\/(plans|specs)\/2026-0[67]-.*alert-review.*\.md)$/,
  },
];

const MOJIBAKE_PATTERNS = [
  ...VISIBLE_COPY_MOJIBAKE_PATTERNS,
  { pattern: '\u9352\u6d98\u7f13', reason: 'encoding_mojibake' },
  { pattern: '\u93c8\u5d85\u59df', reason: 'encoding_mojibake' },
  { pattern: '\u9363\u3125\u5534\u95ae\u3129\u654a\u7487', reason: 'encoding_mojibake' },
];

const TRACKED_RELEASE_PATHS = [
  '.scripts/verify-alert-review-release-package.mjs',
  '.scripts/verify-alert-review-release-package.test.mjs',
  '.scripts/record-export-manifest-verifier.mjs',
  '.scripts/alert-review-postgres-migration-smoke.mjs',
  '.scripts/alert-review-postgres-migration-smoke.test.mjs',
  '.scripts/alert-review-video-live-smoke.mjs',
  '.scripts/alert-review-video-live-smoke.test.mjs',
  '.scripts/alert-review-device-integration-smoke.mjs',
  '.scripts/alert-review-device-integration-smoke.test.mjs',
  '.scripts/alert-review-production-smoke.mjs',
  '.scripts/alert-review-production-smoke.test.mjs',
  '.scripts/alert-review-visible-copy-scan.mjs',
  '.scripts/alert-review-visible-copy-scan.test.mjs',
  '.scripts/alert-review-player-live-smoke.mjs',
  '.scripts/alert-review-player-live-smoke.test.mjs',
  'DEVICE/docker-compose.yml',
  'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/controller/admin/supervision',
  'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/dal/dataobject/supervision',
  'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/dal/pgsql/supervision',
  'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/job/supervision',
  'DEVICE/iot-system/iot-system-biz/src/main/java/com/basiclab/iot/system/service/supervision',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/application.yaml',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/schemas',
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260702__alert_review_frigate_hardening.sql',
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
  'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/supervision_event_closure_v1.sql',
  'DEVICE/iot-system/iot-system-biz/src/test/java/com/basiclab/iot/system/supervision',
  'VIDEO/app/blueprints/record.py',
  'VIDEO/app/services/record_export_manifest_verifier.py',
  'VIDEO/app/services/record_export_service.py',
  'VIDEO/app/services/record_video_service.py',
  'VIDEO/docker-compose.yaml',
  'VIDEO/test_record_availability.py',
  'VIDEO/test_record_export.py',
  'WEB/package.json',
  'WEB/scripts/alert-review-workbench-e2e-check.mjs',
  'WEB/scripts/alert-review-workbench-e2e-check.test.mjs',
  'WEB/scripts/alert-review-playback-contract.test.mjs',
  'WEB/scripts/fixtures/alert-review-workbench-e2e',
  'WEB/src/api/device/patrol.ts',
  'WEB/src/api/supervision/alertReview.ts',
  'WEB/src/components/VideoPlayer/DialogPlayer.vue',
  'WEB/src/components/Player/module/jessibuca.vue',
  'WEB/src/utils/alertRecord.ts',
  'WEB/src/utils/alertRecordPlayback.ts',
  'WEB/src/utils/withInstall.ts',
  'WEB/src/views/alert/components/AlertReviewWorkbench.vue',
  'docs/requirements/alert-review-frigate-fr01-fr38-hardening-review.md',
  'docs/superpowers/plans/2026-06-30-alert-review-phase-2.md',
  'docs/superpowers/plans/2026-07-01-alert-review-fr13-fr16.md',
  'docs/superpowers/specs/2026-06-30-alert-review-phase-2-design.md',
];

function normalizePath(rawPath) {
  const renameTarget = rawPath.includes(' -> ') ? rawPath.split(' -> ').pop() : rawPath;
  return renameTarget.replace(/^"\s*/, '').replace(/\s*"$/, '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function parseStatusLine(line) {
  if (!line.trim()) {
    return null;
  }
  if (line.length < 4) {
    return null;
  }
  return {
    status: line.slice(0, 2),
    path: normalizePath(line.slice(3)),
  };
}

function releaseGroupFor(path) {
  return FR_RELEASE_PATH_RULES.find((rule) => rule.match.test(path))?.group ?? null;
}

function blockerReason(entry, requireClean) {
  const [indexStatus, worktreeStatus] = entry.status;
  if (entry.status === '??') {
    return 'untracked';
  }
  if (indexStatus === 'D' || worktreeStatus === 'D') {
    return 'deleted';
  }
  if (entry.status.includes('U')) {
    return 'unmerged';
  }
  if (requireClean && entry.status.trim()) {
    return 'dirty';
  }
  if (worktreeStatus !== ' ') {
    return 'unstaged';
  }
  return null;
}

export function evaluateStatus(statusText, options = {}) {
  const requireClean = options.requireClean === true;
  const entries = [];
  const blockers = [];

  for (const rawLine of statusText.split(/\r?\n/)) {
    const entry = parseStatusLine(rawLine);
    if (!entry) {
      continue;
    }
    const group = releaseGroupFor(entry.path);
    if (!group) {
      continue;
    }

    const checkedEntry = { ...entry, group };
    entries.push(checkedEntry);
    const reason = blockerReason(checkedEntry, requireClean);
    if (reason) {
      blockers.push({ ...checkedEntry, reason });
    }
  }

  return {
    ok: blockers.length === 0,
    entries,
    blockers,
  };
}

export function releaseEntriesForTrackedPaths(paths) {
  const entries = [];
  for (const rawPath of paths) {
    const path = normalizePath(rawPath || '');
    const group = releaseGroupFor(path);
    if (!group) {
      continue;
    }
    entries.push({
      status: '  ',
      path,
      group,
    });
  }
  return entries;
}

export function scanTextQuality(files) {
  const blockers = [];
  for (const file of files) {
    const path = normalizePath(file.path || '');
    const group = releaseGroupFor(path);
    if (!group || _looksBinaryPath(path)) {
      continue;
    }
    const content = String(file.content ?? '');
    for (const { pattern, reason } of MOJIBAKE_PATTERNS) {
      const index = content.indexOf(pattern);
      if (index === -1) {
        continue;
      }
      blockers.push({
        path,
        group,
        reason,
        pattern,
        line: _lineNumberAt(content, index),
      });
      break;
    }
  }
  return {
    ok: blockers.length === 0,
    blockers,
  };
}

export function scanWebTypecheckGate(files) {
  const packageFile = files.find((file) => normalizePath(file.path || '') === 'WEB/package.json');
  if (!packageFile) {
    return { ok: true, blockers: [] };
  }
  const path = 'WEB/package.json';
  const group = releaseGroupFor(path);
  const blockers = [];
  let parsed;
  try {
    parsed = JSON.parse(String(packageFile.content ?? ''));
  } catch {
    blockers.push({ path, group, reason: 'web_typecheck_gate_invalid_package_json' });
    return { ok: false, blockers };
  }
  const typecheck = parsed?.scripts?.['type:check'];
  const typecheckCommand = String(typecheck || '');
  if (!hasText(typecheck)) {
    blockers.push({ path, group, reason: 'web_typecheck_gate_missing' });
  } else if (!typecheckCommand.includes('vue-tsc') || !typecheckCommand.includes('--noEmit')) {
    blockers.push({ path, group, reason: 'web_typecheck_gate_weakened' });
  }
  return {
    ok: blockers.length === 0,
    blockers,
  };
}

export function scanMediaPermissionGate(files) {
  const migrationPath = 'DEVICE/iot-system/iot-system-biz/src/main/resources/sql/migrations/V20260706__alert_review_media_permissions.sql';
  const migration = files.find((file) => normalizePath(file.path || '') === migrationPath);
  const appConfigPath = 'DEVICE/iot-system/iot-system-biz/src/main/resources/application.yaml';
  const appConfig = files.find((file) => normalizePath(file.path || '') === appConfigPath);
  const blockers = [];
  if (migration) {
    const permissionReasons = [
      ['system:supervision-alert-review:media:playback', 'media_permission_playback_seed_missing'],
      ['system:supervision-alert-review:media:snapshot', 'media_permission_snapshot_seed_missing'],
      ['system:supervision-alert-review:media:export', 'media_permission_export_seed_missing'],
      ['system:supervision-alert-review:media:download', 'media_permission_download_seed_missing'],
      ['system:supervision-alert-review:media:manifest', 'media_permission_manifest_seed_missing'],
    ];
    const migrationContent = String(migration.content ?? '');
    for (const [permission, reason] of permissionReasons) {
      if (!migrationContent.includes(permission)) {
        blockers.push({
          path: migrationPath,
          group: releaseGroupFor(migrationPath),
          reason,
        });
      }
    }
  }
  if (appConfig) {
    const configContent = String(appConfig.content ?? '');
    const actionPermissionReasons = [
      [['action-permissions:', 'playback:', 'system:supervision-alert-review:media:playback'], 'media_permission_playback_action_config_missing'],
      [['action-permissions:', 'snapshot:', 'system:supervision-alert-review:media:snapshot'], 'media_permission_snapshot_action_config_missing'],
      [['action-permissions:', 'coverage:', 'system:supervision-alert-review:media:playback'], 'media_permission_coverage_action_config_missing'],
      [['action-permissions:', 'export:', 'system:supervision-alert-review:media:export'], 'media_permission_export_action_config_missing'],
      [['action-permissions:', 'download:', 'system:supervision-alert-review:media:download'], 'media_permission_download_action_config_missing'],
      [['action-permissions:', 'manifest_verify:', 'system:supervision-alert-review:media:manifest'], 'media_permission_manifest_action_config_missing'],
    ];
    for (const [fragments, reason] of actionPermissionReasons) {
      if (!containsAll(configContent, fragments)) {
        blockers.push({
          path: appConfigPath,
          group: releaseGroupFor(appConfigPath),
          reason,
        });
      }
    }
  }
  return {
    ok: blockers.length === 0,
    blockers,
  };
}

export function scanLiveVideoEvidenceGate(files) {
  const blockers = [];
  const liveVideo = files.find((file) => normalizePath(file.path || '') === '.scripts/alert-review-video-live-smoke.mjs');
  if (liveVideo && /\brecordCoverageQueryUrl\s*=\s*parsed\.alertRecordQueryUrl\b/.test(liveVideo.content)) {
    blockers.push({
      path: '.scripts/alert-review-video-live-smoke.mjs',
      group: releaseGroupFor('.scripts/alert-review-video-live-smoke.mjs'),
      reason: 'live_video_coverage_url_alias_present',
    });
  }
  if (liveVideo && !containsAll(liveVideo.content, [
    'validateManifestSignature',
    'isHmacSha256SignatureValue',
    'signature value is not canonical hmac-sha256',
    'manifestSignature',
    'hmac-sha256',
    'signatureVersion',
    'keyId',
  ])) {
    blockers.push({
      path: '.scripts/alert-review-video-live-smoke.mjs',
      group: releaseGroupFor('.scripts/alert-review-video-live-smoke.mjs'),
      reason: 'live_video_manifest_signature_summary_missing',
    });
  }
  if (liveVideo && !containsAll(liveVideo.content, [
    'runManifestVerifierIfConfigured',
    'manifestVerification',
    'manifestVerifierScript',
    'runManifestVerifierScript',
    'result.status !== 0',
    'verifier failed with exit',
  ])) {
    blockers.push({
      path: '.scripts/alert-review-video-live-smoke.mjs',
      group: releaseGroupFor('.scripts/alert-review-video-live-smoke.mjs'),
      reason: 'live_video_manifest_verifier_summary_missing',
    });
  }
  if (liveVideo && liveVideo.content.includes('requiredOptionErrors') && !containsAll(liveVideo.content, [
    'manifestVerifierScript',
    'missing --manifest-verifier-script',
    'YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT',
  ])) {
    blockers.push({
      path: '.scripts/alert-review-video-live-smoke.mjs',
      group: releaseGroupFor('.scripts/alert-review-video-live-smoke.mjs'),
      reason: 'live_video_manifest_verifier_required_missing',
    });
  }
  if (liveVideo && !containsAll(liveVideo.content, [
    'assertReleaseMediaEvidence',
    'assertReleaseSegmentMediaEvidence',
    'looksLocalOrMockMediaEvidence',
    'looksInlineOrOpaqueMediaEvidence',
    'looksAbsoluteLocalPathEvidence',
    'data:',
    'blob:',
    'about:',
    'validateDownloadProbeHeaders',
    'isVideoDownloadContentType',
    'content-type',
    'content-length',
    'video/',
    'application/octet-stream',
    'isSha256Digest',
    '[a-f0-9]{64}',
    'invalid source segment hash',
    'invalid output file hash',
    'ffmpegCommandHashes',
    'invalid ffmpeg command hash',
    'validateClipWindows',
    'invalid clip window',
    'validateManifestConcatOrder',
    'normalizeConcatOrderEntry',
    'validateRootConcatOrderCoverage',
    'concatOrder.map',
    'entry.index',
    'duplicate concat order index',
    'invalid concat order index',
    'references missing segment index',
    'omits segment index',
    'does not match segment count',
    'raw.startsWith',
    'https:${raw}',
    'mock/',
    'mock\\',
    'recordUriSource',
    'file_path',
    'record URI',
    'download URL',
    'manifest URL',
  ])) {
    blockers.push({
      path: '.scripts/alert-review-video-live-smoke.mjs',
      group: releaseGroupFor('.scripts/alert-review-video-live-smoke.mjs'),
      reason: 'live_video_media_evidence_gate_missing',
    });
  }
  const productionSmoke = files.find((file) => normalizePath(file.path || '') === '.scripts/alert-review-production-smoke.mjs');
  if (productionSmoke && !containsAll(productionSmoke.content, [
    'payload.manifestSignature',
    'summary.manifestSignature',
  ])) {
    blockers.push({
      path: '.scripts/alert-review-production-smoke.mjs',
      group: releaseGroupFor('.scripts/alert-review-production-smoke.mjs'),
      reason: 'production_smoke_manifest_signature_summary_missing',
    });
  }
  if (productionSmoke && !containsAll(productionSmoke.content, [
    'payload.manifestVerification',
    'summary.manifestVerification',
  ])) {
    blockers.push({
      path: '.scripts/alert-review-production-smoke.mjs',
      group: releaseGroupFor('.scripts/alert-review-production-smoke.mjs'),
      reason: 'production_smoke_manifest_verifier_summary_missing',
    });
  }
  if (productionSmoke && !containsAll(productionSmoke.content, [
    'videoManifestVerifierScript',
    'missing --video-manifest-verifier-script',
    'YFEIEYE_VIDEO_MANIFEST_VERIFIER_SCRIPT',
  ])) {
    blockers.push({
      path: '.scripts/alert-review-production-smoke.mjs',
      group: releaseGroupFor('.scripts/alert-review-production-smoke.mjs'),
      reason: 'production_smoke_manifest_verifier_required_missing',
    });
  }
  if (productionSmoke && productionSmoke.content.includes('requiredOptionErrors') && !containsAll(productionSmoke.content, [
    'evidenceOutputFile',
    'missing --evidence-output-file',
    'YFEIEYE_PRODUCTION_SMOKE_EVIDENCE_FILE',
  ])) {
    blockers.push({
      path: '.scripts/alert-review-production-smoke.mjs',
      group: releaseGroupFor('.scripts/alert-review-production-smoke.mjs'),
      reason: 'production_smoke_evidence_output_required_missing',
    });
  }
  if (productionSmoke && productionSmoke.content.includes('liveDeviceEvidenceError') && !containsAll(productionSmoke.content, [
    'auditChain',
    'eventIds',
    'reviewItemIds',
    'evidence_download_audited',
    'export_downloaded',
    'missing auditChain exportJobNo evidence',
  ])) {
    blockers.push({
      path: '.scripts/alert-review-production-smoke.mjs',
      group: releaseGroupFor('.scripts/alert-review-production-smoke.mjs'),
      reason: 'production_smoke_audit_chain_summary_missing',
    });
  }
  return {
    ok: blockers.length === 0,
    blockers,
  };
}

function _lineNumberAt(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function _looksBinaryPath(path) {
  return /\.(png|jpe?g|gif|webp|ico|mp4|mov|avi|zip|gz|tar|7z|pdf)$/i.test(path);
}

function hasText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function containsAll(content, fragments) {
  const text = String(content ?? '');
  return fragments.every((fragment) => text.includes(fragment));
}

function readStatusText(args) {
  const statusFileArg = args.find((arg) => arg.startsWith('--status-file='));
  if (statusFileArg) {
    return readFileSync(statusFileArg.slice('--status-file='.length), 'utf8');
  }
  return execFileSync('git', ['status', '--short', '--untracked-files=all'], {
    encoding: 'utf8',
  });
}

function readTrackedReleaseEntries() {
  const output = execFileSync('git', ['ls-files', '--', ...TRACKED_RELEASE_PATHS], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return releaseEntriesForTrackedPaths(output.split(/\r?\n/));
}

function mergeEntries(primary, secondary) {
  const seen = new Set(primary.map((entry) => entry.path));
  const merged = [...primary];
  for (const entry of secondary) {
    if (seen.has(entry.path)) {
      continue;
    }
    seen.add(entry.path);
    merged.push(entry);
  }
  return merged;
}

function readReleaseTextFiles(entries) {
  const uniquePaths = [...new Set(entries.map((entry) => entry.path))];
  const files = [];
  for (const path of uniquePaths) {
    if (_looksBinaryPath(path) || !existsSync(path)) {
      continue;
    }
    try {
      if (statSync(path).isFile()) {
        files.push({ path, content: readFileSync(path, 'utf8') });
      }
    } catch {
      // Status blockers will catch deleted or inaccessible files.
    }
  }
  return files;
}

function printHelp() {
  console.log(`Usage: node .scripts/verify-alert-review-release-package.mjs [--require-clean] [--status-file=PATH]

Checks that FR-01..FR-38 alert-review core files are not loose in the worktree.
Default mode allows staged FR changes for pre-commit packaging review.
Use --require-clean for a release artifact that must come only from HEAD.`);
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  const result = evaluateStatus(readStatusText(args), {
    requireClean: args.includes('--require-clean'),
  });
  const entriesForTextScan = args.includes('--require-clean')
    ? mergeEntries(result.entries, readTrackedReleaseEntries())
    : result.entries;
  const releaseTextFiles = readReleaseTextFiles(entriesForTextScan);
  const textResult = scanTextQuality(releaseTextFiles);
  const webTypecheckResult = scanWebTypecheckGate(releaseTextFiles);
  const mediaPermissionResult = scanMediaPermissionGate(releaseTextFiles);
  const liveVideoEvidenceResult = scanLiveVideoEvidenceGate(releaseTextFiles);
  result.blockers.push(...textResult.blockers);
  result.blockers.push(...webTypecheckResult.blockers);
  result.blockers.push(...mediaPermissionResult.blockers);
  result.blockers.push(...liveVideoEvidenceResult.blockers);
  result.ok = result.blockers.length === 0;

  if (!result.ok) {
    console.error('Alert review release package verifier failed:');
    for (const blocker of result.blockers) {
      const status = blocker.status ? `${blocker.status} ` : '';
      const line = blocker.line ? `:${blocker.line}` : '';
      console.error(`- ${blocker.reason}: ${status}${blocker.path}${line} (${blocker.group})`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Alert review release package verifier OK: ${entriesForTextScan.length} FR release path(s) checked; no loose FR core file blocked packaging.`,
  );
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  runCli();
}

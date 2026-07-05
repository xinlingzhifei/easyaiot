import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FR_RELEASE_PATH_RULES = [
  {
    group: 'FR release gate tooling',
    match: /^\.scripts\/(verify-alert-review-release-package|alert-review-postgres-migration-smoke|alert-review-video-live-smoke|alert-review-visible-copy-scan)(\.test)?\.mjs$/,
  },
  {
    group: 'DEVICE review backend',
    match:
      /^DEVICE\/iot-system\/iot-system-biz\/src\/main\/java\/com\/basiclab\/iot\/system\/(controller\/admin\/supervision|dal\/dataobject\/supervision|dal\/pgsql\/supervision|job\/supervision|service\/supervision)\//,
  },
  {
    group: 'DEVICE schema and migration',
    match:
      /^DEVICE\/iot-system\/iot-system-biz\/src\/main\/resources\/(schemas\/alert-review-|sql\/migrations\/V2026070[24]__alert_review_(frigate_hardening|segment_tenant_scope)\.sql|sql\/supervision_event_closure_v1\.sql)/,
  },
  {
    group: 'DEVICE review regression tests',
    match:
      /^DEVICE\/iot-system\/iot-system-biz\/src\/test\/java\/com\/basiclab\/iot\/system\/supervision\/(ConfiguredReviewCameraPermissionResolver|HttpVideoResolver|SupervisionAlertReview|SupervisionSchemaSqlTest)/,
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
      /^WEB\/(package\.json|scripts\/(alert-review-workbench-e2e-check(\.test)?|alert-review-playback-contract\.test)\.mjs|scripts\/fixtures\/alert-review-workbench-e2e\/|src\/api\/supervision\/alertReview\.ts|src\/utils\/withInstall\.ts|src\/views\/alert\/components\/AlertReviewWorkbench\.vue)/,
  },
  {
    group: 'FR documentation package',
    match: /^docs\/(requirements\/alert-review-frigate-fr01-fr38-hardening-review\.md|superpowers\/(plans|specs)\/2026-0[67]-.*alert-review.*\.md)$/,
  },
];

const MOJIBAKE_PATTERNS = [
  '\uFFFD',
  '\u9352\u6d98\u7f13',
  '\u93c8\u5d85\u59df',
  '\u9363\u3125\u5534\u95ae\u3129\u654a\u7487',
];

const TRACKED_RELEASE_PATHS = [
  '.scripts/verify-alert-review-release-package.mjs',
  '.scripts/verify-alert-review-release-package.test.mjs',
  '.scripts/alert-review-postgres-migration-smoke.mjs',
  '.scripts/alert-review-postgres-migration-smoke.test.mjs',
  '.scripts/alert-review-video-live-smoke.mjs',
  '.scripts/alert-review-video-live-smoke.test.mjs',
  '.scripts/alert-review-visible-copy-scan.mjs',
  '.scripts/alert-review-visible-copy-scan.test.mjs',
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
  'WEB/src/api/supervision/alertReview.ts',
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
    for (const pattern of MOJIBAKE_PATTERNS) {
      const index = content.indexOf(pattern);
      if (index === -1) {
        continue;
      }
      blockers.push({
        path,
        group,
        reason: pattern === '\uFFFD' ? 'encoding_replacement_character' : 'encoding_mojibake',
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

function _lineNumberAt(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function _looksBinaryPath(path) {
  return /\.(png|jpe?g|gif|webp|ico|mp4|mov|avi|zip|gz|tar|7z|pdf)$/i.test(path);
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
  const textResult = scanTextQuality(readReleaseTextFiles(entriesForTextScan));
  result.blockers.push(...textResult.blockers);
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

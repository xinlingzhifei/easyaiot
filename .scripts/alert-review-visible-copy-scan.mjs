import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VISIBLE_COPY_TARGETS = [
  'WEB/src/views/alert/components/AlertReviewWorkbench.vue',
  'WEB/src/components/VideoPlayer/DialogPlayer.vue',
  'WEB/src/components/Player/module/jessibuca.vue',
  'WEB/src/api/device/patrol.ts',
  'WEB/src/utils/alertRecord.ts',
  'WEB/src/utils/alertRecordPlayback.ts',
  'VIDEO/app/blueprints/record.py',
  'VIDEO/app/services/record_export_service.py',
  'VIDEO/app/services/record_video_service.py',
];

const MOJIBAKE_PATTERNS = [
  { pattern: '\u93bd\u52eb\u511a', reason: 'encoding_mojibake' },
  { pattern: '\u5bb8\u2103', reason: 'encoding_mojibake' },
  { pattern: '\uFFFD', reason: 'encoding_replacement_character' },
  { pattern: '鍛婅', reason: 'encoding_mojibake' },
  { pattern: '绾跨', reason: 'encoding_mojibake' },
  { pattern: '褰曞', reason: 'encoding_mojibake' },
  { pattern: '鏃犻', reason: 'encoding_mojibake' },
  { pattern: '寰呭', reason: 'encoding_mojibake' },
  { pattern: '杞', reason: 'encoding_mojibake' },
  { pattern: '瑙嗛', reason: 'encoding_mojibake' },
  { pattern: '鎾', reason: 'encoding_mojibake' },
  { pattern: '瀵板', reason: 'encoding_mojibake' },
  { pattern: '瑜版', reason: 'encoding_mojibake' },
  { pattern: '鈧', reason: 'encoding_mojibake' },
  { pattern: '閻', reason: 'encoding_mojibake' },
  { pattern: '鐠', reason: 'encoding_mojibake' },
  { pattern: '鏉╂', reason: 'encoding_mojibake' },
  { pattern: '闁插', reason: 'encoding_mojibake' },
  { pattern: '閺堝', reason: 'encoding_mojibake' },
];

function normalizePath(path) {
  return String(path || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

export function scanVisibleCopyFiles(files) {
  const blockers = [];
  for (const file of files) {
    const path = normalizePath(file.path);
    const content = String(file.content ?? '');
    for (const { pattern, reason } of MOJIBAKE_PATTERNS) {
      const index = content.indexOf(pattern);
      if (index === -1) {
        continue;
      }
      blockers.push({
        path,
        reason,
        pattern,
        line: lineNumberAt(content, index),
      });
      break;
    }
  }
  return {
    ok: blockers.length === 0,
    blockers,
  };
}

function readTargets(targets) {
  const files = [];
  for (const target of targets) {
    const path = normalizePath(target);
    if (!existsSync(path) || !statSync(path).isFile()) {
      throw new Error(`visible-copy target missing: ${path}`);
    }
    files.push({ path, content: readFileSync(path, 'utf8') });
  }
  return files;
}

function parseTargets(args) {
  const explicitTargets = args
    .filter(arg => arg.startsWith('--target='))
    .map(arg => normalizePath(arg.slice('--target='.length)))
    .filter(Boolean);
  return explicitTargets.length ? explicitTargets : VISIBLE_COPY_TARGETS;
}

function printHelp() {
  console.log(`Usage: node .scripts/alert-review-visible-copy-scan.mjs [--target=PATH ...]

Scans FR alert-review visible-copy files for UTF-8 replacement characters and common mojibake fragments.`);
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  let result;
  try {
    result = scanVisibleCopyFiles(readTargets(parseTargets(args)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  if (!result.ok) {
    console.error('Alert review visible copy scan failed:');
    for (const blocker of result.blockers) {
      console.error(`- ${blocker.reason}: ${blocker.path}:${blocker.line}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Alert review visible copy scan OK: ${parseTargets(args).length} file(s) checked.`);
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  runCli();
}

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  evaluateStatus,
  releaseEntriesForTrackedPaths,
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
`);
assert.equal(unstagedWorkbench.ok, false);
assert.equal(unstagedWorkbench.blockers[0].reason, 'unstaged');

const stagedWorkbench = evaluateStatus(`
A  WEB/src/views/alert/components/AlertReviewWorkbench.vue
M  DEVICE/iot-system/iot-system-biz/src/main/resources/sql/supervision_event_closure_v1.sql
`);
assert.equal(stagedWorkbench.ok, true);
assert.deepEqual(stagedWorkbench.blockers, []);

const untrackedGate = evaluateStatus(`
?? .scripts/verify-alert-review-release-package.mjs
`);
assert.equal(untrackedGate.ok, false);
assert.equal(untrackedGate.blockers[0].group, 'FR release gate tooling');

const trackedReleaseEntries = releaseEntriesForTrackedPaths([
  'README.md',
  'WEB/src/api/supervision/alertReview.ts',
  '.scripts/verify-alert-review-release-package.mjs',
]);
assert.equal(trackedReleaseEntries.length, 2);
assert.deepEqual(
  trackedReleaseEntries.map((entry) => [entry.status, entry.path, entry.group]),
  [
    ['  ', 'WEB/src/api/supervision/alertReview.ts', 'WEB alert review workbench package'],
    ['  ', '.scripts/verify-alert-review-release-package.mjs', 'FR release gate tooling'],
  ],
);

const mojibakeScan = scanTextQuality([
  {
    path: 'VIDEO/app/blueprints/record.py',
    content: "logger.error(f'\u9352\u6d98\u7f13\u590d\u6838\u8bc1\u636e\u5f55\u50cf\u5bfc\u51fa\u4efb\u52a1\u5931\u8d25: {str(e)}')",
  },
]);
assert.equal(mojibakeScan.ok, false);
assert.equal(mojibakeScan.blockers[0].reason, 'encoding_mojibake');

const cleanTextScan = scanTextQuality([
  {
    path: 'VIDEO/app/blueprints/record.py',
    content: "logger.error(f'\u521b\u5efa\u590d\u6838\u8bc1\u636e\u5f55\u50cf\u5bfc\u51fa\u4efb\u52a1\u5931\u8d25: {str(e)}')",
  },
]);
assert.equal(cleanTextScan.ok, true);

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

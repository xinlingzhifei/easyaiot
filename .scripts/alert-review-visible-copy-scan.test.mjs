import assert from 'node:assert/strict';

import {
  VISIBLE_COPY_TARGETS,
  scanVisibleCopyFiles,
} from './alert-review-visible-copy-scan.mjs';

const requiredTargets = [
  'WEB/src/views/alert/components/AlertReviewWorkbench.vue',
  'WEB/src/components/VideoPlayer/DialogPlayer.vue',
  'WEB/src/components/Player/module/jessibuca.vue',
  'WEB/src/api/device/patrol.ts',
  'VIDEO/app/blueprints/record.py',
  'VIDEO/app/services/record_export_service.py',
  'VIDEO/app/services/record_video_service.py',
];

for (const target of requiredTargets) {
  assert.ok(VISIBLE_COPY_TARGETS.includes(target), `missing visible-copy target ${target}`);
}

const clean = scanVisibleCopyFiles([
  {
    path: 'WEB/src/components/VideoPlayer/DialogPlayer.vue',
    content: '视频播放 录像加载中 正在请求点播',
  },
]);
assert.equal(clean.ok, true);
assert.deepEqual(clean.blockers, []);

const replacement = scanVisibleCopyFiles([
  {
    path: 'WEB/src/views/alert/components/AlertReviewWorkbench.vue',
    content: `线索复核${String.fromCharCode(0xfffd)}`,
  },
]);
assert.equal(replacement.ok, false);
assert.equal(replacement.blockers[0].reason, 'encoding_replacement_character');

const mojibake = scanVisibleCopyFiles([
  {
    path: 'VIDEO/app/blueprints/record.py',
    content: 'logger.error("鍛婅警录像导出失败")',
  },
]);
assert.equal(mojibake.ok, false);
assert.equal(mojibake.blockers[0].reason, 'encoding_mojibake');
assert.equal(mojibake.blockers[0].line, 1);

console.log('alert review visible copy scan tests OK');

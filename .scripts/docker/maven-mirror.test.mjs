import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const dockerScriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(dockerScriptDir, '..', '..');
const expectedMirror = 'https://maven.aliyun.com/repository/public';

test('device build scripts default to the reachable Maven mirror', () => {
  const sources = [
    join(rootDir, 'DEVICE', 'install_linux.sh'),
    join(dockerScriptDir, 'runtime_image.sh'),
  ].map((file) => readFileSync(file, 'utf8'));

  for (const source of sources) {
    assert.match(source, new RegExp(expectedMirror.replaceAll('.', '\\.')));
    assert.doesNotMatch(
      source,
      /https:\/\/mirrors\.tuna\.tsinghua\.edu\.cn\/repository\/maven-public\/?/,
    );
  }
});

test('device C1 build avoids parallel reactor repository lock contention', () => {
  const source = readFileSync(join(rootDir, 'DEVICE', 'install_linux.sh'), 'utf8');

  assert.doesNotMatch(source, /mvn -s \/m2\/settings\.xml -B -ntp -T 1C/);
});

test('device runtime images avoid concurrent build contexts', () => {
  const source = readFileSync(join(rootDir, 'DEVICE', 'install_linux.sh'), 'utf8');

  assert.doesNotMatch(source, /\( docker build [^\n]+\) >"\$log" 2>&1 &/);
});

test('device start does not pass a Compose flag as a service name', () => {
  const source = readFileSync(join(rootDir, 'DEVICE', 'install_linux.sh'), 'utf8');

  assert.doesNotMatch(source, /compose_up_detached --quiet-pull/);
});

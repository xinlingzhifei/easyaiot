#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const verifierPath = join(repoRoot, 'VIDEO', 'app', 'services', 'record_export_manifest_verifier.py');
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

if (!existsSync(verifierPath)) {
  console.error(`record export manifest verifier not found: ${verifierPath}`);
  process.exit(1);
}

const result = spawnSync(python, [verifierPath, ...process.argv.slice(2)], {
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`failed to run ${python}: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);

import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const sourceRoots = ['src', 'tests', 'scripts'];
const files = ['vite.config.js'];

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectJavaScriptFiles(entryPath);
    else if (/\.(?:js|mjs)$/.test(entry.name)) files.push(entryPath);
  }
}

for (const root of sourceRoots) await collectJavaScriptFiles(root);

for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);

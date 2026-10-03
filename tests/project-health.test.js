import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('declares a Node version compatible with Vite 8', async () => {
  const packageJson = JSON.parse(await read('package.json'));
  assert.equal(packageJson.engines.node, '^20.19.0 || >=22.12.0');
});

test('publishes AGPL licensing and required vendored MIT attribution', async () => {
  const [license, notices] = await Promise.all([
    read('LICENSE'),
    read('public/THIRD_PARTY_NOTICES.md'),
  ]);

  assert.match(license, /GNU Affero General Public License/);
  assert.match(notices, /Copyright \(c\) 2025 Jad/);
  assert.match(notices, /Copyright \(c\) 2024 AllenK \(Kwyshell\)/);
});

test('does not preload the background model on page load', async () => {
  const mainSource = await read('src/main.js');
  assert.doesNotMatch(mainSource, /\bpreload\s*\(/);
  assert.doesNotMatch(mainSource, /^import .*@imgly\/background-removal/m);
  assert.match(mainSource, /import\(['"]@imgly\/background-removal['"]\)/);
});

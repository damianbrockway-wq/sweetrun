#!/usr/bin/env node
// SweetRun build: concatenate the ordered source parts, then compile once.
//
// Why concatenate first: every part shares one scope, and the whole app sits
// inside a single `try { ... } catch` that opens in the first part and closes in
// the last. Babel CLI with several inputs parses each file on its own, which
// would make that wrapper a syntax error. So: join the parts in the order
// app/src/parts.json lists them, write the joined source to app/src/.bundle.jsx
// (gitignored; the formula tests read it), and compile that string with the
// repo's babel.config.json to app/app.js.
//
//   node scripts/build.mjs               build app/app.js
//   node scripts/build.mjs --concat-only write app/src/.bundle.jsx only (tests)
//
// Output was byte-identical to the old `babel app/src/app.jsx -o app/app.js`
// until the cutover turned on minified output (below). The trailing newline is
// kept, as Babel CLI wrote it.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'app', 'src');
const parts = JSON.parse(readFileSync(join(SRC, 'parts.json'), 'utf8'));
if (!Array.isArray(parts) || !parts.length) throw new Error('app/src/parts.json must be a non-empty array');

const source = parts.map(p => readFileSync(join(SRC, p), 'utf8')).join('');
const bundlePath = join(SRC, '.bundle.jsx');
writeFileSync(bundlePath, source);

if (process.argv.includes('--concat-only')) {
  console.log(`concat: ${parts.length} parts -> app/src/.bundle.jsx (${Buffer.byteLength(source)} bytes)`);
  process.exit(0);
}

const babel = createRequire(import.meta.url)('@babel/core');
const out = babel.transformSync(source, {
  cwd: ROOT,
  root: ROOT,
  filename: bundlePath,
  configFile: join(ROOT, 'babel.config.json'),
  babelrc: false,
  // Cutover (2026-09-26): whitespace and comments stripped, names kept (crash
  // stacks stay readable). 835 KB -> 703 KB raw, 246 KB -> 209 KB gzipped.
  minified: true,
  comments: false,
});
writeFileSync(join(ROOT, 'app', 'app.js'), out.code + '\n');
console.log(`build: ${parts.length} parts -> app/app.js (${Buffer.byteLength(out.code) + 1} bytes)`);

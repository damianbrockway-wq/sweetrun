#!/usr/bin/env node
// Run Sheet (redesign) pure-logic tests. Same approach as formulas.test.mjs:
// evaluate the REAL shipped source, not a copy.
//   - app/look.js: the look flag (hostname default, ?look= override, stored pref)
//   - the formula band of the concatenated source: Run Sheet additions
// Run: npm test (runs both test files).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.error(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
}

// ── Look flag (app/look.js) ──
const lookSrc = readFileSync(join(ROOT, 'app', 'look.js'), 'utf8');
const lookWin = {};                       // no document/location: logic only
new Function('window', 'globalThis', lookSrc)(lookWin, lookWin);
const L = lookWin.srLook;
eq('look api present', typeof L.decide, 'function');
// hostname defaults
eq('prod apex is classic',  L.decide('sweetrun.app', '', null).look, 'classic');
eq('prod www is classic',   L.decide('www.sweetrun.app', '', null).look, 'classic');
eq('prod host case-folded', L.decide('SweetRun.App', '', null).look, 'classic');
eq('prod trailing dot',     L.decide('sweetrun.app.', '', null).look, 'classic');
eq('preview is new',        L.decide('redesign.sugarcalc.pages.dev', '', null).look, 'new');
eq('commit preview is new', L.decide('1a2b3c4d.sugarcalc.pages.dev', '', null).look, 'new');
eq('localhost is new',      L.decide('localhost', '', null).look, 'new');
eq('lookalike host is new', L.decide('sweetrun.app.evil.dev', '', null).look, 'new');
eq('sub of prod is new',    L.decide('beta.sweetrun.app', '', null).look, 'new');
eq('no write by default',   L.decide('sweetrun.app', '', null).write, null);
// query override wins and is persisted
eq('?look=new on prod',        L.decide('sweetrun.app', '?look=new', null), { look:'new', write:'new', clear:false });
eq('?look=classic on preview', L.decide('localhost', '?look=classic', null), { look:'classic', write:'classic', clear:false });
eq('?look= among params',      L.decide('localhost', '?a=1&look=classic&b=2', null).look, 'classic');
eq('?look= beats stored',      L.decide('localhost', '?look=classic', 'new').look, 'classic');
eq('?look=NEW case',           L.decide('sweetrun.app', '?look=NEW', null).look, 'new');
eq('?look=bogus ignored',      L.decide('sweetrun.app', '?look=bogus', null), { look:'classic', write:null, clear:false });
eq('?looks=new not a match',   L.decide('sweetrun.app', '?looks=new', null).look, 'classic');
eq('?look=auto clears',        L.decide('sweetrun.app', '?look=auto', 'new'), { look:'classic', write:null, clear:true });
// stored preference
eq('stored new on prod',       L.decide('sweetrun.app', '', 'new').look, 'new');
eq('stored classic on preview',L.decide('localhost', '', 'classic').look, 'classic');
eq('stored junk ignored',      L.decide('localhost', '', 'purple').look, 'new');
eq('stored non-string ignored',L.decide('sweetrun.app', '', 42).look, 'classic');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

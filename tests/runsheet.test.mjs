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

// ── Formula band: Run Sheet additions (greeting, routes) ──
const SRC = process.env.SWEETRUN_SRC || join(ROOT, 'app', 'src', '.bundle.jsx');
const src = readFileSync(SRC, 'utf8');
const a = src.indexOf('// ─── Formulas'), b = src.indexOf('// ─── Shared UI', a);
if (a < 0 || b < 0) throw new Error('formula band not found');
const G = new Function('ls', src.slice(a, b) +
  '\nreturn { srDayPart, srMinutesOf, srGreetName, srGreeting, SR_GREET_PHOTO, srParseHash };')
  ({ get: (_k, d) => d, set: () => true });
const H = h => Math.round(h * 60);   // decimal hours -> minutes
// DESIGN.md round 5 boundaries, verified at 4.9, 5, 11.99, 12, 16.99, 17
eq('4:54 evening',   G.srDayPart(H(4.9)),   'evening');
eq('5:00 morning',   G.srDayPart(H(5)),     'morning');
eq('4:59 evening',   G.srDayPart(299),      'evening');
eq('11:59 morning',  G.srDayPart(719),      'morning');
eq('11:59.4 morning',G.srDayPart(H(11.99)), 'morning');
eq('12:00 afternoon',G.srDayPart(H(12)),    'afternoon');
eq('16:59 afternoon',G.srDayPart(1019),     'afternoon');
eq('16:59.4 aftn',   G.srDayPart(H(16.99)), 'afternoon');
eq('17:00 evening',  G.srDayPart(H(17)),    'evening');
eq('23:59 evening',  G.srDayPart(1439),     'evening');
eq('0:00 evening',   G.srDayPart(0),        'evening');
eq('wraps 24:00',    G.srDayPart(1440),     'evening');
eq('wraps 29:00',    G.srDayPart(1440 + 300), 'morning');
eq('NaN evening',    G.srDayPart(NaN),      'evening');
eq('minutesOf',      G.srMinutesOf(new Date(2027, 2, 16, 16, 20)), 980);
eq('greet name',     G.srGreeting('morning', 'Damian', 'en'),   'Good morning, Damian');
eq('greet aftn',     G.srGreeting('afternoon', 'Damian', 'en'), 'Good afternoon, Damian');
eq('greet eve',      G.srGreeting('evening', 'Damian', 'en'),   'Good evening, Damian');
eq('greet blank',    G.srGreeting('evening', '', 'en'),         'Good evening');
eq('greet spaces',   G.srGreeting('morning', '   ', 'en'),      'Good morning');
eq('greet null',     G.srGreeting('morning', null, 'en'),       'Good morning');
eq('greet tidy',     G.srGreeting('morning', '  Mary   Ann ', 'en'), 'Good morning, Mary Ann');
eq('greet fr matin', G.srGreeting('morning', 'Damian', 'fr'),   'Bonjour, Damian');
eq('greet fr aprem', G.srGreeting('afternoon', 'Damian', 'fr'), 'Bon après-midi, Damian');
eq('greet fr soir',  G.srGreeting('evening', '', 'fr'),         'Bonsoir');
eq('greet bad lang', G.srGreeting('morning', 'D', 'de'),        'Good morning, D');
eq('greet bad part', G.srGreeting('noon', 'D', 'en'),           'Good evening, D');
eq('name cap 24',    G.srGreetName('x'.repeat(40)).length, 24);
eq('photo morning',  G.SR_GREET_PHOTO.morning, 'frost-morning');
eq('photo evening',  G.SR_GREET_PHOTO.evening, 'hillside-panorama');
eq('hash empty',     G.srParseHash(''), []);
eq('hash bare',      G.srParseHash('#/'), []);
eq('hash no slash',  G.srParseHash('#season'), []);
eq('hash stage',     G.srParseHash('#/stage/boil/day'), ['stage','boil','day']);
eq('hash trailing',  G.srParseHash('#/shack/'), ['shack']);
eq('hash query',     G.srParseHash('#/bush?x=1'), ['bush']);
eq('hash encoded',   G.srParseHash('#/a%20b'), ['a b']);
eq('hash bad enc',   G.srParseHash('#/%E0'), ['%E0']);

// ── Token law: no hex colour literals in Run Sheet code (tokens.css is the only home) ──
const { readdirSync } = await import('node:fs');
const rsFiles = readdirSync(join(ROOT, 'app', 'src')).filter(f => /^(3[1-9]|8\d|9[1-8])-.*\.jsx$/.test(f) && f !== '90-shell-classic.jsx');
for (const f of [...rsFiles.map(f => join('app', 'src', f)), join('app', 'runsheet.css')]) {
  const code = readFileSync(join(ROOT, f), 'utf8').split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');
  const hits = code.match(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g) || [];
  eq(`no hex literals in ${f}`, hits, []);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

#!/usr/bin/env node
// Run Sheet (redesign) pure-logic tests. Same approach as formulas.test.mjs:
// evaluate the REAL shipped source, not a copy.
//   - the cutover: one UI, icons, manifest and precache list
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

// ── Cutover: one UI everywhere (the look flag, hostname gate and ?look= are gone) ──
const APP = f => readFileSync(join(ROOT, 'app', f), 'utf8');
const { existsSync } = await import('node:fs');
const idx = APP('index.html'), sw = APP('sw.js'), mf = JSON.parse(APP('manifest.webmanifest')), rcss = APP('runsheet.css');
eq('no look.js file', existsSync(join(ROOT, 'app', 'look.js')), false);
eq('index.html loads no look flag', /look\.js|srLook|data-look/.test(idx), false);
eq('index.html carries no classic stylesheet', /<style|--c-bg|--c-brand/.test(idx), false);
eq('index.html manifest is the file, not a data URI', /<link rel="manifest" href="\/app\/manifest\.webmanifest"/.test(idx), true);
eq('index.html theme colour is Ember ground', /name="theme-color" content="#0C0B0A"/.test(idx), true);
eq('runsheet.css has no data-look scope', rcss.includes('data-look'), false);
eq('runsheet.css has no classic mount rules', rcss.includes('rs-classic'), false);
eq('sw has no look.js', sw.includes('look.js'), false);
eq('sw cache bumped past v35', +(/sweetrun-v(\d+)/.exec(sw) || [0, 0])[1] > 35, true);
// Fix pass: the worker registers after load (its precache never competes with first paint),
// and a first visit (no controller when the page opened) is never reloaded by clients.claim().
eq('sw cache bumped past v37 (fix pass)', +(/sweetrun-v(\d+)/.exec(sw) || [0, 0])[1] >= 38, true);
eq('sw cache bumped for fix pass 2', +(/sweetrun-v(\d+)/.exec(sw) || [0, 0])[1] >= 39, true);
eq('sw registers after load', /addEventListener\('load', register/.test(idx) && !/^\s*navigator\.serviceWorker\.register\(/m.test(idx), true);
eq('first visit is not reloaded on controllerchange', /const hadController = !!navigator\.serviceWorker\.controller/.test(idx) && /if \(!hadController \|\| refreshing\) return;/.test(idx), true);
// Every icon the head and the manifest name exists, is precached, and is the size it claims (PNG IHDR).
const pngSize = f => { const b = readFileSync(join(ROOT, f.replace(/^\//, ''))); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const iconRefs = [...idx.matchAll(/href="(\/app\/icons\/[^"]+)"/g)].map(m => m[1]).concat(mf.icons.map(i => i.src));
eq('head names 3 icons and the manifest 3', iconRefs.length, 6);
for (const ref of new Set(iconRefs)) {
  eq(`icon exists ${ref}`, existsSync(join(ROOT, ref.slice(1))), true);
  eq(`icon precached ${ref}`, sw.includes(`'${ref}'`), true);
}
for (const i of mf.icons) { const [w, h] = pngSize(i.src); eq(`manifest icon size ${i.src}`, `${w}x${h}`, i.sizes); }
eq('manifest has a maskable icon', mf.icons.some(i => i.purpose === 'maskable'), true);
eq('manifest id and scope unchanged', [mf.id, mf.start_url, mf.scope], ['/app/', '/app/', '/app/']);
eq('apple touch icon 180', pngSize('/app/icons/apple-touch-icon-e-180.png'), [180, 180]);
eq('favicon 16 is 16', pngSize('/app/icons/favicon-e-16.png'), [16, 16]);
// In-app brand mark: option E at exact sizes, precached; the Amber Glass image is gone from the app.
for (const css of [30]) for (const n of [1, 2, 3]) {
  const f = `/app/icons/mark-e-${css}@${n}x.png`;
  eq(`brand mark ${css}@${n}x size`, pngSize(f), [css * n, css * n]);
  eq(`brand mark ${css}@${n}x precached`, sw.includes(`'${f}'`), true); }
eq('no Amber Glass icon in the app', [existsSync(join(ROOT, 'app', 'icon-512.png')), /\/app\/icon-512\.png|'\.\/icon-512\.png'/.test(sw + idx + readFileSync(process.env.SWEETRUN_SRC || join(ROOT, 'app', 'src', '.bundle.jsx'), 'utf8'))], [false, false]);
{ const { readdirSync: rd } = await import('node:fs');
  for (const f of rd(join(ROOT, 'app', 'photos')).filter(f => f.endsWith('.webp'))) eq(`photo precached ${f}`, sw.includes(`'/app/photos/${f}'`), true);
  for (const f of rd(join(ROOT, 'app', 'fonts')).filter(f => f.endsWith('.woff2'))) eq(`font precached ${f}`, sw.includes(`'/app/fonts/${f}'`), true); }
{ const parts = JSON.parse(APP('src/parts.json'));
  eq('no classic shell part', parts.some(p => /shell-classic/.test(p)), false);
  const mount = APP('src/99-mount.jsx');
  eq('mount renders only RunSheetApp', /<RunSheetApp \/>/.test(mount) && !/\bApp\b(?!ErrorBoundary)/.test(mount.replace(/RunSheetApp/g, '')), true);
  const bundle = readFileSync(process.env.SWEETRUN_SRC || join(ROOT, 'app', 'src', '.bundle.jsx'), 'utf8');
  eq('bundle has no classic App, LogTab, SettingsSheet or look flag', ['function App(', 'function LogTab(', 'function SettingsSheet(', 'srLook', 'function RsClassicScreen', 'CLASSIC_ROUTE'].filter(k => bundle.includes(k)), []);
  eq('sg_look stays a preference key (old backups restore quietly)', /'sg_look'/.test(APP('src/10-storage.jsx')), true); }

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

// ── Phase 5/6: engine, stage, series, log entry shape (21-rs-engine.jsx) ──
const E = new Function('ls', src.slice(a, b) +
  '\nreturn { srDayClass, srMakeEntry, srAppendEntry, srAutoCopy, srMakeBatch, srDayTotals, srSeasonSeries, srCumFromFirst,' +
  ' srStageOf, srRoPlan, srTransferTime, srDeCups, srFreshHeat, srSyrupRate, srPanRate, srJobs, srIsoAdd, srDaysBetween, rule86, syrupY, boilTime, PAN_SIZES, CUSTOM_PAN_IDX, finTemp };')
  ({ get: (_k, d) => d, set: () => true });
// day class = FreezeThawWidget rule, rounded first
eq('class ideal',      E.srDayClass(44, 19), 'ideal');
eq('class ideal edge', E.srDayClass(39.6, 28.4), 'ideal');
eq('class not ideal',  E.srDayClass(39.4, 20), 'freezeThaw');
eq('class freezeThaw', E.srDayClass(35, 25), 'freezeThaw');
eq('class tooWarm',    E.srDayClass(55, 38), 'tooWarm');
eq('class allFreeze',  E.srDayClass(28, 12), 'allFreeze');
eq('class none',       E.srDayClass(45, 33), 'none');
eq('class missing',    E.srDayClass(null, 20), null);

// Entry shape: identical JSON to LogTab.saveEntry for the same inputs.
// Reference built exactly as LogEntrySheet.save does (K.grade/K.brix flags).
const logTabEntry = (K, val, note, grade, brix, activePoint, id, date) => ({
  id, date, val: parseFloat(val), note,
  grade: K.grade ? grade : undefined,
  brix:  K.brix && brix ? parseFloat(brix) : undefined,
  point: activePoint || undefined,
});
const J = o => JSON.stringify(o);
eq('entry sap = LogTab',   J(E.srMakeEntry('sapCollected', { val:120, note:'' }, 5, '2027-03-16')),
   J(logTabEntry({ brix:true }, 120, '', '—', '', null, 5, '2027-03-16')));
eq('entry sap brix',       J(E.srMakeEntry('sapCollected', { val:'120', note:'a', brix:'2.1', point:'p1' }, 6, '2027-03-16')),
   J(logTabEntry({ brix:true }, '120', 'a', '—', '2.1', 'p1', 6, '2027-03-16')));
eq('entry syrup default grade', J(E.srMakeEntry('syrupMade', { val:18.5 }, 7, '2027-03-16')),
   J(logTabEntry({ grade:true, brix:true }, 18.5, '', '—', '', null, 7, '2027-03-16')));
eq('entry syrup grade brix', J(E.srMakeEntry('syrupMade', { val:18.5, grade:'Amber Rich', brix:66.9 }, 8, '2027-03-16')),
   J(logTabEntry({ grade:true, brix:true }, 18.5, '', 'Amber Rich', '66.9', null, 8, '2027-03-16')));
eq('entry fuel no extras', J(E.srMakeEntry('fuelUsed', { val:0.7, grade:'x', brix:3 }, 9, '2027-03-16')),
   J({ id:9, date:'2027-03-16', val:0.7, note:'' }));
eq('entry hours', E.srMakeEntry('boilHours', { val:'6.5' }, 1, 'd').val, 6.5);
// updLog: {...logs, [season]: {...slog, [k]: [...entries, e]}}; missing season starts from the 4-kind empty
const e1 = E.srMakeEntry('sapCollected', { val:100 }, 1, '2027-03-16');
eq('append new season', J(E.srAppendEntry({}, 2027, 'sapCollected', e1)),
   J({ 2027: { sapCollected:[e1], syrupMade:[], sapRO:[], sapEvap:[] } }));
const L0 = { 2026:{ sapCollected:[] }, 2027:{ sapCollected:[{ id:0 }], fuelUsed:[] } };
const L1 = E.srAppendEntry(L0, 2027, 'sapCollected', e1);
eq('append keeps others', J(L1[2026]), J(L0[2026]));
eq('append order', L1[2027].sapCollected.map(x => x.id), [0, 1]);
eq('append no mutate', L0[2027].sapCollected.length, 1);
eq('append kind absent', E.srAppendEntry({ 2027:{} }, 2027, 'boilHours', e1)[2027].boilHours.length, 1);
eq('autocopy off', E.srAutoCopy(L1, 2027, e1, { ro:false, evap:false }, 50), null);
const AC = E.srAutoCopy(L1, 2027, e1, { ro:true, evap:true }, 50);
eq('autocopy ro',   AC[2027].sapRO,   [{ id:50, date:'2027-03-16', val:100, note:'← auto from sap collected' }]);
eq('autocopy evap', AC[2027].sapEvap, [{ id:51, date:'2027-03-16', val:100, note:'← auto from sap collected' }]);
eq('autocopy keeps sap', AC[2027].sapCollected.length, 2);
eq('batch shape', J(E.srMakeBatch({ date:'2027-03-16', sapIn:'1240', syrupOut:'31.5', grade:'dark' }, 3)),
   J({ date:'2027-03-16', sapIn:'1240', syrupOut:'31.5', grade:'dark', loc:'', notes:'', id:3 }));

// Day totals tolerate legacy date strings and string values
eq('day totals', E.srDayTotals([{ date:'2027-03-02', val:'10' }, { date:'3/2/2027', val:5 }, { date:'bad', val:1 }]), { '2027-03-02':15 });
// Season series
const SL = { sapCollected:[{ date:'2027-02-25', val:180 }, { date:'2027-03-16', val:1012 }, { date:'2027-03-15', val:990 }] };
const S1 = E.srSeasonSeries(SL, '2027-03-16', { '2027-03-16':{ hi:44, lo:19 }, '2027-03-17':{ hi:30, lo:10 } });
eq('series start = first - 7', S1.start, '2027-02-18');
eq('series min 42 days', S1.days.length, 42);
eq('series today idx', S1.todayIdx, 26);
eq('series today sap', S1.days[S1.todayIdx].sap, 1012);
eq('series day of run', S1.dayOfRun, 20);
eq('series class today', S1.days[S1.todayIdx].cls, 'ideal');
eq('series forecast flag', [S1.days[S1.todayIdx].fc, S1.days[S1.todayIdx + 1].fc], [false, true]);
eq('series peak', [S1.peak.iso, S1.peak.sap], ['2027-03-16', 1012]);
const S0 = E.srSeasonSeries({}, '2027-02-01', null);
eq('series empty', [S0.start, S0.days.length, S0.dayOfRun, S0.todayIdx], ['2027-01-18', 42, null, 14]);
const SLong = E.srSeasonSeries({ sapCollected:[{ date:'2026-12-01', val:1 }] }, '2027-04-20', null);
eq('series capped 84', [SLong.days.length, SLong.end], [84, '2027-04-30']);
eq('cum from first', E.srCumFromFirst({ sapCollected:[{ date:'2027-03-01', val:1 }], syrupMade:[{ date:'2027-03-02', val:2 }, { date:'2027-03-04', val:3.5 }] }, 5), [0, 2, 2, 5.5, 5.5]);
eq('cum none', E.srCumFromFirst({}, 5), []);

// Stage
const st = o => E.srStageOf({ todayIso:'2027-03-16', season:2027, ...o });
eq('stage empty feb', E.srStageOf({ todayIso:'2027-02-01', season:2027, slog:{} }), 'weather');
eq('stage trees tap', E.srStageOf({ todayIso:'2027-02-01', season:2027, slog:{}, hasTreePins:true }), 'tap');
eq('stage lines',     E.srStageOf({ todayIso:'2027-02-01', season:2027, slog:{}, hasTreePins:true, hasMainlines:true }), 'lines');
eq('stage collect',   st({ slog:{ sapCollected:[{ date:'2027-03-15', val:5 }] } }), 'collect');
eq('stage boil today',st({ slog:{ sapCollected:[{ date:'2027-03-15', val:5 }], syrupMade:[{ date:'2027-03-16', val:1 }] } }), 'boil');
eq('stage boil yday', st({ slog:{ sapCollected:[{ date:'2027-03-15', val:5 }], boilHours:[{ date:'2027-03-15', val:1 }] } }), 'boil');
eq('stage boil old',  st({ slog:{ sapCollected:[{ date:'2027-03-15', val:5 }], syrupMade:[{ date:'2027-03-12', val:1 }] } }), 'collect');
eq('stage session',   st({ slog:{}, boilActive:true }), 'boil');
eq('stage recap',     E.srStageOf({ todayIso:'2027-04-20', season:2027, slog:{ sapCollected:[{ date:'2027-04-01', val:5 }] } }), 'recap');
eq('stage not recap march', E.srStageOf({ todayIso:'2027-03-31', season:2027, slog:{ sapCollected:[{ date:'2027-03-01', val:5 }] } }), 'collect');
eq('stage past season', st({ season:2026, slog:{} }), 'recap');
eq('stage zero ignored', st({ slog:{ sapCollected:[{ date:'2027-03-15', val:0 }] } }), 'weather');
eq('stage may empty', E.srStageOf({ todayIso:'2027-05-20', season:2027, slog:{}, hasMainlines:true }), 'weather');

// RO plan (defaults from DESIGN.md, decision D5 open)
const ro = E.srRoPlan({ levelGal:780, capGal:1000, fillGalH:38, roGph:250 });
eq('ro now (fills before run + 3h)', [ro.call, +ro.fullH.toFixed(2), +ro.runH.toFixed(2)], ['now', 5.79, 3.12]);
eq('ro later', E.srRoPlan({ levelGal:300, capGal:1000, fillGalH:38, roGph:250 }).call, 'later');
eq('ro later start', +E.srRoPlan({ levelGal:300, capGal:1000, fillGalH:38, roGph:250 }).startInH.toFixed(2), +(700/38 - 1.2 - 3).toFixed(2));
eq('ro wait', E.srRoPlan({ levelGal:120, capGal:1000, fillGalH:38, roGph:250 }).call, 'wait');
eq('ro age', E.srRoPlan({ levelGal:300, capGal:1000, fillGalH:1, roGph:250, ageH:25, tempF:40 }).reason, 'age');
eq('ro age cold', E.srRoPlan({ levelGal:300, capGal:1000, fillGalH:1, roGph:250, ageH:25, tempF:36 }).call, 'later');
eq('ro unknown rate', E.srRoPlan({ levelGal:300, capGal:1000, roGph:250 }).call, 'unknown');

// Syrup rate is the inverse of boilTime: boil T hours makes syrupY of the sap boiled
const sap = 1000, bx = 2.0, r = 35, T = E.boilTime(sap, bx, r);
eq('syrup rate inverse', +(E.srSyrupRate(r, bx) * T).toFixed(6), +E.syrupY(sap, bx).toFixed(6));
eq('syrup rate 2x8 2.0', +E.srSyrupRate(35, 2).toFixed(3), 0.829);
eq('syrup rate guards', [E.srSyrupRate(0, 2), E.srSyrupRate(35, 0)], [0, 0]);
eq('pan rate idx', E.srPanRate(2), 35);
eq('pan rate custom', E.srPanRate(E.CUSTOM_PAN_IDX, 3, 10), 75);
eq('pan rate junk', E.srPanRate('x'), E.PAN_SIZES[0].rate);

// Engine
const base = { now: Date.UTC(2027,2,16,20,20), minutes: 980, todayIso:'2027-03-16', stage:'collect', hasPins:true, hasLocation:true,
  wx:null, boil:null, fresh:null, tanks:[], roGph:250, sapBrix:2, waterBP:211.4, loggedToday:{ sap:1, syrup:0, any:1 }, checks:{} };
const ids = o => E.srJobs({ ...base, ...o }).map(j => j.id);
eq('jobs floor is log', ids({}), ['log']);
eq('jobs first run only setup', ids({ firstRun:true }), ['setup']);
eq('jobs log unlogged copy', E.srJobs({ ...base, loggedToday:{ any:0 } })[0].title, 'jLogT');
eq('jobs log logged copy', E.srJobs(base)[0].title, 'jLogT2');
const wxF = { '2027-03-17':{ hi:36, lo:19 } };
eq('jobs freeze by day', E.srJobs({ ...base, wx:wxF }).map(j => [j.id, j.p]), [['freeze',55], ['log',10]]);
eq('jobs freeze at night', E.srJobs({ ...base, wx:wxF, minutes:20*60 })[0].p, 90);
eq('jobs freeze tonight low', E.srJobs({ ...base, wx:wxF })[0].vars.lo, 19);
eq('jobs freeze morning uses today', ids({ wx:{ '2027-03-16':{ hi:36, lo:20 } }, minutes:7*60 }), ['freeze','log']);
eq('jobs no freeze at 29', ids({ wx:{ '2027-03-17':{ hi:36, lo:29 } } }), ['log']);
eq('jobs freeze only in season', ids({ wx:wxF, stage:'tap' }), ['log']);
eq('jobs boil', ids({ boil:{ startMs: base.now - 2*3600000 } }), ['boil','log']);
eq('jobs boil hours', +E.srJobs({ ...base, boil:{ startMs: base.now - 2*3600000 } })[0].vars.h.toFixed(2), 2);
eq('jobs boil fin', E.srJobs({ ...base, boil:{ startMs: base.now } })[0].vars.fin, 218.5);
eq('jobs fresh 12h', E.srJobs({ ...base, fresh:{ startMs: base.now - 13*3600000 } }).map(j => [j.id, j.p]), [['fresh',50], ['log',10]]);
eq('jobs fresh 24h', E.srJobs({ ...base, fresh:{ startMs: base.now - 25*3600000 } })[0].p, 80);
eq('jobs fresh young', ids({ fresh:{ startMs: base.now - 3600000 } }), ['log']);
eq('jobs tank ro now', ids({ tanks:[{ name:'Tank 1', capGal:1000, levelGal:780, fillGalH:38 }] }), ['ro-now','log']);
eq('jobs tank ro later', ids({ tanks:[{ name:'Tank 1', capGal:1000, levelGal:300, fillGalH:38 }] }), ['ro-later','log']);
eq('jobs tank no rate', ids({ tanks:[{ name:'Tank 1', capGal:1000, levelGal:300 }] }), ['log']);
eq('jobs run tomorrow', ids({ wx:{ '2027-03-17':{ hi:44, lo:30 }, '2027-03-18':{ hi:45, lo:25 } } }), ['run','log']);
eq('jobs run title day 2', E.srJobs({ ...base, wx:{ '2027-03-18':{ hi:45, lo:25 } } })[0].title, 'jRunT2');
eq('jobs tap weather early', E.srJobs({ ...base, stage:'tap', wx:{ '2027-03-17':{ hi:44, lo:25 }, '2027-03-19':{ hi:44, lo:25 } } }).map(j => [j.id, j.vars && j.vars.n]), [['tap-weather',2], ['log',undefined]]);
eq('jobs location', ids({ hasLocation:false }), ['location','log']);
eq('jobs map early only', [ids({ hasPins:false }), ids({ hasPins:false, stage:'weather' })], [['log'], ['map','log']]);
eq('jobs pre checklist', ids({ stage:'weather', checks:{ pre:{ done:3, total:10 } } }), ['pre','log']);
eq('jobs pre done', ids({ stage:'weather', checks:{ pre:{ done:10, total:10 } } }), ['log']);
eq('jobs recap', ids({ stage:'recap', hasLocation:false, checks:{ post:{ done:0, total:10 } } }), ['post','recap','log']);
eq('jobs ranking', ids({ minutes:20*60, wx:wxF, boil:{ startMs:base.now }, fresh:{ startMs: base.now - 25*3600000 },
  tanks:[{ name:'T', capGal:1000, levelGal:780, fillGalH:38 }], hasLocation:false }), ['freeze','boil','ro-now','fresh','location','log']);
eq('jobs sorted desc', (() => { const p = E.srJobs({ ...base, wx:wxF, boil:{ startMs:base.now } }).map(j => j.p); return p.every((v, i) => !i || p[i-1] >= v); })(), true);

const tt = E.srTransferTime(28, 300, 800, 12, 4, 2700);
eq('transfer realistic', +tt.realisticTotal.toFixed(2), +(300 / (28 * 0.728) + 4).toFixed(2));
eq('transfer hauls', [tt.numHauls, +tt.totalHaulHrs.toFixed(3)], [10, +(10 * tt.realisticTotal / 60).toFixed(3)]);
eq('transfer floor', E.srTransferTime(28, 300, 5000, 100, 4, 0).flowFactor, 0.30);
eq('transfer no sap', E.srTransferTime(28, 300, 0, 0, 4, 0).numHauls, null);
eq('de straight early 10 gal', E.srDeCups(10, 'straight', 'early', 9, '7" plates').cups, 5);
eq('de precoat plates win', E.srDeCups(10, 'precoat', 'early', 9, '7" plates').cups, 29.25);
eq('de late straight', E.srDeCups(40, 'straight', 'late', 9, '10" plates').cups, 30);
eq('de rec', [E.srDeCups(25).recMode, E.srDeCups(26).recMode], ['straight','precoat']);
eq('de units', [E.srDeCups(10, 'straight', 'early', 9, '').tbsp, +E.srDeCups(10, 'straight', 'early', 9, '').oz.toFixed(2)], [80, 8]);

const H0 = Date.UTC(2027, 2, 16, 0);
const hr = (i, t) => ({ ts: H0 + i * 3600000, temp: t });
const fh = E.srFreshHeat([hr(0, 50), hr(1, 55), hr(2, 30), hr(3, 60), hr(4, 44), hr(5, 44), hr(6, 44), hr(7, 44)], H0, H0 + 3 * 3600000);
eq('fresh HU past (50,55,30,60 -> 7,12,0,17)', fh.currentHU, 36);
eq('fresh level', [+fh.pct.toFixed(1), fh.level], [24, 'fresh']);
eq('fresh best boil', fh.bestBoilStart, H0 + 4 * 3600000);
eq('fresh current temp', fh.currentTemp, 60);
eq('fresh warn eta none', fh.warnEta, null);
const fh2 = E.srFreshHeat(Array.from({ length: 30 }, (_, i) => hr(i, 70)), H0, H0 + 5 * 3600000);
eq('fresh warn/crit eta', [fh2.currentHU, (fh2.warnEta - H0) / 3600000, (fh2.critEta - H0) / 3600000], [162, 6, 6]);
eq('fresh boil now', fh2.level, 'now');

// ── Phase 6: classic calculators lifted verbatim (22-rs-engine2.jsx) ──
const E2 = new Function('ls', src.slice(a, b) +
  '\nreturn { srBreakeven, srTubing, srTapEstimate, srEvapRate, srEvapCosts, srRoSavings, srYieldGap, srDiagnose, srParseSapCsv,' +
  ' srParseSugarCalcText, srImportAdditions, srMergeImport, srWizardPlan, srWizardData, srPlain, srDegreeDays, srBrixTrend, srHandFlow,' +
  ' srRecapFacts, srByPoint, srInsights, srScoreRows, seasonScore, YIELD_MODELS, FUELS, boilTime, syrupY, tapsPer, yieldMidOf, PAN_SIZES, CUSTOM_PAN_IDX };')
  ({ get: (_k, d) => d, set: () => true });
const r2 = (x, d = 2) => +(+x).toFixed(d);
// break-even: the classic screenshot case (640 taps, $2,400 fuel, $45/gal, hobby)
const bev = E2.srBreakeven({ taps:640, fuelCost:2400, price:45, supplies:0, hobby:true, laborHrs:10, laborRate:20 });
eq('bev per tap and total', [r2(bev.bevPerTap), r2(bev.bevGal, 1)], [0.08, 53.3]);
eq('bev scenarios profit', bev.scenarios.map(s => Math.round(s.profit)), [1632, 3936, 6240]);
eq('bev labor counts when paid', E2.srBreakeven({ taps:100, fuelCost:100, price:50, hobby:false, laborHrs:10, laborRate:20 }).totalCost, 300);
eq('bev too high flag', E2.srBreakeven({ taps:10, fuelCost:1000, price:40, hobby:true }).tooHigh, true);
// tubing: 500 taps, 2,000 ft, 8% grade, 25 inHg, 12 per lateral
const tb = E2.srTubing(500, 2000, 8, 25, 12);
eq('tubing size', [tb.ms, tb.mm], ['1¼"', 32]);
eq('tubing vacuum', [tb.vacLoss, tb.vacGain, tb.vacPump, tb.elevDrop], [2.6, 6.4, 25, 160]);
eq('tubing laterals', [tb.numLat, tb.latFtTot, tb.latFt, tb.mainFt, tb.dropFt, tb.cfm, tb.pump], [42, 4032, 4436, 2200, 2000, 25, 'p40']);
eq('tubing flat long line needs more pump', E2.srTubing(50, 3000, 0, 25, 12).vacPump, 35.8);
eq('tubing waits for inputs', E2.srTubing(0, 2000, 8, 25, 12), null);
// tapping estimate, gravity model
const te = E2.srTapEstimate(100, 14, 2, E2.YIELD_MODELS.gravity);
eq('tap estimate', [te.tpt, te.tot, te.sapGal, r2(te.syrupGal, 1)], [1, 100, 1620, 37.5]);
// evaporator rate and costs
eq('evap rate pan', E2.srEvapRate(2, '', '', '').rate, 35);
eq('evap rate custom pan', E2.srEvapRate(E2.CUSTOM_PAN_IDX, 2, 6, '').rate, 30);
eq('evap rate override', E2.srEvapRate(2, '', '', 50).rate, 50);
const ec = E2.srEvapCosts({ fuelType:'Firewood (cord)', sapGal:1000, brix:2, rate:35, fuelCost:250, laborHrs:10, laborRate:15, supplies:[50, 0, '', 0], margin:40 });
eq('evap costs', [r2(ec.uNeeded, 3), ec.cost, ec.laborTotal, ec.suppliesTotal, ec.totalCost], [r2(1000 / E2.FUELS[0].spu, 3), 250 * 1000 / E2.FUELS[0].spu, 150, 50, 200 + 250 * 1000 / E2.FUELS[0].spu]);
eq('evap boil time is boilTime()', ec.boilH, E2.boilTime(1000, 2, 35));
eq('evap retail 1 gal at 40%', r2(ec.bottles[4].retail), r2(ec.cpg / 0.6));
eq('evap cpg override', E2.srEvapCosts({ sapGal:1000, brix:2, rate:35, cpgOverride:20, margin:50 }).bottles[4].retail, 40);
// RO savings
const rs = E2.srRoSavings(1000, 600, 50, 23, false, 8, 2);
eq('ro savings', [rs.straightHrs, rs.straightWood, rs.roConc, rs.roHrs, r2(rs.roWood), r2(rs.savedHrs), r2(rs.savedWood)], [20, 460, 150, 11, 253, 9, 207]);
eq('ro savings preheater', r2(E2.srRoSavings(1000, 600, 50, 23, true, 8, 2).roHrs, 3), 9.35);
eq('ro savings withheld when ro > sap', E2.srRoSavings(100, 200, 50, 23, false, 8, 2), null);
// yield gap
const yg = E2.srYieldGap(1000, 20, 100, 2, E2.YIELD_MODELS.gravity, 40);
eq('gap numbers', [yg.hi, yg.lo, yg.gapHigh, yg.gapLow, yg.gapMid, yg.dollarGap, yg.effPct], [45, 30, 25, 10, 17.5, 700, 86]);
// 0.20 gal a tap is the low edge of the one normal band (cutover): room to grow on gravity, not "low".
eq('gap causes', yg.causes.map(c => c.id), ['belowAvg', 'evapMinor', 'considerRo']);
eq('gap causes under the band', E2.srYieldGap(1000, 15, 100, 2, E2.YIELD_MODELS.gravity, 40).causes[0].id, 'lowYield');
eq('gap good', E2.srYieldGap(900, 40, 100, 2, E2.YIELD_MODELS.gravity, 40).causes.map(c => c.id), ['good']);
eq('gap withheld on suspect ratio', E2.srYieldGap(100, 20, 100, 2, E2.YIELD_MODELS.gravity, 40), null);
// diagnose
const dg = E2.srDiagnose({ slog:{ sapCollected:[{ val:1000 }], syrupMade:[{ val:20 }], sapEvap:[{ val:600 }] }, prevSlog:{}, brixLog:[], pins:[],
  trees:100, units:'GAL', sapBrix:2, syrupPrice:40, woodCost:250, laborRate:0, vacLevel:'gravity', roOutBrix:0 });
eq('diagnose order', dg.map(f => f.id), ['roNone', 'vacuum', 'conv', 'yieldOk']);
eq('diagnose roi', dg.map(f => Math.round(f.roi)), [Math.round(600 * .65 / E2.FUELS[0].spu * 250), 741, 126, 0]);
const dgL = E2.srDiagnose({ slog:{ sapCollected:[{ val:3785.41 }], syrupMade:[{ val:75.7 }] }, prevSlog:{ sapCollected:[{ val:3785.41 }] }, brixLog:[3, 3, 3, 1, 1, 1].map(x => ({ brix:x })),
  pins:[], trees:0, units:'L', sapBrix:2, syrupPrice:40, woodCost:250, laborRate:0, vacLevel:'high', roOutBrix:5 });
eq('diagnose litres: identical seasons are flat', r2(dgL.find(f => f.id === 'yoyUp').v.chg, 6), 0);
eq('diagnose brix falling, ro brix low', ['brixDown', 'roBrixLow'].every(id => dgL.some(f => f.id === id)), true);
// import
const csv = E2.srParseSapCsv('date,sap_gal,syrup_gal\n3/1/2027,100,0\n3/2/2027,50,2.5\n');
eq('csv rows and totals', [csv.rows.length, csv.totalSap, csv.totalSyrup], [2, 150, 2.5]);
eq('csv errors', [E2.srParseSapCsv('a').error, E2.srParseSapCsv('x,y\n1,2').error, E2.srParseSapCsv('date,sap\n1,0').error], ['impNeedRows', 'impNoCols', 'impNoRows']);
const pdf = E2.srParseSugarCalcText('Report 3/1/2026 Sap Collected 120 3/2/2026 Syrup Made 2.5 3/3/2026 Sap Thru R/O 80', 2027);
eq('pdf text rows', [pdf.rows.length, pdf.totalSap, pdf.totalSyrup, pdf.totalRO, pdf.detectedYear], [3, 120, 2.5, 80, 2026]);
const add = E2.srImportAdditions(csv, 'generic');
eq('import additions', [add.sapCollected.length, add.syrupMade[0].note], [2, 'Imported (generic)']);
const merged = E2.srMergeImport({ 2026:{ sapCollected:[{ val:1 }] }, 2027:{ sapCollected:[{ val:9 }], fuelUsed:[{ val:1 }] } }, 2027, add);
eq('import merge keeps other kinds and seasons', [merged[2026].sapCollected.length, merged[2027].sapCollected.length, merged[2027].fuelUsed.length], [1, 3, 1]);
// wizard plan and the sg_wizard_data shape
const wz = { treeCount:'150', trunkSize:'large', systemType:'gravity', collectionType:'mainline', hasEvap:true, panSize:'2x4', fuelType:'Firewood (cord)', fuelCost:'', syrupPrice:'' };
const wp = E2.srWizardPlan(wz);
eq('wizard plan', [wp.recTaps, wp.syrupLow, wp.syrupMid, wp.syrupHigh, wp.sapMid, wp.sessions, wp.firewood, wp.price], [300, 90, 112.5, 135, 4838, 76, 3.8, 40]);
eq('wizard data shape', Object.keys(E2.srWizardData(wz)), ['trees','tapsPerTree','recTaps','systemType','collectionType','hasEvap','panSize','fuelType','fuelCost','syrupPrice']);
eq('wizard data fuel default', E2.srWizardData(wz).fuelCost, 300);
// degree days, Brix trend, hand check
const dd = E2.srDegreeDays({ time:['2027-03-01','2027-03-02'], temperature_2m_max:[50, 30], temperature_2m_min:[40, 20] });
eq('degree days', [dd.days.map(d => d.dd), dd.cumDD, dd.stage], [[5, 0], 5, 'open']);
eq('degree day stage peak', E2.srDegreeDays({ time:['a'], temperature_2m_max:[400], temperature_2m_min:[0] }).stage, 'peak');
eq('brix buddy warning', E2.srBrixTrend([{ brix:2.4 }, { brix:2.1 }, { brix:1.5 }]).buddy, true);
eq('brix no warning under 3', E2.srBrixTrend([{ brix:2.4 }, { brix:1 }]).buddy, false);
eq('hand flow', [E2.srHandFlow(45, 25).id, E2.srHandFlow(52, 30).id, E2.srHandFlow(33, 34).id, E2.srHandFlow(60, 45).id, E2.srHandFlow('', 3)], ['excellent', 'good', 'marginal', 'poor', null]);
// recap facts in litre mode match gallon mode
const slogG = { sapCollected:[{ val:500, date:'2027-03-01' }, { val:700, date:'2027-03-05' }], syrupMade:[{ val:25, date:'2027-03-06' }] };
const slogL = { sapCollected:[{ val:500 * 3.78541, date:'2027-03-01' }, { val:700 * 3.78541, date:'2027-03-05' }], syrupMade:[{ val:25 * 3.78541, date:'2027-03-06' }] };
const fG = E2.srRecapFacts(slogG, null, [], 'GAL'), fL = E2.srRecapFacts(slogL, null, [], 'L');
eq('recap facts gal', [fG.sapGal, fG.syrupGal, fG.days, fG.ratio, fG.best.val], [1200, 25, 6, 48, 700]);
eq('recap facts litres = gallons', [r2(fL.sapGal, 6), r2(fL.syrupGal, 6), fL.days, r2(fL.ratio, 6)], [1200, 25, 6, 48]);
eq('by point', E2.srByPoint({ sapCollected:[{ val:5, point:'a' }, { val:3 }], syrupMade:[] }, [{ id:'a', name:'A' }]).rows[0].sap, 5);
eq('by point hidden when untagged', E2.srByPoint({ sapCollected:[{ val:5 }] }, [{ id:'a' }]), null);
const sc0 = E2.seasonScore({ sapT:1200, syT:25, fuelT:1.2, taps:100, brix:2, yieldModel:E2.YIELD_MODELS.gravity, fuelSpu:E2.FUELS[0].spu });
eq('score rows ids', E2.srScoreRows(sc0, { syrupGal:25, sapGal:1200, fuelT:1.2, taps:100, brix:2, model:E2.YIELD_MODELS.gravity, fuelDef:E2.FUELS[0] }).map(r => r.id), ['yield', 'eff', 'fuel', 'data']);
eq('insights', E2.srInsights(1200, 25, 600, 0.5, 100, 2, 90, E2.FUELS[0]).map(i => i.id), ['yieldAvg', 'effGood', 'fuelGood', 'roHelps']);
// copy cleanup
eq('plain ranges', E2.srPlain('10–15 gal, 20–24°F nights, $35–$70/gal'), '10 to 15 gal, 20 to 24°F nights, $35 to $70/gal');
eq('plain pauses', E2.srPlain('Stop the boil — do not stir'), 'Stop the boil, do not stir');
eq('plain no dash left', /[–—]/.test(E2.srPlain('a — b – c 1–2')), false);
eq('plain ranges in French', E2.srPlain('25–30 cm, 1.5–2 in', 'fr'), '25 à 30 cm, 1,5 à 2 in');
eq('plain English decimals unchanged', E2.srPlain('1.5–2 in, 0.25 gal'), '1.5 to 2 in, 0.25 gal');

// ── Phases 7-8: leak rule, runtime, fuel, readings, freeze/thaw, lines, pump jobs ──
const E3 = new Function('ls', src.slice(a, b) +
  '\nreturn { srLeakCheck, srLeakFind, srImportedLines, srRunHours, srHms, srTimeToEmpty, srFuelLeft, srAgeTier, srVacStep, srFreezeThaw, srSapRunning, srLinePath,' +
  ' srGaugeLocate, srGaugeSid, srNextGaugeName, srMToFt, srFtToM, srDegToPct, srPctToDeg, srElevU, srElevUnit, srTileBBox3857, srSlopeZ, srSlopeRule, srAspectRule, srElevRule, srTerrainRule, srTerrainTileUrl, srTrailsTileUrl, srHydroTileUrl, srSamplesUrl, srParseSamples, srGridPoints, srElevRange, srElevTicks, srAspectWord, srAlongPath, srLineProfile, SR_3DEP, SR_3DEP_PUBLISHED, SR_SLOPE_CLASSES, SR_ASPECT_CLASSES, SR_ELEV_RAMP, SR_MERC, srNearestOnPath, srPlacePlates, srPathFt, srSensorId, srTileXY, srTileUrls, srManualSource, srSimSource, srPickSource, srFreezeItems, srPumpJobs, srOpsPrefs, srMedian, srJobs, SR_OPS_DEFAULTS };')
  ({ get: (_k, d) => d, set: () => true });
const HR = 3600000, DAY = 24 * HR, t0 = Date.UTC(2027, 2, 16, 20, 0);
// Leak rule: latest >= 2.0 in under the median of the 7 days before it
const rd = (h, v) => ({ ms: t0 + h * HR, v });
eq('leak none', E3.srLeakCheck([], 2, 7).status, 'none');
// Leak finder: far end against the pump (releaser), paired within pairH hours
const LF = (end, rel, lim = 2, pairH = 3) => E3.srLeakFind(end, rel, lim, 7, pairH);
eq('finder none', LF([], [rd(0, 25)]).status, 'none');
eq('finder none has no method', LF([], []).method, null);
eq('finder releaser suspect', (({ status, method, drop }) => ({ status, method, drop }))(LF([rd(0, 17.2)], [rd(-0.5, 24.5)])), { status:'suspect', method:'releaser', drop:7.3 });
eq('finder releaser holding', (({ status, drop }) => ({ status, drop }))(LF([rd(0, 23.0)], [rd(0, 24.5)])), { status:'ok', drop:1.5 });
eq('finder exactly at the limit is suspect', LF([rd(0, 22.5)], [rd(0, 24.5)]).status, 'suspect');
eq('finder pairs the nearest pump reading', LF([rd(0, 22)], [rd(-2.5, 26), rd(-0.2, 23.5), rd(2, 27)]).releaser.v, 23.5);
eq('finder pump reading after the end reading counts', LF([rd(0, 20)], [rd(1, 24)]).status, 'suspect');
eq('finder pump outside the window falls back to baseline', (({ method, status }) => ({ method, status }))(LF([rd(-24, 24), rd(0, 21.5)], [rd(-5, 25)])), { method:'baseline', status:'suspect' });
eq('finder single end, no pump: needs a pump reading', (({ method, status }) => ({ method, status }))(LF([rd(0, 21)], [])), { method:null, status:'single' });
eq('finder single end with a pump works', LF([rd(0, 21)], [rd(0, 24)]).status, 'suspect');
eq('finder uses the latest end reading', LF([rd(-1, 12), rd(0, 24)], [rd(0, 24.4)]).status, 'ok');
eq('finder limit is his', LF([rd(0, 21.5)], [rd(0, 24.5)], 3.5).status, 'ok');
eq('finder pairH is his', LF([rd(0, 17)], [rd(-5, 24.5)], 2, 6).method, 'releaser');
eq('finder junk pump readings skipped', LF([rd(0, 17)], [{ ms:t0, v:null }, { ms:NaN, v:25 }]).method, null);

// Gauge chain leak localizer (fix pass 2): WHERE on the line the vacuum is lost.
{ const G = (...vals) => vals.map(v => ({ hist: v == null ? [] : Array.isArray(v) ? v : [rd(0, v)] }));
  const GL = (nodes, lim = 2, pairH = 3) => E3.srGaugeLocate(nodes, lim, pairH);
  const proto = GL(G(24.5, 24.1, 23.6, 17.9, 17.2));
  eq('gauges: prototype line C locates C2 to C3', [proto.status, proto.seg.from, proto.seg.to, proto.seg.drop, proto.total], ['located', 2, 3, 5.7, 7.3]);
  eq('gauges: every segment drop', proto.segs.map(g => g.drop), [0.4, 0.5, 5.7, 0.7]);
  eq('gauges: holding line is ok, no segment named', (({ status, seg, total }) => ({ status, seg, total }))(GL(G(24.5, 24.3, 24.1, 23.9))), { status:'ok', seg:null, total:0.6 });
  eq('gauges: loss shared along the line is spread', (({ status, seg }) => ({ status, seg }))(GL(G(24.5, 23.5, 22.5, 21.5, 20.5))), { status:'spread', seg:null });
  eq('gauges: exactly half the total counts as located', GL(G(24, 23, 22, 20)).status, 'located');
  eq('gauges: an unread gauge between is named as skipped', (({ status, seg }) => [status, seg.from, seg.to, seg.skipped])(GL(G(24.5, 24.2, null, 17.0))), ['located', 1, 3, [2]]);
  eq('gauges: no pump reading still localizes between gauges', (({ status, seg }) => [status, seg.from, seg.to])(GL(G(null, 24.1, 23.9, 18.0))), ['located', 2, 3]);
  eq('gauges: one reading is too few', GL(G(null, null, 21)).status, 'few');
  eq('gauges: nothing read', GL(G(null, null, null)).status, 'none');
  eq('gauges: a reading outside the pair window is ignored', GL([{ hist:[rd(-5, 24.5)] }, { hist:[rd(0, 24.2)] }, { hist:[rd(0, 17)] }]).seg.from, 1);
  eq('gauges: pairH is his (the pump 5 h earlier counts at 6 h)', GL([{ hist:[rd(-5, 24.5)] }, { hist:[rd(0, 24.2)] }, { hist:[rd(0, 17)] }], 2, 6).reads[0].v, 24.5);
  eq('gauges: each gauge takes the reading nearest the far end reading', GL([{ hist:[rd(-2, 20), rd(-0.1, 24.5)] }, { hist:[rd(0, 17)] }]).reads[0].v, 24.5);
  eq('gauges: the reference is the far end, else the newest on the line', GL([{ hist:[rd(0, 24.5)] }, { hist:[rd(-1, 24)] }, { hist:[] }]).refMs, t0 - HR);
  eq('gauges: the limit is his', [GL(G(24.5, 24.0, 21.5), 3.5).status, GL(G(24.5, 24.0, 21.0), 3.5).status], ['ok', 'located']);
  eq('gauges: two equal drops name the one nearer the pump', (({ seg }) => [seg.from, seg.to])(GL(G(24, 21, 18))), [0, 1]);
  eq('gauges: junk readings skipped', GL([{ hist:[{ ms:NaN, v:24 }, { ms:t0, v:null }] }, { hist:[rd(0, 17)] }]).status, 'few');
  eq('gauges: sensor id', E3.srGaugeSid('C', 'g1'), 'line:C:g:g1');
  eq('gauges: next name', [E3.srNextGaugeName('C', []), E3.srNextGaugeName('C', [{ name:'C1' }, { name:'C3' }])], ['C1', 'C2']);
}
eq('finder keeps the baseline for display', LF([rd(-24, 24), rd(0, 17)], [rd(0, 25)]).baseline, 24);
eq('prefs pairH default 3', E3.srOpsPrefs({}).pairH, 3);
// Imported KML/GPX lines offered as mainline paths
const MLS = [{ id:'A', label:'Mainline A' }, { id:'B', label:'Sugar Hill run' }, { id:'C', label:'Mainline C' }];
const ls2 = (name, n = 2) => ({ type:'Feature', properties:{ name }, geometry:{ type:'LineString', coordinates:Array.from({ length:n }, (_, i) => [-69.6 + i * 0.001, 44.5]) } });
const IL = E3.srImportedLines([ls2('Mainline A'), ls2('sugar hill run'), ls2('line c'), ls2('Road'), { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[0,0],[1,0],[1,1],[0,0]]] } }, ls2('Mainline D')], MLS);
eq('imported: only LineStrings', IL.length, 5);
eq('imported: suggestions by label and letter', IL.map(x => x.suggest), ['A', 'B', 'C', null, null]);
eq('imported: points flipped to lat,lon', IL[0].pts[0], [44.5, -69.6]);
eq('imported: length in feet (0.001 deg lon at 44.5N = 79.4 m)', IL[0].ft, 260);
eq('imported: keeps file index', IL.map(x => x.i), [0, 1, 2, 3, 5]);
eq('imported: one suggestion per mainline', E3.srImportedLines([ls2('A'), ls2('Mainline A')], MLS).map(x => x.suggest), ['A', null]);
eq('imported: letter forms', ['A', 'ML-A', 'main a', 'A line', 'Mainline_A', 'AA'].map(n => E3.srImportedLines([ls2(n)], MLS)[0].suggest), ['A', 'A', 'A', 'A', 'A', null]);
eq('imported: one point is not a line', E3.srImportedLines([ls2('A', 1)], MLS).length, 0);
eq('imported: nothing', E3.srImportedLines(null, MLS), []);
eq('leak single', E3.srLeakCheck([rd(0, 17)], 2, 7).status, 'single');
const lk = E3.srLeakCheck([rd(-48, 24.1), rd(-24, 24.3), rd(-12, 23.9), rd(0, 21.9)], 2, 7);
eq('leak suspect at 2.2 drop', [lk.status, lk.baseline, lk.drop, lk.n], ['suspect', 24.1, 2.2, 3]);
eq('leak exactly at limit is suspect', E3.srLeakCheck([rd(-5, 24), rd(0, 22)], 2, 7).status, 'suspect');
eq('leak 1.9 below is ok', E3.srLeakCheck([rd(-5, 24), rd(0, 22.1)], 2, 7).status, 'ok');
eq('leak ignores readings older than the window', E3.srLeakCheck([rd(-24 * 8, 26), rd(0, 23.5)], 2, 7).status, 'single');
eq('leak median resists one bad reading', E3.srLeakCheck([rd(-30, 24), rd(-20, 24.2), rd(-10, 15), rd(0, 23.8)], 2, 7).status, 'ok');
eq('leak order-free', E3.srLeakCheck([rd(0, 20), rd(-3, 24)], 2, 7).status, 'suspect');
eq('leak limit is his', E3.srLeakCheck([rd(-3, 24), rd(0, 22.6)], 1.0, 7).status, 'suspect');
eq('leak junk skipped', E3.srLeakCheck([{ ms: NaN, v: 3 }, rd(-1, 24), { ms: t0, v: 'x' }], 2, 7).status, 'single');
// Runtime
eq('runtime open run', E3.srRunHours([], t0 - 2 * HR, -Infinity, t0), 2);
eq('runtime closed runs', E3.srRunHours([{ start: t0 - 5 * HR, end: t0 - 4 * HR }, { start: t0 - 3 * HR, end: t0 - 2.5 * HR }], null, -Infinity, t0), 1.5);
eq('runtime clipped to window', E3.srRunHours([{ start: t0 - 5 * HR, end: t0 - 1 * HR }], null, t0 - 2 * HR, t0), 1);
eq('runtime overlaps count once', E3.srRunHours([{ start: t0 - 4 * HR, end: t0 - 2 * HR }, { start: t0 - 3 * HR, end: t0 - 1 * HR }], null, -Infinity, t0), 3);
eq('runtime backwards run ignored', E3.srRunHours([{ start: t0, end: t0 - HR }], null, -Infinity, t0), 0);
eq('runtime clock text', E3.srHms(14 + 2 / 60 + 12 / 3600), '14:02:12');
// Fuel and time to empty
eq('tte', E3.srTimeToEmpty(3.1, 0.34).toFixed(3), (3.1 / 0.34).toFixed(3));
eq('tte unknown burn', E3.srTimeToEmpty(3, 0), null);
const fl = E3.srFuelLeft({ fills: [{ ms: t0 - 10 * HR, level: 6.6 }], burnGalH: 0.34, capGal: 6.6, runs: [{ start: t0 - 10 * HR, end: t0 - 6 * HR }], runStart: t0 - 2 * HR, now: t0 });
eq('fuel left burns only while running', [+fl.levelGal.toFixed(2), +fl.hoursLeft.toFixed(2), fl.emptyAtMs != null], [+(6.6 - 0.34 * 6).toFixed(2), +((6.6 - 0.34 * 6) / 0.34).toFixed(2), true]);
eq('fuel stopped has no empty time', E3.srFuelLeft({ fills: [{ ms: t0 - HR, level: 5 }], burnGalH: 0.5, runs: [], runStart: null, now: t0 }).emptyAtMs, null);
eq('fuel never below zero', E3.srFuelLeft({ fills: [{ ms: t0 - 20 * HR, level: 2 }], burnGalH: 1, runs: [], runStart: t0 - 20 * HR, now: t0 }).levelGal, 0);
eq('fuel latest fill wins', E3.srFuelLeft({ fills: [{ ms: t0 - 5 * HR, level: 1 }, { ms: t0 - HR, level: 6 }], burnGalH: 1, runs: [], runStart: null, now: t0 }).levelGal, 6);
eq('fuel none logged', E3.srFuelLeft({ fills: [], burnGalH: 1, now: t0 }), null);
// Age tiers and vacuum ramp
eq('age tiers', [E3.srAgeTier(t0 - HR, t0, 12), E3.srAgeTier(t0 - 5 * HR, t0, 12), E3.srAgeTier(t0 - 13 * HR, t0, 12), E3.srAgeTier(null, t0, 12)], ['fresh', 'aging', 'old', 'none']);
eq('vac ramp', [15, 16, 19.9, 24.1, 27, NaN].map(E3.srVacStep), [0, 0, 1, 4, 4, null]);
// Freeze/thaw from hourly
const hourly = Array.from({ length: 48 }, (_, i) => ({ ms: t0 - 24 * HR + i * HR, f: 36 - 8 * Math.cos((i - 12) / 24 * 2 * Math.PI) }));
const ft = E3.srFreezeThaw(hourly, t0, 39.4);
eq('freeze thaw now', ft.nowF, 39.4);
eq('freeze thaw froze last 24', ft.frozeLast24, true);
eq('freeze thaw next is a freeze', ft.cross && ft.cross.kind, 'freeze');
eq('freeze thaw none', E3.srFreezeThaw([], t0, null), null);
eq('freeze thaw rising', E3.srFreezeThaw([{ ms: t0 - 3 * HR, f: 30 }, { ms: t0, f: 34 }], t0).trend, 'rising');
// Sap running (honest rule)
eq('sap running', E3.srSapRunning({ tempF: 39, frozeLast24: true, tanks: [{ fillGalH: 38, readMs: t0 - HR }], now: t0 }), 'running');
eq('sap weather only', E3.srSapRunning({ tempF: 39, frozeLast24: true, tanks: [{ fillGalH: 38, readMs: t0 - 5 * HR }], now: t0 }), 'weather');
eq('sap not at 32', E3.srSapRunning({ tempF: 32, frozeLast24: true, tanks: [], now: t0 }), null);
eq('sap warm no freeze', E3.srSapRunning({ tempF: 50, frozeLast24: false, tanks: [], now: t0 }), null);
// Mainline geometry
const tk = [{ id: 9, lat: 44.54, lon: -69.62 }];
const tr3 = [{ id: 1, lat: 44.541, lon: -69.62 }, { id: 2, lat: 44.543, lon: -69.62 }, { id: 3, lat: 44.542, lon: -69.62 }];
const lp = E3.srLinePath({}, tr3, tk);
eq('line through trees, far first, into the tank', [lp.source, lp.pts.map(p => +p[0].toFixed(6)), lp.tankId], ['trees', [44.543, 44.542, 44.541, 44.54], 9]);
// zigzag trees either side of a line: the drawn mainline runs down the middle
const zz = [0, 1, 2, 3, 4, 5].map(i => ({ id: i, lat: 44.541 + i * 0.0005, lon: -69.62 + (i % 2 ? 0.0002 : -0.0002) }));
const zp = E3.srLinePath({}, zz, tk);
eq('line down the middle of zigzag trees', Math.max(...zp.pts.slice(1, -2).map(p => Math.abs(p[1] + 69.62))) < 0.00012, true);
eq('line keeps its top at the top tree', +zp.pts[0][0].toFixed(4), 44.5435);
const lpe = E3.srLinePath({}, tr3.map((t, i) => ({ ...t, elev: [300, 100, 200][i] })), tk);
eq('line by elevation when all known', lpe.pts.map(p => +p[0].toFixed(6)), [44.541, 44.542, 44.543, 44.54]);
eq('drawn path wins', E3.srLinePath({ path: [[1, 2], [3, 4]] }, tr3, tk).source, 'drawn');
eq('line with no trees', E3.srLinePath({}, [], tk).source, 'none');
eq('line one tree no tank', E3.srLinePath({}, [tr3[0]], []).pts, []);
const np = E3.srNearestOnPath([44.542, -69.619], [[44.54, -69.62], [44.544, -69.62]]);
eq('nearest on path', [+np[0].toFixed(4), +np[1].toFixed(4)], [44.542, -69.62]);
eq('path feet', Math.round(E3.srPathFt([[44.54, -69.62], [44.541, -69.62]])), 365);
// Reading providers: one interface, manual now, simulator for demos
const man = E3.srManualSource([{ s: 'line:A:end', t: new Date(t0 - HR).toISOString(), v: 24.1 }, { s: 'line:A:end', t: new Date(t0 - 3 * HR).toISOString(), v: 24.4 },
  { s: 'tank:1:level', t: new Date(t0).toISOString(), v: '780' }, { s: 'x', t: 'bad', v: 1 }], 12);
eq('manual latest', [man.id, man.latest('line:A:end').v, man.latest('line:A:end').src], ['manual', 24.1, 'manual']);
eq('manual history sorted', man.history('line:A:end').map(x => x.v), [24.4, 24.1]);
eq('manual unknown sensor', man.latest('line:Z:end'), null);
eq('manual status', [man.status(t0), E3.srManualSource([], 12).status(t0), man.status(t0 + 20 * HR)], ['manual', 'off', 'stale']);
eq('manual has the full interface', ['latest', 'history', 'subscribe', 'status'].every(k => typeof man[k] === 'function'), true);
let clk = t0;
const sim = E3.srSimSource({ lines: [{ id: 'A', base: 24 }], tanks: [{ id: '1', capGal: 1000, level: 500, rate: 36 }], tempF: 39 }, () => clk, t0);
eq('sim is labelled sim', [sim.id, sim.latest('line:A:end').src, sim.status()], ['sim', 'sim', 'live']);
eq('sim jitter within 0.1', Math.abs(sim.latest('line:A:end').v - 24) <= 0.1 + 1e-9, true);
clk = t0 + HR;
eq('sim tank rises at its rate', sim.latest('tank:1:level').v, 536);
clk = t0 + 100 * HR;
eq('sim tank stops at capacity', sim.latest('tank:1:level').v, 1000);
eq('sim deterministic', E3.srSimSource({ lines: [{ id: 'A', base: 24 }] }, () => t0 + 9000, t0).latest('line:A:end').v,
  E3.srSimSource({ lines: [{ id: 'A', base: 24 }] }, () => t0 + 9000, t0).latest('line:A:end').v);
eq('sim unknown sensor', sim.latest('line:Q:end'), null);
eq('pick source: manual unless demo', [E3.srPickSource({ readings: [] }).id, E3.srPickSource({ demo: true, model: {}, clock: () => t0 }).id], ['manual', 'sim']);
eq('sensor ids', [E3.srSensorId('line', 'C'), E3.srSensorId('pump', 'p1'), E3.srSensorId('tank', 't1')], ['line:C:end', 'pump:p1:vac', 'tank:t1:level']);
// Prefs: defaults, his values, junk ignored
eq('prefs default', E3.srOpsPrefs(null), E3.SR_OPS_DEFAULTS);
eq('prefs his leak limit', E3.srOpsPrefs({ leakLimitIn: '1.5', freezeF: 'x' }).leakLimitIn, 1.5);
eq('prefs junk falls back', E3.srOpsPrefs({ freezeF: 'x', staleH: -3 }).freezeF, 28);
// Freeze prep items follow the pumps he has
eq('freeze items', E3.srFreezeItems([{ id: 't', kind: 'transfer' }, { id: 'v', kind: 'vacuum' }, { id: 'g', kind: 'generator' }], true).map(i => i.key),
  ['fzDrainTransfer', 'fzTrap', 'fzGen', 'fzLowDrains']);
eq('freeze items none', E3.srFreezeItems([], false), []);
// Pump jobs into "Do this next"
const ops = { prefs: E3.SR_OPS_DEFAULTS, pumps: [], leaks: [], freeze: null };
const pj = o => E3.srJobs({ ...base, ops: { ...ops, ...o } }).map(j => [j.id, j.p]);
eq('pump fault 95', pj({ pumps: [{ id: 't', name: 'Transfer pump', status: 'fault', note: 'Lost prime' }] }), [['fault-t', 95], ['log', 10]]);
eq('leak suspect 70', pj({ leaks: [{ id: 'C', name: 'Mainline C', latest: 17.2, baseline: 24.1, drop: 6.9 }] }), [['leak-C', 70], ['log', 10]]);
const lj = m => E3.srJobs({ ...base, ops: { ...ops, leaks: [{ id: 'C', name: 'Mainline C', latest: 17.2, baseline: 24.1, releaser: 24.5, drop: 7.3, method: m }] } }).find(j => j.id === 'leak-C');
eq('leak job names the pump when paired', [lj('releaser').why, lj('releaser').vars.rel], ['jLeakWR', 24.5]);
eq('leak job falls back to baseline text', lj('baseline').why, 'jLeakW');
eq('fuel under 4 h is 75', pj({ pumps: [{ id: 'g', name: 'Generator', status: 'running', fuel: { hoursLeft: 3, levelGal: 1 } }] }), [['fuel-g', 75], ['log', 10]]);
eq('fuel 9 h by day is 35', pj({ pumps: [{ id: 'g', name: 'Generator', status: 'running', fuel: { hoursLeft: 9, levelGal: 3 } }] }), [['fuel-g', 35], ['log', 10]]);
eq('fuel 9 h at night runs dry overnight', E3.srJobs({ ...base, minutes: 20 * 60, ops: { ...ops, pumps: [{ id: 'g', name: 'Generator', status: 'running', fuel: { hoursLeft: 9, levelGal: 3 } }] } })[0].title, 'jFuelNT');
eq('fuel stopped pump no job', pj({ pumps: [{ id: 'g', name: 'Generator', status: 'stopped', fuel: { hoursLeft: 1, levelGal: 0.3 } }] }), [['log', 10]]);
eq('freeze prep replaces the plain freeze job', E3.srJobs({ ...base, wx: wxF, ops: { ...ops, freeze: { lo: 19, done: 1, total: 4 } } }).map(j => [j.id, j.p]), [['freeze-prep', 55], ['log', 10]]);
eq('freeze prep at night 90', E3.srJobs({ ...base, wx: wxF, minutes: 20 * 60, ops: { ...ops, freeze: { lo: 19, done: 0, total: 4 } } })[0].p, 90);
eq('freeze prep done: plain freeze job stays', E3.srJobs({ ...base, wx: wxF, ops: { ...ops, freeze: { lo: 19, done: 4, total: 4 } } }).map(j => j.id), ['freeze', 'log']);
eq('ranking fault > freeze > fuel > leak', E3.srJobs({ ...base, minutes: 20 * 60, ops: { ...ops, freeze: { lo: 19, done: 0, total: 2 },
  leaks: [{ id: 'C', name: 'C', latest: 17, baseline: 24, drop: 7 }],
  pumps: [{ id: 't', name: 'T', status: 'fault' }, { id: 'g', name: 'G', status: 'running', fuel: { hoursLeft: 2, levelGal: 0.7 } }] } }).map(j => j.id),
  ['fault-t', 'freeze-prep', 'fuel-g', 'leak-C', 'log']);
eq('no ops, no change', ids({}), ['log']);
// Offline tiles: classic's math
eq('tile xy', E3.srTileXY(44.5412, -69.6203, 16), { x: 20094, y: 23692 });
const tb2 = { north: 44.5425, south: 44.5400, west: -69.6230, east: -69.6180 };
const tu = E3.srTileUrls(tb2, 17, 'sat');
eq('tile urls sat pairs imagery and labels', [tu.urls.length === tu.tiles * 2, tu.urls[0].includes('World_Imagery/MapServer/tile/16/'), tu.tooMany], [true, true, false]);
eq('tile urls topo only to z16', E3.srTileUrls(tb2, 17, 'topo').urls.every(u => /tile\/1[0-6]\//.test(u)), true);
eq('tile urls cap', E3.srTileUrls({ north: 45, south: 44, west: -70, east: -69 }, 17, 'sat').tooMany, true);

// ── Yield verdict: one benchmark (srYieldClass), every screen ──
const Y = new Function('ls', src.slice(a, b) +
  '\nreturn { srYieldClass, srSapYieldClass, SR_YIELD_BAND, NASS_US_AVG, srYieldGap, srInsights, srScoreRows, srDiagnose, seasonScore, YIELD_MODELS, FUELS, rule86 };')
  ({ get: (_k, d) => d, set: () => true });
eq('band is 0.20 to 0.45', Y.SR_YIELD_BAND, { low: 0.20, high: 0.45 });
eq('yield class boundaries', [0.19, 0.1999, 0.20, 0.31, 0.33, 0.45, 0.4501, 0.7].map(Y.srYieldClass), ['low', 'low', 'normal', 'normal', 'normal', 'normal', 'strong', 'strong']);
eq('yield class no data', [0, -1, NaN, null, undefined, Infinity, 'x'].map(Y.srYieldClass), [null, null, null, null, null, null, null]);
eq('NASS US average is normal', Y.srYieldClass(Y.NASS_US_AVG), 'normal');
eq('sap class at 2.0 Brix: 8 gal low, 18.2 normal, 20 strong', [8, 18.2, 20].map(v => Y.srSapYieldClass(v, 2.0)), ['low', 'normal', 'strong']);
eq('sap class follows Brix: 10 gal at 3.0 is 0.347, at 1.5 is 0.174', [Y.srSapYieldClass(10, 3.0), Y.srSapYieldClass(10, 1.5)], ['normal', 'low']);
// The reported contradiction: 0.31 gal a tap on mechanical vacuum. Every screen now agrees it is normal.
{ const taps = 640, syr = 0.31 * taps, sap = syr * 43.2 * 1.05, vac = Y.YIELD_MODELS.vacuum;
  const gap = Y.srYieldGap(sap, syr, taps, 2.0, vac, 45);
  const ins = Y.srInsights(sap, syr, 0, 0, taps, 2.0, null, Y.FUELS[0]).find(i => /^yield/.test(i.id));
  const sc = Y.seasonScore({ sapT: sap, syT: syr, fuelT: 0, taps, brix: 2.0, yieldModel: vac, fuelSpu: Y.FUELS[0].spu });
  const row = Y.srScoreRows(sc, { brix: 2.0, model: vac, syrupGal: syr, taps, sapGal: sap, fuelT: 0 }).find(r => r.id === 'yield');
  const slog = { sapCollected: [{ id: 1, date: '2027-03-10', val: 18.2 * taps }], syrupMade: [{ id: 2, date: '2027-03-10', val: syr }] };
  const dx = Y.srDiagnose({ slog, units: 'GAL', sapBrix: 2.0, syrupPrice: 45, woodCost: 250, laborRate: 20, trees: taps, vacLevel: 'high' }).find(f => /^yield/.test(f.id));
  eq('0.31 on vacuum: Recap yield gap has no "low" cause', gap.causes.some(c => c.id === 'lowYield'), false);
  eq('0.31 on vacuum: Recap names room to grow as normal', gap.causes.find(c => c.id === 'belowAvg').cls, 'normal');
  eq('0.31 on vacuum: Recap score row is inside the band', row.band, 'in');
  eq('0.31 on vacuum: Diagnose insight is normal, not strong', ins.id, 'yieldAvg');
  eq('18.2 gal sap a tap on high vacuum: Diagnose finding is ok, not low', dx.id, 'yieldOk');
  eq('calculations unchanged: yield gap gallons still use the vacuum range', [Math.round(gap.lo), Math.round(gap.hi)], [Math.round(taps * 0.45), Math.round(taps * 0.70)]);
  eq('calculations unchanged: yield score still against the vacuum middle', sc.yieldScore, Math.min(100, Math.round((syr / taps) / 0.575 * 100))); }
eq('insight strong above the band', Y.srInsights(0, 50, 0, 0, 100, 2, null, Y.FUELS[0])[0].id, 'yieldStrong');
eq('insight low under the band', Y.srInsights(0, 15, 0, 0, 100, 2, null, Y.FUELS[0])[0].id, 'yieldLow');
{ const slog = { sapCollected: [{ id: 1, date: '2027-03-10', val: 600 }], syrupMade: [{ id: 2, date: '2027-03-10', val: 12 }] };
  const f = Y.srDiagnose({ slog, units: 'GAL', sapBrix: 2.0, syrupPrice: 45, woodCost: 250, laborRate: 20, trees: 100, vacLevel: 'gravity' }).find(f => f.id === 'yield');
  eq('Diagnose low sap: 6 gal a tap under 8.64', [f && f.id, f && +f.v.lo.toFixed(2), f && +f.v.hi.toFixed(2)], ['yield', 8.64, 19.44]); }

// ── Boil readings (sg_boil_session.readings, optional) ──
{ const B = new Function('ls', src.slice(a, b) + '\nreturn { srBoilAddReading, srBoilSeries };')({ get: (_k, d) => d, set: () => true });
  const s0 = { start: 1000, sap: 40, syrup: 0, tempF: 211.4 };
  eq('old session reads as no readings', B.srBoilSeries(s0), { temp: [], brix: [], lastBrix: null, lastBrixAt: null, lastTemp: 211.4, draws: 0 });
  const s1 = B.srBoilAddReading(s0, { t: 2000, tempF: 217.26, brix: '' });
  eq('reading keeps the old fields and sets tempF', [s1.start, s1.sap, s1.syrup, s1.tempF, s1.readings], [1000, 40, 0, 217.26, [{ t: 2000, tempF: 217.26 }]]);
  const s2 = B.srBoilAddReading(s1, { t: 3000, tempF: 218.5, brix: 66.54, draw: 1.5 });
  eq('draw adds to syrup and stores Brix', [s2.syrup, s2.readings[1]], [1.5, { t: 3000, tempF: 218.5, brix: 66.5, draw: 1.5 }]);
  const s3 = B.srBoilAddReading(s2, { t: 2500, tempF: 218, brix: 0 });
  eq('readings sorted by time, zero Brix dropped', s3.readings.map(r => [r.t, r.brix || null]), [[2000, null], [2500, null], [3000, 66.5]]);
  eq('series', (({ temp, brix, lastBrix, lastBrixAt, draws }) => [temp.length, brix, lastBrix, lastBrixAt, draws])(B.srBoilSeries(s3)), [3, [{ ms: 3000, v: 66.5 }], 66.5, 3000, 1]);
  eq('last temp is the newest reading, not the last typed', [B.srBoilSeries(s3).lastTemp, s3.tempF], [218.5, 218.5]);
  eq('no session no change', B.srBoilAddReading(null, { t: 1, tempF: 1 }), null);
  eq('bad temperature ignored', B.srBoilAddReading(s0, { t: 5, tempF: NaN }), s0); }

// ── Strings: no key defined twice (Object.assign lets a later block silently replace an
// earlier one; the cutover audit found three live screens showing another screen's string) ──
{ const grab = i => { let d = 0; for (let j = i; j < src.length; j++) { const ch = src[j];
      if (ch === "'" || ch === '"' || ch === '`') { const q = ch; j++; while (j < src.length && src[j] !== q) { if (src[j] === '\\') j++; j++; } continue; }
      if (ch === '{') d++; else if (ch === '}' && !--d) return src.slice(i, j + 1); } return ''; };
  const blocks = []; const re = /Object\.assign\(RS_TR\.(en|fr),\s*\{/g; let mm;
  while ((mm = re.exec(src))) blocks.push([mm[1], grab(mm.index + mm[0].length - 1)]);
  const T = grab(src.indexOf('{', src.indexOf('const RS_TR = {'))), fi = T.indexOf('\n  fr:');
  blocks.push(['en', T.slice(0, fi)], ['fr', T.slice(fi)]);
  const keysOf = b => [...b.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`]*`/g, "''").matchAll(/[{,\s]([A-Za-z_$][\w$]*)\s*:/g)].map(x => x[1]);
  for (const lang of ['en', 'fr']) { const seen = new Set(), dup = [];
    for (const [l, b] of blocks) if (l === lang) for (const k of keysOf(b)) { if (seen.has(k) && k !== 'en' && k !== 'fr') dup.push(k); seen.add(k); }
    eq(`no ${lang} string key defined twice`, dup, []);
    eq(`${lang} strings parsed`, seen.size > (lang === 'en' ? 1500 : 200), true); } }

// ── French: every English key has a French value, with the same {placeholders} ──
// Evaluates the real tables (the RS_TR literal and every Object.assign block) in a
// sandbox, so a key added in English alone, or a French string that drops or renames
// a {placeholder}, fails here instead of showing English or a raw {v} on a French screen.
{ const vm = await import('node:vm');
  const a = src.indexOf('const RS_TR = {'), b = src.indexOf('function rt(', a);
  let code = src.slice(a, b).replace('const RS_TR', 'var RS_TR');
  const re = /Object\.assign\(RS_TR\.(?:en|fr),\s*\{/g; let mm;
  const close = i => { let d = 0; for (let j = i; j < src.length; j++) { const ch = src[j];
      if (ch === "'" || ch === '"' || ch === '`') { const q = ch; j++; while (j < src.length && src[j] !== q) { if (src[j] === '\\') j++; j++; } continue; }
      if (ch === '{') d++; else if (ch === '}' && !--d) return j; } return -1; };
  while ((mm = re.exec(src))) { const e = close(mm.index + mm[0].length - 1); code += '\n' + src.slice(mm.index, e + 1) + ');'; }
  const ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx);
  const { en, fr } = ctx.RS_TR;
  const ph = s => (String(s).match(/\{[A-Za-z_]\w*\}/g) || []).sort().join(',');
  eq('every English string key has French', Object.keys(en).filter(k => typeof fr[k] !== 'string' || !fr[k].trim()), []);
  eq('no French key without English', Object.keys(fr).filter(k => !(k in en)), []);
  eq('French placeholders match English', Object.keys(en).filter(k => k in fr && ph(en[k]) !== ph(fr[k])), []);
  eq('no em or en dash in French strings', Object.keys(fr).filter(k => /[–—]/.test(fr[k])), []);
  eq('French tables parsed', Object.keys(en).length > 2000, true);
  // Looping animations pause off-screen; the SVG steam carries no per-frame blur filter.
  // (hook at the component's top level, two-space indent: once it landed inside a useEffect and crashed the tank)
  eq('evaporator, tank and boil hero pause off-screen', ['function RsEvap(', 'function RsTankViz(', 'function RsBoilHero('].map(n => { const i = src.indexOf(n); return /\n  const ref = React\.useRef\(null\); useRsPauseOffscreen\(ref\);\n/.test(src.slice(i, src.indexOf('\n}\n', i))); }), [true, true, true]);
  eq('no SVG blur filter on the animated steam', /feGaussianBlur/.test(src.slice(src.indexOf('function RsEvap('), src.indexOf('function RsJugs('))), false);
  // Accessibility (fix pass)
  eq('Next card title is an h2 (an h3 under the page h1 skipped a level)', /<h2 id="rs-next-t">/.test(src) && !/<h3 id="rs-next-t">/.test(src), true);
  eq('Watch map is a labelled region, not an image around buttons', /className="rs-map rs-wmap base-sat" role="region"/.test(src), true);
  eq('Watch line panel: heading, focus on open, Escape back to its plate', ['id="rs-wpanel-h"', "aria-labelledby=\"rs-wpanel-h\"", 'rs-plate[data-line=', "e.key === 'Escape'"].every(k => src.slice(src.indexOf('function RsWatchPanel(')).includes(k)), true);
  eq('every data chart carries its table', ['function RsLineChart(', 'function RsBarChart(', 'function RsSeasonChart(', 'function RsBoilChart(', 'function RsTimeChart(', 'function RsRibbon('].map(n => { const i = src.indexOf(n); return src.slice(i, src.indexOf('\n}\n', i)).includes('<RsDataTable'); }), [true, true, true, true, true, true]);
  eq('the season chart reads out by arrow keys too', /tabIndex=\{0\} onBlur=\{\(\) => setSel\(null\)\}/.test(src) && /ArrowLeft: -1, ArrowRight: 1/.test(src), true);
  eq('html lang follows the language', /document\.documentElement\.lang = lang === 'fr' \? 'fr-CA' : 'en'/.test(src), true);
  eq('Watch passes its no-reading word (it was inside a comment)', /showHouse: !one, noReading: rt\(L, 'noReadingW'\)/.test(src), true);
  // French: ranges and units are never joined with English in code (L3 and L5 found both)
  eq('no range joined with a literal " to "', /\$\{[^}]*\} to \$\{/.test(src.slice(src.indexOf('function RsStepper('))), false);
  eq('no bare English unit after a number in a <small>', (src.match(/<small>\s?(in|ft|hr|in Hg)<\/small>/g) || []).length, 0);
  eq('the leak chain label no longer shares the checklist class', /className="rs-chk">/.test(src), false);
  eq('tank label comes from the tables', /aria-label=\{rt\(ls\.get\('sg_lang', 'en'\), empty \? 'noLevelYet' : 'tankPct'/.test(src), true);
  // Default checklist jobs are shown through the tables; ticks stay keyed by index, so the
  // English strings must equal the constants they replace, one for one.
  const arr = name => vm.runInNewContext(src.slice(src.indexOf('[', src.indexOf('const ' + name + ' = [')), src.indexOf('];', src.indexOf('const ' + name + ' = [')) + 1));
  eq('pre-season jobs match PRE_TASKS', arr('PRE_TASKS').map((x, i) => en['taskPre' + i] === x), arr('PRE_TASKS').map(() => true));
  eq('post-season jobs match POST_TASKS', arr('POST_TASKS').map((x, i) => en['taskPost' + i] === x), arr('POST_TASKS').map(() => true));
  // Diagnose fix cost and time: English identical to SR_FIXES, French for each.
  { const fx = vm.runInNewContext('(' + src.slice(src.indexOf('{', src.indexOf('const SR_FIXES = {')), src.indexOf('};', src.indexOf('const SR_FIXES = {')) + 1) + ')');
    eq('fix cost and time strings match SR_FIXES', Object.keys(fx).filter(k => en['fixC_' + k] !== fx[k].cost || en['fixT_' + k] !== fx[k].time || !fr['fixC_' + k] || !fr['fixT_' + k]), []); }
  eq('a yield method name for every model', ['buckets', 'gravity', 'natural', 'vacuum'].filter(k => !en['ym_' + k] || !fr['ym_' + k]), []);
  // The same rule for the older table in 12-i18n (t()), used by the PDF report and batch labels.
  const tA = src.indexOf('const TR = {'), tB = src.indexOf('const t = (lang', tA);
  const c2 = {}; vm.createContext(c2); vm.runInContext(src.slice(tA, tB).replace('const TR', 'var TR'), c2);
  eq('every t() key has French', Object.keys(c2.TR.en).filter(k => !(k in c2.TR.fr)), []);
  eq('t() placeholders match', Object.keys(c2.TR.en).filter(k => k in c2.TR.fr && ph(c2.TR.en[k]) !== ph(c2.TR.fr[k])), []); }

// ── Token law: no hex colour literals in Run Sheet code (tokens.css is the only home) ──
const { readdirSync } = await import('node:fs');
const rsFiles = readdirSync(join(ROOT, 'app', 'src')).filter(f => /^(3[1-9]|5\d|6\d|8\d|9[1-8])-.*\.jsx$/.test(f) || f === '40-19-error-boundary.jsx');
for (const f of [...rsFiles.map(f => join('app', 'src', f)), join('app', 'runsheet.css')]) {
  const code = readFileSync(join(ROOT, f), 'utf8').split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');
  const hits = code.match(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g) || [];
  eq(`no hex literals in ${f}`, hits, []);
}

// ── LiDAR terrain (USGS 3DEP) ────────────────────────────────────────────────
{
  const T3 = E3, near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
  // Units
  eq('m to ft', [T3.srMToFt(100), T3.srMToFt(0)], [328.084, 0]);
  eq('ft to m round trip', near(T3.srFtToM(T3.srMToFt(123.4)), 123.4), true);
  eq('slope 45 degrees is 100 %', near(T3.srDegToPct(45), 100), true);
  eq('slope 0 degrees is 0 %, 30 degrees is 57.7 %', [T3.srDegToPct(0), +T3.srDegToPct(30).toFixed(1)], [0, 57.7]);
  eq('percent to degrees', [+T3.srPctToDeg(100).toFixed(6), +T3.srPctToDeg(15).toFixed(2)], [45, 8.53]);
  eq('degrees to percent round trip', near(T3.srDegToPct(T3.srPctToDeg(12.5)), 12.5), true);
  eq('elevation in feet, metres in metric', [T3.srElevU(100, 'GAL'), T3.srElevU(100, 'L'), T3.srElevUnit('GAL'), T3.srElevUnit('L')], [328.084, 100, 'ft', 'm']);
  // Tile boxes in Web Mercator
  const E = T3.SR_MERC;
  eq('tile 0/0/0 is the world', T3.srTileBBox3857(0, 0, 0), [-E, -E, E, E]);
  eq('tile 1/1/0 is the north-east quarter', T3.srTileBBox3857(1, 1, 0), [0, 0, E, E]);
  eq('tile 1/0/1 is the south-west quarter', T3.srTileBBox3857(1, 0, 1), [-E, -E, 0, 0]);
  eq('tile width halves each zoom', near((b => b[2] - b[0])(T3.srTileBBox3857(17, 5, 5)) * 2, (b => b[2] - b[0])(T3.srTileBBox3857(16, 5, 5)), 1e-6), true);
  // Slope rule: percent rise, Web Mercator corrected, the board's five classes
  eq('slope z factor', [T3.srSlopeZ(0), +T3.srSlopeZ(60).toFixed(6), +T3.srSlopeZ(44.54).toFixed(3)], [1, 2, 1.403]);
  const sr = T3.srSlopeRule(44.54), remap = sr.rasterFunctionArguments.Raster, slope = remap.rasterFunctionArguments.Raster;
  eq('slope rule chain', [sr.rasterFunction, remap.rasterFunction, slope.rasterFunction], ['Colormap', 'Remap', 'Slope']);
  eq('slope rule asks for percent rise', [slope.rasterFunctionArguments.SlopeType, slope.rasterFunctionArguments.ZFactor], [2, +(1 / Math.cos(44.54 * Math.PI / 180)).toFixed(4)]);
  eq('slope classes match the legend', remap.rasterFunctionArguments.InputRanges, [0, 5, 5, 10, 10, 15, 15, 30, 30, 100000]);
  eq('slope colormap one entry per class', sr.rasterFunctionArguments.Colormap.map(x => x[0]), [1, 2, 3, 4, 5]);
  eq('slope legend ends 30+', T3.SR_SLOPE_CLASSES.map(k => [k.lo, k.hi]), [[0, 5], [5, 10], [10, 15], [15, 30], [30, null]]);
  // Aspect rule: every direction lands in exactly one class; north wraps
  const ar = T3.srAspectRule().rasterFunctionArguments.Raster.rasterFunctionArguments, R = ar.InputRanges, O = ar.OutputValues;
  const cls = d => { const hits = []; for (let i = 0; i < O.length; i++) if (d >= R[2 * i] && d < R[2 * i + 1]) hits.push(O[i]); return hits; };
  eq('aspect: every whole degree in exactly one class', Array.from({ length: 360 }, (_, d) => cls(d).length).every(n => n === 1), true);
  eq('aspect: flat, N both sides, E, S, W', [cls(-1), cls(350), cls(10), cls(90), cls(180), cls(270)].map(x => x[0]), [1, 2, 2, 4, 6, 8]);
  eq('aspect legend: flat and eight directions', T3.SR_ASPECT_CLASSES.map(k => k.k), ['flat', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
  eq('aspect words', [-1, 0, 44, 46, 180, 359, NaN].map(T3.srAspectWord), ['flat', 'N', 'NE', 'NE', 'S', 'N', 'flat']);
  // Elevation rule: his range, stretched min-max, the ramp in five parts
  const er = T3.srElevRule({ min: 80, max: 140 }), st = er.rasterFunctionArguments.Raster;
  eq('elevation rule chain', [er.rasterFunction, st.rasterFunction, st.rasterFunctionArguments.StretchType, st.outputPixelType], ['Colormap', 'Stretch', 5, 'U8']);
  eq('elevation stretch uses his range', st.rasterFunctionArguments.Statistics[0].slice(0, 2), [80, 140]);
  eq('elevation ramp parts join', er.rasterFunctionArguments.Colorramp.colorRamps.length, T3.SR_ELEV_RAMP.length - 1);
  eq('published fallbacks by name', ['hillshade', 'elev', 'slope', 'aspect'].map(k => T3.srTerrainRule(k, { fallback: true }).rasterFunction), ['Hillshade Gray', 'Hillshade Elevation Tinted', 'Slope Map', 'Aspect Map']);
  eq('hillshade is always the published one', T3.srTerrainRule('hillshade').rasterFunction, 'Hillshade Gray');
  // Request building
  const u = T3.srTerrainTileUrl('slope', 16, 19782, 23583, { lat: 44.54 }), q = new URL(u).searchParams;
  eq('tile URL is exportImage on 3DEP', u.startsWith(T3.SR_3DEP + '/exportImage?'), true);
  eq('tile URL params', ['bboxSR', 'imageSR', 'size', 'format', 'transparent', 'f'].map(k => q.get(k)), ['3857', '3857', '256,256', 'png', 'true', 'image']);
  eq('tile URL bbox is the tile', q.get('bbox').split(',').map(Number), T3.srTileBBox3857(16, 19782, 23583).map(v => +v.toFixed(3)));
  eq('tile URL rendering rule round-trips', JSON.parse(q.get('renderingRule')), T3.srSlopeRule(44.54));
  eq('tile URL is deterministic (the tile cache can hold it)', u === T3.srTerrainTileUrl('slope', 16, 19782, 23583, { lat: 44.54 }), true);
  eq('trails tile shows layer 37 from export', (p => [p.get('layers'), p.get('transparent'), p.get('f')])(new URL(T3.srTrailsTileUrl(15, 9891, 11791)).searchParams), ['show:37', 'true', 'image']);
  eq('hydro tile is z/y/x', T3.srHydroTileUrl(15, 9891, 11791).endsWith('/USGSHydroCached/MapServer/tile/15/11791/9891'), true);
  const su = new URL(T3.srSamplesUrl([[44.54, -69.62], [44.55, -69.61]])).searchParams, g = JSON.parse(su.get('geometry'));
  eq('samples: multipoint in WGS84, x = longitude', [su.get('geometryType'), g.spatialReference.wkid, g.points[0]], ['esriGeometryMultipoint', 4326, [-69.62, 44.54]]);
  eq('samples: first value only, json', [su.get('returnFirstValueOnly'), su.get('f')], ['true', 'json']);
  eq('parse samples by location id', T3.srParseSamples({ samples: [{ locationId: 1, value: '101.5' }, { locationId: 0, value: '99.25' }] }, 2), [99.25, 101.5]);
  eq('parse samples: NoData and missing are null', T3.srParseSamples({ samples: [{ locationId: 0, value: 'NoData' }, { locationId: 2, value: '-3.4e38' }] }, 3), [null, null, null]);
  eq('parse samples: an error answer is null', T3.srParseSamples({ error: { code: 400 } }, 2), null);
  // Range and legend
  eq('grid points: n x n with the corners', (p => [p.length, p[0], p[p.length - 1]])(T3.srGridPoints({ north: 2, south: 0, west: 10, east: 12 }, 3)), [9, [0, 10], [2, 12]]);
  eq('range padded 5 % and rounded to the half metre', T3.srElevRange([80.2, 120.1, 100, null]), { min: 78, max: 122.5 });
  eq('range of flat ground still has width', T3.srElevRange([50, 50.4]), { min: 49, max: 51.5 });
  eq('range needs two heights', T3.srElevRange([50, null]), null);
  const tk = T3.srElevTicks({ min: 78, max: 122.5 }, 'GAL');
  eq('legend ticks run low to high in feet', [tk[0].v, tk[tk.length - 1].v, tk[0].at, tk[tk.length - 1].at], [256, 402, 0, 1]);
  eq('legend ticks between are round and inside', tk.slice(1, -1).every(t => t.v % 50 === 0 && t.at > 0 && t.at < 1), true);
  eq('legend ticks in metres', (t => [t[0].v, t[t.length - 1].v])(T3.srElevTicks({ min: 78, max: 122.5 }, 'L')), [78, 123]);
  // Line profile
  const along = T3.srAlongPath([[44.54, -69.62], [44.541, -69.62]], 5);
  eq('along a path: n points, evenly spaced, ends kept', [along.length, near(along[0][0], 44.54), near(along[4][0], 44.541), near(along[2][2] * 2, along[4][2], 1e-6)], [5, true, true, true]);
  const pr = T3.srLineProfile(along, [120, 118, 116, 114, 110]);
  eq('profile: fall, grade, which end is high', [pr.fallM, +pr.gradePct.toFixed(2), pr.highIsStart, pr.dip], [10, +(10 / along[4][2] * 100).toFixed(2), true, null]);
  const pd = T3.srLineProfile(along, [110, 105, 103, 108, 112]);
  eq('profile: a low spot under both ends', [pd.highIsStart, pd.dip.depth, near(pd.dip.at, along[4][2] - along[2][2], 1e-6)], [false, 7, true]);
  const pr2 = T3.srLineProfile(along, [110, 116, 121, 114, 104]);
  eq('profile: a rise over both ends (sap cannot cross it on gravity)', [pr2.highIsStart, pr2.rise.height, pr2.rise.m, pr2.dip], [true, 11, 121, null]);
  eq('profile: a steady line has no rise and no dip', [pr.rise, pr.dip], [null, null]);
  eq('profile: under the threshold is not a rise', T3.srLineProfile(along, [110, 110.5, 110.8, 109, 105], 1).rise, null);
  eq('profile: missing heights skipped, fewer than two is null', [T3.srLineProfile(along, [null, 100, null, null, 98]).fallM, T3.srLineProfile(along, [null, 100, null, null, null])], [2, null]);
  // Offline save carries the terrain layers that are on (to z17)
  const bb = { north: 44.5425, south: 44.5415, west: -69.6215, east: -69.6205 };
  const base = T3.srTileUrls(bb, 17, 'sat'), more = T3.srTileUrls(bb, 17, 'sat', { terrain: { kind: 'elev', o: { range: { min: 80, max: 140 } } }, water: true });
  eq('offline: terrain and water added up to z17 only', more.urls.length - base.urls.length, 2 * base.urls.filter(x => /\/tile\/(16|17)\//.test(x) && /World_Imagery/.test(x)).length);
  eq('offline: topo saves them too', T3.srTileUrls(bb, 17, 'topo', { hillshade: true }).urls.some(x => x.includes('exportImage')), true);
}

// ── Fix pass 2 ───────────────────────────────────────────────────────────────
{
  const fn = name => { const m = src.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}')); if (!m) throw new Error(name + ' not found'); return m[0]; };
  const fmtLine = src.match(/const fmt {2}= \(n, d = 1\) => [^\n]+/)[0];
  const numIn = src.match(/const srNumIn = [^\n]+/)[0];
  const money = src.match(/const srMoney = [^\n]+/)[0];
  const mk = loc => new Function(`let SR_NUM_LOC = '${loc}'; ${fmtLine}; ${numIn}; ${money}; ${fn('srParseNum')}; return { fmt, srNumIn, srMoney, srParseNum };`)();
  const EN = mk('en-US'), FR = mk('fr-CA');
  // English output is byte-identical to before; French uses fr-CA separators.
  eq('fmt en unchanged', [EN.fmt(1012, 0), EN.fmt(2.5, 1), EN.fmt(1234567.891, 2), EN.fmt(NaN)], ['1,012', '2.5', '1,234,567.89', '—']);
  eq('fmt fr', [FR.fmt(1012, 0), FR.fmt(2.5, 1), FR.fmt(0.307, 3)], ['1 012', '2,5', '0,307']);
  eq('money en unchanged', [EN.srMoney(1250), EN.srMoney(-5), EN.srMoney(0.88, 2)], ['$1,250', '-$5', '$0.88']);
  eq('money fr: sign after', [FR.srMoney(1250), FR.srMoney(0.88, 2)], ['1 250 $', '0,88 $']);
  eq('stepper shows fr decimals, no grouping', [EN.srNumIn(2.5), FR.srNumIn(2.5), FR.srNumIn(1500)], ['2.5', '2,5', '1500']);
  eq('parse en unchanged', [EN.srParseNum('1,500'), EN.srParseNum('2,5'), EN.srParseNum('12,345.67')], [1500, 2.5, 12345.67]);
  eq('parse fr: comma is always the decimal', [FR.srParseNum('1,500'), FR.srParseNum('2,5'), FR.srParseNum('1 000,5'), FR.srParseNum('1 000,5'), FR.srParseNum('24.5')], [1.5, 2.5, 1000.5, 1000.5, 24.5]);
  eq('parse fr: coordinates typed with a comma', FR.srParseNum('-69,6203'), -69.6203);
  eq('PDF report formats in en-US', /const loc0 = SR_NUM_LOC; SR_NUM_LOC = 'en-US';[\s\S]*finally \{ SR_NUM_LOC = loc0; \}/.test(src.slice(src.indexOf('async function exportSeasonPDF('))), true);
  eq('shell sets the number locale while rendering', /SR_NUM_LOC = lang === 'fr' \? 'fr-CA' : 'en-US';/.test(src), true);
  // Season score memo: same numbers as seasonScore, computed once per input set.
  const E2m = new Function('ls', src.slice(a, b) + '\nreturn { seasonScore, srSeasonScore, YIELD_MODELS, FUELS };')({ get: (_k, d) => d, set: () => true });
  const args = { sapT: 1200, syT: 25, fuelT: 1.2, taps: 100, brix: 2, yieldModel: E2m.YIELD_MODELS.gravity, fuelSpu: E2m.FUELS[0].spu };
  const m1 = E2m.srSeasonScore(args), m2 = E2m.srSeasonScore({ ...args });
  eq('score memo equals seasonScore', JSON.stringify(m1), JSON.stringify(E2m.seasonScore(args)));
  eq('score memo returns the same result for the same inputs', m1 === m2, true);
  eq('score memo recomputes when an input changes', E2m.srSeasonScore({ ...args, syT: 30 }) === m1, false);
  eq('score memo, other inputs', JSON.stringify(E2m.srSeasonScore({ ...args, taps: 0, fuelT: 0 })), JSON.stringify(E2m.seasonScore({ ...args, taps: 0, fuelT: 0 })));
  eq('no screen calls seasonScore directly', (src.match(/[^.\w]seasonScore\(\{/g) || []).length, 1);   // only srSeasonScore's own call
  eq('sg_logs2 read through a memo on the screens that re-rendered per keystroke', [
    /const slog = React\.useMemo\(\(\) => \(srReadLogs\(c\.units\)/.test(src.slice(src.indexOf('function RsDegreeDays('))),
    /const logs = useSrLogs\(\);/.test(src.slice(src.indexOf('function RsGuide('))),
    /const sapT = React\.useMemo\(\(\) => seasonTotals/.test(src.slice(src.indexOf('function RsEquipment(')))], [true, true, true]);
  // Gauge chain: a new data key (locked in an expired trial, backed up), sg_line_meta untouched.
  const prefs = src.match(/const SR_PREF_KEYS = \[[\s\S]*?\];/)[0];
  eq('sg_line_gauges is a data key, not a preference', prefs.includes('sg_line_gauges'), false);
  eq('gauge writer keeps the documented shape', /\{ id: g\.id, name: g\.name, at: g\.at \|\| '', pinId: g\.pinId != null \? g\.pinId : null \}/.test(fn('srSaveLineGauges')), true);
  eq('line meta writer unchanged', fn('srSaveLineMeta').includes('gauge'), false);
  eq('gauge readings use the ordinary reading writer', /sensor=\{\{ id: reading\.g\.sid, quantity: 'vacuum', target: \{ type: 'line', id: line\.id \}, unit: 'inHg' \}\}/.test(src), true);
  eq('Watch shows the gauge row read-only and never with demo readings', (src.match(/l\.chain && !demo \? <RsGaugeChain c=\{c\} l=\{l\} now=\{model\.now\} P=\{model\.prefs\} big \/>/g) || []).length, 2);
  // Keyboard: one sheet answers at a time; focus finds a redrawn map control.
  const sheet = src.slice(src.indexOf('function RsSheet('), src.indexOf('\n}\n', src.indexOf('function RsSheet(')));
  eq('only the top sheet answers keys', /if \(_rsSheets\[_rsSheets\.length - 1\] !== me\) return;/.test(sheet), true);
  eq('scroll lock lifts only when the last sheet closes', /if \(!_rsSheets\.length\) document\.documentElement\.classList\.remove\('rs-sheet-open'\)/.test(sheet), true);
  eq('sheet focuses its data-autofocus field', sheet.includes("querySelector('[data-autofocus]')"), true);
  eq('Bush pins focusable only where they open something, labelled once Leaflet made the icon', /const kb = !!opt\.onPin;/.test(src) && /keyboard: kb/.test(src) && /if \(kb\) mk\.on\('add'[\s\S]{0,400}data-fk', 'pin:'/.test(src), true);
  eq('line plates carry a focus key', (src.match(/data-fk="line:\$\{srEsc\(l\.id\)\}"/g) || []).length, 2);
  // Charts: a visible table on request everywhere, except Watch's fixed one-screen layout.
  eq('chart table has a Show as a table toggle', /aria-expanded=\{open\} aria-controls=\{id\}/.test(src.slice(src.indexOf('function RsDataTable('))), true);
  eq('legends sit between a chart and its table link', [
    (t => t.indexOf('{legend}') < t.indexOf('<RsDataTable'))(src.slice(src.indexOf('function RsTimeChart('))),
    (t => t.indexOf('className="rs-legend"') < t.indexOf('<RsDataTable'))(src.slice(src.indexOf('function RsSeasonChart('), src.indexOf('\n}\n', src.indexOf('function RsSeasonChart(')))),
    (t => t.indexOf('className="rs-legend"') < t.indexOf('<RsDataTable'))(src.slice(src.indexOf('function RsRibbon('), src.indexOf('\n}\n', src.indexOf('function RsRibbon('))))], [true, true, true]);
  eq('Watch time charts keep the table but not the toggle', (src.match(/tableToggle=\{false\}/g) || []).length, 2);
  // Hierarchy: live Boil actions sit above the chart; the Next card yields to Get a Pass while locked.
  const live = src.slice(src.indexOf('function RsBoilLive('));
  eq('live Boil: Add a reading before the readings chart', live.indexOf('id="rs-boil-read"') < live.indexOf('className="rs-blchart"'), true);
  eq('Next card is secondary during an expired trial', /id="rs-next-btn" kind=\{SR_LOCKED \? 'secondary' : 'primary'\}/.test(src), true);
}

// ── UI review: mainline letter plates never stack (srPlacePlates, screen px) ──
{
  const PP = E3.srPlacePlates;
  const bx = (a, w = 48, h = 44, up = 12, down = -12) => ({ l: a.x - w / 2, r: a.x + w / 2, t: a.y - up - h, b: a.y + down });
  const hit = (a, b) => Math.min(a.r, b.r) > Math.max(a.l, b.l) && Math.min(a.b, b.b) > Math.max(a.t, b.t);
  const pairsClear = o => { const v = Object.values(o).map(a => bx(a)); for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (hit(v[i], v[j])) return false; return true; };
  // Four lines drawn from the tank outward: every path starts at the same point (the pileup Damian saw).
  const fan = [124, 96, 64, 30].map((deg, i) => { const a = deg * Math.PI / 180; return { id: 'ABCD'[i], w: 48, h: 44, pts: [0, 1, 2, 3, 4].map(k => [200 + Math.cos(a) * k * 40, 300 - Math.sin(a) * k * 40]) }; });
  const f = PP(fan, { bounds: { w: 390, h: 700 } });
  eq('plates: every line gets one', Object.keys(f).sort(), ['A', 'B', 'C', 'D']);
  eq('plates: tank-first lines no longer stack', pairsClear(f), true);
  eq('plates: tank-first lines all clear', Object.values(f).every(a => a.clear), true);
  eq('plates: tank-first lines use the far (free) end', Object.values(f).map(a => a.end), ['last', 'last', 'last', 'last']);
  eq('plates: the free end is tried first', Object.values(f).map(a => a.at), [0, 0, 0, 0]);
  // Lines listed far end first (built from trees, ending at the tank): unchanged, first point.
  const rev = fan.map(l => ({ ...l, pts: l.pts.slice().reverse() }));
  const r = PP(rev, { bounds: { w: 390, h: 700 } });
  eq('plates: far-first lines keep the first point', Object.values(r).map(a => [a.end, a.at]), [['first', 0], ['first', 0], ['first', 0], ['first', 0]]);
  eq('plates: far-first sits on the far end', [r.A.x, r.A.y], [rev[0].pts[0][0], rev[0].pts[0][1]].map(v => Math.round(v * 10) / 10));
  // One line alone: its first point, as before the review.
  eq('plates: a lone line sits on its first point', PP([{ id: 'A', pts: [[50, 200], [300, 200]] }], {}).A, { x: 50, y: 200, at: 0, clear: true, end: 'first', off: false });
  // A button over the free end: the plate walks inward along the line until it clears it.
  const av = PP([{ id: 'A', pts: [[40, 100], [340, 100]] }], { avoid: [{ l: 0, r: 90, t: 0, b: 140 }] }).A;
  eq('plates: walks inward past a map button', [av.clear, av.at > 0, av.x - 24 >= 90, av.y], [true, true, true, 100]);
  // Off the map edge at the free end: moves inward.
  const ed = PP([{ id: 'A', pts: [[380, 100], [100, 100]] }], { bounds: { w: 390, h: 400 } }).A;
  eq('plates: stays inside the map', [ed.clear, ed.x + 24 + 3 <= 390], [true, true]);
  // Two lines sharing both ends on the same segment: the second can't sit on the line, so it hangs beside it.
  const same = PP([{ id: 'A', pts: [[100, 200], [140, 200]] }, { id: 'B', pts: [[100, 200], [140, 200]] }], { bounds: { w: 390, h: 400 } });
  eq('plates: overlapping lines, second plate hung off the line', [same.A.off, same.B.off, same.B.clear, pairsClear(same)], [false, true, true, true]);
  // A leaking or selected line goes first and keeps its end; a fixed plate (leak ring) never leaves the line.
  const pri = PP([{ id: 'A', pts: [[100, 200], [140, 200]] }, { id: 'C', pri: 2, fixed: true, pts: [[100, 200], [140, 200]] }], { bounds: { w: 390, h: 400 } });
  eq('plates: the leaking line is placed first, on its line', [pri.C.at, pri.C.off, pri.A.off], [0, false, true]);
  // Nowhere clear: every line still gets a plate, least overlap, flagged not clear.
  const jam = PP([{ id: 'A', pts: [[20, 60]] }, { id: 'B', pts: [[20, 60]] }], { bounds: { w: 60, h: 70 } });
  eq('plates: jammed map still places every plate', [Object.keys(jam).length, jam.B.clear], [2, false]);
  eq('plates: bad points are skipped, no plate', PP([{ id: 'A', pts: [[NaN, 1], null] }], {}), {});
  // Nowhere clear near a button at the edge: hanging off the map (hidden) beats covering the button.
  const edge = PP([{ id: 'A', pts: [[190, 100]] }], { bounds: { w: 200, h: 400 }, avoid: [{ l: 150, r: 200, t: 0, b: 400 }] }).A;
  eq('plates: off the edge rather than under a button', [edge.clear, edge.off, edge.x > 200], [false, true, true]);
}

// ── UI review: structure ──
eq('sw cache bumped for the UI review', +(/sweetrun-v(\d+)/.exec(sw) || [0, 0])[1] >= 43, true);
eq('plates: the map re-places them after every zoom', /map\._rsPlace = both; map\.on\('zoomend resize', both\)/.test(src), true);
eq('plates: placement avoids the map chrome', /const SR_MAP_CHROME = '\.rs-mapt,/.test(src) && src.includes('srPlacePlates(items, { avoid'), true);
eq('counts: no "1 trees" (treesTaps is only a string now)', /rt\(L,\s*'treesTaps'/.test(src), false);
eq('counts: singular strings in both languages', ["ttTree1:'1\\u00a0tree'", "ttTap1:'1\\u00a0tap'", "ttTree1:'1\\u00a0arbre'", "ttTap1:'1\\u00a0entaille'"].every(k => src.includes(k)), true);
eq('back: the pinned copy lives in a bar with the title', /className="rs-backbar">\{link\(' rs-backfloat'\)\}/.test(src) && /\.rs-backbar \{ position: fixed; top: 0;/.test(rcss), true);
eq('back: bar lines up with the content column (16, 32, nav + 40)', /@media \(min-width: 760px\) \{ \.rs-backbar \{ padding-left: 32px;/.test(rcss) && /\.rs-backbar \{ left: var\(--rs-navw\); padding-left: 40px;/.test(rcss), true);
eq('back: one spot for the pill on photo screens too', rcss.includes('.rs-hashero .rs-phead > .rs-pushbar { margin-bottom: auto; }'), true);
eq('fields: side-by-side number fields share a row when a label wraps', rcss.includes('.rs-grid2:has(> div > label.rs-fl:first-child) { align-items: end; }'), true);
eq('rows: a long value no longer squeezes its label (key column fits its content)', /\.rs-kv \{ display: grid; grid-template-columns: fit-content\(56%\) minmax\(0, 1fr\)/.test(rcss) && /\.rs-wkv \{ display: grid; grid-template-columns: fit-content\(50%\) minmax\(0, 1fr\)/.test(rcss), true);
eq('expired: a screen\'s own primary steps down, Get a Pass stays the one solid button', src.includes("c.lic.status === 'expired' ? ' rs-locked' : ''") && rcss.includes('.rs-locked main .rs-btn:not(.rs-sheet .rs-btn)'), true);
eq('bush: credits have their own strip on a phone, chips lifted', rcss.includes('.rs-bushwrap:not(.wide) .rs-mapchips { bottom: 26px; }'), true);
eq('headings: a trailing link does not make its heading taller', rcss.includes('.rs-sec > .rs-more { margin-top: -14px; margin-bottom: -14px; }'), true);
eq('back: no loose floating pill left', /\.rs-backfloat \{/.test(rcss), false);

// Species keys read as names (the tree detail showed "sugar maple", lower case, in French too).
{
  const a = src.indexOf('const SR_SPECIES = '), b = src.indexOf('// The map\'s own chrome a line plate');
  const SP = new Function(src.slice(a, b) + '\nreturn srSpeciesName;')();
  eq('species: key in English', SP('sugar_maple', 'en'), 'Sugar maple');
  eq('species: key in French', SP('sugar_maple', 'fr'), 'Érable à sucre');
  eq('species: red maple both', [SP('red_maple', 'en'), SP('red_maple', 'fr')], ['Red maple', 'Érable rouge']);
  eq('species: his own words, capitalised', SP('yellow birch', 'fr'), 'Yellow birch');
  eq('species: underscores become spaces', SP('striped_maple', 'en'), 'Striped maple');
}

// ── Units follow-up (2026-09-28): log units, gallon settings in litres, the boil pace ──
{
  const U = new Function('ls', src.slice(a, b) + '\nreturn { srSlogInUnit, srLogsInUnit, srBatchesInUnit, srSessInUnit, srTagUnit, srUnitOf, srVolIn, srGalShown, srGalStored, srVolSteps, srBoilPace, srAutoCopy, srSyrupRate, SR_VOL_KINDS, SR_L_PER_GAL };')({ get: (_k, d) => d, set: () => true });
  const r4 = x => Math.round(x * 1e4) / 1e4;
  const sl = { sapCollected:[{ id:1, val:100 }, { id:2, val:'50' }], syrupMade:[{ id:3, val:2.5, brix:66.9 }], sapRO:[], sapEvap:[{ id:4, val:10, u:'L' }], fuelUsed:[{ id:5, val:0.7 }], boilHours:[{ id:6, val:5 }] };
  // Untagged entries are in the legacy unit; gallons shown in gallons is the same object (nothing rewritten).
  eq('log units: gallons shown in gallons is untouched (same object) when nothing is tagged otherwise', U.srSlogInUnit({ sapCollected:[{ val:1 }] }, 'GAL', 'GAL') === undefined, false);
  const same = { sapCollected:[{ val:1 }] }; eq('log units: nothing to convert returns the very same object', U.srSlogInUnit(same, 'GAL', 'GAL') === same, true);
  const inL = U.srSlogInUnit(sl, 'L', 'GAL');
  eq('log units: untagged gallons shown in litres', [r4(inL.sapCollected[0].val), inL.sapCollected[0].u, r4(inL.syrupMade[0].val)], [378.541, 'L', 9.4635]);
  eq('log units: a string value converts too', r4(inL.sapCollected[1].val), 189.2705);
  eq('log units: an entry already in litres stays as it is', inL.sapEvap[0], { id:4, val:10, u:'L' });
  eq('log units: fuel and hours are never converted', [inL.fuelUsed === sl.fuelUsed, inL.boilHours === sl.boilHours], [true, true]);
  eq('log units: other fields ride along', [inL.syrupMade[0].brix, inL.syrupMade[0].id], [66.9, 3]);
  eq('log units: the stored object is not changed', [sl.sapCollected[0].val, sl.sapCollected[0].u], [100, undefined]);
  const inG = U.srSlogInUnit(sl, 'GAL', 'GAL');
  eq('log units: a litre entry shown in gallons', r4(inG.sapEvap[0].val), r4(10 / 3.78541));
  eq('log units: switch there and back gives the same numbers', r4(U.srSlogInUnit(U.srSlogInUnit(sl, 'L', 'GAL'), 'GAL', 'GAL').sapCollected[0].val), 100);
  eq('log units: untagged entries follow a litre legacy', U.srSlogInUnit({ syrupMade:[{ val:10 }] }, 'L', 'L').syrupMade[0].val, 10);
  eq('log units: untagged litre-legacy entries shown in gallons', r4(U.srSlogInUnit({ syrupMade:[{ val:37.8541 }] }, 'GAL', 'L').syrupMade[0].val), 10);
  eq('log units: a bad value is left alone', U.srSlogInUnit({ sapCollected:[{ val:'x' }] }, 'L', 'GAL').sapCollected[0].val, 'x');
  const all = { 2026: { sapCollected:[{ val:1, u:'GAL' }] }, 2027: { sapCollected:[{ val:2, u:'L' }] } };
  const allL = U.srLogsInUnit(all, 'L', 'GAL');
  eq('log units: every season, only what needs it', [r4(allL[2026].sapCollected[0].val), allL[2027] === all[2027]], [3.7854, true]);
  eq('log units: empty logs', U.srLogsInUnit(null, 'L', 'GAL'), {});
  eq('log units: new volume entries are tagged, fuel is not', [U.srTagUnit('syrupMade', { val:1 }, 'L').u, U.srTagUnit('sapRO', { val:1 }, 'GAL').u, 'u' in U.srTagUnit('fuelUsed', { val:1 }, 'L')], ['L', 'GAL', false]);
  const ac = U.srAutoCopy({}, 2027, { date:'2027-03-16', val:900, u:'L' }, { ro:true, evap:true }, 7);
  eq('log units: the auto-copy keeps the sap entry\'s unit', [ac[2027].sapRO[0].u, ac[2027].sapEvap[0].u], ['L', 'L']);
  eq('log units: an untagged sap entry copies untagged (as before)', 'u' in U.srAutoCopy({}, 2027, { date:'d', val:1 }, { ro:true }, 7)[2027].sapRO[0], false);
  const bt = U.srBatchesInUnit([{ id:1, sapIn:'1240', syrupOut:'31.5' }, { id:2, sapIn:'100', syrupOut:'', u:'L' }], 'L', 'GAL');
  eq('batches: shown in litres', [bt[0].sapIn, bt[0].syrupOut, bt[0].u, bt[1].sapIn], [4693.91, 119.24, 'L', '100']);
  eq('batches: nothing stored is a list', U.srBatchesInUnit(null, 'L', 'GAL'), []);
  const ss = { start:1, sap:180, syrup:1.5, u:'GAL', readings:[{ t:2, tempF:218, draw:0.8 }, { t:3, tempF:219 }] };
  const sL = U.srSessInUnit(ss, 'L');
  eq('boil session: converted once when the unit changes mid-boil', [sL.sap, sL.syrup, sL.readings[0].draw, sL.readings[1].draw, sL.u], [681.37, 5.68, 3.03, undefined, 'L']);
  eq('boil session: same unit, or untagged with no legacy given, is untouched', [U.srSessInUnit(ss, 'GAL') === ss, U.srSessInUnit({ start:1, sap:5 }, 'L').sap], [true, 5]);
  eq('boil session: an untagged session follows the legacy unit', [U.srSessInUnit({ start:1, sap:180, syrup:1.5 }, 'L', 'GAL').syrup, U.srSessInUnit({ start:1, sap:5 }, 'L', 'L').sap], [5.68, 5]);
  // Gallon settings (tank, pump rate, evaporator rate) shown in the user's unit, stored in gallons.
  eq('gallon settings: a 300 gal tank reads 1136 L, a 28 gpm pump 106 L/min', [U.srGalShown(300, 'L'), U.srGalShown(28, 'L')], [1136, 106]);
  eq('gallon settings: stored back in gallons', r4(U.srGalStored(1136, 'L')), r4(1136 / 3.78541));
  eq('gallon settings: gallons are the identity both ways', [U.srGalShown(300, 'GAL'), U.srGalStored(300, 'GAL')], [300, 300]);
  eq('gallon settings: litre steps', [U.srVolSteps([-50, 50], [-200, 200], 'L'), U.srVolSteps([-50, 50], [-200, 200], 'GAL')], [[-200, 200], [-50, 50]]);
  // The boil pair: drawn is real; expected is the pan's rate since the start. Damian's session:
  // 1 h 42 min on a 2x4 (16 gal/h) at 2.0 Brix, two draws of 0.8 and 0.7.
  const expd = U.srSyrupRate(16, 2) * 1.7;
  eq('boil pace: the expected number is the pan rate times the time (0.64 gal)', Math.round(expd * 100) / 100, 0.64);
  const P = U.srBoilPace(expd, 1.5);
  eq('boil pace: 1.5 drawn against 0.64 expected reads ahead by 0.86', [P.kind, Math.round(P.d * 100) / 100], ['ahead', 0.86]);
  eq('boil pace: nothing drawn', U.srBoilPace(0.64, 0).kind, 'none');
  eq('boil pace: within a fifth is on pace', [U.srBoilPace(1, 0.85).kind, U.srBoilPace(1, 1.19).kind, U.srBoilPace(0.2, 0.28).kind], ['on', 'on', 'on']);
  eq('boil pace: behind', [U.srBoilPace(2, 1).kind, U.srBoilPace(2, 1).d], ['behind', 1]);
  eq('boil pace: tolerance in litres', U.srBoilPace(1, 1.35, 0.4).kind, 'on');
}
{ // Storage side: the legacy unit is taken once and read back; a failed write falls back to the setting.
  const s0 = src.indexOf('// The unit untagged log entries were written in'), st0 = src.slice(s0, src.indexOf('\n', src.indexOf('function srReadLogs', s0)) + 1);
  const mkLs = init => { const m = { ...init }; return { m, get: (k, d) => k in m ? m[k] : d, set: (k, v) => { m[k] = v; return true; } }; };
  const run = (store, units) => new Function('ls', src.slice(a, b) + st0 + '\nsrSnapshotLegacyUnits(); return { legacy: srLegacyUnits(), logs: srReadLogs(' + (units ? `'${units}'` : '') + ') };')(store);
  const g = mkLs({ sg_units:'GAL', sg_logs2:{ 2027:{ syrupMade:[{ val:10 }] } } });
  const r1 = run(g, 'L');
  eq('legacy unit: taken from the setting the first time', [g.m.sg_units_legacy, r1.legacy], ['GAL', 'GAL']);
  eq('legacy unit: untagged gallons read in litres after the switch', Math.round(r1.logs[2027].syrupMade[0].val * 100) / 100, 37.85);
  g.m.sg_units = 'L'; run(g);
  eq('legacy unit: never overwritten by a later switch', g.m.sg_units_legacy, 'GAL');
  const f = { get: (k, d) => k === 'sg_units' ? 'L' : d, set: () => false };
  eq('legacy unit: if it cannot be stored, untagged entries follow the setting (as before)', run(f).legacy, 'L');
}
eq('units: Equipment pump rate and tank size in the user\'s unit, stored in gallons', /useRsGalPref\('sg_pump_gpm', 28, c\.units\)/.test(src) && /useRsGalPref\('sg_pump_tank', 300, c\.units\)/.test(src) && src.includes("unit={c.units === 'L' ? 'L/min' : 'gpm'}"), true);
eq('units: Recap RO evaporator rate in the user\'s unit', /useRsGalPref\('sg_recap_evap', 50, c\.units\)/.test(src) && src.includes("unit={u + '/h'} label={rt(L,'roEvapRate')}"), true);
eq('units: no hard gal left in the Equipment and RO notes', ["haulNote:'Hauling at 90% of the tank, {g} {u}.'", "flowDrop:'line and lift cut flow to {g} {u}'", "roInputsSub:'{e} {u}/h,", 'boils about {r} {u} an hour a square foot'].every(k => src.includes(k)), true);
eq('log units: every writer tags (log sheet, edit, boil, batch, import), the legacy unit is taken before mount', [
  src.includes("srTagUnit(kind, srMakeEntry(kind,"), /SR_VOL_KINDS\.includes\(kind\) \? \{ u: c\.units === 'L' \? 'L' : 'GAL' \} : \{\}/.test(src),
  src.includes("val: sess.syrup, note, ...uu,"), src.includes("{ ...srMakeBatch(f, Date.now()), u: c.units === 'L' ? 'L' : 'GAL' }"), src.includes('srTagUnit(k, e, c.units)'),
  /srSnapshotLegacyUnits\(\);[^\n]*\n\s*ReactDOM\.createRoot/.test(src)], [true, true, true, true, true, true]);
eq('log units: every reader converts (no screen reads sg_logs2 raw for volumes)', (src.slice(src.indexOf('// ─── Shared UI')).match(/ls\.get\('sg_logs2'/g) || []).length, 7);   // the 7 left are writers' read-modify-writes, the import dedupe and a date-only count
eq('log units: a restore without the legacy unit takes the backup\'s own', src.includes("if (!pending.entries.some(([k]) => k === 'sg_units_legacy'))"), true);
eq('log units: the legacy key saves during an expired trial', /SR_LOCK_ALLOW = \[[^\]]*'sg_units_legacy'/.test(src), true);
eq('log units: batch delete writes the stored list, not the converted view', src.includes("ls.set('sg_batches', raw.filter((_, j) => j !== i))"), true);
eq('boil: jugs are the syrup drawn; the pace sentence sits under them', src.includes("<RsJugs gal={drawn} label={rt(L,'jugsAria', { v: fmt(drawn, 1), u })} />") && src.includes("pace.kind === 'none' ? 'bpNone'"), true);
eq('boil: Season card says drawn beside expected', src.includes("rt(L,'nEstBoilD', { d: fmt(drawn, 1), u })"), true);
eq('sw cache bumped for the units follow-up', +(/sweetrun-v(\d+)/.exec(sw) || [0, 0])[1] >= 44, true);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

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

// ── Token law: no hex colour literals in Run Sheet code (tokens.css is the only home) ──
const { readdirSync } = await import('node:fs');
const rsFiles = readdirSync(join(ROOT, 'app', 'src')).filter(f => /^(3[1-9]|6\d|8\d|9[1-8])-.*\.jsx$/.test(f) && f !== '90-shell-classic.jsx');
for (const f of [...rsFiles.map(f => join('app', 'src', f)), join('app', 'runsheet.css')]) {
  const code = readFileSync(join(ROOT, f), 'utf8').split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');
  const hits = code.match(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g) || [];
  eq(`no hex literals in ${f}`, hits, []);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

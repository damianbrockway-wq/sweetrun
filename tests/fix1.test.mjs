#!/usr/bin/env node
// Fix pass 1 (2027 season test, items 1 to 22): the one-source functions in the
// formula band (27-rs-truth.jsx and the changed calculators), evaluated from the
// shipped source like the other test files. Run: npm test.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(process.env.SWEETRUN_SRC || join(ROOT, 'app', 'src', '.bundle.jsx'), 'utf8');
let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.error(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
}
const a = src.indexOf('// ─── Formulas'), b = src.indexOf('// ─── Shared UI', a);
const parseNum = src.match(/function srParseNum\(raw\) \{[\s\S]*?\n\}/)[0];
const F = new Function('ls', 'let SR_NUM_LOC = "en-US";\n' + src.slice(a, b) + '\n' + parseNum +
  '\nreturn { srTaps, srPanIdxOf, srEvapRateOf, srFuelCostOf, srFuelDefaultCost, srDxVacOf, srRoAdviceFits, srBrixSource, srBoilExpected,' +
  ' srTonightIsoOf, srTankFull, srSeasonOf, srSeasonWindow, srInSeason, srRunState, srGradeMix, srFuelState, srCheckNum, srSapDayCheck, srDpOf,' +
  ' srCsvRows, srCsvNum, srParseSapCsv, srImportAdditions, srImportBySeason, srMergeImport, dedupeImport, srMergeBoundary, srGeoOk, srRestorePlan,' +
  ' SR_RESTORE_KEEP, srSlogDated, srRecapFacts, srYieldGap, srRoSavings, srDiagnose, srStageOf, srRoPlan, srWizardPlan, SR_WIZ_PANS, PAN_SIZES,' +
  ' PAN_ORDER, CUSTOM_PAN_IDX, YIELD_MODELS, FUELS, syrupY, rule86, srSyrupRate, srPumpJobs, srJobs, SR_BOIL_LONG_H };')({ get: (_k, d) => d, set: () => true });
const r = (x, d = 2) => +(+x).toFixed(d);

// ── 1 · one tap count ──
const pins = [{ type: 'tree', taps: 2 }, { type: 'tree', taps: 1 }, { type: 'tank' }, { type: 'tree', taps: '3' }];
eq('taps: plan wins', F.srTaps({ wizard: { recTaps: 640 }, pins, trees: 50 }), { taps: 640, src: 'plan', planned: 640, mapped: 6, mappedTrees: 3, trees: 50, differ: true });
eq('taps: map when no plan', F.srTaps({ wizard: {}, pins, trees: 50 }).taps, 6);
eq('taps: map src', F.srTaps({ wizard: {}, pins, trees: 50 }).src, 'map');
eq('taps: trees when nothing mapped', F.srTaps({ wizard: {}, pins: [{ type: 'tree', taps: 0 }], trees: 45 }), { taps: 45, src: 'trees', planned: null, mapped: 0, mappedTrees: 1, trees: 45, differ: false });
eq('taps: plan equal to map is not a disagreement', F.srTaps({ wizard: { recTaps: 6 }, pins, trees: 1 }).differ, false);
eq('taps: B (15 trees, 2 a tree planned 30, 45 mapped) is the plan, not the trees', F.srTaps({ wizard: { recTaps: 30, trees: 15 }, pins: Array.from({ length: 45 }, () => ({ type: 'tree', taps: 1 })), trees: 15 }).taps, 30);
eq('taps: zero plan falls through', F.srTaps({ wizard: { recTaps: 0 }, pins: [], trees: 12 }).taps, 12);

// ── 2 · setup choices ──
eq('pan: 2x3 resolves', F.PAN_SIZES[F.srPanIdxOf('2x3')].rate, 10);
eq('pan: 2x8 resolves to 35 GPH, not the 2x4', F.PAN_SIZES[F.srPanIdxOf('2x8')].rate, 35);
eq('pan: 4x14 resolves to 163 GPH', F.PAN_SIZES[F.srPanIdxOf('4x14')].rate, 163);
eq('pan: ×-style key', F.srPanIdxOf('4×14'), F.srPanIdxOf('4x14'));
eq('pan: unknown is null, never the 2x4', F.srPanIdxOf('9x99'), null);
eq('pan: stored indexes keep their pan', [F.PAN_SIZES[0].rate, F.PAN_SIZES[6].rate, F.CUSTOM_PAN_IDX, F.PAN_SIZES[8].area], [16, 163, 8, 0]);
eq('pan: picker order smallest first, custom last', [F.PAN_SIZES[F.PAN_ORDER[0]].rate, F.PAN_ORDER[F.PAN_ORDER.length - 1]], [10, 8]);
eq('pan: every setup size is in the pan table at its rate', Object.entries(F.SR_WIZ_PANS).every(([k, v]) => F.PAN_SIZES[F.srPanIdxOf(k)].rate === v), true);
eq('evap: setup pan when none picked', F.srEvapRateOf({ panIdx: null, wizardPan: '4x14' }).rate, 163);
eq('evap: picked pan wins over setup', F.srEvapRateOf({ panIdx: 2, wizardPan: '4x14' }).rate, 35);
eq('evap: typed rate wins and is kept', F.srEvapRateOf({ customRate: 48, panIdx: 2, wizardPan: '4x14' }), { rate: 48, panIdx: 2, src: 'typed', er: F.srEvapRateOf({ customRate: 48, panIdx: 2 }).er });
eq('fuel: oil never $300 a gallon', [F.srFuelCostOf('Oil (gallon)', 300), F.srFuelCostOf('Oil (gallon)', null), F.srFuelCostOf('Propane (gallon)', '')], [3.75, 3.75, 2.75]);
eq('fuel: firewood keeps 300 and a typed price', [F.srFuelCostOf('Firewood (cord)', 300), F.srFuelCostOf('Firewood (cord)', 250), F.srFuelCostOf('Oil (gallon)', 4.1)], [300, 250, 4.1]);
eq('wizard: 4x14 sessions use 163 GPH', F.srWizardPlan({ treeCount: 100, systemType: 'vacuum', hasEvap: true, panSize: '4x14' }).evapGph, 163);

// ── 3 · Brix ──
const slogB = { sapCollected: [{ date: '2027-03-01', val: 100, brix: 2.0 }, { date: '2027-03-05', val: 300, brix: 2.4 }, { date: '2027-03-05', val: 100, brix: 2.0 }, { date: '2027-03-06', val: 50 }] };
const bl = [{ date: '2027-03-03', brix: 1.8 }, { date: '2027-03-05', brix: 3.0 }, { date: '2026-03-05', brix: 4.0 }];
const bs = F.srBrixSource({ slog: slogB, brixlog: bl, season: 2027, setting: 2 });
eq('brix: latest day is the weighted sap Brix', r(bs.brix, 2), 2.3);
eq('brix: from sap entries', [bs.from, bs.date], ['sap', '2027-03-05']);
eq('brix: season weighted by volume', r(bs.season, 3), r((100 * 2 + 300 * 2.4 + 100 * 2) / 500, 3));
eq('brix: series a day, tree day included, other season left out', bs.series.map(x => [x.date, r(x.brix, 2), x.from]), [['2027-03-01', 2, 'sap'], ['2027-03-03', 1.8, 'tree'], ['2027-03-05', 2.3, 'sap']]);
eq('brix: tree readings alone', r(F.srBrixSource({ slog: {}, brixlog: bl, season: 2027, setting: 2 }).season, 2), 2.4);
eq('brix: nothing measured is the setting', [F.srBrixSource({ slog: {}, brixlog: [], season: 2027, setting: 2.2 }).brix, F.srBrixSource({ slog: {}, brixlog: [], season: 2027, setting: 2.2 }).from], [2.2, 'setting']);

// ── 4 · Diagnose follows the setup ──
eq('dx vac from setup', [F.srDxVacOf({ systemType: 'vacuum' }), F.srDxVacOf({ systemType: 'gravity' }), F.srDxVacOf({})], ['high', 'gravity', 'gravity']);
eq('ro advice: not for buckets or small bushes', [F.srRoAdviceFits(45, { collectionType: 'buckets' }), F.srRoAdviceFits(120, {}), F.srRoAdviceFits(640, { collectionType: 'mainline' })], [false, false, true]);
const dxB = F.srDiagnose({ slog: { sapCollected: [{ val: 800 }], syrupMade: [{ val: 18 }], sapEvap: [{ val: 800 }] }, trees: 45, units: 'GAL', sapBrix: 2, syrupPrice: 40, woodCost: 250, laborRate: 0, vacLevel: 'gravity', roFits: false });
eq('dx: bucket producer gets no RO finding and no labor finding at rate 0', dxB.some(f => /^ro|^labor/.test(f.id)), false);

// ── 5 · boil expected ──
const e1 = F.srBoilExpected({ evapGph: 35, hrs: 2, sapInGal: 0, sapBrix: 2, concBrix: 8, ro: true });
eq('boil: RO feed uses concentrate Brix', [e1.feedBrix, r(e1.gal, 3)], [8, r(F.srSyrupRate(35, 8) * 2, 3)]);
eq('boil: raw sap without RO', F.srBoilExpected({ evapGph: 35, hrs: 2, sapBrix: 2, concBrix: 8, ro: false }).feedBrix, 2);
eq('boil: sap in counted wins over the pan rate', r(F.srBoilExpected({ evapGph: 35, hrs: 2, sapInGal: 300, sapBrix: 2, concBrix: 8, ro: true }).gal, 3), r(F.syrupY(300, 8), 3));

// ── 6 · tank stops below freezing ──
const T0 = Date.UTC(2027, 2, 9, 3, 0);   // a night
const hrsCold = Array.from({ length: 12 }, (_, i) => ({ ts: T0 + i * 3600000, temp: i < 8 ? 23 : 36 }));
const tf = F.srTankFull({ levelGal: 800, capGal: 1000, fillGalH: 50, now: T0, hourly: hrsCold });
eq('tank: paused at 23°F', tf.paused, true);
eq('tank: fills only after the thaw (8 h frozen + 4 h)', tf.atMs, T0 + 12 * 3600000);
eq('tank: no fill in the forecast window is null', F.srTankFull({ levelGal: 100, capGal: 1000, fillGalH: 50, now: T0, hourly: hrsCold.map(h => ({ ...h, temp: 20 })) }).atMs, null);
eq('tank: without forecast a freezing reading pauses', F.srTankFull({ levelGal: 100, capGal: 1000, fillGalH: 50, now: T0, tempF: 25 }).atMs, null);
eq('ro plan: freezing pause is "later", never a 2 am start', F.srRoPlan({ levelGal: 800, capGal: 1000, fillGalH: 50, roGph: 100, fullH: null, paused: true }).call, 'later');

// ── 7 · tonight ──
eq('tonight before noon is tomorrow', F.srTonightIsoOf('2027-03-10', 9 * 60), '2027-03-11');
eq('tonight in the evening is tomorrow', F.srTonightIsoOf('2027-03-10', 21 * 60), '2027-03-11');
eq('tonight at 3 am is today', F.srTonightIsoOf('2027-03-10', 3 * 60), '2027-03-10');

// ── 8 · RO against a straight boil, in his fuel ──
eq('ro savings oil in gallons of oil', r(F.srRoSavings(10000, 6000, 163, 10, false, 8, 2).savedFuel, 0), 450);
eq('ro savings withheld when RO > sap (the 25,992% case)', F.srRoSavings(100, 26000, 50, 1000, false, 8, 2), null);

// ── 9 · yield gap over ──
const gOver = F.srYieldGap(5000, 60, 100, 2, F.YIELD_MODELS.gravity, 40);
eq('gap: over by the real amount, not +0', [gOver.gapMid, gOver.over], [0, 15]);
eq('gap: under the range has no over', F.srYieldGap(1000, 20, 100, 2, F.YIELD_MODELS.gravity, 40).over, 0);

// ── 10 · grades ──
const gm = F.srGradeMix([{ val: 10, grade: 'Amber Rich' }, { val: 6, grade: '—' }, { val: 4 }], [{ date: '2027-03-02', syrupOut: '5', grade: 'golden' }, { date: '2027-03-03', syrupOut: '15', grade: 'dark' }, { date: '2026-03-03', syrupOut: '99', grade: 'vdark' }], 2027);
eq('grades: entry grades plus batch grades for ungraded syrup', Object.fromEntries(Object.entries(gm.grades).map(([k, v]) => [k, r(v, 2)])), { 'Amber Rich': 10, 'Golden Delicate': 2.5, 'Dark Robust': 7.5 });
eq('grades: batches alone when no syrup entries', Object.keys(F.srGradeMix([], [{ date: '2027-03-02', syrupOut: '5', grade: 'golden' }], 2027).grades), ['Golden Delicate']);
eq('grades: none stays none without batches', F.srGradeMix([{ val: 3 }], [], 2027).grades, { none: 3 });

// ── 11 · seasons follow the date ──
eq('season of date', [F.srSeasonOf('2027-03-10'), F.srSeasonOf('2026-12-20'), F.srSeasonOf('2027-01-03'), F.srSeasonOf('2027-06-30'), F.srSeasonOf('2027-07-01')], [2027, 2027, 2027, 2027, 2028]);
eq('season window', F.srSeasonWindow(2028), { start: '2027-07-01', end: '2028-06-30' });
eq('stage: Jan in a Dec-Jan season is not Recap', F.srStageOf({ todayIso: '2027-01-11', season: 2027, slog: { sapCollected: [{ date: '2026-12-20', val: 800 }, { date: '2027-01-10', val: 900 }] } }), 'collect');
eq('stage: a closed season is Recap', F.srStageOf({ todayIso: '2027-03-20', season: 2027, slog: { sapCollected: [{ date: '2027-03-19', val: 9 }] }, closed: true }), 'recap');
eq('stage: last season seen next year is Recap', F.srStageOf({ todayIso: '2028-02-20', season: 2027, slog: {} }), 'recap');
const runS = { sapCollected: [{ date: '2027-02-25', val: 5 }, { date: '2027-04-06', val: 5 }] };
eq('run: day N while running', F.srRunState({ slog: runS, todayIso: '2027-04-07' }).day, 42);
eq('run: late April is over, not "Day 55"', [F.srRunState({ slog: runS, todayIso: '2027-04-21' }).kind, F.srRunState({ slog: runS, todayIso: '2027-04-21' }).length], ['over', 41]);
eq('run: closed is over', F.srRunState({ slog: runS, todayIso: '2027-04-07', closed: true }).kind, 'over');
eq('run: never Day 361 in the next season', F.srRunState({ slog: runS, todayIso: '2028-02-20' }).kind, 'over');

// ── 13 · one fuel verdict ──
eq('fuel state: 8.5 h by day is ok (was "low on fuel")', F.srFuelState({ hoursLeft: 8.5 }, 9 * 60, {}), 'ok');
eq('fuel state: under 4 h is low', F.srFuelState({ hoursLeft: 3 }, 9 * 60, {}), 'low');
eq('fuel state: dry overnight after 5 pm', F.srFuelState({ hoursLeft: 9 }, 20 * 60, {}), 'night');
eq('jobs: service overdue shows', F.srPumpJobs({ minutes: 600, now: 0, ops: { pumps: [{ id: 'g', name: 'G', status: 'stopped', svcLeftH: -5, serviceEveryH: 100 }] } }).map(j => j.id), ['svc-g']);

// ── 14 · numbers ──
eq('num: out of range is refused, not clamped', [F.srCheckNum('12', 0, 10).kind, F.srCheckNum('1500', 0, 1000).kind, F.srCheckNum('1000000000', 0, 1e7).kind], ['high', 'high', 'high']);
eq('num: -50 and 1e9 are refused, not 50 and 19', [F.srCheckNum('-50', 0, 100).kind, F.srCheckNum('1e9', 0, 1e12).kind, F.srCheckNum('abc', 0, 9).kind], ['bad', 'bad', 'bad']);
eq('num: good values pass', [F.srCheckNum('2.5', 0, 10).n, F.srCheckNum('1,500', 0, 1e7).n, F.srCheckNum('', 0, 1).kind], [2.5, 1500, 'empty']);
eq('sap day: 950 L on 45 taps is asked about', F.srSapDayCheck(950 / 3.78541, 45).high, true);
eq('sap day: 1,000 gal on 640 taps is fine', F.srSapDayCheck(1000, 640).high, false);

// ── 15 · far dates ──
const far = { sapCollected: [{ date: '2027-03-01', val: 10 }, { date: '1999-01-01', val: 20 }, { date: '2031-07-04', val: 30 }] };
eq('dated: far entries counted out of the dates', [F.srSlogDated(far, 2027).outside, F.srSlogDated(far, 2027).slog.sapCollected.length], [2, 1]);
const rf = F.srRecapFacts(far, {}, [], 'GAL', 2027);
eq('recap: season length ignores far dates (was 11,873 days)', [rf.days, rf.sapGal], [1, 60]);

// ── 17 · save label decimals ──
eq('save label keeps what he typed', [F.srDpOf('1.5', 0), F.srDpOf(1.5, 0), F.srDpOf('2', 1), F.srDpOf('0.125', 0)], [1, 1, 1, 2]);

// ── 18 · CSV ──
eq('csv: quoted thousands stay one number', F.srCsvRows('date,sap\n2027-03-19,"1,450"\n'), [['date', 'sap'], ['2027-03-19', '1,450']]);
const q = F.srParseSapCsv('date,sap_gallons,syrup_gallons\n2027-03-19,"1,450",33.5\n');
eq('csv: "1,450" is 1450', [q.totalSap, q.totalSyrup], [1450, 33.5]);
const sp = F.srParseSapCsv('Date,Sap (gal),Syrup produced (gal)\n2027-03-17,1200,28\n2027-03-18,900,21\n');
eq('csv: "Syrup produced" is syrup, not RO', [sp.totalSyrup, sp.totalRO, sp.totalSap], [49, 0, 2100]);
eq('csv: no date column is refused (was "Day 1")', F.srParseSapCsv('sap,syrup\n500,11\n').error, 'impNoDate');
const own = F.srParseSapCsv('"Type","Date","Value","Unit","Note"\n"Sap Collected","2027-02-18","2100","gal",""\n"Syrup Made","2027-02-18","48.8","gal","x"\n"Sève récoltée","2027-03-03","30","L",""\n"Hours Boiling","2027-02-18","4.5","hr",""\n');
eq('csv: SweetRun export reads back in', own.entries.map(e => [e.kind, e.val, e.u]), [['sapCollected', 2100, 'GAL'], ['syrupMade', 48.8, 'GAL'], ['sapCollected', 30, 'L'], ['boilHours', 4.5, null]]);
const ad = F.srImportAdditions(own, 'generic');
eq('csv: hours come in too, with the unit', [ad.boilHours.length, ad.sapCollected[1].u], [1, 'L']);
eq('csv: rows file into their own season', Object.keys(F.srImportBySeason({ sapCollected: [{ date: '2026-12-20', val: 1 }, { date: '2027-08-01', val: 1 }] }, 2027)), ['2027', '2028']);
eq('csv: dedupe across date formats', F.dedupeImport({ sapCollected: [{ date: '3/1/2027', val: 100 }] }, { sapCollected: [{ date: '2027-03-01', val: 100 }] }).addedCount, 0);
eq('csv: bad dates are counted, not stored', F.srParseSapCsv('date,sap\nfoo,100\n2027-03-01,50\n').badDates, 1);

// ── 19 · boundary ──
const poly = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'Home lot' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] } }] };
const lines = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'E' }, geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } }] };
const mg = F.srMergeBoundary(poly, lines);
eq('kml: lines only keep the boundary', [mg.gj.features.map(f => f.geometry.type), mg.replaces], [['Polygon', 'LineString'], false]);
eq('kml: a new boundary asks first', F.srMergeBoundary(poly, poly).replaces, true);
eq('kml: impossible coordinates dropped', [F.srGeoOk([-69.6, 44.5]), F.srGeoOk([999, 999]), F.srGeoOk([-69.6, 95])], [true, false, false]);

// ── 20 · restore ──
const plan = F.srRestorePlan(['sg_logs2', 'sg_lines_pins', 'sg_license', 'sg_lang', 'sg_brixlog', 'other'], [['sg_logs2', '{}'], ['sg_license', '"old"'], ['sg_trees', '50'], ['sg_lang', '"fr"']]);
eq('restore: keys the backup lacks are removed', plan.remove.sort(), ['sg_brixlog', 'sg_lines_pins']);
eq('restore: license and language stay from this device', plan.keep, ['sg_lang', 'sg_license']);
eq('restore: backup keys written', plan.set.map(x => x[0]).sort(), ['sg_logs2', 'sg_trees']);
eq('restore: corrupt JSON is caught', F.srRestorePlan([], [['sg_logs2', '{not json']]).bad, ['sg_logs2']);
eq('restore: a kept key the device lacks comes from the backup', F.srRestorePlan([], [['sg_license', '"k"']]).set.map(x => x[0]), ['sg_license']);

// ── 16 ──
eq('long boil threshold', F.SR_BOIL_LONG_H, 16);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);

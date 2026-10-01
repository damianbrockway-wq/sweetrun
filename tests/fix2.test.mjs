#!/usr/bin/env node
// Fix pass 2 (2027 season test, items 23 to 35, the P2 list, and the license carry-over).
// Evaluated from the shipped source like the other test files. Run: npm test.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { webcrypto } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(process.env.SWEETRUN_SRC || join(ROOT, 'app', 'src', '.bundle.jsx'), 'utf8');
let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.error(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
}
const tasks = [];
const test = (fn) => tasks.push(fn);

// ── Carry-over · license keys on browsers without WebCrypto Ed25519 ──
test(async () => {
  const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  // A throwaway test keypair. The real signing key is never used here.
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubRaw = Buffer.from(await webcrypto.subtle.exportKey('raw', kp.publicKey)).toString('base64');
  const mint = async (payload) => {
    const p = b64u(new TextEncoder().encode(JSON.stringify(payload)));
    const sig = await webcrypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(p));
    return p + '.' + b64u(sig);
  };
  const good = await mint({ e: 'test@example.com', p: 'season', i: '2027-01-01', x: '2099-12-31' });
  const other = await mint({ e: 'other@example.com', p: 'season', i: '2027-01-01', x: '2099-12-31' });
  // Forged: the other key's signature on a payload it never signed.
  const forged = b64u(new TextEncoder().encode(JSON.stringify({ e: 'thief@example.com', p: 'owner', i: '2027-01-01', x: '2099-12-31' }))) + '.' + other.split('.')[1];
  const zeros = good.split('.')[0] + '.' + b64u(new Uint8Array(64));
  const expired = await mint({ e: 'test@example.com', p: 'season', i: '2020-01-01', x: '2020-12-31' });

  const a = src.indexOf('// ─── License & Season Trial'), b = src.indexOf('// ─── Feature Flags', a);
  const v0 = src.indexOf('// ─── Vendored: @noble/ed25519'), v1 = src.indexOf('return { verifyAsync };\n})();', v0) + 30;
  const lic = src.slice(a, b).replace(/const LICENSE_PUBKEY = '[^']+';/, `const LICENSE_PUBKEY = '${pubRaw}';`);
  const make = (cryptoObj, api = '', fetchFn = () => { throw new Error('no network'); }) =>
    new Function('crypto', 'fetch', 'ls', 'globalThis', lic.replace("const LICENSE_API = '';", `const LICENSE_API = '${api}';`) + '\n' + src.slice(v0, v1) + '\nreturn { verifyLicense };')(cryptoObj, fetchFn, { get: (_k, d) => d }, { crypto: cryptoObj });
  const full = make(webcrypto);
  // Safari 16: SHA-512 works, Ed25519 import throws.
  const noEd = { getRandomValues: x => webcrypto.getRandomValues(x), subtle: {
    digest: (...x) => webcrypto.subtle.digest(...x),
    importKey: async () => { const e = new Error('Algorithm: Unrecognized name'); e.name = 'NotSupportedError'; throw e; },
    verify: async () => { throw new Error('unreachable'); } } };
  // An engine whose import works but verify throws.
  const verifyThrows = { subtle: { digest: (...x) => webcrypto.subtle.digest(...x), importKey: async () => ({}), verify: async () => { throw new TypeError('bad'); } } };
  const noCrypto = { subtle: undefined };
  const fbk = make(noEd), fbv = make(verifyThrows), none = make(noCrypto);

  eq('license: genuine key, WebCrypto', (await full.verifyLicense(good)).e, 'test@example.com');
  eq('license: forged key refused, WebCrypto', await full.verifyLicense(forged), null);
  eq('license: genuine key accepted without Ed25519 (vendored verifier)', (await fbk.verifyLicense(good)).e, 'test@example.com');
  eq('license: forged key refused without Ed25519', await fbk.verifyLicense(forged), null);
  eq('license: all-zero signature refused without Ed25519', await fbk.verifyLicense(zeros), null);
  eq('license: genuine key accepted when verify throws', (await fbv.verifyLicense(good)).e, 'test@example.com');
  eq('license: forged key refused when verify throws', await fbv.verifyLicense(forged), null);
  eq('license: expired genuine key reads as expired on the fallback', (await fbk.verifyLicense(expired)).expired, true);
  eq('license: no SHA-512 at all and no Worker is unverifiable, never accepted', await none.verifyLicense(good), { unverifiable: true });
  eq('license: no SHA-512, Worker says no', await make(noCrypto, 'https://w', async () => ({ ok: true, json: async () => ({ ok: false }) })).verifyLicense(forged), null);
  eq('license: no SHA-512, Worker offline', await make(noCrypto, 'https://w', async () => { throw new Error('offline'); }).verifyLicense(good), { unverifiable: true, offline: true });
  eq('license: garbage refused', [await fbk.verifyLicense('abc'), await fbk.verifyLicense('a.b')], [null, null]);

  // The bundled copy is the pinned npm file, verbatim.
  const vend = readFileSync(join(ROOT, 'vendor/noble-ed25519-2.3.0/index.js'), 'utf8');
  const inner = src.slice(src.indexOf('// >>> noble-ed25519 2.3.0\n') + 27, src.indexOf('\n// <<< noble-ed25519 2.3.0'));
  eq('vendor: wrapped body is the npm file minus its export line', inner, vend.split('\n').filter(l => !l.startsWith('export {')).join('\n').replace(/\n+$/, ''));
});

// ── The formula band (27 and 28), as fix1.test.mjs loads it ──
const fa = src.indexOf('// ─── Formulas'), fb = src.indexOf('// ─── Shared UI', fa);
const parseNum = src.match(/function srParseNum\(raw\) \{[\s\S]*?\n\}/)[0];
const F = new Function('ls', 'let SR_NUM_LOC = "en-US";\n' + src.slice(fa, fb) + '\n' + parseNum +
  '\nreturn { srTrialOf, srSapDatesOf, srTrialChipOf, srOpProfileOf, srFreezeAdviceOf, srMetricOf, srFtoC, srMetricText, srRunDays, srLogDateRange, srLogDateOk,' +
  ' srNextMainlineId, srMainlineDeleteOf, srMainlineDelete, srBackupEntries, srRingOf, srJobs, srIsoAdd, srDayClass, srInToCm, srCmToIn, srMphToKmh, srRoConcOf, srTaskHidden, srSlogInUnit, srPlacePlates, srParseSapCsv };')({ get: (_k, d) => d, set: () => true });
const r = (x, d = 2) => +(+x).toFixed(d);
const at = (iso, h = 12) => new Date(iso + 'T' + String(h).padStart(2, '0') + ':00:00').getTime();

// ── 23 · trial ──
{
  // A started Feb 1: the 14 days end Feb 15; in March the sap days are the limit.
  const t0 = F.srTrialOf({ start: '2027-02-01', now: at('2027-02-10'), todayIso: '2027-02-10', sapDates: [] });
  eq('trial: inside the 14 days counts days', [t0.mode, t0.daysLeft, t0.expired], ['days', 5, false]);
  const t1 = F.srTrialOf({ start: '2027-02-01', now: at('2027-03-05'), todayIso: '2027-03-05', sapDates: ['2027-03-01'] });
  eq('trial: past the date, sap days are the limit', [t1.mode, t1.sapLeft, t1.expired, t1.warn], ['sap', 2, false, false]);
  eq('trial: chip names sap days', F.srTrialChipOf(t1), ['chipTrialSapN', { n: 2 }]);
  const t2 = F.srTrialOf({ start: '2027-02-01', now: at('2027-03-06'), todayIso: '2027-03-06', sapDates: ['2027-03-01', '2027-03-04'] });
  eq('trial: warned before the last free sap day', [t2.sapLeft, t2.warn, F.srTrialChipOf(t2)[0]], [1, true, 'chipTrialSap1']);
  const t3 = F.srTrialOf({ start: '2027-02-01', now: at('2027-03-06', 20), todayIso: '2027-03-06', sapDates: ['2027-03-01', '2027-03-04', '2027-03-06'] });
  eq('trial: the third sap day is usable all day', [t3.expired, t3.lastFree, F.srTrialChipOf(t3)[0]], [false, true, 'chipTrialLastSap']);
  const t4 = F.srTrialOf({ start: '2027-02-01', now: at('2027-03-07', 6), todayIso: '2027-03-07', sapDates: ['2027-03-01', '2027-03-04', '2027-03-06'] });
  eq('trial: locks the morning after the third sap day', t4.expired, true);
  const t5 = F.srTrialOf({ start: '2027-02-01', now: at('2027-03-06', 20), todayIso: '2027-03-06', sapDates: ['2027-03-01', '2027-03-04', '2027-03-06', '2027-03-02'] });
  eq('trial: a back-dated fourth sap day is past the limit', t5.expired, true);
  eq('trial: last dated day warned when nothing extends it (3 sap days already)', F.srTrialOf({ start: '2027-03-01', now: at('2027-03-14', 20), todayIso: '2027-03-14', sapDates: ['2027-03-05', '2027-03-06', '2027-03-09'] }).lastDay, true);
  eq('trial: no last-day warning when the sap-day rule carries it on', F.srTrialOf({ start: '2027-03-01', now: at('2027-03-14', 20), todayIso: '2027-03-14', sapDates: ['2027-03-05'] }).lastDay, false);
  eq('trial: Oct start runs to Feb 28', F.srTrialOf({ start: '2026-10-10', now: at('2027-02-20'), todayIso: '2027-02-20', sapDates: [] }).mode, 'days');
  eq('trial: May without a pass is over', F.srTrialOf({ start: '2027-02-01', now: at('2027-05-02'), todayIso: '2027-05-02', sapDates: [] }).expired, true);
  eq('trial: never past May 1 in sap mode', F.srTrialOf({ start: '2027-02-01', now: at('2027-04-29'), todayIso: '2027-04-29', sapDates: [] }).daysLeft, 2);
  eq('trial: sap dates are distinct days with sap', F.srSapDatesOf({ sapCollected: [{ date: '2027-03-01', val: 10 }, { date: '3/1/2027', val: 5 }, { date: '2027-03-02', val: 0 }] }), ['2027-03-01']);
}

// ── 24, 35 · operation profile and freeze advice ──
{
  const bk = F.srOpProfileOf({ wizard: { collectionType: 'buckets', systemType: 'gravity' }, pumps: [], mainlines: 0, roEntries: 0 });
  eq('profile: bucket producer', [bk.simple, bk.showTubing, bk.showVacuum, bk.showPumps, bk.showRo], [true, false, false, false, false]);
  const bkLine = F.srOpProfileOf({ wizard: { collectionType: 'buckets', systemType: 'gravity' }, pumps: [], mainlines: 1, roEntries: 2 });
  eq('profile: never hides what he entered', [bkLine.showTubing, bkLine.showRo], [true, true]);
  const vac = F.srOpProfileOf({ wizard: { collectionType: 'mainline', systemType: 'vacuum' }, pumps: [{ kind: 'vacuum' }, { kind: 'ro' }, { kind: 'transfer' }], mainlines: 4 });
  eq('profile: vacuum operation shows everything', [vac.simple, vac.showTubing, vac.showVacuum, vac.showPumps, vac.showRo], [false, true, true, true, true]);
  const old = F.srOpProfileOf({ wizard: {}, pumps: [], mainlines: 0 });
  eq('profile: no setup hides nothing', [old.simple, old.showTubing, old.showPumps, old.showRo], [false, true, true, true]);
  eq('freeze: buckets get bucket advice', F.srFreezeAdviceOf(bk).why, 'jFreezeW_bk');
  eq('freeze: gravity tubing without pumps', F.srFreezeAdviceOf(F.srOpProfileOf({ wizard: { collectionType: 'mainline', systemType: 'gravity' }, pumps: [], mainlines: 2 })).why, 'jFreezeW_gt');
  eq('freeze: full operation keeps the RO, pump and lines', F.srFreezeAdviceOf(vac), { night: 'jFreezeNT', why: 'jFreezeW', sub: 'jFreezeS', items: ['fzWordRo', 'fzWordTransfer', 'fzWordLows'] });
  eq('freeze: vacuum with no transfer pump lists what is there', F.srFreezeAdviceOf(F.srOpProfileOf({ wizard: { systemType: 'vacuum' }, pumps: [{ kind: 'vacuum' }, { kind: 'ro' }], mainlines: 3 })).items, ['fzWordRo', 'fzWordLows']);
}

// ── 24 · the freeze job after prep is done ──
{
  const base = { now: at('2027-03-09', 18), minutes: 18 * 60, todayIso: '2027-03-09', stage: 'collect', firstRun: false, hasPins: true, hasLocation: true,
    wx: { '2027-03-10': { hi: 40, lo: 20 } }, tanks: [], checks: {}, loggedToday: { any: 1 } };
  const ops = (done, total) => ({ prefs: { freezeF: 28, fuelLowH: 3 }, pumps: [], leaks: [], freeze: { lo: 20, done, total } });
  eq('freeze: prep open shows prep, not the generic job', F.srJobs({ ...base, ops: ops(2, 5) }).map(j => j.id).filter(x => /freeze/.test(x)), ['freeze-prep']);
  eq('freeze: prep all done brings back nothing', F.srJobs({ ...base, ops: ops(5, 5) }).map(j => j.id).filter(x => /freeze/.test(x)), []);
  eq('freeze: no pumps keeps the generic job', F.srJobs({ ...base }).map(j => j.id).filter(x => /freeze/.test(x)), ['freeze']);
  const bkJob = F.srJobs({ ...base, profile: F.srOpProfileOf({ wizard: { collectionType: 'buckets', systemType: 'gravity' } }) }).find(j => j.id === 'freeze');
  eq('freeze: bucket producer gets bucket words', [bkJob.title, bkJob.why], ['jFreezeNT_bk', 'jFreezeW_bk']);
}

// ── 25 · RO advice respects a running RO ──
{
  const base = { now: at('2027-03-09', 10), minutes: 600, todayIso: '2027-03-09', stage: 'collect', firstRun: false, hasPins: true, hasLocation: true, wx: null, checks: {},
    loggedToday: { any: 1 }, roGph: 200, tanks: [{ name: 'Tank 1', capGal: 1000, levelGal: 900, fillGalH: 60 }] };
  eq('ro: tank near full says run the RO', F.srJobs(base).some(j => j.id === 'ro-now'), true);
  const running = F.srJobs({ ...base, ops: { prefs: { freezeF: 28, fuelLowH: 3 }, pumps: [{ id: 'r', name: 'RO', kind: 'ro', status: 'running', statusAt: at('2027-03-09', 8) }], leaks: [], freeze: null } });
  eq('ro: running RO is not told to start', [running.some(j => j.id === 'ro-now' || j.id === 'ro-later'), running.some(j => j.id === 'ro-running')], [false, true]);
}

// ── 33 · metric text ──
{
  const m = s => F.srMetricText(s, '.');
  eq('metric: a low', m('Freezing tonight, 23°F'), 'Freezing tonight, -5°C');
  eq('metric: a range', m('Heat the syrup to 185 to 190°F.'), 'Heat the syrup to 85 to 88°C.');
  eq('metric: a difference has no offset', m('boiling point plus 7.1°F. Check'), 'boiling point plus 3.9°C. Check');
  eq('metric: + a difference', m('Boiling point + 7°F.'), 'Boiling point + 3.9°C.');
  eq('metric: "above" is a difference', F.srMetricText('7,1°F au-dessus de la température', ','), '3,9°C au-dessus de la température');
  eq('metric: decimals kept', m('Draw off at 219.1°F'), 'Draw off at 103.9°C');
  eq('metric: the freezing line', m('The line marks 32°F.'), 'The line marks 0°C.');
  eq('metric: wind', m('12 mph · calm'), '19 km/h · calm');
  eq('metric: a label', m('Water boils at, °F'), 'Water boils at, °C');
  eq('metric: no double', m('Draw off at 219°F (104°C)'), 'Draw off at 104°C');
  eq('metric: French comma', F.srMetricText('Gel cette nuit, 23,5°F', ','), 'Gel cette nuit, -4,7°C');
  eq('metric: untouched without °F', m('Sap 120 gal'), 'Sap 120 gal');
  eq('metric: default follows litres or French', [F.srMetricOf(null, 'L', 'en'), F.srMetricOf(null, 'GAL', 'fr'), F.srMetricOf(null, 'GAL', 'en'), F.srMetricOf('us', 'L', 'fr'), F.srMetricOf('metric', 'GAL', 'en')], [true, true, false, false, true]);
  eq('metric: cm and inches', [r(F.srInToCm(12), 1), r(F.srCmToIn(30.48), 2), r(F.srMphToKmh(10), 1)], [30.5, 12, 16.1]);
}

// ── P2 · one run-day count ──
{
  const wx = {}; ['2027-03-16', '2027-03-17', '2027-03-18', '2027-03-19', '2027-03-20', '2027-03-21', '2027-03-22', '2027-03-23'].forEach((d, i) => { wx[d] = { hi: [42, 38, 45, 40.4, 39.6, 50, 41, 44][i], lo: [25, 20, 28.4, 27, 20, 33, 22, 20][i] }; });
  const rd = F.srRunDays(wx, '2027-03-16');
  eq('run days: one window from today, rounded like srDayClass', [rd.n, rd.of, rd.days], [5, 7, ['2027-03-16', '2027-03-18', '2027-03-19', '2027-03-20', '2027-03-22']]);
}

// ── 28 · back-dating ──
{
  eq('log date: season window to today', F.srLogDateRange('2027-03-16'), { min: '2026-07-01', max: '2027-03-16', today: '2027-03-16', yesterday: '2027-03-15' });
  eq('log date: no yesterday on Jul 1', F.srLogDateRange('2027-07-01').yesterday, null);
  eq('log date: checks', [F.srLogDateOk('2027-03-10', '2027-03-16'), F.srLogDateOk('2027-03-17', '2027-03-16'), F.srLogDateOk('2026-06-30', '2027-03-16'), F.srLogDateOk('x', '2027-03-16')], [true, false, false, false]);
}

// ── 27 · mainlines ──
{
  const az = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  eq('mainline: 27th line is AA', [F.srNextMainlineId(['A', 'B']), F.srNextMainlineId(az), F.srNextMainlineId([...az, 'AA'])], ['C', 'AA', 'AB']);
  const S = { mainlines: [{ id: 'A' }, { id: 'C' }], pins: [{ type: 'tree', mainline: 'C' }, { type: 'tree', mainline: 'C' }, { type: 'tree', mainline: 'A' }, { type: 'tank' }],
    pumps: [{ id: 'p', lineIds: ['A', 'C'] }], lineMeta: { C: { taps: 9 }, A: {} }, gauges: { C: [{ id: 'g' }] }, readings: [{ s: 'line:C:end' }, { s: 'line:C:g:g' }, { s: 'line:A:end' }] };
  eq('mainline: delete says what is attached', F.srMainlineDeleteOf('C', S), { trees: 2, gauges: 1, readings: 2, pumps: 1 });
  const D = F.srMainlineDelete('C', S);
  eq('mainline: delete lets go of trees, pumps, meta and gauges', [D.mainlines.map(m => m.id), D.pins.filter(p => p.mainline === 'C').length, D.pins.filter(p => p.type === 'tree' && p.mainline === null).length, D.pumps[0].lineIds, 'C' in D.lineMeta, 'C' in D.gauges],
    [['A'], 0, 2, ['A'], false, false]);
}

// ── P2 · small words ──
{
  eq('backup: counts records, not keys', F.srBackupEntries({ sg_logs2: { 2027: { sapCollected: [1, 2, 3], syrupMade: [1] }, 2026: { sapCollected: [1] } }, sg_batches: [1, 2], sg_units: 'GAL', sg_readings: { 2027: [1, 2] } }), 9);
  eq('ring: arc capped, number real', F.srRingOf(31.8, 14), { arc: 100, real: 31.8 / 14 * 100 });
  eq('ring: no goal', F.srRingOf(3, 0), null);
}

// ── 31 · concentrate on RO entries ──
{
  const E = [{ val: 1000, conc: 250, cbrix: 8 }, { val: 600 }, { val: 400, cbrix: 10 }];
  const rc = F.srRoConcOf(E, 2, 8);
  eq('ro conc: sums sap fed and logged concentrate', [rc.ro, rc.roLogged, rc.conc], [2000, 1000, 250]);
  eq('ro conc: Brix weighted by what came out', r(rc.concBrix, 3), r((8 * 250 + 10 * 400) / 650, 3));
  eq('ro conc: the logged volume sets the Brix the savings use', r(rc.effBrix, 2), 8);
  eq('ro conc: nothing logged falls back to the setting', F.srRoConcOf([{ val: 500 }], 2, 9), { ro: 500, roLogged: 0, conc: 0, concBrix: 9, measured: false, effBrix: 9 });
  eq('ro conc: converts with the entry\'s unit', F.srSlogInUnit({ sapRO: [{ val: 100, conc: 20, u: 'GAL' }] }, 'L', 'GAL').sapRO[0].conc.toFixed(2), (20 * 3.785411784).toFixed(2));
}

// ── 35 · checklists ──
{
  const bk = F.srOpProfileOf({ wizard: { collectionType: 'buckets', systemType: 'gravity' } });
  eq('tasks: bucket producer skips tubing, vacuum and RO items', [[...F.srTaskHidden('pre', bk)].sort(), [...F.srTaskHidden('post', bk)].sort()], [[0, 1, 4, 5], [1, 3, 6]]);
  eq('tasks: a vacuum operation sees them all', F.srTaskHidden('pre', F.srOpProfileOf({ wizard: { systemType: 'vacuum' }, pumps: [{ kind: 'ro' }] })).size, 0);
  eq('tasks: no profile hides nothing', F.srTaskHidden('post', null).size, 0);
}

// ── P2 · ten plates on Watch find room ──
{
  const lines = 'ABCDEFGHIJ'.split('').map((id, i) => ({ id, w: 120, h: 44, pts: [[400, 400], [400 + 300 * Math.cos(i * 0.3), 400 - 300 * Math.sin(i * 0.3)]] }));
  const at = F.srPlacePlates(lines, { bounds: { w: 720, h: 720 } });
  eq('plates: ten lines from one tank all get a clear spot', Object.values(at).filter(a => a.clear).length, 10);
}

// ── 23 · write-time trial gate, through ls.set ──
{
  const st = src.slice(src.indexOf('// ─── localStorage helpers'), src.indexOf('// The unit untagged log entries'));
  const lic = src.slice(src.indexOf('// Season Trial: 14 days'), src.indexOf('function pingEvent'));
  const mem = {};
  const fakeLS = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  const bandFns = 'srTrialOf, srSapDatesOf, srSeasonOf, srDateParts, srIsoOf, srSeasonWindow';
  const G = new Function('localStorage', 'window', 'NOW', 'TODAY', src.slice(fa, fb).replace('function srToday() {', 'function srTodayReal() {') + '\n' + st + '\n' + lic.replace(/Date\.now\(\)/g, 'NOW()') +
    '\nconst srToday = () => TODAY();\nreturn { ls, trialStatus, srTrialGate, setGate: g => { SR_TRIAL_GATE = g; }, locked: () => SR_LOCKED, fail: () => SR_WRITE_FAIL };')(fakeLS, { dispatchEvent: () => {} }, () => clock.ms, () => clock.iso);
  const clock = { ms: at('2027-03-06', 9), iso: '2027-03-06' };
  mem.sg_trial_start = JSON.stringify('2027-02-01');
  mem.sg_logs2 = JSON.stringify({ 2027: { sapCollected: [{ date: '2027-03-01', val: 10 }, { date: '2027-03-04', val: 10 }] } });
  G.setGate(G.srTrialGate);
  const L0 = JSON.parse(mem.sg_logs2);
  const add = (d) => ({ 2027: { sapCollected: [...JSON.parse(mem.sg_logs2)[2027].sapCollected, { date: d, val: 5 }] } });
  eq('gate: the third sap day saves', G.ls.set('sg_logs2', add('2027-03-06')), true);
  eq('gate: more on the third day saves', G.ls.set('sg_logs2', add('2027-03-06')), true);
  eq('gate: a back-dated fourth sap day is refused, and does not lock the app', [G.ls.set('sg_logs2', add('2027-03-02')), G.fail(), G.locked()], [false, 'trialsap', false]);
  clock.ms = at('2027-03-07', 7); clock.iso = '2027-03-07';
  eq('gate: next morning a running session locks at its first write', [G.ls.set('sg_batches', [{ id: 1 }]), G.locked(), G.fail()], [false, true, 'locked']);
  eq('gate: preferences still save', G.ls.set('sg_units', 'L'), true);
}

// ── 33 · fuel exported in litres comes back in the fuel's own unit ──
{
  const csv = '"Type","Date","Valeur","Unité","Note"\n"Combustible","2027-03-05","37.85412","L",""\n"Combustible","2027-03-06","2","gal",""';
  const r_ = F.srParseSapCsv(csv, { fuelUsed: ['Fuel', 'Combustible'] });
  eq('import: fuel in L back to gallons, gallons untouched', r_.entries.filter(e => e.kind === 'fuelUsed').map(e => +e.val.toFixed(3)), [10, 2]);
}

// ── re-run · a lock refusal clears on the next screen; a full-storage one stays ──
{
  const core = src.slice(src.indexOf('function useSrCore()'), src.indexOf('function useSrCore()') + 1500);
  eq('nav clears lock and trial refusals, never quota', /const nav = \(\) => \{ if \(SR_WRITE_FAIL && SR_WRITE_FAIL !== 'quota'\)/.test(core) && /addEventListener\('hashchange', nav\)/.test(core), true);
  const g = (k) => (src.match(new RegExp(k + ":'([^']*)'", 'g')) || []).map(s => s.split(":'")[1].slice(0, -1));
  eq('PDF batch notes wrap in full (splitTextToSize), never cut to 30 characters', /splitTextToSize\(P\(b\.note/.test(src) && !/b\.note[^\n]{0,40}\.slice\(0,\s*30\)/.test(src), true);
  eq('vacuum guide labels name the unit (inHg / po Hg)', [...g('tgv_lowVac_s'), ...g('tgv_highVac_s')].every(s => /inHg|po Hg/.test(s)), true);
}

for (const t of tasks) await t();
console.log(`fix2: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);

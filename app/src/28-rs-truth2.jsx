// ─── Fix pass 2: one rule for each behaviour (formula band, pure) ───────────
// Season test items 23 to 35 and the P2 list. Pure functions, no storage reads;
// tests/fix2.test.mjs evaluates them from the shipped source. No maple formula
// changes here: these are rules about time, units, wording and what to show.

// ── 23 · The Season Trial, told honestly ─────────────────────────────────────
// The rule is Damian's and unchanged: 14 days from the first open, never ending
// before Feb 28 for an Oct to Jan start; past that date, during Feb to Apr, it
// stays open until 3 real sap days are logged (and never past May 1).
// What this adds is the reading of "3 sap days": a sap day is a calendar day, so
// the third one is usable to the end of that day, and logging locks the next
// morning. The old start-up check could lock mid-day on day 3 or a day late.
//   o: { start: 'YYYY-MM-DD', now: ms, todayIso, sapDates: ['YYYY-MM-DD', ...] }
// -> { mode: 'days' | 'sap', daysLeft, expired, sapUsed, sapLeft, lastFree, warn, usedToday }
//   sapLeft: sap days still free after today; lastFree: today is the last free sap day;
//   warn: the next sap day will be the last one.
const SR_TRIAL_SAP_DAYS = 3;
const SR_DAY_MS2 = 86400000;
function srTrialOf(o) {
  const s = new Date(o.start + 'T00:00:00'), now = new Date(o.now);
  let base = s.getTime() + 14 * SR_DAY_MS2;
  const m = s.getMonth();
  if (m >= 9) base = Math.max(base, new Date(s.getFullYear() + 1, 1, 28).getTime());
  else if (m === 0) base = Math.max(base, new Date(s.getFullYear(), 1, 28).getTime());
  const mo = now.getMonth(), inSap = mo >= 1 && mo <= 3;
  const dates = new Set((o.sapDates || []).filter(Boolean));
  const usedToday = dates.has(o.todayIso);
  const usedBefore = [...dates].filter(d => d !== o.todayIso).length;
  const out = { start: o.start, sapUsed: dates.size, usedToday, sapLeft: null, lastFree: false, warn: false };
  if (now.getTime() <= base || !inSap) {
    const daysLeft = Math.ceil((base - now.getTime()) / SR_DAY_MS2);
    // The last day of the dated trial, when the sap-day rule will not carry it on (the end falls
    // outside Feb to Apr, or 3 sap days are already logged): warned that day, before the lock.
    const bm = new Date(base).getMonth(), extends_ = bm >= 1 && bm <= 3 && dates.size < SR_TRIAL_SAP_DAYS;
    return { ...out, mode: 'days', daysLeft, expired: daysLeft <= 0, lastDay: daysLeft === 1 && !extends_ };
  }
  const may = new Date(now.getFullYear(), 4, 1).getTime();
  const expired = usedBefore >= SR_TRIAL_SAP_DAYS;
  const sapLeft = Math.max(0, SR_TRIAL_SAP_DAYS - usedBefore - (usedToday ? 1 : 0));
  return { ...out, mode: 'sap', daysLeft: Math.ceil((may - now.getTime()) / SR_DAY_MS2), expired,
    sapLeft, lastFree: !expired && usedToday && sapLeft === 0, warn: !expired && !usedToday && sapLeft === 1 };
}
// The sap days in one season's sap entries (the dates with sap on them).
function srSapDatesOf(slog) {
  return [...new Set(((slog || {}).sapCollected || []).filter(e => e && parseFloat(e.val) > 0)
    .map(e => { const p = srDateParts(e.date); return p ? srIsoOf(new Date(p.y, p.mo - 1, p.d, 12)) : null; }).filter(Boolean))];
}
// The chip's words: the limit that will actually end the trial.
//   -> [key, vars]
function srTrialChipOf(t) {
  if (!t) return ['chipTrial', { n: 0 }];
  if (t.mode === 'sap') {
    if (t.lastFree) return ['chipTrialLastSap', {}];
    return [t.sapLeft === 1 ? 'chipTrialSap1' : 'chipTrialSapN', { n: t.sapLeft }];
  }
  return [t.daysLeft === 1 ? 'chipTrial1' : 'chipTrial', { n: t.daysLeft }];
}

// ── 24, 35 · What kind of operation this is ──────────────────────────────────
// From the setup and from what he has entered. Never hides data he entered:
// a bucket producer who adds a pump, a mainline or an RO entry sees them.
//   o: { wizard, pumps: [{kind}], mainlines: n, roEntries: n, vacReadings: n }
function srOpProfileOf(o) {
  const w = (o && o.wizard) || {}, pumps = (o && o.pumps) || [];
  const set = !!(w.collectionType || w.systemType);
  const buckets = w.collectionType === 'buckets';
  const vacuum = w.systemType === 'vacuum';
  const hasPumps = pumps.length > 0, hasRo = pumps.some(p => p && p.kind === 'ro') || (o && o.roEntries > 0);
  const hasTransfer = pumps.some(p => p && p.kind === 'transfer'), hasVacPump = pumps.some(p => p && p.kind === 'vacuum');
  const hasLines = (o && o.mainlines > 0) || false;
  // Buckets or gravity tubing, nothing pumped and no RO: the bucket and gravity producer.
  const simple = set && !vacuum && !hasPumps && !hasRo;
  return {
    set, buckets, vacuum, simple, hasPumps, hasRo, hasTransfer, hasVacPump, hasLines,
    showTubing: !(simple && buckets) || hasLines,
    showVacuum: !simple || hasVacPump || (o && o.vacReadings > 0),
    showPumps: !simple || hasPumps,
    showRo: !simple || hasRo,
  };
}
// The freeze job's advice for this operation: what holds sap or water here.
//   -> { title (night key), why key, items: [word keys] }
function srFreezeAdviceOf(p) {
  const P = p || {};
  if (P.simple && P.buckets && !P.hasLines) return { night: 'jFreezeNT_bk', why: 'jFreezeW_bk', sub: 'jFreezeS_bk', items: [] };
  const items = [];
  if (P.hasRo || !P.set) items.push('fzWordRo');
  if (P.hasTransfer || !P.set) items.push('fzWordTransfer');
  if (P.hasLines || P.showTubing) items.push('fzWordLows');
  if (!items.length || (P.simple && !P.hasRo && !P.hasTransfer)) return { night: 'jFreezeNT_gt', why: 'jFreezeW_gt', sub: 'jFreezeS_gt', items: [] };
  return { night: 'jFreezeNT', why: items.length === 3 ? 'jFreezeW' : 'jFreezeW_list', sub: 'jFreezeS', items };
}

// ── 33 · Metric display: °C, km/h, cm ─────────────────────────────────────────
// Storage never changes: temperatures stay °F, wind mph, diameters inches. The
// display follows sg_measure ('us' | 'metric'); unset, it is metric in litre
// mode or in French, as a Québec producer expects.
const srMetricOf = (measure, units, lang) => measure === 'metric' ? true : measure === 'us' ? false : (units === 'L' || lang === 'fr');
const srFtoC = f => (f - 32) * 5 / 9;
const srCtoF = c => c * 9 / 5 + 32;
const srFdToCd = d => d * 5 / 9;          // a difference in °F to one in °C
const srMphToKmh = v => v * 1.609344;
const srInToCm = v => v * 2.54;
const srCmToIn = v => v / 2.54;
// Rewrites the °F and mph in a finished sentence for metric display. Each number
// is converted where it stands; a difference (plus 7.1°F, + 7°F, 7.1°F above)
// converts without the 32 offset. A bare "°F" (a field label) becomes "°C".
// dec: the decimal mark of the language ('.' or ',').
function srMetricText(s, dec) {
  if (!s || (s.indexOf('°F') < 0 && s.indexOf('mph') < 0)) return s;
  const num = x => parseFloat(String(x).replace(/\s/g, '').replace(',', '.'));
  const out = (v, dp) => { const r = dp ? (Math.round(v * 10) / 10) : Math.round(v); let t = dp ? r.toFixed(1) : String(r); if (t === '-0') t = '0'; return dec === ',' ? t.replace('.', ',') : t; };
  const dpOf = x => /[.,]\d/.test(String(x)) ? 1 : 0;
  let r = s.replace(/(plus |\+ ?|de )?(-?\d+(?:[.,]\d+)?)((?:\s(?:to|à)\s)(-?\d+(?:[.,]\d+)?))?\s?°F( above| au-dessus| de plus)?/g,
    (all, pre, a, rng, b, post) => {
      const delta = !!(post || (pre && pre.trim() !== 'de'));
      const cv = x => delta ? srFdToCd(num(x)) : srFtoC(num(x));
      const head = pre || '';
      if (rng) return `${head}${out(cv(a), dpOf(a))}${rng.slice(0, rng.length - b.length)}${out(cv(b), dpOf(b))}°C${post || ''}`;
      return `${head}${out(cv(a), dpOf(a) || (delta ? 1 : 0))}°C${post || ''}`;
    });
  r = r.replace(/(-?\d+(?:[.,]\d+)?)\s?mph/g, (all, a) => `${out(srMphToKmh(num(a)), 0)} km/h`);
  r = r.replace(/°F/g, '°C');
  // "219°F (104°C)" said the same thing twice once both are °C.
  r = r.replace(/(-?\d+(?:[.,]\d+)?°C) \((-?\d+(?:[.,]\d+)?°C)\)/g, '$1');
  return r;
}

// ── P2 · One definition of a run day ─────────────────────────────────────────
// A run day is srDayClass(hi, lo) === 'ideal' (a day of 40°F or more after a night
// of 28°F or less). Every count says the same window: N days from today.
//   wx: { iso: { hi, lo } }  -> { n, of, days: [iso] }
const SR_RUN_WINDOW = 7;
function srRunDays(wx, todayIso, n) {
  const N = n || SR_RUN_WINDOW, days = [];
  let of = 0;
  for (let i = 0; i < N; i++) {
    const iso = srIsoAdd(todayIso, i), d = wx && wx[iso];
    if (!d) continue;
    of++;
    if (srDayClass(d.hi, d.lo) === 'ideal') days.push(iso);
  }
  return { n: days.length, of, days };
}

// ── 28 · Back-dating a new entry ─────────────────────────────────────────────
// The dates a new entry may take: from the start of today's season (Jul 1) to today.
//   -> { min, max, today, yesterday | null }
function srLogDateRange(todayIso) {
  const w = srSeasonWindow(srSeasonOf(todayIso));
  const y = srIsoAdd(todayIso, -1);
  return { min: w.start, max: todayIso, today: todayIso, yesterday: y >= w.start ? y : null };
}
const srLogDateOk = (iso, todayIso) => { const r = srLogDateRange(todayIso); return !!iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso >= r.min && iso <= r.max; };

// ── 27 · Mainlines: the 27th, edits and deletes ──────────────────────────────
// A to Z, then AA to AZ, BA and on: a 27th line is a line, never a trial message.
function srNextMainlineId(used) {
  const U = new Set((used || []).map(String));
  const A = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  for (const a of A) if (!U.has(a)) return a;
  for (const a of A) for (const b of A) if (!U.has(a + b)) return a + b;
  return null;
}
// What deleting a mainline touches, before he confirms.
//   -> { trees, gauges, readings, pumps }
function srMainlineDeleteOf(id, s) {
  const S = s || {}, k = String(id);
  const trees = (S.pins || []).filter(p => p && p.type === 'tree' && String(p.mainline) === k).length;
  const gauges = ((S.gauges || {})[k] || []).length;
  const readings = (S.readings || []).filter(r => r && typeof r.s === 'string' && r.s.startsWith('line:' + k + ':')).length;
  const pumps = (S.pumps || []).filter(p => p && (p.lineIds || []).map(String).includes(k)).length;
  return { trees, gauges, readings, pumps };
}
// The stored state after deleting mainline id: the line goes; its trees, pumps and
// gauges let go of it; readings stay in sg_readings (they are his records).
function srMainlineDelete(id, s) {
  const k = String(id), S = s || {};
  const meta = { ...(S.lineMeta || {}) }; delete meta[k];
  const gauges = { ...(S.gauges || {}) }; delete gauges[k];
  return {
    mainlines: (S.mainlines || []).filter(m => String(m.id) !== k),
    pins: (S.pins || []).map(p => p && p.type === 'tree' && String(p.mainline) === k ? { ...p, mainline: null } : p),
    pumps: (S.pumps || []).map(p => p && (p.lineIds || []).map(String).includes(k) ? { ...p, lineIds: p.lineIds.filter(x => String(x) !== k) } : p),
    lineMeta: meta, gauges,
  };
}

// ── P2 · Small words ─────────────────────────────────────────────────────────
// Backup: entries are the records inside the keys, not the keys.
//   data: { sg_key: parsedValue }  -> number of records
function srBackupEntries(data) {
  let n = 0;
  const D = data || {};
  const logs = D.sg_logs2;
  if (logs && typeof logs === 'object') Object.values(logs).forEach(sl => { if (sl && typeof sl === 'object') Object.values(sl).forEach(a => { if (Array.isArray(a)) n += a.length; }); });
  ['sg_batches', 'sg_brixlog', 'sg_lines_pins', 'sg_pump_log', 'sg_tanks', 'sg_pumps', 'sg_equip2'].forEach(k => { if (Array.isArray(D[k])) n += D[k].length; });
  const rd = D.sg_readings; if (rd && typeof rd === 'object') Object.values(rd).forEach(a => { if (Array.isArray(a)) n += a.length; });
  return n;
}
// The goal ring: the arc stops at full, the number tells the truth (227%).
const srRingOf = (have, goal) => { if (!(goal > 0)) return null; const real = have / goal * 100; return { arc: Math.max(0, Math.min(100, real)), real }; };

// ── 31 · Concentrate he logged on RO entries ─────────────────────────────────
// An RO entry is the raw sap fed in (val); it may carry the concentrate that came
// out (conc, same unit) and its Brix (cbrix). This reads them back for Recap and
// the boil: the concentrate Brix he measured wins over the setting, and Recap's
// RO comparison uses the concentrate he logged (as the Brix that makes it).
//   entries: sapRO entries in one unit · sapBrix · setting (sg_dx_robrix)
// -> { ro, roLogged, conc, concBrix, measured, effBrix }
function srRoConcOf(entries, sapBrix, setting) {
  const E = (entries || []).filter(e => e && parseFloat(e.val) > 0);
  const ro = E.reduce((t, e) => t + parseFloat(e.val), 0);
  const withC = E.filter(e => parseFloat(e.conc) > 0);
  const roLogged = withC.reduce((t, e) => t + parseFloat(e.val), 0), conc = withC.reduce((t, e) => t + parseFloat(e.conc), 0);
  const withB = E.filter(e => parseFloat(e.cbrix) > 0);
  const wB = withB.reduce((t, e) => t + (parseFloat(e.conc) > 0 ? parseFloat(e.conc) : parseFloat(e.val)), 0);
  const brixLogged = wB > 0 ? withB.reduce((t, e) => t + parseFloat(e.cbrix) * (parseFloat(e.conc) > 0 ? parseFloat(e.conc) : parseFloat(e.val)), 0) / wB : null;
  const set = parseFloat(setting) > 0 ? parseFloat(setting) : 8;
  const concBrix = brixLogged != null ? brixLogged : set;
  // Concentrate volume logged for some of the sap: the Brix that turns that sap into it.
  const fromVol = roLogged > 0 && conc > 0 && conc < roLogged && sapBrix > 0 ? sapBrix * roLogged / conc : null;
  return { ro, roLogged, conc, concBrix, measured: brixLogged != null || fromVol != null, effBrix: fromVol != null ? fromVol : concBrix };
}

// ── 35 · Checklist items that don't apply ────────────────────────────────────
// Base checklist items by what they need (indexes into PRE_TASKS / POST_TASKS; the
// indexes are what sg_checks2 stores, so items are left out, never renumbered).
const SR_TASK_NEEDS = { pre: { 0: 'tubing', 1: 'tubing', 4: 'vacuum', 5: 'ro' }, post: { 1: 'tubing', 3: 'ro', 6: 'tubing' } };
function srTaskHidden(phase, profile) {
  const P = profile || {}, need = SR_TASK_NEEDS[phase] || {};
  const show = { tubing: P.showTubing !== false, vacuum: P.showVacuum !== false, ro: P.showRo !== false };
  return new Set(Object.keys(need).filter(i => !show[need[i]]).map(Number));
}

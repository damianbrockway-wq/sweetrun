// ─── Run Sheet engine (Phase 5): pure, tested, plain JS ─────────────────────
// Lives inside the formula band (between 20-formulas and the "Shared UI"
// banner in 30-ui-kit), so tests/runsheet.test.mjs evaluates the shipped code.
// Nothing here reads localStorage or the DOM: the Season screen gathers the
// facts (selectors in 25-rs-selectors.jsx) and passes them in.
//
// Units: everything the engine compares is in GALLONS. Log values are stored in
// the display unit at entry time (data trap 1), so callers convert with toGal
// before passing sums in, and the UI converts back with fromGal for display.
// No formula in 20-formulas is changed; the only math here is arithmetic on
// top of rule86/boilTime/finTemp and the freeze-thaw rule the app already uses.

const SR_DAY_MS = 86400000;
// ISO date (YYYY-MM-DD) of a local Date, the same format srToday() writes.
const srIsoOf = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const srIsoAdd = (iso, n) => { const p = srDateParts(iso); return srIsoOf(new Date(p.y, p.mo - 1, p.d + n, 12)); };
const srDaysBetween = (aIso, bIso) => Math.round((srDateMs(bIso) - srDateMs(aIso)) / SR_DAY_MS);

// ── Day class: the freeze-thaw rule FreezeThawWidget already uses ────────────
// ideal: hi >= 40 and lo <= 28 (a good run) · freezeThaw: crosses 32 but not
// ideal · tooWarm: hi > 50 and lo > 32 · allFreeze: hi < 32 · else none.
// Temperatures are rounded first, exactly as the widget rounds them.
function srDayClass(hi, lo) {
  if (hi == null || lo == null || isNaN(hi) || isNaN(lo)) return null;
  const h = Math.round(hi), l = Math.round(lo);
  if (h >= 40 && l <= 28) return 'ideal';
  if (h >= 32 && l < 32) return 'freezeThaw';
  if (h > 50 && l > 32) return 'tooWarm';
  if (h < 32) return 'allFreeze';
  return 'none';
}

// ── Log entries: exactly LogTab's shape and write path ───────────────────────
// LogTab.saveEntry builds {id, date, val, note, grade?, brix?, point?} and
// updLog writes {...logs, [season]: {...slog, [k]: entries}} where a missing
// season starts from the four-kind empty object. These two functions produce
// byte-identical JSON for the same inputs (tests compare them).
const SR_LOG_KINDS = ['sapCollected','syrupMade','sapRO','sapEvap','fuelUsed','boilHours'];
const SR_KIND_FIELDS = {
  sapCollected: { brix:true },
  syrupMade:    { grade:true, brix:true },
  sapRO: {}, sapEvap: {}, fuelUsed: {}, boilHours: {},
};
function srMakeEntry(kind, f, id, date) {
  const K = SR_KIND_FIELDS[kind] || {};
  const grade = f.grade == null ? '—' : f.grade;
  const brix = f.brix == null ? '' : f.brix;
  return {
    id,
    date,
    val:   parseFloat(f.val),
    note:  f.note || '',
    grade: K.grade ? grade : undefined,
    brix:  K.brix && brix ? parseFloat(brix) : undefined,
    point: f.point || undefined,
  };
}
const SR_EMPTY_SLOG = () => ({ sapCollected:[], syrupMade:[], sapRO:[], sapEvap:[] });
function srAppendEntry(logs, season, kind, entry) {
  const all = logs || {};
  const slog = all[season] || SR_EMPTY_SLOG();
  return { ...all, [season]: { ...slog, [kind]: [...(slog[kind] || []), entry] } };
}
// Auto-copy a sap entry into R/O and/or the evaporator, as LogTab does after
// a sap save (the second write). ids: Date.now() and Date.now()+1.
function srAutoCopy(logs, season, entry, autoCopy, id) {
  if (!autoCopy || !(autoCopy.ro || autoCopy.evap)) return null;
  const all = logs || {};
  const prev = all[season] || SR_EMPTY_SLOG();
  const up = { ...prev };
  const note = '← auto from sap collected';
  if (autoCopy.ro)   up.sapRO   = [...(prev.sapRO   || []), { id,     date:entry.date, val:entry.val, note }];
  if (autoCopy.evap) up.sapEvap = [...(prev.sapEvap || []), { id:id+1, date:entry.date, val:entry.val, note }];
  return { ...all, [season]: up };
}
// EvapTab's batch shape: {date, sapIn, syrupOut, grade, loc, notes, id}.
function srMakeBatch(f, id) {
  return { date:f.date, sapIn:f.sapIn, syrupOut:f.syrupOut, grade:f.grade || 'amber', loc:f.loc || '', notes:f.notes || '', id };
}

// ── Day totals and season series ─────────────────────────────────────────────
// Sum of parseFloat(val) per ISO day for one kind (display unit, as stored).
function srDayTotals(entries) {
  const m = {};
  (entries || []).forEach(e => {
    const p = srDateParts(e.date); if (!p) return;
    const iso = `${p.y}-${String(p.mo).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`;
    m[iso] = (m[iso] || 0) + (parseFloat(e.val) || 0);
  });
  return m;
}
function srFirstIso(entries) {
  const t = srDayTotals(entries);
  const ks = Object.keys(t).filter(k => t[k] > 0).sort();
  return ks.length ? ks[0] : null;
}
// The Season chart's window, bars and weather strip.
//   slog: this season's log; todayIso; wx: {iso: {hi, lo}} (past and forecast)
// Window: a week before the first sap day (or 14 days before today when there
// is no sap yet) to 10 days past today, at least 42 days and at most 84.
function srSeasonSeries(slog, todayIso, wx) {
  const sapBy = srDayTotals((slog || {}).sapCollected);
  const first = srFirstIso((slog || {}).sapCollected);
  let start = first ? srIsoAdd(first, -7) : srIsoAdd(todayIso, -14);
  if (srDaysBetween(start, todayIso) < 0) start = srIsoAdd(todayIso, -14);
  let end = srIsoAdd(todayIso, 10);
  let n = srDaysBetween(start, end) + 1;
  if (n < 42) { end = srIsoAdd(start, 41); n = 42; }
  if (n > 84) { start = srIsoAdd(end, -83); n = 84; }
  const days = [];
  for (let i = 0; i < n; i++) {
    const iso = srIsoAdd(start, i);
    const w = wx && wx[iso];
    days.push({ iso, sap: sapBy[iso] || 0, cls: w ? srDayClass(w.hi, w.lo) : null, fc: iso > todayIso });
  }
  const todayIdx = srDaysBetween(start, todayIso);
  const dayOfRun = first && first <= todayIso ? srDaysBetween(first, todayIso) + 1 : null;
  const peak = days.reduce((m, d) => d.sap > m.sap ? d : m, { sap:0, iso:null });
  return { start, end, days, todayIdx, firstSap: first, dayOfRun, peak };
}
// Cumulative syrup by day from each season's first sap day (so two seasons
// line up on "day N of the run"). Returns an array, index 0 = first sap day.
function srCumFromFirst(slog, uptoDays) {
  const first = srFirstIso((slog || {}).sapCollected) || srFirstIso((slog || {}).syrupMade);
  if (!first) return [];
  const by = srDayTotals((slog || {}).syrupMade);
  const out = []; let run = 0;
  for (let i = 0; i < uptoDays; i++) { run += by[srIsoAdd(first, i)] || 0; out.push(+run.toFixed(3)); }
  return out;
}

// ── Stage: which of the six the season is in ─────────────────────────────────
// f: { todayIso, season, slog, boilActive, hasMainlines, hasTreePins }
// Deterministic and explained in PHASE5-6-NOTES.md.
const SR_STAGE_IDS = ['weather','tap','lines','collect','boil','recap'];
function srStageOf(f) {
  const today = f.todayIso, s = f.slog || {};
  const yr = parseInt(String(today).slice(0, 4), 10);
  if (f.season && parseInt(f.season, 10) < yr) return 'recap';
  if (f.boilActive) return 'boil';
  const last = kinds => { let m = null; kinds.forEach(k => (s[k] || []).forEach(e => {
    const p = srDateParts(e.date); if (!p || !(parseFloat(e.val) > 0)) return;
    const iso = srIsoOf(new Date(p.y, p.mo - 1, p.d, 12)); if (iso <= today && (!m || iso > m)) m = iso; })); return m; };
  const lastSap = last(['sapCollected']);
  const lastAny = last(SR_LOG_KINDS);
  const lastBoil = last(['syrupMade','sapEvap','boilHours']);
  const month = parseInt(String(today).slice(5, 7), 10);
  if (lastSap || lastAny) {
    if (lastAny && srDaysBetween(lastAny, today) > 14 && month >= 4) return 'recap';
    if (lastBoil && srDaysBetween(lastBoil, today) <= 1) return 'boil';
    return 'collect';
  }
  if (month >= 5) return 'weather';
  if (f.hasMainlines) return 'lines';
  if (f.hasTreePins) return 'tap';
  return 'weather';
}

// ── RO call from a tank reading (used once tanks exist; see seams) ───────────
// Defaults are DESIGN.md's unsourced values, waiting on decision D5: a run is
// not worth it under 150 gal, a 3 h margin, and sap 24 h above 38°F is due.
// All volumes in gallons, rates in gal/h, times in hours.
function srRoPlan(o) {
  const lvl = +o.levelGal || 0, cap = +o.capGal || 0, gph = +o.roGph || 0, rate = +o.fillGalH || 0;
  const margin = o.marginH == null ? 3 : o.marginH, minRun = o.minRunGal == null ? 150 : o.minRunGal;
  const runH = gph > 0 ? lvl / gph : null;
  const fullH = rate > 0 ? Math.max(0, (cap - lvl) / rate) : null;
  let call = 'later', reason = 'fill', startInH = null;
  if (lvl < minRun) { call = 'wait'; reason = 'low'; }
  else if (o.ageH != null && o.ageH >= 24 && o.tempF != null && o.tempF > 38) { call = 'now'; reason = 'age'; }
  else if (fullH != null && runH != null && fullH <= runH + margin) { call = 'now'; reason = 'fill'; }
  else if (fullH != null && runH != null) { startInH = fullH - runH - margin; }
  else { call = 'unknown'; reason = 'rate'; }
  return { call, reason, runH, fullH, startInH, pct: cap > 0 ? Math.min(1, lvl / cap) : null };
}

// ── Boil: syrup an hour from the evaporator rate ─────────────────────────────
// The inverse of boilTime(): boiling sap of Brix b at r gal/h of water off
// makes r / (rule86(b) - 1) gal of syrup an hour. No new constant.
function srSyrupRate(evapGph, brix) {
  const R = rule86(brix);
  return evapGph > 0 && R > 1 ? evapGph / (R - 1) : 0;
}
// The evaporator rate the app already stores (EvapTab/BoilDay): sg_panIdx and
// the custom pan's W x H at 2.5 gal/h per sq ft. Returns gal/h or 0.
function srPanRate(panIdx, panW, panH) {
  const i = parseInt(panIdx, 10) || 0;
  if (i === CUSTOM_PAN_IDX) return Math.round(((parseFloat(panW) || 0) * (parseFloat(panH) || 0)) * 2.5);
  return (PAN_SIZES[i] || PAN_SIZES[0]).rate;
}

// ── The "Do this next" engine ────────────────────────────────────────────────
// Every open job the data supports, ranked; the Season screen shows the top
// one in the Next card and up to three more as alert cards. Returns objects
// with string KEYS (rendered through rt() so French works) and numeric vars.
// f: {
//   now (ms), minutes (0..1439), todayIso, stage,
//   firstRun, wizardDone, hasPins, hasLocation,
//   wx: {iso:{hi,lo}} | null,             forecast from Open-Meteo, if loaded
//   boil: {startMs} | null,               sg_boil_session while boiling
//   fresh: {startMs} | null,              sg_fresh_start while tracking
//   tanks: [{name, capGal, levelGal, fillGalH, readMs}]   (Phase 8 seam; [] now)
//   roGph, sapBrix, waterBP,
//   loggedToday: {sap, syrup, any},       counts of today's entries
//   checks: {pre:{done,total}, post:{done,total}}
// }
// Priorities (DESIGN.md signature moment, adapted to real data):
//   setup 100 · boiling 85 · freeze 90 after 5 pm / 55 by day · RO now 80 ·
//   sap age 80 (24 h+) / 50 (12 h+) · tap weather 60 · run coming 45 ·
//   RO later 40 · checklist 30 · location 25 · map 20 · recap 15 · log 10
function srJobs(f) {
  const J = [];
  const add = j => J.push(j);
  if (f.firstRun) {
    add({ id:'setup', p:100, icon:'tree', family:'tap', title:'jSetupT', why:'jSetupW', btn:'jSetupB', act:{ wizard:true } });
    return J;
  }
  const inSeason = f.stage === 'collect' || f.stage === 'boil';
  const tonightIso = f.minutes >= 720 ? srIsoAdd(f.todayIso, 1) : f.todayIso;
  const w = f.wx || null;
  if (f.boil && f.boil.startMs) {
    const h = Math.max(0, (f.now - f.boil.startMs) / 3600000);
    add({ id:'boil', p:85, icon:'flame', family:'boil', title:'jBoilT', why:'jBoilW',
      vars:{ h, fin: Math.round(finTemp(f.waterBP || 212) * 10) / 10, startMs:f.boil.startMs },
      btn:'jBoilB', act:{ go:'stage/boil' }, alert:'jBoilA', sub:'jBoilS' });
  }
  if (w && w[tonightIso] && inSeason) {
    const lo = Math.round(w[tonightIso].lo);
    if (lo <= 28) {
      const night = f.minutes >= 17 * 60;
      add({ id:'freeze', p: night ? 90 : 55, tone:'ice', icon:'snow', family:'ice',
        title: night ? 'jFreezeNT' : 'jFreezeT', why:'jFreezeW', vars:{ lo },
        btn:'jFreezeB', act:{ go:'stage/weather' }, alert:'jFreezeA', sub:'jFreezeS' });
    }
  }
  (f.tanks || []).forEach(t => {
    if (!(t.capGal > 0) || t.levelGal == null) return;
    const plan = srRoPlan({ levelGal:t.levelGal, capGal:t.capGal, fillGalH:t.fillGalH, roGph:f.roGph });
    if (plan.call === 'now') add({ id:'ro-now', p:80, icon:'ro', family:'collect', title:'jRoNowT', why:'jRoNowW',
      vars:{ name:t.name, lvl:t.levelGal, cap:t.capGal, fullH:plan.fullH, runH:plan.runH }, btn:'jRoNowB', act:{ go:'stage/collect/ro' },
      alert:'jRoNowA', sub:'jRoNowS' });
    else if (plan.call === 'later' && plan.startInH != null) add({ id:'ro-later', p:40, icon:'ro', family:'collect', title:'jRoLaterT', why:'jRoLaterW',
      vars:{ name:t.name, lvl:t.levelGal, cap:t.capGal, fullH:plan.fullH, startAtMs: f.now + plan.startInH * 3600000 }, btn:'jRoLaterB', act:{ go:'stage/collect' },
      alert:'jRoLaterA', sub:'jRoLaterS' });
  });
  if (f.fresh && f.fresh.startMs) {
    const ageH = Math.max(0, (f.now - f.fresh.startMs) / 3600000);
    if (ageH >= 12) add({ id:'fresh', p: ageH >= 24 ? 80 : 50, tone: ageH >= 24 ? 'bad' : '', icon:'clock', family: ageH >= 24 ? 'bad' : 'collect',
      title:'jFreshT', why: ageH >= 24 ? 'jFreshW24' : 'jFreshW12', vars:{ h: ageH }, btn:'jFreshB', act:{ go:'stage/collect' },
      alert:'jFreshA', sub:'jFreshS' });
  }
  if (w) {
    const next = [1, 2].map(i => { const iso = srIsoAdd(f.todayIso, i); return { i, iso, d:w[iso] }; }).filter(x => x.d);
    const good = next.find(x => srDayClass(x.d.hi, x.d.lo) === 'ideal');
    const early = f.stage === 'weather' || f.stage === 'tap' || f.stage === 'lines';
    if (good && early) {
      const five = [1,2,3,4,5].filter(i => { const d = w[srIsoAdd(f.todayIso, i)]; return d && srDayClass(d.hi, d.lo) === 'ideal'; }).length;
      add({ id:'tap-weather', p:60, icon:'therm', family:'weather', title:'jTapWxT', why:'jTapWxW',
        vars:{ n: five, hi: Math.round(good.d.hi), lo: Math.round(good.d.lo) }, btn:'jTapWxB', act:{ go:'stage/tap' },
        alert:'jTapWxA', sub:'jTapWxS' });
    } else if (good && inSeason) {
      add({ id:'run', p:45, icon:'drop', family:'weather', title: good.i === 1 ? 'jRunT1' : 'jRunT2', why:'jRunW',
        vars:{ hi: Math.round(good.d.hi), lo: Math.round(good.d.lo) }, btn:'jRunB', act:{ go:'stage/weather' },
        alert: good.i === 1 ? 'jRunT1' : 'jRunT2', sub:'jRunS' });
    }
  }
  const ck = f.checks || {};
  if ((f.stage === 'weather' || f.stage === 'tap') && ck.pre && ck.pre.total > 0 && ck.pre.done < ck.pre.total)
    add({ id:'pre', p:30, icon:'check', family:'weather', title:'jPreT', why:'jPreW', vars:{ done:ck.pre.done, total:ck.pre.total },
      btn:'jPreB', act:{ go:'shack/checklists' }, alert:'jPreT', sub:'jPreS' });
  if (f.stage === 'recap' && ck.post && ck.post.total > 0 && ck.post.done < ck.post.total)
    add({ id:'post', p:30, icon:'check', family:'recap', title:'jPostT', why:'jPostW', vars:{ done:ck.post.done, total:ck.post.total },
      btn:'jPostB', act:{ go:'shack/checklists' }, alert:'jPostT', sub:'jPreS' });
  if (!f.hasLocation && f.stage !== 'recap')
    add({ id:'location', p:25, icon:'therm', family:'weather', title:'jLocT', why:'jLocW', btn:'jLocB', act:{ go:'stage/weather' },
      alert:'jLocT', sub:'jLocS' });
  if (!f.hasPins && (f.stage === 'weather' || f.stage === 'tap' || f.stage === 'lines'))
    add({ id:'map', p:20, icon:'map', family:'lines', title:'jMapT', why:'jMapW', btn:'jMapB', act:{ go:'bush' }, alert:'jMapT', sub:'jMapS' });
  if (f.stage === 'recap')
    add({ id:'recap', p:15, icon:'chart', family:'recap', title:'jRecapT', why:'jRecapW', btn:'jRecapB', act:{ go:'stage/recap' } });
  // Phases 7-8: pumps, freeze prep, fuel and leaks (srPumpJobs in 23-rs-engine3).
  // Once freeze prep exists for his pumps it replaces the plain freeze job.
  if (f.ops) {
    const pj = srPumpJobs(f);
    if (pj.some(j => j.id === 'freeze-prep')) { const i = J.findIndex(j => j.id === 'freeze'); if (i >= 0) J.splice(i, 1); }
    pj.forEach(add);
  }
  const lt = f.loggedToday || {};
  add({ id:'log', p:10, icon:'drop', family:'collect',
    title: inSeason && !lt.any ? 'jLogT' : 'jLogT2', why: inSeason && !lt.any ? 'jLogW' : 'jLogW2',
    btn:'jLogB', act:{ log:'sapCollected' } });
  return J.sort((a, b) => b.p - a.p);
}

// ── Transfer time: EquipTab's model, lifted verbatim so it can be tested ─────
// "calibrated to match 800 ft + 12 ft lift -> 18 min for 300 gal at 28 GPM".
// Hauls at 90% of the tank; sapGal is the season's sap in gallons.
function srTransferTime(pumpGPM, tankGal, lineLen, liftFt, setupMin, sapGal) {
  const flowFactor    = Math.max(0.30, 1 - (lineLen / 1000) * 0.25 - (liftFt / 50) * 0.30);
  const effectiveGPM  = pumpGPM * flowFactor;
  const baseFillMin   = tankGal / Math.max(pumpGPM, 0.1);
  const realFillMin   = tankGal / Math.max(effectiveGPM, 0.1);
  const baseTotal     = baseFillMin + setupMin;
  const realisticTotal= realFillMin + setupMin;
  const numHauls  = sapGal > 0 ? Math.ceil(sapGal / (tankGal * 0.90)) : null;
  const totalHaulHrs = numHauls ? (numHauls * realisticTotal / 60) : null;
  return { flowFactor, effectiveGPM, baseFillMin, realFillMin, baseTotal, realisticTotal, extraMin: realisticTotal - baseTotal, numHauls, totalHaulHrs };
}
// FinishTab's DE amount, lifted verbatim (cups; 0.1 lb a cup).
function srDeCups(gal2f, deMode, szn, plates, cupsPerPlateKey) {
  const cpP = PLATE_CUPS[cupsPerPlateKey] || 3.25;
  const cupsPerPlate = plates * cpP;
  const galRate = szn === 'late' ? (deMode === 'straight' ? 0.75 : 0.5) : (deMode === 'straight' ? 0.5 : 0.2);
  const cupsPerGal = gal2f > 0 ? gal2f * galRate : 0;
  const cups = deMode === 'straight' ? (gal2f > 0 ? cupsPerGal : 0) : (gal2f > 0 ? Math.max(cupsPerPlate, cupsPerGal) : cupsPerPlate);
  const lbs = cups * 0.1;
  return { cups, lbs, oz: lbs * 16, tbsp: Math.round(cups * 16), recMode: gal2f > 25 ? 'precoat' : 'straight' };
}
// SapFreshnessTracker's degree-hour model, lifted verbatim so the Run Sheet
// card and the tests share it: base 40°F, tank ~3°F under air (never below
// 32), warn at 80 heat units, boil now at 150, best boil = next 3 hours in a
// row under 45°F. hourly: [{ts, temp}] in °F.
const SR_FRESH = { BASE_F:40, WARN_HU:80, CRITICAL_HU:150 };
function srFreshHeat(hourly, startTs, now) {
  const smooth = t => Math.max(32, t - 3);
  const past = (hourly || []).filter(h => h.ts >= (startTs || now) && h.ts <= now);
  const future = (hourly || []).filter(h => h.ts > now);
  const currentHU = past.reduce((s, h) => s + Math.max(0, smooth(h.temp) - SR_FRESH.BASE_F), 0);
  let proj = currentHU, warnEta = null, critEta = null;
  for (const h of future) {
    proj += Math.max(0, smooth(h.temp) - SR_FRESH.BASE_F);
    if (!warnEta && proj >= SR_FRESH.WARN_HU) warnEta = h.ts;
    if (!critEta && proj >= SR_FRESH.CRITICAL_HU) critEta = h.ts;
    if (critEta) break;
  }
  let bestBoilStart = null;
  for (let i = 0; i < future.length - 3; i++) if (future.slice(i, i + 3).every(h => h.temp < 45)) { bestBoilStart = future[i].ts; break; }
  const cur = (hourly || []).find(h => Math.abs(h.ts - now) < 1800000);
  const pct = Math.min(100, (currentHU / SR_FRESH.CRITICAL_HU) * 100);
  return { currentHU, pct, warnEta, critEta, bestBoilStart, currentTemp: cur ? cur.temp : null,
    level: pct < 40 ? 'fresh' : pct < 70 ? 'soon' : 'now', elapsedH: startTs ? (now - startTs) / 3600000 : 0 };
}

// ── Boil session readings (cutover: the Boil screen's readings chart) ────────
// sg_boil_session keeps its fields ({ start, sap, syrup, tempF }) and gains an
// optional readings list: [{ t, tempF, brix?, draw? }] (draw in the display unit,
// like sap and syrup here, because logBoil writes them to sg_logs2 as entered). A session saved
// before this had no list and reads as empty. tempF stays the latest pan
// temperature and syrup the total drawn, so everything that read them before
// reads them the same way.
function srBoilAddReading(sess, r) {
  if (!sess || !sess.start) return sess;
  const t = Number(r.t), tempF = Number(r.tempF), brix = r.brix === '' || r.brix == null ? null : Number(r.brix);
  const draw = r.draw === '' || r.draw == null ? 0 : Number(r.draw);
  if (!isFinite(t) || !isFinite(tempF)) return sess;
  const rd = { t, tempF: Math.round(tempF * 100) / 100 };
  if (brix != null && isFinite(brix) && brix > 0) rd.brix = Math.round(brix * 10) / 10;
  if (isFinite(draw) && draw > 0) rd.draw = Math.round(draw * 100) / 100;
  const readings = [...(Array.isArray(sess.readings) ? sess.readings : []), rd].sort((a, b) => a.t - b.t);
  return { ...sess, tempF: readings[readings.length - 1].tempF, syrup: Math.round(((sess.syrup || 0) + (rd.draw || 0)) * 10) / 10, readings };
}
// Series for the chart and the stat cards. temp: every reading; brix: readings
// that carry one. The session's own starting temperature is the first point.
function srBoilSeries(sess) {
  if (!sess || !sess.start) return { temp: [], brix: [], lastBrix: null, lastTemp: null, draws: 0 };
  const rs = (Array.isArray(sess.readings) ? sess.readings : []).filter(r => r && isFinite(r.t) && isFinite(r.tempF));
  const temp = rs.map(r => ({ ms: r.t, v: r.tempF }));
  const brix = rs.filter(r => r.brix > 0).map(r => ({ ms: r.t, v: r.brix }));
  const lb = brix.length ? brix[brix.length - 1] : null;
  return { temp, brix, lastBrix: lb ? lb.v : null, lastBrixAt: lb ? lb.ms : null,
    lastTemp: rs.length ? rs[rs.length - 1].tempF : (isFinite(sess.tempF) ? sess.tempF : null), draws: rs.filter(r => r.draw > 0).length };
}

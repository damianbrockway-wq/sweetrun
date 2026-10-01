// ─── Fix pass 1: one source for each number (formula band, pure) ────────────
// The 2027 season test found the same fact computed several ways on different
// screens: four tap counts, two Brix sources, a pan rate that ignored the setup,
// a fuel price that ignored the fuel. Each fact now has ONE function here, and
// every screen reads it (through the selectors in 25-rs-selectors.jsx). Nothing
// here reads storage or the DOM; tests/fix1.test.mjs evaluates this code.

// ── 1 · Tap count ────────────────────────────────────────────────────────────
// The season's taps: the setup's planned taps when set, else the taps on the
// mapped trees when that is more than 0, else the trees setting.
//   o: { wizard: sg_wizard_data, pins: sg_lines_pins, trees: sg_trees }
// Returns the count, where it came from, and both other counts so a screen can
// say "640 planned · 28 mapped" when the plan and the map disagree.
function srTaps(o) {
  const w = (o && o.wizard) || {};
  const pl = parseInt(w.recTaps, 10);
  const planned = pl > 0 ? pl : null;
  const tp = ((o && o.pins) || []).filter(p => p && p.type === 'tree');
  const mapped = tp.reduce((s, p) => s + (Math.max(0, parseInt(p.taps, 10) || 0)), 0);
  const trees = Math.max(0, parseInt(o && o.trees, 10) || 0);
  const src = planned != null ? 'plan' : mapped > 0 ? 'map' : 'trees';
  const taps = src === 'plan' ? planned : src === 'map' ? mapped : trees;
  return { taps, src, planned, mapped, mappedTrees: tp.length, trees, differ: planned != null && mapped > 0 && mapped !== planned };
}

// ── 2 · The setup's choices: pan, fuel and its price ─────────────────────────
// The setup offers pan sizes by key; PAN_SIZES holds them by index (sg_panIdx).
// Every key resolves to its own size (2×8 is 35 GPH, 4×14 is 163 GPH); an unknown
// key is null, so nothing silently becomes the 2×4.
function srPanIdxOf(key) {
  const m = String(key || '').toLowerCase().replace(/\s/g, '').match(/^(\d+)[x×](\d+)/);
  if (!m) return null;
  const i = PAN_SIZES.findIndex((p, k) => k !== CUSTOM_PAN_IDX && p.label.replace(/\s/g, '').startsWith(`${m[1]}×${m[2]}ft`));
  return i >= 0 ? i : null;
}
// The one evaporator rate (gal/h): a rate he typed (sg_pan_rate), else the pan he
// picked (sg_panIdx, custom W×H at 2.5 gal/h per sq ft), else the setup's pan
// when the pan was never picked. src says which.
function srEvapRateOf(o) {
  const typed = parseFloat(o && o.customRate);
  const stored = o && o.panIdx != null && o.panIdx !== '';
  const wizIdx = srPanIdxOf(o && o.wizardPan);
  const idx = stored ? (parseInt(o.panIdx, 10) || 0) : (wizIdx != null ? wizIdx : 0);
  const er = srEvapRate(idx, o && o.panW, o && o.panH, typed > 0 ? typed : '');
  return { rate: er.rate, panIdx: idx, src: typed > 0 ? 'typed' : stored ? 'pan' : wizIdx != null ? 'wizard' : 'default', er };
}
// What a unit of each fuel usually costs when he never typed a price. Firewood keeps
// the old default ($300 a cord); the others were showing $300 a gallon of oil.
const SR_FUEL_DEFAULT_COST = { 'Firewood (cord)': 300, 'Oil (gallon)': 3.75, 'Propane (gallon)': 2.75, 'Natural Gas (ccf)': 1.5 };
const srFuelDefaultCost = label => SR_FUEL_DEFAULT_COST[label] != null ? SR_FUEL_DEFAULT_COST[label] : 300;
// The price of one unit of his fuel (a cord, a gallon, a ccf). sg_fuelcost was written on
// every start-up with the shell's default, $300 (a cord's price), whatever the fuel; so a stored
// 300 for a fuel that is not firewood is read as "never set" and that fuel's own default is used.
// Read only: nothing stored changes until he edits the price. (The setup's "fuel for the
// season" is a season total, not a unit price; it goes to Break-even, not here.)
function srFuelCostOf(fuelLabel, stored) {
  const n = parseFloat(stored);
  if (stored === '' || stored == null || !(n >= 0)) return srFuelDefaultCost(fuelLabel);
  if (n === 300 && fuelLabel !== 'Firewood (cord)') return srFuelDefaultCost(fuelLabel);
  return n;
}
// Diagnose's vacuum choice before he picks one: what the setup said.
function srDxVacOf(wizard) {
  const s = (wizard || {}).systemType;
  return s === 'vacuum' ? 'high' : s === 'natural' ? 'vac15' : 'gravity';
}
// An RO is worth suggesting only to an operation that can use one. Buckets and
// small gravity sugarbushes boil what they collect; they get no RO advice.
function srRoAdviceFits(taps, wizard) {
  const w = wizard || {};
  if (w.collectionType === 'buckets') return false;
  return (parseInt(taps, 10) || 0) >= 250;
}

// ── 3 · Sap Brix ─────────────────────────────────────────────────────────────
// One Brix for the season, from what he measured: the Brix typed on sap entries
// (each weighted by the sap it describes) and the tree readings (sg_brixlog,
// each counted once). Per day: the weighted sap-entry Brix when there is one,
// else the mean of that day's tree readings. Latest = the newest such day.
// Season = the volume-weighted sap-entry Brix, else the tree mean, else the setting.
//   o: { slog, brixlog, season, setting }   (brixlog rows outside the season are left out)
function srBrixSource(o) {
  const slog = (o && o.slog) || {}, season = o && o.season;
  const setting = parseFloat(o && o.setting) > 0 ? parseFloat(o.setting) : 2.0;
  const dayOf = d => { const p = srDateParts(d); return p ? srIsoOf(new Date(p.y, p.mo - 1, p.d, 12)) : null; };
  const sapRows = (slog.sapCollected || []).map(e => ({ d: dayOf(e.date), b: parseFloat(e.brix), w: parseFloat(e.val) }))
    .filter(r => r.d && r.b > 0 && r.b < 20 && r.w > 0);
  const treeRows = ((o && o.brixlog) || []).map(e => ({ d: dayOf(e.date), b: parseFloat(e.brix), id: e.id || 0 }))
    .filter(r => r.d && r.b > 0 && r.b < 20 && (season == null || srSeasonOf(r.d) === +season));
  const days = {};
  sapRows.forEach(r => { const x = days[r.d] = days[r.d] || { sw: 0, sb: 0, tn: 0, tb: 0 }; x.sw += r.w; x.sb += r.b * r.w; });
  treeRows.forEach(r => { const x = days[r.d] = days[r.d] || { sw: 0, sb: 0, tn: 0, tb: 0 }; x.tn++; x.tb += r.b; });
  const series = Object.keys(days).sort().map(d => { const x = days[d];
    return x.sw > 0 ? { date: d, brix: x.sb / x.sw, from: 'sap' } : { date: d, brix: x.tb / x.tn, from: 'tree' }; });
  const last = series[series.length - 1] || null;
  const sw = sapRows.reduce((s, r) => s + r.w, 0);
  const avg = sw > 0 ? sapRows.reduce((s, r) => s + r.b * r.w, 0) / sw
    : treeRows.length ? treeRows.reduce((s, r) => s + r.b, 0) / treeRows.length : null;
  const vals = series.map(x => x.brix);
  return {
    brix: last ? last.brix : setting, date: last ? last.date : null, from: last ? last.from : 'setting',
    season: avg != null ? avg : setting, seasonFrom: sw > 0 ? 'sap' : treeRows.length ? 'tree' : 'setting',
    series, n: sapRows.length + treeRows.length, nSap: sapRows.length, nTree: treeRows.length,
    min: vals.length ? Math.min(...vals) : null, max: vals.length ? Math.max(...vals) : null,
  };
}

// ── 5 · Boil: what the pan should have made so far ───────────────────────────
// Syrup expected from the sap fed in when he counted it (sap in at the feed's
// Brix, Rule of 86), else from the evaporator rate over the hours boiled. The
// feed is RO concentrate when he runs an RO, so its Brix (not the raw sap's)
// sets the ratio. Gallons in, gallons out.
//   o: { evapGph, hrs, sapInGal, sapBrix, concBrix, ro }
function srBoilExpected(o) {
  const feed = o && o.ro && parseFloat(o.concBrix) > parseFloat(o.sapBrix) ? parseFloat(o.concBrix) : (parseFloat(o && o.sapBrix) || 2.0);
  const sapIn = parseFloat(o && o.sapInGal) || 0;
  const byRate = srSyrupRate(parseFloat(o && o.evapGph) || 0, feed) * Math.max(0, parseFloat(o && o.hrs) || 0);
  const bySap = sapIn > 0 ? syrupY(sapIn, feed) : null;
  return { gal: bySap != null ? bySap : byRate, by: bySap != null ? 'sap' : 'rate', feedBrix: feed, perHour: srSyrupRate(parseFloat(o && o.evapGph) || 0, feed) };
}

// ── 6, 7 · Tonight and freezing ──────────────────────────────────────────────
// The night ahead: a daily low is the low of that calendar day, which is mostly
// its early morning. So tonight's low is TOMORROW's daily low, until 5 am, when
// the night still under way is today's.
const srTonightIsoOf = (todayIso, minutes) => minutes < 300 ? todayIso : srIsoAdd(todayIso, 1);
// Sap stops running below freezing. Full-tank time projected hour by hour from the
// hourly forecast, adding the fill rate only in hours above 32°F; null when it
// does not fill in the forecast, or there is no rate. Without an hourly forecast,
// a reading at or below freezing pauses the fill.
//   o: { levelGal, capGal, fillGalH, now, hourly: [{ ts, temp }], tempF }
function srTankFull(o) {
  const lvl = +o.levelGal || 0, cap = +o.capGal || 0, rate = +o.fillGalH || 0, now = +o.now || 0;
  if (!(cap > 0) || !(rate > 0)) return { atMs: null, paused: false, rateNow: 0 };
  const hrs = (o.hourly || []).filter(h => h && isFinite(h.ts) && isFinite(h.temp)).sort((a, b) => a.ts - b.ts);
  const near = hrs.length ? hrs.reduce((b, h) => Math.abs(h.ts - now) < Math.abs(b.ts - now) ? h : b, hrs[0]) : null;
  const tNow = o.tempF != null && isFinite(o.tempF) ? +o.tempF : near && Math.abs(near.ts - now) <= 5400000 ? near.temp : null;
  const paused = tNow != null && tNow <= 32;
  if (lvl >= cap) return { atMs: now, paused, rateNow: paused ? 0 : rate };
  if (!hrs.length) return { atMs: paused ? null : now + (cap - lvl) / rate * 3600000, paused, rateNow: paused ? 0 : rate };
  let left = cap - lvl, t = now;
  const end = hrs[hrs.length - 1].ts + 3600000;
  while (t < end) {
    const h = hrs.reduce((b, x) => x.ts <= t ? x : b, hrs[0]);
    const step = Math.min(3600000, end - t);
    if (h.temp > 32) { const add = rate * step / 3600000; if (add >= left) return { atMs: t + left / rate * 3600000, paused, rateNow: paused ? 0 : rate }; left -= add; }
    t += step;
  }
  return { atMs: null, paused, rateNow: paused ? 0 : rate };
}

// ── 11 · Seasons follow the date ─────────────────────────────────────────────
// A maple season is named for the year its sap runs. December (and the summer and
// fall before it) belong to the coming season: a Dec-Jan run is next year's.
// The season's window is Jul 1 of the year before to Jun 30.
function srSeasonOf(dateLike) {
  const p = srDateParts(dateLike); if (!p) return null;
  return p.mo >= 7 ? p.y + 1 : p.y;
}
const srSeasonWindow = season => ({ start: `${+season - 1}-07-01`, end: `${+season}-06-30` });
function srInSeason(dateLike, season) { return srSeasonOf(dateLike) === +season; }
// Where the run stands: running (day N), over (lasted N days: the season was closed,
// or the last sap is two weeks old and it is April or later), or not started.
//   o: { slog, todayIso, closed }
function srRunState(o) {
  const s = (o && o.slog) || {}, today = o.todayIso;
  const isoOf = d => { const p = srDateParts(d); return p ? srIsoOf(new Date(p.y, p.mo - 1, p.d, 12)) : null; };
  const days = (s.sapCollected || []).filter(e => parseFloat(e.val) > 0).map(e => isoOf(e.date)).filter(d => d && d <= today).sort();
  if (!days.length) return { kind: 'none', first: null, last: null, day: null, length: null };
  const first = days[0], last = days[days.length - 1];
  const length = srDaysBetween(first, last) + 1;
  const month = parseInt(String(today).slice(5, 7), 10);
  const quiet = srDaysBetween(last, today) > 14 && month >= 4 && month < 7;
  const gone = srSeasonOf(today) !== srSeasonOf(last);
  if (o.closed || quiet || gone) return { kind: 'over', first, last, day: null, length };
  return { kind: 'running', first, last, day: srDaysBetween(first, today) + 1, length };
}

// ── 10 · Grades ──────────────────────────────────────────────────────────────
// The season's syrup by grade: the grade on each syrup entry; syrup logged with no
// grade takes the grade mix of the season's batches (sg_batches, which always carry
// one), up to the batches' own volume. What is still unknown stays "none".
// Volumes in the display unit (callers pass converted entries and batches).
const SR_BATCH_GRADE_NAME = { golden: 'Golden Delicate', amber: 'Amber Rich', dark: 'Dark Robust', vdark: 'Very Dark Strong' };
function srGradeMix(syrupEntries, batches, season) {
  const g = {};
  let graded = 0, ungraded = 0;
  (syrupEntries || []).forEach(e => { const v = parseFloat(e && e.val) || 0; if (!(v > 0)) return;
    if (e.grade && e.grade !== '—') { g[e.grade] = (g[e.grade] || 0) + v; graded += v; } else ungraded += v; });
  const bg = {}; let bTot = 0;
  (batches || []).forEach(b => { if (!b || (season != null && b.date && srSeasonOf(b.date) !== +season)) return;
    const v = parseFloat(b.syrupOut) || 0; if (!(v > 0)) return; const name = SR_BATCH_GRADE_NAME[b.grade] || SR_BATCH_GRADE_NAME.amber;
    bg[name] = (bg[name] || 0) + v; bTot += v; });
  let fromBatches = 0;
  if (bTot > 0) {
    // Only the syrup nobody graded takes batch grades; with no syrup entries at all, the batches are the record.
    const share = (syrupEntries || []).length ? Math.min(ungraded, bTot) : bTot;
    Object.keys(bg).forEach(k => { const v = share * bg[k] / bTot; if (v > 0) { g[k] = (g[k] || 0) + v; fromBatches += v; } });
    ungraded = Math.max(0, ungraded - Math.min(ungraded, share));
  }
  if (ungraded > 0) g.none = ungraded;
  const total = Object.keys(g).reduce((s, k) => s + g[k], 0);
  return { grades: g, total, graded: graded + fromBatches, fromBatches };
}

// ── 13 · Fuel on a running pump: one verdict everywhere ──────────────────────
// low: under the "fuel low" hours (4 by default) · night: after 5 pm and dry before
// morning (under 12 h) · ok. The same word on the Season card, Pumps, the pump's
// own page and Watch.
function srFuelState(fuel, minutes, prefs) {
  const h = fuel && fuel.hoursLeft;
  if (h == null || !isFinite(h)) return 'none';
  const lowH = (prefs && prefs.fuelLowH) || 4;
  if (h <= lowH) return 'low';
  if (minutes >= 17 * 60 && h <= 12) return 'night';
  return 'ok';
}

// ── 14 · Numbers he types ────────────────────────────────────────────────────
// A typed value checked against the field's range. Never clamped quietly: the
// screen shows why it was refused. kind: 'empty' | 'bad' | 'low' | 'high' | 'ok'.
function srCheckNum(raw, min, max) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return { kind: 'empty', n: null };
  if (/[eE]/.test(s) || /^-/.test(s) || /[^\d.,\s]/.test(s)) return { kind: 'bad', n: null };
  const n = srParseNum(s);
  if (n == null || !isFinite(n)) return { kind: 'bad', n: null };
  if (min != null && n < min) return { kind: 'low', n };
  if (max != null && n > max) return { kind: 'high', n };
  return { kind: 'ok', n };
}
// Sap in one day, per tap, in gallons. Over 3 gal a tap is more than a very good
// vacuum day gives; the sheet asks before saving it. null when taps are unknown.
const SR_SAP_DAY_MAX_PER_TAP = 3;
function srSapDayCheck(dayGal, taps) {
  const t = parseInt(taps, 10) || 0;
  if (!(t > 0) || !(dayGal > 0)) return null;
  const per = dayGal / t;
  return { per, high: per > SR_SAP_DAY_MAX_PER_TAP };
}
// Decimals to show a typed amount with: the field's own, or as many as he typed (up to 2).
function srDpOf(n, dp) {
  const s = String(n); const m = s.match(/\.(\d+)$/);
  return Math.max(dp || 0, m ? Math.min(2, m[1].length) : 0);
}

// ── 16 · A boil left running ─────────────────────────────────────────────────
// More than this many hours between start and end is asked about, not logged as is.
const SR_BOIL_LONG_H = 16;

// ── 18 · CSV ─────────────────────────────────────────────────────────────────
// RFC 4180 rows: quoted fields keep their commas ("1,450") and doubled quotes.
function srCsvRows(text) {
  const rows = []; let row = [], f = '', q = false;
  const s = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += ch;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.map(r => r.map(x => x.trim())).filter(r => r.some(x => x !== ''));
}
// A number from a CSV cell: "1,450" and "1 450" are thousands, "2,5" alone a decimal.
function srCsvNum(x) {
  let s = String(x == null ? '' : x).trim().replace(/[\s ]/g, '').replace(/^\$/, '');
  if (!s) return 0;
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) && /^-?[\d.]+$/.test(s) ? n : 0;
}
// A header cell split into words, so "Syrup produced" never reads as RO.
const srCsvWords = h => String(h || '').toLowerCase().replace(/[()\[\]_\-\/.:]+/g, ' ').replace(/r\s+o\b/g, 'ro').split(/\s+/).filter(Boolean);
// SweetRun's own CSV export: Type,Date,Value,Unit,Note, one row per entry, Type in
// English or French. Kinds by their label in either language.
const SR_CSV_KIND_LABELS = {
  sapCollected: ['sap collected', 'sève récoltée', 'sapcollected'],
  syrupMade: ['syrup made', 'sirop produit', 'syrupmade'],
  sapRO: ['sap through r/o', 'sap thru r/o', 'sap through ro', 'sève par o/i', 'sapro'],
  sapEvap: ['sap in evaporator', 'sève à l\'évaporateur', 'sapevap'],
  fuelUsed: ['fuel burned', 'fuel used', 'combustible brûlé', 'fuelused'],
  boilHours: ['hours boiling', 'boil hours', 'heures d\'ébullition', 'boilhours'],
};

// ── 19 · Boundary import ─────────────────────────────────────────────────────
// A new file merged with the saved one: a file with no polygon (lines only) keeps
// the saved boundary and replaces only the traced lines. A file with a polygon
// replaces the boundary, which the screen asks about first.
const srGeoFeats = gj => gj ? (gj.type === 'FeatureCollection' ? (gj.features || []) : [gj]).filter(f => f && f.geometry) : [];
function srMergeBoundary(oldGj, newGj) {
  const oldF = srGeoFeats(oldGj), newF = srGeoFeats(newGj);
  const isPoly = f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon';
  const oldPoly = oldF.filter(isPoly), newPoly = newF.filter(isPoly);
  if (!newPoly.length && oldPoly.length) return { gj: { type: 'FeatureCollection', features: [...oldPoly, ...newF] }, kept: oldPoly.length, replaces: false };
  return { gj: { type: 'FeatureCollection', features: newF }, kept: 0, replaces: oldPoly.length > 0 && newPoly.length > 0 };
}
// Coordinates a map can hold (lat -90..90, lon -180..180).
const srGeoOk = c => Array.isArray(c) && isFinite(c[0]) && isFinite(c[1]) && Math.abs(c[1]) <= 90 && Math.abs(c[0]) <= 180;

// ── 20 · Restore ─────────────────────────────────────────────────────────────
// A restore makes the sg_ keys match the backup exactly: every key in the backup is
// written, and every sg_ key the backup does not have is removed. Kept from this
// device whatever the backup says: the Season Pass key and the trial's own records
// (this device's license and trial, not the backup's), the session counter, and the
// language this device reads in. A kept key the device does not have yet comes
// from the backup.
const SR_RESTORE_KEEP = ['sg_license', 'sg_trial_start', 'sg_trial_pinged', 'sg_email_prompted', 'sg_sessions', 'sg_lang'];
function srRestorePlan(deviceKeys, backupEntries) {
  const bk = new Map((backupEntries || []).filter(([k, v]) => /^sg_/.test(k) && typeof v === 'string'));
  const dev = new Set((deviceKeys || []).filter(k => /^sg_/.test(k)));
  const set = [], remove = [], keep = [];
  bk.forEach((v, k) => { if (SR_RESTORE_KEEP.includes(k) && dev.has(k)) keep.push(k); else set.push([k, v]); });
  dev.forEach(k => { if (!bk.has(k)) { if (SR_RESTORE_KEEP.includes(k)) keep.push(k); else remove.push(k); } });
  const bad = set.filter(([, v]) => { try { JSON.parse(v); return false; } catch { return true; } }).map(([k]) => k);
  return { set, remove, keep: [...new Set(keep)].sort(), bad };
}

// ── 15 · Entries dated outside their season ─────────────────────────────────
// A season's dated views (the chart, day of the run, season length, best day) use
// only entries inside its window; an entry typed as 1999 or 2031 no longer makes
// an 11,873-day season. Totals still count every entry (it is real sap or syrup);
// `outside` says how many need their date fixed.
function srSlogDated(slog, season) {
  const s = slog || {};
  if (season == null) return { slog: s, outside: 0 };
  let outside = 0; const out = {};
  Object.keys(s).forEach(k => {
    if (!Array.isArray(s[k])) { out[k] = s[k]; return; }
    out[k] = s[k].filter(e => { const ok = !e || !e.date || srInSeason(e.date, season); if (!ok) outside++; return ok; });
  });
  return { slog: out, outside };
}

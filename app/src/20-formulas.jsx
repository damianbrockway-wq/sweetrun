// ─── Formulas ─────────────────────────────────────────────────────────────────
const RULE_DIVISOR = 86.4;   // one divisor for the theoretical ratio, everywhere (Jones-derived, 66°Bx)
const rule86   = b => b > 0 ? RULE_DIVISOR / b : 0;
const jones87  = b => b > 0 ? 87 / b : 0;
const syrupY   = (sap, b) => b > 0 ? sap / rule86(b) : 0;
const boilTime = (sap, b, r) => r > 0 && b > 0 ? (sap - syrupY(sap, b)) / r : 0;
const finTemp  = bp => bp + 7.1;
const denCorr  = t => (t - 68) * 0.03166;
// °Brix ↔ °Baumé for maple SYRUP densities, cold test (60°F).
// Anchored on the industry reference point 66.9 °Brix = 36.0 °Bé
// (Leader Evaporator / CDL density tables). The old bx*0.6879 gave 46.0 °Bé
// at 66.9 Brix, which is not a maple figure at all.
// Hot test on the same syrup reads ~32.0 °Bé at 211°F — see BE_HOT_NOTE.
const BE_BRIX_REF = 59.0, BE_AT_REF = 32.0, BE_PER_BRIX = 0.50594;
const BE_HOT_NOTE = 'Cold test at 60°F. The same syrup reads about 32.0° Bé hot at 211°F.';
const brixToBe = bx => BE_AT_REF + BE_PER_BRIX * (bx - BE_BRIX_REF);
const beToBrix = be => BE_BRIX_REF + (be - BE_AT_REF) / BE_PER_BRIX;
const altToBP  = ft => 212 - ft * 0.0018;
const presToBP = p => 212 + (p - 29.92) * 1.8;
const roConc   = (sap, sb, tb) => tb > 0 && sb > 0 ? sap * (sb / tb) : 0;

// Boil Day dial (Pass 6): the pan-temp state machine and the gauge geometry,
// here so the tests lock them. Draw-off = finTemp(bp); the band is ±0.3°F
// (the resolution of a good syrup thermometer); "approaching" begins 2°F out.
// finTemp is rounded to 0.1 so band edges compare cleanly against pan temps
// the producer steps in 0.1 increments (212 + 7.1 is not exact in floats).
const BD_BAND_F = 0.3, BD_NEAR_F = 2.0;
function srBoilState(tempF, bpF) {
  const fin = Math.round(finTemp(bpF) * 10) / 10;
  if (tempF > fin + BD_BAND_F) return 'over';
  if (tempF >= fin - BD_BAND_F) return 'draw';
  if (tempF >= fin - BD_NEAR_F) return 'near';
  return 'warming';
}
// 0..1 position of a value along the dial arc, clamped to the arc.
const srGaugeFrac = (v, lo, hi) => hi > lo ? Math.min(1, Math.max(0, (v - lo) / (hi - lo))) : 0;

// Boil rates from UNH Cooperative Extension's published evaporator table.
// The old figures ran ~0.75 gal/hr per sq ft, which is a flat-pan number applied
// to flue rigs; real flue evaporators run 2 to 3 gal/hr per sq ft.
// Every producer's rig differs — the Custom Boil Rate field overrides all of this.
const PAN_SIZES = [
  { label: '2×4 ft (~16 GPH)',  area: 8,  rate: 16  },
  { label: '2×6 ft (~25 GPH)',  area: 12, rate: 25  },
  { label: '2×8 ft (~35 GPH)',  area: 16, rate: 35  },
  { label: '3×8 ft (~70 GPH)',  area: 24, rate: 70  },
  { label: '3×10 ft (~85 GPH)', area: 30, rate: 85  },
  { label: '4×12 ft (~140 GPH)',area: 48, rate: 140 },
  { label: '4×14 ft (~163 GPH)',area: 56, rate: 163 },
  { label: '5×16 ft (~232 GPH)',area: 80, rate: 232 },
  { label: 'Custom size…',      area: 0,  rate: 0   },
];
const CUSTOM_PAN_IDX = PAN_SIZES.length - 1;
const FUELS = [
  // One cord of seasoned hardwood boils roughly 25 gal of syrup, about 1,000 gal
  // of 2° sap (USDA Forest Service; North American Maple Syrup Producers Manual).
  // The old 200 was five times pessimistic.
  { label: 'Firewood (cord)', labelFr: 'Bois de chauffage (corde)', unit: 'cord', unitFr: 'corde', spu: 1000 },
  { label: 'Oil (gallon)',    labelFr: 'Huile (gallon)',             unit: 'gal',  unitFr: 'gal',   spu: 10  },
  { label: 'Propane (gallon)',labelFr: 'Propane (gallon)',           unit: 'gal',  unitFr: 'gal',   spu: 7   },
  { label: 'Natural Gas (ccf)',labelFr: 'Gaz naturel (ccf)',          unit: 'ccf',  unitFr: 'ccf',   spu: 7   },
];
const fuelLabel = (f, lang) => lang === 'fr' ? (f.labelFr || f.label) : f.label;
const SPOUTS = [
  { label: '5/16" (Health Spout)', bit: '5/16"', depth: '1.5–2 in', note: 'Best for tree health & vacuum' },
  { label: '7/16" (Standard)',     bit: '7/16"', depth: '1.5–2 in', note: 'Traditional size' },
  { label: '19/64" (Drops)',       bit: '19/64"',depth: '1.5–2 in', note: 'For drop lines' },
];
// DE per plate scaled from Smoky Lake baseline (3.25 cups per 7" window plate)
// Area-proportional: 10" = 3.25×(10²/7²)≈6.6, 12" = 3.25×(12²/7²)≈9.5
const PLATE_CUPS = { '7" plates': 3.25, '10" plates': 6.6, '12" plates': 9.5 };
const ALT_REF = [
  { alt:'0 ft',     bp:212.0, fin:219.1 },
  { alt:'500 ft',   bp:211.1, fin:218.2 },
  { alt:'1,000 ft', bp:210.2, fin:217.3 },
  { alt:'1,500 ft', bp:209.3, fin:216.4 },
  { alt:'2,000 ft', bp:208.4, fin:215.5 },
  { alt:'2,500 ft', bp:207.5, fin:214.6 },
  { alt:'3,000 ft', bp:206.6, fin:213.7 },
];
const PRE_TASKS = [
  'Inspect and flush all tubing lines',
  'Check mainline for leaks or damage',
  'Install/replace taps and spouts',
  'Clean and sanitize evaporator pans',
  'Test vacuum system and pump',
  'Inspect R/O membranes and fittings',
  'Clean and sanitize sap storage tanks',
  'Stock up on filter media and supplies',
  'Check fuel levels (wood, oil, propane)',
  'Calibrate thermometers and hydrometers',
];
const POST_TASKS = [
  'Pull all taps and clean spouts',
  'Blow out and dry all tubing lines',
  'Clean and flush evaporator pans thoroughly',
  'Clean and store R/O system with preservative',
  'Drain and sanitize all sap storage tanks',
  'Inventory taps and fittings needing replacement',
  'Note any tubing repairs needed for next year',
  'Clean and store filter press / filter supplies',
  'Record final season totals and notes',
  'Cover and protect evaporator for off-season',
];

// ─── Yield model ─────────────────────────────────────────────────────────────
// ONE set of numbers for gallons of syrup per tap per season. The app used to
// carry five different sets — the wizard, the Tapping tab, the Log goal, the
// Recap goal and the Diagnose benchmark all disagreed, by up to 2x on the same
// sugarbush. Everything now reads from here.
//
//   buckets / forest gravity   0.20–0.30   Cornell & Penn State, stated directly
//                                          ("about one quart of syrup per tap")
//   gravity 5/16" tubing       0.30–0.45   derived from Childs 2016 (18.4–25.8 gal sap)
//   3/16" natural vacuum       0.35–0.50   derived from Childs 2016 (21.7–25.5 gal sap)
//   mechanical vacuum          0.45–0.70   derived from gravity + 13.5 gal sap
//                                          (UVM Proctor via OSU Extension)
// The derived rows assume 2.0°Brix sap. USDA NASS puts the US average across all
// methods at 0.311–0.357 gal/tap, which is the sanity check on any of this.
// The honest caveat: the normal band is wide. Maine fell 27% year over year while
// New York rose in the same season, so a producer below the range is not
// necessarily doing anything wrong.
const YIELD_MODELS = {
  buckets: { low: 0.20, high: 0.30, label: 'buckets' },
  gravity: { low: 0.30, high: 0.45, label: 'gravity tubing' },
  natural: { low: 0.35, high: 0.50, label: '3/16" natural vacuum' },
  vacuum:  { low: 0.45, high: 0.70, label: 'mechanical vacuum' },
};
const NASS_US_AVG = 0.33;   // USDA NASS, gal syrup per tap, all methods
function yieldModelFor(systemType, collectionType) {
  if (systemType === 'vacuum')     return YIELD_MODELS.vacuum;
  if (systemType === 'natural')    return YIELD_MODELS.natural;
  if (collectionType === 'buckets')return YIELD_MODELS.buckets;
  return YIELD_MODELS.gravity;
}
// For any tab that does not carry the wizard answers as props.
function yieldModelSaved() {
  const w = ls.get('sg_wizard_data', {}) || {};
  return yieldModelFor(w.systemType, w.collectionType);
}
const yieldMidOf = m => (m.low + m.high) / 2;

function tapsPer(dbh) {
  // Tap count is based on tree size only — vacuum increases yield per tap, not tap count
  if (dbh < 10) return 0;
  if (dbh < 18) return 1;
  if (dbh < 25) return 2;
  return 3;
}

// ─── Shared season metrics ───────────────────────────────────────────────────
// ONE computation of the season totals. Today, Log, Recap, SugarSage and
// Diagnose each used to sum the entry arrays themselves; five copies of the
// same reduce is how 808 gal and 810 gal end up on screen for one season.
// Every screen reads these. Diagnose wraps the results in its own gal
// normalization (stored values are in the user's display unit).
function seasonTotals(slog) {
  const sum = arr => (arr || []).reduce((s, e) => s + (parseFloat(e.val) || 0), 0);
  const s = slog || {};
  return {
    sapT:   sum(s.sapCollected),
    syT:    sum(s.syrupMade),
    roT:    sum(s.sapRO),
    evapT:  sum(s.sapEvap),
    fuelT:  sum(s.fuelUsed),
    hoursT: sum(s.boilHours),
  };
}
// Log values are stored in whatever unit the sugarmaker works in, but every
// benchmark in this app — gal/tap yield models, gal-per-cord fuel rates, break-even
// prices — is in gallons. Screens that forgot to convert compared litres against
// gallon benchmarks: the same 500-tap season graded D in gallons and A in litres,
// because 50 gal of syrup read as 189 "gallons" per the same 500 taps. Diagnose
// had a local `_gal` and got it right; Recap, Today, Log and Equip did not.
//
// This is the one converter. The name carries the unit so that destructuring it
// into a variable called `sapGal` is true instead of merely hopeful — the naming
// is how the original fault hid in plain sight for so long.
const SR_L_PER_GAL = 3.78541;
const toGal   = (v, units) => units === 'L' ? v / SR_L_PER_GAL : v;   // display unit → canonical
const fromGal = (v, units) => units === 'L' ? v * SR_L_PER_GAL : v;   // canonical → display unit
function seasonTotalsGal(slog, units) {
  const T = seasonTotals(slog);
  return {
    sapGal:   toGal(T.sapT,   units),
    syrupGal: toGal(T.syT,    units),
    roGal:    toGal(T.roT,    units),
    evapGal:  toGal(T.evapT,  units),
    fuelT:    T.fuelT,   // fuel is cords/gal-of-oil/etc — its own unit, never litres
    hoursT:   T.hoursT,  // hours are hours
  };
}
// ─── Dates: one canonical format, tolerant reads ─────────────────────────────
// Entries used to be stamped with `new Date().toLocaleDateString()` and read back
// with `new Date(str)`. That only round-trips in en-US. An en-CA or fr-CA browser
// stores ISO ("2026-03-15"), which `new Date()` reads as UTC midnight and renders
// a day early everywhere; fr-FR/en-GB/de-DE store "15/03/2026", which `new Date()`
// calls Invalid — so sorts (NaN-NaN = NaN, falsy) silently collapse to id order
// and "most recent" reduces keep whichever row happened to be first.
//
// Fix: write ISO going forward (srToday), and parse tolerantly on read so the
// locale strings already sitting in thousands of existing seasons still work.
// srDateMs turns any stored value into a sortable number; srDateShort formats for
// display at local noon so the calendar day can never slip across a timezone.
function srToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function srDateParts(str) {
  if (str == null) return null;
  const s = String(str).trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)))      return { y:+m[1], mo:+m[2], d:+m[3] }; // ISO (all new writes)
  // Legacy slash dates are the one genuinely ambiguous case: "05/03" could be
  // en-US May 3 or fr-FR 3 May, and nothing stored says which. The one reliable
  // signal is that a value >12 can only be the day, so A/B with A>12 is D/M/Y;
  // otherwise assume M/D/Y (the format the large majority of existing seasons
  // hold). New writes are ISO, so this only has to carry old data forward.
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    const a=+m[1], b=+m[2];
    return a>12 && b<=12 ? { y:+m[3], mo:b, d:a } : { y:+m[3], mo:a, d:b };
  }
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)))    return { y:2000+ +m[3], mo:+m[1], d:+m[2] };
  if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)))    return { y:+m[3], mo:+m[2], d:+m[1] }; // de D.M.Y
  const dd = new Date(s);                                   // last resort (Date.parse)
  return isNaN(dd) ? null : { y:dd.getFullYear(), mo:dd.getMonth()+1, d:dd.getDate() };
}
function srDateMs(str) {
  const p = srDateParts(str);
  return p ? new Date(p.y, p.mo-1, p.d, 12).getTime() : NaN;  // local noon: no TZ day-slip
}
function srDateShort(str, lang) {
  const p = srDateParts(str);
  if (!p) return String(str ?? '');
  return new Date(p.y, p.mo-1, p.d, 12).toLocaleDateString(lang==='fr' ? 'fr-CA' : 'en-US', { month:'short', day:'numeric' });
}
// The season's actual sap:syrup ratio; null until syrup has been made.
function actualRatio(sapT, syT) { return syT > 0 ? sapT / syT : null; }

// ─── Ratio sanity ────────────────────────────────────────────────────────────
// Sap:syrup has a floor set by the sugar in the sap — no evaporator makes a
// gallon of syrup from less sap than the sugar allows. A season under that floor
// is a data error (sap logged as syrup, a tank reading that gained a digit), not
// a miracle, and the app used to answer that case with 100/100 and an A.
//
// The floor is absolute, not a fraction of the sugarmaker's recorded brix. Brix
// is the field most likely to be left at its default, so a relative floor would
// flag honest seasons for the crime of running sweeter sap than they told the
// app — exactly the wrong error to make. Cornell and UVM put typical sweetness
// at 1.5–3%, with exceptional trees reaching 4–5%; nobody averages a season
// above 5. So 86.4/5 ≈ 17.3:1 is a line no real season crosses, whatever brix
// says, and anything under it has earned a question.
const SR_MAX_PLAUSIBLE_BRIX = 5;
const SR_RATIO_FLOOR = RULE_DIVISOR / SR_MAX_PLAUSIBLE_BRIX;
function ratioSuspect(sapT, syT) {
  if (!(sapT > 0 && syT > 0)) return false;
  return (sapT / syT) < SR_RATIO_FLOOR;
}

// ─── Season score — one model for the whole app ──────────────────────────────
// Recap's SweetRun Score and SugarSage's Season Intelligence each computed a
// score; the same season graded 46 on one screen and 37 on the other. Both now
// call this. Weighting is Recap's documented model: Yield/Tap 30 ·
// Evap Efficiency 40 · Fuel 20 · Data Complete 10.
function seasonScore({ sapT, syT, fuelT, taps, brix, yieldModel, fuelSpu }) {
  const b = parseFloat(brix) || 2.0;
  let yieldScore = null, effScore = null, fuelScore = null;
  const parts = [];
  // Impossible data is not a good season. When the ratio is under the physical
  // floor, the efficiency and yield numbers it feeds are both untrustworthy, so
  // neither is scored and no letter is issued until the entries are fixed.
  const suspect = ratioSuspect(sapT, syT);
  if (taps > 0 && syT > 0 && yieldModel && !suspect) {
    yieldScore = Math.min(100, Math.round(((syT / taps) / yieldMidOf(yieldModel)) * 100));
    parts.push({ score: yieldScore, weight: 30 });
  }
  if (sapT > 0 && syT > 0 && b > 0 && !suspect) {
    effScore = Math.min(100, Math.round(((RULE_DIVISOR / b) / (sapT / syT)) * 100));
    parts.push({ score: effScore, weight: 40 });
  }
  // Fuel-per-gallon divides by the same syrup total, so it inherits the doubt.
  // Everything the contradiction touches is withheld; only the count of what has
  // been logged survives, because logging is never what went wrong.
  if (fuelT > 0 && syT > 0 && fuelSpu > 0 && !suspect) {
    const bench = (RULE_DIVISOR / b) / fuelSpu;
    fuelScore = Math.min(100, Math.round((bench / (fuelT / syT)) * 100));
    parts.push({ score: fuelScore, weight: 20 });
  }
  const dataPts = [sapT > 0, syT > 0, taps > 0, fuelT > 0].filter(Boolean).length;
  const dataScore = Math.round((dataPts / 4) * 100);
  parts.push({ score: dataScore, weight: 10 });
  const totalWeight = parts.reduce((s, x) => s + x.weight, 0);
  const overall = totalWeight > 0
    ? Math.round(parts.reduce((s, x) => s + x.score * x.weight, 0) / totalWeight) : 0;
  // No letter until there is enough season to judge — same rule on both screens —
  // and none at all while the ratio says the entries contradict themselves.
  const graded = parts.length >= 3 && syT > 0 && !suspect;
  const grade = !graded ? '—' : overall >= 90 ? 'A' : overall >= 80 ? 'B' : overall >= 70 ? 'C' : overall >= 60 ? 'D' : 'F';
  return { yieldScore, effScore, fuelScore, dataScore, dataPts, overall, graded, grade, suspect };
}

// ─── Import dedupe ───────────────────────────────────────────────────────────
// Re-importing the same file used to double a season (Debug M4). Two entries
// are the same record when kind + date + value match exactly (imported rows
// carry no ids). Dedupe is against the EXISTING store only — a file that
// legitimately contains two identical rows still imports both the first time.
const srEntryKey = (kind, e) => `${kind}|${e.date}|${parseFloat(e.val) || 0}`;
function dedupeImport(existingSlog, additions) {
  const seen = new Set();
  Object.keys(additions).forEach(k =>
    (existingSlog[k] || []).forEach(e => seen.add(srEntryKey(k, e))));
  let addedCount = 0, skippedCount = 0;
  const added = {};
  Object.keys(additions).forEach(k => {
    added[k] = (additions[k] || []).filter(e => {
      const dup = seen.has(srEntryKey(k, e));
      if (dup) skippedCount++; else addedCount++;
      return !dup;
    });
  });
  return { added, addedCount, skippedCount };
}

// ─── Measure math (map measure tool) ─────────────────────────────────────────
// Producers order tubing and price leases off these numbers, so they live in
// the tested formula band. Sphere radius 6,378,137 m — the same radius the
// map's haversineFt uses (20,925,524 ft), so the two never disagree.
const SR_EARTH_M = 6378137;
const SR_M2_PER_ACRE = 4046.8564224;
const SR_M2_PER_HA   = 10000;
function srHaversineM(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * SR_EARTH_M * Math.asin(Math.sqrt(a));
}
// Spherical shoelace (Chamberlain–Duquette): signed area of a lat/lon ring in
// m², returned absolute. Points are {lat,lon}; the ring closes itself.
function srPolyAreaM2(pts) {
  if (!pts || pts.length < 3) return 0;
  const rad = d => d * Math.PI / 180;
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
    sum += rad(p2.lon - p1.lon) * (2 + Math.sin(rad(p1.lat)) + Math.sin(rad(p2.lat)));
  }
  return Math.abs(sum * SR_EARTH_M * SR_EARTH_M / 2);
}

// ─── Season replay (Pass 7) ──────────────────────────────────────────────────
// Pure data prep for Recap's replay stage. One step per logged DAY (any date
// carrying a sap or syrup entry). The sap entries are prepared with EXACTLY
// the map/filter/sort Recap's SapChart uses, so the replay's final frame is
// the Recap bar chart, bar for bar, and every running total is a cumulative
// sum of the same parseFloat(e.val) seasonTotals sums (invariant 4: same
// numbers, not a second computation). Dates stay the stored strings (debt #6:
// display strings, sorted with the chart's own comparator — inherited, not new).
function srReplaySteps(slog) {
  const s = slog || {};
  const prep = arr => (arr || [])
    .map(e => ({ date: e.date, val: parseFloat(e.val) || 0 }))
    .filter(e => e.val > 0 && e.date)
    .sort((a, b) => srDateMs(a.date) - srDateMs(b.date));
  const sap = prep(s.sapCollected), sy = prep(s.syrupMade);
  const byDay = new Map();
  const dayOf = d => {
    if (!byDay.has(d)) byDay.set(d, { date: d, bars: [], sapAdd: 0, syAdd: 0 });
    return byDay.get(d);
  };
  sap.forEach(e => { const st = dayOf(e.date); st.bars.push(e.val); st.sapAdd += e.val; });
  sy.forEach(e => { dayOf(e.date).syAdd += e.val; });
  const steps = [...byDay.values()].sort((a, b) => srDateMs(a.date) - srDateMs(b.date));
  let sapRun = 0, syRun = 0, boiled = false;
  steps.forEach(st => {
    sapRun += st.sapAdd; syRun += st.syAdd;
    st.sapRun = sapRun; st.syRun = syRun;
    st.firstBoil = !boiled && st.syAdd > 0;
    if (st.firstBoil) boiled = true;
  });
  return { steps, maxBar: Math.max(...sap.map(e => e.val), 1), entryCount: sap.length + sy.length };
}
// Notable moments for the captions — derived from data Recap already shows:
// best run is SapChart's highlighted max bar, first boil is the first
// syrupMade day, peak brix is the max of the same sg_brixlog values the Brix
// stats use (surfaced only when its date is a replay day — no invented days).
function srReplayMoments(steps, brixArr) {
  const m = [];
  let best = null;
  (steps || []).forEach(st => st.bars.forEach(v => { if (!best || v > best.val) best = { date: st.date, val: v }; }));
  if (best) m.push({ date: best.date, type: 'bestRun', val: best.val });
  const fb = (steps || []).find(st => st.firstBoil);
  if (fb) m.push({ date: fb.date, type: 'firstBoil' });
  let pk = null;
  (brixArr || []).forEach(e => {
    const v = parseFloat(e.brix);
    if (!isNaN(v) && v > 0 && (!pk || v > pk.val)) pk = { date: e.date, val: v };
  });
  if (pk && (steps || []).some(st => st.date === pk.date)) m.push({ date: pk.date, type: 'peakBrix', val: pk.val });
  return m;
}
// Step cadence: ~10s sweep, clamped 400–1600ms per day so a 3-day trial season
// doesn't crawl and a 30-day season doesn't blur (30 × 400ms = 12s worst case).
const srReplayStepMs = n => n > 0 ? Math.max(400, Math.min(1600, Math.round(10000 / n))) : 0;

// ─── Shared settings store ───────────────────────────────────────────────────
// One canonical key per cross-screen setting. Reads the canonical key first,
// falls back through the legacy keys (migrating the first value found forward
// via ls.set so old data keeps working), else the fallback. Syrup price used
// to live in four keys with three different values on screen at once.
function getSetting(key, legacyKeys, fallback) {
  const v = ls.get(key, undefined);
  if (v !== undefined && v !== null) return v;
  for (const lk of (legacyKeys || [])) {
    const lv = ls.get(lk, undefined);
    if (lv !== undefined && lv !== null) { ls.set(key, lv); return lv; }
  }
  return fallback;
}
// Canonical accessors. Fallback order: deliberate user entries first
// (change-only keys), then mount-persisted defaults, then the wizard's stored
// answer, then one app-wide default — never a second default contradicting
// the wizard.
const getSyrupPrice = () => getSetting('sg_price_syrup', ['sg_syrup_price', 'sg_dx_price', 'sg_bev_price'],
  parseFloat((ls.get('sg_wizard_data', {}) || {}).syrupPrice) || 40);
const getWoodCost   = () => getSetting('sg_cost_wood', ['sg_dx_wood'], 80);
const getLaborRate  = () => getSetting('sg_rate_labor', ['sg_dx_labor', 'sg_laborrate', 'sg_bev_lrate'], 15);


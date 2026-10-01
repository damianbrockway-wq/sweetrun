// ─── Run Sheet engine, part 2 (Phase 6): classic calculators, lifted ────────
// Still inside the formula band (before the "Shared UI" banner), so
// tests/runsheet.test.mjs evaluates exactly this code. Each function is the
// classic screen's arithmetic moved out of its component VERBATIM, so the new
// screens and the tests share one copy. No constant or formula is changed.
// Functions return numbers and ids, never sentences: the screens turn ids into
// words through rt(), so French and the no-dash copy rule live in one place.
//
// Units: every volume argument named *Gal is canonical gallons. Screens take
// input in the display unit and convert with toGal() before calling, and show
// results with fromGal(). (Several classic screens multiplied a result by
// 3.785 a second time in litre mode, or fed litres to a gal/h rate; converting
// at the edge is the fix, recorded in PHASE5-6-NOTES.md.)

// ── Break-even (BreakevenCalculator, 40-22) ──────────────────────────────────
const SR_BEV_SCENARIOS = [ { id:'bad', yld:0.14 }, { id:'avg', yld:0.22 }, { id:'great', yld:0.30 } ];
const SR_BEV_MAX_YLD = 0.35;
function srBreakeven(o) {
  const t        = Math.max(1, parseInt(o.taps) || 1);
  const fuel     = parseFloat(o.fuelCost) || 0;
  const price    = Math.max(0.01, parseFloat(o.price) || 40);
  const supCost  = parseFloat(o.supplies) || 0;
  const labor    = o.hobby ? 0 : (parseFloat(o.laborHrs) || 0) * (parseFloat(o.laborRate) || 0);
  const totalCost = fuel + supCost + labor;
  const bevGal   = price > 0 ? totalCost / price : 0;
  const bevPerTap = bevGal / t;
  const scenarios = SR_BEV_SCENARIOS.map(s => {
    const syrupGal = t * s.yld, revenue = syrupGal * price, profit = revenue - totalCost;
    return { id:s.id, yld:s.yld, syrupGal, revenue, profit,
      above: bevPerTap > 0 ? s.yld >= bevPerTap : true,
      barPct: Math.min(100, (s.yld / SR_BEV_MAX_YLD) * 100),
      bevPct: bevPerTap > 0 ? Math.min(100, (bevPerTap / SR_BEV_MAX_YLD) * 100) : null };
  });
  return { taps:t, price, labor, totalCost, bevGal, bevPerTap, scenarios, tooHigh: totalCost > 0 && bevPerTap > 0.30 };
}

// ── Tubing (TubingTab, 40-25) ────────────────────────────────────────────────
// Returns null until taps and mainline length are entered, as the tab did.
const SR_MAIN_SIZES = [
  { max:100,  ms:'3/4"', mm:19, frac:'3/4' }, { max:300,  ms:'1"',   mm:25, frac:'1' },
  { max:600,  ms:'1¼"',  mm:32, frac:'1¼' },  { max:1200, ms:'1½"',  mm:38, frac:'1½' },
  { max:Infinity, ms:'2"', mm:50, frac:'2' },
];
function srTubing(taps, mainLen, grade, targetVac, latTaps) {
  const t  = parseInt(taps) || 0;
  const ml = parseFloat(mainLen) || 0;
  const g  = parseFloat(grade) || 0;
  const tv = parseFloat(targetVac) || 25;
  const lt = parseInt(latTaps) || 12;
  if (!t || !ml) return null;
  const size = SR_MAIN_SIZES.find(s => t <= s.max);
  const ms = size.ms;
  const diamFactor = { '3/4"':1.8, '1"':1.0, '1¼"':0.65, '1½"':0.45, '2"':0.25 };
  const vacLoss  = +((ml / 1000) * (diamFactor[ms] || 1.0) * 2).toFixed(1);
  const elevDrop = +(ml * (g / 100)).toFixed(0);
  const vacGain  = +((ml * g / 100) / 10 * 0.4).toFixed(1);
  // Floor at the target: vacuum at the far tap can never exceed pump vacuum.
  const vacPump  = +Math.max(tv, tv + vacLoss - vacGain).toFixed(1);
  const numLat   = Math.ceil(t / lt);
  const latFtTot = +(numLat * lt * 8).toFixed(0);
  const cfm      = Math.ceil(t * 0.05);
  const pump     = cfm <= 10 ? 'p10' : cfm <= 20 ? 'p20' : cfm <= 40 ? 'p40' : cfm <= 75 ? 'p75' : 'pBig';
  return { ms, mm:size.mm, frac:size.frac, targetVac:tv, vacLoss, vacGain, vacPump, elevDrop, numLat, latFtTot, cfm, pump,
    mainFt: Math.ceil(ml * 1.1), latFt: Math.ceil(latFtTot * 1.1), dropFt: t * 4, tees: t, caps: numLat,
    pumpHigh: vacPump > 27, gradeHelps: vacGain > 2 };
}

// ── Tapping estimate (TappingTab, 40-08) ─────────────────────────────────────
// Sap in gallons = total taps x the tap system's mid yield (gal syrup/tap)
// x the Rule-of-86 ratio; syrup from syrupY. Both gallons.
function srTapEstimate(trees, dbh, sapBrix, model) {
  const tpt = tapsPer(dbh);
  const tot = tpt * (parseInt(trees) || 0);
  const sapGal = Math.round(tot * yieldMidOf(model) * (RULE_DIVISOR / (parseFloat(sapBrix) || 2)));
  const syrupGal = syrupY(sapGal, sapBrix);
  return { tpt, tot, sapGal, syrupGal };
}
const SR_ROT_OPP = { N:'S', S:'N', E:'W', W:'E' };

// ── Evaporator, fuel, true cost, retail (EvapTab, 40-05) ─────────────────────
// sapGal in gallons. Rate: typed override, else the custom pan's area x 2.5,
// else the pan's rate. Fuel units = sap gallons / fuel.spu.
const SR_BOTTLES = [ { id:'250ml', gal:0.0660 }, { id:'500ml', gal:0.1321 }, { id:'1l', gal:0.2642 }, { id:'1qt', gal:0.25 }, { id:'1gal', gal:1.0 } ];
const SR_USDA_BENCH = [ { g:'golden', price:45 }, { g:'amber', price:38 }, { g:'dark', price:34 }, { g:'vdark', price:30 } ];
function srEvapRate(panIdx, panW, panH, customR) {
  const i = parseInt(panIdx, 10) || 0;
  const pan = PAN_SIZES[i] || PAN_SIZES[0];
  const isCustomPan = i === CUSTOM_PAN_IDX;
  const customArea  = isCustomPan ? (parseFloat(panW) || 0) * (parseFloat(panH) || 0) : 0;
  const customCalcR = isCustomPan ? Math.round(customArea * 2.5) : 0;
  const rate = customR > 0 ? parseFloat(customR) : (isCustomPan ? customCalcR : pan.rate);
  const area = isCustomPan ? customArea : pan.area;
  return { rate, area, eff: area > 0 ? rate / area : null, isCustomPan, customArea, customCalcR, panRate: pan.rate };
}
function srEvapCosts(o) {
  const fuel = FUELS.find(f => f.label === o.fuelType) || FUELS[0];
  const sapGal = parseFloat(o.sapGal) || 0;
  const syrupGal = syrupY(sapGal, o.brix);
  const boilH = boilTime(sapGal, o.brix, o.rate);
  const uNeeded = sapGal / fuel.spu;
  const cost = uNeeded * (parseFloat(o.fuelCost) || 0);
  const laborTotal = (parseFloat(o.laborHrs) || 0) * (parseFloat(o.laborRate) || 0);
  const suppliesTotal = (o.supplies || []).reduce((s, v) => s + (parseFloat(v || 0) || 0), 0);
  const totalCost = cost + laborTotal + suppliesTotal;
  const autoCpg = syrupGal > 0 ? totalCost / syrupGal : 0;
  const cpg = parseFloat(o.cpgOverride) > 0 ? parseFloat(o.cpgOverride) : autoCpg;
  const margin = Math.min(Math.max(parseFloat(o.margin) || 40, 0), 95) / 100;
  const bottles = SR_BOTTLES.map(b => { const c = cpg * b.gal; const retail = margin < 1 ? c / (1 - margin) : 0; return { id:b.id, cost:c, retail, profit:retail - c }; });
  return { fuel, syrupGal, boilH, uNeeded, cost, laborTotal, suppliesTotal, totalCost, autoCpg, cpg, margin, bottles };
}

// ── Finishing: candy temperatures (FinishTab, 40-07) ─────────────────────────
const SR_CANDY = [ { id:'cream', off:22 }, { id:'taffy', off:28 }, { id:'molded', off:34 }, { id:'sugar', off:45 } ];

// ── Degree days, base 40°F (SeasonTab, 40-16) ────────────────────────────────
const SR_DD_STAGES = [ { t:0, id:'open' }, { t:50, id:'early' }, { t:150, id:'peak' }, { t:300, id:'late' }, { t:500, id:'end' } ];
function srDegreeDays(daily) {
  let cumDD = 0; const days = [];
  if (daily && daily.time) daily.time.forEach((date, i) => {
    const hi = daily.temperature_2m_max[i] ?? 0, lo = daily.temperature_2m_min[i] ?? 0;
    const dd = Math.max(0, ((hi + lo) / 2) - 40);
    cumDD += dd;
    days.push({ date, hi: Math.round(hi), lo: Math.round(lo), dd: +dd.toFixed(1), cum: +cumDD.toFixed(1) });
  });
  const stage = SR_DD_STAGES.filter(s => cumDD >= s.t).pop() || SR_DD_STAGES[0];
  return { days, cumDD, avg: days.length ? cumDD / days.length : 0, stage: stage.id };
}
// Buddy warning from SeasonTab: 3+ readings and the latest under 70% of peak.
function srBrixTrend(brixLog) {
  const v = (brixLog || []).map(e => parseFloat(e.brix)).filter(x => isFinite(x));
  const peak = Math.max(...(v.length ? v : [0])), last = v[v.length - 1] || 0;
  return { n: v.length, peak, last, min: v.length ? Math.min(...v) : null, avg: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null,
    buddy: v.length >= 3 && last < peak * 0.7 };
}

// seasonScore, memoized on its inputs (Recap renders three times while it loads, and
// Diagnose re-rendered it on every keystroke in a price field, which is not an input).
// The formula is seasonScore's, untouched; the last 8 input sets are kept.
const SR_SCORE_MEMO = [];
function srSeasonScore(a) {
  const key = JSON.stringify([a.sapT, a.syT, a.fuelT, a.taps, a.brix, a.yieldModel, a.fuelSpu]);
  const hit = SR_SCORE_MEMO.find(e => e.key === key);
  if (hit) return hit.sc;
  const sc = seasonScore(a);
  SR_SCORE_MEMO.unshift({ key, sc }); SR_SCORE_MEMO.length = Math.min(SR_SCORE_MEMO.length, 8);
  return sc;
}

// ── Score detail rows (SweetRunScore, 40-26) ─────────────────────────────────
// sc = seasonScore(...). Rows carry the numbers the classic card printed.
function srScoreRows(sc, o) {
  const rows = [];
  const brix = parseFloat(o.brix) || 2.0, yM = o.model, fuelDef = o.fuelDef || FUELS[0];
  if (sc.yieldScore !== null) {
    const ypp = o.syrupGal / o.taps;
    const cls = srYieldClass(ypp);
    rows.push({ id:'yield', score:sc.yieldScore, weight:30, ypp, band: cls === 'strong' ? 'top' : cls === 'low' ? 'below' : 'in' });
  }
  if (sc.effScore !== null) rows.push({ id:'eff', score:sc.effScore, weight:40, ratio: o.sapGal / o.syrupGal, theory: RULE_DIVISOR / brix });
  if (sc.fuelScore !== null) rows.push({ id:'fuel', score:sc.fuelScore, weight:20, fr: o.fuelT / o.syrupGal, bench: (RULE_DIVISOR / brix) / fuelDef.spu, unit: fuelDef.unit });
  rows.push({ id:'data', score:sc.dataScore, weight:10, pts:sc.dataPts });
  return rows;
}

// ── Yield gap (YieldGapAnalyzer, 40-26) ──────────────────────────────────────
// null when the card would not show (no taps or syrup, or a suspect ratio).
// roFits (optional, default true): false for an operation an RO does not suit (buckets, small
// sugarbushes, srRoAdviceFits); the RO cause is then left out.
function srYieldGap(sapGal, syrupGal, taps, sapBrix, model, price, roFits) {
  taps = parseInt(taps) || 0;
  const brix = parseFloat(sapBrix) || 2.0;
  if (!taps || !syrupGal) return null;
  if (ratioSuspect(sapGal, syrupGal)) return null;
  const theoretical = RULE_DIVISOR / brix;
  const hi = taps * model.high, lo = taps * model.low;
  const gapHigh = Math.max(0, hi - syrupGal), gapLow = Math.max(0, lo - syrupGal);
  const gapMid = (gapHigh + gapLow) / 2;
  const actualRatio = sapGal > 0 && syrupGal > 0 ? sapGal / syrupGal : null;
  const effPct = actualRatio ? Math.min(100, Math.round((theoretical / actualRatio) * 100)) : null;
  const ypp = syrupGal / taps;
  const causes = [];
  const cls = srYieldClass(ypp);   // the one benchmark; the model range is what his system can reach
  if (cls === 'low') causes.push({ id:'lowYield', sev:'high', fixes:['leaks','checkValve','freshWood'] });
  else if (ypp < yieldMidOf(model)) causes.push({ id:'belowAvg', sev:'medium', cls, add: (yieldMidOf(model) - ypp) * taps, fixes:['audit5','checkValveLow'] });
  if (effPct !== null && effPct < 80) causes.push({ id:'evapLow', sev:'high', fixes:['float','descale','drawTiming'] });
  else if (effPct !== null && effPct < 90) causes.push({ id:'evapMinor', sev:'medium', fixes:['floatCal'] });
  if (roFits !== false && sapGal > 0 && syrupGal > 0 && sapGal / syrupGal > theoretical * 1.15) causes.push({ id:'considerRo', sev:'medium', fixes:['roSingle','roDiy'] });
  if (!causes.length) causes.push({ id:'good', sev:'low', fixes:['document'] });
  // over: syrup past the top of what his system reaches (0 inside the range). The card used to
  // print gapLow here, which is 0 whenever he is over, so it read "Over by +0".
  const over = Math.max(0, syrupGal - hi);
  return { theoretical, hi, lo, gapHigh, gapLow, gapMid, over, dollarGap: gapMid * (parseFloat(price) || 0), actualRatio, effPct, ypp, causes };
}
// Cost, time and impact of each fix, as the classic cards printed them.
const SR_FIXES = {
  leaks:{ cost:'$0', time:'2 to 4 h', impact:'high' }, checkValve:{ cost:'about $80 to $120', time:'1 day', impact:'high' },
  freshWood:{ cost:'$0', time:'1 h', impact:'medium' }, audit5:{ cost:'$0', time:'1 h', impact:'medium' },
  checkValveLow:{ cost:'about $40 to $80', time:'2 h', impact:'medium' }, float:{ cost:'$0', time:'30 min', impact:'high' },
  descale:{ cost:'about $20 acid wash', time:'2 h', impact:'high' }, drawTiming:{ cost:'$0', time:'30 min', impact:'medium' },
  floatCal:{ cost:'$0', time:'1 h', impact:'medium' }, roSingle:{ cost:'$8,000 to $18,000', time:'off season', impact:'veryHigh' },
  roDiy:{ cost:'$2,000 to $4,000', time:'off season', impact:'high' }, document:{ cost:'$0', time:'ongoing', impact:'high' },
};

// ── RO savings against a straight boil (RecapTab, 40-26) ─────────────────────
// null when the section would not show (roGal > sapGal is a double entry).
// Fix pass 1: fuel is counted in HIS fuel's unit with the app's one fuel model
// (FUELS spu: sap gallons boiled per unit of fuel, the model the Evaporator uses),
// not a fixed 23 lb of wood an hour. Hours are unchanged.
//   fuelSpu: sap gallons per fuel unit (FUELS[..].spu)
function srRoSavings(sapGal, roGal, evapRate, fuelSpu, hasPreheater, roBrix, sapBrix) {
  if (!(sapGal > 0) || !(evapRate > 0) || roGal > sapGal) return null;
  const spu = fuelSpu > 0 ? fuelSpu : FUELS[0].spu;
  const straightHrs  = sapGal / evapRate;
  const straightFuel = sapGal / spu;
  const roConc = roBrix > sapBrix && roGal > 0 ? roGal * (sapBrix / roBrix) : roGal;
  const roReducedSap = (sapGal - roGal) + roConc;
  const preH  = hasPreheater ? 0.85 : 1.0;
  const roHrs = (roReducedSap / evapRate) * preH;
  const roFuel = (roReducedSap / spu) * (hasPreheater ? 0.88 : 1.0);
  return { straightHrs, straightFuel, roConc, roHrs, roFuel, savedHrs: straightHrs - roHrs, savedFuel: straightFuel - roFuel, roShare: roGal / sapGal };
}

// ── Recap facts (RecapTab, 40-26): best day, span, Brix, year over year ──────
// season (optional, fix pass 1): first, last, length and best day use only entries dated inside
// the season's window (srSlogDated); totals still count every entry.
function srRecapFacts(slog, prevSlog, brixArr, units, season) {
  const g = seasonTotalsGal(slog || {}, units), p = seasonTotalsGal(prevSlog || {}, units);
  const ds = srSlogDated(slog, season).slog;
  const sapEntries = [...(ds.sapCollected || [])].sort((a, b) => (parseFloat(b.val) || 0) - (parseFloat(a.val) || 0));
  const all = [...(ds.sapCollected || []), ...(ds.syrupMade || [])].map(e => e.date).filter(Boolean).sort((a, b) => srDateMs(a) - srDateMs(b));
  const first = all[0] || null, last = all[all.length - 1] || null;
  const b = (brixArr || []).map(e => parseFloat(e.brix)).filter(v => !isNaN(v) && v > 0);
  return {
    sapGal: g.sapGal, syrupGal: g.syrupGal, roGal: g.roGal, evapGal: g.evapGal, fuelT: g.fuelT,
    best: sapEntries[0] || null, first, last,
    days: first && last ? Math.round((srDateMs(last) - srDateMs(first)) / 86400000) + 1 : null,
    brixAvg: b.length ? b.reduce((s, v) => s + v, 0) / b.length : null, brixMin: b.length ? Math.min(...b) : null, brixMax: b.length ? Math.max(...b) : null,
    prevSap: p.sapGal, prevSyrup: p.syrupGal,
    sapChg: p.sapGal > 0 ? (g.sapGal - p.sapGal) / p.sapGal * 100 : null,
    syrupChg: p.syrupGal > 0 ? (g.syrupGal - p.syrupGal) / p.syrupGal * 100 : null,
    ratio: actualRatio(g.sapGal, g.syrupGal) || 0,
  };
}
// Per collection point (RecapTab): sums in the stored (display) unit.
function srByPoint(slog, cpoints) {
  const sap = (slog || {}).sapCollected || [], sy = (slog || {}).syrupMade || [];
  if (!(cpoints || []).length || ![...sap, ...sy].some(e => e.point)) return null;
  const sum = (arr, f) => arr.filter(f).reduce((s, e) => s + (parseFloat(e.val) || 0), 0);
  const rows = cpoints.map(pt => ({ id:pt.id, name:pt.name, color:pt.color, sap: sum(sap, e => e.point === pt.id), syrup: sum(sy, e => e.point === pt.id), runs: sap.filter(e => e.point === pt.id).length }));
  return { rows, unSap: sum(sap, e => !e.point), unSyrup: sum(sy, e => !e.point) };
}

// ── Diagnose (DiagnoseTab.runDiagnostics, 40-29) ─────────────────────────────
// o: { slog, prevSlog, brixLog, pins, routeResults, trees, units, sapBrix,
//      syrupPrice, woodCost, laborRate, vacLevel, roOutBrix }
// Findings: { id, sev, roi, v:{numbers} }; sorted high, medium, low, good, then ROI.
function srDiagnose(o) {
  const R = [], units = o.units, sapBrix = o.sapBrix, price = o.syrupPrice, wood = o.woodCost, lr = o.laborRate;
  const T_ = seasonTotals(o.slog || {});
  const _ratio = rule86(sapBrix) > 0 ? rule86(sapBrix) : rule86(2.0);
  const sapGal = toGal(T_.sapT, units), roGal = toGal(T_.roT, units), evapGal = toGal(T_.evapT, units), syrupGal = toGal(T_.syT, units);
  const tapCount = parseInt(o.trees) || 0, vac = o.vacLevel;
  // 1 yield per tap
  if (sapGal > 0 && tapCount > 0) {
    const ypt = sapGal / tapCount;
    // Graded on the one yield band (srYieldClass) as sap: the band times the Rule of 86 at his sap Brix.
    const lo = SR_YIELD_BAND.low * _ratio, hi = SR_YIELD_BAND.high * _ratio;
    const gap = Math.max(0, lo - ypt);
    const potSyrup = (gap * tapCount) / (RULE_DIVISOR / sapBrix);
    const roi = potSyrup * price;
    if (srSapYieldClass(ypt, sapBrix) === 'low') R.push({ id:'yield', sev: ypt < lo * 0.6 ? 'high' : 'medium', roi, v:{ ypt, lo, hi, gap, taps:tapCount, lost: gap * tapCount, r: rule86(sapBrix), syr: potSyrup, price, vac, bx: parseFloat(sapBrix) || 2.0 } });
    else R.push({ id:'yieldOk', sev:'good', roi:0, v:{ ypt, lo, hi, bx: parseFloat(sapBrix) || 2.0 } });
  }
  // 2 conversion ratio
  if (sapGal > 0 && syrupGal > 0) {
    const ar = sapGal / syrupGal, tr = rule86(sapBrix), off = ((ar - tr) / tr) * 100;
    if (off > 15) {
      const lost = (ar - tr) / (ar * tr) * sapGal, roi = lost * price;
      R.push({ id:'conv', sev: off > 35 ? 'high' : 'medium', roi, v:{ ar, tr, off, excess: (ar - tr) * syrupGal, lost, price, brix:sapBrix } });
    } else if (ratioSuspect(sapGal, syrupGal)) R.push({ id:'convBad', sev:'high', roi:0, v:{ ar, tr, floor: SR_RATIO_FLOOR, maxB: SR_MAX_PLAUSIBLE_BRIX, brix:sapBrix } });
    else R.push({ id:'convOk', sev:'good', roi:0, v:{ ar, tr, off: Math.abs(off) } });
  }
  // 3 RO utilization
  if (roGal > 0 && evapGal > 0) {
    const util = roGal / evapGal;
    if (util < 0.7) { const cords = (evapGal - roGal) * 0.6 / FUELS[0].spu; R.push({ id:'roLow', sev:'medium', roi: cords * wood, v:{ pct: util * 100, cords, save: cords * wood, ro: roGal, ev: evapGal, gap: evapGal - roGal, wood } }); }
    else R.push({ id:'roOk', sev:'good', roi:0, v:{ pct: util * 100 } });
  } else if (evapGal > 50 && roGal === 0 && o.roFits !== false) {
    const cords = evapGal * 0.65 / FUELS[0].spu;
    R.push({ id:'roNone', sev:'high', roi: cords * wood, v:{ ev: evapGal, cords, save: cords * wood, wood } });
  }
  // 4 RO output Brix
  const rb = parseFloat(o.roOutBrix) || 0;
  if (rb > 0) {
    if (rb < 6) R.push({ id:'roBrixLow', sev:'medium', roi: evapGal > 0 ? ((8 - rb) / rb) * evapGal * 0.5 / FUELS[0].spu * wood : 50, v:{ rb } });
    else if (rb <= 14) R.push({ id:'roBrixOk', sev:'good', roi:0, v:{ rb } });
  }
  // 5 gravity at scale
  if (vac === 'gravity' && tapCount >= 100) {
    const addl = tapCount * 8, syr = addl / _ratio, roi = syr * price;
    R.push({ id:'vacuum', sev:'medium', roi, v:{ taps:tapCount, addl, syr, price, roi } });
  }
  // 6 line grades (sg_lines_results: nothing writes it today; kept for parity)
  const pins = o.pins || [];
  if (pins.filter(p => p.type !== 'tank').length >= 3 && pins.filter(p => p.type === 'tank').length >= 1) {
    const rr = o.routeResults || [];
    if (rr.length > 0) {
      const bad = rr.filter(r => !r.goodFlow), worst = rr.reduce((m, r) => Math.min(m, r.minGrade || 0), 100);
      if (bad.length) R.push({ id:'grades', sev: bad.length > rr.length / 2 ? 'high' : 'medium', roi: bad.length * tapCount * 2 * price / rr.length, v:{ bad: bad.length, n: rr.length, worst } });
      else R.push({ id:'gradesOk', sev:'good', roi:0, v:{ n: rr.length, worst } });
    }
  }
  // 7 year over year (both seasons through the same converter)
  const pv = seasonTotalsGal(o.prevSlog || {}, units);
  if (sapGal > 0 && pv.sapGal > 0) {
    const chg = ((sapGal - pv.sapGal) / pv.sapGal) * 100;
    const sChg = pv.syrupGal > 0 ? ((syrupGal - pv.syrupGal) / pv.syrupGal) * 100 : null;
    const down = chg < -15;
    R.push({ id: down ? 'yoyDown' : 'yoyUp', sev: down ? 'medium' : 'good', roi: down ? Math.abs(chg / 100 * sapGal / _ratio * price) : 0,
      v:{ chg, sChg, now: fromGal(sapGal, units), prev: fromGal(pv.sapGal, units), syNow: fromGal(syrupGal, units), syPrev: fromGal(pv.syrupGal, units) } });
  }
  // 8 Brix trend
  const be = Array.isArray(o.brixLog) ? o.brixLog : [];
  if (be.length >= 3) {
    const avg = be.reduce((s, e) => s + (parseFloat(e.brix) || 0), 0) / be.length;
    const late = be.slice(-3).reduce((s, e) => s + (parseFloat(e.brix) || 0), 0) / 3;
    R.push(late < avg * 0.85 ? { id:'brixDown', sev:'low', roi:0, v:{ avg, late } } : { id:'brixOk', sev:'good', roi:0, v:{ avg, n: be.length } });
  }
  // 9 labor
  const runs = ((o.slog || {}).sapCollected || []).length;
  if (runs > 0 && syrupGal > 0 && lr > 0) {
    const hrs = runs * 2 + syrupGal * 0.5, cost = hrs * lr, rev = syrupGal * price, pct = (cost / rev) * 100;
    R.push(pct > 45 ? { id:'labor', sev:'low', roi: Math.max(0, cost - rev * 0.3), v:{ hrs, lr, cost, rev, pct, runs, syr: syrupGal, price } }
                    : { id:'laborOk', sev:'good', roi:0, v:{ hrs, lr, pct } });
  }
  const order = { high:0, medium:1, low:2, good:3 };
  R.sort((a, b) => { const d = (order[a.sev] ?? 3) - (order[b.sev] ?? 3); return d !== 0 ? d : (b.roi || 0) - (a.roi || 0); });
  return R;
}

// ── Season insights (SeasonIntelligence, 40-21) ──────────────────────────────
function srInsights(sapGal, syrupGal, roGal, fuelT, taps, brix, effScore, fuelDef) {
  const out = [];
  if (taps > 0 && syrupGal > 0) { const ypp = syrupGal / taps, cls = srYieldClass(ypp);
    out.push({ id: cls === 'strong' ? 'yieldStrong' : cls === 'normal' ? 'yieldAvg' : 'yieldLow', type: cls === 'strong' ? 'ok' : cls === 'normal' ? 'info' : 'warn', v:{ ypp } }); }
  if (sapGal > 0 && syrupGal > 0 && effScore != null) { const ratio = sapGal / syrupGal; out.push({ id: effScore >= 95 ? 'effTop' : effScore >= 80 ? 'effGood' : 'effLow', type: effScore >= 95 ? 'ok' : effScore >= 80 ? 'info' : 'warn', v:{ ratio, eff: effScore, gapPct: 100 - effScore, brix } }); }
  if (fuelT > 0 && syrupGal > 0) {
    const fr = fuelT / syrupGal, bench = (RULE_DIVISOR / brix) / fuelDef.spu;
    if (fr < bench * 0.8) out.push({ id:'fuelGood', type:'ok', v:{ fr, bench, unit: fuelDef.unit } });
    else if (fr > bench * 1.5) out.push({ id:'fuelHigh', type:'warn', v:{ fr, bench, unit: fuelDef.unit } });
  }
  if (roGal > 0 && sapGal > 0) out.push({ id:'roHelps', type:'ok', v:{ pct: Math.round((roGal / sapGal) * 100) } });
  return out;
}
// A day judged by hand from a high and a low (SeasonIntelligence flow check).
function srHandFlow(high, low) {
  high = parseFloat(high); low = parseFloat(low);
  if (isNaN(high) || isNaN(low)) return null;
  if (low <= 28 && high >= 36 && high <= 50) return { score:95, id:'excellent' };
  if (low <= 32 && high >= 34 && high <= 55) return { score:72, id:'good' };
  if (high >= 32 && low <= 35) return { score:40, id:'marginal' };
  return { score:8, id:'poor' };
}

// ── Sap monitor import (SapImportModal, 40-11) ───────────────────────────────
// CSV: header row, then rows; columns found by name. PDF: the text of a
// SugarCalc Season Report. Both return a preview or { error:'key' }.
// Fix pass 1: a real CSV reader (quoted "1,450" stays one number), header words
// instead of substrings ("Syrup produced" is syrup, not RO), every row needs a real
// date (no more "Day 1"), and SweetRun's own export (Type,Date,Value,Unit,Note)
// reads back in. Rows carry their unit when the file says it (a Unit column, or
// "(L)" / "gal" in a header); otherwise they come in the display unit, as before.
// kindLabels (optional): extra { kind: [label, ...] } for the long format.
function srCsvDate(x) {
  const s = String(x == null ? '' : x).trim();
  const m = s.match(/^(\d{4}-\d{1,2}-\d{1,2})[T\s]/);
  const p = srDateParts(m ? m[1] : s);
  if (!p || p.y < 1990 || p.y > 2100 || p.mo < 1 || p.mo > 12 || p.d < 1 || p.d > 31) return null;
  return `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}
function srParseSapCsv(text, kindLabels) {
  const all = srCsvRows(text);
  if (all.length < 2) return { error:'impNeedRows' };
  const head = all[0].map(srCsvWords);
  const has = (w, list) => list.some(x => w.includes(x));
  const col = (test, skip) => head.findIndex((w, i) => !(skip || []).includes(i) && test(w));
  const unitOfWords = w => has(w, ['l', 'litres', 'liters', 'litre', 'liter']) ? 'L' : has(w, ['gal', 'gallons', 'gallon']) ? 'GAL' : null;
  const dateIdx = col(w => has(w, ['date', 'day', 'jour', 'time', 'timestamp']));
  const typeIdx = col(w => has(w, ['type', 'kind', 'catégorie', 'category']));
  const valIdx  = col(w => has(w, ['value', 'valeur', 'amount', 'quantité']));
  const entries = []; let badDates = 0;
  // Long format: one row per entry (SweetRun's own export).
  if (typeIdx >= 0 && valIdx >= 0) {
    if (dateIdx < 0) return { error:'impNoDate' };
    const unitIdx = col(w => has(w, ['unit', 'unité', 'units']));
    const noteIdx = col(w => has(w, ['note', 'notes']));
    const labels = {};
    Object.keys(SR_CSV_KIND_LABELS).forEach(k => { labels[k] = [...SR_CSV_KIND_LABELS[k], ...((kindLabels || {})[k] || [])].map(x => String(x).toLowerCase().trim()); });
    for (let i = 1; i < all.length; i++) {
      const r = all[i];
      const lab = String(r[typeIdx] || '').toLowerCase().trim();
      const kind = Object.keys(labels).find(k => labels[k].includes(lab) || k.toLowerCase() === lab);
      const val = srCsvNum(r[valIdx]);
      if (!kind || !(val > 0)) continue;
      const date = srCsvDate(r[dateIdx]); if (!date) { badDates++; continue; }
      const uw = unitIdx >= 0 ? srCsvWords(r[unitIdx]) : [];
      // Fuel exported in litres or m³ (fix pass 2, litre mode) comes back in gallons or ccf.
      const fv = kind === 'fuelUsed' && has(uw, ['l', 'litres', 'liters', 'litre', 'liter']) ? val / 3.785411784 : kind === 'fuelUsed' && has(uw, ['m³', 'm3']) ? val / 2.8316846592 : val;
      entries.push({ kind, date, val: fv, u: SR_VOL_KINDS.includes(kind) ? unitOfWords(uw) : null, note: noteIdx >= 0 ? String(r[noteIdx] || '') : '' });
    }
  } else {
    const syrupIdx = col(w => has(w, ['syrup', 'sirop']));
    const roIdx    = col(w => has(w, ['ro', 'osmosis', 'osmose', 'reverse', 'o/i', 'oi']), [syrupIdx]);
    const evapIdx  = col(w => has(w, ['evap', 'evaporator', 'évaporateur', 'boiled']), [syrupIdx, roIdx]);
    const sapIdx   = col(w => has(w, ['sap', 'sève', 'eau', 'collected', 'récoltée']), [syrupIdx, roIdx, evapIdx, dateIdx]);
    if (sapIdx === -1 && syrupIdx === -1 && roIdx === -1) return { error:'impNoCols' };
    if (dateIdx === -1) return { error:'impNoDate' };
    const cols = [['sapCollected', sapIdx], ['syrupMade', syrupIdx], ['sapRO', roIdx], ['sapEvap', evapIdx]].filter(([, i]) => i >= 0);
    for (let i = 1; i < all.length; i++) {
      const r = all[i];
      const vals = cols.map(([k, ix]) => [k, ix, srCsvNum(r[ix])]).filter(([, , v]) => v > 0);
      if (!vals.length) continue;
      const date = srCsvDate(r[dateIdx]); if (!date) { badDates++; continue; }
      vals.forEach(([kind, ix, val]) => entries.push({ kind, date, val, u: unitOfWords(head[ix]), note: '' }));
    }
  }
  if (!entries.length) return { error: badDates ? 'impBadDates' : 'impNoRows' };
  const tot = k => entries.filter(e => e.kind === k).reduce((s, e) => s + e.val, 0);
  const days = [...new Set(entries.map(e => e.date))];
  // rows: one per date (the preview counts these), with the same totals as before.
  const rows = days.map(d => ({ date: d, sap: entries.filter(e => e.date === d && e.kind === 'sapCollected').reduce((s, e) => s + e.val, 0),
    syrup: entries.filter(e => e.date === d && e.kind === 'syrupMade').reduce((s, e) => s + e.val, 0),
    ro: entries.filter(e => e.date === d && e.kind === 'sapRO').reduce((s, e) => s + e.val, 0) }));
  return { rows, entries, badDates, totalSap: tot('sapCollected'), totalSyrup: tot('syrupMade'), totalRO: tot('sapRO'), totalEvap: tot('sapEvap'),
    totalFuel: tot('fuelUsed'), totalHours: tot('boilHours'), seasons: [...new Set(entries.map(e => srSeasonOf(e.date)))].sort() };
}
function srParseSugarCalcText(fullText, thisYear) {
  const CAT = { 'Sap Collected':'sap', 'Syrup Made':'syrup', 'Sap Thru R/O':'ro', 'Sap through R/O':'ro', 'Sap in Evaporator':'evap' };
  const re = /(\d{1,2}\/\d{1,2}\/\d{4})\s+(Sap Collected|Syrup Made|Sap Thru R\/O|Sap through R\/O|Sap in Evaporator)\s+([\d.]+)/g;
  const rows = []; let m;
  while ((m = re.exec(fullText)) !== null) { const val = parseFloat(m[3]); if (val > 0) rows.push({ date:m[1], cat:CAT[m[2]], val }); }
  if (!rows.length) return { error:'impNoPdfRows' };
  const years = rows.map(r => parseInt(r.date.split('/')[2])).filter(Boolean);
  const tot = { sap:0, syrup:0, ro:0, evap:0 }; rows.forEach(r => { tot[r.cat] = (tot[r.cat] || 0) + r.val; });
  return { rows, totalSap:tot.sap, totalSyrup:tot.syrup, totalRO:tot.ro, totalEvap:tot.evap, detectedYear: years.length ? Math.max(...years) : thisYear, isPDF:true };
}
// What a preview adds, by log kind (buildAdditions), then merged the way doImport merges.
function srImportAdditions(preview, source) {
  let sap = [], syrup = [], ro = [], evap = [];
  if (preview.isPDF) {
    preview.rows.forEach(r => { const e = { val:r.val, note:'Imported (SugarCalc PDF)', date:r.date };
      if (r.cat === 'sap') sap.push(e); else if (r.cat === 'syrup') syrup.push(e); else if (r.cat === 'ro') ro.push(e); else if (r.cat === 'evap') evap.push(e); });
    return { sapCollected:sap, syrupMade:syrup, sapRO:ro, sapEvap:evap };
  }
  if (Array.isArray(preview.entries)) {
    const out = { sapCollected:[], syrupMade:[], sapRO:[], sapEvap:[] };
    preview.entries.forEach(e => { out[e.kind] = out[e.kind] || [];
      out[e.kind].push({ val:e.val, note: e.note ? `${e.note} (imported, ${source})` : `Imported (${source})`, date:e.date, ...(e.u ? { u:e.u } : {}) }); });
    return out;
  }
  sap   = preview.rows.filter(r => r.sap > 0).map(r => ({ val:r.sap, note:`Imported (${source})`, date:r.date }));
  syrup = preview.rows.filter(r => r.syrup > 0).map(r => ({ val:r.syrup, note:`Imported (${source})`, date:r.date }));
  ro    = preview.rows.filter(r => r.ro > 0).map(r => ({ val:r.ro, note:`Imported (${source})`, date:r.date }));
  return { sapCollected:sap, syrupMade:syrup, sapRO:ro, sapEvap:evap };
}
// Additions split by the season each row's date belongs to (srSeasonOf); rows
// without a usable date go to `fallback` (the PDF importer's detected year).
function srImportBySeason(added, fallback) {
  const out = {};
  Object.keys(added || {}).forEach(k => (added[k] || []).forEach(e => {
    const s = srSeasonOf(e.date) || fallback; if (s == null) return;
    out[s] = out[s] || {}; (out[s][k] = out[s][k] || []).push(e);
  }));
  return out;
}
function srMergeImport(existing, season, added) {
  const all = existing || {};
  const slog = all[season] || { sapCollected:[], syrupMade:[], sapRO:[], sapEvap:[] };
  const next = { ...slog };
  Object.keys(added || {}).forEach(k => { if ((added[k] || []).length || next[k] === undefined) next[k] = [...(slog[k] || []), ...(added[k] || [])]; });
  return { ...all, [season]: next };
}

// ── First-season plan (FirstSeasonWizard, 40-01) ─────────────────────────────
// Fix pass 1: the setup's pans ARE the pan table (smallest first), so a size picked in the
// setup is the same size, at the same rate, on the Boil and Evaporator screens.
const SR_WIZ_PANS = Object.fromEntries(PAN_ORDER.filter(i => i !== CUSTOM_PAN_IDX).map(i => [PAN_SIZES[i].label.replace(/ ft.*$/, '').replace('×', 'x'), PAN_SIZES[i].rate]));
function srWizardPlan(o) {
  const trees = parseInt(o.treeCount) || 0;
  const tapsPerTree = o.trunkSize === 'large' ? 2 : 1;
  const recTaps = trees * tapsPerTree;
  const m = yieldModelFor(o.systemType, o.collectionType);
  const syrupLow = Math.round(recTaps * m.low * 10) / 10, syrupMid = Math.round(recTaps * yieldMidOf(m) * 10) / 10, syrupHigh = Math.round(recTaps * m.high * 10) / 10;
  const sapMid = Math.round(syrupMid * 43);
  const evapGph = SR_WIZ_PANS[o.panSize] || 6;
  const sessions = o.hasEvap ? Math.ceil(Math.max(1, sapMid) / (evapGph * 4)) : null;
  const firewood = String(o.fuelType || '').includes('Firewood') ? +Math.max(0.1, syrupMid / 30).toFixed(1) : null;
  const price = parseFloat(o.syrupPrice) || 40;
  return { trees, tapsPerTree, recTaps, model:m, syrupLow, syrupMid, syrupHigh, sapMid, evapGph, sessions, firewood, price };
}
// The object finish() writes to sg_wizard_data, byte for byte.
function srWizardData(o) {
  const p = srWizardPlan(o);
  return { trees:p.trees, tapsPerTree:p.tapsPerTree, recTaps:p.recTaps, systemType:o.systemType, collectionType:o.collectionType,
    hasEvap:o.hasEvap, panSize:o.panSize, fuelType:o.fuelType, fuelCost: parseFloat(o.fuelCost) || 300, syrupPrice:p.price };
}

// ── Copy cleanup for long reference text (SugarSage answers) ────────────────
// House rule: no em or en dashes on screen. Number ranges read "to"; a dash
// used as a pause becomes a comma. Reference text only; UI copy is written
// dash-free in RS_TR.
// Decimals written into English reference text read "1,5" in French.
function srDecL(s, lang) { return lang === 'fr' ? String(s).replace(/(\d)\.(\d)/g, '$1,$2') : String(s); }
function srPlain(s, lang) {
  return srDecL(String(s == null ? '' : s), lang)
    .replace(/(\d[\d.,]*\s*(?:°F|°C|°|%|"|in|ft|gal|h|hrs|mm|cm)?)\s*[–—]\s*(\$?\d)/g, lang === 'fr' ? '$1 à $2' : '$1 to $2')
    .replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ', ')
    .replace(/,\s*,/g, ',').replace(/\s+,/g, ',');
}

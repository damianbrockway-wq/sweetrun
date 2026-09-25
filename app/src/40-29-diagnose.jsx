// ─── DIAGNOSE TAB (BETA) ──────────────────────────────────────────────────────
function DiagnoseTab({ season, trees, units, sapBrix, lang='en' }) {
  // Canonical settings store — one syrup price / wood cost / labor rate,
  // app-wide (legacy sg_dx_* values migrate forward automatically). The syrup
  // price default follows the wizard's stored answer, never a contradicting $65.
  const [syrupPrice, setSyrupPrice] = React.useState(() => getSyrupPrice());
  const [woodCost,   setWoodCost]   = React.useState(() => getWoodCost());
  const [laborRate,  setLaborRate]  = React.useState(() => getLaborRate());
  const [vacLevel,   setVacLevel]   = React.useState(() => ls.get('sg_dx_vac',   'gravity'));
  const [roOutBrix,  setRoOutBrix]  = React.useState(() => ls.get('sg_dx_robrix', 0));
  const [expanded,   setExpanded]   = React.useState({});
  const [findings,   setFindings]   = React.useState(null);
  const [ran,        setRan]        = React.useState(false);

  const save = (key, setter) => v => { setter(v); ls.set(key, v); };

  // ── Diagnostic engine ──────────────────────────────────────────────────────
  function runDiagnostics() {
    const allLogs  = ls.get('sg_logs2', {});
    const slog     = allLogs[season] || {};
    const prevLog  = allLogs[season - 1] || {};
    const brixLog  = ls.get('sg_brixlog', []);   // stored as flat array in SeasonTab
    const pins     = ls.get('sg_lines_pins', []);
    const results  = [];

    // Season totals from the shared helper (one number, everywhere).
    // Stored log values are in the user's display unit; every benchmark below is gallons.
    const T = seasonTotals(slog);
    const _gal    = v => toGal(v, units);          // shared converter, one definition
    const _disp   = v => fromGal(v, units);        // back to the sugarmaker's unit for display
    const _u      = units === 'L' ? 'L' : 'gal';
    // sapBrix reaches here from storage and can be 0 (an emptied field, now
    // fixed at the input, but older devices still hold the zero). Dividing by
    // rule86(0) printed "could add $Infinity/season" and an "Infinityk ROI"
    // chip in the opportunity banner. Fall back to the 2.0 default the rest
    // of the app assumes when brix is unset.
    const _ratio  = rule86(sapBrix) > 0 ? rule86(sapBrix) : rule86(2.0);
    const sapGal  = _gal(T.sapT);
    const roGal   = _gal(T.roT);
    const evapGal = _gal(T.evapT);
    const syrupGal = _gal(T.syT);

    // ── 1. Yield-per-tap ────────────────────────────────────────────────────
    const numTrees = parseInt(trees) || 0;
    const tapCount = numTrees;  // simplified: 1 tap per tracked tree
    if (sapGal > 0 && tapCount > 0) {
      const yieldPerTap = sapGal / tapCount;
      // Benchmarks: gravity ~10-15 gal/tap, 15" vac ~20-28, high vac ~30-45
      const benchLow  = vacLevel === 'high' ? 30 : vacLevel === 'vac15' ? 20 : 10;
      const benchHigh = vacLevel === 'high' ? 45 : vacLevel === 'vac15' ? 28 : 15;
      const pct = Math.round(((yieldPerTap - benchLow) / (benchLow)) * 100);
      const gap = Math.max(0, benchLow - yieldPerTap);
      const potentialSyrup = (gap * tapCount) / (RULE_DIVISOR / sapBrix);   // gal (inputs normalized above)
      const roiVal = potentialSyrup * syrupPrice;
      if (yieldPerTap < benchLow) {
        results.push({
          id: 'yield',
          severity: yieldPerTap < benchLow * 0.6 ? 'high' : 'medium',
          title: 'Low sap yield per tap',
          summary: `${yieldPerTap.toFixed(1)} gal sap/tap vs. ${benchLow}–${benchHigh} benchmark for your vacuum level.`,
          action: vacLevel === 'gravity'
            ? 'Consider upgrading to 15" vacuum tubing (3/16" laterals) — natural siphon can add 5–10 gal/tap with no electricity.'
            : 'Check for air leaks in lines, verify pump is pulling target inches, inspect check valves, and confirm taps are sealed.',
          effort: 'Medium',
          payback: roiVal > 0 ? `~$${roiVal.toFixed(0)} potential revenue this season` : null,
          roi: roiVal,
          details: [
            `Your operation: ${yieldPerTap.toFixed(1)} gal sap/tap`,
            `Benchmark for ${vacLevel === 'gravity' ? 'gravity' : vacLevel === 'vac15' ? '15" vacuum' : 'high vacuum'}: ${benchLow}–${benchHigh} gal sap/tap`,
            `Gap: ${gap.toFixed(1)} gal sap/tap × ${tapCount} taps = ${(gap * tapCount).toFixed(0)} gal sap lost`,
            `At ${rule86(sapBrix).toFixed(1)}:1 ratio = ${potentialSyrup.toFixed(1)} gal syrup × $${syrupPrice} = $${roiVal.toFixed(0)}`,
            'Source: UVM Proctor Maple Research Center, 2023 Vermont Maple Industry Stats',
          ],
        });
      } else {
        results.push({
          id: 'yield',
          severity: 'good',
          title: 'Yield per tap looks solid',
          summary: `${yieldPerTap.toFixed(1)} gal sap/tap is within or above the ${benchLow}–${benchHigh} benchmark.`,
          roi: 0,
        });
      }
    }

    // ── 2. Sap-to-syrup conversion ratio ───────────────────────────────────
    if (sapGal > 0 && syrupGal > 0) {
      const actualRatio = sapGal / syrupGal;
      const theorRatio  = rule86(sapBrix);
      const pctOff = ((actualRatio - theorRatio) / theorRatio) * 100;
      if (pctOff > 15) {
        const lostSyrup = (actualRatio - theorRatio) / (actualRatio * theorRatio) * sapGal;
        const roiVal = lostSyrup * syrupPrice;
        results.push({
          id: 'conversion',
          severity: pctOff > 35 ? 'high' : 'medium',
          title: 'Sap-to-syrup conversion worse than expected',
          summary: `Using ${actualRatio.toFixed(1)}:1 vs. theoretical ${theorRatio.toFixed(1)}:1 — ${pctOff.toFixed(0)}% more sap per gallon syrup.`,
          action: 'Check for: foam overflow during boil, equipment leaks, syrup drawn off too thin, or inaccurate volume tracking.',
          effort: 'Low',
          payback: `~${lostSyrup.toFixed(1)} gal syrup lost = $${roiVal.toFixed(0)}`,
          roi: roiVal,
          details: [
            `Your ratio: ${actualRatio.toFixed(1)}:1  |  Rule of 86 at ${sapBrix}°Brix: ${theorRatio.toFixed(1)}:1`,
            `Excess sap used: ${((actualRatio - theorRatio) * syrupGal).toFixed(0)} gal`,
            `Equivalent lost syrup: ~${lostSyrup.toFixed(1)} gal × $${syrupPrice} = $${roiVal.toFixed(0)}`,
            'Source: Cornell Maple Program, Sugar Maple Research & Extension',
          ],
        });
      } else if (ratioSuspect(sapGal, syrupGal)) {
        // `pctOff > 15` is one-sided, so a ratio far BELOW theoretical fell into
        // the "good" branch and was announced as on target — 1.2:1 against a
        // 43.2:1 theory was reported green, with "97% variance" printed in the
        // same sentence as the word "target".
        results.push({
          id: 'conversion',
          severity: 'high',
          title: 'Sap and syrup totals contradict each other',
          summary: `${actualRatio.toFixed(1)}:1 is below the ~${SR_RATIO_FLOOR.toFixed(0)}:1 floor that the sugar in sap allows — this is a data-entry problem, not a conversion problem.`,
          action: 'Check the Entries list for a sap amount filed under Syrup, or a tank reading that gained a digit. Nothing is scored until these agree.',
          effort: 'Low',
          roi: 0,
          details: [
            `Your ratio: ${actualRatio.toFixed(1)}:1  |  Physical floor: ~${SR_RATIO_FLOOR.toFixed(1)}:1 (sap at ${SR_MAX_PLAUSIBLE_BRIX}°Brix)`,
            `Rule of 86 at ${sapBrix}°Brix would be ${theorRatio.toFixed(1)}:1`,
            'Yield, efficiency and fuel scores are withheld while this stands.',
          ],
        });
      } else {
        results.push({
          id: 'conversion',
          severity: 'good',
          title: 'Sap conversion ratio is on target',
          summary: `${actualRatio.toFixed(1)}:1 actual vs. ${theorRatio.toFixed(1)}:1 theoretical (${Math.abs(pctOff).toFixed(0)}% variance).`,
          roi: 0,
        });
      }
    }

    // ── 3. RO utilization ──────────────────────────────────────────────────
    if (roGal > 0 && evapGal > 0) {
      const roUtil = roGal / evapGal;
      if (roUtil < 0.7) {
        const potentialFuelSave = (evapGal - roGal) * 0.6 / FUELS[0].spu; // cords saved (1 cord boils ~1,000 gal sap)
        results.push({
          id: 'ro_util',
          severity: 'medium',
          title: 'RO underutilized relative to evaporator',
          summary: `Only ${(roUtil * 100).toFixed(0)}% of evaporator sap went through RO first. Target >90%.`,
          action: 'Pre-concentrate all incoming sap before evaporation. RO is your highest-ROI piece of equipment.',
          effort: 'Low',
          payback: `~${potentialFuelSave.toFixed(1)} cord wood saved = $${(potentialFuelSave * woodCost).toFixed(0)}`,
          roi: potentialFuelSave * woodCost,
          details: [
            `RO processed: ${roGal.toFixed(1)} gal  |  Evaporated: ${evapGal.toFixed(1)} gal`,
            `Gap: ${(evapGal - roGal).toFixed(1)} gal not RO'd`,
            `Running RO first reduces evaporation by 60–75%`,
            `Wood cost assumption: $${woodCost}/cord`,
            'Source: UVM Proctor — RO Energy Savings Analysis',
          ],
        });
      } else {
        results.push({
          id: 'ro_util',
          severity: 'good',
          title: 'RO utilization is strong',
          summary: `${(roUtil * 100).toFixed(0)}% of evaporator sap went through RO — great fuel savings.`,
          roi: 0,
        });
      }
    } else if (evapGal > 50 && roGal === 0) {
      const potentialCords = evapGal * 0.65 / FUELS[0].spu;
      const potentialSave  = potentialCords * woodCost;
      results.push({
        id: 'ro_util',
        severity: 'high',
        title: 'No RO usage detected',
        summary: `You evaporated ${evapGal.toFixed(1)} gal with no RO pre-concentration — significant fuel cost opportunity.`,
        action: 'A small RO system (e.g., 150 GPH) pays back in 1–3 seasons for operations over 500 taps. Consider renting before buying.',
        effort: 'High',
        payback: `~$${potentialSave.toFixed(0)}/season in wood costs at current evaporation volume`,
        roi: potentialSave,
        details: [
          `Total evaporated: ${evapGal.toFixed(1)} gal with no RO`,
          `RO reduces evaporation workload by 60–75%`,
          `Estimated wood saved: ${potentialCords.toFixed(1)} cords × $${woodCost} = $${potentialSave.toFixed(0)}`,
          'Source: Maine Maple Producers Association — RO Economics Guide',
        ],
      });
    }

    // ── 4. RO output Brix ──────────────────────────────────────────────────
    const roBrix = parseFloat(roOutBrix) || 0;
    if (roBrix > 0) {
      if (roBrix < 6) {
        results.push({
          id: 'ro_brix',
          severity: 'medium',
          title: 'RO output Brix is low',
          summary: `${roBrix}°Brix out of RO. Target 8–12°Brix for best evaporator efficiency.`,
          action: 'Run a second pass, increase RO pressure, or slow feed rate. Check membrane condition if output is consistently low.',
          effort: 'Low',
          payback: 'Doubling output Brix halves evaporation time and fuel cost',
          roi: evapGal > 0 ? ((8 - roBrix) / roBrix) * evapGal * 0.5 / FUELS[0].spu * woodCost : 50,
          details: [
            `Current output: ${roBrix}°Brix  |  Target: 8–12°Brix`,
            'Low output Brix means membranes may need cleaning or replacement',
            'Ideal: two-pass RO to 12–16°Brix before evaporation',
            'Source: Cornell Maple Program — RO Optimization',
          ],
        });
      } else if (roBrix >= 6 && roBrix <= 14) {
        results.push({
          id: 'ro_brix',
          severity: 'good',
          title: 'RO output Brix is in a good range',
          summary: `${roBrix}°Brix is solid. Running above 10°Brix means excellent evaporator efficiency.`,
          roi: 0,
        });
      }
    }

    // ── 5. Vacuum level check ──────────────────────────────────────────────
    if (vacLevel === 'gravity' && tapCount >= 100) {
      const addlSap = tapCount * 8; // ~8 extra gal/tap with 15" vac
      const addlSyrup = addlSap / _ratio;
      const roiVal = addlSyrup * syrupPrice;
      results.push({
        id: 'vacuum',
        severity: 'medium',
        title: 'Gravity system — vacuum upgrade opportunity',
        summary: `${tapCount} taps on gravity. Natural 3/16" siphon vacuum at this scale could add $${roiVal.toFixed(0)}/season.`,
        action: 'Upgrade laterals to 3/16" tubing to create natural siphon vacuum (12–15"). No pump or electricity needed. Best ROI upgrade for gravity operations.',
        effort: 'Medium',
        payback: `~$${roiVal.toFixed(0)}/season additional revenue from extra sap`,
        roi: roiVal,
        details: [
          `3/16" lateral tubing creates 12–15" natural vacuum via siphon effect`,
          `Benchmark gain: +6–10 gal/tap over standard gravity`,
          `${tapCount} taps × 8 gal estimate = ${addlSap} gal sap → ${addlSyrup.toFixed(1)} gal syrup`,
          `At $${syrupPrice}/gal = $${roiVal.toFixed(0)} additional revenue`,
          'Source: UVM Proctor — 3/16" Tubing Research (2015–2022)',
        ],
      });
    }

    // ── 6. Line grade check ────────────────────────────────────────────────
    const linesPins = pins.filter(p => p.type !== 'tank');
    const tankPins  = pins.filter(p => p.type === 'tank');
    if (linesPins.length >= 3 && tankPins.length >= 1) {
      const routeResults = ls.get('sg_lines_results', []);
      if (routeResults.length > 0) {
        const badLines = routeResults.filter(r => !r.goodFlow);
        const worstGrade = routeResults.reduce((min, r) => Math.min(min, r.minGrade || 0), 100);
        if (badLines.length > 0) {
          results.push({
            id: 'grades',
            severity: badLines.length > routeResults.length / 2 ? 'high' : 'medium',
            title: `${badLines.length} of ${routeResults.length} lines have flow problems`,
            summary: `Worst segment grade: ${worstGrade.toFixed(1)}%. Lines need ≥1% grade for reliable sap flow.`,
            action: 'Re-route problem lines to avoid flat or uphill sections. Consider a mid-line releaser, or add vacuum to compensate for flat terrain.',
            effort: 'High',
            payback: 'Proper grade prevents stale sap, bacterial growth, and lost collections',
            roi: badLines.length * tapCount * 2 * syrupPrice / routeResults.length,
            details: [
              `Lines analyzed: ${routeResults.length}  |  Problem lines: ${badLines.length}`,
              `Minimum acceptable grade: 1.0% (roughly 1 ft drop per 100 ft run)`,
              `Ideal grade: 2–5% — steeper is better for gravity flow`,
              `Flat or uphill sections cause sap to pool and ferment`,
              'Source: UVM Extension — Maple Tubing System Design Guide',
            ],
          });
        } else {
          results.push({
            id: 'grades',
            severity: 'good',
            title: 'Line grades look good',
            summary: `All ${routeResults.length} analyzed lines have adequate flow grade. Overall: ${worstGrade.toFixed(1)}% minimum.`,
            roi: 0,
          });
        }
      }
    }

    // ── 7. YoY comparison ─────────────────────────────────────────────────
    // This season was normalized to gallons and last season was not, so in litre
    // mode two IDENTICAL seasons reported "sap volume down 74%" — and pushed a
    // fabricated recovery ROI into the opportunity banner on the strength of it.
    // Carried since PASS2 as known; both sides now come from the same converter.
    const { sapGal: prevSap, syrupGal: prevSyrup } = seasonTotalsGal(prevLog, units);
    if (sapGal > 0 && prevSap > 0) {
      const sapChg   = ((sapGal - prevSap) / prevSap) * 100;
      const syrupChg = prevSyrup > 0 ? ((syrupGal - prevSyrup) / prevSyrup) * 100 : null;
      const isDown = sapChg < -15;
      results.push({
        id: 'yoy',
        severity: isDown ? 'medium' : 'good',
        title: isDown ? `Sap volume down ${Math.abs(sapChg).toFixed(0)}% vs. last year` : `Sap volume up ${sapChg.toFixed(0)}% vs. last year`,
        summary: `${season}: ${_disp(sapGal).toFixed(1)} ${_u}  vs.  ${season-1}: ${_disp(prevSap).toFixed(1)} ${_u} (${sapChg > 0 ? '+' : ''}${sapChg.toFixed(0)}%)`,
        action: isDown ? 'Review tap timing, sap collection frequency, equipment downtime, and weather patterns. Bacterial growth from late tapping can reduce yield.' : null,
        effort: isDown ? 'Low investigation' : null,
        roi: isDown ? Math.abs(sapChg / 100 * sapGal / _ratio * syrupPrice) : 0,
        details: [
          `${season-1} sap: ${_disp(prevSap).toFixed(1)} ${_u}  →  ${season} sap: ${_disp(sapGal).toFixed(1)} ${_u} (${sapChg > 0 ? '+' : ''}${sapChg.toFixed(0)}%)`,
          syrupChg != null ? `Syrup: ${_disp(prevSyrup).toFixed(1)} → ${_disp(syrupGal).toFixed(1)} ${_u} (${syrupChg > 0 ? '+' : ''}${syrupChg.toFixed(0)}%)` : 'No prior syrup data',
          'Year-over-year swings >20% may indicate tap timing, weather, or equipment issues',
          'Note: natural yield variation of ±15% is normal between seasons',
        ],
      });
    }

    // ── 8. Sap Brix trend ─────────────────────────────────────────────────
    const brixEntries = Array.isArray(brixLog) ? brixLog : [];
    if (brixEntries.length >= 3) {
      const avg  = brixEntries.reduce((s, e) => s + (parseFloat(e.brix) || 0), 0) / brixEntries.length;
      const late = brixEntries.slice(-3).reduce((s, e) => s + (parseFloat(e.brix) || 0), 0) / 3;
      const falling = late < avg * 0.85;
      if (falling) {
        results.push({
          id: 'brix_trend',
          severity: 'low',
          title: 'Sap Brix declining — season may be ending',
          summary: `Recent average ${late.toFixed(2)}°Brix vs. season avg ${avg.toFixed(2)}°Brix. Declining Brix often signals season close.`,
          action: 'When Brix drops below 1.5–1.8° consistently and nights stop freezing, consider pulling taps to prevent bark damage and bacterial buildup.',
          effort: 'Low',
          payback: 'Pulling taps at the right time prevents tree stress and preserves next year\'s yield',
          roi: 0,
          details: [
            `Season average: ${avg.toFixed(2)}°Brix  |  Last 3 readings avg: ${late.toFixed(2)}°Brix`,
            'Brix naturally declines as trees break dormancy',
            'Buddy sap (>1% green taste) is unacceptable for syrup',
            'Source: Maine MPA — When to Pull Taps',
          ],
        });
      } else {
        results.push({
          id: 'brix_trend',
          severity: 'good',
          title: 'Sap Brix is stable this season',
          summary: `${brixEntries.length} readings avg ${avg.toFixed(2)}°Brix. No concerning decline yet.`,
          roi: 0,
        });
      }
    }

    // ── 9. Labor efficiency ───────────────────────────────────────────────
    const collectionEntries = (slog.sapCollected || []).length;
    if (collectionEntries > 0 && syrupGal > 0 && laborRate > 0) {
      const estHours = collectionEntries * 2 + syrupGal * 0.5; // rough: 2h/collection + 30min/gal syrup
      const laborCost = estHours * laborRate;
      const revEstimate = syrupGal * syrupPrice;
      const laborPct = (laborCost / revEstimate) * 100;
      if (laborPct > 45) {
        results.push({
          id: 'labor',
          severity: 'low',
          title: 'Labor costs are a significant portion of revenue',
          summary: `Estimated ~${estHours.toFixed(0)} labor hours at $${laborRate}/hr = $${laborCost.toFixed(0)} (${laborPct.toFixed(0)}% of ~$${revEstimate.toFixed(0)} revenue).`,
          action: 'Look at bulk sales to sugarhouses, shared equipment co-ops, or automating collection scheduling. Vacuum systems with fewer collection trips improve labor per gallon.',
          effort: 'Medium',
          payback: 'Reducing labor to <30% of revenue is a common benchmark for profitability',
          roi: Math.max(0, laborCost - revEstimate * 0.3),
          details: [
            `Collection events logged: ${collectionEntries}  |  Syrup produced: ${syrupGal.toFixed(1)} gal`,
            `Labor estimate: ${estHours.toFixed(0)} hrs × $${laborRate}/hr = $${laborCost.toFixed(0)}`,
            `Revenue estimate: ${syrupGal.toFixed(1)} gal × $${syrupPrice} = $${revEstimate.toFixed(0)}`,
            `Labor as % of revenue: ${laborPct.toFixed(0)}%  |  Industry target: <30%`,
            'Source: USDA NASS Maple Syrup Production Survey',
          ],
        });
      } else {
        results.push({
          id: 'labor',
          severity: 'good',
          title: 'Labor costs look manageable',
          summary: `Est. ${estHours.toFixed(0)} hrs at $${laborRate}/hr is ${laborPct.toFixed(0)}% of estimated revenue — within range.`,
          roi: 0,
        });
      }
    }

    // ── Sort: high → medium → low → good, then by ROI descending ─────────
    const order = { high: 0, medium: 1, low: 2, good: 3 };
    results.sort((a, b) => {
      const od = (order[a.severity] || 3) - (order[b.severity] || 3);
      return od !== 0 ? od : (b.roi || 0) - (a.roi || 0);
    });

    setFindings(results);
    setRan(true);
  }

  // ── Severity styling ───────────────────────────────────────────────────────
  const sevStyle = {
    high:   { bg:'rgba(248,81,73,0.12)',   border:'rgba(248,81,73,0.35)',   dot:'#ef4444', label:'High Priority'   },
    medium: { bg:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.35)',  dot:'#e0a44a', label:'Opportunity'     },
    low:    { bg:'rgba(99,102,241,0.12)',  border:'rgba(99,102,241,0.35)',  dot:'#6366f1', label:'Watch'           },
    good:   { bg:'rgba(45,212,167,0.08)', border:'rgba(45,212,167,0.25)', dot:'#2dd4a7', label:'Looking Good'    },
  };

  const Card = ({ f }) => {
    const s = sevStyle[f.severity] || sevStyle.good;
    const open = expanded[f.id];
    return (
      <div style={{ background: s.bg, border:`1px solid ${s.border}`, borderRadius:14, marginBottom:10, overflow:'hidden' }}>
        <button
          onClick={() => setExpanded(prev => ({ ...prev, [f.id]: !prev[f.id] }))}
          style={{ width:'100%', background:'none', border:'none', cursor:'pointer', padding:'14px 16px', textAlign:'left', display:'flex', alignItems:'flex-start', gap:10 }}
        >
          <div style={{ width:10, height:10, borderRadius:'50%', background:s.dot, flexShrink:0, marginTop:4 }} />
          <div style={{ flex:1, minWidth:0 }}>
            {/* Title gets the full width; chips live on their own row beneath —
                sharing one row crushed titles to one word per line at 375px. */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
              <div style={{ flex:1, fontWeight:700, fontSize:15, color:'#e6edf3', lineHeight:1.35 }}>{f.title}</div>
              <I.chevDown size={14} color="#7f92a6" style={{ flexShrink:0, marginTop:3, transform: open ? 'rotate(180deg)' : 'none', transition:'0.18s' }} />
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:6, marginTop:6 }}>
              {f.roi > 0 && (
                <span style={{ background:'rgba(45,212,167,0.15)', border:'1px solid rgba(45,212,167,0.3)', borderRadius:10, padding:'2px 8px', fontSize:13, fontWeight:700, color:'#2dd4a7' }}>
                  ${!Number.isFinite(f.roi) ? '—' : f.roi >= 1000 ? (f.roi/1000).toFixed(1)+'k' : f.roi.toFixed(0)} ROI
                </span>
              )}
              <span style={{ background:'rgba(255,255,255,0.06)', borderRadius:8, padding:'2px 8px', fontSize:13, color:'#7f92a6', fontWeight:600 }}>{s.label}</span>
            </div>
            <div style={{ fontSize:12, color:'#7f92a6', marginTop:6, lineHeight:1.5 }}>{f.summary}</div>
          </div>
        </button>
        {open && (
          <div style={{ borderTop:`1px solid ${s.border}`, padding:'14px 16px 16px', paddingLeft:36 }}>
            {f.action && (
              <div style={{ background:'rgba(45,212,167,0.08)', border:'1px solid rgba(45,212,167,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#2dd4a7', marginBottom:4 }}>Recommended Action</div>
                <div style={{ fontSize:13, color:'#c8d8e8', lineHeight:1.55 }}>{f.action}</div>
              </div>
            )}
            {f.payback && (
              <div style={{ fontSize:12, color:'#e0a44a', fontWeight:600, marginBottom:10 }}>
                <I.dollar size={14} color="#3fb950" /> {f.payback}
              </div>
            )}
            {f.effort && (
              <div style={{ fontSize:12, color:'#7f92a6', marginBottom:10 }}>
                <span style={{ color:'#7f92a6', fontWeight:600 }}>Effort: </span>{f.effort}
              </div>
            )}
            {f.details && f.details.length > 0 && (
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:10, marginTop:4 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#7f92a6', marginBottom:6, letterSpacing:'0.05em', textTransform:'uppercase' }}>Details & Sources</div>
                {f.details.map((d, i) => (
                  <div key={i} style={{ fontSize:12, color:'#6a7a8a', lineHeight:1.5, marginBottom:3, paddingLeft:8, borderLeft:'2px solid rgba(255,255,255,0.06)' }}>{d}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const hasLogs = (() => {
    const slog = (ls.get('sg_logs2', {}))[season] || {};
    return (slog.sapCollected || []).length > 0 || (slog.syrupMade || []).length > 0;
  })();

  return (
    <div style={{ padding:'16px 14px 40px' }}>
      <div style={{ fontWeight:800, fontSize:20, marginBottom:4 }}>Diagnose My Operation</div>
      <div style={{ fontSize:13, color:'#7f92a6', marginBottom:18, lineHeight:1.5 }}>
        Rule-based bottleneck analysis using your {season} log data and industry benchmarks.
      </div>

      {/* ── Inputs ── */}
      <div style={{ background:'#0d1a2b', border:'1px solid #1e2d3d', borderRadius:14, padding:'14px 16px', marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#7f92a6', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:12 }}>Operation Inputs</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <div style={{ fontSize:13, color:'#7f92a6', marginBottom:4 }}>Syrup price ($/gal)</div>
            <input aria-label="Syrup price in dollars per gallon" type="number" value={syrupPrice} onChange={e => save('sg_price_syrup', setSyrupPrice)(parseFloat(e.target.value)||0)}
              style={{ width:'100%', background:'#0a1420', border:'1px solid #1e2d3d', borderRadius:8, padding:'7px 10px', color:'#e6edf3', fontSize:14, fontWeight:600, boxSizing:'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize:13, color:'#7f92a6', marginBottom:4 }}>Wood cost ($/cord)</div>
            <input aria-label="Wood cost in dollars per cord" type="number" value={woodCost} onChange={e => save('sg_cost_wood', setWoodCost)(parseFloat(e.target.value)||0)}
              style={{ width:'100%', background:'#0a1420', border:'1px solid #1e2d3d', borderRadius:8, padding:'7px 10px', color:'#e6edf3', fontSize:14, fontWeight:600, boxSizing:'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize:13, color:'#7f92a6', marginBottom:4 }}>Labor rate ($/hr)</div>
            <input aria-label="Labor rate in dollars per hour" type="number" value={laborRate} onChange={e => save('sg_rate_labor', setLaborRate)(parseFloat(e.target.value)||0)}
              style={{ width:'100%', background:'#0a1420', border:'1px solid #1e2d3d', borderRadius:8, padding:'7px 10px', color:'#e6edf3', fontSize:14, fontWeight:600, boxSizing:'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize:13, color:'#7f92a6', marginBottom:4 }}>RO output (°Brix)</div>
            <input aria-label="R/O output in degrees Brix, 0 for no R/O" type="number" value={roOutBrix} onChange={e => save('sg_dx_robrix', setRoOutBrix)(parseFloat(e.target.value)||0)}
              style={{ width:'100%', background:'#0a1420', border:'1px solid #1e2d3d', borderRadius:8, padding:'7px 10px', color:'#e6edf3', fontSize:14, fontWeight:600, boxSizing:'border-box' }}
              placeholder="0 = no RO" />
          </div>
        </div>
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:13, color:'#7f92a6', marginBottom:4 }}>Vacuum system</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[['gravity','Gravity'],['vac15','15" Vacuum'],['high','High Vac (25"+)']].map(([val,lbl]) => (
              <button key={val} onClick={() => save('sg_dx_vac', setVacLevel)(val)}
                style={{ background: vacLevel===val ? 'rgba(45,212,167,0.2)' : '#0a1420', border:`1px solid ${vacLevel===val ? '#2dd4a7' : '#1e2d3d'}`, borderRadius:8, padding:'6px 12px', color: vacLevel===val ? '#2dd4a7' : '#7f92a6', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Run button ── */}
      {!hasLogs && (
        <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:12, padding:'12px 16px', marginBottom:14, fontSize:13, color:'#e0a44a', lineHeight:1.5 }}>
          <I.alert size={14} color="currentColor" /> No {season} log data found. Add sap and syrup entries in the Log tab first for a full diagnosis.
        </div>
      )}

      <button
        onClick={runDiagnostics}
        style={{ width:'100%', background:'#2dd4a7', border:'none', borderRadius:12, padding:'14px', fontWeight:800, fontSize:15, color:'#07090f', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:20 }}
      >
        <I.zap size={18} color="#07090f" />
        Run Diagnosis — {season} Season
      </button>

      {/* ── Results ── */}
      {ran && findings && (
        <>
          {/* Summary bar */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
            {['high','medium','low','good'].map(sev => {
              const count = findings.filter(f => f.severity === sev).length;
              const s = sevStyle[sev];
              return (
                <div key={sev} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:10, padding:'8px 6px', textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:800, color:s.dot }}>{count}</div>
                  <div style={{ fontSize:12, color:'#7f92a6', fontWeight:600, lineHeight:1.3 }}>{s.label}</div>
                </div>
              );
            })}
          </div>

          {findings.length === 0 && (
            <div style={{ textAlign:'center', color:'#7f92a6', padding:'30px 0', fontSize:14 }}>
              No issues detected — add more log data for a richer diagnosis.
            </div>
          )}

          {findings.map(f => <Card key={f.id} f={f} />)}

          {/* Total ROI banner */}
          {findings.reduce((s, f) => s + (f.roi || 0), 0) > 0 && (
            <div style={{ background:'rgba(45,212,167,0.1)', border:'1px solid rgba(45,212,167,0.3)', borderRadius:14, padding:'14px 16px', marginTop:8, textAlign:'center' }}>
              <div style={{ fontSize:12, color:'#7f92a6', marginBottom:4 }}>Total identified opportunity</div>
              <div style={{ fontSize:26, fontWeight:800, color:'#2dd4a7' }}>
                {/* Finite-guarded: one bad roi used to render the whole banner as "$∞". */}
                ${(() => { const tot = findings.reduce((s, f) => s + (Number.isFinite(f.roi) ? f.roi : 0), 0);
                  return Number.isFinite(tot) ? tot.toLocaleString('en-US', { maximumFractionDigits:0 }) : '—'; })()}
              </div>
              <div style={{ fontSize:13, color:'#7f92a6', marginTop:4 }}>estimated annual improvement potential</div>
            </div>
          )}

          {/* Benchmarks footer */}
          <div style={{ marginTop:18, padding:'12px 14px', background:'#080f18', border:'1px solid #131e2c', borderRadius:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#2d3d4d', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Benchmark Sources</div>
            {[
              'UVM Proctor Maple Research Center — Vermont maple production data',
              'Cornell Maple Program — RO, sugaring efficiency, and industry guides',
              'Maine Maple Producers Association (MPA) — tapping and operation guides',
              'USDA NASS — Annual Maple Syrup Production Survey',
            ].map((s, i) => (
              <div key={i} style={{ fontSize:13, color:'#7f92a6', lineHeight:1.5, marginBottom:2 }}>• {s}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


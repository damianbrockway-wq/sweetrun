// ─── SEASON RECAP TAB ─────────────────────────────────────────────────────────

// ─── SWEETRUN SCORE ────────────────────────────────────────────────────────────
function SweetRunScore({ sapGal, syrupGal, sapBrix, trees, fuelGal, season, lang='en' }) {
  const taps    = parseInt(trees) || 0;
  const brix    = parseFloat(sapBrix) || 2.0;
  const [copied, setCopied] = React.useState(false);

  // ── Sub-scores (each 0–100) — computed by the shared seasonScore model, so
  // this card and SugarSage's Season Intelligence always agree. This card only
  // adds the display details.
  const fuelDef = FUELS.find(f => f.label === ls.get('sg_fuel','Firewood (cord)')) || FUELS[0];
  const yM = yieldModelSaved();
  const sc = seasonScore({ sapT: sapGal, syT: syrupGal, fuelT: fuelGal, taps, brix, yieldModel: yM, fuelSpu: fuelDef.spu });

  const scores = [];
  // One colour rule for every bar, monotonic in the score.
  const barColor = s => s >= 80 ? '#3fb950' : s >= 60 ? '#e0a44a' : '#f85149';

  // 1. Yield per tap (30 pts weight)
  if (sc.yieldScore !== null) {
    const ypp = syrupGal / taps;
    let yieldLabel;
    if (ypp >= yM.high) yieldLabel = `${ypp.toFixed(2)} gal syrup/tap — top of the range for ${yM.label}`;
    else if (ypp >= yM.low) yieldLabel = `${ypp.toFixed(2)} gal syrup/tap — inside the ${yM.low}–${yM.high} range for ${yM.label}`;
    else yieldLabel = `${ypp.toFixed(2)} gal/tap — below ${yM.low} for ${yM.label}`;
    scores.push({ label:'Yield / Tap', score: sc.yieldScore, weight:30, color: barColor(sc.yieldScore), detail: yieldLabel });
  }

  // 2. Evaporation efficiency (40 pts weight). This and the former "Ratio Accuracy" row were the
  // same computation — theoretical ratio over actual ratio — counted twice at 25 + 15. Merged; the
  // weighted overall is unchanged.
  if (sc.effScore !== null) {
    const ratio = sapGal / syrupGal;
    const theoretical = RULE_DIVISOR / brix;
    scores.push({ label:'Evap Efficiency', score: sc.effScore, weight:40, color: barColor(sc.effScore),
      detail: `${ratio.toFixed(0)}:1 actual vs ${theoretical.toFixed(0)}:1 theoretical` });
  }

  // 3. Fuel efficiency (20 pts weight)
  if (sc.fuelScore !== null) {
    const fr    = fuelGal / syrupGal;                       // units of fuel per gal syrup
    const bench = (RULE_DIVISOR / brix) / fuelDef.spu;      // what that fuel should take
    scores.push({ label:'Fuel Efficiency', score: sc.fuelScore, weight:20, color: barColor(sc.fuelScore),
      detail: `${fr.toFixed(2)} ${fuelDef.unit}/gal syrup · expect ${bench.toFixed(2)}` });
  }

  // 4. Data completeness (10 pts weight) — rewards logging
  scores.push({ label:'Data Complete', score: sc.dataScore, weight:10, color: barColor(sc.dataScore),
    detail:`${sc.dataPts}/4 tracked fields` });

  // ── Weighted overall (from the shared model) ──────────────────────────
  const overall = sc.overall;

  // Same rule as Diagnose: no letter until there is enough season to judge.
  const graded = sc.graded;
  const grade  = sc.grade;
  const gradeColor = barColor(overall);

  const shareText = `My ${season} maple season scored ${overall}/100 (${grade}) on SweetRun · sweetrun.app`;

  const copyShare = () => {
    navigator.clipboard?.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // A withheld score leaves only the Data row — but disappearing silently is the
  // one thing worse than a wrong number, so the card stays to explain itself.
  if (scores.length <= 1 && !sc.suspect) return null;

  return (
    <div className="card">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{fontSize:12,fontWeight:700,color:'#7f92a6',letterSpacing:'0.12em',textTransform:'uppercase'}}>SweetRun Score</div>
        {graded && <button onClick={copyShare} aria-label="Copy a one-line summary of this score"
          style={{background:'none', border:'none', padding:'0 2px', minHeight:44, fontSize:13, fontWeight:700, color: copied ? '#3fb950' : '#7f92a6', cursor:'pointer'}}>
          {copied ? 'Copied' : 'Share score'}
        </button>}
      </div>

      {/* Score, on the card. Before there is a season to judge, no number and
          no failing colour — a calm "too early" line instead of an F. */}
      {graded ? (
        <div style={{display:'flex',alignItems:'baseline',gap:10,paddingBottom:14,marginBottom:14,borderBottom:'1px solid #131e2c'}}>
          <span style={{fontSize:28,fontWeight:800,color:gradeColor,lineHeight:1,letterSpacing:'-0.01em'}}>{overall}</span>
          <span style={{fontSize:13,color:'#7f92a6',fontWeight:500}}>out of 100</span>
          <span style={{fontSize:13,fontWeight:800,color:gradeColor,background:`${gradeColor}1f`,
            borderRadius:999,padding:'3px 12px',lineHeight:1.4,alignSelf:'center'}} aria-label={`Grade ${grade}`}>{grade}</span>
        </div>
      ) : sc.suspect ? (
        /* The ratio is under the physical floor. Amber, not red: this is almost
           always a typo, and the sugarmaker has done nothing wrong. Name the
           number, name the floor, point at the likely cause, offer the fix. */
        <div style={{paddingBottom:14,marginBottom:14,borderBottom:'1px solid #131e2c'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:8,height:8,borderRadius:999,background:'#e0a44a',flex:'0 0 auto'}} aria-hidden="true" />
            <div style={{fontSize:16,fontWeight:700,color:'#e6edf3'}}>{t(lang,'ratioCheck')}</div>
          </div>
          <div style={{fontSize:12,color:'#9fb0c0',marginTop:5,lineHeight:1.55}}>
            {t(lang,'ratioCheckSub')
              .replace('{actual}', (sapGal / syrupGal).toFixed(1))
              .replace('{floor}',  SR_RATIO_FLOOR.toFixed(0))}
          </div>
          <button onClick={() => window.dispatchEvent(new CustomEvent('sr-goto-entries'))}
            style={{marginTop:10,background:'none',border:'1px solid #2a3a4d',borderRadius:8,
              padding:'9px 14px',minHeight:44,fontSize:13,fontWeight:700,color:'#e0a44a',cursor:'pointer'}}>
            {t(lang,'ratioCheckCta')}
          </button>
        </div>
      ) : (
        <div style={{paddingBottom:14,marginBottom:14,borderBottom:'1px solid #131e2c'}}>
          <div style={{fontSize:16,fontWeight:700,color:'#e6edf3'}}>{t(lang,'tooEarlyGrade')}</div>
          <div style={{fontSize:12,color:'#7f92a6',marginTop:3,lineHeight:1.5}}>{t(lang,'tooEarlyGradeSub')}</div>
        </div>
      )}

      <div>
        {/* Score bars */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {scores.map((s,i) => (
            <div key={i}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:3}}>
                <span style={{fontSize:12,color:'#7f92a6',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>{s.label}</span>
                <span style={{fontSize:14,fontWeight:700,color:'#e6edf3',minWidth:28,textAlign:'right'}}>{s.score}</span>
              </div>
              <div style={{fontSize:12,color:'#7f92a6',marginBottom:4,lineHeight:1.4}}>{s.detail}</div>
              <div style={{height:5,background:'#1e2d3d',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${s.score}%`,background:s.color,borderRadius:3,
                  transition:'width 0.4s cubic-bezier(.2,.8,.2,1)'}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── YIELD GAP ANALYZER ────────────────────────────────────────────────────────
function YieldGapAnalyzer({ sapGal, syrupGal, sapBrix, trees, season }) {
  const [pricePerGal, setPricePerGal] = React.useState(() => getSyrupPrice());
  const taps = parseInt(trees) || 0;
  const brix = parseFloat(sapBrix) || 2.0;

  if (!taps || !syrupGal) return null;
  // Every figure below — the gap, the dollars, the root causes — is derived from
  // the same syrup total the ratio says is wrong. Withhold the whole card rather
  // than argue with the ratio-check card directly above it, which has already
  // told the sugarmaker what to look at.
  if (ratioSuspect(sapGal, syrupGal)) return null;

  const theoretical      = RULE_DIVISOR / brix;                         // theoretical sap:syrup ratio
  const gModel           = yieldModelSaved();                   // benchmark follows the tap system
  const theorMaxSyrup    = taps * gModel.high;
  const theorMaxSyrupLow = taps * gModel.low;
  const gapHigh = Math.max(0, theorMaxSyrup    - syrupGal);
  const gapLow  = Math.max(0, theorMaxSyrupLow - syrupGal);
  const gapMid  = (gapHigh + gapLow) / 2;
  const dollarGap = gapMid * pricePerGal;

  const actualRatio = sapGal > 0 && syrupGal > 0 ? sapGal / syrupGal : null;
  // Same clamp that let SweetRunScore award an A to an impossible season. This
  // copy sits directly below that card, so leaving it meant Recap showed "these
  // numbers need a second look" and "your operation is performing well" in the
  // same scroll. Withheld on the same terms, from the same helper.
  const suspect = ratioSuspect(sapGal, syrupGal);
  const effPct = (actualRatio && !suspect) ? Math.min(100, Math.round((theoretical / actualRatio) * 100)) : null;
  const ypp    = syrupGal / taps;

  // ── Diagnose root causes ──────────────────────────────────────────────
  const causes = [];

  if (ypp < gModel.low) {
    causes.push({
      severity: 'high',
      title: 'Critical: Low yield per tap',
      detail: `${ypp.toFixed(2)} gal/tap vs. the ${gModel.low}–${gModel.high} benchmark for ${gModel.label}. This alone accounts for most of your gap.`,
      fixes: [
        { action: 'Check every lateral for micro-leaks at tee connections', cost: '$0', time: '2–4 hrs', impact: 'high' },
        { action: 'Replace standard spouts with check-valve spouts', cost: '~$80–120', time: '1 day', impact: 'high' },
        { action: 'Verify tap holes are in fresh white wood, not scarred tissue', cost: '$0', time: '1 hr', impact: 'medium' },
      ]
    });
  } else if (ypp < yieldMidOf(gModel)) {
    causes.push({
      severity: 'medium',
      title: 'Below-average yield per tap',
      detail: `${ypp.toFixed(2)} gal/tap is inside the ${gModel.low}–${gModel.high} range for ${gModel.label}, but the middle of it would add ${((yieldMidOf(gModel) - ypp) * taps).toFixed(0)} gal/season.`,
      fixes: [
        { action: 'Audit vacuum at 5 random taps with a gauge — look for >2" Hg variance', cost: '$0', time: '1 hr', impact: 'medium' },
        { action: 'Upgrade to check-valve spouts on your lowest-producing laterals', cost: '~$40–80', time: '2 hrs', impact: 'medium' },
      ]
    });
  }

  if (effPct !== null && effPct < 80) {
    causes.push({
      severity: 'high',
      title: 'Evaporator running below efficiency',
      detail: `Your ${actualRatio?.toFixed(0)}:1 ratio is ${(100-effPct).toFixed(0)}% below theoretical for ${brix}° Brix sap. Sap is taking too long to concentrate.`,
      fixes: [
        { action: 'Check float valve — evaporator level should stay consistent during boil', cost: '$0', time: '30 min', impact: 'high' },
        { action: 'Descale flue pan — niter buildup cuts evaporation rate significantly', cost: '~$20 acid wash', time: '2 hrs', impact: 'high' },
        { action: 'Verify draw-off timing — pulling too early dilutes density and lowers yield', cost: '$0', time: '30 min', impact: 'medium' },
      ]
    });
  } else if (effPct !== null && effPct < 90) {
    causes.push({
      severity: 'medium',
      title: 'Minor evaporation efficiency loss',
      detail: `${actualRatio?.toFixed(0)}:1 ratio is ${(100-effPct)}% below theoretical. Small gains available.`,
      fixes: [
        { action: 'Check float valve calibration and flue pan draw-off point', cost: '$0', time: '1 hr', impact: 'medium' },
      ]
    });
  }

  if (sapGal > 0 && syrupGal > 0 && sapGal / syrupGal > theoretical * 1.15) {
    causes.push({
      severity: 'medium',
      title: 'Consider RO to cut boil time and fuel',
      detail: `Pre-concentrating sap from ${brix}° to 8°Brix with a single-pass RO reduces boiling water by ~70%.`,
      fixes: [
        { action: 'Single-pass RO system (CDL, Leader, H2O Innovation)', cost: '$8,000–$18,000', time: 'Off-season install', impact: 'very high' },
        { action: 'Custom RO build (DIY membranes + pump)', cost: '$2,000–$4,000', time: 'Off-season project', impact: 'high' },
      ]
    });
  }

  if (causes.length === 0) {
    causes.push({
      severity: 'low',
      title: 'Your operation is performing well',
      detail: `Yield and efficiency are at or near benchmark. Focus on consistency and scaling.`,
      fixes: [
        { action: 'Document tap placement, vacuum readings, and best-run conditions for next year', cost: '$0', time: 'Ongoing', impact: 'high' },
      ]
    });
  }

  const sevColor = s => s==='high'?'#f85149':s==='medium'?'#e0a44a':s==='low'?'#3fb950':'#58a6ff';

  return (
    <div className="card">
      <div style={{fontSize:12,fontWeight:700,color:'#7f92a6',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:14}}>
        Yield Gap Analyzer
      </div>

      {/* Gap visual */}
      <div className="stat3" style={{gridTemplateColumns:'1fr 1.4fr 1fr',paddingBottom:12,borderBottom:'1px solid #131e2c'}}>
        <div className="eyebrow">You made</div><div className="eyebrow">Benchmark</div><div className="eyebrow">{gapMid > 0 ? 'Gap' : 'Surplus'}</div>
        <div className="fig"><span className="v">{fmt(syrupGal,1)}</span><span className="u">gal</span></div>
        <div className="fig"><span className="v">{fmt(theorMaxSyrupLow,0)}–{fmt(theorMaxSyrup,0)}</span><span className="u">gal</span></div>
        <div className="fig"><span className="v" style={{color: gapMid > 0 ? '#e0a44a' : '#3fb950'}}>{gapMid > 0 ? `~${fmt(gapMid,0)}` : `+${fmt(Math.abs(gapLow),0)}`}</span><span className="u">gal</span></div>
      </div>
      <div style={{fontSize:12,color:'#7f92a6',margin:'8px 0 14px',lineHeight:1.5}}>Benchmark at {gModel.low.toFixed(2)}–{gModel.high.toFixed(2)} gal/tap for {gModel.label}.</div>

      {/* Dollar impact */}
      {gapMid > 2 && (
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:12,marginBottom:14,padding:'12px 0',borderTop:'1px solid #131e2c',borderBottom:'1px solid #131e2c'}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:'#e6edf3',marginBottom:2}}>
              That gap costs about
            </div>
            <div style={{fontSize:13,color:'#7f92a6',lineHeight:1.5}}>
              at ${pricePerGal}/gal retail
            </div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontSize:20,fontWeight:700,color:'#e0a44a',lineHeight:1.1}}>${Math.round(dollarGap).toLocaleString()}</div>
            <div style={{fontSize:12,color:'#7f92a6',marginTop:2}}>per season</div>
          </div>
        </div>
      )}

      {/* Price input */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:16}}>
        <span style={{fontSize:13,color:'#7f92a6'}}>Your retail price per gallon ($)</span>
        <input aria-label="Your retail price per gallon, in dollars" type="number" value={pricePerGal}
          onChange={e=>{const v=parseFloat(e.target.value)||40; setPricePerGal(v); ls.set('sg_price_syrup',v);}}
          style={{width:96,textAlign:'center',flexShrink:0}}/>
      </div>

      {/* Gap bar */}
      {gapMid > 0 && (
        <div style={{marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#7f92a6',marginBottom:4}}>
            <span>0 gal</span>
            <span>Benchmark {theorMaxSyrup.toFixed(0)} gal</span>
          </div>
          <div style={{height:12,background:'#1e2d3d',borderRadius:6,overflow:'hidden',position:'relative'}}>
            <div style={{height:'100%',width:`${Math.min(100,(syrupGal/theorMaxSyrup)*100)}%`,
              background:'#2dd4a7',borderRadius:6}}/>
            <div style={{position:'absolute',top:0,right:0,height:'100%',
              width:`${Math.min(100,(gapHigh/theorMaxSyrup)*100)}%`,
              background:'repeating-linear-gradient(90deg,transparent,transparent 6px,#e0a44a30 6px,#e0a44a30 8px)',
              borderRight:'2px solid #e0a44a'}}/>
          </div>
          <div style={{display:'flex',gap:16,marginTop:6,fontSize:12}}>
            <span style={{color:'#2dd4a7'}}>■ Your yield ({syrupGal.toFixed(1)} gal)</span>
            <span style={{color:'#e0a44a'}}>■ Gap ({gapHigh.toFixed(0)} gal potential)</span>
          </div>
        </div>
      )}

      {/* Root cause analysis */}
      <div style={{fontSize:12,fontWeight:700,color:'#7f92a6',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>
        Root Cause Analysis
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {causes.map((c,i) => (
          <CauseCard key={i} cause={c} sevColor={sevColor}/>
        ))}
      </div>
    </div>
  );
}

function CauseCard({ cause, sevColor }) {
  const [open, setOpen] = React.useState(false);
  const color = sevColor(cause.severity);
  return (
    <div style={{borderLeft:`3px solid ${color}`,background:'#0d1a2b',borderRadius:'0 10px 10px 0',overflow:'hidden'}}>
      <button onClick={()=>setOpen(v=>!v)}
        style={{width:'100%',textAlign:'left',padding:'10px 14px',background:'none',border:'none',cursor:'pointer',
          display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
        <div>
          <div style={{fontSize:12,fontWeight:700,color,marginBottom:3}}>{cause.title}</div>
          <div style={{fontSize:13,color:'#7f92a6',lineHeight:1.5}}>{cause.detail}</div>
        </div>
        <span style={{fontSize:12,color:'#7f92a6',flexShrink:0,marginTop:2}}>{open?'▲':'▼'}</span>
      </button>
      {open && (
        <div style={{padding:'0 14px 12px',borderTop:'1px solid #1e2d3d'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#7f92a6',letterSpacing:'0.1em',textTransform:'uppercase',margin:'10px 0 8px'}}>
            Fix Priority
          </div>
          {cause.fixes.map((fix,j) => (
            <div key={j} style={{display:'flex',gap:10,padding:'8px 0',
              borderBottom: j < cause.fixes.length-1 ? '1px solid #131e2c' : 'none'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:'#c9d1d9',lineHeight:1.5,marginBottom:4}}>{fix.action}</div>
                <div style={{display:'flex',gap:12,fontSize:12,color:'#7f92a6'}}>
                  <span>Cost: <span style={{color:'#7f92a6'}}>{fix.cost}</span></span>
                  <span>Time: <span style={{color:'#7f92a6'}}>{fix.time}</span></span>
                </div>
              </div>
              <div style={{flexShrink:0,textAlign:'right'}}>
                <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',
                  color: fix.impact==='very high'?'#3fb950':fix.impact==='high'?'#58a6ff':fix.impact==='medium'?'#e0a44a':'#7f92a6'}}>
                  {fix.impact} impact
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Share card (Pass 7) ─────────────────────────────────────────────────────
// A 1200×630 season card drawn ENTIRELY programmatically: brand green
// gradient ground, the outline tree mark (M.tree's own d strings via Path2D —
// one geometry, two renderers), operation name, season line, four tabular
// stats, muted-amber wordmark, subtle vignette. NO location, NO map imagery
// (privacy). Pure given a 2D context, so /tmp/sr-check can execute it
// headlessly against a recording stub.
const SR_CARD_W = 1200, SR_CARD_H = 630;
function srDrawShareCard(ctx, o) {
  const W = SR_CARD_W, H = SR_CARD_H;
  // Ground: deep green brand gradient.
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0B1F14'); g.addColorStop(1, '#1E4A34');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // The tree, right of the text column. 48-grid × 8.4 ≈ 400px tall — large-art
  // territory, but the OUTLINE grammar (Amber Glass stays reserved for
  // rendered material art per BIBLE; this is a mark, drawn in its own strokes).
  ctx.save();
  ctx.translate(776, 56); ctx.scale(8.4, 8.4);
  ctx.strokeStyle = '#EB9A33'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.globalAlpha = 0.92;
  ctx.lineWidth = 2.2; ctx.stroke(new Path2D(M_TREE_CROWN_D));
  ctx.lineWidth = 3.4; ctx.stroke(new Path2D(M_TREE_GROUND_D));
  ctx.restore();
  // Vignette: darkened corners, centre untouched.
  const v = ctx.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 780);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  // Operation name + season line.
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FDF8F0';
  ctx.font = '700 58px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillText(o.name, 84, 158, 640);
  ctx.letterSpacing = '6px';
  ctx.fillStyle = '#EB9A33';
  ctx.font = '600 26px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillText(o.seasonLine, 84, 212, 640);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = 'rgba(235,154,51,0.3)';
  ctx.fillRect(84, 244, 560, 2);
  // Four big stats, tabular monospace (the app's instrument voice).
  (o.stats || []).slice(0, 4).forEach((st, i) => {
    const x = 84 + i * 262;
    ctx.fillStyle = '#FDF8F0';
    ctx.font = "700 62px ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
    ctx.fillText(st.val, x, 520, 226);
    if (st.unit) {
      const w = Math.min(ctx.measureText(st.val).width, 226);
      ctx.fillStyle = 'rgba(253,248,240,0.6)';
      ctx.font = '600 26px system-ui, -apple-system, sans-serif';
      ctx.fillText(st.unit, x + w + 10, 520);
    }
    ctx.letterSpacing = '3px';
    ctx.fillStyle = 'rgba(253,248,240,0.55)';
    ctx.font = '600 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(st.lbl, x, 558);
    ctx.letterSpacing = '0px';
  });
  // Wordmark, muted amber, bottom-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(235,154,51,0.55)';
  ctx.font = '600 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('sweetrun.app', W - 84, H - 40);
  ctx.textAlign = 'left';
}

// A running total that eases from its previous value to the new one (~300ms
// rAF tween, tabular-nums). Reduced motion / first paint: value renders as-is.
function RpNum({ value, dp = 0 }) {
  const target = parseFloat(value) || 0;
  const prevRef = React.useRef(target);
  const [disp, setDisp] = React.useState(target);
  React.useEffect(() => {
    const from = prevRef.current; prevRef.current = target;
    if (srReducedMotion() || from === target) { setDisp(target); return; }
    let raf; const t0 = performance.now(), DUR = 300;
    const step = now => {
      const p = Math.min(1, (now - t0) / DUR);
      setDisp(from + (target - from) * (1 - (1 - p) * (1 - p)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(disp, dp)}</span>;
}

// ─── Season replay stage (Pass 7) ────────────────────────────────────────────
// Full-card glass overlay on Recap. The autoplay sweep is a rAF loop that
// advances ONE STEP PER LOGGED DAY on the srReplayStepMs cadence — bars,
// progress and captions between steps are CSS transitions (transform/opacity
// only). Reduced motion: no autoplay; Prev/Next step buttons, same content,
// transitions killed in CSS. Reads only the data RecapTab already computed —
// no storage, no network.
function ReplayStage({ replay, moments, season, uLbl, lang, onClose, onShare }) {
  const rm = srReducedMotion();
  const steps = replay.steps;
  const stepMs = srReplayStepMs(steps.length);
  const [idx, setIdx] = React.useState(rm ? 0 : -1);
  const [playing, setPlaying] = React.useState(!rm);
  const idxRef = React.useRef(idx); idxRef.current = idx;
  const done = idx >= steps.length - 1;

  React.useEffect(() => {
    if (rm || !playing) return;
    let raf, last = performance.now();
    const tick = now => {
      if (now - last >= stepMs) {
        last = now;
        if (idxRef.current >= steps.length - 1) { setPlaying(false); return; }
        setIdx(i => Math.min(i + 1, steps.length - 1));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, rm, stepMs, steps.length]);

  React.useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const cur = idx >= 0 ? steps[idx] : null;
  const fmtDay = d => {
    return srDateShort(d, lang);
  };
  const capParts = cur ? moments.filter(m => m.date === cur.date).map(m =>
    m.type === 'bestRun' ? `${t(lang,'rpBestRun')}: ${fmt(m.val,0)} ${uLbl}` :
    m.type === 'firstBoil' ? t(lang,'rpFirstBoil') :
    `${t(lang,'rpPeakBrix')} ${(parseFloat(m.val)||0).toFixed(1)}°`) : [];
  const caption = cur ? (capParts.length ? `${fmtDay(cur.date)} — ${capParts.join(' · ')}` : fmtDay(cur.date)) : ' ';
  const bars = [];
  steps.forEach((st, si) => st.bars.forEach(v => bars.push({ v, si, best: v === replay.maxBar })));
  const prog = idx < 0 ? 0 : (steps.length > 1 ? idx / (steps.length - 1) : 1);
  const ended = done && !playing && idx >= 0;

  return (
    <div className="scrim rp-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={t(lang,'rpTitle')}>
      <div className="rp-stage" onClick={e => e.stopPropagation()}>
        <div className="rp-head">
          <div className="rp-title">{season} · {t(lang,'rpTitle')}</div>
          <button className="rp-x" aria-label={t(lang,'rpClose')} onClick={onClose}><I.x size={16} /></button>
        </div>
        <div className="rp-bars" aria-hidden="true">
          {bars.map((b, i) => (
            <div key={i} className="rp-barcol">
              {b.best && <div className={'rp-bestlbl' + (idx >= b.si ? ' on' : '')}>{fmt(b.v, 0)}</div>}
              <div className={'rp-bar' + (idx >= b.si ? ' on' : '') + (b.best ? ' best' : '')}
                style={{ height: `${Math.max(3, Math.round(b.v / replay.maxBar * 100))}%` }} />
            </div>
          ))}
        </div>
        <div className="rp-track"><div className="rp-fill" style={{ transform: `scaleX(${prog})` }} /></div>
        <div className="rp-dates"><span>{fmtDay(steps[0].date)}</span><span>{fmtDay(steps[steps.length - 1].date)}</span></div>
        <div className={'rp-cap' + (cur ? ' on' : '') + (capParts.length ? ' hot' : '')} aria-live="polite">{caption}</div>
        <div className="rp-nums">
          <div className="rp-numcell">
            <div className="rp-num"><RpNum value={cur ? cur.sapRun : 0} dp={0} /></div>
            <div className="rp-numlbl">{t(lang,'rpSapRun')} ({uLbl})</div>
          </div>
          <div className="rp-numcell">
            <div className="rp-num"><RpNum value={cur ? cur.syRun : 0} dp={1} /></div>
            <div className="rp-numlbl">{t(lang,'rpSyRun')} ({uLbl})</div>
          </div>
          <div className="rp-numcell">
            <div className="rp-num" style={{ fontSize: 15 }}>{t(lang,'rpStepOf').replace('{n}', String(Math.max(idx + 1, 0))).replace('{m}', String(steps.length))}</div>
            <div className="rp-numlbl">{ended ? t(lang,'rpDone') : ' '}</div>
          </div>
        </div>
        <div className="rp-ctrls">
          {rm ? (
            <React.Fragment>
              <button className="rp-btn" disabled={idx <= 0} onClick={() => setIdx(i => Math.max(0, i - 1))}>{t(lang,'rpPrev')}</button>
              <button className="rp-btn" disabled={done} onClick={() => setIdx(i => Math.min(steps.length - 1, i + 1))}>{t(lang,'rpNext')}</button>
            </React.Fragment>
          ) : ended ? (
            <button className="rp-btn" onClick={() => { setIdx(-1); setPlaying(true); }}><I.play size={13} /> {t(lang,'rpRestart')}</button>
          ) : (
            <button className="rp-btn" onClick={() => setPlaying(p => !p)}>{playing ? t(lang,'rpPause') : t(lang,'rpPlay')}</button>
          )}
          {(ended || rm) && (
            <button className="rp-btn primary" onClick={onShare}><I.upload size={13} /> {t(lang,'scBtn')}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function RecapTab({ season, units, sapBrix, trees=0, lang='en' }) {
  const [operatorName, setOperatorName] = React.useState(() => ls.get('sg_operator', ''));
  const saveOp = v => { setOperatorName(v); ls.set('sg_operator', v); };

  // ── RO Savings inputs ─────────────────────────────────────────────────────
  const [recapEvapRate,  setRecapEvapRate]  = React.useState(() => ls.get('sg_recap_evap',   50));
  const [burnLbsHr,      setBurnLbsHr]      = React.useState(() => ls.get('sg_recap_burn',   23));
  const [hasPreheater,   setHasPreheater]   = React.useState(() => ls.get('sg_recap_preheat', false));
  const [recapRoBrix,    setRecapRoBrix]    = React.useState(() => ls.get('sg_dx_robrix',     8));
  const [showROInputs,   setShowROInputs]   = React.useState(false);
  const saveR = (key, setter) => v => { setter(v); ls.set(key, v); };

  // ── Pull data ─────────────────────────────────────────────────────────────
  const allLogs    = ls.get('sg_logs2', {});
  const slog       = allLogs[season]      || {};
  const prevLog    = allLogs[season - 1]  || {};
  const brixArr    = ls.get('sg_brixlog', []);
  const uLbl       = units === 'GAL' ? 'gal' : 'L';

  // These were destructured out of seasonTotals under gallon names while holding
  // display-unit values — which is how a 500-tap season that graded D in gallons
  // graded A in litres, and how every dollar figure on this screen ran 3.8x high.
  // seasonTotalsGal does the conversion, and its names are now true.
  const { sapGal, syrupGal, roGal, evapGal, fuelT: fuelGal } = seasonTotalsGal(slog, units);
  const { sapGal: prevSap, syrupGal: prevSyrup } = seasonTotalsGal(prevLog, units);

  const theorRatio  = sapBrix > 0 ? (RULE_DIVISOR / sapBrix) : 0;
  const ratioActual = actualRatio(sapGal, syrupGal) || 0;

  // Best single collection day
  const sapEntries = [...(slog.sapCollected || [])].sort((a, b) => (parseFloat(b.val)||0) - (parseFloat(a.val)||0));
  const bestDay    = sapEntries[0];

  // Season span from log entry dates
  const allDates = [...(slog.sapCollected||[]), ...(slog.syrupMade||[])].map(e=>e.date).filter(Boolean).sort((a,b)=>srDateMs(a)-srDateMs(b));
  const firstDate = allDates[0] || null;
  const lastDate  = allDates[allDates.length-1] || null;
  const parseDate = s => srDateMs(s);
  const seasonDays = (firstDate && lastDate)
    ? Math.round((parseDate(lastDate) - parseDate(firstDate)) / 86400000) + 1 : null;

  // Brix stats from brixLog
  const bVals  = brixArr.map(e => parseFloat(e.brix)).filter(v => !isNaN(v) && v > 0);
  const avgBrix = bVals.length > 0 ? bVals.reduce((s,v)=>s+v,0)/bVals.length : null;
  const maxBrix = bVals.length > 0 ? Math.max(...bVals) : null;
  const minBrix = bVals.length > 0 ? Math.min(...bVals) : null;

  // YoY
  const sapChg   = prevSap   > 0 ? ((sapGal   - prevSap)   / prevSap   * 100) : null;
  const syrupChg = prevSyrup > 0 ? ((syrupGal - prevSyrup) / prevSyrup * 100) : null;

  const hasData = sapGal > 0 || syrupGal > 0;

  // ── Season replay + share card (Pass 7) ──────────────────────────────────
  // Same store slice, same parseFloat sums, same sort as SapChart below —
  // srReplaySteps is the tested band helper; nothing here recomputes.
  const [showReplay, setShowReplay] = React.useState(false);
  const replayData    = srReplaySteps(slog);
  const replayMoments = srReplayMoments(replayData.steps, brixArr);
  const canReplay     = replayData.entryCount >= 3;

  const shareCard = () => {
    const cv = document.createElement('canvas');
    cv.width = SR_CARD_W; cv.height = SR_CARD_H;
    const ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) return;
    srDrawShareCard(ctx, {
      name: (operatorName || '').trim() || t(lang,'scDefaultName'),
      seasonLine: `${t(lang,'scSeasonLine')} ${season}`,
      stats: [   // the SAME totals rendered in the Big-4 cards below
        { val: syrupGal > 0 ? fmt(fromGal(syrupGal, units), 1) : '—', unit: uLbl, lbl: t(lang,'scSyrup') },
        { val: sapGal   > 0 ? fmt(fromGal(sapGal, units), 0)   : '—', unit: uLbl, lbl: t(lang,'scSap') },
        { val: ratioActual > 0 ? ratioActual.toFixed(1) + ':1' : '—', unit: '', lbl: t(lang,'scRatio') },
        { val: (parseInt(trees) || 0) > 0 ? fmt(parseInt(trees), 0) : '—', unit: '', lbl: t(lang,'scTaps') },
      ],
    });
    // Local PNG only: OS share sheet with the file when available, else a
    // download. Nothing is uploaded anywhere (invariant 2).
    cv.toBlob(blob => {
      if (!blob) return;
      const fname = `sweetrun-season-${season}.png`;
      const tryShare = async () => {
        if (navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], fname, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return true; }
          } catch (e) { if (e && e.name === 'AbortError') return true; }
        }
        return false;
      };
      tryShare().then(shared => {
        if (shared) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fname;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      });
    }, 'image/png');
  };

  // ── SVG Sap Collection Bar Chart ─────────────────────────────────────────
  const SapChart = () => {
    const entries = (slog.sapCollected || [])
      .map(e => ({ date: e.date, val: parseFloat(e.val)||0 }))
      .filter(e => e.val > 0)
      .sort((a,b) => (a.date||'') < (b.date||'') ? -1 : 1);
    if (entries.length === 0) return null;
    const W = 320, H = 90, PAD = 4;
    const maxVal = Math.max(...entries.map(e=>e.val), 1);
    const barW   = Math.max(2, Math.floor((W - PAD*2) / entries.length) - 2);
    const gap    = (W - PAD*2 - barW * entries.length) / Math.max(entries.length - 1, 1);
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H+16}`} style={{ display:'block', overflow:'visible' }}>
        {entries.map((e, i) => {
          const barH  = Math.max(2, Math.round((e.val / maxVal) * H));
          const x     = PAD + i * (barW + gap);
          const y     = H - barH;
          const isBest = e.val === maxVal;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH}
                fill={isBest ? '#2dd4a7' : 'rgba(45,212,167,0.35)'}
                rx={barW > 4 ? 2 : 0} />
              {isBest && (
                <text x={x + barW/2} y={y - 3} fontSize="12" fill="#2dd4a7"
                  textAnchor="middle" fontWeight="700">{e.val.toFixed(0)}</text>
              )}
            </g>
          );
        })}
        {/* Axis label */}
        <text x={PAD} y={H+14} fontSize="12" fill="#7f92a6">{srDateShort(firstDate, lang)}</text>
        {lastDate !== firstDate && (
          <text x={W-PAD} y={H+14} fontSize="12" fill="#7f92a6" textAnchor="end">{srDateShort(lastDate, lang)}</text>
        )}
      </svg>
    );
  };

  // ── Brix Sparkline ───────────────────────────────────────────────────────
  const BrixLine = () => {
    if (bVals.length < 2) return null;
    const W = 320, H = 50;
    const mn = Math.min(...bVals) - 0.2, mx = Math.max(...bVals) + 0.2, rng = mx - mn || 1;
    const pts = bVals.map((v, i) => {
      const x = (i / (bVals.length - 1)) * W;
      const y = H - ((v - mn) / rng) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H+4}`} style={{ display:'block' }}>
        <polyline points={pts} fill="none" stroke="#2dd4a7" strokeWidth="2" strokeLinejoin="round" />
        {bVals.map((v, i) => {
          const x = (i / (bVals.length - 1)) * W;
          const y = H - ((v - mn) / rng) * H;
          return <circle key={i} cx={x} cy={y} r="3" fill="#2dd4a7" />;
        })}
      </svg>
    );
  };

  // ── Stat card ──────────────────────────────────────────────────────────────
  const Stat = ({ val, lbl, sub, accent }) => (
    <div className="recap-stat-card" style={{ background:'#0f1720', border:'1px solid #1e2d3d', borderRadius:16, padding:'12px 10px', textAlign:'center' }}>
      <div className="recap-stat-val" style={{ fontSize:20, fontWeight:700, color:'#e6edf3', lineHeight:1.1 }}>{val}</div>
      <div className="recap-stat-lbl" style={{ fontSize:12, color:'#7f92a6', fontWeight:700, marginTop:4, letterSpacing:'0.06em', textTransform:'uppercase' }}>{lbl}</div>
      {sub && <div style={{ fontSize:12, color:'#7f92a6', marginTop:2 }}>{sub}</div>}
    </div>
  );

  const Sec = ({ title, children, icon }) => (
    <div className="recap-section card">
      <div style={{ fontSize:13, fontWeight:700, color:'#7f92a6', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
        {icon}{title}
      </div>
      {children}
    </div>
  );

  const YoYBadge = ({ pct, label }) => {
    if (pct === null) return null;
    const up = pct >= 0;
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #131e2c' }}>
        <span style={{ fontSize:13, color:'#7f92a6' }}>{label}</span>
        <span className={up ? 'recap-yoy-up' : 'recap-yoy-dn'}
          style={{ fontWeight:700, fontSize:14, color: up ? '#2dd4a7' : '#f85149' }}>
          {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <div className="recap-printable" style={{ padding:'0 0 40px' }}>

      {/* ── Print header (only visible on print) ── */}
      <div style={{ display:'none' }} className="recap-print-header">
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:26, fontWeight:800 }}><I.mapleLeaf size={24} color="#2dd4a7" /> {season} Maple Season Recap</div>
          {operatorName && <div style={{ fontSize:15, color:'#444', marginTop:4 }}>{operatorName}</div>}
          <div style={{ fontSize:12, color:'#666', marginTop:2 }}>Generated by SweetRun · sweetrun.app</div>
        </div>
      </div>

      {/* ── Screen header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div className="recap-header" style={{ fontWeight:800, fontSize:22, lineHeight:1.2, letterSpacing:'-0.01em' }}>{season} {lang==='fr'?'Bilan de saison':'Season Recap'}</div>
        </div>
        <button
          className="recap-print-btn"
          onClick={() => window.print()}
          style={{ background:'#0f1720', border:'1px solid #1e2d3d', borderRadius:10, padding:'10px 14px', minHeight:44, fontWeight:700, fontSize:13, color:'#e6edf3', cursor:'pointer', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}
        >
          <I.download size={15} color="#7f92a6" /> {t(lang,'exportPDF')}
        </button>
      </div>

      {/* ── Replay + share card (Pass 7) ── */}
      <div className="recap-no-print rp-row">
        <button className="rp-open" disabled={!canReplay} onClick={() => setShowReplay(true)}>
          <I.play size={14} color="currentColor" /> {t(lang,'rpBtn')}
        </button>
        <button className="rp-open" onClick={shareCard}>
          <I.upload size={14} color="currentColor" /> {t(lang,'scBtn')}
        </button>
      </div>
      {!canReplay && (
        <div className="recap-no-print rp-hint">{t(lang,'rpNeedData')}</div>
      )}
      {showReplay && canReplay && (
        <ReplayStage replay={replayData} moments={replayMoments} season={season} uLbl={uLbl}
          lang={lang} onClose={() => setShowReplay(false)} onShare={shareCard} />
      )}

      {!hasData && (
        <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:12, padding:'14px 16px', fontSize:13, color:'#e0a44a', lineHeight:1.5, marginBottom:16 }}>
          <I.alert size={14} color="currentColor" /> {t(lang,'noDataMsgRecap').replace('{year}',season)}
        </div>
      )}

      {hasData && <SweetRunScore sapGal={sapGal} syrupGal={syrupGal} sapBrix={sapBrix} trees={parseInt(trees)||0} fuelGal={fuelGal} season={season} lang={lang} />}
      {hasData && <YieldGapAnalyzer sapGal={sapGal} syrupGal={syrupGal} sapBrix={sapBrix} trees={parseInt(trees)||0} season={season} />}

      {/* ── Operator name input ── */}
      <div className="recap-no-print" style={{ marginBottom:14 }}>
        <label htmlFor="recap-op-name" className="field-label" style={{ display:'block', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700 }}>Operation name</label>
        <input
          id="recap-op-name"
          type="text"
          value={operatorName}
          onChange={e => saveOp(e.target.value)}
          aria-label={t(lang,'operatorPh')}
          placeholder={t(lang,'operatorPh')}
          style={{ width:'100%', boxSizing:'border-box' }}
        />
      </div>

      {/* ── Big 4 stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
        <Stat val={sapGal > 0 ? fmt(fromGal(sapGal, units),0) : '—'} lbl={`${t(lang,'totalSapLbl')} (${uLbl})`} sub={`${(slog.sapCollected||[]).length} ${(slog.sapCollected||[]).length!==1?t(lang,'collectionPlur'):t(lang,'collectionSing')}`} />
        <Stat val={syrupGal > 0 ? fmt(fromGal(syrupGal, units),1) : '—'} lbl={`${t(lang,'syrupMadeLbl')} (${uLbl})`} sub={`${(slog.syrupMade||[]).length} ${(slog.syrupMade||[]).length!==1?t(lang,'batchPlur'):t(lang,'batchSing')}`} accent="#a78bfa" />
        <Stat val={ratioActual > 0 ? ratioActual.toFixed(1)+':1' : '—'} lbl={t(lang,'actualRatioLbl')} sub={theorRatio > 0 ? `${t(lang,'theoryPrefix')} ${theorRatio.toFixed(1)}:1` : null} accent={ratioActual > 0 && theorRatio > 0 && ratioActual <= theorRatio * 1.15 ? '#2dd4a7' : '#e0a44a'} />
        <Stat val={seasonDays != null ? `${seasonDays}d` : '—'} lbl={t(lang,'seasonLengthLbl')} sub={firstDate && lastDate ? `${srDateShort(firstDate, lang)} – ${srDateShort(lastDate, lang)}` : null} accent="#58a6ff" />
      </div>

      {/* ── Secondary stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
        <Stat val={bestDay ? fmt(bestDay.val,0) : '—'} lbl={`${t(lang,'bestRunLbl')} (${uLbl})`} sub={bestDay?.date || null} accent="#e0a44a" />
        <Stat val={roGal > 0 ? fmt(fromGal(roGal, units),0) : '—'} lbl={`${t(lang,'rodLbl')} (${uLbl})`} sub={roGal > 0 && evapGal > 0 ? `${(roGal/evapGal*100).toFixed(0)}% util` : null} accent="#2dd4a7" />
        <Stat val={avgBrix != null ? avgBrix.toFixed(2)+'°' : sapBrix+'°'} lbl={t(lang,'avgBrixLbl')} sub={maxBrix != null ? `${minBrix?.toFixed(2)}–${maxBrix?.toFixed(2)}°` : t(lang,'estimatedLbl')} accent="#a78bfa" />
      </div>

      {/* ── Sap collection chart ── */}
      {(slog.sapCollected||[]).length > 1 && (
        <Sec title={t(lang,'sapCollByRun')} icon={<I.droplet size={12} color="#2dd4a7"/>}>
          <SapChart />
          <div style={{ fontSize:13, color:'#7f92a6', marginTop:6 }}>
            {t(lang,'peakRunNote')}
          </div>
        </Sec>
      )}

      {/* ── Brix trend ── */}
      {bVals.length >= 2 && (
        <Sec title={t(lang,'sapBrixTrend')} icon={<I.percent size={12} color="#7f92a6"/>}>
          <BrixLine />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#7f92a6', marginTop:6 }}>
            <span>{t(lang,'lowLbl')}: {minBrix?.toFixed(2)}°Bx</span>
            <span>{t(lang,'avgLbl')}: {avgBrix?.toFixed(2)}°Bx</span>
            <span>{t(lang,'highLbl')}: {maxBrix?.toFixed(2)}°Bx</span>
          </div>
        </Sec>
      )}

      {/* ── Year-over-year ── */}
      {(sapChg !== null || syrupChg !== null) && (
        <Sec title={t(lang,'vsLastSeason').replace('{year}',season-1)} icon={<I.trendUp size={12} color="#58a6ff"/>}>
          <YoYBadge pct={sapChg}   label={`${t(lang,'sapCollectedLbl')} (${uLbl})`} />
          <YoYBadge pct={syrupChg} label={`${t(lang,'syrupProducedLbl')} (${uLbl})`} />
          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, fontSize:12, color:'#7f92a6' }}>
            <span>{season-1}: {prevSap.toFixed(1)} gal sap / {prevSyrup.toFixed(1)} gal syrup</span>
          </div>
        </Sec>
      )}

      {/* ── Conversion notes ── */}
      {ratioActual > 0 && theorRatio > 0 && (
        <Sec title={t(lang,'convEfficiency')} icon={<I.scale size={12} color="#7f92a6"/>}>
          <div style={{ display:'flex', gap:12, justifyContent:'space-between', marginBottom:8 }}>
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ fontSize:20, fontWeight:700, color:'#e6edf3' }}>{ratioActual.toFixed(1)}:1</div>
              <div style={{ fontSize:13, color:'#7f92a6' }}>{t(lang,'actualRatioShort')}</div>
            </div>
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ fontSize:20, fontWeight:700, color:'#e6edf3' }}>{theorRatio.toFixed(1)}:1</div>
              <div style={{ fontSize:13, color:'#7f92a6' }}>{t(lang,'rule86Lbl')} ({sapBrix}°Brix)</div>
            </div>
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ fontSize:20, fontWeight:700, color: ratioActual <= theorRatio*1.12 ? '#3fb950' : '#e0a44a' }}>
                {ratioActual > 0 ? ((ratioActual - theorRatio)/theorRatio*100).toFixed(0) : '—'}%
              </div>
              <div style={{ fontSize:13, color:'#7f92a6' }}>{t(lang,'vsTheoretical')}</div>
            </div>
          </div>
          {ratioActual > theorRatio * 1.15 && (
            <div style={{ fontSize:13, color:'#7f92a6', lineHeight:1.5 }}>
              Your ratio is {((ratioActual - theorRatio)/theorRatio*100).toFixed(0)}% above theoretical — check for foam loss, evaporator leaks, or thin drawoff.
            </div>
          )}
        </Sec>
      )}

      {/* ── RO Savings Chart ── */}
      {/* roGal > sapGal is impossible — you cannot push more sap through the RO
          than you collected — and it made (sapGal - roGal) negative, which showed
          "30 hrs saved" on a 20-hour boil and a bar with negative width. It means
          a double-entry or a units slip, so the section withholds instead. */}
      {sapGal > 0 && recapEvapRate > 0 && roGal <= sapGal && (() => {
        // Straight-boil: boil all the sap at evap rate
        const straightHrs  = sapGal / recapEvapRate;
        const straightWood = straightHrs * burnLbsHr;

        // With RO: concentrate the ro'd portion, then boil
        const roConc      = recapRoBrix > sapBrix && roGal > 0
          ? roGal * (sapBrix / recapRoBrix)   // RO reduces volume proportionally
          : roGal;
        const roReducedSap = (sapGal - roGal) + roConc;
        const preH         = hasPreheater ? 0.85 : 1.0;  // preheater saves ~15% boil time
        const roHrs        = (roReducedSap / recapEvapRate) * preH;
        const roWood       = roHrs * burnLbsHr * (hasPreheater ? 0.88 : 1.0);

        const savedHrs  = straightHrs - roHrs;
        const savedWood = straightWood - roWood;

        const maxHrs  = Math.max(straightHrs, 0.1);
        const maxWood = Math.max(straightWood, 0.1);
        const W = 280;

        const Bar = ({ label, value, max, color, unit, secondary }) => {
          const pct = Math.min(1, value / max);
          const BAR_W = Math.round(W * pct);
          return (
            <div style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#7f92a6', marginBottom:3 }}>
                <span style={{ fontWeight:600 }}>{label}</span>
                <span style={{ color:'#e6edf3', fontWeight:700 }}>{value >= 10 ? value.toFixed(0) : value.toFixed(1)} <span style={{ color:'#7f92a6', fontWeight:500 }}>{unit}</span></span>
              </div>
              <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:4, height:16, overflow:'hidden' }}>
                <div style={{ width: BAR_W, height:'100%', background: color, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:4 }}>
                </div>
              </div>
              {secondary && <div style={{ fontSize:13, color:'#7f92a6', marginTop:2, textAlign:'right' }}>{secondary}</div>}
            </div>
          );
        };

        return (
          <Sec title={t(lang,'roSavingsVsBoil')} icon={<I.filter size={12} color="#58a6ff"/>}>
            {/* Inputs toggle */}
            <div style={{ marginBottom:12 }}>
              <button onClick={() => setShowROInputs(s=>!s)}
                style={{ background:'none', border:'none', color:'#7f92a6', fontSize:12, cursor:'pointer', textDecoration:'underline', padding:0 }}>
                {showROInputs ? `▲ ${t(lang,'hideInputs')}` : `▼ ${t(lang,'adjustInputs')}`}
              </button>
              {showROInputs && (
                <div style={{ marginTop:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div>
                    <div style={{ fontSize:13, color:'#7f92a6', marginBottom:3 }}>{t(lang,'evapRateInput')}</div>
                    <input type="number" value={recapEvapRate} min={1} max={500} step={5}
                      onChange={e => saveR('sg_recap_evap', setRecapEvapRate)(parseFloat(e.target.value)||50)}
                      style={{ width:'100%', boxSizing:'border-box', background:'#0a1420', border:'1px solid #1e2d3d', borderRadius:8, padding:'6px 10px', color:'#e6edf3', fontSize:13 }} />
                  </div>
                  <div>
                    <div style={{ fontSize:13, color:'#7f92a6', marginBottom:3 }}>{t(lang,'woodBurnInput')}</div>
                    <input type="number" value={burnLbsHr} min={5} max={100} step={1}
                      onChange={e => saveR('sg_recap_burn', setBurnLbsHr)(parseFloat(e.target.value)||23)}
                      style={{ width:'100%', boxSizing:'border-box', background:'#0a1420', border:'1px solid #1e2d3d', borderRadius:8, padding:'6px 10px', color:'#e6edf3', fontSize:13 }} />
                  </div>
                  <div>
                    <div style={{ fontSize:13, color:'#7f92a6', marginBottom:3 }}>{t(lang,'roBrixInput')}</div>
                    <input type="number" value={recapRoBrix} min={1} max={20} step={0.5}
                      onChange={e => saveR('sg_dx_robrix', setRecapRoBrix)(parseFloat(e.target.value)||8)}
                      style={{ width:'100%', boxSizing:'border-box', background:'#0a1420', border:'1px solid #1e2d3d', borderRadius:8, padding:'6px 10px', color:'#e6edf3', fontSize:13 }} />
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:18 }}>
                    <input type="checkbox" id="preheat-chk" checked={hasPreheater}
                      onChange={e => saveR('sg_recap_preheat', setHasPreheater)(e.target.checked)}
                      style={{ accentColor:'#2dd4a7', width:16, height:16 }} />
                    <label htmlFor="preheat-chk" style={{ fontSize:13, color:'#7f92a6', cursor:'pointer' }}>{t(lang,'preheaterLbl')}</label>
                  </div>
                </div>
              )}
            </div>

            {/* Boil time bars */}
            <div style={{ fontSize:13, fontWeight:700, color:'#7f92a6', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>{t(lang,'boilTimeLbl')}</div>
            <Bar label={t(lang,'straightBoilLbl')} value={straightHrs} max={maxHrs} color="#7f92a6" unit="hrs" />
            <Bar label={hasPreheater?t(lang,'withROPreLbl'):t(lang,'withROLbl')} value={roHrs} max={maxHrs} color="#2dd4a7" unit="hrs"
              secondary={roGal > 0 ? t(lang,'roConcentratedNote').replace(/\{ro\}/g,fmt(fromGal(roGal,units),0)).replace(/\{conc\}/g,fmt(fromGal(roConc,units),0)).replace(/\{u\}/g,uLbl) : t(lang,'noRODataNote')} />

            {/* Wood bars */}
            <div style={{ fontSize:13, fontWeight:700, color:'#7f92a6', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6, marginTop:14 }}>{t(lang,'woodUsedLbl')}</div>
            <Bar label={t(lang,'straightBoilLbl')} value={straightWood} max={maxWood} color="#7f92a6" unit="lbs" />
            <Bar label={hasPreheater?t(lang,'withROPreLbl'):t(lang,'withROLbl')} value={roWood} max={maxWood} color="#2dd4a7" unit="lbs" />

            {/* Savings summary */}
            {savedHrs > 0 && (
              <div style={{ background:'#0d1a2b', borderRadius:12, padding:'12px 14px', marginTop:14, display:'flex', gap:20, justifyContent:'center' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:700, color:'#3fb950' }}>{savedHrs.toFixed(0)} hrs</div>
                  <div style={{ fontSize:13, color:'#7f92a6' }}>{t(lang,'savedBoilingLbl')}</div>
                </div>
                <div style={{ width:1, background:'rgba(255,255,255,0.08)' }} />
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:700, color:'#3fb950' }}>{savedWood >= 1000 ? (savedWood/1000).toFixed(1)+'k' : savedWood.toFixed(0)} lbs</div>
                  <div style={{ fontSize:13, color:'#7f92a6' }}>{t(lang,'woodSavedLbl')}</div>
                </div>
                <div style={{ width:1, background:'rgba(255,255,255,0.08)' }} />
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:800, color:'#2dd4a7' }}>{(savedWood/2000).toFixed(2)}</div>
                  <div style={{ fontSize:13, color:'#7f92a6' }}>{t(lang,'cordsSavedLbl')}</div>
                </div>
              </div>
            )}
            {roGal === 0 && (
              <div style={{ fontSize:12, color:'#7f92a6', marginTop:8, lineHeight:1.5 }}>
                {t(lang,'logRONote')}
              </div>
            )}
          </Sec>
        );
      })()}

      {/* ── Per-point breakdown ── */}
      {(() => {
        const cpoints = ls.get('sg_cpoints', []);
        if (cpoints.length === 0) return null;
        const sapEntries = slog.sapCollected || [];
        const syrupEntries = slog.syrupMade || [];
        // Check if any entries are tagged
        const hasTagged = [...sapEntries, ...syrupEntries].some(e => e.point);
        if (!hasTagged) return null;
        const uLbl2 = units === 'GAL' ? 'gal' : 'L';
        return (
          <Sec title={t(lang,'byCollPoint')} icon={<I.circle size={12} color="#7f92a6"/>}>
            {cpoints.map(pt => {
              const ptSap   = sapEntries.filter(e => e.point === pt.id).reduce((s,e)=>s+(parseFloat(e.val)||0),0);
              const ptSyrup = syrupEntries.filter(e => e.point === pt.id).reduce((s,e)=>s+(parseFloat(e.val)||0),0);
              const ptRuns  = sapEntries.filter(e => e.point === pt.id).length;
              const ptRatio = ptSyrup > 0 ? (ptSap / ptSyrup).toFixed(1)+':1' : '—';
              return (
                <div key={pt.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #131e2c' }}>
                  <div style={{ width:11, height:11, borderRadius:'50%', background:pt.color, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:'#e6edf3' }}>{pt.name}</div>
                    <div style={{ fontSize:12, color:'#7f92a6', marginTop:2 }}>{ptRuns} {t(lang,'runsLbl')} · {t(lang,'ratioLbl')} {ptRatio}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:700, fontSize:15, color:pt.color }}>{ptSap.toFixed(1)} <span style={{ fontSize:13, fontWeight:400 }}>{uLbl2} {t(lang,'sapShort')}</span></div>
                    {ptSyrup > 0 && <div style={{ fontSize:12, color:'#7f92a6' }}>{ptSyrup.toFixed(1)} {uLbl2} {t(lang,'syrupShort')}</div>}
                  </div>
                </div>
              );
            })}
            {/* Untagged / shared */}
            {(() => {
              const unSap   = sapEntries.filter(e => !e.point).reduce((s,e)=>s+(parseFloat(e.val)||0),0);
              const unSyrup = syrupEntries.filter(e => !e.point).reduce((s,e)=>s+(parseFloat(e.val)||0),0);
              if (unSap === 0 && unSyrup === 0) return null;
              return (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0' }}>
                  <div style={{ width:11, height:11, borderRadius:'50%', background:'#7f92a6', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'#7f92a6' }}>Unassigned / shared</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'#7f92a6' }}>{unSap.toFixed(1)} {uLbl} sap</div>
                    {unSyrup > 0 && <div style={{ fontSize:12, color:'#7f92a6' }}>{unSyrup.toFixed(1)} {uLbl} syrup</div>}
                  </div>
                </div>
              );
            })()}
          </Sec>
        );
      })()}

      {/* ── Footer / attribution ── */}
      <div style={{ textAlign:'center', marginTop:20, color:'#2d3d4d', fontSize:13 }}>
        Generated by SweetRun · {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}




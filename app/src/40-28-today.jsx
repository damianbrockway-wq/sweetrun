// ─── TODAY ────────────────────────────────────────────────────────────────────
// The landing screen. Every number on it comes from what is already on the
// device, so it is the same with no signal as with five bars.
// ─── Season jar (Pass 5) ─────────────────────────────────────────────────────
// The Today goal card's progress indicator: the M.jug outline, its interior
// filling with amber to the goal percentage. Garnish only — the "% of N gal"
// text beside it is unchanged and stays the truth. The fill rises once over
// 600ms (CSS animates from the empty offset to this inline end-state), then
// the surface settles with one tiny tilt. Reduced motion: both animations are
// off in CSS, leaving the static fill at the right level.
function SeasonJar({ pct }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  const IH = 27;                       // jug interior height in the 48 grid (body y≈15.7→42.7 inside the stroke)
  const off = +(((100 - p) / 100) * IH).toFixed(2);
  return (
    <svg width={44} height={44} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ flexShrink:0, display:'block', color:'#EB9A33' }}>
      <defs>
        <clipPath id="sr-jar-clip">
          {/* The jug body path from M.jug — the fill can never escape the outline */}
          <path d="M23 14 C30.5 14 36 20 36 28.5 C36 37.5 30.5 43 23 43 C15.5 43 10 37.5 10 28.5 C10 20 15.5 14 23 14 Z"/>
        </clipPath>
      </defs>
      <g clipPath="url(#sr-jar-clip)">
        <g className="sr-jar-tilt">
          <rect className="sr-jar-fill" x="7" y="15.7" width="34" height="31" rx="0"
            fill="#EB9A33" opacity="0.88" style={{ transform:`translateY(${off}px)` }} />
        </g>
      </g>
      {/* Outline strokes — byte-for-byte the M.jug mark (BIBLE outline set v4) */}
      <rect stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" x="18.5" y="4.5" width="9" height="4" rx="2" fill="none"/>
      <path stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" d="M20.7 8.5 C20.5 10.3 20.5 12 20.6 13.5 M25.3 8.5 C25.5 10.3 25.5 12 25.4 13.5 M23 14 C30.5 14 36 20 36 28.5 C36 37.5 30.5 43 23 43 C15.5 43 10 37.5 10 28.5 C10 20 15.5 14 23 14 Z M35 18.5 Q40 19.5 39.5 24 Q39.2 27 35.8 27.5"/>
    </svg>
  );
}

function TodayTab({ lang, units, season, trees, sapBrix, go }) {
  const u     = units === 'L' ? 'L' : 'gal';
  const conv  = v => units === 'L' ? v * 3.78541 : v;
  const logs  = ls.get('sg_logs2', {});
  const slog  = logs[season] || {};
  // sapT/syT are in the sugarmaker's display unit — right for the figures below.
  // goal and the yield model are in gallons, so every COMPARISON uses the gallon
  // pair. Mixing the two read 50 L of syrup as 50 gal against a gallon goal and
  // showed a full jar at "100%" on a season that was a third of the way there.
  const { sapT, syT } = seasonTotals(slog);
  const { sapGal, syrupGal } = seasonTotalsGal(slog, units);
  const model = yieldModelSaved();
  const taps  = parseInt(trees) || 0;
  const goal  = taps * yieldMidOf(model);
  const pct   = goal > 0 ? Math.min(100, (syrupGal / goal) * 100) : 0;
  const ratio = actualRatio(sapGal, syrupGal);
  const theor = RULE_DIVISOR / (parseFloat(sapBrix) || 2);

  const entries = ['sapCollected','syrupMade','sapRO','sapEvap','fuelUsed','boilHours']
    .flatMap(k => (slog[k] || []).map(e => ({ ...e, kind:k })));
  const last = entries.length
    ? entries.reduce((a, b) => (srDateMs(b.date) > srDateMs(a.date) ? b : a))
    : null;
  const recent = [...entries].sort((a, b) => srDateMs(b.date) - srDateMs(a.date) || (b.id||0) - (a.id||0)).slice(0, 3);
  const KIND = { sapCollected:'sap collected', syrupMade:'syrup made', sapRO:'sap through R/O',
                 sapEvap:'sap in the evaporator', fuelUsed:'fuel burned', boilHours:'hours boiling' };

  const today = new Date();
  const dateLine = today.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-US',
    { weekday:'long', month:'long', day:'numeric' });

  // One figure carries the accent and the size; the other two are set in text colour.
  const Eyebrow = ({ children }) => (
    <div style={{ fontSize:12, fontWeight:700, color:'#7f92a6', letterSpacing:'0.08em', textTransform:'uppercase' }}>{children}</div>
  );
  const Fig = ({ value, unit, sub, lead }) => (
    <div style={{ minWidth:0 }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
        <span style={{ fontSize:lead?28:20, fontWeight:lead?800:700, color:lead?'#2dd4a7':'#e6edf3', lineHeight:1.05, letterSpacing:'-0.01em' }}>{value}</span>
        {unit && <span style={{ fontSize:13, color:'#7f92a6', fontWeight:500, whiteSpace:'nowrap' }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize:12, color:'#7f92a6', marginTop:3, whiteSpace:'nowrap' }}>{sub}</div>}
    </div>
  );

  // The one thing Today can say that no other screen says first: where this season's yield per tap
  // stands against the benchmark for the producer's own system. Every input is already on the device.
  const perTap = taps > 0 && syT > 0 ? syT / taps : null;
  const perTapGal = perTap == null ? null : (units === 'L' ? perTap / 3.78541 : perTap);
  const standing = perTap == null ? null
    : perTapGal >= model.high ? 'above the range' : perTapGal >= model.low ? 'inside the range' : 'below the range';

  const SHORT = { sapCollected:'Sap collected', syrupMade:'Syrup made', sapRO:'Sap through R/O',
                  sapEvap:'Sap evaporated', fuelUsed:'Fuel burned', boilHours:'Hours boiling' };
  const unitOf = k => k === 'fuelUsed' ? (FUELS.find(f=>f.label===ls.get('sg_fuel','Firewood (cord)'))||FUELS[0]).unit : k === 'boilHours' ? 'hr' : u;
  const dpOf   = k => k === 'syrupMade' || k === 'fuelUsed' || k === 'boilHours' ? 1 : 0;

  // Boil Day shortcut (Pass 6): quiet row when idle; live amber instrument
  // chip while a session runs. Elapsed refreshes on the half-minute — the
  // chip shows h:mm, so a 1s tick would be theater.
  const bdSess = ls.get('sg_boil_session', null);
  const bdActive = !!(bdSess && bdSess.start);
  const [bdNow, setBdNow] = useState(Date.now());
  useEffect(() => {
    if (!bdActive) return;
    const iv = setInterval(() => setBdNow(Date.now()), 30000);
    return () => clearInterval(iv);
  }, [bdActive]);
  const bdHM = ms => { const m = Math.max(0, Math.floor(ms / 60000)); return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`; };

  return (
    <div style={{ paddingBottom:48 }}>
      {/* One line: the day and the season. The producer knows what day it is. */}
      <div style={{ fontSize:13, color:'#7f92a6', margin:'0 0 12px', lineHeight:1.4 }}>
        {dateLine} · <span style={{ fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', fontSize:12 }}>{season} {lang==='fr' ? 'saison' : 'season'}</span>
      </div>

      {/* How the season is doing: one card — goal, figures, per tap against the benchmark, the verdict */}
      <div className="card">
        {/* Pass 5: the flat progress bar became the season jar — same slot, same
            text (numbers are the truth; the jar is garnish). */}
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <SeasonJar pct={pct} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <Eyebrow>Season goal</Eyebrow>
              <span style={{ color:'#7f92a6', fontSize:14 }}>{fmt(pct,0)}% of {fmt(conv(goal),0)} {u}</span>
            </div>
          </div>
        </div>
        <div className="stat3" style={{ marginTop:14, paddingTop:14, borderTop:'1px solid #131e2c' }}>
          <Eyebrow>Syrup</Eyebrow><Eyebrow>Sap</Eyebrow><Eyebrow>Ratio</Eyebrow>
          <Fig value={fmt(syT,1)}  unit={u} lead />
          <Fig value={fmt(sapT,0)} unit={u} />
          <Fig value={ratio ? `${ratio.toFixed(0)}:1` : '—'} sub={ratio ? `theory ${fmt(theor,0)}:1` : 'no syrup logged'} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12, marginTop:14, paddingTop:14, borderTop:'1px solid #131e2c' }}>
          <div style={{ minWidth:0 }}>
            <Eyebrow>Per tap so far</Eyebrow>
            <div style={{ display:'flex', alignItems:'baseline', gap:4, marginTop:4 }}>
              <span style={{ fontSize:20, fontWeight:700, color:'#e6edf3', lineHeight:1.05 }}>{perTap != null ? fmt(perTap,2) : '—'}</span>
              <span style={{ fontSize:13, color:'#7f92a6', fontWeight:500 }}>{u}/tap</span>
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <Eyebrow>Benchmark</Eyebrow>
            <div style={{ display:'flex', alignItems:'baseline', gap:4, marginTop:4, justifyContent:'flex-end' }}>
              <span style={{ fontSize:20, fontWeight:700, color:'#e6edf3', lineHeight:1.05 }}>{conv(model.low).toFixed(2)}–{conv(model.high).toFixed(2)}</span>
              <span style={{ fontSize:13, color:'#7f92a6', fontWeight:500 }}>{u}/tap</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize:13, color:'#7f92a6', marginTop:10, lineHeight:1.5 }}>
          {standing ? `${standing.charAt(0).toUpperCase()+standing.slice(1)} for ${model.label}` : `Benchmark for ${model.label}`} · {fmt(taps,0)} tap{taps!==1?'s':''}
          {last ? '' : ' · nothing logged this season yet'}
        </div>
      </div>

      {/* Boil Day shortcut — one tap from the front door to the instrument */}
      <button className={`bd-chip${bdActive ? ' on' : ''}`} onClick={() => go('boilday')}>
        {bdActive ? (
          <><span className="bd-dot" aria-hidden="true" />
            <span className="bd-chip-txt">{t(lang,'bdBoiling')} — <b>{bdHM(bdNow - bdSess.start)}</b> {t(lang,'bdElapsed')}</span></>
        ) : (
          <><I.flame size={16} color="#7f92a6" />
            <span className="bd-chip-txt">{t(lang,'bdChipIdle')}</span></>
        )}
        <span className="bd-chip-arrow" aria-hidden="true">›</span>
      </button>

      {/* First run: the void between the card and the CTA becomes furniture —
          the bucket mark and the three next actions, to Tubing's standard. */}
      {entries.length === 0 && (
        <div style={{ textAlign:'center', padding:'26px 20px 8px' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
            <M.bucket size={96} color="#EB9A33" />
          </div>
          <div style={{ fontSize:13, color:'#7f92a6', lineHeight:1.6, marginBottom:16 }}>{t(lang,'todayEmptySub')}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
            {[[t(lang,'chipLogFirstSap'),'log'],[t(lang,'chipSetLocation'),'weather'],[t(lang,'chipPlanSeason'),'tapping']].map(([label,dst])=>(
              <button key={dst} onClick={()=>go(dst)}
                style={{ minHeight:44, padding:'0 16px', borderRadius:22, border:'1.5px solid #1e2d3d',
                  background:'#0d1521', color:'#2dd4a7', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The landing screen remembers: the last three runs, plain rows, no card */}
      {recent.length > 0 && (
        <div style={{ margin:'4px 0 0' }}>
          <Eyebrow>Recent runs</Eyebrow>
          <div style={{ marginTop:6 }}>
            {recent.map(e => (
              <div key={e.id} style={{ display:'grid', gridTemplateColumns:'var(--w-date) 1fr auto', columnGap:10, alignItems:'baseline', minHeight:44, padding:'10px 0', borderBottom:'1px solid #131e2c', fontSize:14 }}>
                <span style={{ color:'#7f92a6', whiteSpace:'nowrap' }}>{srDateShort(e.date, lang)}</span>
                <span style={{ color:'#e6edf3', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{SHORT[e.kind] || e.kind}</span>
                {/* e.val was written in the display unit — converting it again
                    showed a logged 40 L run as 151.4 L, beside a season total of
                    40 L on the same card. */}
                <span style={{ fontWeight:700, textAlign:'right', whiteSpace:'nowrap' }}>{fmt(parseFloat(e.val)||0, dpOf(e.kind))} <span style={{ fontWeight:500, color:'#7f92a6' }}>{unitOf(e.kind)}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The landing screen's action is never below the fold */}
      <div className="primary-bar pinned">
        <button className="btn-primary" onClick={() => go('log')}>
          <I.plus size={18} color="#07090f" /> {lang==='fr' ? 'Noter une coulée' : 'Log a run'}
        </button>
      </div>
    </div>
  );
}


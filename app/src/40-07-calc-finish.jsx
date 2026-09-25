// ─── FINISH TAB ───────────────────────────────────────────────────────────────
function FinishTab({ waterBP, setWaterBP, lang='en' }) {
  const [syBrix,  setSyBrix]  = useState(66);
  const [syTemp,  setSyTemp]  = useState(211);
  const [baumeIn, setBaumeIn] = useState(36);
  const [plates,  setPlates]  = useState(9);
  const [psKey,   setPsKey]   = useState('7" plates');
  const [gal2f,   setGal2f]   = useState(10);
  const [szn,     setSzn]     = useState('early'); // 'early' | 'late'
  // Default follows recMode for the initial 10 gal (≤25 gal → Straight Mix) —
  // the card used to default to Precharge while recommending Straight Mix.
  const [deMode,  setDeMode]  = useState('straight'); // 'precoat' | 'straight'

  const finT  = finTemp(waterBP);
  const corr  = denCorr(syTemp);
  const corrB = syBrix + corr;
  const inR   = corrB >= 66 && corrB <= 68.9;
  const tooLt = corrB < 66;
  const sColor= inR ? '#3fb950' : '#e0a44a';
  const sText = inR ? t(lang,'perfectDensity') : tooLt ? t(lang,'tooLight') : t(lang,'tooDense');
  const cpP          = PLATE_CUPS[psKey] || 3.25;
  const cupsPerPlate = plates * cpP;
  // Auto-recommend method by batch size
  const recMode = gal2f > 25 ? 'precoat' : 'straight';
  // Per-gallon rates:
  //   Precoat cross-check:  early 0.2 cups/gal, late 0.5 cups/gal
  //   Straight mix:         early 0.5 cups/gal, late 0.75 cups/gal
  const galRate = szn === 'late'
    ? (deMode === 'straight' ? 0.75 : 0.5)
    : (deMode === 'straight' ? 0.5  : 0.2);
  const cupsPerGal = gal2f > 0 ? gal2f * galRate : 0;
  const cups = deMode === 'straight'
    ? (gal2f > 0 ? cupsPerGal : 0)
    : (gal2f > 0 ? Math.max(cupsPerPlate, cupsPerGal) : cupsPerPlate);
  // Filter-grade DE bulk density ≈ 10-12 lbs/ft³ = ~0.1 lbs/cup (Dicalite, Celite grades)
  const lbs   = cups * 0.1;
  const oz    = lbs * 16;

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <CardIcon bg="#2b1a0d" icon="thermometer" />
          {t(lang,'finishTitle')}
        </div>
        <div className="field-label">{t(lang,'waterBP')}</div>
        <NumInput label={t(lang,'waterBP')} value={waterBP} onChange={setWaterBP} min={200} max={215} step={0.1} />
        <div style={{ fontSize:12, color:'#7f92a6', marginTop:5, marginBottom:10 }}>{t(lang,'sharedWithBoil')}</div>
        <div className="result-box orange">
          <div className="result-label" style={{ color:'#e0a44a', textAlign:'center' }}>{t(lang,'finishAt')}</div>
          <div className="result-value" style={{ color:'#e0a44a', textAlign:'center', fontSize:36 }}>{fmt(finT,1)}°F</div>
          <div style={{ color:'#7f92a6', textAlign:'center', marginTop:4 }}>= {fmt((finT-32)*5/9,1)}°C</div>
          <div style={{ color:'#7f92a6', textAlign:'center', fontSize:13 }}>{lang==='fr'?"7,1°F au-dessus du point d'ébullition de l'eau":'7.1°F above water boiling point'}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <CardIcon bg="#2b1a0d" icon="scale" />
          {t(lang,'densityCheck')}
        </div>
        <div className="two-col" style={{ marginBottom:12 }}>
          <div><div className="field-label">{t(lang,'syrupBrix')}</div><NumInput label={t(lang,'syrupBrix')} value={syBrix} onChange={setSyBrix} min={60} max={75} step={0.1} /></div>
          <div><div className="field-label">{t(lang,'syrupTemp')}</div><NumInput label={t(lang,'syrupTemp')} value={syTemp} onChange={setSyTemp} min={60} max={220} step={1} /></div>
        </div>
        <div className="result-box orange" style={{ marginBottom:10 }}>
          <div style={{ fontWeight:600, color:'#e0a44a', fontSize:14 }}>{t(lang,'tempCorrection')}: At {syTemp}°F, {corr>=0?'add':'subtract'} {fmt(Math.abs(corr),2)}° to reading</div>
          <div style={{ color:'#7f92a6', marginTop:4 }}>{t(lang,'correctedBrix')}: <strong style={{ color:'#e6edf3' }}>{fmt(corrB,1)}°</strong></div>
        </div>
        <div style={{ background: inR?'#0d2b15':'#2b1a0d', borderRadius:10, padding:'14px 16px', textAlign:'center', border:`1px solid ${inR?'#1a4a25':'#4a3020'}` }}>
          <div style={{ fontWeight:700, fontSize:18, color:sColor }}>{sText}</div>
          <div style={{ color:'#7f92a6', fontSize:13, marginTop:4 }}>{t(lang,'legalRange')}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <CardIcon bg="#0d1a2b" icon="droplet" />
          Brix ↔ Baumé
        </div>
        <div className="two-col">
          <div style={{ background:'#0d1a2b', borderRadius:10, padding:14, border:'1px solid #1e2d3d' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#58a6ff', letterSpacing:'0.08em', marginBottom:6 }}>FROM BRIX</div>
            <div style={{ fontSize:26, fontWeight:700 }}>{fmt(syBrix,1)}°</div>
            <div style={{ color:'#58a6ff', fontWeight:600, marginTop:4 }}>= {fmt(brixToBe(syBrix),1)}° Bé</div>
          </div>
          <div style={{ background:'#1a0d2b', borderRadius:10, padding:14, border:'1px solid #2f1a4a' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#c990ff', letterSpacing:'0.08em', marginBottom:6 }}>ENTER BAUMÉ</div>
            <NumInput label="Enter degrees Baumé" value={baumeIn} onChange={setBaumeIn} min={28} max={40} step={0.1} />
            <div style={{ color:'#c990ff', fontSize:13, marginTop:6 }}>= {fmt(beToBrix(baumeIn),1)}° Brix</div>
            <div style={{ color:'#7f92a6', fontSize:13, marginTop:6, lineHeight:1.45 }}>{BE_HOT_NOTE}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <CardIcon bg="#1c2128" icon="layers" />
          <div>
            <div>{t(lang,'filterPress')}</div>
            <div style={{ fontSize:12, color:'#7f92a6', fontWeight:400 }}>Step-by-step DE Calculator</div>
          </div>
        </div>

        {/* ── STEP 1: Gallons ── */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <div style={{ width:22, height:22, borderRadius:'50%', background:'#2dd4a7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#061a14', flexShrink:0 }}>1</div>
          <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3' }}>How many gallons are you filtering right now?</div>
        </div>
        <NumInput label="Gallons to filter" value={gal2f} onChange={setGal2f} min={0} max={1000} step={1} />
        <div style={{ fontSize:12, color:'#7f92a6', marginTop:4, marginBottom:14 }}>Enter the gallons sitting in your finishing pan ready to press</div>

        {/* ── Auto recommendation banner ── */}
        {gal2f > 0 && (() => {
          const isSmall = gal2f <= 10;
          const isMed   = gal2f > 10 && gal2f <= 25;
          const isLarge = gal2f > 25;
          const rColor  = isLarge ? '#58a6ff' : '#2dd4a7';
          const rBg     = isLarge ? 'rgba(88,166,255,0.08)' : 'rgba(45,212,167,0.08)';
          const rBorder = isLarge ? 'rgba(88,166,255,0.22)' : 'rgba(45,212,167,0.22)';
          const rDot    = isLarge ? '#58a6ff' : '#3fb950';
          const rTitle  = isSmall ? 'Small batch — use Straight Mix (no precharge needed)'
                        : isMed   ? 'Medium batch — Straight Mix works great; Precharge optional'
                        :           'Large batch — Precharge recommended for best results';
          const rDesc   = isSmall ? 'Under 10 gallons: skip the precharge step entirely. Just stir DE into your hot syrup and press. Saves time and works perfectly at this volume.'
                        : isMed   ? '10–25 gallons: straight mix still works well and is simpler. Switch to Precharge if you want a cleaner first pour or you\'re running multiple batches.'
                        :           'Over 25 gallons: precharging the plates first pays off. You\'ll get better efficiency, consistent flow, and cleaner syrup from the very first drop.';
          return (
            <div style={{ background:rBg, border:`1px solid ${rBorder}`, borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
              <div style={{ fontWeight:700, color:rColor, fontSize:13, marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:rDot, flexShrink:0 }} />{rTitle}</div>
              <div style={{ fontSize:12, color:'#7f92a6', lineHeight:1.5 }}>{rDesc}</div>
            </div>
          );
        })()}

        {/* ── STEP 2: Method ── */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <div style={{ width:22, height:22, borderRadius:'50%', background:'#2dd4a7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#061a14', flexShrink:0 }}>2</div>
          <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3' }}>Choose your method</div>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {[
            { id:'straight', label:'Straight Mix',    sub:'Stir DE into the syrup and press. Easiest — no precharge.',       color:'#2dd4a7', bg:'rgba(45,212,167,0.08)'  },
            { id:'precoat',  label:'Precharge First', sub:'Coat the plates with DE-water first, then run your syrup through.', color:'#58a6ff', bg:'rgba(88,166,255,0.08)' },
          ].map(m => {
            const isRec = m.id === recMode;
            const isSel = m.id === deMode;
            return (
              <button key={m.id} onClick={() => setDeMode(m.id)} style={{
                flex:1, padding:'10px 10px 8px', borderRadius:12,
                border:`1px solid ${isSel ? m.color : '#1e2d3d'}`,
                background: isSel ? m.bg : 'transparent',
                cursor:'pointer', textAlign:'left', transition:'all 0.15s'
              }}>
                {/* Badge on its own line — it used to print on top of the title at 375px */}
                {isRec && <div style={{ fontSize:10, fontWeight:800, color:m.color, letterSpacing:'0.08em', opacity:0.85, display:'flex', alignItems:'center', gap:4, marginBottom:4 }}><I.star size={10} color={m.color} />RECOMMENDED</div>}
                <div style={{ fontSize:13, fontWeight:700, color: isSel ? m.color : '#7f92a6', marginBottom:3 }}>{m.label}</div>
                <div style={{ fontSize:13, color:'#7f92a6', lineHeight:1.4 }}>{m.sub}</div>
              </button>
            );
          })}
        </div>

        {/* ── STEP 3: Syrup color ── */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <div style={{ width:22, height:22, borderRadius:'50%', background:'#2dd4a7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#061a14', flexShrink:0 }}>3</div>
          <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3' }}>What does your syrup look like?</div>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {[
            { id:'early', label:'Light / Amber',   sub:'Golden or Amber Rich — earlier in the season', color:'#f5c842', bg:'rgba(245,200,66,0.08)',  border:'rgba(245,200,66,0.22)' },
            { id:'late',  label:'Dark / Very Dark', sub:'Dark Robust or Very Dark — later in the season', color:'#c47a28', bg:'rgba(196,122,40,0.08)',  border:'rgba(196,122,40,0.22)' },
          ].map(s => (
            <button key={s.id} onClick={() => setSzn(s.id)} style={{
              flex:1, padding:'10px 10px', borderRadius:12,
              border:`1px solid ${szn===s.id ? s.border : '#1e2d3d'}`,
              background: szn===s.id ? s.bg : 'transparent',
              cursor:'pointer', textAlign:'left', transition:'all 0.15s'
            }}>
              <div style={{ fontSize:13, fontWeight:700, color: szn===s.id ? s.color : '#7f92a6', marginBottom:3 }}>{s.label}</div>
              <div style={{ fontSize:13, color:'#7f92a6', lineHeight:1.4 }}>{s.sub}</div>
            </button>
          ))}
        </div>

        {/* ── STEP 4: Press setup (precharge only) ── */}
        {deMode === 'precoat' && (<>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ width:22, height:22, borderRadius:'50%', background:'#2dd4a7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#061a14', flexShrink:0 }}>4</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3' }}>Your press setup</div>
          </div>
          <div className="two-col" style={{ marginBottom:16 }}>
            <div><div className="field-label">Number of plates</div><NumInput label="Number of plates" value={plates} onChange={setPlates} min={1} max={50} step={1} /></div>
            <div><div className="field-label">Plate size</div><select aria-label="Plate size" value={psKey} onChange={e=>setPsKey(e.target.value)} style={{ width:'100%', padding:'9px 10px', borderRadius:10, background:'#0d1520', border:'1px solid #1e2d3d', color:'#e6edf3', fontSize:14 }}>{Object.keys(PLATE_CUPS).map(k=><option key={k}>{k}</option>)}</select></div>
          </div>
        </>)}

        {/* ── BIG RESULT ── */}
        {gal2f > 0 ? (
          <div style={{ background:'linear-gradient(135deg,#081f17 0%,#061512 100%)', border:'1px solid rgba(45,212,167,0.3)', borderRadius:16, padding:'20px 16px', textAlign:'center', marginBottom:16 }}>
            <div style={{ fontSize:13, letterSpacing:'0.12em', color:'#2dd4a7', fontWeight:700, marginBottom:6 }}>YOU NEED</div>
            <div style={{ fontSize:52, fontWeight:800, color:'#2dd4a7', lineHeight:1, marginBottom:4 }}>{fmt(cups,1)}</div>
            <div style={{ fontSize:16, color:'#2dd4a7', opacity:0.7, marginBottom:12 }}>cups of DE</div>
            <div style={{ display:'flex', gap:0, justifyContent:'center' }}>
              <div style={{ padding:'8px 20px', borderRight:'1px solid #131e2c' }}>
                <div style={{ fontSize:12, color:'#7f92a6', letterSpacing:'0.08em', marginBottom:2 }}>TABLESPOONS</div>
                <div style={{ fontWeight:700, color:'#7f92a6', fontSize:16 }}>{Math.round(cups*16)}</div>
              </div>
              <div style={{ padding:'8px 20px', borderRight:'1px solid #131e2c' }}>
                <div style={{ fontSize:12, color:'#7f92a6', letterSpacing:'0.08em', marginBottom:2 }}>OUNCES</div>
                <div style={{ fontWeight:700, color:'#7f92a6', fontSize:16 }}>{fmt(oz,1)}</div>
              </div>
              <div style={{ padding:'8px 20px' }}>
                <div style={{ fontSize:12, color:'#7f92a6', letterSpacing:'0.08em', marginBottom:2 }}>POUNDS</div>
                <div style={{ fontWeight:700, color:'#7f92a6', fontSize:16 }}>{fmt(lbs,2)}</div>
              </div>
            </div>
            {szn === 'late' && (
              <div style={{ marginTop:10, fontSize:12, color:'#e0a44a', background:'rgba(224,164,74,0.1)', borderRadius:8, padding:'5px 12px', display:'inline-block' }}>
                <I.alert size={13} color="currentColor" /> Late-season rate applied — dark syrup needs more DE
              </div>
            )}
          </div>
        ) : (
          <div style={{ background:'#0d1520', borderRadius:16, padding:'20px 16px', textAlign:'center', marginBottom:16, border:'1px solid #1e2d3d' }}>
            <div style={{ fontSize:14, color:'#7f92a6' }}>Enter your gallons above to get your DE amount</div>
          </div>
        )}

        {/* ── HOW TO DO IT ── */}
        <div className="section-header" style={{ marginBottom:10 }}>
          {deMode === 'straight' ? 'HOW TO DO IT — STRAIGHT MIX' : 'HOW TO DO IT — PRECHARGE METHOD'}
        </div>
        {deMode === 'straight' && (
          <div style={{ background:'rgba(88,166,255,0.08)', border:'1px solid rgba(88,166,255,0.22)', borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#58a6ff', marginBottom:4 }}><I.eye size={13} color="#58a6ff" /> Heads up before you start</div>
            <div style={{ fontSize:12, color:'#7f92a6', lineHeight:1.6 }}>
              The first syrup out of the press <strong style={{ color:'#e6edf3' }}>will be cloudy</strong> — this is completely normal. The DE is still building up a cake on the plates. Have a small pot or cup ready at the spout and keep running it back into your pot until the syrup comes out clear. On a small batch like yours this might take {gal2f <= 5 ? 'just a cup or two' : 'a quart or so'} — don't collect anything until it's running clear.
            </div>
          </div>
        )}
        {(deMode === 'straight' ? [
          { step:`Heat your syrup to 185–190°F`, detail:'It needs to be hot so the DE mixes in and doesn\'t clump. Don\'t skip this — cold syrup won\'t filter well.' },
          { step:`Measure out ${fmt(cups,1)} cups of food-grade DE`, detail:'Use filter-press grade DE only (like Dicalite or Celite). Pool filter DE is not food safe — don\'t use it.' },
          { step:'Stir the DE into the hot syrup until fully dissolved', detail:'Whisk or stir thoroughly for a minute or two. You want it evenly suspended, no white clumps sitting on the bottom.' },
          { step:'Load the press slowly and start filtering', detail:'The first bit that comes out will be cloudy — that\'s normal. The DE is still building up a cake on the plates.' },
          { step:'Catch the cloudy first pour and return it to the pot', detail:'Keep a small cup or pot at the spout. Once the syrup runs clear and golden, switch over to your collection vessel.' },
          { step:'Watch your pressure gauge', detail:'Pressure will climb slowly as the cake builds — that\'s normal. Stop if it hits 40 PSI. That means the plates are full and it\'s time to clean and repack.' },
        ] : [
          { step:'Fill the press with 1–2 gallons of hot water (150–170°F)', detail:'This is what carries the DE onto the plates. Don\'t use syrup — hot water only. The water gets drained out before you run syrup.' },
          { step:`Add ${fmt(cups,1)} cups of DE to the hot water and stir`, detail:`This is your full precharge amount for the ${plates}-plate press${szn==='late'?' at the late-season rate':''}. Stir it into the hot water until fully mixed — no dry clumps.` },
          { step:'Circulate the DE-water mix through the press', detail:'Run it through and back into your bucket several times until the water coming out runs clear. The plates are now coated.' },
          { step:'Drain the water from the press', detail:'Open the drain valve and let the precharge water out. Your plates now have a thin DE cake on them — don\'t disturb them.' },
          { step:'Heat your syrup to 185–190°F and start filtering', detail:'Syrup should come out clear right from the start since the plates are already coated. Collect from the first drop.' },
          { step:'Watch your pressure gauge', detail:'Stop at 40 PSI — plates are full. Rinse the press and repeat the precharge if you have more syrup to run.' },
        ]).map((item,i) => (
          <div key={i} style={{ display:'flex', gap:12, marginBottom:12, alignItems:'flex-start' }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:'#131e2c', border:'1px solid #1e2d3d', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#7f92a6', flexShrink:0, marginTop:1 }}>{i+1}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#e6edf3', marginBottom:3 }}>{item.step}</div>
              <div style={{ fontSize:12, color:'#7f92a6', lineHeight:1.5 }}>{item.detail}</div>
            </div>
          </div>
        ))}

        {/* ── TROUBLESHOOTING ── */}
        <div className="section-header" style={{ marginBottom:10, marginTop:6 }}>IF SOMETHING GOES WRONG</div>
        {[
          { prob:'Syrup is still cloudy after a few cups', fix:'The DE cake hasn\'t formed yet — keep returning the cloudy syrup to the pot. If it stays cloudy for more than a quart, add another ¼ cup of DE to the pot and stir.' },
          { prob:'Pressure gauge climbing too fast', fix:'The plates are loading up quickly — this is common with dark or late-season syrup. Stop at 40 PSI, rinse the press, and add 25–50% more DE to your next batch.' },
          { prob:'Nothing is coming out / flow stopped', fix:'Check that your valves are open. If pressure is at or above 40 PSI, your plates are full — stop, disassemble, rinse, and reload.' },
          { prob:'Syrup tastes or smells like DE', fix:'You\'ve used way too much. This is rare with filter-press grade DE. Reduce by half next time. Make sure you\'re using food-grade filter DE, not pool filter DE.' },
        ].map((item,i) => (
          <div key={i} style={{ background:'#0d1520', borderRadius:10, padding:'10px 14px', marginBottom:8, border:'1px solid #1e2d3d' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#e0a44a', marginBottom:3 }}><I.zap size={13} color="#e0a44a" /> {item.prob}</div>
            <div style={{ fontSize:12, color:'#7f92a6', lineHeight:1.5 }}>{item.fix}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom:12 }}><CardIcon bg="#2d1f0a" icon="scale" />{t(lang,'gradeTitle')}</div>
        <div className="section-header" style={{ marginBottom:8 }}>{t(lang,'gradeA')}</div>
        {[
          { l:t(lang,'gradeGolden'), light:'>75%',   brix:'66.0–66.5°', color:'#f5c842', bg:'#1c1600', border:'#4a3d00', note:lang==='fr'?'Saveur très douce — début de saison':'Very mild flavour — early season' },
          { l:t(lang,'gradeAmber'),  light:'25–75%', brix:'66.5–67.5°', color:'#e0a44a', bg:'#2d1f0a', border:'#4a3020', note:lang==='fr'?'Saveur classique d\'érable':'Classic maple flavour' },
          { l:t(lang,'gradeDark'),   light:'<25%',   brix:'67.0–68.9°', color:'#c47a28', bg:'#2b1505', border:'#6b3010', note:lang==='fr'?'Corsé — fin de saison':'Strong — late season' },
          { l:t(lang,'gradeVeryDark'), light:'<10%', brix:'67.0–68.9°', color:'#8b4513', bg:'#1a0a04', border:'#5a2800', note:lang==='fr'?'Intense — très fin de saison':'Intense — very late season' },
        ].map(g=>(
          <div key={g.l} style={{ background:g.bg, borderRadius:10, padding:'11px 14px', border:`1px solid ${g.border}`, marginBottom:7 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700, color:g.color, fontSize:15 }}>{g.l}</div>
              <div style={{ background:g.color+'22', borderRadius:8, padding:'2px 9px', fontSize:13, fontWeight:700, color:g.color }}>{g.brix} Brix</div>
            </div>
            <div style={{ color:'#7f92a6', fontSize:12, marginTop:4 }}>Light transmittance {g.light} · {g.note}</div>
          </div>
        ))}
        <div className="divider" />
        <div className="two-col">
          {[{l:t(lang,'legalMin'),v:'66.0° Brix'},{l:t(lang,'legalMax'),v:'68.9° Brix'}].map(r=>(
            <div key={r.l} style={{ background:'#2d1f0a', borderRadius:10, padding:'12px 14px', border:'1px solid #4a3020' }}>
              <div style={{ fontWeight:700, color:'#e0a44a', marginBottom:4 }}>{r.l}</div>
              <div style={{ color:'#7f92a6', fontSize:14 }}>{r.v}</div>
            </div>
          ))}
        </div>
        <InfoRow label={t(lang,'weight')} value="~11.65 lbs/gallon at 66° Brix" />
      </div>

      {/* ── Canning ── */}
      <div className="card">
        <div className="card-title"><CardIcon bg="#2b1a0d" icon="package" />Canning &amp; Bottling</div>

        <div className="result-box orange" style={{ marginBottom:14 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:12, color:'#e0a44a', fontWeight:700, letterSpacing:'0.08em', marginBottom:4 }}>CAN BETWEEN</div>
            <div style={{ fontSize:38, fontWeight:800, color:'#e0a44a', lineHeight:1 }}>180 – 190°F</div>
            <div style={{ fontSize:12, color:'#7f92a6', marginTop:6 }}>82 – 88°C</div>
          </div>
        </div>

        <div style={{ background:'#0f1720', borderRadius:10, padding:'12px 14px', marginBottom:10, border:'1px solid #1e2d3d' }}>
          <div style={{ fontWeight:600, color:'#c9d1d9', fontSize:14, marginBottom:8 }}>Why this range matters</div>
          <div style={{ fontSize:13, color:'#7f92a6', lineHeight:1.7 }}>
            <span style={{ color:'#3fb950', fontWeight:600 }}>Above 180°F</span> — hot enough to sterilize the container and create a vacuum seal as the syrup cools.<br/>
            <span style={{ color:'#e0a44a', fontWeight:600 }}>Below 190°F</span> — avoids driving off moisture that would push syrup above legal density, and prevents forming new niter (calcium malate crystals) that re-form above ~190°F even in already-filtered syrup.
          </div>
        </div>

        {[
          { title:'Check density first', body:'Always verify syrup is 66.0–68.9° Brix before canning. Density that was correct hot may read differently once cooled — use the Density Check above with a temperature correction.' },
          { title:'Heat slowly, stir gently', body:'Bring syrup back to temperature on low-medium heat. Stir occasionally but avoid vigorous boiling — you don\'t want to concentrate it further or create new niter.' },
          { title:'Fill hot, cap immediately', body:'Fill containers to within ¼" of the top. Cap immediately and tip upside down for 1–2 minutes to sterilize the lid seal. Return upright and let cool undisturbed.' },
          { title:'Glass vs. plastic', body:'Glass is ideal — holds temperature longer, shows off color, and has no flavor transfer. Food-grade plastic (HDPE) jugs are fine for short-term storage. Avoid thin plastic that distorts when filled hot.' },
          { title:'Shelf life', body:'Properly canned syrup keeps 1–4 years unopened at room temperature. Once opened, refrigerate and use within 1 year. If mold appears, bring to 180°F+, re-filter if needed, and re-can.' },
        ].map((item, i) => (
          <TipItem key={i}><span style={{ color:'#c9d1d9', fontWeight:600 }}>{item.title} — </span>{item.body}</TipItem>
        ))}

        <div style={{ background:'#081622', borderRadius:8, padding:'10px 12px', marginTop:8, fontSize:12, color:'#7f92a6', lineHeight:1.7 }}>
          <span style={{ color:'#7f92a6', fontWeight:600 }}>Container yield guide: </span>
          250 mL ≈ 0.066 gal · 500 mL ≈ 0.132 gal · 1 L ≈ 0.264 gal · 1 qt ≈ 0.25 gal · ½ gal ≈ 0.5 gal · 1 gal jug = 1 gal
        </div>
      </div>

      {/* ── CANDY MAKING ── */}
      <div className="card">
        <div className="card-title">
          <CardIcon bg="#2b1a0d" icon="star" />
          <div>
            <div>Maple Candy Temperatures</div>
            <div style={{ fontSize:12, color:'#7f92a6', fontWeight:400 }}>Adjusted for your altitude · based on {fmt(waterBP,1)}°F boiling point</div>
          </div>
        </div>

        {/* Target temp grid */}
        {[
          { name:'Maple Cream / Butter',  offset:22, color:'#e0a44a', desc:'Cook to temp, cool to ~70°F, stir until thick and creamy. Spreadable.' },
          { name:'Maple Taffy',           offset:28, color:'#e0a44a', desc:'Pour onto packed snow or ice. Pull and stretch while warm.' },
          { name:'Molded Candy',          offset:34, color:'#2dd4a7', desc:'Cook to temp, cool to ~160°F, stir until it begins to granulate, pour into molds quickly.' },
          { name:'Maple Sugar (granulated)', offset:45, color:'#c990ff', desc:'Cook to temp, stir vigorously while cooling until fully dry and granulated.' },
        ].map(c => (
          <div key={c.name} style={{ background:'#0d1521', borderRadius:10, padding:'12px 14px', marginBottom:10, border:`1px solid rgba(255,255,255,0.06)` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'#e6edf3' }}>{c.name}</div>
              <div style={{ fontWeight:900, fontSize:22, color:c.color }}>{fmt(waterBP + c.offset, 1)}°F</div>
            </div>
            <div style={{ fontSize:13, color:'#7f92a6', marginBottom:3 }}>
              BP + {c.offset}°F &nbsp;·&nbsp; {fmt((waterBP + c.offset - 32)*5/9, 1)}°C
            </div>
            <div style={{ fontSize:12, color:'#7f92a6', lineHeight:1.5 }}>{c.desc}</div>
          </div>
        ))}

        {/* Molded candy process tip */}
        <div style={{ background:'rgba(45,212,167,0.06)', border:'1px solid rgba(45,212,167,0.18)', borderRadius:10, padding:'12px 14px', marginTop:4 }}>
          <div style={{ fontWeight:700, fontSize:13, color:'#2dd4a7', marginBottom:6 }}><I.droplet size={13} color="#2dd4a7" /> Molded Candy Step-by-Step</div>
          {[
            { s:'Heat syrup', d:`Bring to ${fmt(waterBP + 34, 1)}°F (BP + 34°F). Use a heavy pot — syrup foams up significantly.` },
            { s:'Stop the boil', d:'Remove from heat immediately when temp is reached. Do not stir yet.' },
            { s:'Cool undisturbed', d:'Let cool to ~160°F without stirring. Stirring too early causes grainy texture.' },
            { s:'Stir to granulate', d:'Stir vigorously with a wooden spoon or stand mixer. It will lighten in color and thicken rapidly.' },
            { s:'Pour into molds quickly', d:'Once it starts to set, pour immediately. It hardens fast — have molds ready before you start stirring.' },
            { s:'Cool & release', d:'Let sit 5–10 min until firm. Pop out of molds and enjoy. Store in a cool, dry place.' },
          ].map((item, i) => (
            <div key={i} style={{ display:'flex', gap:10, marginBottom:8 }}>
              <div style={{ flexShrink:0, width:20, height:20, borderRadius:'50%', background:'rgba(45,212,167,0.15)', border:'1px solid rgba(45,212,167,0.3)', color:'#2dd4a7', fontSize:12, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', marginTop:1 }}>{i+1}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)', lineHeight:1.5 }}><strong style={{ color:'#c9d1d9' }}>{item.s} — </strong>{item.d}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize:13, color:'#7f92a6', marginTop:10, lineHeight:1.7 }}>
          <span style={{ color:'#7f92a6', fontWeight:600 }}>All temps above auto-adjust for your altitude.</span> Update your water boiling point at the top of this tab if you move to a different elevation.
        </div>
      </div>

    </div>
  );
}


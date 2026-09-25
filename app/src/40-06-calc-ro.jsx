// ─── R/O TAB ──────────────────────────────────────────────────────────────────
function ROTab({ sapBrix, setSapBrix, evapRate, fuelType, fuelCost, units, lang='en' }) {
  const [inSap,   setInSap]   = useState(500);
  const [tgtBrix, setTgtBrix] = useState(8);
  const u    = units === 'L' ? 'L' : 'gal';
  const conv = v => units === 'L' ? (v*3.78541).toFixed(1) : v.toFixed(1);
  // RO concentrates, so the target must be higher than the sap it starts from.
  // With target < sap, roConc returns more concentrate than input, permeate goes
  // negative ("−1500 gal water removed"), and boil time saved goes negative — all
  // rendered as confident results. Guard it, and tell the user what to change.
  const roValid = tgtBrix > sapBrix;
  const conc    = roValid ? roConc(inSap, sapBrix, tgtBrix) : 0;
  const perm    = roValid ? inSap - conc : 0;
  const factor  = roValid ? tgtBrix / sapBrix : 0;
  const pctRem  = roValid && inSap > 0 ? (perm / inSap) * 100 : 0;
  const fuel    = FUELS.find(f=>f.label===fuelType)||FUELS[0];
  const boilNoRO  = boilTime(inSap, sapBrix, evapRate);
  const boilWithRO= boilTime(conc,  tgtBrix, evapRate);
  const saved   = boilNoRO - boilWithRO;
  const fSaved  = (saved * evapRate) / fuel.spu;
  const mSaved  = fSaved * fuelCost;

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <CardIcon bg="#0d1a2b" icon="filter" />
          {t(lang,'roConcentration')}
        </div>
        <div className="two-col" style={{ marginBottom:10 }}>
          <div><div className="field-label">{t(lang,'inputSap')} ({u})</div><NumInput label={`${t(lang,'inputSap')} (${u})`} value={inSap} onChange={setInSap} min={1} max={100000} step={1} /></div>
          <div><div className="field-label">{t(lang,'sapBrix')}</div><input aria-label={t(lang,'sapBrix')} type="number" value={sapBrix} onChange={e=>setSapBrix(parseFloat(e.target.value)||0)} onFocus={e=>e.target.select()} min={0.5} max={10} step={0.1} /></div>
        </div>
        <div className="field-label">{t(lang,'targetBrix')}</div>
        <NumInput label={t(lang,'targetBrix')} value={tgtBrix} onChange={setTgtBrix} min={1} max={20} step={0.5} />
        {!roValid && (
          <div style={{ marginTop:12, padding:'12px 14px', borderRadius:8, background:'rgba(224,164,74,0.1)', border:'1px solid rgba(224,164,74,0.3)', color:'#e0a44a', fontSize:13, fontWeight:600, lineHeight:1.5 }}>
            {lang==='fr'
              ? `Le °Brix cible (${fmt(tgtBrix,1)}) doit dépasser le °Brix de la sève (${fmt(sapBrix,1)}) — l'O/I concentre, il ne dilue pas.`
              : `Target °Brix (${fmt(tgtBrix,1)}) must be higher than sap °Brix (${fmt(sapBrix,1)}) — R/O concentrates, it doesn't dilute.`}
          </div>
        )}
        <div className="result-box blue" style={{ marginTop:12, opacity: roValid ? 1 : 0.4 }}>
          <div className="two-col" style={{ marginBottom:8 }}>
            <div><div className="result-label" style={{ color:'#58a6ff' }}>{t(lang,'concentrate')}</div><div className="result-value" style={{ color:'#58a6ff' }}>{roValid ? conv(conc) : '—'} {roValid ? u : ''}</div><div className="result-sub">{fmt(tgtBrix,1)}° Brix</div></div>
            <div><div className="result-label" style={{ color:'#58a6ff' }}>{t(lang,'permeate')}</div><div className="result-value" style={{ color:'#58a6ff' }}>{roValid ? conv(perm) : '—'} {roValid ? u : ''}</div><div className="result-sub">{t(lang,'waterRemoved')}</div></div>
          </div>
          <div style={{ borderTop:'1px solid #30363d', paddingTop:8, fontSize:14 }}>
            <strong>{roValid ? fmt(factor,1) : '—'}x</strong> {lang==='fr'?'concentration':'concentration'} • <strong>{roValid ? fmt(pctRem,1) : '—'}%</strong> {t(lang,'waterRemoved').toLowerCase()}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <CardIcon bg="#0d2b15" icon="trendUp" />
          {t(lang,'roSavings')}
        </div>
        <div className="two-col">
          <div className="result-box green"><div className="result-label" style={{ color:'#3fb950' }}>{t(lang,'boilTimeSaved')}</div><div className="result-value" style={{ color:'#3fb950' }}>{roValid ? fmt(saved,1) : '—'} hrs</div><div className="result-sub">@ {evapRate} gal/hr {lang==='fr'?"taux d'évap.":'evap rate'}</div></div>
          <div className="result-box green"><div className="result-label" style={{ color:'#3fb950' }}>{t(lang,'fuelSaved')}</div><div className="result-value" style={{ color:'#3fb950' }}>${roValid ? fmt(mSaved,0) : '—'}</div><div className="result-sub">@ ${fuelCost}/{fuel.unit}</div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <CardIcon bg="#1a0d2b" icon="percent" />
          {t(lang,'multiPass')}
        </div>
        <div style={{ color:'#7f92a6', fontSize:14, marginBottom:10 }}>{t(lang,'startingBrix')} {sapBrix}° Brix:</div>
        {[{labelKey:'singlePass',brix:sapBrix*2},{labelKey:'doublePass',brix:sapBrix*4},{labelKey:'triplePass',brix:sapBrix*8}].map(p=>(
          <div key={p.labelKey} style={{ display:'flex', justifyContent:'space-between', background:'#100a1e', borderRadius:8, padding:'12px 16px', marginBottom:6 }}>
            <span style={{ color:'#c990ff', fontWeight:500 }}>{t(lang,p.labelKey)}</span>
            <span style={{ fontWeight:700 }}>{fmt(p.brix,1)}° Brix</span>
          </div>
        ))}
        <div style={{ color:'#7f92a6', fontSize:12, marginTop:8 }}>{t(lang,'maxPractical')}</div>
      </div>

      <div className="card">
        <div className="card-title">
          <CardIcon bg="#1c2128" icon="filter" />
          {t(lang,'roGuidelinesTitle')}
        </div>
        {['roTip1','roTip2','roTip3','roTip4','roTip5'].map((key,i)=><TipItem key={i}>{t(lang,key)}</TipItem>)}
      </div>
    </div>
  );
}


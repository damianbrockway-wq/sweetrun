// ─── SAP TAB ──────────────────────────────────────────────────────────────────
function SapTab({ sapBrix, setSapBrix, trees, units, lang='en' }) {
  const [sapGal, setSapGal] = useState(500);
  const u    = units === 'L' ? 'L' : 'gal';
  const conv = v => units === 'L' ? (v*3.78541).toFixed(1) : v.toFixed(1);
  const ratio = rule86(sapBrix), jones = jones87(sapBrix);
  const sy = syrupY(sapGal, sapBrix);
  const qr = [1.5, 2.0, 2.5, 3.0].map(b => ({ b, r: Math.round(rule86(b)) }));

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <CardIcon bg="#2d2010" icon="calculator" />
          <div><div>{t(lang,'rule86Title')}</div><div style={{ fontSize:12, color:'#7f92a6', fontWeight:400 }}>{t(lang,'rule86Sub')}</div></div>
        </div>
        <div className="field-label">{t(lang,'sapSugarContent')}</div>
        <NumInput label={t(lang,'sapSugarContent')} value={sapBrix} onChange={setSapBrix} min={0.5} max={10} step={0.1} />
        <div style={{ fontSize:12, color:'#7f92a6', marginTop:5, marginBottom:10 }}>{t(lang,'sharedAllTabs')}</div>
        <div className="result-box">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', columnGap:10, rowGap:5, alignItems:'baseline' }}>
            <div className="result-label" style={{ marginBottom:0 }}>{t(lang,'sapToSyrup')}</div>
            <div className="result-label" style={{ marginBottom:0 }}>{t(lang,'jonesRule')}</div>
            <div className="result-value" style={{ color:'#2dd4a7' }}>{fmt(ratio,1)}:1</div>
            <div className="result-value" style={{ fontSize:20, fontWeight:700 }}>{fmt(jones,1)}:1</div>
          </div>
          <div style={{ marginTop:8, fontSize:13, color:'#7f92a6' }}>{fmt(ratio,1)} {u} sap = 1 {u} syrup</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <CardIcon bg="#1a2a2d" icon="droplet" />
          <div><div>{t(lang,'syrupYieldCard')}</div><div style={{ fontSize:12, color:'#7f92a6', fontWeight:400 }}>{t(lang,'syrupYieldSub')}</div></div>
        </div>
        <div className="two-col" style={{ marginBottom:12 }}>
          <div><div className="field-label">{t(lang,'sapFieldLabel')} ({u})</div><NumInput label={`${t(lang,'sapFieldLabel')} (${u})`} value={sapGal} onChange={setSapGal} min={1} max={100000} step={1} /></div>
          <div><div className="field-label">{t(lang,'sapBrix')}</div><input aria-label={t(lang,'sapBrix')} type="number" value={sapBrix} onChange={e=>setSapBrix(parseFloat(e.target.value)||0)} onFocus={e=>e.target.select()} min={0.5} max={10} step={0.1} /></div>
        </div>
        <div className="result-box" style={{ marginTop:0 }}>
          <div className="result-label">{t(lang,'sapSyrup')}</div>
          <div className="result-value">{fmt(units==='L'?sy*3.78541:sy,1)}<span className="unit">{u}</span></div>
          {trees > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:10, paddingTop:10, borderTop:'1px solid #131e2c' }}>
              <span style={{ color:'#7f92a6', fontSize:13 }}>{lang==='fr' ? 'Par entaille' : 'Per tap'} ({fmt(trees,0)} {lang==='fr' ? 'entailles' : 'taps'})</span>
              <span style={{ fontWeight:700, fontSize:14 }}>{fmt(sy/trees,3)} <span style={{ fontWeight:500, color:'#7f92a6', fontSize:13 }}>{u}/tap</span></span>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom:12 }}>
          <CardIcon bg="#1c2128" icon="layers" />
          {t(lang,'quickRef')}
        </div>
        <div className="two-col">
          {qr.map(q => (
            <div key={q.b} style={{ background: Math.abs(q.b-sapBrix)<0.01 ? 'rgba(45,212,167,0.16)' : '#0d1a2b', borderRadius:10, padding:12 }}>
              <div style={{ fontWeight:700, color: Math.abs(q.b-sapBrix)<0.01 ? '#2dd4a7' : '#e6edf3' }}>{q.b}° Brix</div>
              <div style={{ color: Math.abs(q.b-sapBrix)<0.01 ? '#e6edf3' : '#7f92a6', fontSize:13 }}>{q.r}:1 ratio</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


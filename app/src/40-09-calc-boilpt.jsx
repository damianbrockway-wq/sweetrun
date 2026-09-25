// ─── BOIL PT TAB ──────────────────────────────────────────────────────────────
function BoilPtTab({ waterBP, setWaterBP, lang='en' }) {
  const [altIn,  setAltIn]  = useState('');
  const [presIn, setPresIn] = useState('');
  const [loc,    setLoc]    = useState('');
  const [zip,    setZip]    = useState('');
  const [loading,setLoading]= useState(false);
  const [err,    setErr]    = useState('');

  const bp   = altIn!=='' ? altToBP(parseFloat(altIn)||0) : presIn!=='' ? presToBP(parseFloat(presIn)||29.92) : waterBP;
  const finT = finTemp(bp);

  const useGPS = () => {
    if (location.protocol === 'file:') {
      setErr('GPS requires HTTPS. Host this app online or enter a zip code / altitude manually.');
      return;
    }
    if (!navigator.geolocation) { setErr('GPS not supported by this browser.'); return; }
    setLoading(true); setErr('');
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&hourly=temperature_2m&forecast_days=1`);
        const d = await r.json();
        const ft = Math.round((d.elevation||0)*3.28084);
        setAltIn(ft); setPresIn('');
        setWaterBP(parseFloat(altToBP(ft).toFixed(1)));
        setLoc(`${pos.coords.latitude.toFixed(2)}°N, ${Math.abs(pos.coords.longitude).toFixed(2)}°W`);
      } catch { setErr('Could not fetch elevation. Try entering altitude manually.'); }
      setLoading(false);
    }, e => {
      setLoading(false);
      if (e.code === 1) setErr('Location permission denied — allow location access and try again.');
      else if (e.code === 2) setErr('Location unavailable. Enter altitude manually.');
      else setErr('Location timed out. Enter altitude manually.');
    }, { timeout: 10000, maximumAge: 300000 });
  };
  const searchZip = async () => {
    if (!zip.trim()) return;
    setLoading(true); setErr('');
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(zip)}&count=1&language=en&format=json`);
      const d = await r.json();
      if (d.results?.length) {
        const ft = Math.round((d.results[0].elevation||0)*3.28084);
        setAltIn(ft); setPresIn('');
        setWaterBP(parseFloat(altToBP(ft).toFixed(1)));
        setLoc(d.results[0].name);
      } else setErr('Location not found.');
    } catch { setErr('Search failed.'); }
    setLoading(false);
  };
  const handleAlt = v => { setAltIn(v); setPresIn(''); if (v>=0) setWaterBP(parseFloat(altToBP(parseFloat(v)||0).toFixed(1))); };
  const handlePres= v => { setPresIn(v); setAltIn(''); if (v>0) setWaterBP(parseFloat(presToBP(parseFloat(v)||29.92).toFixed(1))); };

  return (
    <div>
      <div className="card">
        <div className="card-title"><CardIcon bg="#0d1a2b" icon="mapPin" />{t(lang,'findBoilPt')}</div>
        <button className="btn-primary" style={{ marginBottom:10 }} onClick={useGPS}>
          <I.mapPin size={16} color="#0d1117" /> {t(lang,'useMyLoc')}
        </button>
        {loc && <div style={{ color:'#2dd4a7', fontSize:13, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}><I.mapPin size={14} color="#2dd4a7" />{loc}</div>}
        <div style={{ display:'flex', gap:8 }}>
          <input aria-label={t(lang,'side')} type="text" placeholder={t(lang,'cityZip')} value={zip} onChange={e=>setZip(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchZip()} style={{ flex:1 }} />
          <button onClick={searchZip} aria-label="Search for this place" title="Search" style={{ background:'#e0a44a', border:'none', borderRadius:8, width:44, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <I.search size={18} color="#0d1117" />
          </button>
        </div>
        {err     && <div style={{ color:'#f85149', fontSize:13, marginTop:8 }}>{err}</div>}
        {loading && <div style={{ color:'#7f92a6', fontSize:13, marginTop:8 }}>Loading…</div>}
        <div style={{ background:'linear-gradient(135deg,#c87d1e,#a05e10)', borderRadius:14, padding:'22px 16px', textAlign:'center', marginTop:14, boxShadow:'0 6px 24px rgba(180,100,20,0.28)' }}>
          <div style={{ fontSize:12, fontWeight:600, letterSpacing:'0.1em', color:'rgba(255,255,255,.8)' }}>{t(lang,'waterBoilsAt')}</div>
          <div style={{ fontSize:44, fontWeight:700, color:'#fff', margin:'4px 0' }}>{fmt(waterBP,1)}°F</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,.75)' }}>= {fmt((waterBP-32)*5/9,1)}°C</div>
          <div style={{ height:1, background:'rgba(255,255,255,.3)', margin:'12px 0' }} />
          <div style={{ fontSize:12, fontWeight:600, letterSpacing:'0.1em', color:'rgba(255,255,255,.8)' }}>{t(lang,'finishAt')}</div>
          <div style={{ fontSize:32, fontWeight:700, color:'#fff' }}>{fmt(finT,1)}°F</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title"><CardIcon bg="#2d1a0d" icon="mountain" />{t(lang,'manualEntry')}</div>
        <div className="field-label">{t(lang,'altitude')}</div>
        <NumInput label={t(lang,'altitude')} value={altIn} onChange={handleAlt} min={0} max={15000} step={100} placeholder="e.g., 1500" />
        <div style={{ textAlign:'center', color:'#7f92a6', fontSize:13, margin:'10px 0' }}>{lang==='fr' ? '— ou —' : '— or —'}</div>
        <div className="field-label">{t(lang,'pressure')}</div>
        <NumInput label={t(lang,'pressure')} value={presIn} onChange={handlePres} min={26} max={32} step={0.01} placeholder="e.g., 29.92" />
        {(altIn!==''||presIn!=='') && (
          <div className="result-box orange" style={{ marginTop:12, textAlign:'center' }}>
            <div style={{ fontWeight:700, fontSize:22, color:'#e0a44a' }}>{t(lang,'waterBoilsAt2')} {fmt(bp,1)}°F</div>
            <div style={{ color:'#7f92a6', fontSize:13 }}>{t(lang,'finishAt2')} {fmt(finTemp(bp),1)}°F</div>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ fontWeight:700, fontSize:16, color:'#e0a44a', marginBottom:12 }}>{t(lang,'altRef')}</div>
        {ALT_REF.map(r=>(
          <div key={r.alt} className="info-row" style={{ marginBottom:4 }}>
            <span style={{ fontWeight:500 }}>{r.alt}</span>
            <span style={{ color:'#7f92a6', fontSize:14 }}><strong style={{ color:'#e6edf3' }}>{r.bp}°F</strong> → {t(lang,'finishAt2')} {r.fin}°F</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ fontWeight:700, fontSize:16, color:'#e0a44a', marginBottom:12 }}>{t(lang,'proTips')}</div>
        {['Check boiling point daily — weather pressure changes affect it','Keep a pot of water boiling to monitor actual BP','High pressure = higher BP, Low pressure = lower BP','Syrup thermometer is more reliable than Brix for draw-off'].map((t,i)=><TipItem key={i}>{t}</TipItem>)}
      </div>
    </div>
  );
}



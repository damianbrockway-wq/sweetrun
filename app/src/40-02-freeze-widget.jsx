// ─── Freeze/Thaw Widget ───────────────────────────────────────────────────────
function FreezeThawWidget({ lang='en' }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [zip, setZip] = useState('');

  const fetchW = async (lat, lon) => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&forecast_days=7&timezone=auto`);
      setWeather(await r.json());
    } catch { setError('Could not load forecast. Check connection.'); }
    setLoading(false);
  };
  const useGPS = () => {
    if (location.protocol === 'file:') {
      setError('GPS requires the app to be hosted online (HTTPS). Use the zip/city search below, or open this file through a local server or Netlify.');
      return;
    }
    if (!navigator.geolocation) { setError('GPS not supported by this browser.'); return; }
    setLoading(true); setError('');
    navigator.geolocation.getCurrentPosition(
      p => fetchW(p.coords.latitude, p.coords.longitude),
      e => {
        setLoading(false);
        if (e.code === 1) setError('Location permission denied — allow location access in your browser and try again.');
        else if (e.code === 2) setError('Location unavailable. Try entering a zip code instead.');
        else setError('Location request timed out. Try entering a zip code instead.');
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };
  const searchZip = async () => {
    if (!zip.trim()) return;
    setLoading(true); setError('');
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(zip)}&count=1&language=en&format=json`);
      const d = await r.json();
      if (d.results?.length) fetchW(d.results[0].latitude, d.results[0].longitude);
      else { setError('Location not found.'); setLoading(false); }
    } catch { setError('Search failed.'); setLoading(false); }
  };

  return (
    <div className="card">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:12, fontWeight:600, letterSpacing:'0.08em', color:'#7f92a6', marginBottom:12 }}>
        <I.snowflake size={14} color="#58a6ff" /> {t(lang,'ftTitle')} <I.sun size={14} color="#e0a44a" />
      </div>
      <button className="btn-secondary" style={{ marginBottom:10 }} onClick={useGPS}>
        <I.mapPin size={16} color="#7f92a6" /> {t(lang,'useGPS')}
      </button>
      <div style={{ textAlign:'center', color:'#7f92a6', fontSize:12, marginBottom:8 }}>{t(lang,'ftOr')}</div>
      <div style={{ display:'flex', gap:8 }}>
        <input aria-label={t(lang,'wxCityPh')} type="text" placeholder={t(lang,'wxCityPh')} value={zip}
          onChange={e => setZip(e.target.value)} onKeyDown={e => e.key==='Enter' && searchZip()} style={{ flex:1 }} />
        <button onClick={searchZip} aria-label="Search for this place" title="Search" style={{ background:'#2dd4a7', border:'none', borderRadius:8, width:44, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <I.search size={18} color="#0d1117" />
        </button>
      </div>
      {loading && <div style={{ textAlign:'center', color:'#7f92a6', marginTop:12, fontSize:14 }}>Loading…</div>}
      {error   && <div style={{ color:'#f85149', fontSize:13, marginTop:8 }}>{error}</div>}
      {weather && (
        <div style={{ marginTop:14 }}>
          {(() => {
            const days = weather.daily.time.map((date, i) => {
              const hi = Math.round(weather.daily.temperature_2m_max[i]);
              const lo = Math.round(weather.daily.temperature_2m_min[i]);
              const ideal     = hi >= 40 && lo <= 28;
              const freezeThaw= !ideal && hi >= 32 && lo < 32;
              const tooWarm   = hi > 50 && lo > 32;
              const allFreeze = hi < 32;
              return { date, hi, lo, ideal, freezeThaw, tooWarm, allFreeze };
            });
            const idealCount   = days.filter(d=>d.ideal).length;
            const tooWarmCount = days.filter(d=>d.tooWarm).length;
            return (
              <>
                <div style={{ background: idealCount>0?'#081e0e':'#1a0d04', borderRadius:10, padding:'10px 14px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center', border:`1px solid ${idealCount>0?'#1a4a25':'#4a2000'}` }}>
                  <div>
                    <div style={{ fontWeight:700, color: idealCount>0?'#3fb950':'#e0a44a', fontSize:15 }}>
                      {idealCount>0 ? (lang==='fr' ? idealCount + (idealCount!==1?' jours de coulée':' jour de coulée') + ' à venir' : idealCount + ' run day' + (idealCount!==1?'s':'') + ' ahead') : '—'}
                    </div>
                    <div style={{ fontSize:12, color:'#7f92a6', marginTop:2 }}>
                      {tooWarmCount >= 4 ? t(lang,'ftWarmStretch') : 'hi ≥ 40°F · lo ≤ 28°F'}
                    </div>
                  </div>
                  <div style={{ display:'flex' }}>{idealCount>0
              ? <I.mapleLeaf size={22} color="#2dd4a7" />
              : tooWarmCount>=4 ? <I.alert size={22} color="#e0a44a" />
              : <I.snowflake size={22} color="#58a6ff" />}</div>
                </div>
                {days.map(({ date, hi, lo, ideal, freezeThaw, tooWarm, allFreeze }) => {
                  const d = new Date(date + 'T12:00:00');
                  const i = days.findIndex(x=>x.date===date);
                  let badge = null;
                  if (ideal)      badge = <span style={{ background:'rgba(63,185,80,0.15)', color:'#3fb950', fontSize:13, fontWeight:700, padding:'2px 9px', borderRadius:12, border:'1px solid rgba(63,185,80,0.25)' }}>✓ {t(lang,'badgeIdeal')}</span>;
                  else if (freezeThaw) badge = <span className="good-badge">{t(lang,'badgeFreezeThaw')}</span>;
                  else if (tooWarm)    badge = <span style={{ background:'rgba(240,136,62,0.13)', color:'#e0a44a', fontSize:13, fontWeight:700, padding:'2px 9px', borderRadius:12, border:'1px solid rgba(240,136,62,0.22)' }}>{t(lang,'badgeTooWarm')}</span>;
                  else if (allFreeze)  badge = <span className="freeze-badge">{t(lang,'badgeAllFreeze')}</span>;
                  return (
                    <div key={date} className="weather-day" style={{ borderLeft: ideal?'3px solid #3fb950':tooWarm?'3px solid #e0a44a':'3px solid transparent' }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:14 }}>{i===0?t(lang,'today'):DAY[lang][d.getDay()]}</div>
                        <div style={{ color:'#7f92a6', fontSize:12 }}>{MON[lang][d.getMonth()]} {d.getDate()}</div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ color:'#e0a44a', fontWeight:600 }}>{hi}°</span>
                        <span style={{ color:'#7f92a6', fontSize:13 }}>/</span>
                        <span style={{ color:'#58a6ff', fontWeight:600 }}>{lo}°</span>
                        {badge}
                      </div>
                    </div>
                  );
                })}
                <div style={{ fontSize:12, color:'#7f92a6', marginTop:8, textAlign:'center' }}>
                  {t(lang,'ftLegend')}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}


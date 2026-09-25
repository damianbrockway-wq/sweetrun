// ─── SAP RUN SCORING (Acer saccharum physiology, Cornell/UVM Proctor research) ──
function _sapRunScore(hiF, loF, windMph, precipIn, sunSec, prevHiF, runStreak) {
  if (loF >= 32 || hiF <= 32) return { score:0, quality:'No Flow', buddyRisk:false };
  let score = 0;
  // Night freeze quality — ideal 18-28°F (-8 to -2°C)
  if      (loF >= 28) score += 5;
  else if (loF >= 18) score += 25;
  else if (loF >= 5)  score += 15;
  else                score += Math.max(0, 3 + (loF - 5) * 0.3);
  // Day thaw quality — ideal 40-46°F (4-8°C); >50°F = buddy risk
  const buddyRisk = hiF >= 50;
  if (!buddyRisk) {
    if      (hiF >= 40 && hiF < 46) score += 25;
    else if (hiF >= 46 && hiF < 50) score += 18;
    else if (hiF >= 33 && hiF < 40) score += 12;
    else                             score += 5;
  }
  // Temperature swing ΔT — bigger is better
  score += Math.min(25, ((hiF - loF) / 35) * 25);
  // Sunshine bonus (max 8 pts at 9h)
  score += Math.min(8, ((sunSec || 0) / 3600) * 0.9);
  // Wind penalty (>15 mph hurts)
  if (windMph > 15) score -= Math.min(8, ((windMph - 15) / 15) * 8);
  // Precip penalty (>0.1" dilutes/washes sap)
  if (precipIn > 0.1) score -= Math.min(10, ((precipIn - 0.1) / 0.8) * 10);
  // Previous warm day — builds toward bud break
  if (prevHiF != null && prevHiF > 48) score -= Math.min(10, (prevHiF - 48) * 0.8);
  // Consecutive run days — trees need a refreeze between runs
  if ((runStreak || 0) >= 3) score -= Math.min(12, (runStreak - 2) * 4);
  score = Math.max(0, Math.min(100, Math.round(score)));
  let quality;
  if      (score >= 80) quality = 'Excellent';
  else if (score >= 62) quality = 'Good';
  else if (score >= 44) quality = 'Fair';
  else if (score >= 22) quality = 'Poor';
  else                  quality = 'No Flow';
  return { score, quality, buddyRisk };
}

// ─── WEATHER TAB ──────────────────────────────────────────────────────────────
// ─── Freeze/thaw ribbon (Pass 5) ─────────────────────────────────────────────
// A compact SVG band above the scored strip: the 7-day hi/lo as a smoothed
// shaded area, the 32°F freeze line as a hairline, and amber glow under the
// run-day columns. "Run day" here is EXACTLY the Freeze/Thaw list's `ideal`
// (hiF ≥ 40 && loF ≤ 28) — one definition, two renders. Pure render from the
// forecast already fetched; nothing animates (reduced motion needs no rules).
function FreezeThawRibbon({ days, lang }) {
  if (!days || days.length < 2) return null;
  const N = days.length;
  const W = 100, H = 64;                       // stretched viewBox; strokes are non-scaling
  const lows = days.map(d => d.loF), his = days.map(d => d.hiF);
  const lo = Math.min(...lows, 28) - 4, hi = Math.max(...his, 40) + 4;
  const y = v => +((4 + (hi - v) / (hi - lo) * (H - 8)).toFixed(2));
  const x = i => +(((i + 0.5) * (W / N)).toFixed(2));
  // Catmull-Rom → cubic bezier (tension 1/6): one smooth pass per polyline.
  const smooth = pts => pts.map((p, i, a) => {
    if (!i) return `M${p[0]} ${p[1]}`;
    const pm = a[i - 2] || a[i - 1], p0 = a[i - 1], p2 = a[i + 1] || p;
    const c1 = [+(p0[0] + (p[0] - pm[0]) / 6).toFixed(2), +(p0[1] + (p[1] - pm[1]) / 6).toFixed(2)];
    const c2 = [+(p[0] - (p2[0] - p0[0]) / 6).toFixed(2), +(p[1] - (p2[1] - p0[1]) / 6).toFixed(2)];
    return `C${c1[0]} ${c1[1]},${c2[0]} ${c2[1]},${p[0]} ${p[1]}`;
  }).join('');
  const hiPts = his.map((v, i) => [x(i), y(v)]);
  const loPts = lows.map((v, i) => [x(i), y(v)]);
  const area = smooth(hiPts) + smooth(loPts.slice().reverse()).replace(/^M/, 'L') + 'Z';
  // Run-day columns (consecutive days merged into one segment)
  const ideal = days.map(d => d.hiF >= 40 && d.loF <= 28);
  const runs = [];
  for (let i = 0; i < N; i++) {
    if (!ideal[i]) continue;
    const last = runs[runs.length - 1];
    if (last && last.to === i - 1) last.to = i; else runs.push({ from: i, to: i });
  }
  const y32 = y(32);
  return (
    <div className="card" style={{ padding:'14px 12px' }}>
      <div style={{ fontSize:13, fontWeight:700, color:'#7f92a6', letterSpacing:'0.08em', marginBottom:10 }}>
        {t(lang,'wxRibbonTitle')}
      </div>
      <div style={{ position:'relative' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
          style={{ display:'block' }} aria-hidden="true">
          <defs>
            <linearGradient id="srFtBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="rgba(224,164,74,0.30)" />
              <stop offset="100%" stopColor="rgba(88,166,255,0.22)" />
            </linearGradient>
            <linearGradient id="srFtRun" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="rgba(235,154,51,0)" />
              <stop offset="100%" stopColor="rgba(235,154,51,0.30)" />
            </linearGradient>
          </defs>
          {/* Amber glow under run-day columns — drawn first, beneath everything */}
          {runs.map(r => (
            <g key={r.from}>
              <rect x={(r.from * W / N).toFixed(2)} y="0" width={((r.to - r.from + 1) * W / N).toFixed(2)} height={H} fill="url(#srFtRun)" />
              <rect x={(r.from * W / N).toFixed(2)} y={H - 2} width={((r.to - r.from + 1) * W / N).toFixed(2)} height="2" fill="rgba(235,154,51,0.85)" />
            </g>
          ))}
          {/* The hi–lo band */}
          <path d={area} fill="url(#srFtBand)" />
          {/* 32°F freeze hairline */}
          <line x1="0" y1={y32} x2={W} y2={y32} stroke="rgba(230,237,243,0.30)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="4 3" />
          {/* Hi and lo polylines, smoothed — the existing hi/lo data colours */}
          <path d={smooth(hiPts)} fill="none" stroke="#e0a44a" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
          <path d={smooth(loPts)} fill="none" stroke="#58a6ff" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        </svg>
        <span style={{ position:'absolute', right:2, top:`calc(${(y32 / H * 100).toFixed(1)}% - 15px)`,
          fontSize:10, fontWeight:700, color:'rgba(230,237,243,0.55)',
          fontFamily:"ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace", fontVariantNumeric:'tabular-nums' }}>32°F</span>
      </div>
      {/* Day labels beneath — same columns as the ribbon, tabular */}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${N}, 1fr)`, marginTop:4 }}>
        {days.map((d, i) => (
          <span key={d.date} style={{ textAlign:'center', fontSize:11, fontWeight: ideal[i] ? 700 : 600,
            color: ideal[i] ? '#EB9A33' : '#7f92a6', fontVariantNumeric:'tabular-nums',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.dayLabel}</span>
        ))}
      </div>
      <div style={{ fontSize:12, color:'#7f92a6', marginTop:8, lineHeight:1.4 }}>{t(lang,'wxRibbonNote')}</div>
    </div>
  );
}

function WeatherTab({ lang='en', trees=0, units='GAL' }) {
  const [locName,    setLocName]    = useState(() => ls.get('sg_wx_name',''));
  const [wxLat,      setWxLat]      = useState(() => ls.get('sg_wx_lat', null));
  const [wxLon,      setWxLon]      = useState(() => ls.get('sg_wx_lon', null));
  const [query,      setQuery]      = useState('');
  const [geoResults, setGeoResults] = useState([]);
  const [wxData,     setWxData]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error,      setError]      = useState('');
  const [selDay,     setSelDay]     = useState(0);
  const [showSearch, setShowSearch] = useState(() => !ls.get('sg_wx_lat', null));

  useEffect(() => {
    const la = ls.get('sg_wx_lat', null);
    const lo = ls.get('sg_wx_lon', null);
    if (la && lo) _wxFetch(la, lo);
  }, []);

  const _wxFetch = async (la, lo) => {
    setLoading(true); setError('');
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + la + '&longitude=' + lo
        + '&daily=temperature_2m_max,temperature_2m_min,windspeed_10m_max,precipitation_sum,sunshine_duration,weathercode'
        + '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch'
        + '&timezone=auto&forecast_days=7';
      const r = await fetch(url);
      const d = await r.json();
      setWxData(d);
      setSelDay(0);
      setShowSearch(false);
    } catch(e) { setError('Could not load weather. Check your connection.'); }
    setLoading(false);
  };

  const _reverseGeocode = async (la, lo) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${lo}&format=json&zoom=10`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const d = await r.json();
      const a = d.address || {};
      // Pick the most human-useful level: town > city > county > state
      const place = a.town || a.city || a.village || a.hamlet || a.county || a.state || '';
      const state = a.state || a.country || '';
      if (place) return [place, state].filter(Boolean).join(', ');
    } catch {}
    // Fallback to coordinates if reverse geocode fails
    return la.toFixed(2) + '°, ' + lo.toFixed(2) + '°';
  };

  const useGPS = () => {
    if (location.protocol === 'file:') {
      setError('GPS requires HTTPS hosting. Use zip/city search, or serve from a local server.');
      return;
    }
    if (!navigator.geolocation) { setError('GPS not supported by this browser.'); return; }
    setLoading(true); setError('');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const la = pos.coords.latitude, lo = pos.coords.longitude;
        const name = await _reverseGeocode(la, lo);
        setWxLat(la); setWxLon(lo); setLocName(name);
        ls.set('sg_wx_lat', la); ls.set('sg_wx_lon', lo); ls.set('sg_wx_name', name);
        _wxFetch(la, lo);
      },
      e => {
        setLoading(false);
        if (e.code === 1) setError('Location denied — allow location access in browser settings.');
        else if (e.code === 2) setError('Location unavailable. Try zip/city search.');
        else setError('Location timed out. Try zip/city search.');
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  const searchGeo = async () => {
    if (!query.trim()) return;
    setGeoLoading(true); setGeoResults([]); setError('');
    try {
      const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(query) + '&count=5&language=en&format=json');
      const d = await r.json();
      if (d.results && d.results.length) setGeoResults(d.results);
      else setError('Location not found. Try a different city or zip.');
    } catch { setError('Search failed. Check your connection.'); }
    setGeoLoading(false);
  };

  const pickLocation = (res) => {
    const la = res.latitude, lo = res.longitude;
    const name = [res.name, res.admin1, res.country_code].filter(Boolean).join(', ');
    setWxLat(la); setWxLon(lo); setLocName(name);
    ls.set('sg_wx_lat', la); ls.set('sg_wx_lon', lo); ls.set('sg_wx_name', name);
    setGeoResults([]); setQuery('');
    _wxFetch(la, lo);
  };

  // Build scored forecast from API data
  let days = [];
  if (wxData && wxData.daily) {
    const D = wxData.daily;
    let runStreak = 0;
    days = D.time.slice(0, 7).map((date, i) => {
      const hiF      = Math.round(D.temperature_2m_max?.[i] ?? 32);
      const loF      = Math.round(D.temperature_2m_min?.[i] ?? 20);
      const windMph  = Math.round(D.windspeed_10m_max?.[i] || 0);
      const precipIn = +((D.precipitation_sum?.[i] || 0).toFixed(2));
      const sunSec   = D.sunshine_duration?.[i] || 0;
      const prevHiF  = i > 0 ? Math.round(D.temperature_2m_max[i-1]) : null;
      const sc       = _sapRunScore(hiF, loF, windMph, precipIn, sunSec, prevHiF, runStreak);
      if (sc.score >= 44) runStreak++; else runStreak = 0;
      const dt       = new Date(date + 'T12:00:00');
      return {
        date, hiF, loF, windMph, precipIn, sunSec,
        score: sc.score, quality: sc.quality, buddyRisk: sc.buddyRisk,
        dayLabel:  i === 0 ? t(lang,'today') : (DAY[lang] || DAY['en'])[dt.getDay()],
        dateLabel: (MON[lang] || MON['en'])[dt.getMonth()] + ' ' + dt.getDate()
      };
    });
  }

  const goodDays  = days.filter(d => d.score >= 44).length;
  const bestScore = days.length ? Math.max(...days.map(d => d.score)) : 0;

  const scoreColor = (s) =>
    s >= 80 ? '#3fb950' : s >= 62 ? '#7cc950' : s >= 44 ? '#d4a017' : s >= 22 ? '#8b5a2b' : '#7f92a6';
  const scoreBg = (s) =>
    s >= 80 ? 'rgba(63,185,80,0.13)' : s >= 62 ? 'rgba(124,201,80,0.11)' :
    s >= 44 ? 'rgba(212,160,23,0.11)' : 'rgba(61,80,104,0.08)';

  const sel = days[selDay] || null;

  return (
    <div>

      {/* ── Location card ── */}
      <div className="card" style={{ padding:'12px 14px' }}>
        {locName && !showSearch ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
              <I.mapPin size={15} color="#2dd4a7" />
              <span style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{locName}</span>
            </div>
            <button onClick={() => setShowSearch(true)}
              style={{ background:'#1c2128', border:'1px solid #30363d', borderRadius:8, padding:'5px 12px', color:'#7f92a6', fontSize:12, cursor:'pointer', flexShrink:0 }}>
              {t(lang,'wxChange')}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#7f92a6', marginBottom:8, letterSpacing:'0.06em' }}>{t(lang,'wxSetLoc')}</div>
            <button className="btn-secondary" style={{ marginBottom:10 }} onClick={useGPS}>
              <I.mapPin size={15} color="#7f92a6" /> {t(lang,'wxUseGPS')}
            </button>
            <div style={{ textAlign:'center', color:'#7f92a6', fontSize:12, marginBottom:8 }}>{t(lang,'wxOr')}</div>
            <div style={{ display:'flex', gap:8 }}>
              <input aria-label={t(lang,'wxCityPh')} type="text" placeholder={t(lang,'wxCityPh')}
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchGeo()}
                style={{ flex:1 }} />
              <button onClick={searchGeo} aria-label="Search for this place" title="Search"
                style={{ background:'#2dd4a7', border:'none', borderRadius:8, width:44, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer' }}>
                {geoLoading ? <span style={{ color:'#0d1117', fontSize:16, fontWeight:700 }}>…</span> : <I.search size={18} color="#0d1117" />}
              </button>
            </div>
            {geoResults.length > 0 && (
              <div style={{ marginTop:6, border:'1px solid #30363d', borderRadius:8, overflow:'hidden' }}>
                {geoResults.map((res, i) => (
                  <button key={i} onClick={() => pickLocation(res)}
                    className="wx-geo-result"
                    style={{ background: i % 2 === 0 ? '#1c2128' : '#161b22', borderBottom: i < geoResults.length - 1 ? '1px solid #30363d' : 'none' }}>
                    <span style={{ fontWeight:600 }}>{res.name}</span>
                    {res.admin1 && <span style={{ color:'#7f92a6' }}>, {res.admin1}</span>}
                    {res.country_code && <span style={{ color:'#7f92a6' }}> ({res.country_code})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {error && <div style={{ color:'#f85149', fontSize:13, marginTop:8 }}>{error}</div>}
      </div>

      {/* ── Loading spinner ── */}
      {loading && (
        <div style={{ textAlign:'center', padding:'32px 0', color:'#7f92a6', fontSize:14 }}>{t(lang,'wxLoadingForecast')}</div>
      )}

      {/* ── Forecast content ── */}
      {!loading && wxData && (
        <div>

          {/* Summary banner */}
          <div style={{
            background: goodDays > 0 ? '#081e0e' : '#0d1117',
            border: '1px solid ' + (goodDays > 0 ? '#1a4a25' : '#1e2d3d'),
            borderRadius:12, padding:'12px 16px', marginBottom:12,
            display:'flex', justifyContent:'space-between', alignItems:'center'
          }}>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color: goodDays > 0 ? '#3fb950' : '#7f92a6' }}>
                {goodDays > 0
                  ? (lang==='fr' ? goodDays + (goodDays !== 1 ? ' jours de coulée' : ' jour de coulée') + ' à venir' : goodDays + ' run day' + (goodDays !== 1 ? 's' : '') + ' ahead')
                  : t(lang,'wxNoRunDays')}
              </div>
              <div style={{ fontSize:12, color:'#7f92a6', marginTop:2 }}>
                {goodDays > 0
                  ? (lang==='fr' ? 'Meilleur score : ' + bestScore + '/100 · Appuyez pour les détails' : 'Best score: ' + bestScore + '/100 · Tap a day for details')
                  : t(lang,'wxNoRunDaysHint')}
              </div>
            </div>
            <div style={{ display:'flex' }}>{goodDays > 0
              ? <I.mapleLeaf size={26} color="#2dd4a7" />
              : <I.snowflake size={26} color="#58a6ff" />}</div>
          </div>

          {/* Freeze/thaw ribbon (Pass 5) — augments the strip below, never replaces it */}
          <FreezeThawRibbon days={days} lang={lang} />

          {/* 7-day score bar strip */}
          <div className="card" style={{ padding:'14px 12px' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#7f92a6', letterSpacing:'0.08em', marginBottom:12 }}>
              {t(lang,'wxSapForecast')}
            </div>
            <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4 }}>
              {days.map((day, i) => (
                <button key={i} onClick={() => setSelDay(i)}
                  className="wx-score-col"
                  style={{
                    width: 'calc(' + Math.floor(100/days.length) + '% - 6px)',
                    background: selDay === i ? scoreBg(day.score) : 'transparent',
                    borderColor: selDay === i ? scoreColor(day.score) : '#1e2d3d'
                  }}>
                  <span style={{ fontSize:13, fontWeight:700, color: selDay === i ? '#e6edf3' : '#7f92a6' }}>
                    {day.dayLabel}
                  </span>
                  <div style={{ width:22, height:64, background:'#1e2d3d', borderRadius:11, position:'relative', overflow:'hidden', margin:'2px 0' }}>
                    {day.score > 0 && (
                      <div style={{
                        position:'absolute', bottom:0, left:0, right:0,
                        height: day.score + '%',
                        background: scoreColor(day.score),
                        borderRadius:11
                      }} />
                    )}
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color: scoreColor(day.score) }}>
                    {day.score > 0 ? day.score : '—'}
                  </span>
                  <span style={{ fontSize:12, color:'#e0a44a', fontWeight:600 }}>{day.hiF}°</span>
                  <span style={{ fontSize:12, color:'#58a6ff' }}>{day.loF}°</span>
                </button>
              ))}
            </div>
            {/* Legend */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:'5px 12px', marginTop:10, paddingTop:10, borderTop:'1px solid #1e2d3d' }}>
              {[[`#3fb950`,t(lang,'scoreLeg80')],[`#7cc950`,t(lang,'scoreLeg62')],[`#d4a017`,t(lang,'scoreLeg44')],[`#7f92a6`,t(lang,'scoreLegNo')]].map(([c, lbl]) => (
                <div key={lbl} style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, color:'#7f92a6' }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:c, flexShrink:0 }} />
                  {lbl}
                </div>
              ))}
            </div>
          </div>

          {/* Selected day detail */}
          {sel && (
            <div className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:17 }}>{sel.dayLabel} — {sel.dateLabel}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
                    <span style={{ fontSize:14, fontWeight:700, color: scoreColor(sel.score) }}>
                      {({'Excellent':t(lang,'qualExcellent'),'Good':t(lang,'qualGood'),'Fair':t(lang,'qualFair'),'Poor':t(lang,'qualPoor'),'No Flow':t(lang,'qualNoFlow')}[sel.quality]||sel.quality)} ({sel.score}/100)
                    </span>
                    {sel.buddyRisk && (
                      <span style={{ fontSize:13, color:'#e0a44a', fontWeight:700, background:'rgba(240,136,62,0.12)', border:'1px solid rgba(240,136,62,0.3)', borderRadius:8, padding:'2px 8px' }}>
                        {t(lang,'wxBuddyRiskBadge')}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:24, fontWeight:700, color:'#e0a44a', lineHeight:1.1 }}>{sel.hiF}°F</div>
                  <div style={{ fontSize:17, fontWeight:700, color:'#58a6ff' }}>{sel.loF}°F</div>
                </div>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:'#7f92a6', letterSpacing:'0.08em', marginBottom:6 }}>{t(lang,'wxScoringFactors')}</div>
              {[
                { Icon:I.snowflake, tint:'#58a6ff', label:t(lang,'wxNightFreeze'), val:sel.loF+'°F',
                  note: sel.loF >= 18 && sel.loF <= 28 ? t(lang,'wxIdealRange') : sel.loF < 18 ? t(lang,'wxVeryCold') : sel.loF < 32 ? t(lang,'wxLightFreeze') : t(lang,'wxNoFreeze') },
                { Icon:I.sun, tint:'#e0a44a', label:t(lang,'wxDayThaw'),    val:sel.hiF+'°F',
                  note: sel.hiF >= 40 && sel.hiF < 46 ? t(lang,'wxIdealRange') : sel.hiF >= 50 ? t(lang,'wxBuddyRunRisk') : sel.hiF >= 33 ? t(lang,'wxMarginalThaw') : t(lang,'wxNoThaw') },
                { Icon:I.barChart, tint:'#2dd4a7', label:t(lang,'wxDtSwing'), val:(sel.hiF-sel.loF)+'°F',
                  note: (sel.hiF-sel.loF) >= 25 ? t(lang,'wxExcellent') : (sel.hiF-sel.loF) >= 18 ? t(lang,'wxGood') : t(lang,'wxLimited') },
                { Icon:I.wind, tint:'#7f92a6', label:t(lang,'wxWind'),       val:sel.windMph+' mph',
                  note: sel.windMph <= 10 ? t(lang,'wxCalm') : sel.windMph <= 20 ? t(lang,'wxLightWind') : t(lang,'wxReducesFlow') },
                { Icon:I.droplet, tint:'#58a6ff', label:t(lang,'wxPrecip'),     val:sel.precipIn+'"',
                  note: sel.precipIn < 0.05 ? t(lang,'wxClearSky') : sel.precipIn < 0.2 ? t(lang,'wxLightRain') : t(lang,'wxHeavyRain') },
                { Icon:I.cloudSun, tint:'#e0a44a', label:t(lang,'wxSunshine'),   val:((sel.sunSec||0)/3600).toFixed(1)+'h',
                  note: (sel.sunSec||0)/3600 >= 7 ? t(lang,'wxSunny') : (sel.sunSec||0)/3600 >= 4 ? t(lang,'wxPartlySunny') : t(lang,'wxOvercast') }
              ].map(row => (
                <div key={row.label} className="wx-factor-row">
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ display:'inline-flex', alignItems:'center', width:16 }}>
                      {React.createElement(row.Icon, { size:15, color:row.tint })}
                    </span>
                    <span style={{ fontSize:13, color:'#7f92a6' }}>{row.label}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'#e6edf3' }}>{row.val}</span>
                    <span style={{ fontSize:13, color:'#7f92a6', minWidth:80, textAlign:'right' }}>{row.note}</span>
                  </div>
                </div>
              ))}
              {sel.buddyRisk && (
                <div style={{ marginTop:12, background:'rgba(240,136,62,0.08)', border:'1px solid rgba(240,136,62,0.2)', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#e0a44a', lineHeight:1.5 }}>
                  <strong><I.alert size={13} color="currentColor" /> Buddy Run:</strong> High temps above 50°F can trigger bud break, turning sap bitter and ending the season. Taste your sap and watch the trees closely.
                </div>
              )}
              <div style={{ marginTop:10, fontSize:13, color:'#7f92a6', lineHeight:1.6 }}>
                Model based on Acer saccharum physiology (Cornell/UVM Proctor research). Factors: freeze depth, thaw quality, ΔT swing, sunshine, wind, precipitation, run streak. Individual sugarbush conditions vary.
              </div>
            </div>
          )}

          {/* Freeze / Thaw 7-day list */}
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:12, fontWeight:600, letterSpacing:'0.08em', color:'#7f92a6', marginBottom:12 }}>
              <I.snowflake size={14} color="#58a6ff" /> {t(lang,'ftTitle')} <I.sun size={14} color="#e0a44a" />
            </div>
            {days.map((day, i) => {
              const ideal      = day.hiF >= 40 && day.loF <= 28;
              const freezeThaw = !ideal && day.hiF >= 32 && day.loF < 32;
              const tooWarm    = day.hiF > 50 && day.loF > 32;
              const allFreeze  = day.hiF < 32;
              let badge = null;
              if      (ideal)      badge = <span style={{ background:'rgba(63,185,80,0.15)', color:'#3fb950', fontSize:13, fontWeight:700, padding:'2px 9px', borderRadius:12, border:'1px solid rgba(63,185,80,0.25)' }}>{t(lang,'badgeIdeal')}</span>;
              else if (freezeThaw) badge = <span className="good-badge">{t(lang,'badgeFreezeThaw')}</span>;
              else if (tooWarm)    badge = <span style={{ background:'rgba(240,136,62,0.13)', color:'#e0a44a', fontSize:13, fontWeight:700, padding:'2px 9px', borderRadius:12, border:'1px solid rgba(240,136,62,0.22)' }}>{t(lang,'badgeTooWarm')}</span>;
              else if (allFreeze)  badge = <span className="freeze-badge">{t(lang,'badgeAllFreeze')}</span>;
              return (
                <div key={day.date} className="weather-day" style={{ borderLeft: ideal?'3px solid #3fb950':tooWarm?'3px solid #e0a44a':'3px solid transparent' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{day.dayLabel}</div>
                    <div style={{ color:'#7f92a6', fontSize:12 }}>{day.dateLabel}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ color:'#e0a44a', fontWeight:600 }}>{day.hiF}°</span>
                    <span style={{ color:'#7f92a6', fontSize:13 }}>/</span>
                    <span style={{ color:'#58a6ff', fontWeight:600 }}>{day.loF}°</span>
                    {badge}
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize:12, color:'#7f92a6', marginTop:8, textAlign:'center' }}>
              {t(lang,'ftLegend')}
            </div>
          </div>

        </div>
      )}

      {/* ── Breakeven Calculator ── */}
      <BreakevenCalculator trees={trees} units={units} />

      {/* ── Empty state ── */}
      {!loading && !wxData && (
        <div className="card" style={{ textAlign:'center', padding:'24px 14px' }}>
          <div style={{ fontWeight:700, fontSize:16, marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><I.thermometer size={20} color="#7f92a6" /> {t(lang,'wxEmptyTitle')}</div>
          <div style={{ color:'#7f92a6', fontSize:13, lineHeight:1.7, marginBottom:16 }}>
            SweetRun pulls the 7-day forecast from Open-Meteo and scores each day for sap flow potential based on freeze-thaw cycles, temperature swing, sunshine, wind, and precipitation.
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
            {[
              [I.snowflake,'#58a6ff','Ideal freeze: 18–28°F'],
              [I.sun,'#e0a44a','Ideal thaw: 40–46°F'],
              [I.barChart,'#2dd4a7','ΔT swing ≥ 25°F = excellent'],
              [I.wind,'#7f92a6','High wind reduces flow']
            ].map(([Ico, tint, tx]) => (
              <div key={tx} style={{ background:'#161b22', border:'1px solid #1e2d3d', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#7f92a6', display:'flex', alignItems:'center', gap:6 }}>
                <Ico size={13} color={tint} /> {tx}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}


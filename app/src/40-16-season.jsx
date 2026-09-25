// ─── MAIN APP ─────────────────────────────────────────────────────────────────
// ─── SEASON TAB (Degree Days + Brix Trend) ────────────────────────────────────
function SeasonTab({ season, lang='en' }) {
  const [lat,      setLat]      = useState(() => ls.get('sg_ddlat', null));
  const [lon,      setLon]      = useState(() => ls.get('sg_ddlon', null));
  const [locName,  setLocName]  = useState(() => ls.get('sg_ddloc', ''));
  const [zip,      setZip]      = useState('');
  const [ddStart,  setDdStart]  = useState(() => ls.get('sg_ddstart', ''));
  const [ddData,   setDdData]   = useState(null);
  const [ddLoad,   setDdLoad]   = useState(false);
  const [ddErr,    setDdErr]    = useState('');
  const [brixLog,  setBrixLog]  = useState(() => ls.get('sg_brixlog', []));
  const [brixIn,   setBrixIn]   = useState('');
  const [noteIn,   setNoteIn]   = useState('');
  const [showDays, setShowDays] = useState(false);

  useEffect(() => { ls.set('sg_ddlat',   lat);     }, [lat]);
  useEffect(() => { ls.set('sg_ddlon',   lon);     }, [lon]);
  useEffect(() => { ls.set('sg_ddloc',   locName); }, [locName]);
  useEffect(() => { ls.set('sg_ddstart', ddStart); }, [ddStart]);
  useEffect(() => { ls.set('sg_brixlog', brixLog); }, [brixLog]);

  const fetchDD = async (la, lo, start) => {
    if (!start || !la) return;
    setDdLoad(true); setDdErr('');
    const today = new Date().toISOString().split('T')[0];
    const end   = start > today ? start : today;
    try {
      const r = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${la}&longitude=${lo}&start_date=${start}&end_date=${end}&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto`);
      const d = await r.json();
      if (d.error) throw new Error(d.reason);
      setDdData(d);
    } catch(e) { setDdErr('Could not load weather history. ' + (e.message||'')); }
    setDdLoad(false);
  };

  const useGPS = () => {
    if (location.protocol === 'file:') { setDdErr('GPS requires HTTPS hosting. Enter a zip code instead.'); return; }
    if (!navigator.geolocation) { setDdErr('GPS not supported.'); return; }
    setDdLoad(true); setDdErr('');
    navigator.geolocation.getCurrentPosition(p => {
      const la = p.coords.latitude, lo = p.coords.longitude;
      setLat(la); setLon(lo); setLocName(`${la.toFixed(2)}, ${lo.toFixed(2)}`);
      if (ddStart) fetchDD(la, lo, ddStart);
      else setDdLoad(false);
    }, () => { setDdErr('Location denied.'); setDdLoad(false); });
  };

  const searchZip = async () => {
    if (!zip.trim()) return;
    setDdLoad(true); setDdErr('');
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(zip)}&count=1&language=en&format=json`);
      const d = await r.json();
      if (d.results?.length) {
        const { latitude: la, longitude: lo, name, admin1 } = d.results[0];
        setLat(la); setLon(lo); setLocName(`${name}${admin1 ? ', '+admin1 : ''}`);
        if (ddStart) fetchDD(la, lo, ddStart);
        else setDdLoad(false);
      } else { setDdErr('Location not found.'); setDdLoad(false); }
    } catch { setDdErr('Search failed.'); setDdLoad(false); }
  };

  const refresh = () => { if (lat && ddStart) fetchDD(lat, lon, ddStart); };

  // Calculate degree days (base 40°F)
  let cumDD = 0, dailyDD = [];
  if (ddData?.daily) {
    ddData.daily.time.forEach((date, i) => {
      const hi = ddData.daily.temperature_2m_max[i] ?? 0;
      const lo = ddData.daily.temperature_2m_min[i] ?? 0;
      const dd = Math.max(0, ((hi + lo) / 2) - 40);
      cumDD += dd;
      dailyDD.push({ date, hi: Math.round(hi), lo: Math.round(lo), dd: +dd.toFixed(1), cum: +cumDD.toFixed(1) });
    });
  }

  // Brix sparkline
  const addBrix = () => {
    if (!brixIn) return;
    setBrixLog(p => [...p, { id:Date.now(), date:srToday(), brix:parseFloat(brixIn), note:noteIn }]);
    setBrixIn(''); setNoteIn('');
  };
  const bVals = brixLog.map(e => e.brix);
  const bMin  = bVals.length ? Math.min(...bVals) : 0;
  const bMax  = bVals.length ? Math.max(...bVals) : 4;
  const bRange = bMax - bMin || 1;
  const SW = 320, SH = 80;

  // Buddy sap warning: last reading is lower than peak by >30%
  const peak    = Math.max(...(bVals.length ? bVals : [0]));
  const lastB   = bVals[bVals.length - 1] || 0;
  const buddyWarn = bVals.length >= 3 && lastB < peak * 0.7;

  return (
    <div>
      {/* ── Degree Days ── */}
      <div className="card">
        <div className="card-title"><CardIcon bg="#0d2b15" icon="sun" />{t(lang,'ddTitle')}</div>
        <div style={{ fontSize:13, color:'#7f92a6', marginBottom:12, lineHeight:1.5 }}>{t(lang,'ddDesc')}
        </div>

        {/* Location */}
        {!lat ? (
          <>
            <button className="btn-secondary" style={{ marginBottom:10 }} onClick={useGPS}>
              <I.mapPin size={16} color="#7f92a6" /> {t(lang,'useGPS')}
            </button>
            <div style={{ textAlign:'center', color:'#7f92a6', fontSize:12, marginBottom:8 }}>{t(lang,'ftOr')}</div>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <input aria-label={t(lang,'cityZip')} type="text" placeholder={t(lang,'cityZip')} value={zip} onChange={e=>setZip(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchZip()} style={{ flex:1 }} />
              <button onClick={searchZip} aria-label="Search for this place" title="Search" style={{ background:'#2dd4a7', border:'none', borderRadius:8, width:44, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><I.search size={18} color="#0d1117" /></button>
            </div>
          </>
        ) : (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}><I.mapPin size={14} color="#2dd4a7" /><span style={{ fontSize:13, color:'#b0bec8' }}>{locName}</span></div>
            <button onClick={()=>{setLat(null);setLon(null);setLocName('');setDdData(null);}} style={{ background:'none', border:'none', color:'#7f92a6', fontSize:12, cursor:'pointer', textDecoration:'underline' }}>{t(lang,'changeLocation')}</button>
          </div>
        )}

        {/* Season start date */}
        <div className="field-label">{t(lang,'startDate')}</div>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input aria-label={t(lang,'startDate')} type="date" value={ddStart} onChange={e=>setDdStart(e.target.value)} style={{ flex:1 }} />
          <button onClick={refresh} aria-label="Refresh the forecast" title="Refresh" style={{ background:'#2dd4a7', border:'none', borderRadius:8, width:44, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><I.search size={18} color="#0d1117" /></button>
        </div>

        {ddLoad && <div style={{ textAlign:'center', color:'#7f92a6', fontSize:14 }}>{t(lang,'loadingWeather')}</div>}
        {ddErr  && <div style={{ color:'#f85149', fontSize:13 }}>{ddErr}</div>}

        {dailyDD.length > 0 && (
          <>
            {/* Summary */}
            <div className="result-box green">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:12, color:'#7f92a6', fontWeight:600 }}>{t(lang,'totalDD')}</div>
                  <div style={{ fontSize:32, fontWeight:800, color:'#3fb950' }}>{Math.round(cumDD)}</div>
                  <div style={{ fontSize:13, color:'#7f92a6' }}>{t(lang,'sinceTapDay')}</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:12, color:'#7f92a6', fontWeight:600 }}>{t(lang,'days')}</div>
                  <div style={{ fontSize:32, fontWeight:800, color:'#3fb950' }}>{dailyDD.length}</div>
                  <div style={{ fontSize:13, color:'#7f92a6' }}>{t(lang,'inSeason')}</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:12, color:'#7f92a6', fontWeight:600 }}>{t(lang,'avgDay')}</div>
                  <div style={{ fontSize:32, fontWeight:800, color:'#3fb950' }}>{(cumDD/dailyDD.length).toFixed(1)}</div>
                  <div style={{ fontSize:13, color:'#7f92a6' }}>{t(lang,'ddPerDay')}</div>
                </div>
              </div>
            </div>

            {/* DD context */}
            <div style={{ marginTop:10 }}>
              {[
                { threshold:0,   label:'Season opening',    note:'First sap runs possible' },
                { threshold:50,  label:'Early season',      note:'Runs improving' },
                { threshold:150, label:'Peak season',       note:'Best run conditions' },
                { threshold:300, label:'Late season',       note:'Brix dropping, watch for buddy' },
                { threshold:500, label:'Season end likely', note:'Trees budding soon' },
              ].map((m, i, arr) => {
                const next = arr[i+1];
                const active = cumDD >= m.threshold && (!next || cumDD < next.threshold);
                return (
                  <div key={m.threshold} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:8, marginBottom:4, background: active?'#081e0e':'transparent', border: active?'1px solid #1a4a25':'1px solid transparent' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background: cumDD >= m.threshold ? '#3fb950' : '#253040', flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <span style={{ fontWeight: active?700:400, color: active?'#3fb950':'#7f92a6', fontSize:14 }}>{m.label}</span>
                      {active && <span style={{ color:'#7f92a6', fontSize:12 }}> · {m.note}</span>}
                    </div>
                    <span style={{ fontSize:12, color:'#7f92a6' }}>{m.threshold} DD</span>
                  </div>
                );
              })}
            </div>

            {/* Daily breakdown (collapsible) */}
            <div style={{ marginTop:10 }}>
              <div className="collapsible-header" onClick={()=>setShowDays(s=>!s)} style={{ padding:'4px 0' }}>
                <span style={{ fontSize:13, color:'#7f92a6' }}>{t(lang,'dailyBreakdown')} ({dailyDD.length})</span>
                {showDays ? <I.chevUp size={14} color="#7f92a6" /> : <I.chevDown size={14} color="#7f92a6" />}
              </div>
              {showDays && (
                <div style={{ marginTop:8, maxHeight:220, overflowY:'auto' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr 1fr 1fr', gap:4, fontSize:13, fontWeight:600, color:'#7f92a6', padding:'4px 6px', marginBottom:2 }}>
                    <span>Date</span><span style={{ textAlign:'right' }}>Hi</span><span style={{ textAlign:'right' }}>Lo</span><span style={{ textAlign:'right' }}>DD</span><span style={{ textAlign:'right' }}>Total</span>
                  </div>
                  {dailyDD.slice().reverse().map(d => (
                    <div key={d.date} style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr 1fr 1fr', gap:4, fontSize:12, padding:'5px 6px', borderBottom:'1px solid #131e2c' }}>
                      <span style={{ color:'#7f92a6' }}>{d.date.slice(5)}</span>
                      <span style={{ textAlign:'right', color:'#e0a44a' }}>{d.hi}°</span>
                      <span style={{ textAlign:'right', color:'#58a6ff' }}>{d.lo}°</span>
                      <span style={{ textAlign:'right', color: d.dd>0?'#3fb950':'#7f92a6' }}>{d.dd}</span>
                      <span style={{ textAlign:'right', fontWeight:600 }}>{d.cum}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Brix Trend ── */}
      <div className="card">
        <div className="card-title"><CardIcon bg="#2b1a0d" icon="droplet" />{t(lang,'brixTitle')}</div>
        <div style={{ fontSize:13, color:'#7f92a6', marginBottom:12 }}>{t(lang,'brixDesc')}
        </div>

        {buddyWarn && (
          <div style={{ background:'#2b1505', border:'1px solid #8b3a10', borderRadius:10, padding:'10px 14px', marginBottom:12, display:'flex', gap:10, alignItems:'center' }}>
            <I.alert size={20} color="#e0a44a" />
            <div>
              <div style={{ fontWeight:700, color:'#e0a44a' }}>{t(lang,'buddyTitle')}</div>
              <div style={{ fontSize:12, color:'#7f92a6' }}>Brix dropped to {lastB}° — down from peak of {peak}°. Check clarity and taste.</div>
            </div>
          </div>
        )}

        {/* Sparkline */}
        {brixLog.length >= 2 && (
          <div style={{ marginBottom:14, overflowX:'auto' }}>
            <svg width={Math.max(SW, brixLog.length * 32)} height={SH + 24} style={{ display:'block' }}>
              {/* Grid lines */}
              {[bMin, (bMin+bMax)/2, bMax].map((v,i) => {
                const y = SH - ((v - bMin) / bRange) * (SH - 10) - 2;
                return <g key={i}>
                  <line x1="0" y1={y} x2={Math.max(SW, brixLog.length*32)} y2={y} stroke="#1e2d3d" strokeWidth="1" strokeDasharray="4,4"/>
                  <text x="2" y={y-2} fontSize="12" fill="#7f92a6">{v.toFixed(1)}°</text>
                </g>;
              })}
              {/* Line */}
              <polyline
                fill="none" stroke="#e0a44a" strokeWidth="2.5" strokeLinejoin="round"
                points={brixLog.map((e,i) => {
                  const x = (i / Math.max(brixLog.length-1,1)) * (Math.max(SW, brixLog.length*32) - 20) + 10;
                  const y = SH - ((e.brix - bMin) / bRange) * (SH - 10) - 2;
                  return `${x},${y}`;
                }).join(' ')}
              />
              {/* Dots */}
              {brixLog.map((e,i) => {
                const x = (i / Math.max(brixLog.length-1,1)) * (Math.max(SW, brixLog.length*32) - 20) + 10;
                const y = SH - ((e.brix - bMin) / bRange) * (SH - 10) - 2;
                return <circle key={e.id} cx={x} cy={y} r="4" fill="#e0a44a" stroke="#07090f" strokeWidth="1.5"/>;
              })}
              {/* X axis labels */}
              {brixLog.map((e,i) => {
                if (brixLog.length > 8 && i % Math.ceil(brixLog.length/6) !== 0 && i !== brixLog.length-1) return null;
                const x = (i / Math.max(brixLog.length-1,1)) * (Math.max(SW, brixLog.length*32) - 20) + 10;
                return <text key={'l'+e.id} x={x} y={SH+16} fontSize="12" fill="#7f92a6" textAnchor="middle">{e.date.split('/').slice(0,2).join('/')}</text>;
              })}
            </svg>
          </div>
        )}

        {/* Add reading */}
        <div style={{ display:'flex', gap:8, marginBottom:10 }}>
          <div style={{ width:100 }}><NumInput label={t(lang,'startDate')} value={brixIn} onChange={setBrixIn} min={0.1} max={10} step={0.1} placeholder="°Brix" /></div>
          <input aria-label={t(lang,'note') + ' (' + t(lang,'optional') + ')'} type="text" value={noteIn} onChange={e=>setNoteIn(e.target.value)} placeholder={t(lang,'note') + ' (' + t(lang,'optional') + ')'} style={{ flex:1 }} onKeyDown={e=>e.key==='Enter'&&addBrix()} />
          <button onClick={addBrix} aria-label="Add Brix reading" title="Add Brix reading" className="btn-icon" style={{ background:'#e0a44a' }}><I.check size={18} color="#07090f" /></button>
        </div>

        {brixLog.length === 0 && <div style={{ textAlign:'center', color:'#7f92a6', fontSize:13, padding:'8px 0' }}>No readings yet — log your first brix reading above.</div>}

        {/* Reading list */}
        {brixLog.slice().reverse().map((e,i) => (
          <div key={e.id} className="log-entry">
            <div>
              <span style={{ fontWeight:700, color:'#e0a44a', fontSize:16 }}>{e.brix}°</span>
              {e.note && <span style={{ color:'#7f92a6', fontSize:13 }}> · {e.note}</span>}
              <span style={{ color:'#7f92a6', fontSize:12, marginLeft:8 }}>{e.date}</span>
            </div>
            <button className="delete-btn" aria-label="Delete this Brix reading" title="Delete reading" onClick={()=>setBrixLog(p=>p.filter(x=>x.id!==e.id))}><I.x size={14}/></button>
          </div>
        ))}

        {brixLog.length >= 2 && (
          <div style={{ marginTop:8 }} className="result-box orange">
            <div className="two-col">
              <div><div style={{ fontSize:13, color:'#7f92a6' }}>{t(lang,'peakBrix')}</div><div style={{ fontWeight:700, color:'#e0a44a', fontSize:20 }}>{peak.toFixed(1)}°</div></div>
              <div><div style={{ fontSize:13, color:'#7f92a6' }}>{t(lang,'latestBrix')}</div><div style={{ fontWeight:700, color: buddyWarn?'#e0a44a':'#e0a44a', fontSize:20 }}>{lastB.toFixed(1)}°</div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


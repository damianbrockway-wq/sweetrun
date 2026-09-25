// ─── Sap Freshness Tracker ────────────────────────────────────────────────────
function SapFreshnessTracker() {
  const BASE_F       = 40;    // °F — bacterial growth threshold for maple sap
  const WARN_HU      = 80;    // degree-hours: start warning
  const CRITICAL_HU  = 150;   // degree-hours: boil now or dump risk

  const [startTs,  setStartTs]  = React.useState(() => ls.get('sg_fresh_start', null));
  const [status,   setStatus]   = React.useState(() => ls.get('sg_fresh_status', 'idle')); // idle|tracking|boiled|dumped
  const [hourlyF,  setHourlyF]  = React.useState([]);  // [{ts, temp}]
  const [loading,  setLoading]  = React.useState(false);
  const [locErr,   setLocErr]   = React.useState('');
  const [open,     setOpen]     = React.useState(() => ls.get('sg_fresh_status', 'idle') === 'tracking');

  // Use weather tab location first (sg_wx_lat/lon), fall back to degree-day tab location
  const lat = ls.get('sg_wx_lat', null) ?? ls.get('sg_ddlat', null);
  const lon = ls.get('sg_wx_lon', null) ?? ls.get('sg_ddlon', null);

  // Fetch hourly temps: past 2 days + next 2 days
  const fetchTemps = React.useCallback(async () => {
    if (!lat || !lon) return;
    setLoading(true); setLocErr('');
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&hourly=temperature_2m&temperature_unit=fahrenheit&past_days=2&forecast_days=2&timezone=auto`;
      const d = await fetch(url).then(r => r.json());
      if (!d.hourly) throw new Error('No data');
      const times = d.hourly.time;
      const temps = d.hourly.temperature_2m;
      setHourlyF(times.map((t, i) => ({ ts: new Date(t).getTime(), temp: temps[i] })));
    } catch { setLocErr('Could not load temperature data. Check your location in the Weather tab.'); }
    setLoading(false);
  }, [lat, lon]);

  React.useEffect(() => { if (status === 'tracking') fetchTemps(); }, [status]);

  // ── Heat unit calculation ──────────────────────────────────────────────────
  const now = Date.now();

  // Slice hourly readings from collection start to now (actual recorded temps)
  const pastReadings = hourlyF.filter(h => h.ts >= (startTs||now) && h.ts <= now);
  // Future readings from now to end of forecast
  const futureReadings = hourlyF.filter(h => h.ts > now);

  // Tank temp lags air temp: 2-hour smoothing offset for large tanks
  const smoothTemp = (temp) => Math.max(32, temp - 3); // tank ~3°F cooler than air avg

  const currentHU = pastReadings.reduce((s, h) => s + Math.max(0, smoothTemp(h.temp) - BASE_F), 0);

  // Project forward: when will we hit thresholds?
  let projHU = currentHU;
  let warnEta = null, critEta = null;
  for (const h of futureReadings) {
    projHU += Math.max(0, smoothTemp(h.temp) - BASE_F);
    if (!warnEta && projHU >= WARN_HU)     warnEta = h.ts;
    if (!critEta && projHU >= CRITICAL_HU) critEta = h.ts;
    if (critEta) break;
  }

  // Find next cold window (best boil time = consecutive hours below 45°F)
  let bestBoilStart = null;
  for (let i = 0; i < futureReadings.length - 3; i++) {
    if (futureReadings.slice(i, i+3).every(h => h.temp < 45)) {
      bestBoilStart = futureReadings[i].ts;
      break;
    }
  }

  // Current outdoor temp
  const currentTemp = hourlyF.find(h => Math.abs(h.ts - now) < 1800000)?.temp ?? null;

  // Elapsed time since collection
  const elapsedHrs = startTs ? (now - startTs) / 3_600_000 : 0;

  // Status colour
  const pct = Math.min(100, (currentHU / CRITICAL_HU) * 100);
  const gaugeColor = pct < 40 ? '#3fb950' : pct < 70 ? '#e0a44a' : '#f85149';
  const statusLabel = pct < 40 ? 'Fresh' : pct < 70 ? 'Boil Soon' : 'Boil Now';
  const statusDot   = pct < 40 ? '#3fb950' : pct < 70 ? '#e0a44a' : '#f85149';

  const fmtEta = (ts) => {
    if (!ts) return null;
    const hrs = Math.round((ts - now) / 3_600_000);
    if (hrs <= 0) return 'now';
    if (hrs < 24) return `in ~${hrs}h`;
    return `in ~${Math.round(hrs/24)}d`;
  };

  const startTracking = () => {
    const ts = Date.now();
    ls.set('sg_fresh_start', ts); setStartTs(ts);
    ls.set('sg_fresh_status', 'tracking'); setStatus('tracking');
  };
  const markBoiled = () => { ls.set('sg_fresh_status','boiled'); setStatus('boiled'); };
  const markDumped = () => { ls.set('sg_fresh_status','dumped'); setStatus('dumped'); };
  const reset = () => {
    ls.set('sg_fresh_start', null); setStartTs(null);
    ls.set('sg_fresh_status', 'idle'); setStatus('idle');
    setHourlyF([]);
  };

  // Trigger browser alert at critical threshold
  React.useEffect(() => {
    if (status === 'tracking' && currentHU >= CRITICAL_HU) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SweetRun — Sap Spoilage Alert', {
          body: `Your sap has accumulated ${currentHU.toFixed(0)} heat units. Boil now or risk dumping.`,
          icon: './icon-512.png'
        });
      }
    }
  }, [currentHU, status]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{marginBottom:12}}>
      {/* Header toggle */}
      <button onClick={()=>setOpen(v=>!v)} aria-expanded={open} style={{width:'100%',display:'flex',justifyContent:'space-between',
        alignItems:'center',background:'#0f1720',
        border:'1px solid #1e2d3d',borderRadius:open?'16px 16px 0 0':16,
        padding:'12px 16px',cursor:'pointer',minHeight:60}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <I.flask size={20} color="#7f92a6" />
          <div style={{textAlign:'left'}}>
            <div style={{fontSize:15,fontWeight:700,color:'#e6edf3'}}>Sap Freshness Tracker</div>
            <div style={{fontSize:13,color:'#7f92a6'}}>Degree-hour spoilage predictor</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {status === 'tracking' && (
            <span style={{fontSize:13,fontWeight:700,color:gaugeColor,background:`${gaugeColor}18`,
              border:`1px solid ${gaugeColor}40`,borderRadius:6,padding:'2px 8px',
              display:'inline-flex',alignItems:'center',gap:6}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:statusDot,flexShrink:0}} />
              {statusLabel}
            </span>
          )}
          {open ? <I.chevUp size={16} color="#7f92a6" /> : <I.chevDown size={16} color="#7f92a6" />}
        </div>
      </button>

      {open && (
        <div style={{background:'#0f1720',border:'1px solid #1e2d3d',borderTop:'none',
          borderRadius:'0 0 16px 16px',padding:16}}>

          {/* No location set */}
          {!lat && (
            <div style={{textAlign:'center',padding:'12px 0',color:'#7f92a6',fontSize:13,lineHeight:1.5}}>
              Set your location in the <strong style={{color:'#e6edf3'}}>Weather tab</strong> or <strong style={{color:'#e6edf3'}}>Boil Point tab</strong> first,
              then come back to enable freshness tracking.
            </div>
          )}

          {/* Idle state */}
          {lat && status === 'idle' && (
            <div style={{textAlign:'center',padding:'12px 0'}}>
              <div style={{fontSize:13,color:'#7f92a6',marginBottom:16,lineHeight:1.6}}>
                Start the timer right after you collect sap. SweetRun tracks the cumulative
                heat your sap experiences and tells you when to boil.
              </div>
              <button onClick={startTracking}
                style={{background:'#e0a44a',border:'none',borderRadius:10,padding:'12px 28px',
                  fontWeight:800,fontSize:14,color:'#07090f',cursor:'pointer'}}>
                <I.snowflake size={16} color="#07090f" /> Start Freshness Timer
              </button>
            </div>
          )}

          {/* Done states */}
          {(status === 'boiled' || status === 'dumped') && (
            <div style={{textAlign:'center',padding:'14px 0'}}>
              <div style={{marginBottom:8,display:'flex',justifyContent:'center'}}>{status==='boiled' ? <I.check size={28} color="#3fb950" /> : <I.trash size={26} color="#7f92a6" />}</div>
              <div style={{fontSize:14,fontWeight:700,color: status==='boiled'?'#3fb950':'#f85149',marginBottom:4}}>
                {status==='boiled'?'Marked as Boiled — great work!':'Marked as Dumped'}
              </div>
              <div style={{fontSize:12,color:'#7f92a6',marginBottom:16}}>
                Accumulated {currentHU.toFixed(0)} heat units over {elapsedHrs.toFixed(1)} hours.
              </div>
              <button onClick={reset}
                style={{background:'transparent',border:'1px solid #1e2d3d',borderRadius:8,
                  padding:'8px 18px',fontSize:12,color:'#7f92a6',cursor:'pointer'}}>
                Start New Batch
              </button>
            </div>
          )}

          {/* Tracking state */}
          {status === 'tracking' && (
            <>
              {loading && (
                <div style={{textAlign:'center',padding:'12px 0',fontSize:12,color:'#7f92a6'}}>
                  Loading temperature data…
                </div>
              )}
              {locErr && (
                <div style={{background:'rgba(248,81,73,0.08)',border:'1px solid rgba(248,81,73,0.2)',
                  borderRadius:8,padding:'10px 12px',fontSize:12,color:'#f85149',marginBottom:12}}>
                  {locErr}
                </div>
              )}
              {!loading && !locErr && hourlyF.length > 0 && (
                <>
                  {/* Gauge */}
                  <div style={{marginBottom:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                      <span style={{fontSize:13,fontWeight:700,color:gaugeColor,display:'inline-flex',alignItems:'center',gap:6}}>
                        <span style={{width:7,height:7,borderRadius:'50%',background:statusDot,flexShrink:0}} />{statusLabel}</span>
                      <span style={{fontSize:12,color:'#7f92a6'}}>
                        {currentHU.toFixed(0)} / {CRITICAL_HU} heat units
                      </span>
                    </div>
                    <div style={{height:10,background:'#131e2c',borderRadius:5,overflow:'hidden',position:'relative'}}>
                      <div style={{height:'100%',width:`${pct}%`,borderRadius:5,
                        background:`linear-gradient(90deg, #3fb950, ${gaugeColor})`,
                        transition:'width 0.5s ease'}}/>
                      {/* Warn marker */}
                      <div style={{position:'absolute',left:`${(WARN_HU/CRITICAL_HU)*100}%`,
                        top:0,bottom:0,width:2,background:'rgba(255,255,255,0.3)'}}/>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontSize:12,color:'#7f92a6'}}>
                      <span>Fresh</span><span>Warn</span><span>Critical</span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
                    {[
                      ['Elapsed',    elapsedHrs < 24 ? `${elapsedHrs.toFixed(1)}h` : `${(elapsedHrs/24).toFixed(1)}d`, '#58a6ff'],
                      ['Outdoor',    currentTemp != null ? `${currentTemp.toFixed(0)}°F` : '—', currentTemp > 50 ? '#f85149' : currentTemp > 40 ? '#e0a44a' : '#3fb950'],
                      ['Heat Units', currentHU.toFixed(0), gaugeColor],
                    ].map(([lbl,val,clr])=>(
                      <div key={lbl} style={{background:'#0d1a2b',borderRadius:8,padding:'10px 8px',textAlign:'center'}}>
                        <div style={{fontSize:18,fontWeight:800,color:clr,lineHeight:1}}>{val}</div>
                        <div style={{fontSize:12,color:'#7f92a6',marginTop:3}}>{lbl}</div>
                      </div>
                    ))}
                  </div>

                  {/* Predictions */}
                  <div style={{background:'#0d1a2b',borderRadius:10,padding:'12px 14px',marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#e0a44a',textTransform:'uppercase',
                      letterSpacing:'0.08em',marginBottom:10}}>Forecast</div>
                    {currentHU < WARN_HU && warnEta && (
                      <div style={{display:'flex',justifyContent:'space-between',
                        fontSize:12,color:'#c9d1d9',marginBottom:6}}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:6}}><I.zap size={13} color="#e0a44a" /> Boil-soon threshold</span>
                        <span style={{color:'#e0a44a',fontWeight:700}}>{fmtEta(warnEta)}</span>
                      </div>
                    )}
                    {critEta && (
                      <div style={{display:'flex',justifyContent:'space-between',
                        fontSize:12,color:'#c9d1d9',marginBottom:6}}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:6}}><I.alert size={13} color="#f85149" /> Critical — boil or dump</span>
                        <span style={{color:'#f85149',fontWeight:700}}>{fmtEta(critEta)}</span>
                      </div>
                    )}
                    {!critEta && !warnEta && (
                      <div style={{fontSize:12,color:'#3fb950'}}>
                        ✓ Temps look cold — no spoilage risk in the next 48 hours.
                      </div>
                    )}
                    {bestBoilStart && (
                      <div style={{display:'flex',justifyContent:'space-between',
                        fontSize:12,color:'#c9d1d9',marginTop:6,paddingTop:6,borderTop:'1px solid #1e2d3d'}}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:6}}><I.snowflake size={13} color="#58a6ff" /> Best boil window</span>
                        <span style={{color:'#58a6ff',fontWeight:700}}>{fmtEta(bestBoilStart)}</span>
                      </div>
                    )}
                  </div>

                  {/* Critical alert */}
                  {currentHU >= CRITICAL_HU && (
                    <div style={{background:'rgba(248,81,73,0.1)',border:'1px solid rgba(248,81,73,0.35)',
                      borderRadius:10,padding:'12px 14px',marginBottom:14,textAlign:'center'}}>
                      <div style={{fontSize:14,fontWeight:800,color:'#f85149',marginBottom:4}}>
                        <I.alert size={16} color="#f85149" /> Boil Now or Dump
                      </div>
                      <div style={{fontSize:12,color:'#c9d1d9',lineHeight:1.5}}>
                        Your sap has accumulated {currentHU.toFixed(0)} degree-hours of heat stress.
                        Quality is at serious risk.
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                    <button onClick={fetchTemps}
                      style={{padding:'10px 8px',borderRadius:9,border:'1px solid #1e2d3d',
                        background:'transparent',color:'#7f92a6',fontSize:12,cursor:'pointer',fontWeight:600}}>
                      ↻ Refresh
                    </button>
                    <button onClick={markBoiled}
                      style={{padding:'10px 8px',borderRadius:9,border:'none',
                        background:'#3fb950',color:'#07090f',fontSize:12,cursor:'pointer',fontWeight:700}}>
                      ✓ Boiled
                    </button>
                    <button onClick={markDumped}
                      style={{padding:'10px 8px',borderRadius:9,border:'1px solid #f85149',
                        background:'transparent',color:'#f85149',fontSize:12,cursor:'pointer',fontWeight:600}}>
                      <I.trash size={15} color="#7f92a6" /> Dumped
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}


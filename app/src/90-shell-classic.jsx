function App() {
  // The app used to open on Sap every time, whatever you were doing yesterday.
  const [tab,      setTab]      = useState(() => ls.get('sg_last_tab', 'today'));
  useEffect(() => { ls.set('sg_last_tab', tab); }, [tab]);
  const [writeFail, setWriteFail] = useState(null);
  useEffect(() => {
    const h = () => setWriteFail(SR_WRITE_FAIL);
    window.addEventListener('sr-write-fail', h);
    return () => window.removeEventListener('sr-write-fail', h);
  }, []);
  const [units,    setUnits]    = useState(()=>ls.get('sg_units','GAL'));
  const [season,   setSeason]   = useState(()=>ls.get('sg_season',new Date().getFullYear()));
  const [sapBrix,  setSapBrix]  = useState(()=>ls.get('sg_brix',2));
  const [trees,    setTrees]    = useState(()=>ls.get('sg_trees',50));
  const [waterBP,  setWaterBP]  = useState(()=>ls.get('sg_bp',212));
  const [evapRate, setEvapRate] = useState(12);
  const [fuelType, setFuelType] = useState(()=>{
    const FIX = { 'Oil (gal)':'Oil (gallon)', 'Propane (gal)':'Propane (gallon)' };
    const f = ls.get('sg_fuel','Firewood (cord)');
    if (FIX[f]) { ls.set('sg_fuel', FIX[f]); return FIX[f]; }
    return f;
  });
  const [fuelCost, setFuelCost] = useState(()=>ls.get('sg_fuelcost',300));
  const [onboard,  setOnboard]  = useState(()=>ls.get('sg_onboarded',false)===false);
  const [showWizard, setShowWizard] = useState(false);
  const [notifLat, setNotifLat] = useState(() => ls.get('sg_ddlat', null));
  const [notifLon, setNotifLon] = useState(() => ls.get('sg_ddlon', null));
  const [notifBanner, setNotifBanner] = useState(null);
  const [lang,      setLang]      = useState(()=>ls.get('sg_lang','en'));
  const [showBackup, setShowBackup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLicense, setShowLicense] = useState(false);
  const [lic, setLic] = useState({ status: 'checking' });

  // Ask the browser to protect localStorage from eviction (Safari 7-day ITP, etc.)
  useEffect(() => {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});
  }, []);

  // ── License / Season Trial check ──
  useEffect(() => {
    (async () => {
      const sessions = (ls.get('sg_sessions', 0) || 0) + 1;
      try { localStorage.setItem('sg_sessions', JSON.stringify(sessions)); } catch {}
      const tok = ls.get('sg_license', null);
      if (tok) {
        const p = await verifyLicense(tok);
        if (p && !p.expired) { SR_LOCKED = false; _srClear(); setLic({ status: 'licensed', until: p.x }); return; }
      }
      const t = trialStatus();
      if (t.expired) {
        SR_LOCKED = true;
        setLic({ status: 'expired' });
      } else {
        setLic({ status: 'trial', daysLeft: t.daysLeft });
        if (!ls.get('sg_trial_pinged', false)) pingEvent('trial_start').then(() => ls.set('sg_trial_pinged', true)).catch(() => {});
        if (sessions >= 2 && ls.get('sg_onboarded', false) && !ls.get('sg_email_prompted', false)) setShowLicense(true);
      }
    })();
  }, []);

  useEffect(()=>{ ls.set('sg_units',units);       },[units]);
  useEffect(()=>{ ls.set('sg_season',season);     },[season]);
  useEffect(()=>{ ls.set('sg_brix',sapBrix);      },[sapBrix]);
  useEffect(()=>{ ls.set('sg_trees',trees);       },[trees]);
  useEffect(()=>{ ls.set('sg_bp',waterBP);        },[waterBP]);
  useEffect(()=>{ ls.set('sg_fuel',fuelType);     },[fuelType]);
  useEffect(()=>{ ls.set('sg_fuelcost',fuelCost); },[fuelCost]);
  useEffect(()=>{ ls.set('sg_lang',lang);       },[lang]);

  // ── Run condition check on app load (once per day) ──────────
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (ls.get('sg_notif_checked','') === today) return;
    const lat = ls.get('sg_ddlat', null);
    const lon = ls.get('sg_ddlon', null);
    if (!lat || !lon) return;
    ls.set('sg_notif_checked', today);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&forecast_days=3&timezone=auto`)
      .then(r => r.json())
      .then(d => {
        if (!d.daily) return;
        for (let i = 1; i <= 2; i++) {
          const hi = Math.round(d.daily.temperature_2m_max[i]);
          const lo = Math.round(d.daily.temperature_2m_min[i]);
          const ideal = hi >= 40 && lo <= 28;
          if (ideal) {
            const day = i === 1 ? 'tomorrow' : 'in 2 days';
            const msg = `Ideal sap run ${day} — high ${hi}°F, low ${lo}°F`;
            setNotifBanner(msg);
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('SweetRun — Sap Run Alert', { body: msg, icon: './icon-512.png' });
            }
            break;
          }
        }
      }).catch(() => {});
  }, []);

  // Sixteen tabs in one scrolling strip measured 1,032px inside a 362px box: six
  // fit, the active one was never scrolled into view, and the app always opened
  // on Sap. Five destinations along the bottom instead, each holding the screens
  // that belong together. Nothing was removed — every old tab still has a home.
  const DESTS = [
    { id:'today', Icon:I.sun,        label:'Today',
      tabs:[ { id:'today', Icon:I.sun, label:'Today' } ] },
    { id:'record', Icon:I.clipboard, label:'Log',
      tabs:[ { id:'log',    Icon:I.clipboard, label:t(lang,'tabLog')  },
             { id:'season', Icon:I.calendar,  label:t(lang,'tabSeason') },
             { id:'recap',  Icon:I.trendUp,   label:'Recap'           },
             ...(BETA_FEATURES ? [{ id:'diagnose', Icon:I.flask, label:'Diagnose' }] : []) ] },
    { id:'bush', Icon:I.mapPin,      label:'Bush',
      tabs:[ ...(BETA_FEATURES ? [{ id:'lines', Icon:I.mapPin, label:'Map' }] : []),
             { id:'tapping', Icon:I.tree,    label:t(lang,'tabTapping') },
             { id:'tubing',  Icon:I.network, label:'Tubing'  } ] },
    { id:'boil', Icon:I.calculator,  label:'Numbers',
      tabs:[ { id:'sap',    Icon:I.droplet,     label:t(lang,'tabSap')    },
             { id:'evap',   Icon:I.flame,       label:t(lang,'tabEvap')   },
             { id:'boilday',Icon:I.flame,       label:t(lang,'tabBoilDay') },
             { id:'ro',     Icon:I.filter,      label:t(lang,'tabRO')     },
             { id:'finish', Icon:I.thermometer, label:t(lang,'tabFinish') },
             { id:'boilpt', Icon:I.mountain,    label:t(lang,'tabBoilPt') } ] },
    { id:'shed', Icon:I.wrench,      label:'Shed',
      tabs:[ { id:'weather',   Icon:I.cloudSun,  label:'Weather' },
             { id:'tasks',     Icon:I.check,     label:t(lang,'tabTasks') },
             { id:'equip',     Icon:I.wrench,    label:t(lang,'tabEquip') },
             { id:'sugarsage', Icon:I.brain,     label:'SugarSage' } ] },
  ];
  const destOf = id => (DESTS.find(d => d.tabs.some(x => x.id === id)) || DESTS[0]).id;
  const dest   = destOf(tab);
  const subTabs = (DESTS.find(d => d.id === dest) || DESTS[0]).tabs;
  // Landing on a destination opens the screen you were last on inside it.
  const lastInDest = React.useRef({});
  const goDest = d => {
    const grp = DESTS.find(x => x.id === d) || DESTS[0];
    setTab(lastInDest.current[d] || grp.tabs[0].id);
  };
  React.useEffect(() => { lastInDest.current[dest] = tab; }, [tab, dest]);

  // Recap's ratio-check card sends the sugarmaker straight to the entry list,
  // which is the only place the offending row can actually be fixed.
  React.useEffect(() => {
    const h = () => setTab('log');
    window.addEventListener('sr-goto-entries', h);
    return () => window.removeEventListener('sr-goto-entries', h);
  }, []);

  return (
    <div className="app-wrap" style={{ maxWidth:540, margin:'0 auto' }}>
      {/* ── Header / Desktop Sidebar ── */}
      <div className="app-header" style={{ background:'#07090f', borderBottom:'1px solid #131e2c', padding:'calc(14px + env(safe-area-inset-top, 0px)) 16px 0', position:'sticky', top:0, zIndex:100 }}>
        {/* One row. The mark, the name, what the licence is doing, and a gear.
            Everything that used to sit here in four pill groups is behind it,
            because 250px of chrome on an 844px phone is a quarter of the screen. */}
        <div className="app-header-top" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            <div style={{ width:36, height:36, background:'#0f2a22', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <I.mapleLeaf size={19} color="#2dd4a7" />
            </div>
            <div style={{ fontWeight:800, fontSize:18, letterSpacing:'-0.4px', whiteSpace:'nowrap' }}>SweetRun</div>
          </div>
          <div className="app-header-controls" style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
            {lic.status !== 'checking' && (
              <button onClick={()=>setShowLicense(true)} className="hit44" style={{
                background: lic.status==='licensed' ? 'rgba(63,185,80,0.12)' : lic.status==='expired' ? 'rgba(248,81,73,0.12)' : '#0f1720',
                border: '1px solid #1e2d3d',
                borderRadius:18, padding:'0 12px', height:36, display:'flex', alignItems:'center', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', position:'relative',
                color: lic.status==='licensed' ? '#3fb950' : lic.status==='expired' ? '#f85149' : '#7f92a6' }}>
                {lic.status==='licensed' ? '✓ Pass' : lic.status==='expired' ? 'Unlock' : `Trial · ${lic.daysLeft}d left`}
              </button>
            )}
            <button onClick={()=>setShowSettings(true)} aria-label="Settings and data" title="Settings"
              style={{ background:'none', border:'none', borderRadius:10, margin:'0 -8px 0 -2px',
                width:44, height:44, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <I.settings size={20} color="#7f92a6" />
            </button>
          </div>
        </div>
        {/* ── Desktop sidebar nav (≥1024px only; display:none below — mobile keeps
            the bottom bar + horizontal sub-tab strip exactly as they were).
            All five destinations exist in the DOM here, with the active
            destination's sub-screens nested beneath it, and a persistent
            Log-a-run pinned at the sidebar's foot. Stroke icons, not marks:
            at 20px the hand-cut marks are below their 32px floor (BIBLE). */}
        <nav className="side-nav" aria-label="Main sections">
          {DESTS.map(d => {
            const on = dest === d.id;
            return (
              <div key={d.id}>
                <button onClick={() => goDest(d.id)}
                  aria-label={d.label} aria-current={on ? 'page' : undefined}
                  className={`side-dest${on ? ' active' : ''}`}>
                  <d.Icon size={20} color={on ? '#2dd4a7' : '#7f92a6'} />
                  <span>{d.label}</span>
                </button>
                {on && d.tabs.length > 1 && (
                  <div className="side-subs" aria-label={`Screens in ${d.label}`}>
                    {d.tabs.map(s => (
                      <button key={s.id} aria-current={tab === s.id ? 'true' : undefined}
                        className={`side-sub${tab === s.id ? ' active' : ''}`} onClick={() => setTab(s.id)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <button className="side-log" onClick={() => {
            setTab('log');
            // Let LogTab mount, then ask it to open the entry sheet.
            setTimeout(() => window.dispatchEvent(new Event('sr-log-a-run')), 150);
          }}>
            <I.plus size={18} color="#07090f" /> {lang==='fr' ? 'Noter une coulée' : 'Log a run'}
          </button>
        </nav>
        {/* Scrollable nav (horizontal on mobile/tablet, vertical on desktop) */}
        {/* Screens inside the destination you are in. One screen, no row. */}
        {subTabs.length > 1 && (
          <div className="tab-bar-wrap">
            <div className="tab-bar" role="tablist" aria-label="Screens in this section">
              {subTabs.map(t => (
                <button key={t.id} role="tab" aria-selected={tab===t.id}
                  className={`tab-btn${tab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {subTabs.length <= 1 && <div style={{ height:6 }} />}
      </div>

      {/* ── Five destinations, fixed to the bottom where a thumb reaches ── */}
      <nav className="bottom-nav" aria-label="Main sections">
        {DESTS.map(d => {
          const on = dest === d.id;
          return (
            <button key={d.id} onClick={() => goDest(d.id)}
              aria-label={d.label} aria-current={on ? 'page' : undefined}
              className={`bnav-btn${on ? ' active' : ''}`}>
              <d.Icon size={21} color={on ? '#2dd4a7' : '#7f92a6'} />
              <span>{d.label}</span>
            </button>
          );
        })}
      </nav>

      {showSettings && <SettingsSheet units={units} setUnits={setUnits} lang={lang} setLang={setLang}
        season={season} setSeason={setSeason} onWizard={()=>setShowWizard(true)}
        onBackup={()=>setShowBackup(true)} onClose={()=>setShowSettings(false)} />}
      {showBackup && <BackupModal onClose={()=>setShowBackup(false)} />}
      {showLicense && <LicenseModal lic={lic} onClose={()=>setShowLicense(false)}
        onLicenseSaved={p=>setLic({ status:'licensed', until:p.x })} />}

      {/* ── Main area (banner + content) ── */}
      <div className="app-main" style={{ minWidth:0, flex:1 }}>
        {/* ── Season Setup Banner (shown when trees unconfigured) ── */}
        {!ls.get('sg_wizard_done', false) && parseInt(trees) === 0 && !onboard && !showWizard && (
          <div style={{ background:'linear-gradient(135deg,#071a0e,#0d2b15)', border:'1px solid #2d6a4f',
            borderRadius:0, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#3fb950', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:2 }}>
                <I.tree size={16} color="#2dd4a7" /> First Season?
              </div>
              <div style={{ fontSize:13, color:'#7f92a6' }}>Get a personalized season plan in 2 minutes.</div>
            </div>
            <button onClick={()=>setShowWizard(true)}
              style={{ background:'#3fb950', border:'none', borderRadius:10, padding:'9px 16px',
                fontWeight:700, fontSize:12, color:'#07090f', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
              Set Up Season →
            </button>
          </div>
        )}

        {/* ── Trial-expired banner ── */}
        {lic.status === 'expired' && (
          <div style={{ background:'#1f0e0c', border:'1px solid #4a1e1a', padding:'11px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:13, color:'#e0a44a', lineHeight:1.45 }}>Season Trial ended — your data is safe and export works, but new entries aren't saved.</span>
            <button onClick={()=>setShowLicense(true)} style={{ background:'#e0a44a', border:'none', borderRadius:10, padding:'8px 14px', fontWeight:800, fontSize:12.5, color:'#07090f', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>Get a Pass</button>
          </div>
        )}

        {/* ── Sap Run Alert Banner ── */}
        {notifBanner && (
          <div style={{ background:'#081e0e', border:'1px solid #1a4a25', borderRadius:0, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, color:'#3fb950', fontWeight:600 }}>{notifBanner}</span>
            <button onClick={()=>setNotifBanner(null)} style={{ background:'none', border:'none', color:'#7f92a6', cursor:'pointer', padding:'0 4px' }}><I.x size={14}/></button>
          </div>
        )}

        {/* ── Write-failure bar ── */}
        {writeFail && (
          <div role="alert" style={{ background:'#7f1d1d', color:'#fff', padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:13, fontWeight:700, lineHeight:1.45 }}>
              {writeFail === 'locked'
                ? 'That entry was not saved. Your Season Trial has ended. Enter a pass key to keep logging.'
                : 'That entry was not saved. Phone storage is full. Export a backup from Data and Backup, then clear an old season.'}
            </span>
            <button onClick={()=>setWriteFail(null)} style={{ background:'none', border:'none', color:'#fca5a5', cursor:'pointer', padding:'0 4px', flexShrink:0 }} aria-label="Dismiss"><I.x size={14}/></button>
          </div>
        )}

        {/* ── Content ── */}
        <div className="tab-content">
          {(onboard || showWizard) && (
            <FirstSeasonWizard
              onClose={()=>{ ls.set('sg_onboarded', true); setOnboard(false); setShowWizard(false); }}
              onComplete={data=>{
                if(data.trees > 0) { setTrees(data.trees); ls.set('sg_trees', data.trees); }
                if(data.fuelType) { setFuelType(data.fuelType); ls.set('sg_fuel', data.fuelType); }
                // data.fuelCost is a whole-season total; Break-Even reads it from sg_wizard_data.
                // Evap's per-unit price (sg_fuelcost) is set on the Evap tab, never from here.
                setOnboard(false); setShowWizard(false);
              }}
            />
          )}
          {tab==='today'   && <TodayTab   lang={lang} units={units} season={season} trees={trees} sapBrix={sapBrix} go={setTab} />}
          {tab==='sap'     && <SapTab     sapBrix={sapBrix} setSapBrix={setSapBrix} trees={trees} units={units} lang={lang} />}
          {tab==='evap'    && <EvapTab    sapBrix={sapBrix} setSapBrix={setSapBrix} units={units} setEvapRate={setEvapRate} fuelType={fuelType} setFuelType={setFuelType} fuelCost={fuelCost} setFuelCost={setFuelCost} season={season} trees={trees} lang={lang} />}
          {tab==='ro'      && <ROTab      sapBrix={sapBrix} setSapBrix={setSapBrix} evapRate={evapRate} fuelType={fuelType} fuelCost={fuelCost} units={units} lang={lang} />}
          {tab==='finish'  && <FinishTab  waterBP={waterBP} setWaterBP={setWaterBP} lang={lang} />}
          {tab==='tapping' && <TappingTab sapBrix={sapBrix} trees={trees} setTrees={setTrees} units={units} lang={lang} />}
          {tab==='boilpt'  && <BoilPtTab  waterBP={waterBP} setWaterBP={setWaterBP} lang={lang} />}
          {tab==='boilday' && <BoilDayTab units={units} season={season} sapBrix={sapBrix} waterBP={waterBP} lang={lang} go={setTab} />}
          {tab==='season'  && <SeasonTab  season={season} lang={lang} />}
          {tab==='recap'   && <RecapTab   season={season} units={units} sapBrix={sapBrix} trees={trees} lang={lang} />}
          {tab==='tubing'    && <TubingTab trees={trees} />}
          {tab==='sugarsage' && <SugarSageTab season={season} sapBrix={sapBrix} trees={trees} units={units} />}
          {tab==='log'     && <LogTab     season={season} setSeason={setSeason} trees={trees} setTrees={setTrees} units={units} sapBrix={sapBrix} lang={lang} />}
          {tab==='equip'   && <EquipTab lang={lang} />}
          {tab==='tasks'   && <TasksTab   season={season} lang={lang} />}
          {tab==='weather' && <WeatherTab lang={lang} trees={trees} units={units} />}
          {BETA_FEATURES && tab==='lines'    && <LinesTab lang={lang} />}
          {BETA_FEATURES && tab==='diagnose' && <DiagnoseTab season={season} trees={trees} units={units} sapBrix={sapBrix} lang={lang} />}

          {/* ── Notification enable prompt ── */}
          {'Notification' in window && Notification.permission === 'default' && ls.get('sg_ddlat',null) && (
            <div style={{ background:'#0d1a2b', border:'1px solid #1e2d3d', borderRadius:12, padding:'14px 16px', marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:'#58a6ff' }}>{t(lang,'runAlertTitle')}</div>
                <div style={{ fontSize:12, color:'#7f92a6', marginTop:2 }}>{t(lang,'runAlertDesc')}</div>
              </div>
              <button onClick={()=>Notification.requestPermission()} style={{ background:'#58a6ff', border:'none', borderRadius:10, padding:'8px 14px', fontWeight:600, fontSize:13, color:'#07090f', flexShrink:0, marginLeft:12 }}>{t(lang,'enable')}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

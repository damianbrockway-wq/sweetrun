// ─── Run Sheet core state ─────────────────────────────────────────────────────
// The app state the screens need as props, plus the license/trial boot, the
// write-fail listener and the once-a-day sap-run check. Carried over line for
// line from the pre-cutover App() (removed at cutover), so the boot sequence,
// storage keys and trial rules are unchanged.
//
// Differences from the old App(), all deliberate:
//   - no sg_last_tab (routes are URL hashes; the key is left as stored)
//   - adds firstName (sg_first_name, a preference key) for the greeting
function useSrCore() {
  const [writeFail, setWriteFail] = useState(null);
  useEffect(() => {
    const h = () => setWriteFail(SR_WRITE_FAIL);
    window.addEventListener('sr-write-fail', h);
    return () => window.removeEventListener('sr-write-fail', h);
  }, []);
  const [units,    setUnits]    = useState(()=>ls.get('sg_units','GAL'));
  // The season follows the date (srSeasonOf: Jul to Dec belong to the coming season), so opening
  // the app in a new year never files sap into last season. Picking another season in Log history
  // or Settings lasts until the next start.
  const [season,   setSeason]   = useState(()=>srSeasonOf(srToday()) || ls.get('sg_season',new Date().getFullYear()));
  const [sapBrix,  setSapBrix]  = useState(()=>ls.get('sg_brix',2));
  const [trees,    setTrees]    = useState(()=>ls.get('sg_trees',50));
  const [waterBP,  setWaterBP]  = useState(()=>ls.get('sg_bp',212));
  // One evaporator rate for every screen (selEvap: the rate he typed, else his pan, else the setup's pan).
  const evapRate = selEvap().rate;
  const setEvapRate = r => { if (parseFloat(r) > 0) ls.set('sg_pan_rate', parseFloat(r)); else ls.set('sg_pan_rate', ''); srDataChanged(); };
  const [fuelType, setFuelTypeS] = useState(()=>{
    const FIX = { 'Oil (gal)':'Oil (gallon)', 'Propane (gal)':'Propane (gallon)' };
    const f = ls.get('sg_fuel','Firewood (cord)');
    if (FIX[f]) { ls.set('sg_fuel', FIX[f]); return FIX[f]; }
    return f;
  });
  // The price of his fuel (srFuelCostOf): a stored 300 left over from the old start-up write is not
  // read as $300 a gallon of oil. Written only when he changes it.
  const [fuelCost, setFuelCostS] = useState(()=>selFuel().cost);
  const setFuelCost = v => { setFuelCostS(v); if (v !== '' && v != null) ls.set('sg_fuelcost', v); };
  // A new fuel brings its own unit price: a price per cord never carries over as a price per gallon of oil.
  const setFuelType = f => {
    if (f !== fuelType) setFuelCost(srFuelDefaultCost(f));
    setFuelTypeS(f);
  };
  const [onboard,  setOnboard]  = useState(()=>ls.get('sg_onboarded',false)===false);
  const [showWizard, setShowWizard] = useState(false);
  const [notifBanner, setNotifBanner] = useState(null);
  const [lang,      setLang]      = useState(()=>ls.get('sg_lang','en'));
  const [showBackup, setShowBackup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLicense, setShowLicense] = useState(false);
  const [lic, setLic] = useState({ status: 'checking' });
  const [firstName, setFirstNameState] = useState(() => ls.get('sg_first_name', ''));
  const setFirstName = v => { setFirstNameState(v); ls.set('sg_first_name', v); };

  // Ask the browser to protect localStorage from eviction (Safari 7-day ITP, etc.)
  useEffect(() => {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});
  }, []);

  // ── License / Season Trial check (same sequence as App) ──
  useEffect(() => {
    (async () => {
      const sessions = (ls.get('sg_sessions', 0) || 0) + 1;
      try { localStorage.setItem('sg_sessions', JSON.stringify(sessions)); } catch {}
      const tok = ls.get('sg_license', null);
      let cantCheck = false;
      if (tok) {
        const p = await verifyLicense(tok);
        if (p && !p.unverifiable && !p.expired) { SR_LOCKED = false; _srClear(); setLic({ status: 'licensed', until: p.x }); return; }
        if (p && p.unverifiable) cantCheck = true;   // this browser cannot check the key: never taken on trust
      }
      const t = trialStatus();
      if (t.expired) {
        SR_LOCKED = true;
        setLic({ status: 'expired', cantCheck });
      } else {
        setLic({ status: 'trial', daysLeft: t.daysLeft, cantCheck });
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
  SR_NUM_LOC = lang === 'fr' ? 'fr-CA' : 'en-US';
  RS_LANG = lang;   // before any child formats a number this render
  useEffect(()=>{ ls.set('sg_lang',lang); try { document.documentElement.lang = lang === 'fr' ? 'fr-CA' : 'en'; } catch {} },[lang]);

  // ── Run condition check on app load (once per day), as in App ──
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
            const msg = `Ideal sap run ${day}: high ${hi}°F, low ${lo}°F`;
            setNotifBanner(msg);
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('SweetRun: sap run alert', { body: msg, icon: '/app/icons/icon-e-192.png' });
            }
            break;
          }
        }
      }).catch(() => {});
  }, []);

  return {
    writeFail, setWriteFail, units, setUnits, season, setSeason, sapBrix, setSapBrix, trees, setTrees,
    waterBP, setWaterBP, evapRate, setEvapRate, fuelType, setFuelType, fuelCost, setFuelCost,
    onboard, setOnboard, showWizard, setShowWizard, notifBanner, setNotifBanner, lang, setLang,
    showBackup, setShowBackup, showSettings, setShowSettings, showLicense, setShowLicense, lic, setLic,
    firstName, setFirstName,
  };
}

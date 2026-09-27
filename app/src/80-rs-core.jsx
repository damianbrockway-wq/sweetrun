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

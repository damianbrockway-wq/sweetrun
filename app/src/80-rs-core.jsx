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
    // Fix pass 2 (re-run): a refused write is news on the screen it happened on. Moving to
    // another screen clears a lock or trial refusal (the lock banner states the standing
    // condition); a full-storage refusal stays until dismissed, since it can recur silently.
    const nav = () => { if (SR_WRITE_FAIL && SR_WRITE_FAIL !== 'quota') { SR_WRITE_FAIL = null; setWriteFail(null); } };
    window.addEventListener('hashchange', nav);
    return () => { window.removeEventListener('sr-write-fail', h); window.removeEventListener('hashchange', nav); };
  }, []);
  // Fix pass 2 (item 34): a first open on a French phone starts in litres (the setup's first step can change it).
  const [units,    setUnits]    = useState(()=>ls.get('sg_units', null) || (!ls.get('sg_onboarded', false) && /^fr\b/i.test((navigator.languages && navigator.languages[0]) || navigator.language || '') ? 'L' : 'GAL'));
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
  // Fix pass 2 (item 34): a first open follows the device language (fr-CA gets French).
  const [lang,      setLang]      = useState(()=>ls.get('sg_lang', null) || (/^fr\b/i.test((navigator.languages && navigator.languages[0]) || navigator.language || '') ? 'fr' : 'en'));
  // Fix pass 2 (item 33): °C, km/h and cm, or °F, mph and inches (sg_measure, a preference).
  // Unset, metric follows litres or French (srMetricOf).
  const [measure, setMeasureS] = useState(()=>{ const m = ls.get('sg_measure', null); return m === 'metric' || m === 'us' ? m : null; });
  const setMeasure = m => { setMeasureS(m); ls.set('sg_measure', m); srDataChanged(); };
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
        if (p && !p.unverifiable && !p.expired) { SR_LOCKED = false; SR_TRIAL_GATE = null; _srClear(); setLic({ status: 'licensed', until: p.x }); return; }
        if (p && p.unverifiable) cantCheck = true;   // this browser cannot check the key: never taken on trust
      }
      const t = trialStatus();
      SR_LOCKED = t.expired;
      SR_TRIAL_GATE = srTrialGate;
      setLic({ status: t.expired ? 'expired' : 'trial', daysLeft: t.daysLeft, trial: t, cantCheck });
      if (!t.expired && !ls.get('sg_trial_pinged', false)) pingEvent('trial_start').then(() => ls.set('sg_trial_pinged', true)).catch(() => {});
      // Fix pass 2 (P2): the Pass sheet no longer opens by itself on the second launch.
    })();
  }, []);
  // Fix pass 2 (item 23): the trial is re-read after every write, another tab's write, a refused
  // write and once a minute, so the chip, the warning and the lock follow the day as it turns.
  useEffect(() => {
    // Only while a trial runs (the gate is set): a Season Pass clears the gate first, so nothing
    // here can lock a session that has just been licensed.
    const re = () => {
      if (!SR_TRIAL_GATE) return;
      const t = trialStatus();
      SR_LOCKED = t.expired;
      setLic(l => {
        if (l.status !== 'trial' && l.status !== 'expired') return l;
        const n = { ...l, status: t.expired ? 'expired' : 'trial', daysLeft: t.daysLeft, trial: t };
        return JSON.stringify(n) === JSON.stringify(l) ? l : n;
      });
    };
    const evs = [SR_DATA_EVENT, 'storage', 'sr-lic', 'sr-write-fail'];
    evs.forEach(e => window.addEventListener(e, re));
    const id = setInterval(re, 60000);
    return () => { evs.forEach(e => window.removeEventListener(e, re)); clearInterval(id); };
  }, []);

  useEffect(()=>{ ls.set('sg_units',units);       },[units]);
  useEffect(()=>{ ls.set('sg_season',season);     },[season]);
  useEffect(()=>{ ls.set('sg_brix',sapBrix);      },[sapBrix]);
  useEffect(()=>{ ls.set('sg_trees',trees);       },[trees]);
  useEffect(()=>{ ls.set('sg_bp',waterBP);        },[waterBP]);
  useEffect(()=>{ ls.set('sg_fuel',fuelType);     },[fuelType]);
  SR_NUM_LOC = lang === 'fr' ? 'fr-CA' : 'en-US';
  RS_LANG = lang;   // before any child formats a number this render
  SR_MEASURE = measure; SR_UNITS = units;
  // What a bucket or gravity producer sees (item 35): a few words change, nothing he entered hides.
  const profile = useSrProfile();
  RS_ALIAS = srAliasFor(profile);
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
            // Fix pass 2 (item 33): in his language and his temperature unit.
            const L0 = ls.get('sg_lang', 'en') === 'fr' ? 'fr' : 'en';
            const msg = rt(L0, i === 1 ? 'runAlertMsg1' : 'runAlertMsg2', { hi: srTempTxt(hi), lo: srTempTxt(lo) });
            setNotifBanner(msg);
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(rt(ls.get('sg_lang', 'en') === 'fr' ? 'fr' : 'en', 'runAlertNT'), { body: msg, icon: '/app/icons/icon-e-192.png' });
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
    firstName, setFirstName, measure, setMeasure, metric: srMetricOf(measure, units, lang), profile,
  };
}

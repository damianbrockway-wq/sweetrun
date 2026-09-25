// ─── localStorage helpers ────────────────────────────────────────────────────
let SR_LOCKED = false; // set true when trial expired & unlicensed — soft edit-lock
const SR_LOCK_ALLOW = ['sg_license','sg_trial_start','sg_trial_pinged','sg_email_prompted','sg_sessions','sg_lang','sg_units'];
// Preference / UI-state keys keep persisting quietly even when the trial lock
// is on. The lock exists to stop NEW season data (logs, batches, pins, brix
// readings…) — remembering which tab was open or a calculator assumption is
// not that, and firing the red "entry not saved" banner for a tab switch was
// a false alarm (Debug H3). Data keys (sg_logs2, sg_batches, sg_lines_pins,
// sg_brixlog, sg_treenotes, sg_equip2, sg_cpoints, sg_mainlines, sg_rotation,
// sg_checks2, sg_custom2, sg_fresh_*, sg_wizard_data…) stay locked.
const SR_PREF_KEYS = [
  'sg_last_tab','sg_log_last_kind','sg_operator','sg_autocopy','sg_map_beta_dismissed','sg_notif_checked',
  'sg_price_syrup','sg_cost_wood','sg_rate_labor','sg_syrup_price','sg_laborrate','sg_laborhrs',
  'sg_fuel','sg_fuelcost','sg_brix','sg_bp','sg_trees','sg_season','sg_vacuum','sg_vacsystem','sg_dbh',
  'sg_spoutidx','sg_spoutcost','sg_bottlecost','sg_filtercost','sg_othercost','sg_retailmargin',
  'sg_mainsize','sg_matprices','sg_wx_name','sg_wx_lat','sg_wx_lon','sg_ddstart','sg_ddlat','sg_ddlon','sg_ddloc',
  // Run Sheet (redesign): which shell to show on this device (see app/look.js)
  'sg_look','sg_first_name',
];
const SR_PREF_PREFIXES = ['sg_last_screen','sg_pan','sg_dx_','sg_bev_','sg_recap_'];
const _srIsPref = k => SR_PREF_KEYS.includes(k) || SR_PREF_PREFIXES.some(p => k.startsWith(p));
let SR_WRITE_FAIL = null; // null | 'locked' | 'quota'
const _srFail = why => {
  SR_WRITE_FAIL = why;
  try { window.dispatchEvent(new Event('sr-write-fail')); } catch {}
  return false;
};
const _srClear = () => {
  if (!SR_WRITE_FAIL) return;
  SR_WRITE_FAIL = null;
  try { window.dispatchEvent(new Event('sr-write-fail')); } catch {}
};
const ls = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => {
    if (SR_LOCKED && !SR_LOCK_ALLOW.includes(k) && !_srIsPref(k)) {
      // Mount-persist effects re-write the value already stored (e.g. TasksTab
      // writes sg_checks2 on open). Writing an identical value changes nothing,
      // so it is a silent no-op — not a scary "entry not saved" alert (H3).
      // A genuinely NEW value on a data key still locks and shows the banner.
      try { if (localStorage.getItem(k) === JSON.stringify(v)) return true; } catch {}
      return _srFail('locked');
    }
    try {
      localStorage.setItem(k, JSON.stringify(v));
      if (SR_WRITE_FAIL === 'quota') _srClear();
      return true;
    }
    catch { return _srFail('quota'); }
  }
};


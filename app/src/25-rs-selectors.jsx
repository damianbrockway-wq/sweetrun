// ─── Run Sheet selectors and data hooks (Phase 5) ───────────────────────────
// The ONLY place new screens read sg_* keys. Each selector reads a key once
// and returns a plain object; screens never parse localStorage themselves.
// Writes go through ls.set (trial lock, quota) and then srDataChanged(), which
// tells every mounted Run Sheet screen to re-read. Classic screens keep their
// own reads and writes untouched.

const SR_DATA_EVENT = 'sr-data';
function srDataChanged() { try { window.dispatchEvent(new Event(SR_DATA_EVENT)); } catch {} }
// Re-render when any Run Sheet write lands (or another tab writes storage).
function useSrDataVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener(SR_DATA_EVENT, h);
    window.addEventListener('storage', h);
    return () => { window.removeEventListener(SR_DATA_EVENT, h); window.removeEventListener('storage', h); };
  }, []);
  return v;
}

// Everything the Season screen and the stage screens read, in one pass.
function selSeason(season) {
  const logs = ls.get('sg_logs2', {}) || {};
  const slog = logs[season] || {};
  const prevSlog = logs[season - 1] || null;
  const pins = ls.get('sg_lines_pins', []) || [];
  const mainlines = ls.get('sg_mainlines', []) || [];
  const wizard = ls.get('sg_wizard_data', {}) || {};
  const checks = ls.get('sg_checks2', {}) || {};
  const custom = ls.get('sg_custom2', { pre:[], post:[] }) || { pre:[], post:[] };
  const ck = phase => {
    const base = phase === 'pre' ? PRE_TASKS : POST_TASKS;
    const all = [...base, ...(custom[phase] || [])];
    const c = checks[`${season}-${phase}`] || {};
    return { done: all.filter((_, i) => c[i]).length, total: all.length };
  };
  const anyEntries = Object.keys(logs).some(y => SR_LOG_KINDS.some(k => ((logs[y] || {})[k] || []).length));
  return {
    logs, slog, prevSlog, pins, mainlines, wizard,
    wizardDone: !!ls.get('sg_wizard_done', false) || !!ls.get('sg_onboarded', false),
    anyEntries,
    treePins: pins.filter(p => p.type === 'tree'),
    tankPins: pins.filter(p => p.type === 'tank'),
    batches: ls.get('sg_batches', []) || [],
    brixlog: ls.get('sg_brixlog', []) || [],
    boil: ls.get('sg_boil_session', null),
    freshStart: ls.get('sg_fresh_status', 'idle') === 'tracking' ? ls.get('sg_fresh_start', null) : null,
    checks: { pre: ck('pre'), post: ck('post') },
    cpoints: ls.get('sg_cpoints', []) || [],
    autoCopy: ls.get('sg_autocopy', { ro:false, evap:false }) || { ro:false, evap:false },
    loc: selLocation(),
    panRate: srPanRate(ls.get('sg_panIdx', 0), ls.get('sg_panW', ''), ls.get('sg_panH', '')),
    panIdx: ls.get('sg_panIdx', 0),
    tanks: selTanks(season),
  };
}
// Forecast location: the Weather tab's place first, then the degree-day place
// (the same fallback SapFreshnessTracker uses).
function selLocation() {
  const lat = ls.get('sg_wx_lat', null) ?? ls.get('sg_ddlat', null);
  const lon = ls.get('sg_wx_lon', null) ?? ls.get('sg_ddlon', null);
  const name = ls.get('sg_wx_name', '') || ls.get('sg_ddloc', '') || '';
  return lat != null && lon != null ? { lat, lon, name } : null;
}

// ── Tanks: the Phase 8 seam ──────────────────────────────────────────────────
// No tank level is stored anywhere today. PORT-PLAN 3.5 defines the keys the
// Pumps/Watch phase adds: sg_tanks [{id,name,role,capGal,pinId?}], sg_sensors
// [{id,quantity:'level',target:{type:'tank',id},unit:'gal',...}] and
// sg_readings {[season]:[{id,s,t,v,src}]} (canonical gallons). When those keys
// exist this returns each tank with its latest level and a fill rate from the
// last two readings; until then it returns [] and the Season screen shows the
// "add a tank" empty state instead of sample data.
function selTanks(season) {
  const tanks = ls.get('sg_tanks', null);
  if (!Array.isArray(tanks) || !tanks.length) return [];
  const sensors = ls.get('sg_sensors', []) || [];
  const readings = ((ls.get('sg_readings', {}) || {})[season]) || [];
  return tanks.map(t => {
    const sids = sensors.filter(s => s.quantity === 'level' && s.target && s.target.type === 'tank' && s.target.id === t.id).map(s => s.id);
    const rs = readings.filter(r => sids.includes(r.s) && isFinite(parseFloat(r.v)))
      .map(r => ({ ms: Date.parse(r.t), v: parseFloat(r.v) })).filter(r => isFinite(r.ms)).sort((a, b) => a.ms - b.ms);
    const last = rs[rs.length - 1] || null, prev = rs[rs.length - 2] || null;
    const dtH = last && prev ? (last.ms - prev.ms) / 3600000 : 0;
    const fill = dtH > 0 && last.v > prev.v ? (last.v - prev.v) / dtH : null;
    return { id:t.id, name:t.name || 'Tank', role:t.role || 'collection', capGal:+t.capGal || 0,
      levelGal: last ? last.v : null, readMs: last ? last.ms : null, prevGal: prev ? prev.v : null, fillGalH: fill };
  });
}

// Entries logged today (any kind), for the engine and the Log it section.
function selToday(slog) {
  const today = srToday();
  const out = { sap:0, syrup:0, any:0, sapVal:0, syrupVal:0 };
  SR_LOG_KINDS.forEach(k => (slog[k] || []).forEach(e => {
    const p = srDateParts(e.date); if (!p) return;
    if (srIsoOf(new Date(p.y, p.mo - 1, p.d, 12)) !== today) return;
    out.any++;
    if (k === 'sapCollected') { out.sap++; out.sapVal += parseFloat(e.val) || 0; }
    if (k === 'syrupMade')    { out.syrup++; out.syrupVal += parseFloat(e.val) || 0; }
  }));
  return out;
}
// Latest sap Brix: the newest sg_brixlog reading, else the shared sg_brix setting.
function selSapBrix(brixlog, fallback) {
  const r = (brixlog || []).filter(e => isFinite(parseFloat(e.brix)))
    .sort((a, b) => (srDateMs(b.date) - srDateMs(a.date)) || ((b.id || 0) - (a.id || 0)))[0];
  return r ? { brix: parseFloat(r.brix), date: r.date, from:'log' } : { brix: parseFloat(fallback) || 2, date:null, from:'setting' };
}

// ── Forecast (Open-Meteo, the same API the Weather tab calls) ────────────────
// Daily highs and lows for the past weeks of the season plus 10 days ahead,
// kept in memory for 30 minutes so moving between screens does not refetch.
// Nothing is written to storage.
const _srWx = { key:null, at:0, data:null, err:null, p:null };
function srFetchWx(lat, lon, pastDays) {
  const key = `${lat},${lon},${pastDays}`;
  if (_srWx.key === key && _srWx.data && Date.now() - _srWx.at < 1800000) return Promise.resolve(_srWx.data);
  if (_srWx.key === key && _srWx.p) return _srWx.p;
  _srWx.key = key; _srWx.err = null;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto` +
    `&past_days=${Math.max(0, Math.min(92, pastDays))}&forecast_days=10`;
  _srWx.p = fetch(url).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(d => {
    if (!d || !d.daily || !d.daily.time) throw new Error('no data');
    const m = {};
    d.daily.time.forEach((iso, i) => {
      const hi = d.daily.temperature_2m_max[i], lo = d.daily.temperature_2m_min[i];
      if (hi != null && lo != null) m[iso] = { hi, lo };
    });
    _srWx.data = m; _srWx.at = Date.now(); _srWx.p = null;
    return m;
  }).catch(e => { _srWx.p = null; _srWx.err = e; throw e; });
  return _srWx.p;
}
// status: 'none' (no location) | 'loading' | 'ok' | 'error'
function useSrWx(loc, pastDays = 60) {
  const key = loc ? `${loc.lat},${loc.lon},${pastDays}` : null;
  const cached = key && _srWx.key === key && _srWx.data ? _srWx.data : null;
  const [st, setSt] = useState(() => ({ status: !loc ? 'none' : cached ? 'ok' : 'loading', data: cached, at: cached ? _srWx.at : 0 }));
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!loc) { setSt({ status:'none', data:null, at:0 }); return; }
    let live = true;
    if (!cached) setSt(s => ({ ...s, status:'loading' }));
    srFetchWx(loc.lat, loc.lon, pastDays)
      .then(d => { if (live) setSt({ status:'ok', data:d, at:_srWx.at }); })
      .catch(() => { if (live) setSt({ status:'error', data:null, at:0 }); });
    return () => { live = false; };
  }, [key, tick]);
  return { ...st, retry: () => { _srWx.key = null; _srWx.data = null; setTick(x => x + 1); } };
}

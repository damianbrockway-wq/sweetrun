// ─── Run Sheet operations data (Phases 7-8): pumps, lines, tanks, readings ──
// Selectors and writers for the keys the Bush, Pumps and Watch screens add.
// None of these keys existed before, and no existing key changes shape:
//
//   sg_pumps        [{ id, kind: vacuum|transfer|ro|generator, name, where, pinId, lineIds:[],
//                      tankId, status: running|stopped|fault, statusAt, note, runStart,
//                      fuelCapGal, burnGalH, serviceEveryH, parts:[{ name, qty }] }]
//   sg_pump_log     [{ id, pumpId, kind:'run', start, end }
//                    | { id, pumpId, kind:'status', t, status, note }
//                    | { id, pumpId, kind:'fuel', t, level, added }      (gallons)
//                    | { id, pumpId, kind:'service', t, what, parts, hoursAt }]
//   sg_line_meta    { [mainlineId]: { taps, path:[[lat,lon]], tankId, checkedAt, note } }
//                   (sg_mainlines keeps exactly {id,label,color}: mainlinesSaved() drops
//                   anything else, so per-line data lives here, keyed by the same id)
//   sg_tanks        [{ id, name, role, capGal, pinId }]                (PORT-PLAN 3.5)
//   sg_sensors      [{ id, quantity, target:{ type, id }, unit, source:'manual' }]
//   sg_readings     { [season]: [{ id, s, t, v, src:'manual' }] }     (inHg, gallons)
//   sg_freeze_prep  { night: 'YYYY-MM-DD', done: { [itemId]: true } }
//   sg_tree_brix    { [treePinId]: [{ t, brix }] }
//   preferences (write during an expired trial, SR_PREF_KEYS):
//   sg_watch_prefs  { leakLimitIn, freezeF, fuelLowH, staleH }
//   sg_demo_readings  false by default; Watch mode only
//   sg_bush_layers  { base, trees, laterals, mainlines, vacuum, brix, pumps, tanks, property }
//
// Times are ISO strings in storage. Every data write goes through ls.set and
// its return is checked; a refused write (expired trial, full storage) leaves
// the stored value byte-identical and the caller shows "not saved".

const srArr = v => Array.isArray(v) ? v : [];
const srObj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const srIso = ms => new Date(ms).toISOString();
const srUid = p => p + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
// The classic mainline palette, stored in sg_mainlines for classic's sake
// (data, not UI colour: the new look draws lines white with a dash per line).
const SR_ML_STORED = ['#3b82f6','#8b5cf6','#ec4899','#f97316','#14b8a6','#eab308','#ef4444','#22c55e'];
const SR_LINE_DASH = ['', '14 7', '1 7', '12 5 2 5'];   // A solid, B long dash, C dotted, D dash-dot

// Mainlines as the new screens see them: the saved list, or (when nothing was
// ever saved) the ids his tree pins already use, named the way classic names them.
function selMainlines(pins) {
  const saved = srArr(ls.get('sg_mainlines', null)).filter(m => m && m.id);
  if (saved.length) return saved.map(m => ({ id: String(m.id), label: String(m.label || 'Mainline ' + m.id) }));
  const ids = [...new Set(srArr(pins).filter(p => p.type === 'tree' && p.mainline).map(p => String(p.mainline)))].sort();
  return ids.map(id => ({ id, label: 'Mainline ' + id }));
}

function selOps(season) {
  const pins = srArr(ls.get('sg_lines_pins', []));
  return {
    pins,
    mainlines: selMainlines(pins),
    pumps: srArr(ls.get('sg_pumps', [])),
    log: srArr(ls.get('sg_pump_log', [])),
    lineMeta: srObj(ls.get('sg_line_meta', {})),
    tanksRaw: srArr(ls.get('sg_tanks', [])),
    sensors: srArr(ls.get('sg_sensors', [])),
    readings: srArr(srObj(ls.get('sg_readings', {}))[season]),
    prefs: srOpsPrefs(ls.get('sg_watch_prefs', {})),
    prep: srObj(ls.get('sg_freeze_prep', {})),
    demo: !!ls.get('sg_demo_readings', false),
    treeBrix: srObj(ls.get('sg_tree_brix', {})),
    property: ls.get('sg_property_geo', null),
    tanks: selTanks(season),
  };
}

// Everything derived for the screens at one moment. `now` in ms.
function srOpsModel(d, now) {
  const P = d.prefs;
  const src = srManualSource(d.readings, P.staleH);
  const dayStart = (() => { const x = new Date(now); x.setHours(0, 0, 0, 0); return x.getTime(); })();
  const yrStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
  const pumps = d.pumps.map(p => {
    const mine = d.log.filter(e => e && e.pumpId === p.id);
    const runs = mine.filter(e => e.kind === 'run').map(e => ({ start: Date.parse(e.start), end: Date.parse(e.end) }));
    const runStart = p.status === 'running' && p.runStart ? Date.parse(p.runStart) : null;
    const fills = mine.filter(e => e.kind === 'fuel').map(e => ({ ms: Date.parse(e.t), level: parseFloat(e.level) }));
    const services = mine.filter(e => e.kind === 'service').sort((a, b) => Date.parse(b.t) - Date.parse(a.t));
    const lastSvc = services[0] || null;
    const hoursTotal = srRunHours(runs, runStart, -Infinity, now);
    const sinceSvc = lastSvc ? srRunHours(runs, runStart, Date.parse(lastSvc.t), now) : hoursTotal;
    const fuel = (p.kind === 'generator' || +p.burnGalH > 0) ? srFuelLeft({ fills, burnGalH: p.burnGalH, capGal: p.fuelCapGal, runs, runStart, now }) : null;
    const vac = p.kind === 'vacuum' ? src.latest(srSensorId('pump', p.id)) : null;
    return { ...p, family: p.status === 'fault' ? 'bad' : p.status === 'running' ? (SR_PUMP_FAMILY[p.kind] || 'power') : 'power',
      runs, runStartMs: runStart, statusMs: Date.parse(p.statusAt) || null,
      todayH: srRunHours(runs, runStart, dayStart, now), seasonH: srRunHours(runs, runStart, yrStart, now), hoursTotal,
      fuel, fills, services, lastSvc, sinceSvc,
      svcLeftH: +p.serviceEveryH > 0 ? +p.serviceEveryH - sinceSvc : null, vac, events: mine };
  });
  const tankPins = d.pins.filter(p => p.type === 'tank');
  const lines = d.mainlines.map((m, i) => {
    const meta = srObj(d.lineMeta[m.id]);
    const trees = d.pins.filter(p => p.type === 'tree' && String(p.mainline) === m.id);
    const sid = srSensorId('line', m.id);
    const hist = src.history(sid);
    const leak = srLeakCheck(hist, P.leakLimitIn, P.baselineDays);
    const geo = srLinePath(meta, trees, tankPins);
    const treeTaps = trees.reduce((s, p) => s + (parseInt(p.taps) || 0), 0);
    const checked = Math.max(Date.parse(meta.checkedAt) || -Infinity, leak.latest ? leak.latest.ms : -Infinity);
    const pumpsOn = pumps.filter(p => p.kind === 'vacuum' && srArr(p.lineIds).map(String).includes(m.id));
    return { ...m, idx: i, dash: SR_LINE_DASH[i % SR_LINE_DASH.length], meta, trees, sid, hist, leak,
      latest: leak.latest, taps: isFinite(parseInt(meta.taps)) ? parseInt(meta.taps) : treeTaps, treeTaps, tapsSet: isFinite(parseInt(meta.taps)),
      geo, lengthFt: geo.pts.length >= 2 ? srPathFt(geo.pts) : null, checkedMs: isFinite(checked) ? checked : null,
      pumps: pumpsOn, flowing: pumpsOn.some(p => p.status === 'running'), tier: srAgeTier(leak.latest ? leak.latest.ms : null, now, P.staleH) };
  });
  const leaks = lines.filter(l => l.leak.status === 'suspect')
    .map(l => ({ id: l.id, name: l.label, latest: l.leak.latest.v, baseline: l.leak.baseline, drop: l.leak.drop }));
  return { ...d, src, pumps, lines, leaks, now, dayStart };
}

// Freeze prep for tonight: the items, what is done, and tonight's forecast low.
function srTonightIso(now) { const d = new Date(now); return srIsoOf(d.getHours() >= 12 ? new Date(now + 86400000) : d); }
function srPrepState(model, wx) {
  const night = srTonightIso(model.now);
  const w = wx && wx[night];
  const lo = w ? Math.round(w.lo) : null;
  const items = srFreezeItems(model.pumps, model.lines.some(l => l.trees.length || l.geo.pts.length));
  const done = model.prep.night === night ? srObj(model.prep.done) : {};
  const nDone = items.filter(i => done[i.id]).length;
  return { night, lo, items, done, nDone, freezing: lo != null && lo <= model.prefs.freezeF };
}
// The ops block srJobs takes (f.ops).
function srOpsForJobs(model, wx) {
  if (!model || (!model.pumps.length && !model.leaks.length)) return null;
  const prep = srPrepState(model, wx);
  return {
    prefs: model.prefs,
    pumps: model.pumps.map(p => ({ id: p.id, name: p.name, kind: p.kind, status: p.status, statusAt: p.statusMs, note: p.note, fuel: p.fuel })),
    leaks: model.leaks,
    freeze: prep.freezing && prep.items.length ? { lo: prep.lo, done: prep.nDone, total: prep.items.length } : null,
  };
}

// ── Writers ──────────────────────────────────────────────────────────────────
// Each returns true when saved. On false, SR_WRITE_FAIL says why ('locked' or
// 'quota'); the stored value is untouched.
function srOpsSet(key, value) { const ok = ls.set(key, value); if (ok) srDataChanged(); return ok; }
function srSavePump(p) {
  const all = srArr(ls.get('sg_pumps', []));
  const i = all.findIndex(x => x.id === p.id);
  return srOpsSet('sg_pumps', i >= 0 ? all.map(x => x.id === p.id ? p : x) : [...all, p]);
}
// Merge a change into the stored pump (never the derived model object).
function srPatchPump(id, patch) {
  const all = srArr(ls.get('sg_pumps', []));
  if (!all.some(x => x.id === id)) return false;
  return srOpsSet('sg_pumps', all.map(x => x.id === id ? { ...x, ...patch } : x));
}
function srNewPump(f, now) {
  return { id: srUid('p'), kind: f.kind, name: f.name, where: f.where || '', pinId: f.pinId || null,
    lineIds: srArr(f.lineIds), tankId: f.tankId || null, status: 'stopped', statusAt: srIso(now), note: '', runStart: null,
    fuelCapGal: f.fuelCapGal != null && f.fuelCapGal !== '' ? +f.fuelCapGal : null,
    burnGalH: f.burnGalH != null && f.burnGalH !== '' ? +f.burnGalH : null,
    serviceEveryH: f.serviceEveryH != null && f.serviceEveryH !== '' ? +f.serviceEveryH : null,
    gph: f.gph != null && f.gph !== '' ? +f.gph : null, parts: [] };
}
function srRemovePump(id) {
  const all = srArr(ls.get('sg_pumps', []));
  if (!srOpsSet('sg_pumps', all.filter(x => x.id !== id))) return false;
  ls.set('sg_pump_log', srArr(ls.get('sg_pump_log', [])).filter(e => e.pumpId !== id));
  return true;
}
// Mark running / stopped / fault. Leaving "running" closes the open run into
// the log (that is where runtime comes from); entering it stores the start.
function srSetPumpStatus(id, status, note, now, startMs) {
  const all = srArr(ls.get('sg_pumps', []));
  const p = all.find(x => x.id === id); if (!p) return false;
  const log = srArr(ls.get('sg_pump_log', []));
  const add = [];
  const wasRun = p.status === 'running' && p.runStart;
  if (wasRun && status !== 'running') add.push({ id: srUid('e'), pumpId: id, kind: 'run', start: p.runStart, end: srIso(now) });
  add.push({ id: srUid('e'), pumpId: id, kind: 'status', t: srIso(now), status, note: note || '' });
  const runStart = status === 'running' ? (wasRun ? p.runStart : srIso(Math.min(now, isFinite(startMs) ? startMs : now))) : null;
  if (!ls.set('sg_pump_log', [...log, ...add])) return false;
  if (!ls.set('sg_pumps', all.map(x => x.id === id ? { ...x, status, statusAt: srIso(now), note: note || '', runStart } : x))) {
    ls.set('sg_pump_log', log); return false;
  }
  srDataChanged(); return true;
}
function srLogPumpEvent(e) { return srOpsSet('sg_pump_log', [...srArr(ls.get('sg_pump_log', [])), { id: srUid('e'), ...e }]); }
function srSaveLineMeta(id, patch) {
  const all = srObj(ls.get('sg_line_meta', {}));
  return srOpsSet('sg_line_meta', { ...all, [id]: { ...srObj(all[id]), ...patch } });
}
// A hand reading. Creates the sensor record the first time (PORT-PLAN 3.5).
function srLogReading(season, sensor, v, tMs) {
  const sensors = srArr(ls.get('sg_sensors', []));
  if (!sensors.some(s => s.id === sensor.id)) {
    if (!ls.set('sg_sensors', [...sensors, { ...sensor, source: 'manual' }])) return false;
  }
  const all = srObj(ls.get('sg_readings', {}));
  const list = srArr(all[season]);
  const ok = ls.set('sg_readings', { ...all, [season]: [...list, { id: srUid('r'), s: sensor.id, t: srIso(tMs), v: +v, src: 'manual' }] });
  if (ok) srDataChanged();
  return ok;
}
function srSaveTank(t) {
  const all = srArr(ls.get('sg_tanks', []));
  const i = all.findIndex(x => x.id === t.id);
  return srOpsSet('sg_tanks', i >= 0 ? all.map(x => x.id === t.id ? t : x) : [...all, t]);
}
function srAddMainline(label) {
  const saved = srArr(ls.get('sg_mainlines', null)).filter(m => m && m.id);
  const base = saved.length ? saved.map(m => ({ id: String(m.id), label: String(m.label || 'Mainline ' + m.id), color: m.color || SR_ML_STORED[0] }))
    : selMainlines(ls.get('sg_lines_pins', [])).map((m, i) => ({ ...m, color: SR_ML_STORED[i % SR_ML_STORED.length] }));
  const used = new Set(base.map(m => m.id));
  const id = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find(ch => !used.has(ch));
  if (!id) return null;
  const list = [...base, { id, label: label || 'Mainline ' + id, color: SR_ML_STORED[base.length % SR_ML_STORED.length] }];
  if (!srOpsSet('sg_mainlines', list)) return null;
  try { if (typeof _ML_LIST !== 'undefined') _ML_LIST = null; } catch {}   // classic's cache re-reads next time
  return id;
}
function srRenameMainline(id, label) {
  const saved = srArr(ls.get('sg_mainlines', null)).filter(m => m && m.id);
  const base = saved.length ? saved : selMainlines(ls.get('sg_lines_pins', [])).map((m, i) => ({ ...m, color: SR_ML_STORED[i % SR_ML_STORED.length] }));
  const ok = srOpsSet('sg_mainlines', base.map(m => String(m.id) === id ? { id: String(m.id), label, color: m.color || SR_ML_STORED[0] } : { id: String(m.id), label: String(m.label || 'Mainline ' + m.id), color: m.color || SR_ML_STORED[0] }));
  try { if (ok && typeof _ML_LIST !== 'undefined') _ML_LIST = null; } catch {}
  return ok;
}
// Tree pins: the same write classic's updatePinField does (whole array back to sg_lines_pins).
function srSavePins(pins) { return srOpsSet('sg_lines_pins', pins); }
// A new pin in exactly _dropPin's shape.
function srMakePin(all, lat, lon, type, extra, now) {
  const count = srArr(all).filter(p => p.type === type).length + 1;
  const typeLabels = { tree:'Tree', tank:'Tank', sugarhouse:'Sugarhouse', pump:'Pump', junction:'Junction', marker:'Waypoint' };
  return {
    id: now, lat, lon, type, label: (typeLabels[type] || type) + ' ' + count, elev: null, notes: '',
    ...(type === 'tree' ? { species: 'sugar_maple', dbh: 12, health: 'good', taps: 1, mainline: null,
      tagged: 'T' + String(count).padStart(3, '0'), yearAdded: new Date(now).getFullYear() } : {}),
    ...(extra || {}),
  };
}

// ── Hooks ────────────────────────────────────────────────────────────────────
// The ops model, re-read on every Run Sheet write; `tick` re-derives it once a
// second while something counts (a pump running), so runtime clocks move.
function useSrOps(c, tickOn, atMs) {
  const v = useSrDataVersion();
  const d = React.useMemo(() => selOps(c.season), [c.season, v]);
  const running = d.pumps.some(p => p.status === 'running');
  const fixed = atMs != null;   // a caller with its own clock (Season: 30 s) gets no 1 s tick
  const [tickNow, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (fixed || !(running || tickOn)) { setNow(Date.now()); return; }
    const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id);
  }, [running, tickOn, v, fixed]);
  const now = fixed ? atMs : tickNow;
  // ver changes only when stored data changes (not on the clock tick), so maps redraw on data, not every second.
  return React.useMemo(() => ({ ...srOpsModel(d, now), ver: v + ':' + c.season }), [d, now]);
}

// Outside temperature by the hour (Open-Meteo, the same API as the forecast),
// kept in memory 15 minutes. Nothing is stored. status: none|loading|ok|error
const _srHr = { key: null, at: 0, data: null, p: null };
function srFetchHourly(lat, lon) {
  const key = `${lat},${lon}`;
  if (_srHr.key === key && _srHr.data && Date.now() - _srHr.at < 900000) return Promise.resolve(_srHr.data);
  if (_srHr.key === key && _srHr.p) return _srHr.p;
  _srHr.key = key;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&current=temperature_2m` +
    `&temperature_unit=fahrenheit&timezone=auto&past_days=1&forecast_days=2`;
  _srHr.p = fetch(url).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(j => {
    const t = (j.hourly && j.hourly.time) || [], f = (j.hourly && j.hourly.temperature_2m) || [];
    const hourly = t.map((iso, i) => ({ ms: Date.parse(iso), f: f[i] })).filter(x => isFinite(x.ms) && isFinite(x.f));
    const cur = j.current && isFinite(j.current.temperature_2m) ? j.current.temperature_2m : null;
    const curMs = j.current && j.current.time ? Date.parse(j.current.time) : Date.now();
    if (!hourly.length && cur == null) throw new Error('no data');
    _srHr.data = { hourly, cur, curMs: isFinite(curMs) ? curMs : Date.now() }; _srHr.at = Date.now(); _srHr.p = null;
    return _srHr.data;
  }).catch(e => { _srHr.p = null; throw e; });
  return _srHr.p;
}
function useSrHourly(loc) {
  const key = loc ? `${loc.lat},${loc.lon}` : null;
  const cached = key && _srHr.key === key && _srHr.data ? _srHr.data : null;
  const [st, setSt] = useState(() => ({ status: !loc ? 'none' : cached ? 'ok' : 'loading', data: cached }));
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!loc) { setSt({ status: 'none', data: null }); return; }
    let live = true;
    srFetchHourly(loc.lat, loc.lon).then(d => { if (live) setSt({ status: 'ok', data: d }); })
      .catch(() => { if (live) setSt({ status: 'error', data: null }); });
    const id = setInterval(() => setTick(x => x + 1), 900000);
    return () => { live = false; clearInterval(id); };
  }, [key, tick]);
  return { ...st, retry: () => { _srHr.key = null; _srHr.data = null; setTick(x => x + 1); } };
}

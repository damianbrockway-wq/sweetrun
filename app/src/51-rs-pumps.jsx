// ─── Pumps (Phase 8): pump center, pump detail, vacuum and leaks, freeze prep, tanks
// Real data only (26-rs-ops.jsx keys). Until he adds a pump the center shows a
// designed empty state; it never shows the prototype's sample operation.
//
// Routes: #/pumps · #/pumps/<pumpId> · #/pumps/vacuum · #/pumps/freeze ·
//         #/pumps/tank/<tankId> · #/pumps/add[/<pinId>] · #/pumps/add-tank[/<pinId>]

// Status line: colour + word + shape (RsSt), with the live run clock.
function RsPumpStatus({ p, L, now, long, still }) {
  if (p.status === 'running' && still) return <RsSt kind="ok">{rt(L, 'runningSince', { t: p.runStartMs ? srWhen2(p.runStartMs, now, L) : '' })}</RsSt>;
  if (p.status === 'running') {
    const h = p.runStartMs ? Math.max(0, (now - p.runStartMs) / SR_H_MS) : 0;
    return <RsSt kind="ok run"><span>{rt(L, 'stRunning')} · <span className="tn">{srHms(h)}</span>{long && p.runStartMs ? ' ' + rt(L, 'sinceT', { t: srWhen2(p.runStartMs, now, L) }) : ''}</span></RsSt>;
  }
  if (p.status === 'fault') return <RsSt kind="fault">{rt(L, 'stFaultSince', { t: p.statusMs ? srWhen2(p.statusMs, now, L) : '' })}</RsSt>;
  return <RsSt kind="idle">{p.statusMs ? rt(L, 'stStoppedSince', { t: srWhen2(p.statusMs, now, L) }) : rt(L, 'stStopped')}</RsSt>;
}
// A time that says which day when it isn't today: "3:51 pm", "yesterday 8:20 pm", "Mar 12".
// Same for a time ahead: "11:44 am", "tomorrow 11:44 am", "Mar 18".
function srWhenAhead(ms, now, L) {
  const d = new Date(ms), n = new Date(now);
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(n)) / 86400000);
  if (diff <= 0) return srClock(ms, L);
  if (diff === 1) return rt(L, 'tomorrowAt', { t: srClock(ms, L) });
  return srDayLabel(srIsoOf(d), L);
}
function srWhen2(ms, now, L) {
  const d = new Date(ms), n = new Date(now);
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(n) - day(d)) / 86400000);
  if (diff <= 0) return srClock(ms, L);
  if (diff === 1) return rt(L, 'yesterdayAt', { t: srClock(ms, L) });
  return srDayLabel(srIsoOf(d), L);
}
const SR_KIND_ICON = { vacuum: 'gauge', transfer: 'pump', ro: 'ro', generator: 'bolt' };

// The big number on a pump's readout row, per kind.
function srPumpValue(p, c) {
  const L = c.lang, u = srU(c.units);
  if (p.kind === 'vacuum') return p.vac ? [fmt(p.vac.v, 1), 'in'] : [rt(L, 'noReadingShort'), ''];
  if (p.kind === 'generator') return p.fuel ? [fmt(fromGal(p.fuel.levelGal, c.units), 1), u] : [rt(L, 'noFuelShort'), ''];
  return [fmt(p.todayH, 1), rt(L, 'hToday')];
}

function RsReadoutRow({ href, onClick, lead, title, status, value, unit, tone }) {
  const inner = <>{lead}<span className="rs-rt"><b>{title}</b>{status}</span>
    <span className={`rs-rov tn${tone ? ' ' + tone : ''}`}>{value}{unit && <small>{unit}</small>}</span></>;
  return href ? <a className="rs-row rs-ro" href={href}>{inner}</a> : <button type="button" className="rs-row rs-ro" onClick={onClick}>{inner}</button>;
}

function RsPumps({ c, sub, openLog }) {
  const L = c.lang, u = srU(c.units);
  const s = sub || [];
  if (s[0] === 'vacuum') return <RsVacuumScreen c={c} />;
  if (s[0] === 'freeze') return <RsFreezeScreen c={c} />;
  if (s[0] === 'tank' && s[1]) return <RsTankScreen c={c} id={s[1]} />;
  if (s[0] && !['add', 'add-tank'].includes(s[0])) return <RsPumpScreen c={c} id={s[0]} />;
  return <RsPumpCenter c={c} addPin={s[0] === 'add' ? (s[1] || true) : null} addTankPin={s[0] === 'add-tank' ? (s[1] || true) : null} />;
}

function RsPumpCenter({ c, addPin, addTankPin }) {
  const L = c.lang, u = srU(c.units);
  const model = useSrOps(c);
  const loc = React.useMemo(() => selLocation(), []);
  const wx = useSrWx(loc, 0);
  const [add, setAdd] = useState(addPin ? { pin: addPin === true ? null : +addPin } : null);
  const [addTank, setAddTank] = useState(addTankPin ? { pin: addTankPin === true ? null : +addTankPin } : null);
  const [line, setLine] = useState(null);
  const now = model.now, minutes = srMinutesOf(new Date(now));
  const ops = srOpsForJobs(model, wx.data);
  const jobs = ops ? srPumpJobs({ now, minutes, ops }).sort((a, b) => b.p - a.p) : [];
  const top = jobs[0], rest = jobs.slice(1, 4);
  const prep = srPrepState(model, wx.data);
  const nNeed = jobs.length;
  const has = model.pumps.length > 0 || model.tanks.length > 0 || model.lines.some(l => l.latest);
  const lede = !has ? rt(L, 'pumpsLedeEmpty') : nNeed ? rt(L, nNeed === 1 ? 'pumpsNeed1' : 'pumpsNeed', { n: nNeed }) : rt(L, 'pumpsAllGood');
  const selLine = line ? model.lines.find(l => l.id === line) : null;
  const board = (
    <div className="rs-list rs-board">
      {model.pumps.map(p => { const [v, un] = srPumpValue(p, c); return (
        <RsReadoutRow key={p.id} href={rsHref('pumps/' + p.id)} lead={<RsPumpTile p={p} />} title={p.name}
          status={<RsPumpStatus p={p} L={L} now={now} />} value={v} unit={un} tone={p.status === 'fault' ? 'bad' : (p.fuel && p.fuel.hoursLeft != null && p.fuel.hoursLeft <= 4) ? 'bad' : ''} />); })}
      {model.lines.filter(l => l.latest || l.trees.length).map(l => (
        <RsReadoutRow key={l.id} onClick={() => setLine(l.id)} lead={<RsLinePlate l={l} size={40} />} title={rt(L, 'lineEnd', { n: l.label })}
          status={<RsSt kind={l.leak.status === 'suspect' ? 'check' : l.latest ? (l.tier === 'old' ? 'idle' : 'ok') : 'idle'}>
            {l.leak.status === 'suspect' ? rt(L, 'leakSuspectD', { d: fmt(l.leak.drop, 1) }) : l.latest ? rt(L, 'readAgoShort', { a: srAgo(l.latest.ms, now, L) }) : rt(L, 'noReadingYet')}</RsSt>}
          value={l.latest ? fmt(l.latest.v, 1) : '·'} unit={l.latest ? 'in' : ''} tone={l.leak.status === 'suspect' ? 'bad' : ''} />))}
      {model.tanks.map(t => (
        <RsReadoutRow key={t.id} href={rsHref('pumps/tank/' + t.id)} lead={<RsTile icon="tank" family="collect" />} title={t.name}
          status={<RsSt kind={t.levelGal != null ? 'ok' : 'idle'}>{t.levelGal != null ? rt(L, 'tankPctRead', { p: t.capGal > 0 ? Math.round(t.levelGal / t.capGal * 100) : 0, a: srAgo(t.readMs, now, L) }) : rt(L, 'noLevelYet')}</RsSt>}
          value={t.levelGal != null ? srVol(t.levelGal, c.units) : '·'} unit={t.levelGal != null ? u : ''} />))}
      {prep.items.length > 0 && (
        <RsReadoutRow href={rsHref('pumps/freeze')} lead={<RsTile icon="snow" family="ice" />} title={rt(L, 'freezePrep')}
          status={<RsSt kind={prep.freezing ? (prep.nDone < prep.items.length ? 'ice' : 'ok') : 'idle'}>{prep.lo == null ? rt(L, 'noForecastShort') : prep.freezing ? rt(L, 'lowTonightV', { v: prep.lo }) : rt(L, 'noFreezeV', { v: prep.lo })}</RsSt>}
          value={prep.freezing ? prep.nDone : ''} unit={prep.freezing ? rt(L, 'ofN', { n: prep.items.length }) : ''} />)}
    </div>
  );
  return (
    <>
      <RsHero photo="pumphouse" />
      <div className="rs-inner rs-pumpsgrid">
        <header className="rs-phead pg-top">
          <div className="rs-eyebrow">{rt(L, 'pumpCenter')}</div>
          <h1>{rt(L, 'pumpsTitle')}</h1>
          <p className="rs-lede tn">{lede}</p>
        </header>
        <div className="pg-ban"><RsBanners c={c} /></div>
        {!has ? (
          <div className="pg-board">
            <div className="rs-empty">
              <div className="rs-mk"><RsImpeller size={48} /></div>
              <b>{rt(L, 'pumpsEmptyT2')}</b><p>{rt(L, 'pumpsEmptyP2')}</p>
              <div style={{ marginTop: 14 }}><RsBtn icon="plus" onClick={() => setAdd({})} id="rs-add-pump">{rt(L, 'addPump')}</RsBtn></div>
              <div style={{ marginTop: 10 }}><RsBtn kind="secondary" icon="tank" onClick={() => setAddTank({})}>{rt(L, 'addTank')}</RsBtn></div>
            </div>
            <p className="rs-note">{rt(L, 'pumpsHonest')}</p>
          </div>
        ) : <>
          <div className="pg-next">
            {top && <RsNextCard eyebrow={rt(L, 'doNext')} icon={top.icon === 'snow' ? 'snow' : top.icon} title={rt(L, top.title, rsJobVars(top, c))}
              why={rt(L, top.why, rsJobVars(top, c))} btn={rt(L, top.btn)} onAct={rsJobAct(c, top, () => {})} />}
            {rest.map(j => <RsAlert key={j.id} icon={j.icon} family={j.family} tone={j.tone} title={rt(L, j.alert, rsJobVars(j, c))} sub={rt(L, j.sub, rsJobVars(j, c))} onClick={rsJobAct(c, j, () => {})} />)}
            <div style={{ marginTop: 12 }}><RsBtn kind="secondary" icon="watch" href={rsHref('watch')}>{rt(L, 'watchBush')}</RsBtn></div>
          </div>
          <div className="pg-board">
            <h2 className="rs-sec">{rt(L, 'readouts')}</h2>
            {board}
          </div>
          <div className="pg-vac">
            <h2 className="rs-sec">{rt(L, 'vacAndLeaks')}<a className="rs-more" href={rsHref('pumps/vacuum')}>{rt(L, 'allLinesW')}<RsIcon name="chev" size={18} /></a></h2>
            <RsVacCard c={c} model={model} />
          </div>
          <div className="pg-more">
            <h2 className="rs-sec">{rt(L, 'byJob')}</h2>
            <div className="rs-list">
              <RsRow icon="gauge" family="lines" title={rt(L, 'vacAndLeaks')} sub={model.leaks.length ? rt(L, 'leaksOnV', { n: model.leaks.map(x => x.name).join(', ') }) : rt(L, 'allHoldingOrNone')} href={rsHref('pumps/vacuum')} />
              <RsRow icon="snow" family="ice" title={rt(L, 'freezePrep')} sub={prep.items.length ? rt(L, 'freezeRowS', { d: prep.nDone, t: prep.items.length }) : rt(L, 'freezeRowNone')} href={rsHref('pumps/freeze')} />
              <RsRow icon="calc" family="collect" title={rt(L, 'transferTime')} sub={rt(L, 'transferTimeS')} href={rsHref('shack/equipment')} />
            </div>
            <div className="rs-btnrow" style={{ marginTop: 14 }}>
              <RsBtn kind="secondary" icon="plus" onClick={() => setAdd({})} id="rs-add-pump">{rt(L, 'addPump')}</RsBtn>
              <RsBtn kind="secondary" icon="tank" onClick={() => setAddTank({})}>{rt(L, 'addTank')}</RsBtn>
            </div>
          </div>
        </>}
      </div>
      {add && <RsPumpSheet c={c} model={model} pinId={add.pin || null} onClose={() => { setAdd(null); if (addPin) try { history.replaceState(null, '', '#/pumps'); } catch {} }} />}
      {addTank && <RsTankSheet c={c} model={model} pinId={addTank.pin || null} onClose={() => { setAddTank(null); if (addTankPin) try { history.replaceState(null, '', '#/pumps'); } catch {} }} />}
      {selLine && <RsSheet title={selLine.label} onClose={() => setLine(null)} id="rs-line-sheet"><RsLineDetail c={c} model={model} line={selLine} onClose={() => setLine(null)} /></RsSheet>}
    </>
  );
}

// Vacuum at the line ends: every line's readings over the last 7 days on one
// time axis, the worst (leaking) line in red, the rest in text colours.
function RsVacCard({ c, model, h = 170 }) {
  const L = c.lang;
  const withR = model.lines.filter(l => l.hist.length);
  if (!withR.length) return <div className="rs-empty"><b>{rt(L, 'noVacT')}</b><p>{rt(L, 'noVacP')}</p></div>;
  // Window: back to the oldest reading of the last 7 days (at least 24 h), so a few days of readings fill the chart.
  const wk = model.now - 7 * 24 * SR_H_MS;
  const oldest = Math.min(...withR.map(l => (l.hist.find(x => x.ms >= wk) || { ms: model.now }).ms));
  const since = Math.min(model.now - 24 * SR_H_MS, oldest - 3 * SR_H_MS);
  const series = withR.map(l => ({ id: l.id, pts: l.hist.filter(x => x.ms >= since), dash: l.dash, leak: l.leak.status === 'suspect' })).filter(x => x.pts.length);
  const newest = Math.max(...withR.map(l => l.latest.ms));
  return (
    <div className="rs-card">
      <div className="rs-split"><div className="rs-meta">{rt(L, 'last7')}</div><span className="rs-fresh"><RsIcon name="clock" size={14} />{rt(L, 'newestRead', { a: srAgo(newest, model.now, L) })}</span></div>
      {series.length ? <RsTimeChart series={series} from={since} to={model.now} yMin={14} yMax={28} yTicks={[16, 20, 24, 28]} h={h} lang={L}
        label={rt(L, 'vacChartAria', { n: series.length })} /> : <p className="rs-meta">{rt(L, 'noVac7')}</p>}
      <div className="rs-legend">{series.map(s => <span key={s.id}><svg width="26" height="8" aria-hidden="true"><line x1="1" y1="4" x2="25" y2="4" className={s.leak ? 'rs-lg bad' : 'rs-lg'} strokeDasharray={s.dash || undefined} /></svg>{s.id}</span>)}</div>
    </div>
  );
}
// A line chart on a real time axis (readings are irregular). Drawn at its width.
function RsTimeChart({ series, from, to, yMin, yMax, yTicks, h = 160, label, lang }) {
  const [ref, W] = useRsWidth();
  const pl = 30, pr = 40, pt = 10, pb = 22, iw = Math.max(40, W - pl - pr), ih = h - pt - pb;
  const X = ms => pl + (ms - from) / Math.max(1, to - from) * iw, Y = v => pt + (1 - (Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * ih;
  const days = [];
  for (let d = new Date(from); d.getTime() <= to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const mid = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); if (mid >= from) days.push(mid);
  }
  const lbl = [days[0], days[Math.floor(days.length / 2)], to].filter(x => x != null);
  return (
    <div ref={ref} className="rs-chartwrap">
      <svg className="rs-chart" width={W} height={h} viewBox={`0 0 ${W} ${h}`} role="img" aria-label={label}>
        {yTicks.map(t => <g key={t}><line x1={pl} x2={W - pr} y1={Y(t)} y2={Y(t)} className="rs-grid" /><text x={pl - 6} y={Y(t) + 4} textAnchor="end" className="rs-ct">{t}</text></g>)}
        {series.map(s => {
          const pts = s.pts.map(p => [X(p.ms), Y(p.v)]);
          const d = 'M' + pts.map(p => p.map(q => q.toFixed(1)).join(' ')).join(' L');
          const e = pts[pts.length - 1];
          return <g key={s.id}>
            {pts.length > 1 && <path d={d} fill="none" className={`rs-tl${s.leak ? ' bad' : ''}`} strokeWidth={s.leak ? 3 : 2} strokeDasharray={s.dash || undefined} strokeLinecap="round" strokeLinejoin="round" />}
            {s.pts.map((p, i) => <circle key={i} cx={X(p.ms)} cy={Y(p.v)} r={i === s.pts.length - 1 ? 4.5 : 2.5} className={`rs-td${s.leak ? ' bad' : ''}`} />)}
            <text x={e[0] + 8} y={e[1] + 4} className="rs-ct strong">{s.id}</text>
          </g>;
        })}
        {lbl.map((ms, k) => <text key={k} x={X(ms)} y={h - 4} textAnchor={k === 0 ? 'start' : k === lbl.length - 1 ? 'end' : 'middle'} className="rs-ct">
          {k === lbl.length - 1 ? rt(lang, 'nowW') : srDayLabel(srIsoOf(new Date(ms)), lang)}</text>)}
      </svg>
    </div>
  );
}

// ── A hand reading (vacuum, tank level) ──────────────────────────────────────
// Canonical storage: inHg for vacuum, gallons for a level (display unit in,
// converted with toGal). Written through ls.set; refused under an expired trial.
function RsReadingSheet({ c, title, unit, dp, steps, min, max, base, sensor, onSaved, onClose, toStore }) {
  const L = c.lang;
  const [v, setV] = useState('');
  const [ago, setAgo] = useState(0);
  const [fail, setFail] = useState(null);
  const save = () => {
    const n = parseFloat(v);
    if (!srFin(n)) { const el = document.getElementById('rs-read-v'); if (el) el.focus(); return; }
    const t = Date.now() - ago * 60000;
    if (!srLogReading(c.season, sensor, toStore ? toStore(n) : n, t)) { setFail(SR_WRITE_FAIL || 'locked'); return; }
    onSaved && onSaved(n, t); srToast(rt(L, 'readingSaved', { v: fmt(n, dp), u: unit })); onClose();
  };
  return (
    <RsSheet title={title} onClose={onClose} id="rs-reading">
      <RsStepper id="rs-read-v" value={v} onChange={setV} steps={steps} dp={dp} unit={unit} label={title} min={min} max={max} base={base} ph={base != null ? fmt(base, dp) : undefined} />
      <label className="rs-fl">{rt(L, 'readWhen')}</label>
      <RsChips label={rt(L, 'readWhen')} value={ago} onChange={setAgo} options={[[0, rt(L, 'justNow')], [30, rt(L, 'minAgo', { n: 30 })], [60, rt(L, 'hAgo1')], [120, rt(L, 'hAgoN', { n: 2 })]]} />
      <div className="rs-sheetfoot">
        {fail && <div className="rs-banner bad rs-sheetfail" role="alert">
          <span className="rs-bic"><RsIcon name="alert" size={24} sw={2.4} /></span>
          <span className="rs-bt"><b>{rt(L, 'bNotSavedT')}</b><span>{rt(L, fail === 'quota' ? 'bQuotaP' : 'bLockedP')}</span></span>
          {fail !== 'quota' && <button type="button" className="rs-bbtn" onClick={() => { onClose(); c.setShowLicense(true); }}>{rt(L, 'bEnterKey')}</button>}
        </div>}
        <RsBtn onClick={save} id="rs-read-save">{v !== '' && srFin(parseFloat(v)) ? rt(L, 'saveReadingV', { v: fmt(parseFloat(v), dp), u: unit }) : rt(L, 'saveReading')}</RsBtn>
      </div>
    </RsSheet>
  );
}
function RsSheetFail({ c, fail, onClose }) {
  const L = c.lang;
  if (!fail) return null;
  return <div className="rs-banner bad rs-sheetfail" role="alert">
    <span className="rs-bic"><RsIcon name="alert" size={24} sw={2.4} /></span>
    <span className="rs-bt"><b>{rt(L, 'bNotSavedT')}</b><span>{rt(L, fail === 'quota' ? 'bQuotaP' : 'bLockedP')}</span></span>
    {fail !== 'quota' && <button type="button" className="rs-bbtn" onClick={() => { onClose && onClose(); c.setShowLicense(true); }}>{rt(L, 'bEnterKey')}</button>}
  </div>;
}

// ── Add or change a pump ─────────────────────────────────────────────────────
// Generator defaults are DESIGN.md D5's unsourced numbers (6.6 gal tank,
// 0.34 gal an hour), shown as defaults to check against his manual.
function RsPumpSheet({ c, model, pump, pinId, onClose }) {
  const L = c.lang, u = srU(c.units);
  const [kind, setKind] = useState(pump ? pump.kind : 'vacuum');
  const [name, setName] = useState(pump ? pump.name : '');
  const [where, setWhere] = useState(pump ? pump.where || '' : '');
  const [pin, setPin] = useState(pump ? pump.pinId : pinId);
  const [lines, setLines] = useState(pump ? srArr(pump.lineIds).map(String) : []);
  const [tank, setTank] = useState(pump ? pump.tankId : null);
  const [cap, setCap] = useState(pump && pump.fuelCapGal != null ? String(+fromGal(pump.fuelCapGal, c.units).toFixed(1)) : '');
  const [burn, setBurn] = useState(pump && pump.burnGalH != null ? String(+fromGal(pump.burnGalH, c.units).toFixed(2)) : '');
  const [svc, setSvc] = useState(pump && pump.serviceEveryH != null ? String(pump.serviceEveryH) : '');
  const [gph, setGph] = useState(pump && pump.gph != null ? String(+fromGal(pump.gph, c.units).toFixed(0)) : '');
  const [fail, setFail] = useState(null);
  const defName = rt(L, 'kindName_' + kind);
  const pins = model.pins.filter(p => ['pump', 'sugarhouse', 'tank', 'marker', 'junction'].includes(p.type));
  const gen = kind === 'generator';
  const save = () => {
    const f = { kind, name: name.trim() || defName, where: where.trim(), pinId: pin || null, lineIds: kind === 'vacuum' ? lines : [], tankId: ['transfer', 'ro'].includes(kind) ? tank : null,
      fuelCapGal: gen ? (cap !== '' ? toGal(parseFloat(cap), c.units) : 6.6) : (cap !== '' ? toGal(parseFloat(cap), c.units) : null),
      burnGalH: gen ? (burn !== '' ? toGal(parseFloat(burn), c.units) : 0.34) : (burn !== '' ? toGal(parseFloat(burn), c.units) : null),
      serviceEveryH: svc !== '' ? parseFloat(svc) : null,
      gph: kind === 'ro' && gph !== '' ? toGal(parseFloat(gph), c.units) : (pump ? pump.gph : null) };
    const p = pump ? { ...pump, ...f } : srNewPump(f, Date.now());
    if (!(pump ? srPatchPump(pump.id, f) : srSavePump(p))) { setFail(SR_WRITE_FAIL || 'locked'); return; }
    srToast(rt(L, pump ? 'pumpSaved' : 'pumpAdded', { n: p.name })); onClose();
  };
  return (
    <RsSheet title={pump ? rt(L, 'changePump') : rt(L, 'addPump')} onClose={onClose} id="rs-pump-sheet">
      {!pump && <><label className="rs-fl">{rt(L, 'pumpKind')}</label>
        <RsSeg label={rt(L, 'pumpKind')} wrap value={kind} onChange={setKind} options={SR_PUMP_KINDS.map(k => [k, rt(L, 'kind_' + k)])} /></>}
      <label className="rs-fl" htmlFor="rs-pump-name" style={{ marginTop: 14 }}>{rt(L, 'nameWord')}</label>
      <input id="rs-pump-name" className="rs-field" value={name} placeholder={defName} onChange={e => setName(e.target.value)} />
      <label className="rs-fl" htmlFor="rs-pump-where" style={{ marginTop: 14 }}>{rt(L, 'whereOpt')}</label>
      <input id="rs-pump-where" className="rs-field" value={where} placeholder={rt(L, 'wherePh')} onChange={e => setWhere(e.target.value)} />
      {pins.length > 0 && <><label className="rs-fl" style={{ marginTop: 14 }}>{rt(L, 'onTheMapW')}</label>
        <RsChips label={rt(L, 'onTheMapW')} value={pin} onChange={setPin} options={[[null, rt(L, 'notOnMap')], ...pins.map(p => [p.id, p.label])]} /></>}
      {kind === 'vacuum' && model.lines.length > 0 && <><label className="rs-fl" style={{ marginTop: 14 }}>{rt(L, 'linesServed')}</label>
        <div className="rs-chips" role="group" aria-label={rt(L, 'linesServed')}>
          {model.lines.map(l => { const on = lines.includes(l.id); return <button key={l.id} type="button" className={`rs-chip${on ? ' on' : ''}`} aria-pressed={on}
            onClick={() => setLines(on ? lines.filter(x => x !== l.id) : [...lines, l.id])}>{l.label}</button>; })}
        </div></>}
      {['transfer', 'ro'].includes(kind) && model.tanksRaw.length > 0 && <><label className="rs-fl" style={{ marginTop: 14 }}>{rt(L, 'tankLinked')}</label>
        <RsChips label={rt(L, 'tankLinked')} value={tank} onChange={setTank} options={[[null, rt(L, 'noneW')], ...model.tanksRaw.map(t => [t.id, t.name])]} /></>}
      {gen && <div className="rs-grid2" style={{ marginTop: 14 }}>
        <div><label className="rs-fl" htmlFor="rs-gen-cap">{rt(L, 'fuelTank', { u })}</label>
          <RsStepper id="rs-gen-cap" value={cap} onChange={setCap} steps={[-1, 1]} dp={1} unit={u} label={rt(L, 'fuelTank', { u })} min={0} max={500} big={false} ph={fmt(fromGal(6.6, c.units), 1)} /></div>
        <div><label className="rs-fl" htmlFor="rs-gen-burn">{rt(L, 'burnRate', { u })}</label>
          <RsStepper id="rs-gen-burn" value={burn} onChange={setBurn} steps={[-0.05, 0.05]} dp={2} unit={rt(L, 'perH', { u })} label={rt(L, 'burnRate', { u })} min={0} max={20} big={false} ph={fmt(fromGal(0.34, c.units), 2)} /></div>
      </div>}
      {kind === 'ro' && <><label className="rs-fl" htmlFor="rs-ro-gph" style={{ marginTop: 14 }}>{rt(L, 'roRate', { u })}</label>
        <RsStepper id="rs-ro-gph" value={gph} onChange={setGph} steps={[-50, -10, 10, 50]} dp={0} unit={rt(L, 'perH', { u })} label={rt(L, 'roRate', { u })} min={0} max={20000} big={false} ph={c.units === 'L' ? '946' : '250'} />
        <p className="rs-note">{rt(L, 'roRateNote')}</p></>}
      {gen && <p className="rs-note">{rt(L, 'genDefaults', { c: fmt(fromGal(6.6, c.units), 1), b: fmt(fromGal(0.34, c.units), 2), u })}</p>}
      <label className="rs-fl" htmlFor="rs-pump-svc" style={{ marginTop: 14 }}>{rt(L, 'serviceEvery')}</label>
      <RsStepper id="rs-pump-svc" value={svc} onChange={setSvc} steps={[-10, 10]} dp={0} unit="h" label={rt(L, 'serviceEvery')} min={0} max={5000} big={false} base={250} />
      <p className="rs-note">{rt(L, 'serviceNote')}</p>
      <div className="rs-sheetfoot">
        <RsSheetFail c={c} fail={fail} onClose={onClose} />
        <RsBtn onClick={save} id="rs-pump-save">{pump ? rt(L, 'saveChange') : rt(L, 'addNamed', { n: name.trim() || defName })}</RsBtn>
      </div>
    </RsSheet>
  );
}

// ── Pump detail ──────────────────────────────────────────────────────────────
function RsPumpScreen({ c, id }) {
  const L = c.lang, u = srU(c.units);
  const model = useSrOps(c);
  const p = model.pumps.find(x => x.id === id);
  const [sheet, setSheet] = useState(null);   // 'run' | 'fault' | 'fuel' | 'service' | 'edit' | 'read'
  const [fail, setFail] = useState(null);
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const tm = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(tm); }, [armed]);
  if (!p) return (
    <div className="rs-inner"><RsSubHead c={c} back="pumps" backLabel={rt(L, 'pumpsTitle')} title={rt(L, 'pumpGoneT')} />
      <div className="rs-empty"><p>{rt(L, 'pumpGoneP')}</p><RsBtn kind="secondary" href={rsHref('pumps')}>{rt(L, 'backToPumps')}</RsBtn></div></div>);
  const now = model.now;
  const setStatus = (st, note, startMs) => { if (!srSetPumpStatus(p.id, st, note, Date.now(), startMs)) { setFail(SR_WRITE_FAIL || 'locked'); return false; } setFail(null); srToast(rt(L, 'st_' + st + '_saved', { n: p.name })); return true; };
  const del = () => { if (!armed) { setArmed(true); return; } if (!srRemovePump(p.id)) { setFail(SR_WRITE_FAIL || 'locked'); return; } rsGo('pumps'); srToast(rt(L, 'pumpRemoved', { n: p.name })); };
  const primary = p.status === 'running' ? <RsBtn onClick={() => setStatus('stopped', '')} id="rs-pump-stop" icon="x">{rt(L, 'markStopped')}</RsBtn>
    : p.status === 'fault' ? <RsBtn onClick={() => setSheet('run')} id="rs-pump-fixed" icon="check">{rt(L, 'runningAgain')}</RsBtn>
    : <RsBtn onClick={() => setSheet('run')} id="rs-pump-start" icon="drop">{rt(L, 'markRunning')}</RsBtn>;
  const lines = model.lines.filter(l => srArr(p.lineIds).map(String).includes(l.id));
  const tank = p.tankId ? model.tanks.find(t => t.id === p.tankId) : null;
  const events = p.events.filter(e => e.kind === 'status' || e.kind === 'fuel' || e.kind === 'service').slice().sort((a, b) => Date.parse(b.t) - Date.parse(a.t)).slice(0, 8);
  const fuelPct = p.fuel && p.fuel.pct != null ? p.fuel.pct * 100 : null;
  return (
    <>
      <div className="rs-inner rs-pumpdetail">
        <header className="rs-phead">
          <RsPushBar href={rsHref('pumps')} label={rt(L, 'pumpsTitle')} />
          <div className="rs-eyebrow plain">{rt(L, 'kind_' + p.kind)}{p.where ? ' · ' + p.where : ''}</div>
          <div className="rs-ptitle"><RsPumpTile p={p} size={56} /><h1 className="sm">{p.name}</h1></div>
        </header>
        <RsBanners c={c} />
        <div className="rs-cols">
          <div>
            <section className={`rs-card rs-statcard ${p.status}`} aria-live="polite">
              <div className="rs-split"><RsPumpStatus p={p} L={L} now={now} still /></div>
              {p.status === 'running' && <div className="rs-huge tn rs-runclock">{srHms(p.runStartMs ? (now - p.runStartMs) / SR_H_MS : 0)}</div>}
              {p.status === 'fault' && p.note && <p className="rs-faultnote">{p.note}</p>}
              <p className="rs-meta">{rt(L, 'statusHonest')}</p>
              <div style={{ marginTop: 12 }}>{primary}</div>
              {p.status !== 'fault' && <div style={{ marginTop: 10 }}><RsBtn kind="secondary" icon="alert" onClick={() => setSheet('fault')}>{rt(L, 'reportFault')}</RsBtn></div>}
              {p.status === 'fault' && <div style={{ marginTop: 10 }}><RsBtn kind="secondary" onClick={() => setStatus('stopped', '')}>{rt(L, 'markStopped')}</RsBtn></div>}
              <RsSheetFail c={c} fail={fail} />
            </section>
            <h2 className="rs-sec">{rt(L, 'runtimeW')}</h2>
            <div className="rs-grid2">
              <RsNum label={rt(L, 'todayWordC')} value={fmt(p.todayH, 1)} unit="h" sub={p.status === 'running' ? rt(L, 'countingNow') : rt(L, 'notRunning')} />
              <RsNum label={rt(L, 'thisSeasonC')} value={fmt(p.seasonH, 1)} unit="h" sub={rt(L, 'sinceJan1')} />
            </div>
            {p.svcLeftH != null && <div className="rs-card" style={{ marginTop: 10 }}>
              <div className="rs-split"><div className="rs-meta">{rt(L, 'serviceDue')}</div><RsSt kind={p.svcLeftH <= 0 ? 'check' : 'ok'}>{p.svcLeftH <= 0 ? rt(L, 'overdueBy', { h: fmt(-p.svcLeftH, 0) }) : rt(L, 'inHours', { h: fmt(p.svcLeftH, 0) })}</RsSt></div>
              <RsBarRow label={rt(L, 'sinceService', { h: fmt(p.sinceSvc, 0) })} value={`${fmt(p.serviceEveryH, 0)} h`} pct={Math.min(100, p.sinceSvc / p.serviceEveryH * 100)} tone={p.svcLeftH <= 0 ? 'bad' : ''} />
            </div>}
            {(p.kind === 'generator' || p.burnGalH > 0) && <>
              <h2 className="rs-sec">{rt(L, 'fuelW')}</h2>
              <div className="rs-card">
                {p.fuel ? <>
                  <div className="rs-split"><div className="rs-meta">{rt(L, 'fuelLeft')}</div>
                    <RsSt kind={p.fuel.hoursLeft != null && p.fuel.hoursLeft <= 4 ? 'check' : 'ok'}>{p.fuel.hoursLeft != null && p.fuel.hoursLeft <= 4 ? rt(L, 'fillSoon') : rt(L, 'fineW')}</RsSt></div>
                  <div className="rs-big tn">{fmt(fromGal(p.fuel.levelGal, c.units), 1)}<small>{p.fuelCapGal ? rt(L, 'ofCap', { c: fmt(fromGal(p.fuelCapGal, c.units), 1), u }) : u}</small></div>
                  {fuelPct != null && <div className="rs-bar" role="presentation"><i style={{ width: fuelPct + '%' }} /></div>}
                  <RsKv rows={[
                    [rt(L, 'burning'), rt(L, 'perHourV', { v: fmt(fromGal(p.burnGalH || 0, c.units), 2), u })],
                    p.fuel.hoursLeft != null ? [rt(L, 'runsFor'), srDur(p.fuel.hoursLeft, L)] : null,
                    p.fuel.emptyAtMs ? [rt(L, 'dryNear'), srWhenAhead(p.fuel.emptyAtMs, now, L)] : [rt(L, 'dryNear'), rt(L, 'whenRunning')],
                    [rt(L, 'lastFill'), `${srDayLabel(srIsoOf(new Date(p.fuel.sinceMs)), L)}, ${srClock(p.fuel.sinceMs, L)}`],
                  ]} />
                  <p className="rs-note">{rt(L, 'fuelHow')}</p>
                </> : <p className="rs-meta">{rt(L, 'noFuelLogged')}</p>}
                <div style={{ marginTop: 12 }}><RsBtn kind="secondary" icon="fuel" onClick={() => setSheet('fuel')} id="rs-log-fuel">{rt(L, 'logFuel')}</RsBtn></div>
              </div>
            </>}
            {p.kind === 'vacuum' && <>
              <h2 className="rs-sec">{rt(L, 'releaserVac')}</h2>
              <div className="rs-card">
                <div className="rs-split" style={{ alignItems: 'baseline' }}>
                  <div className="rs-big tn">{p.vac ? fmt(p.vac.v, 1) : '·'}<small>{p.vac ? 'in' : ''}</small></div>
                  <span className="rs-fresh">{p.vac ? rt(L, 'readAgoShort', { a: srAgo(p.vac.ms, now, L) }) : rt(L, 'noReadingYet')}</span></div>
                <div style={{ marginTop: 12 }}><RsBtn kind="secondary" icon="gauge" onClick={() => setSheet('read')}>{rt(L, 'logReleaser')}</RsBtn></div>
              </div>
              {lines.length > 0 && <><h2 className="rs-sec">{rt(L, 'linesServed')}</h2>
                <div className="rs-list">{lines.map(l => <a key={l.id} className="rs-row" href={rsHref('bush/line/' + l.id)}><RsLinePlate l={l} />
                  <span className="rs-rt"><b>{l.label}</b><span className="tn">{l.latest ? rt(L, 'readAgoShort', { a: srAgo(l.latest.ms, now, L) }) : rt(L, 'noReadingYet')}</span></span>
                  <RsVacValue l={l} L={L} /></a>)}</div></>}
            </>}
            {tank && <><h2 className="rs-sec">{rt(L, 'tankLinked')}</h2>
              <div className="rs-list"><RsRow icon="tank" family="collect" title={tank.name} href={rsHref('pumps/tank/' + tank.id)}
                sub={tank.levelGal != null ? rt(L, 'tankLine', { v: srVol(tank.levelGal, c.units), u, p: tank.capGal > 0 ? Math.round(tank.levelGal / tank.capGal * 100) : 0 }) : rt(L, 'noLevelYet')} /></div></>}
          </div>
          <div>
            <h2 className="rs-sec">{rt(L, 'serviceParts')}</h2>
            <div className="rs-list">
              {p.services.length ? p.services.slice(0, 5).map(s => <RsRow key={s.id} icon="wrench" family="power" chev={false} title={s.what || rt(L, 'serviceW')}
                sub={[`${srDayLabel(srIsoOf(new Date(Date.parse(s.t))), L)}`, s.hoursAt != null ? rt(L, 'atHours', { h: fmt(s.hoursAt, 0) }) : null, s.parts || null].filter(Boolean).join(' · ')} />)
                : <div className="rs-row" style={{ minHeight: 64 }}><span className="rs-rt"><b>{rt(L, 'noServiceT')}</b><span>{rt(L, 'noServiceP')}</span></span></div>}
            </div>
            <div style={{ marginTop: 10 }}><RsBtn kind="secondary" icon="wrench" onClick={() => setSheet('service')} id="rs-log-service">{rt(L, 'logService')}</RsBtn></div>
            <RsParts c={c} p={p} onFail={setFail} />
            <h2 className="rs-sec">{rt(L, 'historyW')}</h2>
            {events.length ? <div className="rs-list">{events.map(e => <div key={e.id} className="rs-row rs-evrow"><span className="rs-rt">
              <b>{e.kind === 'status' ? rt(L, 'ev_' + e.status) : e.kind === 'fuel' ? rt(L, 'evFuel', { v: fmt(fromGal(parseFloat(e.level) || 0, c.units), 1), u }) : rt(L, 'evService', { w: e.what || rt(L, 'serviceW') })}</b>
              <span className="tn">{srDayLabel(srIsoOf(new Date(Date.parse(e.t))), L)}, {srClock(Date.parse(e.t), L)}{e.note ? ' · ' + e.note : ''}</span></span></div>)}</div>
              : <p className="rs-meta">{rt(L, 'noHistory')}</p>}
            <div className="rs-btnrow" style={{ marginTop: 16 }}>
              <RsBtn kind="secondary" icon="pen" onClick={() => setSheet('edit')}>{rt(L, 'changePump')}</RsBtn>
              <RsBtn kind="bad" onClick={del}>{rt(L, armed ? 'tapAgainDelete' : 'removePump')}</RsBtn>
            </div>
          </div>
        </div>
      </div>
      {sheet === 'run' && <RsRunSheet c={c} p={p} onClose={() => setSheet(null)} onSave={(start) => { if (setStatus('running', '', start)) setSheet(null); }} />}
      {sheet === 'fault' && <RsFaultSheet c={c} p={p} onClose={() => setSheet(null)} onSave={note => { if (setStatus('fault', note)) setSheet(null); }} />}
      {sheet === 'fuel' && <RsFuelSheet c={c} p={p} onClose={() => setSheet(null)} />}
      {sheet === 'service' && <RsServiceSheet c={c} p={p} onClose={() => setSheet(null)} />}
      {sheet === 'edit' && <RsPumpSheet c={c} model={model} pump={p} onClose={() => setSheet(null)} />}
      {sheet === 'read' && <RsReadingSheet c={c} title={rt(L, 'releaserOf', { n: p.name })} unit="in" dp={1} steps={[-1, -0.1, 0.1, 1]} min={0} max={30}
        base={p.vac ? p.vac.v : 25} sensor={{ id: srSensorId('pump', p.id), quantity: 'vacuum', target: { type: 'pump', id: p.id }, unit: 'inHg' }} onClose={() => setSheet(null)} />}
    </>
  );
}
function RsRunSheet({ c, p, onClose, onSave }) {
  const L = c.lang;
  const [ago, setAgo] = useState(0);
  return (
    <RsSheet title={rt(L, 'markRunningN', { n: p.name })} onClose={onClose} id="rs-run-sheet">
      <label className="rs-fl">{rt(L, 'startedW')}</label>
      <RsChips label={rt(L, 'startedW')} value={ago} onChange={setAgo} options={[[0, rt(L, 'justNow')], [15, rt(L, 'minAgo', { n: 15 })], [30, rt(L, 'minAgo', { n: 30 })], [60, rt(L, 'hAgo1')]]} />
      <p className="rs-note">{rt(L, 'runClockNote')}</p>
      <div className="rs-sheetfoot"><RsBtn onClick={() => onSave(Date.now() - ago * 60000)} id="rs-run-save">{rt(L, 'startClock')}</RsBtn></div>
    </RsSheet>
  );
}
function RsFaultSheet({ c, p, onClose, onSave }) {
  const L = c.lang;
  const [note, setNote] = useState('');
  const quick = ['faultPrime', 'faultIce', 'faultPower', 'faultOil'];
  return (
    <RsSheet title={rt(L, 'faultOn', { n: p.name })} onClose={onClose} id="rs-fault-sheet">
      <label className="rs-fl">{rt(L, 'whatsWrong')}</label>
      <div className="rs-chips" role="group" aria-label={rt(L, 'whatsWrong')}>
        {quick.map(k => <button key={k} type="button" className={`rs-chip${note === rt(L, k) ? ' on' : ''}`} aria-pressed={note === rt(L, k)} onClick={() => setNote(rt(L, k))}>{rt(L, k)}</button>)}
      </div>
      <label className="rs-fl" htmlFor="rs-fault-note" style={{ marginTop: 14 }}>{rt(L, 'noteOpt')}</label>
      <input id="rs-fault-note" className="rs-field" value={note} onChange={e => setNote(e.target.value)} placeholder={rt(L, 'faultPh')} />
      <div className="rs-sheetfoot"><RsBtn kind="primary" onClick={() => onSave(note.trim())} id="rs-fault-save">{rt(L, 'markFault')}</RsBtn></div>
    </RsSheet>
  );
}
function RsFuelSheet({ c, p, onClose }) {
  const L = c.lang, u = srU(c.units);
  const cap = p.fuelCapGal ? fromGal(p.fuelCapGal, c.units) : null;
  const [v, setV] = useState(cap != null ? String(+cap.toFixed(1)) : '');
  const [fail, setFail] = useState(null);
  const save = () => {
    const n = parseFloat(v); if (!(n >= 0)) { const el = document.getElementById('rs-fuel-v'); if (el) el.focus(); return; }
    const level = toGal(n, c.units);
    const before = p.fuel ? p.fuel.levelGal : null;
    if (!srLogPumpEvent({ pumpId: p.id, kind: 'fuel', t: new Date().toISOString(), level, added: before != null ? Math.max(0, level - before) : null })) { setFail(SR_WRITE_FAIL || 'locked'); return; }
    srToast(rt(L, 'fuelSaved', { v: fmt(n, 1), u })); onClose();
  };
  return (
    <RsSheet title={rt(L, 'logFuelN', { n: p.name })} onClose={onClose} id="rs-fuel-sheet">
      <label className="rs-fl" htmlFor="rs-fuel-v">{rt(L, 'fuelNow')}</label>
      <RsStepper id="rs-fuel-v" value={v} onChange={setV} steps={[-1, -0.1, 0.1, 1]} dp={1} unit={u} label={rt(L, 'fuelNow')} min={0} max={cap || 500} />
      {cap != null && <div style={{ marginTop: 10 }}><RsChips label={rt(L, 'quickFill')} value={v === String(+cap.toFixed(1)) ? 'full' : null} onChange={() => setV(String(+cap.toFixed(1)))} options={[['full', rt(L, 'filledFull', { c: fmt(cap, 1), u })]]} /></div>}
      <p className="rs-note">{rt(L, 'fuelSheetNote')}</p>
      <div className="rs-sheetfoot"><RsSheetFail c={c} fail={fail} onClose={onClose} />
        <RsBtn onClick={save} id="rs-fuel-save">{rt(L, 'saveFuelV', { v: fmt(parseFloat(v) || 0, 1), u })}</RsBtn></div>
    </RsSheet>
  );
}
function RsServiceSheet({ c, p, onClose }) {
  const L = c.lang;
  const [what, setWhat] = useState('');
  const [parts, setParts] = useState('');
  const [fail, setFail] = useState(null);
  const quick = ['svcOil', 'svcFilter', 'svcBelt', 'svcClean'];
  const save = () => {
    const w = what.trim(); if (!w) { const el = document.getElementById('rs-svc-what'); if (el) el.focus(); return; }
    if (!srLogPumpEvent({ pumpId: p.id, kind: 'service', t: new Date().toISOString(), what: w, parts: parts.trim(), hoursAt: Math.round(p.hoursTotal * 10) / 10 })) { setFail(SR_WRITE_FAIL || 'locked'); return; }
    srToast(rt(L, 'serviceSaved')); onClose();
  };
  return (
    <RsSheet title={rt(L, 'logServiceN', { n: p.name })} onClose={onClose} id="rs-svc-sheet">
      <label className="rs-fl" htmlFor="rs-svc-what">{rt(L, 'whatDone')}</label>
      <div className="rs-chips" role="group" aria-label={rt(L, 'whatDone')} style={{ marginBottom: 10 }}>
        {quick.map(k => <button key={k} type="button" className={`rs-chip${what === rt(L, k) ? ' on' : ''}`} aria-pressed={what === rt(L, k)} onClick={() => setWhat(rt(L, k))}>{rt(L, k)}</button>)}
      </div>
      <input id="rs-svc-what" className="rs-field" value={what} onChange={e => setWhat(e.target.value)} placeholder={rt(L, 'svcPh')} />
      <label className="rs-fl" htmlFor="rs-svc-parts" style={{ marginTop: 14 }}>{rt(L, 'partsUsedOpt')}</label>
      <input id="rs-svc-parts" className="rs-field" value={parts} onChange={e => setParts(e.target.value)} placeholder={rt(L, 'partsPh')} />
      <p className="rs-note">{rt(L, 'svcHoursNote', { h: fmt(p.hoursTotal, 1) })}</p>
      <div className="rs-sheetfoot"><RsSheetFail c={c} fail={fail} onClose={onClose} /><RsBtn onClick={save} id="rs-svc-save">{rt(L, 'saveService')}</RsBtn></div>
    </RsSheet>
  );
}
// Parts on hand for a pump: a short list with counts, kept on the pump record.
function RsParts({ c, p, onFail }) {
  const L = c.lang;
  const [name, setName] = useState('');
  const parts = srArr(p.parts);
  const put = list => { if (!srPatchPump(p.id, { parts: list })) onFail(SR_WRITE_FAIL || 'locked'); };
  const add = () => { const n = name.trim(); if (!n) return; put([...parts, { name: n, qty: 1 }]); setName(''); };
  return (
    <div className="rs-parts">
      <h3 className="rs-subsec">{rt(L, 'partsOnHand')}</h3>
      {parts.length ? <div className="rs-list">{parts.map((x, i) => (
        <div key={i} className="rs-row rs-partrow"><span className="rs-rt"><b>{x.name}</b></span>
          <span className="rs-qty">
            <button type="button" aria-label={rt(L, 'fewerOf', { n: x.name })} onClick={() => put(x.qty <= 1 ? parts.filter((_, j) => j !== i) : parts.map((y, j) => j === i ? { ...y, qty: y.qty - 1 } : y))}>−</button>
            <b className="tn">{x.qty}</b>
            <button type="button" aria-label={rt(L, 'moreOf', { n: x.name })} onClick={() => put(parts.map((y, j) => j === i ? { ...y, qty: y.qty + 1 } : y))}>+</button>
          </span></div>))}</div>
        : <p className="rs-meta">{rt(L, 'noParts')}</p>}
      <div className="rs-addpart">
        <input className="rs-field" aria-label={rt(L, 'partName')} value={name} placeholder={rt(L, 'partPh')} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
        <button type="button" className="rs-btn2 sm" onClick={add}><RsIcon name="plus" size={20} />{rt(L, 'addW')}</button>
      </div>
    </div>
  );
}

// ── Vacuum and leaks ─────────────────────────────────────────────────────────
function RsVacuumScreen({ c }) {
  const L = c.lang;
  const model = useSrOps(c);
  const [line, setLine] = useState(null);
  const selLine = line ? model.lines.find(l => l.id === line) : null;
  const P = model.prefs;
  const vacPumps = model.pumps.filter(p => p.kind === 'vacuum');
  return (
    <>
      <div className="rs-inner">
        <RsSubHead c={c} back="pumps" backLabel={rt(L, 'pumpsTitle')} eyebrow={rt(L, 'vacAndLeaks')} title={rt(L, 'leakFinder')}
          lede={rt(L, 'leakLede', { l: fmt(P.leakLimitIn, 1), d: fmt(P.baselineDays, 0) })} />
        <RsBanners c={c} />
        <div className="rs-cols">
          <div>
            <RsVacCard c={c} model={model} h={200} />
            <p className="rs-note">{rt(L, 'leakRuleDefault', { l: fmt(P.leakLimitIn, 1) })} <a href={rsHref('shack')} className="rs-inlink">{rt(L, 'changeInShack')}</a></p>
          </div>
          <div>
            <h2 className="rs-sec">{rt(L, 'lineByLine')}</h2>
            {model.lines.length ? <div className="rs-list">{model.lines.map(l => (
              <button key={l.id} type="button" className="rs-row" onClick={() => setLine(l.id)}>
                <RsLinePlate l={l} />
                <span className="rs-rt"><b>{l.label}</b><span className={`tn${l.leak.status === 'suspect' ? ' rs-badtx' : ''}`}>{
                  l.leak.status === 'suspect' ? rt(L, 'leakSuspectD', { d: fmt(l.leak.drop, 1) })
                  : l.leak.status === 'ok' ? rt(L, 'vsBaseline', { b: fmt(l.leak.baseline, 1) })
                  : l.leak.status === 'single' ? rt(L, 'oneReading') : rt(L, 'noReadingYet')}</span></span>
                <RsVacValue l={l} L={L} />
              </button>))}</div>
              : <div className="rs-empty"><b>{rt(L, 'noLinesT')}</b><p>{rt(L, 'noLinesBush')}</p></div>}
            {vacPumps.length > 0 && <><h2 className="rs-sec">{rt(L, 'releaserVac')}</h2>
              <div className="rs-list">{vacPumps.map(p => <a key={p.id} className="rs-row" href={rsHref('pumps/' + p.id)}><RsPumpTile p={p} />
                <span className="rs-rt"><b>{p.name}</b><RsPumpStatus p={p} L={L} now={model.now} /></span>
                <span className="rs-rv tn">{p.vac ? <>{fmt(p.vac.v, 1)}<small> in</small></> : rt(L, 'noReadingW')}</span></a>)}</div></>}
            <h3 className="rs-subsec">{rt(L, 'lookFor')}</h3>
            <div className="rs-list">{['look1', 'look2', 'look3', 'look4'].map(k => <div key={k} className="rs-row" style={{ minHeight: 56 }}><span className="rs-rt"><b>{rt(L, k)}</b></span></div>)}</div>
          </div>
        </div>
      </div>
      {selLine && <RsSheet title={selLine.label} onClose={() => setLine(null)} id="rs-line-sheet"><RsLineDetail c={c} model={model} line={selLine} onClose={() => setLine(null)} /></RsSheet>}
    </>
  );
}

// ── Freeze prep, tied to tonight's forecast low ──────────────────────────────
function RsFreezeScreen({ c }) {
  const L = c.lang;
  const model = useSrOps(c);
  const loc = React.useMemo(() => selLocation(), []);
  const wx = useSrWx(loc, 0);
  const prep = srPrepState(model, wx.data);
  const [fail, setFail] = useState(null);
  const P = model.prefs;
  const write = done => { if (!srOpsSet('sg_freeze_prep', { night: prep.night, done })) { setFail(SR_WRITE_FAIL || 'locked'); return; } setFail(null); };
  const toggle = id => write({ ...prep.done, [id]: !prep.done[id] });
  const all = () => write(Object.fromEntries(prep.items.map(i => [i.id, true])));
  const left = prep.items.length - prep.nDone;
  const title = !loc ? rt(L, 'freezeNoPlace') : wx.status === 'loading' ? rt(L, 'freezeLoading') : wx.status === 'error' ? rt(L, 'freezeErrT')
    : prep.freezing ? (left ? rt(L, 'freezeTonightT') : rt(L, 'readyFreeze')) : rt(L, 'noFreezeT');
  return (
    <div className="rs-inner">
      <RsSubHead c={c} back="pumps" backLabel={rt(L, 'pumpsTitle')} eyebrow={rt(L, 'freezePrep')} title={title} />
      <RsBanners c={c} />
      <div className="rs-cols">
        <div>
          {!loc ? <div className="rs-empty"><b>{rt(L, 'needPlaceT')}</b><p>{rt(L, 'needPlaceP')}</p><RsBtn kind="secondary" href={rsHref('stage/weather/forecast')}>{rt(L, 'setPlace')}</RsBtn></div>
          : wx.status === 'loading' ? <div className="rs-card"><div className="rs-sk" style={{ height: 96 }} /></div>
          : wx.status === 'error' ? <div className="rs-err"><b>{rt(L, 'freezeErrT')}</b><p>{rt(L, 'freezeErrP')}</p><RsBtn kind="secondary" onClick={wx.retry}>{rt(L, 'tryAgain')}</RsBtn></div>
          : <div className={`rs-card rs-lowcard${prep.freezing ? ' ice' : ''}`}>
              <div className="rs-split"><div><div className="rs-meta">{rt(L, 'lowTonight')}</div>
                <div className="rs-big tn">{prep.lo != null ? prep.lo : '·'}<small>°F</small></div></div>
                <RsSt kind={prep.freezing ? 'ice' : 'ok'}>{prep.freezing ? rt(L, 'atOrUnder', { f: P.freezeF }) : rt(L, 'aboveF', { f: P.freezeF })}</RsSt></div>
              <p className="rs-note">{rt(L, 'freezeRule', { f: P.freezeF })}</p>
            </div>}
        </div>
        <div>
          <h2 className="rs-sec">{prep.items.length ? rt(L, 'beforeFreeze', { d: prep.nDone, t: prep.items.length }) : rt(L, 'beforeFreeze0')}</h2>
          {prep.items.length ? <div className="rs-list">{prep.items.map(i => (
            <button key={i.id} type="button" className={`rs-row rs-chk${prep.done[i.id] ? ' on' : ''}`} aria-pressed={!!prep.done[i.id]} onClick={() => toggle(i.id)}>
              <span className="rs-box"><RsIcon name="check" size={18} sw={3} /></span>
              <span className="rs-rt"><b>{rt(L, i.key, { n: i.name || '' })}</b><span>{rt(L, i.key + 'S')}</span></span></button>))}</div>
            : <div className="rs-empty"><b>{rt(L, 'noPumpsFreezeT')}</b><p>{rt(L, 'noPumpsFreezeP')}</p><RsBtn kind="secondary" href={rsHref('pumps/add')}>{rt(L, 'addPump')}</RsBtn></div>}
          <RsSheetFail c={c} fail={fail} />
          {prep.items.length > 0 && left > 0 && <div style={{ marginTop: 16 }}><RsBtn onClick={all} id="rs-freeze-all" icon="check">{rt(L, 'markAllDone')}</RsBtn></div>}
          <p className="rs-note">{rt(L, 'prepResets')}</p>
        </div>
      </div>
    </div>
  );
}

// ── Tanks ────────────────────────────────────────────────────────────────────
function RsTankSheet({ c, model, tank, pinId, onClose }) {
  const L = c.lang, u = srU(c.units);
  const tankPins = model.pins.filter(p => p.type === 'tank');
  const pin0 = pinId != null ? tankPins.find(p => p.id === pinId) : null;
  const [name, setName] = useState(tank ? tank.name : pin0 ? pin0.label : '');
  const [cap, setCap] = useState(tank ? String(+fromGal(tank.capGal, c.units).toFixed(0)) : '');
  const [role, setRole] = useState(tank ? tank.role || 'collection' : 'collection');
  const [pin, setPin] = useState(tank ? tank.pinId : pinId);
  const [fail, setFail] = useState(null);
  const save = () => {
    const cp = parseFloat(cap); if (!(cp > 0)) { const el = document.getElementById('rs-tank-cap'); if (el) el.focus(); return; }
    const t = { id: tank ? tank.id : srUid('t'), name: name.trim() || rt(L, 'tankN', { n: model.tanksRaw.length + 1 }), role, capGal: Math.round(toGal(cp, c.units) * 10) / 10, pinId: pin || null };
    if (!srSaveTank(t)) { setFail(SR_WRITE_FAIL || 'locked'); return; }
    srToast(rt(L, tank ? 'tankSaved' : 'tankAdded', { n: t.name })); onClose();
  };
  return (
    <RsSheet title={tank ? rt(L, 'changeTank') : rt(L, 'addTank')} onClose={onClose} id="rs-tank-sheet">
      <label className="rs-fl" htmlFor="rs-tank-name">{rt(L, 'nameWord')}</label>
      <input id="rs-tank-name" className="rs-field" value={name} placeholder={rt(L, 'tankN', { n: model.tanksRaw.length + 1 })} onChange={e => setName(e.target.value)} />
      <label className="rs-fl" htmlFor="rs-tank-cap" style={{ marginTop: 14 }}>{rt(L, 'capacityU', { u })}</label>
      <RsStepper id="rs-tank-cap" value={cap} onChange={setCap} steps={[-100, -10, 10, 100]} dp={0} unit={u} label={rt(L, 'capacityU', { u })} min={0} max={100000} ph={c.units === 'L' ? '3785' : '1000'} />
      <label className="rs-fl">{rt(L, 'tankRole')}</label>
      <RsSeg label={rt(L, 'tankRole')} value={role} onChange={setRole} options={[['collection', rt(L, 'roleCollection')], ['storage', rt(L, 'roleStorage')], ['concentrate', rt(L, 'roleConc')]]} wrap />
      {tankPins.length > 0 && <><label className="rs-fl" style={{ marginTop: 14 }}>{rt(L, 'onTheMapW')}</label>
        <RsChips label={rt(L, 'onTheMapW')} value={pin} onChange={setPin} options={[[null, rt(L, 'notOnMap')], ...tankPins.map(p => [p.id, p.label])]} /></>}
      <div className="rs-sheetfoot"><RsSheetFail c={c} fail={fail} onClose={onClose} /><RsBtn onClick={save} id="rs-tank-save">{tank ? rt(L, 'saveChange') : rt(L, 'addTank')}</RsBtn></div>
    </RsSheet>
  );
}
function RsTankScreen({ c, id }) {
  const L = c.lang, u = srU(c.units);
  const model = useSrOps(c);
  const raw = model.tanksRaw.find(t => t.id === id);
  const t = model.tanks.find(x => x.id === id);
  const [sheet, setSheet] = useState(null);
  if (!raw || !t) return (
    <div className="rs-inner"><RsSubHead c={c} back="pumps" backLabel={rt(L, 'pumpsTitle')} title={rt(L, 'tankGoneT')} />
      <div className="rs-empty"><p>{rt(L, 'tankGoneP')}</p><RsBtn kind="secondary" href={rsHref('pumps')}>{rt(L, 'backToPumps')}</RsBtn></div></div>);
  const sid = srSensorId('tank', id);
  const hist = model.src.history(sid).slice(-8).reverse();
  const pct = t.levelGal != null && t.capGal > 0 ? Math.round(t.levelGal / t.capGal * 100) : null;
  const plan = t.levelGal != null ? srRoPlan({ levelGal: t.levelGal, capGal: t.capGal, fillGalH: t.fillGalH, roGph: null }) : null;
  return (
    <>
      <RsHero photo="sap-tank" />
      <div className="rs-inner">
        <RsSubHead c={c} back="pumps" backLabel={rt(L, 'pumpsTitle')} eyebrow={rt(L, 'role_' + (raw.role || 'collection'))} title={raw.name} />
        <RsBanners c={c} />
        <div className="rs-cols">
          <div>
            <div className="rs-card rs-tankbig">
              <RsTankViz level={t.levelGal} cap={t.capGal} w={120} h={188} tone={raw.role === 'concentrate' ? 'conc' : 'sap'} empty={t.levelGal == null} />
              <div className="rs-tc">
                <span className="rs-v tn">{t.levelGal != null ? srVol(t.levelGal, c.units) : '·'}<small>{u}</small></span>
                <span className="rs-pctline tn">{pct != null ? <><b>{pct}%</b> {rt(L, 'fullOf', { c: srVol(t.capGal, c.units), u })}</> : rt(L, 'noLevelYet')}</span>
                <RsKv rows={[
                  t.fillGalH ? [rt(L, 'filling'), `+${srVol(t.fillGalH, c.units)} ${u}/h`] : null,
                  plan && plan.fullH != null ? [rt(L, 'fullAt'), srClock(Date.now() + plan.fullH * 3600000, L)] : null,
                ]} />
                {t.readMs && <span className="rs-fresh"><RsIcon name="clock" size={13} />{rt(L, 'readAgo', { a: srAgo(t.readMs, model.now, L), t: srClock(t.readMs, L) })}</span>}
              </div>
            </div>
            <div style={{ marginTop: 14 }}><RsBtn icon="tank" onClick={() => setSheet('read')} id="rs-tank-read">{rt(L, 'logLevel')}</RsBtn></div>
            <p className="rs-note">{rt(L, 'tankRateNote')}</p>
          </div>
          <div>
            <h2 className="rs-sec">{rt(L, 'recentLevels')}</h2>
            {hist.length ? <div className="rs-list">{hist.map((r, i) => <RsRow key={i} chev={false} title={`${srVol(r.v, c.units)} ${u}`}
              sub={`${srDayLabel(srIsoOf(new Date(r.ms)), L)}, ${srClock(r.ms, L)}`} />)}</div> : <p className="rs-meta">{rt(L, 'noLevelsP')}</p>}
            <div style={{ marginTop: 14 }}><RsBtn kind="secondary" icon="pen" onClick={() => setSheet('edit')}>{rt(L, 'changeTank')}</RsBtn></div>
          </div>
        </div>
      </div>
      {sheet === 'read' && <RsReadingSheet c={c} title={rt(L, 'levelOf', { n: raw.name })} unit={u} dp={0} steps={[-50, -10, 10, 50]} min={0} max={fromGal(t.capGal, c.units) || 100000}
        base={t.levelGal != null ? +fromGal(t.levelGal, c.units).toFixed(0) : 0} toStore={n => Math.round(toGal(n, c.units) * 10) / 10}
        sensor={{ id: sid, quantity: 'level', target: { type: 'tank', id }, unit: 'gal' }} onClose={() => setSheet(null)} />}
      {sheet === 'edit' && <RsTankSheet c={c} model={model} tank={raw} onClose={() => setSheet(null)} />}
    </>
  );
}

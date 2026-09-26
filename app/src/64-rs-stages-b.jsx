// ─── Stage screens 4-5 (Phase 6): Collect & RO, Boil; RO planner, Draw-off,
// DE calculator, batches, Brix reading ─────────────────────────────────────
// Real formulas only: roConc, boilTime, rule86, syrupY, finTemp, denCorr,
// altToBP, presToBP, brixToBe/beToBrix, srBoilState, srDeCups (FinishTab's
// math lifted verbatim). RULE_DIVISOR stays 86.4 (decision D1 open).

// Temperatures follow the Boil Day rule: litres -> °C primary, stored in °F.
const srTempU = units => units === 'L' ? '°C' : '°F';
const srTempD = (f, units) => units === 'L' ? (f - 32) * 5 / 9 : f;

function RsEntryRows({ c, entries }) {
  const L = c.lang, kinds = srKinds(L, c.units);
  return <div className="rs-list">{entries.map(e => { const k = kinds.find(x => x.k === e.kind);
    return <RsRow key={e.kind + e.id} icon={k.icon} family={e.kind === 'syrupMade' || e.kind === 'sapEvap' || e.kind === 'boilHours' ? 'boil' : e.kind === 'fuelUsed' ? 'power' : 'collect'}
      title={`${fmt(e.val, k.dp)} ${k.unit} · ${k.l.toLowerCase()}`} sub={[e.grade && e.grade !== '—' ? srGradeLabel(e.grade, L) : null, e.brix != null ? `${fmt(e.brix, 1)} Brix` : null, e.note || null].filter(Boolean).join(' · ') || rt(L,'today')}
      href={rsHref('shack/log')} />; })}</div>;
}

// ── 4 · Collect & RO ─────────────────────────────────────────────────────────
function RsCollectStage({ c, openLog }) {
  const L = c.lang, u = srU(c.units);
  const m = useRsSeasonModel(c);
  const [brixSheet, setBrixSheet] = useState(false);
  const roB = parseFloat(ls.get('sg_dx_robrix', 8)) || 8;
  const sapBx = m.brix.brix;
  const todayEntries = SR_LOG_KINDS.flatMap(k => (m.d.slog[k] || []).map(e => ({ ...e, kind:k })))
    .filter(e => { const p = srDateParts(e.date); return p && srIsoOf(new Date(p.y, p.mo - 1, p.d, 12)) === m.todayIso; })
    .sort((a, b) => (b.id || 0) - (a.id || 0));
  // The RO call: from a tank reading once tanks exist (Phase 8), else from the sap logged today.
  const tank = m.d.tanks.find(t => t.levelGal != null);
  const roOK = roB > sapBx;
  let next;
  if (tank) {
    const pl = srRoPlan({ levelGal:tank.levelGal, capGal:tank.capGal, fillGalH:tank.fillGalH, roGph:null });
    next = { title: rt(L, pl.call === 'now' ? 'roCallNow' : 'roCallKeep'), why: rt(L,'roCallTank', { n:tank.name, v:srVol(tank.levelGal, c.units), c:srVol(tank.capGal, c.units), u }), btn: rt(L,'openRoPlanner'), act: () => rsGo('stage/collect/ro') };
  } else if (m.today.sapVal > 0 && roOK) {
    const conc = roConc(m.today.sapVal, sapBx, roB), syr = syrupY(m.today.sapVal, sapBx);
    next = { title: rt(L,'roTodayT'), why: rt(L,'roTodayW', { v: fmt(m.today.sapVal, 0), u, b: fmt(sapBx, 1), c: fmt(conc, 0), tb: fmt(roB, 0), s: fmt(syr, 1) }),
      btn: rt(L,'openRoPlanner'), act: () => rsGo('stage/collect/ro') };
  } else next = { title: rt(L,'roNoSapT'), why: rt(L,'roNoSapW'), btn: rt(L,'logSap'), act: () => openLog('sapCollected') };
  const bl = m.d.brixlog.filter(e => isFinite(parseFloat(e.brix))).slice().sort((a, b) => (srDateMs(a.date) - srDateMs(b.date)) || ((a.id || 0) - (b.id || 0)));
  return (
    <>
      <RsHero photo="sap-tank" />
      <div className="rs-inner">
        <RsStageHead c={c} id="collect" m={m} lede={rt(L,'collectLede')} />
        <RsBanners c={c} />
        <div className="rs-cols">
          <div>
            <RsTankCard c={c} tanks={m.d.tanks} tankPins={m.d.tankPins} big />
            <div style={{ marginTop:12 }}><RsNextCard eyebrow={rt(L,'theRoCall')} icon="ro" title={next.title} why={next.why} btn={next.btn} onAct={next.act} /></div>
            <h2 className="rs-sec">{rt(L,'brixAtTree')}</h2>
            <div className="rs-card">
              <div className="rs-split">
                <div><div className="rs-meta">{m.brix.from === 'log' ? rt(L,'lastReading', { d: srDateShort(m.brix.date, L) }) : rt(L,'brixSetting')}</div>
                  <div className="rs-big tn">{fmt(sapBx, 1)}<small>%</small></div></div>
                <div style={{ textAlign:'right' }}><div className="rs-meta">{rt(L,'sapForOne', { u })}</div><div className="rs-mid tn">{fmt(rule86(sapBx), 1)} {u}</div></div>
              </div>
              {bl.length >= 2 && <RsLineChart h={120} yMax={Math.ceil(Math.max(...bl.map(e => parseFloat(e.brix))) + 0.5)}
                yTicks={[0, Math.ceil(Math.max(...bl.map(e => parseFloat(e.brix))) + 0.5)]}
                series={[{ v: bl.map(e => parseFloat(e.brix)), c:T.sap, area:true, end: fmt(parseFloat(bl[bl.length - 1].brix), 1) + '%' }]}
                xLabels={[[0, srDateShort(bl[0].date, L)], [bl.length - 1, srDateShort(bl[bl.length - 1].date, L)]]}
                label={rt(L,'brixTrendAria', { n: bl.length })} />}
              <p className="rs-note">{rt(L,'brixNote')}</p>
              <div style={{ marginTop:12 }}><RsBtn kind="secondary" icon="drop" onClick={() => setBrixSheet(true)}>{rt(L,'logBrix')}</RsBtn></div>
            </div>
          </div>
          <div>
            <h2 className="rs-sec">{rt(L,'todaysLog')}</h2>
            {todayEntries.length ? <RsEntryRows c={c} entries={todayEntries.slice(0, 6)} /> :
              <div className="rs-empty"><b>{rt(L,'nothingToday')}</b><p>{rt(L,'nothingTodayP')}</p></div>}
            <div className="rs-btnrow">
              <RsBtn kind="secondary" icon="pail" onClick={() => openLog('sapCollected')}>{rt(L,'logSap')}</RsBtn>
              <RsBtn kind="secondary" icon="ro" onClick={() => openLog('sapRO')}>{rt(L,'logRo')}</RsBtn>
            </div>
            <h2 className="rs-sec">{rt(L,'sapFresh')}</h2>
            <RsFreshCard c={c} />
            <h2 className="rs-sec">{rt(L,'toolsWord')}</h2>
            <div className="rs-list">
              <RsRow icon="ro" family="collect" title={rt(L,'sc_ro')} sub={rt(L,'sc_ro_s')} href={rsHref('stage/collect/ro')} />
              <RsRow icon="list" family="power" title={rt(L,'sc_log')} sub={rt(L,'sc_log_s')} href={rsHref('shack/log')} />
            </div>
          </div>
        </div>
      </div>
      {brixSheet && <RsBrixSheet c={c} onClose={() => setBrixSheet(false)} />}
    </>
  );
}

// ── Sap freshness (replaces the SapFreshnessTracker embed; same keys, same model)
// sg_fresh_start (epoch ms) and sg_fresh_status idle|tracking|boiled|dumped,
// written exactly as the tracker writes them; heat units from srFreshHeat on
// Open-Meteo hourly temperatures (past 2 days, next 2), as the tracker fetches.
function RsFreshCard({ c }) {
  const L = c.lang;
  const v = useSrDataVersion();
  const st = React.useMemo(() => ({ start: ls.get('sg_fresh_start', null), status: ls.get('sg_fresh_status', 'idle') }), [v]);
  const loc = selLocation();
  const [hourly, setHourly] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (st.status !== 'tracking' || !loc) return;
    let live = true; setErr(false);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&hourly=temperature_2m&temperature_unit=fahrenheit&past_days=2&forecast_days=2&timezone=auto`)
      .then(r => r.json()).then(d => { if (!live) return; if (!d.hourly) throw 0; setHourly(d.hourly.time.map((t, i) => ({ ts: new Date(t).getTime(), temp: d.hourly.temperature_2m[i] }))); })
      .catch(() => { if (live) setErr(true); });
    return () => { live = false; };
  }, [st.status, loc && loc.lat, loc && loc.lon]);
  const W = (k, val) => ls.set(k, val);
  const start = () => { const ts = Date.now(); if (W('sg_fresh_start', ts) && W('sg_fresh_status', 'tracking')) srDataChanged(); };
  const mark = s => { if (W('sg_fresh_status', s)) srDataChanged(); };
  const reset = () => { W('sg_fresh_start', null); W('sg_fresh_status', 'idle'); setHourly(null); srDataChanged(); };
  const now = Date.now();
  const h = hourly ? srFreshHeat(hourly, st.start, now) : null;
  const eta = ts => { if (!ts) return ''; const hrs = Math.round((ts - now) / 3600000); return hrs <= 0 ? rt(L,'fNow') : hrs < 24 ? rt(L,'fInH', { n: hrs }) : rt(L,'fInD', { n: Math.round(hrs / 24) }); };
  if (!loc) return <div className="rs-empty"><b>{rt(L,'freshNoLocT')}</b><p>{rt(L,'freshNoLocP')}</p></div>;
  if (st.status === 'idle' || !st.start) return (
    <div className="rs-card"><p className="rs-meta">{rt(L,'freshIdleP')}</p>
      <div style={{ marginTop:12 }}><RsBtn kind="secondary" icon="clock" onClick={start} id="rs-fresh-start">{rt(L,'freshStart')}</RsBtn></div></div>);
  const elapsed = (now - st.start) / 3600000;
  if (st.status === 'boiled' || st.status === 'dumped') return (
    <div className="rs-card"><RsSt kind={st.status === 'boiled' ? 'ok' : 'idle'}>{rt(L, st.status === 'boiled' ? 'freshBoiled' : 'freshDumped')}</RsSt>
      <p className="rs-meta" style={{ marginTop:8 }}>{rt(L,'freshDoneP', { h: fmt(elapsed, 1) })}</p>
      <div style={{ marginTop:12 }}><RsBtn kind="secondary" onClick={reset}>{rt(L,'freshNew')}</RsBtn></div></div>);
  return (
    <div className="rs-card">
      <div className="rs-split"><div><div className="rs-meta">{rt(L,'freshClock')}</div><div className="rs-mid tn">{elapsed < 24 ? `${fmt(elapsed, 1)} h` : `${fmt(elapsed / 24, 1)} d`}</div></div>
        {h && <RsSt kind={h.level === 'fresh' ? 'ok' : h.level === 'soon' ? 'check' : 'fault'}>{rt(L, h.level === 'fresh' ? 'freshFresh' : h.level === 'soon' ? 'freshSoon' : 'freshNowW')}</RsSt>}</div>
      {!h && !err && <div className="rs-sk" style={{ height:10, marginTop:14 }} />}
      {err && <p className="rs-errline">{rt(L,'freshErr')}</p>}
      {h && <>
        <div className="rs-bar rs-freshbar" role="img" aria-label={rt(L,'freshAria', { n: fmt(h.currentHU, 0) })}><i style={{ width: h.pct + '%', background: h.level === 'fresh' ? T.ok : h.level === 'soon' ? T.acc : T.bad }} /></div>
        <RsKv rows={[[rt(L,'heatUnits'), `${fmt(h.currentHU, 0)} / ${SR_FRESH.CRITICAL_HU}`],
          h.currentTemp != null ? [rt(L,'outdoor'), `${fmt(h.currentTemp, 0)}°F`] : null,
          h.critEta ? [rt(L,'boilBy'), eta(h.critEta)] : null,
          h.bestBoilStart ? [rt(L,'coolWindow'), srClock(h.bestBoilStart, L)] : null]} />
      </>}
      <p className="rs-note">{rt(L,'freshNote')}</p>
      <div className="rs-btnrow"><RsBtn kind="secondary" onClick={() => mark('boiled')}>{rt(L,'freshMarkBoiled')}</RsBtn><RsBtn kind="secondary" onClick={() => mark('dumped')}>{rt(L,'freshMarkDumped')}</RsBtn></div>
    </div>
  );
}
// Sap Brix reading: SeasonTab's sg_brixlog entry {id, date, brix, note}.
function RsBrixSheet({ c, onClose }) {
  const L = c.lang;
  const [v, setV] = useState(() => { const b = selSapBrix(ls.get('sg_brixlog', []), c.sapBrix); return b.brix; });
  const [note, setNote] = useState('');
  const [fail, setFail] = useState(false);
  const save = () => {
    if (!v) return;
    const all = ls.get('sg_brixlog', []) || [];
    if (!ls.set('sg_brixlog', [...all, { id:Date.now(), date:srToday(), brix:parseFloat(v), note }])) { setFail(true); return; }
    srDataChanged(); srToast(rt(L,'savedBrix', { v: fmt(parseFloat(v), 1) })); onClose();
  };
  return (
    <RsSheet title={rt(L,'logBrix')} onClose={onClose}>
      <RsStepper id="rs-bx-v" value={v} onChange={setV} steps={[-0.5, -0.1, 0.1, 0.5]} dp={1} unit="%" label={rt(L,'sapBrixPct')} min={0} max={10} />
      <label className="rs-fl" htmlFor="rs-bx-note">{rt(L,'noteOpt')}</label>
      <input id="rs-bx-note" className="rs-field" value={note} onChange={e => setNote(e.target.value)} placeholder={rt(L,'brixNotePh')} />
      <div className="rs-sheetfoot">
      {fail && <p className="rs-errline" role="alert">{rt(L,'bNotSavedT')}. {rt(L,'bLockedP')}</p>}
      <div><RsBtn onClick={save} id="rs-bx-save">{rt(L,'saveBrix')}</RsBtn></div></div>
    </RsSheet>
  );
}

// ── RO planner (replaces ROTab) ──────────────────────────────────────────────
// ROTab's math: roConc(sap, sapBrix, target), permeate = sap - conc, boil time
// saved = boilTime(sap) - boilTime(conc) at the evaporator rate, fuel saved =
// saved hours x rate / fuel.spu x cost. Two unit fixes: the sap you type is in
// your unit, so concentrate is shown in it without a second conversion, and
// boil time runs on gallons because the evaporator rate is gal/h. The rate is
// the pan you set on the Evaporator screen (sg_panIdx), not a session default.
function RsROPlanner({ c }) {
  const L = c.lang, u = srU(c.units);
  const [inSap, setInSap] = useState(() => { const s = selToday(selSeason(c.season).slog).sapVal; return s > 0 ? Math.round(s) : 500; });
  const [tgt, setTgt] = useState(() => parseFloat(ls.get('sg_dx_robrix', 8)) || 8);
  const sb = parseFloat(c.sapBrix) || 0;
  const ok = tgt > sb && sb > 0;
  const conc = ok ? roConc(inSap || 0, sb, tgt) : 0, perm = ok ? (inSap || 0) - conc : 0;
  const rate = srPanRate(ls.get('sg_panIdx', 0), ls.get('sg_panW',''), ls.get('sg_panH',''));
  const fuel = FUELS.find(f => f.label === c.fuelType) || FUELS[0];
  const sapG = toGal(inSap || 0, c.units), concG = toGal(conc, c.units);
  const saved = ok ? boilTime(sapG, sb, rate) - boilTime(concG, tgt, rate) : 0;
  const fSaved = rate > 0 ? (saved * rate) / fuel.spu : 0, mSaved = fSaved * (parseFloat(c.fuelCost) || 0);
  const setT = v => { setTgt(v); if (v !== '') ls.set('sg_dx_robrix', v); };
  return (
    <div className="rs-inner">
      <header className="rs-phead"><RsPushBar href={rsHref('stage/collect')} label={rt(L,'st_collect')} />
        <div className="rs-eyebrow plain">{rt(L,'calcWord')}</div><h1 className="sm">{rt(L,'sc_ro')}</h1></header>
      <RsBanners c={c} />
      <div className="rs-cols">
        <div>
          <div className="rs-card">
            <label className="rs-fl" htmlFor="rs-ro-sap">{rt(L,'sapThrough', { u })}</label>
            <RsStepper id="rs-ro-sap" value={inSap} onChange={setInSap} steps={[-100, -10, 10, 100]} dp={0} unit={u} label={rt(L,'sapThrough', { u })} min={0} max={100000} />
            <div className="rs-grid2" style={{ marginTop:12 }}>
              <div><label className="rs-fl" htmlFor="rs-ro-sb">{rt(L,'sapBrixPct')}</label>
                <RsStepper id="rs-ro-sb" value={sb} onChange={v => c.setSapBrix(v === '' ? 0 : v)} steps={[-0.1, 0.1]} dp={1} unit="%" label={rt(L,'sapBrixPct')} min={0.5} max={10} big={false} /></div>
              <div><label className="rs-fl" htmlFor="rs-ro-tb">{rt(L,'concTo')}</label>
                <RsStepper id="rs-ro-tb" value={tgt} onChange={setT} steps={[-0.5, 0.5]} dp={1} unit="%" label={rt(L,'concTo')} min={1} max={20} big={false} /></div>
            </div>
            {!ok && <p className="rs-errline" role="alert">{rt(L,'roInvalid', { t: fmt(tgt || 0, 1), s: fmt(sb, 1) })}</p>}
          </div>
          <h2 className="rs-sec">{rt(L,'whatComesOut')}</h2>
          <div className="rs-grid2">
            <RsNum label={rt(L,'concentrate')} value={ok ? fmt(conc, 0) : '0'} unit={u} sub={rt(L,'atBrix', { b: fmt(tgt || 0, 1) })} />
            <RsNum label={rt(L,'waterOut')} value={ok ? fmt(perm, 0) : '0'} unit={u} sub={ok ? rt(L,'pctRemoved', { p: fmt(perm / (inSap || 1) * 100, 0), x: fmt(tgt / sb, 1) }) : ''} />
          </div>
        </div>
        <div>
          <h2 className="rs-sec">{rt(L,'whatItSaves')}</h2>
          <div className="rs-card">
            <RsKv big rows={[
              [rt(L,'boilSaved'), rate > 0 && ok ? srDur(saved, L) : rt(L,'setPanFirst')],
              [rt(L,'fuelSavedW'), rate > 0 && ok ? `${fmt(fSaved, 1)} ${L === 'fr' ? fuel.unitFr : fuel.unit} ${fuelLabel(fuel, L).replace(/ \(.*\)/, '').toLowerCase()} · $${fmt(mSaved, 0)}` : ''],
              [rt(L,'evapRate'), rate > 0 ? `${fmt(fromGal(rate, c.units), 0)} ${u}/h` : ''],
            ]} />
            <p className="rs-note">{rt(L,'roSavesNote', { c: fmt(parseFloat(c.fuelCost) || 0, 2), f: fuel.unit })}</p>
          </div>
          <h2 className="rs-sec">{rt(L,'multiPass')}</h2>
          <div className="rs-list">
            {[[rt(L,'pass1'), sb * 2], [rt(L,'pass2'), sb * 4], [rt(L,'pass3'), sb * 8]].map(([l, b]) => <RsRow key={l} chev={false} title={l} value={`${fmt(b, 1)} Brix`} />)}
          </div>
          <p className="rs-note">{rt(L,'roTips')}</p>
        </div>
      </div>
    </div>
  );
}

// ── 5 · Boil ─────────────────────────────────────────────────────────────────
// The Boil Day session, rebuilt: sg_boil_session {start, sap, syrup, tempF},
// temps stored in °F, the draw-off band from srBoilState, and "Log this boil"
// appending sapEvap + syrupMade + boilHours in LogTab's shape (BoilDayTab.logBoil).
function RsBoilStage({ c }) {
  const L = c.lang, u = srU(c.units), uT = srTempU(c.units);
  const m = useRsSeasonModel(c);
  const [sess, setSess] = useState(() => ls.get('sg_boil_session', null));
  useEffect(() => { setSess(ls.get('sg_boil_session', null)); }, [m.d]);
  const active = !!(sess && sess.start);
  const now = useRsTick(active);
  const [showEnd, setShowEnd] = useState(false);
  const [armed, setArmed] = useState(false);
  const [batchSheet, setBatchSheet] = useState(false);
  const mode = ls.get('sg_boil_bg', 'photo') === 'steam' ? 'steam' : 'photo';
  const persist = s => { if (!ls.set('sg_boil_session', s)) return false; setSess(s); srDataChanged(); return true; };
  const r1 = n => Math.round(n * 10) / 10;
  const finT = Math.round(finTemp(c.waterBP) * 10) / 10;
  const state = active ? srBoilState(sess.tempF, c.waterBP) : null;
  // Wake lock while boiling, as Boil Day does (progressive; failure is silent).
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock = null, gone = false;
    const req = async () => { try { if (!gone && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen'); } catch {} };
    const onVis = () => { if (document.visibilityState === 'visible') req(); };
    req(); document.addEventListener('visibilitychange', onVis);
    return () => { gone = true; document.removeEventListener('visibilitychange', onVis); try { lock && lock.release(); } catch {} };
  }, [active]);
  const rate = m.d.panRate > 0 ? srSyrupRate(m.d.panRate, c.sapBrix) : 0;
  const hrs = active ? Math.max(0, (now - sess.start) / 3600000) : 0;
  const est = rate * hrs;
  const drawn = active ? (sess.syrup || 0) : 0;
  const seasonSy = m.totals.syT + drawn;
  const panLbl = m.d.panIdx === CUSTOM_PAN_IDX ? rt(L,'customPan') : (PAN_SIZES[m.d.panIdx] || PAN_SIZES[0]).label.replace(/ \(.*\)/, '');
  const start = () => persist({ start: Date.now(), sap: 0, syrup: 0, tempF: r1(c.waterBP) });
  const bumpT = dDisp => { const d = srTempD(sess.tempF, c.units) + dDisp; const f = c.units === 'L' ? d * 9 / 5 + 32 : d; persist({ ...sess, tempF: Math.round(f * 100) / 100 }); };
  const add = (k, n) => persist({ ...sess, [k]: r1((sess[k] || 0) + n) });
  const logBoil = () => {
    const all = ls.get('sg_logs2', {}) || {};
    const slog = { ...(all[c.season] || {}) };
    const date = srToday(), note = L === 'fr' ? 'Bouillée' : 'Boil Day';
    let id = Date.now(); const dur = r1(hrs);
    if (sess.sap > 0)   slog.sapEvap   = [...(slog.sapEvap   || []), { id: id++, date, val: sess.sap,   note }];
    if (sess.syrup > 0) slog.syrupMade = [...(slog.syrupMade || []), { id: id++, date, val: sess.syrup, note }];
    if (dur >= 0.1)     slog.boilHours = [...(slog.boilHours || []), { id: id++, date, val: dur,        note }];
    if (!ls.set('sg_logs2', { ...all, [c.season]: slog })) { setShowEnd(false); return; }
    srToast(rt(L,'boilLogged', { v: fmt(sess.syrup || 0, 1), u }));
    ls.set('sg_boil_session', null); setSess(null); setShowEnd(false); srDataChanged();
  };
  const discard = () => { if (!armed) { setArmed(true); return; } ls.set('sg_boil_session', null); setSess(null); setShowEnd(false); setArmed(false); srDataChanged(); };
  const stateWord = { warming: rt(L,'bsWarming'), near: rt(L,'bsNear'), draw: rt(L,'bsDraw'), over: rt(L,'bsOver') }[state];
  const batches = m.d.batches;
  return (
    <>
      <RsBoilHero on={active} mode={mode} />
      <div className="rs-inner rs-boilroute">
        <RsStageHead c={c} id="boil" m={m} lede={rt(L,'boilLede')} />
        <RsBanners c={c} />
        <div className="rs-cols">
          <div>
            <section className={`rs-card rs-boilcard${active ? ' on' : ''}`} aria-label={rt(L,'boilCard')}>
              <div className="rs-split">
                <RsSt kind={active ? 'ok' : 'idle'}>{active ? rt(L,'boilingSince', { t: srClock(sess.start, L) }) : rt(L,'nNotBoiling')}</RsSt>
                <span className="rs-fresh tn">{m.d.panRate > 0 ? `${panLbl} · ${fmt(fromGal(m.d.panRate, c.units), 0)} ${u}/h` : rt(L,'setPanFirst')}</span>
              </div>
              <RsEvap on={active} lang={L} />
              <div className="rs-boilnums">
                {active ? <div><div className="rs-meta">{rt(L,'syrupThisBoil')}</div>
                  <div className="rs-huge tn"><span id="rs-syrup-now">{srVol(est, c.units, 3)}</span><small>{u}</small></div></div>
                : <div><div className="rs-meta">{rt(L,'syrupToday')}</div>
                  <div className="rs-huge tn">{fmt(m.today.syrupVal, 1)}<small>{u}</small></div></div>}
                <div style={{ textAlign:'right' }}><div className="rs-meta">{rt(L,'seasonWord')}</div><div className="rs-mid tn">{fmt(seasonSy, 1)}</div>
                  <div className="rs-meta tn">{active && rate > 0 ? rt(L,'perHour', { v: srVol(rate, c.units, 1), u }) : rt(L,'paused')}</div></div>
              </div>
              {active && <RsJugs gal={fromGal(est, c.units)} label={rt(L,'jugsAria', { v: srVol(est, c.units, 1), u })} />}
              {active && <p className="rs-note">{rt(L,'estNote', { b: fmt(parseFloat(c.sapBrix) || 2, 1) })}</p>}
              {active ? <>
                <label className="rs-fl">{rt(L,'panTemp')}</label>
                <div className="rs-split" style={{ alignItems:'center' }}>
                  <div className="rs-mid tn">{fmt(srTempD(sess.tempF, c.units), 1)}{uT}</div>
                  <RsSt kind={state === 'draw' ? 'ok' : state === 'over' ? 'fault' : 'idle'}>{stateWord}</RsSt>
                </div>
                <div className="rs-keys" style={{ marginTop:10 }}>
                  {[-0.5, -0.1, 0.1, 0.5].map(d => <button key={d} type="button" onClick={() => bumpT(d)} aria-label={`${d > 0 ? '+' : '-'}${Math.abs(d)}${uT}`}>{d > 0 ? '+' : '−'}{Math.abs(d)}</button>)}
                </div>
                <div className="rs-grid2 rs-counters" style={{ marginTop:12 }}>
                  <RsCounter label={rt(L,'sapIn')} value={fmt(sess.sap || 0, 0)} unit={u} steps={[1, 5, 10]} onAdd={n => add('sap', n)} />
                  <RsCounter label={rt(L,'syrupDrawn')} value={fmt(sess.syrup || 0, 1)} unit={u} steps={[0.5, 1, 5]} onAdd={n => add('syrup', n)} />
                </div>
                <div style={{ marginTop:12 }}><RsBtn kind="secondary" onClick={() => { setArmed(false); setShowEnd(true); }} id="rs-boil-end">{rt(L,'endBoil')}</RsBtn></div>
              </> : <div style={{ marginTop:12 }}><RsBtn kind="secondary" icon="flame" onClick={start} id="rs-boil-start">{rt(L,'startBoil')}</RsBtn></div>}
            </section>
            <div className="rs-card" style={{ marginTop:12 }}>
              <div className="rs-split"><div className="rs-meta">{rt(L,'drawOffAt')}</div>
                <span className="rs-fresh"><RsIcon name="therm" size={14} />{rt(L,'waterBoilsAtV', { v: fmt(srTempD(c.waterBP, c.units), 1), u: uT })}</span></div>
              <div className="rs-huge tn">{fmt(srTempD(finT, c.units), 1)}<small>{uT}</small></div>
              <p className="rs-meta">{rt(L,'drawOffP')}</p>
              <div className="rs-btnrow">
                <RsBtn kind="secondary" href={rsHref('stage/boil/draw-off')}>{rt(L,'recheckWater')}</RsBtn>
                <RsBtn kind="secondary" href={rsHref('stage/boil/draw-off')}>{rt(L,'hydroFix')}</RsBtn>
              </div>
            </div>
          </div>
          <div>
            <h2 className="rs-sec">{rt(L,'todaysBoil')}</h2>
            <div className="rs-grid2">
              <RsNum label={rt(L,'nSapBoiled')} value={fmt(srDayTotals(m.d.slog.sapEvap)[m.todayIso] || 0, 0)} unit={u} sub={rt(L,'todayWordL')} />
              <RsNum label={rt(L,'nBoilHours')} value={fmt(m.totals.hoursT, 1)} unit="h" sub={rt(L,'thisSeason')} />
            </div>
            <h2 className="rs-sec">{rt(L,'filterPress')}</h2>
            <div className="rs-list">
              <RsRow icon="filter" family="boil" title={rt(L,'deCalc')} sub={rt(L,'deCalcS')} href={rsHref('stage/boil/de')} />
              <RsRow icon="book" family="boil" title={rt(L,'sc_finish')} sub={rt(L,'finishGuideS')} href={rsHref('stage/boil/finishing')} />
              <RsRow icon="flame" family="boil" title={rt(L,'sc_evap')} sub={rt(L,'sc_evap_s')} href={rsHref('stage/boil/evaporator')} />
            </div>
            <h2 className="rs-sec">{rt(L,'batchesWord')}<a className="rs-more" href={rsHref('shack/batches')}>{rt(L,'allWord')}<RsIcon name="chev" size={18} /></a></h2>
            {batches.length ? <RsBatchRows c={c} batches={batches} limit={4} /> :
              <div className="rs-empty"><b>{rt(L,'noBatchesT')}</b><p>{rt(L,'noBatchesP')}</p></div>}
            <div style={{ marginTop:16 }}><RsBtn icon="jug" onClick={() => setBatchSheet(true)} id="rs-batch-open">{rt(L,'recordBatch')}</RsBtn></div>
          </div>
        </div>
      </div>
      {showEnd && active && <RsSheet title={rt(L,'endSummary')} onClose={() => setShowEnd(false)}>
        <RsKv big rows={[[rt(L,'duration'), srDur(hrs, L) || '0 min'], [rt(L,'sapIn'), `${fmt(sess.sap || 0, 0)} ${u}`], [rt(L,'syrupDrawn'), `${fmt(sess.syrup || 0, 1)} ${u}`],
          [rt(L,'ratioWord'), sess.sap > 0 && sess.syrup > 0 ? `${fmt(sess.sap / sess.syrup, 0)}:1` : rt(L,'notYet')]]} />
        <p className="rs-note">{rt(L,'logBoilNote')}</p>
        <div style={{ marginTop:16 }}><RsBtn onClick={logBoil} id="rs-boil-log">{rt(L,'logThisBoil')}</RsBtn></div>
        <div style={{ marginTop:10 }}><RsBtn kind="bad" onClick={discard}>{rt(L, armed ? 'discardArm' : 'discardBoil')}</RsBtn></div>
      </RsSheet>}
      {batchSheet && <RsBatchSheet c={c} onClose={() => setBatchSheet(false)} />}
    </>
  );
}
function RsCounter({ label, value, unit, steps, onAdd }) {
  return (
    <div className="rs-counter">
      <div className="rs-meta">{label}</div>
      <div className="rs-mid tn">{value}<small>{unit}</small></div>
      <div className="rs-keys sm">{steps.map(n => <button key={n} type="button" onClick={() => onAdd(n)} aria-label={`+${n} ${unit} ${label}`}>+{n}</button>)}</div>
    </div>
  );
}

// ── Batches (EvapTab's sg_batches, labels by _downloadBatchLabel) ────────────
function RsBatchRows({ c, batches, limit, onDelete }) {
  const L = c.lang, u = srU(c.units);
  const idx = batches.map((b, i) => ({ b, i })).reverse();
  return (
    <div className="rs-list">
      {idx.slice(0, limit || idx.length).map(({ b, i }) => { const g = BATCH_GRADES[b.grade] || BATCH_GRADES.amber;
        return <div key={b.id || i} className="rs-row rs-batch">
          <span className="rs-tag tn">{i + 1}</span>
          <span className="rs-rt"><b>{b.syrupOut !== '' && b.syrupOut != null ? `${fmt(parseFloat(b.syrupOut) || 0, 1)} ${u} · ` : ''}{srGradeLabel(g.name, L)}</b>
            <span className="tn">{[srDateShort(b.date, L), b.sapIn ? rt(L,'batchSap', { v: fmt(parseFloat(b.sapIn) || 0, 0), u }) : null, b.loc || null, b.notes || null].filter(Boolean).join(' · ')}</span></span>
          <button type="button" className="rs-iconbtn" aria-label={rt(L,'labelFor', { n: i + 1 })} onClick={() => _downloadBatchLabel(b, i + 1, c.season, c.trees, c.units)}><RsIcon name="tag" size={20} /></button>
          {onDelete && <button type="button" className="rs-iconbtn bad" aria-label={rt(L,'deleteBatch', { n: i + 1 })} onClick={() => onDelete(i)}><RsIcon name="trash" size={20} /></button>}
        </div>; })}
    </div>
  );
}
function RsBatchSheet({ c, onClose }) {
  const L = c.lang, u = srU(c.units);
  const [f, setF] = useState({ date: srToday(), sapIn:'', syrupOut:'', grade:'amber', loc:'', notes:'' });
  const [fail, setFail] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.syrupOut && !f.sapIn) { const el = document.getElementById('rs-b-syr'); if (el) el.focus(); return; }
    const all = ls.get('sg_batches', []) || [];
    if (!ls.set('sg_batches', [...all, srMakeBatch(f, Date.now())])) { setFail(true); return; }
    srDataChanged(); srToast(rt(L,'batchSaved', { n: all.length + 1 })); onClose();
  };
  return (
    <RsSheet title={rt(L,'recordBatch')} onClose={onClose} id="rs-batch-sheet">
      <label className="rs-fl" htmlFor="rs-b-syr">{rt(L,'syrupOut', { u })}</label>
      <RsStepper id="rs-b-syr" value={f.syrupOut} onChange={v => set('syrupOut', v)} steps={[-1, -0.1, 0.1, 1]} dp={1} unit={u} label={rt(L,'syrupOut', { u })} />
      <label className="rs-fl">{rt(L,'grade')}</label>
      <RsChips label={rt(L,'grade')} value={f.grade} onChange={v => set('grade', v)} options={Object.entries(BATCH_GRADES).map(([k, g]) => [k, srGradeLabel(g.name, L)])} />
      <label className="rs-fl" htmlFor="rs-b-sap">{rt(L,'sapInOpt', { u })}</label>
      <RsStepper id="rs-b-sap" value={f.sapIn} onChange={v => set('sapIn', v)} steps={[-100, -10, 10, 100]} dp={0} unit={u} label={rt(L,'sapInOpt', { u })} big={false} />
      <div className="rs-grid2" style={{ marginTop:4 }}>
        <div><label className="rs-fl" htmlFor="rs-b-date">{rt(L,'date')}</label><input id="rs-b-date" className="rs-field" type="date" value={f.date} onChange={e => set('date', e.target.value)} /></div>
        <div><label className="rs-fl" htmlFor="rs-b-loc">{rt(L,'placeWord')}</label><input id="rs-b-loc" className="rs-field" value={f.loc} onChange={e => set('loc', e.target.value)} placeholder={rt(L,'placeBatchPh')} /></div>
      </div>
      <label className="rs-fl" htmlFor="rs-b-notes">{rt(L,'noteOpt')}</label>
      <input id="rs-b-notes" className="rs-field" value={f.notes} onChange={e => set('notes', e.target.value)} placeholder={rt(L,'addNote')} />
      <div className="rs-sheetfoot">
      {fail && <p className="rs-errline" role="alert">{rt(L,'bNotSavedT')}. {rt(L,'bLockedP')}</p>}
      <div><RsBtn onClick={save} id="rs-batch-save">{rt(L,'saveBatch')}</RsBtn></div></div>
    </RsSheet>
  );
}
function RsBatches({ c }) {
  const L = c.lang;
  const v = useSrDataVersion();
  const batches = React.useMemo(() => ls.get('sg_batches', []) || [], [v]);
  const [sheet, setSheet] = useState(false);
  const [armed, setArmed] = useState(null);
  useEffect(() => { if (armed == null) return; const tm = setTimeout(() => setArmed(null), 3000); return () => clearTimeout(tm); }, [armed]);
  const del = i => { if (armed !== i) { setArmed(i); srToast(rt(L,'tapAgainDelete')); return; } if (ls.set('sg_batches', batches.filter((_, j) => j !== i))) { setArmed(null); srDataChanged(); } };
  return (
    <div className="rs-inner">
      <header className="rs-phead"><RsPushBar href={rsHref('shack')} label={rt(L,'shackTitle')} /><h1 className="sm">{rt(L,'batchesTitle')}</h1>
        <p className="rs-lede">{rt(L,'batchesLede')}</p></header>
      <RsBanners c={c} />
      {batches.length ? <RsBatchRows c={c} batches={batches} onDelete={del} /> :
        <div className="rs-empty"><div className="rs-mk"><M.jug size={48} /></div><b>{rt(L,'noBatchesT')}</b><p>{rt(L,'noBatchesP')}</p></div>}
      <div style={{ marginTop:16 }}><RsBtn icon="jug" onClick={() => setSheet(true)}>{rt(L,'recordBatch')}</RsBtn></div>
      {sheet && <RsBatchSheet c={c} onClose={() => setSheet(false)} />}
    </div>
  );
}

// ── Draw-off temperature and hydrometer fix (replaces BoilPtTab) ─────────────
function RsDrawOff({ c }) {
  const L = c.lang;
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [place, setPlace] = useState('');
  const [q, setQ] = useState('');
  const [syBx, setSyBx] = useState(66);
  const [syT, setSyT] = useState(211);
  const [be, setBe] = useState(36);
  const bp = c.waterBP, fin = finTemp(bp);
  const toC = f => (f - 32) * 5 / 9;
  const useAlt = ft => { setAlt(ft); if (ft !== '' && ft >= 0) c.setWaterBP(parseFloat(altToBP(parseFloat(ft) || 0).toFixed(1))); };
  const gps = () => {
    if (!navigator.geolocation) { setErr(rt(L,'noGps')); return; }
    setBusy(true); setErr('');
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&hourly=temperature_2m&forecast_days=1`);
        const d = await r.json(); const ft = Math.round((d.elevation || 0) * 3.28084);
        useAlt(ft); setPlace(`${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`);
      } catch { setErr(rt(L,'elevFailed')); }
      setBusy(false);
    }, e => { setBusy(false); setErr(rt(L, e.code === 1 ? 'gpsDenied' : 'gpsFailed')); }, { timeout:10000, maximumAge:300000 });
  };
  const find = async () => {
    if (!q.trim()) return; setBusy(true); setErr('');
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
      const d = await r.json();
      if (d.results && d.results.length) { useAlt(Math.round((d.results[0].elevation || 0) * 3.28084)); setPlace(d.results[0].name); } else setErr(rt(L,'placeNotFound'));
    } catch { setErr(rt(L,'searchFailed')); }
    setBusy(false);
  };
  const corr = denCorr(syT || 0), corrB = (syBx || 0) + corr;
  const inR = corrB >= 66 && corrB <= 68.9;
  return (
    <div className="rs-inner">
      <header className="rs-phead"><RsPushBar href={rsHref('stage/boil')} label={rt(L,'st_boil')} />
        <div className="rs-eyebrow plain">{rt(L,'calcWord')}</div><h1 className="sm">{rt(L,'sc_boilpt')}</h1></header>
      <RsBanners c={c} />
      <div className="rs-cols">
        <div>
          <div className="rs-card">
            <div className="rs-meta">{rt(L,'drawOffAt')}</div>
            <div className="rs-huge tn">{fmt(fin, 1)}<small>°F</small></div>
            <p className="rs-meta tn">{rt(L,'drawOffC', { c: fmt(toC(fin), 1) })}</p>
            <label className="rs-fl" htmlFor="rs-bp">{rt(L,'waterBoilsAtL')}</label>
            <RsStepper id="rs-bp" value={bp} onChange={v => c.setWaterBP(v === '' ? 212 : v)} steps={[-1, -0.1, 0.1, 1]} dp={1} unit="°F" label={rt(L,'waterBoilsAtL')} min={200} max={215} big={false} />
            <p className="rs-note">{rt(L,'bpNote')}</p>
          </div>
          <h2 className="rs-sec">{rt(L,'fromAltitude')}</h2>
          <div className="rs-card">
            <div className="rs-inline">
              <input className="rs-field" type="search" aria-label={rt(L,'placeSearch')} placeholder={rt(L,'placePh')} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && find()} />
              <RsBtn kind="secondary" onClick={find} disabled={busy}>{rt(L,'find')}</RsBtn>
            </div>
            <div style={{ marginTop:10 }}><RsBtn kind="secondary" icon="gps" onClick={gps} disabled={busy}>{rt(L,'useGps')}</RsBtn></div>
            {place && <p className="rs-meta" style={{ marginTop:10 }}>{rt(L,'elevAt', { p: place, ft: fmt(parseFloat(alt) || 0, 0) })}</p>}
            {err && <p className="rs-errline" role="alert">{err}</p>}
            <label className="rs-fl" htmlFor="rs-alt">{rt(L,'altitudeFt')}</label>
            <RsStepper id="rs-alt" value={alt} onChange={useAlt} steps={[-100, 100]} dp={0} unit="ft" label={rt(L,'altitudeFt')} min={0} max={15000} big={false} />
          </div>
          <div className="rs-list" style={{ marginTop:12 }}>
            {ALT_REF.map(r => <RsRow key={r.alt} chev={false} title={r.alt} value={rt(L,'altRow', { bp: fmt(r.bp, 1), fin: fmt(r.fin, 1) })} />)}
          </div>
        </div>
        <div>
          <h2 className="rs-sec">{rt(L,'hydroFix')}</h2>
          <div className="rs-card">
            <div className="rs-grid2">
              <div><label className="rs-fl" htmlFor="rs-sbx">{rt(L,'hydroReads')}</label>
                <RsStepper id="rs-sbx" value={syBx} onChange={setSyBx} steps={[-0.1, 0.1]} dp={1} unit="Brix" label={rt(L,'hydroReads')} min={50} max={75} big={false} /></div>
              <div><label className="rs-fl" htmlFor="rs-sty">{rt(L,'syrupAt')}</label>
                <RsStepper id="rs-sty" value={syT} onChange={setSyT} steps={[-5, 5]} dp={0} unit="°F" label={rt(L,'syrupAt')} min={32} max={230} big={false} /></div>
            </div>
            <div className="rs-hr" />
            <div className="rs-split" style={{ alignItems:'flex-end' }}>
              <div><div className="rs-meta">{rt(L,'correctedTo')}</div><div className="rs-big tn">{fmt(corrB, 1)}<small>Brix</small></div></div>
              <RsSt kind={inR ? 'ok' : 'check'}>{rt(L, inR ? 'densityOk' : corrB < 66 ? 'densityLight' : 'densityHeavy')}</RsSt>
            </div>
            <p className="rs-meta tn">{rt(L, corr >= 0 ? 'corrAdd' : 'corrSub', { v: fmt(Math.abs(corr), 2), t: fmt(syT || 0, 0) })}</p>
            <p className="rs-note">{rt(L,'legalRangeNote')}</p>
          </div>
          <h2 className="rs-sec">{rt(L,'brixBaume')}</h2>
          <div className="rs-card">
            <RsKv rows={[[rt(L,'brixToBe', { b: fmt(syBx || 0, 1) }), `${fmt(brixToBe(syBx || 0), 1)} Bé`]]} />
            <label className="rs-fl" htmlFor="rs-be">{rt(L,'baumeIn')}</label>
            <RsStepper id="rs-be" value={be} onChange={setBe} steps={[-0.1, 0.1]} dp={1} unit="Bé" label={rt(L,'baumeIn')} min={28} max={40} big={false} />
            <p className="rs-meta tn">{rt(L,'beToBrix', { b: fmt(beToBrix(be || 0), 1) })}</p>
            <p className="rs-note">{rt(L,'beHotNote')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DE calculator (FinishTab's DE math via srDeCups) ─────────────────────────
function RsDE({ c }) {
  const L = c.lang, u = srU(c.units);
  const [gal, setGal] = useState(() => c.units === 'L' ? 38 : 10);
  const [mode, setMode] = useState('straight');
  const [szn, setSzn] = useState('early');
  const [plates, setPlates] = useState(9);
  const [ps, setPs] = useState('7" plates');
  const r = srDeCups(toGal(parseFloat(gal) || 0, c.units), mode, szn, parseFloat(plates) || 0, ps);   // DE rates are per US gallon
  const steps = mode === 'straight' ? ['deS1','deS2','deS3','deS4','deS5','deS6'] : ['deP1','deP2','deP3','deP4','deP5','deP6'];
  return (
    <div className="rs-inner">
      <header className="rs-phead"><RsPushBar href={rsHref('stage/boil')} label={rt(L,'st_boil')} />
        <div className="rs-eyebrow plain">{rt(L,'calcWord')}</div><h1 className="sm">{rt(L,'deCalc')}</h1></header>
      <RsBanners c={c} />
      <div className="rs-cols">
        <div>
          <div className="rs-card">
            <label className="rs-fl" htmlFor="rs-de-g">{rt(L,'deGal')}</label>
            <RsStepper id="rs-de-g" value={gal} onChange={setGal} steps={[-5, -1, 1, 5]} dp={0} unit={u} label={rt(L,'deGal')} min={0} max={4000} />
            <label className="rs-fl">{rt(L,'deMethod')}</label>
            <RsSeg label={rt(L,'deMethod')} value={mode} onChange={setMode} options={[['straight', rt(L,'deStraight')], ['precoat', rt(L,'dePrecoat')]]} />
            <p className="rs-meta" style={{ marginTop:8 }}>{rt(L, r.recMode === 'precoat' ? 'deRecPre' : 'deRecStraight', { v: srVol(25, c.units), u })}</p>
            <label className="rs-fl">{rt(L,'deColor')}</label>
            <RsSeg label={rt(L,'deColor')} value={szn} onChange={setSzn} options={[['early', rt(L,'deEarly')], ['late', rt(L,'deLate')]]} />
            {mode === 'precoat' && <>
              <label className="rs-fl" htmlFor="rs-de-p">{rt(L,'dePlates')}</label>
              <RsStepper id="rs-de-p" value={plates} onChange={setPlates} steps={[-1, 1]} dp={0} unit="" label={rt(L,'dePlates')} min={1} max={50} big={false} />
              <label className="rs-fl">{rt(L,'dePlateSize')}</label>
              <RsSeg label={rt(L,'dePlateSize')} value={ps} onChange={setPs} options={Object.keys(PLATE_CUPS).map(k => [k, k.replace(' plates', ' in')])} />
            </>}
          </div>
        </div>
        <div>
          <h2 className="rs-sec">{rt(L,'deYouNeed')}</h2>
          <div className="rs-card">
            <div className="rs-huge tn">{fmt(r.cups, 1)}<small>{rt(L,'deCups')}</small></div>
            <RsKv rows={[[rt(L,'deTbsp'), String(r.tbsp)], [rt(L,'deOz'), fmt(r.oz, 1)], [rt(L,'deLb'), fmt(r.lbs, 2)]]} />
            {szn === 'late' && <p className="rs-note">{rt(L,'deLateNote')}</p>}
          </div>
          <h2 className="rs-sec">{rt(L,'deHow')}</h2>
          {mode === 'straight' && <div className="rs-card rs-tip" style={{ marginTop:0, marginBottom:12 }}><b>{rt(L,'deHeadsT')}</b><p>{rt(L,'deHeadsP')}</p></div>}
          <ol className="rs-steps">{steps.map((k, i) => <li key={k}><b>{rt(L, k, { cups: fmt(r.cups, 1), plates: plates })}</b></li>)}</ol>
          <p className="rs-note">{rt(L,'dePsi')}</p>
          <h2 className="rs-sec">{rt(L,'deTroubleT')}</h2>
          <div className="rs-stack">{[1,2,3,4].map(i => <RsDisclose key={i} title={rt(L, 'deT' + i + 'T')}><p className="rs-body">{rt(L, 'deT' + i + 'P')}</p></RsDisclose>)}</div>
        </div>
      </div>
    </div>
  );
}

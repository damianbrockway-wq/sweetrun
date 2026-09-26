// ─── Watch mode (Phase 8): the sugarbush monitor, readable across a room ────
// iPad landscape first; full screen with no nav. The map (the Bush drawing
// with the vacuum layer forced on and 24px plates), beside a rail: the sap
// banner, outside temperature and freeze/thaw, tanks, pumps and alerts.
//
// Honesty rule: there are no sensors yet. Every number comes through a
// reading provider (srPickSource, 23-rs-engine3.jsx) and carries its source
// and its true time. By default that is his manual readings ("Line A 26.8 in,
// read 2 h ago"). "Demo readings" in Sugar Shack switches on the simulator,
// which is labelled on every surface it feeds, never written to storage and
// never used by "Do this next". A sensor feed slots in as a third provider.
//
// Routes: #/watch · #/watch/line/<id>

let srPrevRoute = null;   // set by the shell; Exit goes back there
function useRsWakeLock(on) {
  const [st, setSt] = useState(() => ('wakeLock' in navigator ? 'pending' : 'none'));
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    if (!on) { setSt('pending'); return; }
    let lock = null, gone = false;
    const req = async () => {
      try {
        if (gone || document.visibilityState !== 'visible') return;
        lock = await navigator.wakeLock.request('screen'); setSt('on');
        lock.addEventListener && lock.addEventListener('release', () => { if (!gone) setSt('off'); });
      } catch { setSt('off'); }
    };
    const onVis = () => { if (document.visibilityState === 'visible') req(); };
    req(); document.addEventListener('visibilitychange', onVis);
    return () => { gone = true; document.removeEventListener('visibilitychange', onVis); try { lock && lock.release(); } catch {} };
  }, [on]);
  return st;
}

// The numbers watch mode shows, from whichever provider is on.
function srWatchView(model, hourly, demo, t0) {
  const now = model.now, P = model.prefs;
  const tempReal = hourly && hourly.data ? (srFin(hourly.data.cur) ? hourly.data.cur : null) : null;
  let src = model.src;
  if (demo) {
    const m = {
      lines: model.lines.map((l, i) => ({ id: l.id, base: l.latest ? l.latest.v : 24 + ((i * 7) % 5) * 0.3 })),
      pumps: model.pumps.filter(p => p.kind === 'vacuum').map(p => ({ id: p.id, base: p.vac ? p.vac.v : 25 })),
      tanks: model.tanks.map(t => ({ id: t.id, capGal: t.capGal, level: t.levelGal != null ? t.levelGal : Math.round(t.capGal * .4), rate: t.capGal > 0 ? Math.max(10, Math.round(t.capGal * .036)) : 30 })),
      tempF: tempReal != null ? tempReal : 38,
    };
    src = srPickSource({ demo: true, model: m, clock: () => now, t0 });
  }
  const lines = model.lines.map(l => {
    const r = src.latest(l.sid);
    const hist = demo ? src.history(l.sid) : l.hist;
    const rel = demo ? [].concat(...l.relPumps.map(p => src.history(srSensorId('pump', p.id)))) : l.relHist;
    const leak = demo ? srLeakFind(hist, rel, P.leakLimitIn, P.baselineDays, P.pairH) : l.leak;
    return { ...l, latest: r, hist, leak, tier: demo ? 'fresh' : srAgeTier(r ? r.ms : null, now, P.staleH) };
  });
  const tanks = model.tanks.map(t => {
    if (!demo) return { ...t, tier: srAgeTier(t.readMs, now, P.staleH), src: 'manual' };
    const r = src.latest(srSensorId('tank', t.id)), prev = src.history(srSensorId('tank', t.id), now - 2 * SR_H_MS)[0];
    const rate = r && prev && r.ms > prev.ms ? (r.v - prev.v) / ((r.ms - prev.ms) / SR_H_MS) : null;
    return { ...t, levelGal: r ? r.v : null, readMs: r ? r.ms : null, fillGalH: rate, tier: 'fresh', src: 'sim' };
  });
  const pumps = model.pumps.map(p => p.kind === 'vacuum' && demo ? { ...p, vac: src.latest(srSensorId('pump', p.id)) } : p);
  const tempF = demo ? (src.latest('site:temp') || {}).v : tempReal;
  const ft = hourly && hourly.data ? srFreezeThaw(hourly.data.hourly, now, tempF) : null;
  const newest = Math.max(-Infinity, ...lines.filter(l => l.latest).map(l => l.latest.ms), ...tanks.filter(t => t.readMs).map(t => t.readMs),
    ...pumps.filter(p => p.vac).map(p => p.vac.ms));
  const anyReading = srFin(newest);
  const stale = !demo && anyReading && srAgeTier(newest, now, P.staleH) === 'old';
  const sap = srSapRunning({ tempF, frozeLast24: ft ? ft.frozeLast24 : false, tanks, now });
  return { lines, tanks, pumps, tempF, ft, newest: anyReading ? newest : null, stale, sap, srcId: src.id, leaks: lines.filter(l => l.leak.status === 'suspect') };
}

function RsWatch({ c, sub }) {
  const L = c.lang, u = srU(c.units);
  const model = useSrOps(c, true);
  const loc = React.useMemo(() => selLocation(), []);
  const hourly = useSrHourly(loc);
  const wx = useSrWx(loc, 0);
  const t0 = React.useMemo(() => Date.now(), []);
  const demo = model.demo;
  const V = React.useMemo(() => srWatchView(model, hourly, demo, t0), [model, hourly.data, demo]);
  // Keep the screen awake: offered as a switch, on by default in Watch, remembered per device.
  const [wantWake, setWantWake] = useState(() => { const p = srObj(ls.get('sg_watch_prefs', {})); return p.wake !== false; });
  const wake = useRsWakeLock(wantWake);
  const toggleWake = () => { const n = !wantWake; setWantWake(n); ls.set('sg_watch_prefs', { ...srObj(ls.get('sg_watch_prefs', {})), wake: n }); };
  const setDemo = on => { ls.set('sg_demo_readings', !!on); srDataChanged(); };
  const [readLine, setReadLine] = useState(null);
  const s = sub || [];
  const one = s[0] === 'line' && s[1] ? s[1] : null;
  const oneLine = one ? V.lines.find(l => l.id === one) : null;
  const [panel, setPanel] = useState(null);
  const panelLine = panel ? V.lines.find(l => l.id === panel) : null;
  const empty = !model.lines.length && !model.pumps.length && !model.tanks.length;
  const exit = () => rsGo(one ? 'watch' : (srPrevRoute && !srPrevRoute.startsWith('watch') ? srPrevRoute : 'bush'));
  const prep = srPrepState(model, wx.data);
  const alerts = [
    ...V.pumps.filter(p => p.status === 'fault').map(p => ({ k: 'f' + p.id, tone: 'bad', icon: 'alert', fam: 'bad', t: rt(L, 'wFault', { n: p.name }), s: p.note || rt(L, 'sinceT', { t: srWhen2(p.statusMs, model.now, L) }), go: 'pumps/' + p.id })),
    ...V.leaks.map(l => ({ k: 'l' + l.id, tone: 'bad', icon: 'alert', fam: 'bad', t: rt(L, 'wLeak', { n: l.label }), s: rt(L, 'wLeakS', { v: fmt(l.latest.v, 1), d: fmt(l.leak.drop, 1) }), line: l.id })),
    ...V.pumps.filter(p => p.status === 'running' && p.fuel && p.fuel.hoursLeft != null && p.fuel.hoursLeft <= 12).map(p => ({ k: 'g' + p.id, tone: p.fuel.hoursLeft <= 4 ? 'bad' : '', icon: 'fuel', fam: 'power',
      t: rt(L, 'wFuel', { n: p.name, h: srDur(p.fuel.hoursLeft, L) }), s: p.fuel.emptyAtMs ? rt(L, 'dryAt', { t: srWhenAhead(p.fuel.emptyAtMs, model.now, L) }) : '', go: 'pumps/' + p.id })),
    ...V.tanks.filter(t => t.levelGal != null && t.capGal > 0 && t.levelGal / t.capGal >= .85).map(t => ({ k: 't' + t.id, tone: 'bad', icon: 'tank', fam: 'collect',
      t: rt(L, 'wTankFull', { n: t.name }), s: rt(L, 'tankPct', { p: Math.round(t.levelGal / t.capGal * 100) }), go: 'pumps/tank/' + t.id })),
    ...(prep.freezing && prep.items.length && prep.nDone < prep.items.length ? [{ k: 'fz', tone: 'ice', icon: 'snow', fam: 'ice', t: rt(L, 'wFreeze', { v: prep.lo }), s: rt(L, 'wFreezeS', { n: prep.items.length - prep.nDone }), go: 'pumps/freeze' }] : []),
  ];
  const fresh = demo ? rt(L, 'wDemoFresh') : V.newest ? rt(L, 'wNewest', { a: srAgo(V.newest, model.now, L) }) : rt(L, 'wNoReadings');
  const freshTier = demo ? 'fresh' : V.newest ? srAgeTier(V.newest, model.now, model.prefs.staleH) : 'none';
  return (
    <div className={`rs-watch${V.stale ? ' stale' : ''}${demo ? ' demo' : ''}`}>
      <header className="rs-wh">
        <div className="rs-whb"><RsBrandMark size={34} /><b>SweetRun</b><span className="rs-wtitle">{rt(L, 'wTitle')}</span></div>
        <div className="rs-whr">
          {demo ? <button type="button" className="rs-srcpill demo" onClick={() => setDemo(false)} id="rs-demo-off" aria-label={rt(L, 'wDemoPill') + '. ' + rt(L, 'wDemoOff')}>
              {rt(L, 'wDemoPill')}<span className="rs-pillx"><RsIcon name="x" size={16} />{rt(L, 'wDemoOff')}</span></button>
            : <span className="rs-srcpill">{rt(L, 'wManualPill')}</span>}
          {!demo && <span className={`rs-wfresh ${freshTier}`}>{fresh}</span>}
          <span className="rs-wclock tn">{srClock(model.now, L)}</span>
          {wake === 'none' ? <span className="rs-wwake none"><RsIcon name="info" size={18} />{rt(L, 'wake_none')}</span>
            : (() => { const wl = wantWake && wake === 'on' ? rt(L, 'wake_on') : wantWake && wake === 'off' ? rt(L, 'wake_off') : rt(L, 'wakeKeep');
              return <button type="button" className={`rs-wwake ${wake}`} aria-pressed={wantWake && wake === 'on'} onClick={toggleWake} id="rs-wake" aria-label={wl} title={wl}>
                <RsIcon name={wake === "on" ? "sun" : "clock"} size={18} /><span className="rs-wwl">{wl}</span></button>; })()}
          <button type="button" className="rs-btn2 rs-wexit" onClick={exit}>{one ? rt(L, 'wAllLines') : rt(L, 'wExit')}</button>
        </div>
        <h1 className="rs-vh">{oneLine ? rt(L, 'wOneH', { n: oneLine.label }) : rt(L, 'wTitleH')}</h1>
      </header>
      {V.stale && <div className="rs-wstale" role="alert"><RsIcon name="alert" size={30} /><div><b>{rt(L, 'wStaleT')}</b><span>{rt(L, 'wStaleP', { a: srAgo(V.newest, model.now, L) })}</span></div></div>}
      {empty ? (
        <div className="rs-wempty"><div className="rs-empty">
          <div className="rs-mk"><RsIcon name="watch" size={48} /></div>
          <b>{rt(L, 'wEmptyT')}</b><p>{rt(L, 'wEmptyP')}</p>
          <div className="rs-btnrow"><RsBtn kind="secondary" icon="map" href={rsHref('bush')}>{rt(L, 'openBush')}</RsBtn><RsBtn kind="secondary" icon="pump" href={rsHref('pumps')}>{rt(L, 'pumpCenter')}</RsBtn></div>
          <div className="rs-wsensor"><span className="rs-soon">{rt(L, 'wSensors')}</span><p>{rt(L, 'wSensorsP')}</p></div>
        </div></div>
      ) : oneLine ? <RsWatchOne c={c} model={model} V={V} l={oneLine} demo={demo} />
      : (
        <div className="rs-wbody">
          <section className="rs-wmapc" aria-label={rt(L, 'wMapAria')}>
            <RsWatchMap c={c} model={model} V={V} onLine={id => setPanel(id)} />
            {demo && <div className="rs-wdemotag" aria-hidden="true">{rt(L, 'wDemoPill')}</div>}
            <div className="rs-wlegend" role="note" aria-label={rt(L, 'wLegendAria')}><span>{rt(L, 'lyVacuum')}</span>{[0, 1, 2, 3, 4].map(i => <i key={i} className={'v' + i} />)}<span className="tn">16 → 26 in</span><i className="leak" /><span>{rt(L, 'leakSuspectW')}</span>{!panel && <span className="rs-wlhint">{rt(L, 'wTapLine')}</span>}</div>
          </section>
          <aside className="rs-wrail">
            {panelLine ? <RsWatchPanel c={c} model={model} l={panelLine} demo={demo} onClose={() => setPanel(null)} /> : <>
              {!demo && !V.newest ? <RsWatchNoReadings c={c} model={model} onRead={setReadLine} onDemo={() => setDemo(true)} /> : <RsSapBanner c={c} V={V} demo={demo} />}
              {alerts.length > 0 && <div className="rs-wcard rs-walerts">
                <div className="rs-wk2">{rt(L, 'wAlerts')}</div>
                {alerts.map(a => <button key={a.k} type="button" className={`rs-walert ${a.tone}`} onClick={() => a.line ? setPanel(a.line) : rsGo(a.go)}>
                  <RsTile icon={a.icon} family={a.fam} size={40} /><span><b>{a.t}</b><span>{a.s}</span></span></button>)}
              </div>}
              <div className="rs-wgrid">
                <div className="rs-wcard">
                  <div className="rs-wk2">{rt(L, 'wOutside')}</div>
                  {V.tempF != null ? <>
                    <div className="rs-wtemp tn">{fmt(V.tempF, 1)}<small>°F</small></div>
                    <div className="rs-wsub">{V.ft ? rt(L, 'trend_' + V.ft.trend) + (V.ft.cross ? ' · ' + rt(L, V.ft.cross.kind === 'freeze' ? 'freezeNear' : 'thawNear', { t: srClock(V.ft.cross.ms, L) }) : '') : ''}</div>
                    <div className="rs-wsrc">{demo ? rt(L, 'wDemoTag') : rt(L, 'wTempSrc', { p: (loc && loc.name) || rt(L, 'yourPlace') })}</div>
                  </> : <div className="rs-wsub">{!loc ? rt(L, 'wNoPlace') : hourly.status === 'loading' ? rt(L, 'wTempLoading') : rt(L, 'wTempErr')}</div>}
                </div>
                {V.tanks.length ? V.tanks.slice(0, 1).map(t => <RsWatchTank key={t.id} c={c} t={t} now={model.now} demo={demo} />)
                  : <div className="rs-wcard"><div className="rs-wk2">{rt(L, 'tanksWord')}</div><div className="rs-wsub">{rt(L, 'wNoTank')}</div></div>}
              </div>
              {V.tanks.length > 1 && <div className="rs-wgrid">{V.tanks.slice(1, 3).map(t => <RsWatchTank key={t.id} c={c} t={t} now={model.now} demo={demo} />)}</div>}
              <div className="rs-wcard">
                <div className="rs-wk2">{rt(L, 'tabPumps')}</div>
                {V.pumps.length ? <div className="rs-wpumps">{V.pumps.map(p => <a key={p.id} className="rs-wpump" href={rsHref('pumps/' + p.id)}><RsPumpTile p={p} size={44} />
                  <span><b>{p.name}</b><RsPumpStatus p={p} L={L} now={model.now} /></span></a>)}</div>
                  : <div className="rs-wsub">{rt(L, 'wNoPumps')}</div>}
              </div>
              {!alerts.length && <div className="rs-wcard rs-wcalm"><div className="rs-wk2">{rt(L, 'wAlerts')}</div><div className="rs-wsub">{demo ? rt(L, 'wNoAlertsDemo') : rt(L, 'wNoAlerts')}</div></div>}
            </>}
          </aside>
        </div>
      )}
      {readLine && (() => { const l = model.lines.find(x => x.id === readLine); return l ? <RsReadingSheet c={c} title={rt(L, 'vacAtEnd', { n: l.label })} unit="in" dp={1} steps={[-1, -0.1, 0.1, 1]} min={0} max={30}
        base={24} sensor={{ id: l.sid, quantity: 'vacuum', target: { type: 'line', id: l.id }, unit: 'inHg' }}
        onSaved={() => srSaveLineMeta(l.id, { checkedAt: new Date().toISOString() })} onClose={() => setReadLine(null)} /> : null; })()}
    </div>
  );
}
// Lines and pumps exist, but nothing has been read yet. Say how to read them,
// that sensors are coming, and offer the demo (labelled, never saved).
function RsWatchNoReadings({ c, model, onRead, onDemo }) {
  const L = c.lang;
  return (
    <div className="rs-wcard rs-wnoread" id="rs-wnoread">
      <div className="rs-wlh"><RsTile icon="gauge" family="lines" size={48} /><b className="rs-wk">{rt(L, 'wNoReadT')}</b></div>
      <p className="rs-wsub">{rt(L, 'wNoReadP')}</p>
      {model.lines.length > 0 && <>
        <div className="rs-wk2" style={{ marginTop: 14 }}>{rt(L, 'wNoReadB')}</div>
        <div className="rs-chips wrapchips" role="group" aria-label={rt(L, 'wNoReadB')}>
          {model.lines.map(l => <button key={l.id} type="button" className="rs-chip" onClick={() => onRead(l.id)}>{l.label}</button>)}
        </div></>}
      <div className="rs-wsensor"><span className="rs-soon">{rt(L, 'wSensors')}</span><p>{rt(L, 'wSensorsP')}</p></div>
      <div style={{ marginTop: 12 }}><RsBtn kind="secondary" icon="watch" onClick={onDemo} id="rs-demo-on">{rt(L, 'wDemoOn')}</RsBtn></div>
    </div>
  );
}
function RsSapBanner({ c, V, demo }) {
  const L = c.lang, u = srU(c.units);
  if (V.stale) return null;
  const rising = V.tanks.find(t => t.fillGalH > 0);
  if (V.sap === 'running') return (
    <div className="rs-wrun" role="status"><RsIcon name="drop" size={36} sw={2.6} /><div><b>{rt(L, 'sapRunning')}</b>
      <span className="tn">{rt(L, 'sapRunningS', { v: srVol(rising.fillGalH, c.units, 0), u, n: rising.name })}{demo ? ' · ' + rt(L, 'wDemoTag') : ''}</span></div></div>);
  if (V.sap === 'weather') return (
    <div className="rs-wcard rs-wweather"><b>{rt(L, 'sapWeather')}</b><span>{rt(L, 'sapWeatherS', { t: fmt(V.tempF, 0) })}</span></div>);
  return <div className="rs-wcard rs-wweather off"><b>{rt(L, 'sapNotRunning')}</b><span>{V.tempF == null ? rt(L, 'sapNoTemp') : V.tempF <= 32 ? rt(L, 'sapBelow') : rt(L, 'sapNoFreeze')}</span></div>;
}
function RsWatchTank({ c, t, now, demo }) {
  const L = c.lang, u = srU(c.units);
  const pct = t.levelGal != null && t.capGal > 0 ? Math.round(t.levelGal / t.capGal * 100) : null;
  return (
    <a className={`rs-wcard rs-wtank${t.tier === 'old' ? ' old' : ''}`} href={rsHref('pumps/tank/' + t.id)}>
      <RsTankViz level={t.levelGal} cap={t.capGal} w={58} h={104} empty={t.levelGal == null} />
      <div><div className="rs-wk2">{t.name}</div>
        <div className="rs-wnum tn">{t.levelGal != null ? srVol(t.levelGal, c.units) : '·'}<small> {u}</small></div>
        <div className="rs-wsub tn">{pct != null ? rt(L, 'wTankFull2', { p: pct }) : rt(L, 'noLevelYet')}</div>
        {t.fillGalH > 0 && <div className="rs-wsub tn rs-wrate">{rt(L, 'wTankRate', { v: srVol(t.fillGalH, c.units), u })}</div>}
        <div className="rs-wsrc">{demo ? rt(L, 'wDemoTag') : t.readMs ? rt(L, 'readAgoShort', { a: srAgo(t.readMs, now, L) }) : ''}</div></div>
    </a>
  );
}
function RsWatchMap({ c, model, V, onLine, one }) {
  const L = c.lang;
  const [lf] = useSrLeaflet();
  const divRef = React.useRef(null);
  const [mapRef, gRef] = useSrMap(divRef, lf, { zoomSnap: 0.25 });
  const fitted = React.useRef(false);
  // Redraw when what is drawn changes (a reading, a status, a level), not on every clock tick.
  const sig = JSON.stringify([V.stale, V.lines.map(l => [l.id, l.latest && l.latest.v, l.leak.status, l.flowing, l.geo.pts.length]),
    V.pumps.map(p => [p.id, p.status]), V.tanks.map(t => [t.id, t.levelGal != null ? Math.round(t.levelGal) : null]), model.ver]);
  useEffect(() => {
    const map = mapRef.current, G = gRef.current; if (!map || !G) return;
    const LL = window.L;
    srApplyBase(LL, map, 'sat');
    const dm = { ...model, lines: V.lines, pumps: V.pumps, tanks: model.tanksRaw, tankLevels: Object.fromEntries(V.tanks.map(t => [t.id, t])) };
    srDrawBush(LL, map, G, dm, { ...SR_BUSH_LAYERS, trees: false, brix: false }, {
      watch: true, one, stale: V.stale, showHouse: true, noReading: rt(L, 'noReadingW'),
      lineAria: l => rt(L, 'lineAria', { n: l.label, v: l.latest ? fmt(l.latest.v, 1) : rt(L, 'noReadingW') }),
      onLine: id => onLine && onLine(id),
    });
    if (!fitted.current) {
      fitted.current = true;
      const pts = one ? ((V.lines.find(l => l.id === one) || {}).geo || { pts: [] }).pts : srBushBounds({ ...dm, property: null });
      if (pts.length >= 2) map.fitBounds(LL.latLngBounds(pts), { paddingTopLeft: [70, 96], paddingBottomRight: [70, one ? 60 : 120], maxZoom: 18 });
      else if (pts.length === 1) map.setView(pts[0], 17); else map.setView([45.5, -72.0], 14);
    }
  }, [lf, sig, one, L]);
  return <div ref={divRef} className="rs-map rs-wmap base-sat" role="img" aria-label={rt(L, 'wMapAria')} />;
}
function RsWatchPanel({ c, model, l, demo, onClose }) {
  const L = c.lang;
  const lk = l.leak;
  const hist = l.hist.slice(-24);
  return (
    <div className="rs-wpanel">
      <div className="rs-split" style={{ alignItems: 'center' }}>
        <div className="rs-wlh"><RsLinePlate l={l} size={56} /><div><div className="rs-wk">{l.label}</div><div className="rs-wsub tn">{rt(L, 'treesTaps', { t: l.trees.length, n: l.taps })}{l.lengthFt ? ` · ${fmt(l.lengthFt, 0)} ft` : ''}</div></div></div>
        <button type="button" className="rs-xbtn" aria-label={rt(L, 'close')} onClick={onClose}><RsIcon name="x" size={26} /></button>
      </div>
      <div className={`rs-wbig tn${lk.status === 'suspect' ? ' bad' : ''}${l.tier === 'old' ? ' old' : ''}`}>{l.latest ? fmt(l.latest.v, 1) : '·'}<small> in</small></div>
      <div className="rs-wsub">{l.latest ? (demo ? rt(L, 'wDemoTag') : rt(L, 'readAgo', { a: srAgo(l.latest.ms, model.now, L), t: srClock(l.latest.ms, L) })) : rt(L, 'noReadingYet')}</div>
      <p className={`rs-wverdict ${lk.status === 'suspect' ? 'bad' : lk.status === 'ok' ? 'ok' : ''}`}>{srLeakVerdict(L, lk, model.prefs)[1]}</p>
      <RsLeakChain c={c} l={l} now={model.now} P={model.prefs} demo={demo} big />
      {hist.length >= 2 && <div className="rs-wcard" style={{ marginTop: 12 }}><div className="rs-wk2">{rt(L, demo ? 'wLast24' : 'wRecent')}</div>
        <RsTimeChart series={[{ id: l.id, pts: hist, dash: '', leak: lk.status === 'suspect' }]} from={hist[0].ms} to={model.now} yMin={14} yMax={28} yTicks={[14, 18, 22, 26]} h={170} lang={L} label={rt(L, 'vacTrendAria', { n: l.label, k: hist.length })} /></div>}
      <dl className="rs-wkv tn">
        <dt>{rt(L, 'tapsWordC')}</dt><dd>{fmt(l.taps, 0)}</dd>
        <dt>{rt(L, 'lastChecked')}</dt><dd>{l.checkedMs ? srAgo(l.checkedMs, model.now, L) : rt(L, 'neverW')}</dd>
        <dt>{rt(L, 'leakSuspicion')}</dt><dd className={lk.status === 'suspect' ? 'bad' : lk.status === 'ok' ? 'ok' : ''}>{rt(L, 'susp_' + lk.status)}</dd>
      </dl>
      <RsBtn icon="watch" href={rsHref('watch/line/' + l.id)} id="rs-watch-one">{rt(L, 'watchLine')}</RsBtn>
      <div style={{ marginTop: 10 }}><RsBtn kind="secondary" icon="map" href={rsHref('bush/line/' + l.id)}>{rt(L, 'openOnBush')}</RsBtn></div>
    </div>
  );
}
function RsWatchOne({ c, model, V, l, demo }) {
  const L = c.lang;
  const lk = l.leak;
  const hist = l.hist.slice(-48);
  const [reading, setReading] = useState(false);
  return (
    <div className="rs-wone">
      <section className="rs-wcard rs-wonel">
        <div className="rs-wlh"><RsLinePlate l={l} size={72} /><div><div className="rs-wk big">{l.label}</div>
          <div className="rs-wsub tn">{rt(L, 'treesTaps', { t: l.trees.length, n: l.taps })}{l.lengthFt ? ` · ${fmt(l.lengthFt, 0)} ft` : ''}</div></div></div>
        <div className={`rs-wgiant tn${lk.status === 'suspect' ? ' bad' : ''}${l.tier === 'old' ? ' old' : ''}`}>{l.latest ? fmt(l.latest.v, 1) : '·'}<small>in</small></div>
        <div className="rs-wsub">{l.latest ? (demo ? rt(L, 'wDemoTag') : rt(L, 'readAgo', { a: srAgo(l.latest.ms, model.now, L), t: srClock(l.latest.ms, L) })) : rt(L, 'noReadingYet')}</div>
        <p className={`rs-wverdict big ${lk.status === 'suspect' ? 'bad' : lk.status === 'ok' ? 'ok' : ''}`}>{srLeakVerdict(L, lk, model.prefs)[1]}</p>
        <RsLeakChain c={c} l={l} now={model.now} P={model.prefs} demo={demo} big />
        <dl className="rs-wkv big tn">
          <dt>{rt(L, 'lastChecked')}</dt><dd>{l.checkedMs ? srAgo(l.checkedMs, model.now, L) : rt(L, 'neverW')}</dd>
          <dt>{rt(L, 'servedBy')}</dt><dd>{(l.relPumps || l.pumps).length ? (l.relPumps || l.pumps).map(p => p.name).join(', ') : rt(L, 'noneW')}</dd>
        </dl>
        {!demo && <RsBtn kind="secondary" icon="gauge" onClick={() => setReading(true)}>{rt(L, 'logVacuum')}</RsBtn>}
      </section>
      <section className="rs-wcard rs-wonec">
        <div className="rs-wk2">{rt(L, demo ? 'wLast24' : 'wRecent')}</div>
        {hist.length >= 2 ? <RsTimeChart series={[{ id: l.id, pts: hist, dash: '', leak: lk.status === 'suspect' }]} from={hist[0].ms} to={model.now} yMin={14} yMax={28} yTicks={[14, 18, 22, 26]} h={300} lang={L}
          label={rt(L, 'vacTrendAria', { n: l.label, k: hist.length })} /> : <p className="rs-wsub">{rt(L, 'wNeedTwo')}</p>}
        <div className="rs-wonemap"><RsWatchMap c={c} model={model} V={V} one={l.id} /></div>
      </section>
      {reading && <RsReadingSheet c={c} title={rt(L, 'vacAtEnd', { n: l.label })} unit="in" dp={1} steps={[-1, -0.1, 0.1, 1]} min={0} max={30}
        base={l.latest ? l.latest.v : 24} sensor={{ id: l.sid, quantity: 'vacuum', target: { type: 'line', id: l.id }, unit: 'inHg' }}
        onSaved={() => srSaveLineMeta(l.id, { checkedAt: new Date().toISOString() })} onClose={() => setReading(false)} />}
    </div>
  );
}

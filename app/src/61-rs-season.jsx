// ─── Season (home), Phase 5 ──────────────────────────────────────────────────
// Greeting, context line, stage title, the Season chart from logged data, the
// "Do this next" card from srJobs(), alert cards, Right now, syrup against
// last season, and Log it. Every number comes from the device (selSeason);
// nothing here is sample data.

// Ticks once a second while `on` (live counters), else never.
function useRsTick(on, ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!on) return; const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [on, ms]);
  return now;
}
// Everything the Season screen and several stage screens derive, in one place.
function useRsSeasonModel(c) {
  const v = useSrDataVersion();
  const d = React.useMemo(() => selSeason(c.season), [c.season, v]);
  const now = useRsNow();
  const todayIso = srToday();
  const minutes = srMinutesOf(now);
  const stage = srStageOf({ todayIso, season:c.season, slog:d.slog, boilActive: !!(d.boil && d.boil.start),
    hasMainlines: d.mainlines.length > 0, hasTreePins: d.treePins.length > 0 });
  const series0 = srSeasonSeries(d.slog, todayIso, null);
  const pastDays = Math.max(0, srDaysBetween(series0.start, todayIso));
  const wx = useSrWx(d.loc, pastDays);
  const series = React.useMemo(() => srSeasonSeries(d.slog, todayIso, wx.data), [d, todayIso, wx.data]);
  const today = selToday(d.slog);
  // First run: nothing logged in any season, no pins, and the season setup never finished
  // (sg_trees defaults to 50, so it can't be the test). The setup's finish step writes
  // sg_wizard_data with a tree count; nothing writes sg_wizard_done any more (it is
  // only read for older backups), so both count as "set up".
  const firstRun = !d.anyEntries && !ls.get('sg_wizard_done', false) && !((d.wizard || {}).trees > 0) && d.pins.length === 0;
  // Phases 7-8: pumps, freeze prep, fuel and leak suspects join the engine; the
  // RO pump's rate (sg_pumps) feeds the RO call. Demo readings never reach here.
  const ops = useSrOps(c, false, now.getTime());
  const roPump = ops.pumps.find(p => p.kind === 'ro' && p.gph > 0);
  const jobs = srJobs({
    now: now.getTime(), minutes, todayIso, stage, firstRun,
    wizardDone: d.wizardDone, hasPins: d.pins.length > 0, hasLocation: !!d.loc,
    wx: wx.data, boil: d.boil && d.boil.start ? { startMs: d.boil.start } : null,
    fresh: d.freshStart ? { startMs: d.freshStart } : null,
    tanks: d.tanks, roGph: roPump ? roPump.gph : null, sapBrix: c.sapBrix, waterBP: c.waterBP,
    loggedToday: today, checks: d.checks, ops: srOpsForJobs(ops, wx.data),
  });
  const totals = seasonTotals(d.slog);
  const totalsGal = seasonTotalsGal(d.slog, c.units);
  const taps = parseInt(c.trees) || 0;
  const model = yieldModelSaved();
  const goalGal = taps * yieldMidOf(model);
  const brix = selSapBrix(d.brixlog, c.sapBrix);
  return { d, ops, now, todayIso, minutes, stage, stageIdx: SR_STAGE_IDS.indexOf(stage), wx, series, today, firstRun, jobs,
    totals, totalsGal, taps, model, goalGal, brix };
}

// What a job's button does.
function rsJobAct(c, j, openLog) {
  const a = j.act || {};
  if (a.wizard) return () => c.setShowWizard(true);
  if (a.log) return () => openLog(a.log);
  if (a.go) return () => rsGo(a.go);
  return () => {};
}
// Job text with its numbers filled in, in the display unit.
function rsJobVars(j, c) {
  const v = j.vars || {}, L = c.lang, u = srU(c.units);
  return {
    ...v, u,
    lo: v.lo, hi: v.hi, n: v.n, done: v.done, total: v.total, name: v.name,
    h: v.h != null ? (v.h >= 1 ? srDur(v.h, L) : srDur(v.h, L)) : '',
    hr: v.h != null ? fmt(v.h, 0) : '',
    fin: v.fin != null ? fmt(v.fin, 1) : '',
    start: v.startMs ? srClock(v.startMs, L) : '',
    lvl: v.lvl != null ? srVol(v.lvl, c.units) : '', cap: v.cap != null ? srVol(v.cap, c.units) : '',
    full: v.fullH != null ? srDur(v.fullH, L) : '', run: v.runH != null ? srDur(v.runH, L) : '',
    at: v.startAtMs ? srClock(v.startAtMs, L) : '',
    // Phases 7-8 (pump jobs): inches of vacuum, fuel, clock times
    v: v.v != null ? fmt(v.v, 1) : '', base: v.base != null ? fmt(v.base, 1) : '', drop: v.drop != null ? fmt(v.drop, 1) : '', rel: v.rel != null ? fmt(v.rel, 1) : '',
    lim: v.lim != null ? fmt(v.lim, 1) : '', left: v.left, note: v.note || '',
    empty: v.emptyAtMs ? srWhenAhead(v.emptyAtMs, v.nowMs || Date.now(), L) : '', since: v.startMs ? srClock(v.startMs, L) : '',
    fuel: v.lvl != null ? srVol(v.lvl, c.units, 1) : '',
  };
}

function RsSeason({ c, openLog }) {
  const L = c.lang;
  const m = useRsSeasonModel(c);
  const part = srDayPart(m.minutes);
  const st = RS_STAGES[m.stageIdx] || RS_STAGES[0];
  const top = m.jobs[0], rest = m.jobs.slice(1).filter(j => j.alert).slice(0, 3);
  const boilOn = !!(m.d.boil && m.d.boil.start);
  const night = m.minutes >= 17 * 60 || m.minutes < 5 * 60;
  const logBtns = (
    <div className="rs-btnrow">
      <RsBtn kind="secondary" icon="pail" onClick={() => openLog('sapCollected')} big={night}>{rt(L,'logSap')}</RsBtn>
      <RsBtn kind="secondary" icon="jug" onClick={() => openLog('syrupMade')} big={night}>{rt(L,'logSyrup')}</RsBtn>
    </div>
  );
  return (
    <>
      <RsHero photo={SR_GREET_PHOTO[part]} />
      <div className="rs-inner rs-home">
        <header className="rs-phead hb-top">
          <div className="rs-topbar">
            <div className="rs-greet"><RsBrandMark /><span className="rs-gname" data-part={part}>{srGreeting(part, c.firstName, L)}</span></div>
          </div>
          <p className="rs-gline">{rsContextLine(m, c)}</p>
          <div className="rs-whenrow">
            <span className="rs-when tn">{rsWhen(m.now, L)}</span>
            <RsLicenseChip c={c} />
          </div>
          <div className="rs-eyebrow">{rt(L,'stageOf', { n: m.stageIdx + 1 })}</div>
          <h1>{rt(L, 'st_' + st.id)}</h1>
        </header>
        <div className="hb-banners"><RsBanners c={c} /></div>
        <div className="hb-season"><RsSeasonCard m={m} c={c} /></div>
        <div className="hb-next">
          <RsNextCard eyebrow={rt(L,'doNext')} icon={top.icon === 'snow' ? 'snow' : top.icon}
            title={rt(L, top.title, rsJobVars(top, c))} why={rt(L, top.why, rsJobVars(top, c))} btn={rt(L, top.btn)}
            onAct={rsJobAct(c, top, openLog)} />
          {rest.map(j => <RsAlert key={j.id} icon={j.icon} family={j.family} tone={j.tone}
            title={rt(L, j.alert, rsJobVars(j, c))} sub={rt(L, j.sub, rsJobVars(j, c))} onClick={rsJobAct(c, j, openLog)} />)}
          {night && <><h2 className="rs-sec">{rt(L,'logTonight')}</h2>{logBtns}</>}
        </div>
        <div className="hb-now">
          <h2 className="rs-sec">{rt(L,'todayCard')}</h2>
          <RsTankCard c={c} tanks={m.d.tanks} tankPins={m.d.tankPins} />
          <div className="rs-grid2" style={{ marginTop:10 }}>
            <RsNum label={rt(L,'nBrix')} value={fmt(m.brix.brix, 1)} unit="%"
              sub={rt(L,'nBrixSub', { r: fmt(rule86(m.brix.brix), 0) })} href={rsHref('stage/collect')} />
            <RsBoilNum c={c} boil={m.d.boil} />
            <RsNum label={rt(L,'nSapToday')} value={fmt(m.today.sapVal, 0)} unit={srU(c.units)}
              sub={m.today.sap ? rt(L, m.today.sap === 1 ? 'nEntries1' : 'nEntries', { n: m.today.sap }) : rt(L,'nNoSapToday')} href={rsHref('shack/log')} />
            <RsNum label={rt(L,'nSyrupSoFar')} value={fmt(m.totals.syT, 1)} unit={srU(c.units)}
              sub={m.taps > 0 && !m.firstRun ? rt(L,'nPerTap', { v: fmt(m.totals.syT / m.taps, 2), u: srU(c.units) }) : rt(L,'nNoTaps')} href={rsHref('stage/recap')} />
          </div>
        </div>
        <div className="hb-ops rs-wideonly"><RsOpsCard c={c} ops={m.ops} /></div>
        <div className="hb-going">
          <h2 className="rs-sec">{rt(L,'howGoing')}<a className="rs-more" href={rsHref('stage/recap')}>{rt(L,'allCharts')}<RsIcon name="chev" size={18} /></a></h2>
          <RsSyrupVsLast c={c} slog={m.d.slog} prev={m.d.prevSlog} dayOfRun={m.series.dayOfRun} />
        </div>
        <div className="hb-log">
          {!night && <><h2 className="rs-sec">{rt(L,'logIt')}</h2>{logBtns}</>}
          <h2 className="rs-sec">{rt(L,'thisStage')}</h2>
          <div className="rs-list">
            <RsRow icon={st.icon} family={st.family} title={rt(L,'openStage', { s: rt(L, 'st_' + st.id) })} sub={rt(L, 'st_' + st.id + '_l')} href={rsHref('stage/' + st.id)} />
            <RsRow icon="pump" family="collect" title={rt(L,'pumpCenter')} sub={rt(L,'pumpCenterSub')} href={rsHref('pumps')} />
            <RsRow icon="watch" family="lines" title={rt(L,'watchTitle')} sub={rt(L,'watchLede')} href={rsHref('watch')} />
          </div>
          <RsNotifPrompt c={c} />
        </div>
      </div>
    </>
  );
}

// The line under the greeting: the most useful true sentence, first match wins.
function rsContextLine(m, c) {
  const L = c.lang, u = srU(c.units);
  if (m.firstRun) return rt(L,'ctxFirst');
  const b = m.d.boil;
  if (b && b.start) return rt(L,'ctxBoil', { t: srClock(b.start, L) });
  const fault = m.jobs.find(j => j.id.startsWith('fault-'));
  if (fault) return rt(L,'ctxFault', { n: fault.vars.name });
  const fz = m.jobs.find(j => j.id === 'freeze' || j.id === 'freeze-prep');
  if (fz && m.minutes >= 17 * 60) return rt(L,'ctxFreeze', { lo: fz.vars.lo });
  const leak = m.jobs.find(j => j.id.startsWith('leak-'));
  if (leak && m.minutes < 12 * 60) return rt(L,'ctxLeak', { n: leak.vars.name });
  if (m.today.sapVal > 0) return rt(L,'ctxSapToday', { v: fmt(m.today.sapVal, 0), u });
  if (m.series.dayOfRun) return rt(L,'ctxDay', { n: m.series.dayOfRun, v: fmt(m.totals.syT, 1), u });
  if (m.wx.data) {
    const good = [1,2,3,4,5,6,7,8,9,10].filter(i => { const d = m.wx.data[srIsoAdd(m.todayIso, i)]; return d && srDayClass(d.hi, d.lo) === 'ideal'; }).length;
    return rt(L, good === 1 ? 'ctxGood1' : 'ctxGood', { n: good });
  }
  return rt(L,'ctxPlain', { y: c.season });
}

// Season card: day of the run, the goal ring, the six stage pills and the chart.
function RsSeasonCard({ m, c }) {
  const L = c.lang, u = srU(c.units);
  // No goal ring before the season is set up: the tap count is still the shell's default.
  const pct = m.goalGal > 0 && !m.firstRun ? Math.min(100, (m.totalsGal.syrupGal / m.goalGal) * 100) : null;
  return (
    <section className="rs-card rs-season" aria-label={rt(L,'seasonChart')}>
      <div className="rs-split" style={{ alignItems:'flex-start' }}>
        <div>
          <div className="rs-eyebrow plain">{rt(L,'seasonWord')}</div>
          <div className="rs-sday tn">{m.series.dayOfRun ? rt(L,'dayN', { n: m.series.dayOfRun }) : rt(L,'beforeRun')}</div>
        </div>
        {pct != null && <a className="rs-sgoal" href={rsHref('stage/recap')}>
          <RsRing pct={pct} size={56} label={rt(L,'goalAria', { p: Math.round(pct), g: srVol(m.goalGal, c.units), u })} />
          <span><span className="rs-meta">{rt(L,'syrupVsGoal')}</span>
            <span className="tn rs-goalv">{fmt(m.totals.syT, 1)}<small> / {srVol(m.goalGal, c.units)}</small></span></span>
        </a>}
      </div>
      <div className="rs-spills">
        {RS_STAGES.map((s, i) => (
          <a key={s.id} className={`rs-sp${i < m.stageIdx ? ' done' : i === m.stageIdx ? ' on' : ''}`} href={rsHref('stage/' + s.id)}
            aria-label={rt(L,'stageAria', { n: i + 1, s: rt(L, 'st_' + s.id), w: i === m.stageIdx ? rt(L,'current') : i < m.stageIdx ? rt(L,'doneWord') : '' })}>
            <RsTile icon={s.icon} family={s.family} size={30} />
            <span>{rt(L, 'st_' + s.id + '_s')}</span>
          </a>
        ))}
      </div>
      <RsSeasonChart series={m.series} units={c.units} lang={L} wxStatus={m.wx.status} />
    </section>
  );
}

// Right now: the tank. Real tank levels only (selTanks, Phase 8 seam); until a
// tank is set up, a designed empty state that points to the Bush tab.
function RsTankCard({ c, tanks, tankPins, big }) {
  const L = c.lang, u = srU(c.units);
  const t = (tanks || []).find(x => x.levelGal != null);
  if (t) {
    const pct = t.capGal > 0 ? Math.round(t.levelGal / t.capGal * 100) : 0;
    const plan = srRoPlan({ levelGal:t.levelGal, capGal:t.capGal, fillGalH:t.fillGalH, roGph:null });
    return (
      <a className="rs-card rs-tankcard" href={rsHref('stage/collect')} aria-label={rt(L,'tankAria', { n:t.name, v:srVol(t.levelGal, c.units), u, p:pct })}>
        <RsTankViz level={t.levelGal} cap={t.capGal} w={big ? 112 : 92} h={big ? 176 : 150} />
        <span className="rs-tc">
          <span className="rs-l">{t.name}</span>
          <span className="rs-v tn">{srVol(t.levelGal, c.units)}<small>{u}</small></span>
          <span className="rs-pctline tn"><b>{pct}%</b> {rt(L,'fullOf', { c: srVol(t.capGal, c.units), u })}</span>
          <RsKv rows={[
            t.fillGalH ? [rt(L,'filling'), `+${srVol(t.fillGalH, c.units)} ${u}/h`] : null,
            plan.fullH != null ? [rt(L,'fullAt'), srClock(Date.now() + plan.fullH * 3600000, L)] : null,
          ]} />
          {t.readMs && <span className="rs-fresh"><RsIcon name="clock" size={13} />{rt(L,'readAt', { t: srClock(t.readMs, L) })}</span>}
        </span>
      </a>
    );
  }
  const pin = (tankPins || [])[0];
  return (
    <div className="rs-empty rs-tankempty">
      <RsTankViz empty w={big ? 96 : 72} h={big ? 150 : 116} />
      <div>
        <b>{pin ? rt(L,'tankPinT', { n: pin.label || rt(L,'tankWord') }) : rt(L,'tankNoneT')}</b>
        <p>{pin ? rt(L,'tankPinP') : rt(L,'tankNoneP')}</p>
      </div>
      <div className="rs-tebtn"><RsBtn kind="secondary" icon="plus" onClick={() => rsGo(pin ? 'pumps/add-tank/' + pin.id : 'pumps/add-tank')}>{rt(L, pin ? 'tankSetUp' : 'tankAdd')}</RsBtn></div>
    </div>
  );
}

// Boiling: a live, estimated syrup counter while a boil session runs. Rate =
// srSyrupRate(evaporator rate from the pan setting, sap Brix); the estimate is
// labelled as one. Otherwise the last logged boil.
function RsBoilNum({ c, boil }) {
  const L = c.lang, u = srU(c.units);
  const on = !!(boil && boil.start);
  const now = useRsTick(on && !srRM());
  if (!on) return <RsNum label={rt(L,'nBoiling')} value={rt(L,'nOff')} sub={rt(L,'nStartBoil')} href={rsHref('stage/boil')} />;
  const rate = srSyrupRate(srPanRate(ls.get('sg_panIdx', 0), ls.get('sg_panW',''), ls.get('sg_panH','')), c.sapBrix);
  const est = rate * Math.max(0, (now - boil.start) / 3600000);
  const sess = srSessInUnit(boil, c.units, srLegacyUnits()), drawn = sess.syrup || 0;
  return <RsNum label={rt(L,'nBoiling')} live={rt(L,'live')} value={srVol(est, c.units, 2)} unit={u}
    sub={drawn > 0 ? rt(L,'nEstBoilD', { d: fmt(drawn, 1), u }) : rt(L,'nEstBoil')} href={rsHref('stage/boil')} />;
}

// Syrup against last season, lined up on days from each season's first sap day.
function RsSyrupVsLast({ c, slog, prev, dayOfRun, big }) {
  const L = c.lang, u = srU(c.units);
  const n = Math.max(2, dayOfRun || 0);
  const cur = srCumFromFirst(slog, n);
  const last = prev ? srCumFromFirst(prev, n) : [];
  const now = cur.length ? cur[cur.length - 1] : 0;
  const then = last.length ? last[last.length - 1] : null;
  const prevTotal = prev ? seasonTotals(prev).syT : 0;
  if (!cur.length && !last.length) {
    return <RsStat title={rt(L,'svlTitle')} value={fmt(0, 1)} unit={u} note={rt(L,'svlEmpty')} />;
  }
  const d = then != null ? now - then : null;
  const pct = then > 0 ? Math.round(d / then * 100) : null;
  const yMax = Math.max(1, now, then || 0);
  const nice = yMax > 200 ? 100 : yMax > 50 ? 25 : yMax > 10 ? 5 : 1;
  const top = Math.ceil(yMax / nice) * nice;
  return (
    <RsStat title={rt(L,'svlTitle')} value={fmt(now, 1)} unit={u}
      delta={d != null ? <>{d >= 0 ? '+' : '−'}{fmt(Math.abs(d), 1)} {u}<br /><span>{pct != null ? rt(L, d >= 0 ? 'ahead' : 'behind', { p: Math.abs(pct) }) : ''}</span></> : null}
      note={prev && prevTotal > 0 ? rt(L,'svlNote', { y: c.season - 1, t: fmt(prevTotal, 1), u }) : rt(L,'svlNoPrev', { y: c.season - 1 })}>
      <RsLineChart h={big ? 180 : 150} yMax={top} yTicks={[0, top / 2, top]}
        series={[
          ...(last.length ? [{ v:last, c:T.mute, dash:'5 5', end:String(c.season - 1) }] : []),
          ...(cur.length ? [{ v:cur, c:T.tx, area:true, end:String(c.season) }] : []),
        ]}
        xLabels={[[0, rt(L,'dayN', { n:1 })], [n - 1, rt(L,'dayN', { n })]]} rowLabel={i => rt(L,'dayN', { n: i + 1 })} dp={1}
        label={rt(L,'svlAria', { v: fmt(now, 1), u, n, l: then != null ? fmt(then, 1) : '0' })} />
    </RsStat>
  );
}

// Operations at a glance (iPad landscape and desktop only): pumps with their
// live status and every line end with its latest reading. Phones reach the
// same facts one tap away on the Pumps tab.
function RsOpsCard({ c, ops }) {
  const L = c.lang;
  const lines = ops.lines.filter(l => l.latest || l.trees.length);
  return <>
    <h2 className="rs-sec">{rt(L,'opsCard')}<a className="rs-more" href={rsHref('pumps')}>{rt(L,'tabPumps')}<RsIcon name="chev" size={18} /></a></h2>
    {ops.pumps.length || lines.length ? <div className="rs-list rs-opslist">
      {ops.pumps.map(p => <a key={p.id} className="rs-row" href={rsHref('pumps/' + p.id)}><RsPumpTile p={p} size={36} />
        <span className="rs-rt"><b>{p.name}</b><RsPumpStatus p={p} L={L} now={ops.now} still /></span></a>)}
      {lines.map(l => <a key={l.id} className="rs-row" href={rsHref('bush/line/' + l.id)}><RsLinePlate l={l} size={36} />
        <span className="rs-rt"><b>{l.label}</b><span className="tn">{l.latest ? rt(L,'readAgoShort', { a: srAgo(l.latest.ms, ops.now, L) }) : rt(L,'noReadingYet')}</span></span>
        <RsVacValue l={l} L={L} /></a>)}
    </div> : <div className="rs-empty"><p>{rt(L,'opsNone')}</p></div>}
  </>;
}

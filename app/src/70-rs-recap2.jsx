// ─── Recap detail and Diagnose (Phase 6) ────────────────────────────────────
// RsRecapDetail replaces RecapTab's detail: score breakdown (seasonScore via
// srScoreRows), the yield gap and its causes (srYieldGap), the season replay
// (srReplaySteps/srReplayMoments, unchanged), the share card (a local PNG,
// redrawn in Ember), RO savings (srRoSavings), year over year and collection
// points. RsDiagnose replaces DiagnoseTab (srDiagnose) and carries SugarSage's
// season insights (srInsights). Keys: sg_operator, sg_price_syrup,
// sg_recap_evap/burn/preheat, sg_dx_robrix, sg_dx_vac, sg_cost_wood, sg_rate_labor.

function useRsRecapData(c) {
  const v = useSrDataVersion();
  return React.useMemo(() => {
    const logs = ls.get('sg_logs2', {}) || {};
    const slog = logs[c.season] || {}, prev = logs[c.season - 1] || {};
    const brixArr = ls.get('sg_brixlog', []) || [];
    const f = srRecapFacts(slog, prev, brixArr, c.units);
    const taps = parseInt(c.trees) || 0;
    const model = yieldModelSaved();
    const fuelDef = FUELS.find(x => x.label === ls.get('sg_fuel', 'Firewood (cord)')) || FUELS[0];
    const brix = parseFloat(c.sapBrix) || 2.0;
    const sc = srSeasonScore({ sapT:f.sapGal, syT:f.syrupGal, fuelT:f.fuelT, taps, brix, yieldModel:model, fuelSpu:fuelDef.spu });
    const replay = srReplaySteps(slog);
    return { slog, prev, brixArr, f, taps, model, fuelDef, brix, sc, replay, moments: srReplayMoments(replay.steps, brixArr),
      cpoints: ls.get('sg_cpoints', []) || [] };
  }, [c.season, c.units, c.trees, c.sapBrix, v]);
}

function RsRecapDetail({ c }) {
  const L = c.lang, u = srU(c.units);
  const D = useRsRecapData(c);
  const f = D.f, sc = D.sc;
  const [op, setOp] = useState(() => ls.get('sg_operator', '') || '');
  const [price, setPriceS] = useState(() => getSyrupPrice());
  const [replay, setReplay] = useState(false);
  const [copied, setCopied] = useState(false);
  const setPrice = x => { setPriceS(x); if (x !== '') ls.set('sg_price_syrup', x); };
  const has = f.sapGal > 0 || f.syrupGal > 0;
  const canReplay = D.replay.entryCount >= 3;
  const theory = D.brix > 0 ? RULE_DIVISOR / D.brix : 0;
  const gap = srYieldGap(f.sapGal, f.syrupGal, D.taps, D.brix, D.model, price);
  const rows = has ? srScoreRows(sc, { syrupGal:f.syrupGal, sapGal:f.sapGal, fuelT:f.fuelT, taps:D.taps, brix:D.brix, model:D.model, fuelDef:D.fuelDef }) : [];
  const share = () => srShareCardPng(c, D, op);
  const copyScore = () => { const tx = rt(L,'scoreShareText', { y:c.season, s:sc.overall, g:sc.grade });
    // The clipboard can refuse (permissions, an insecure page): say so instead of failing silently.
    const done = ok => { setCopied(ok ? true : 'fail'); if (!ok) srToast(rt(L, 'copyFailed')); setTimeout(() => setCopied(false), 2000); };
    try { navigator.clipboard.writeText(tx).then(() => done(true), () => done(false)); } catch { done(false); } };
  const bp = srByPoint(D.slog, D.cpoints);
  return (
    <div className="rs-inner">
      <RsSubHead c={c} back="stage/recap" backLabel={rt(L,'st_recap')} eyebrow={rt(L,'stageOf', { n:6 })} title={rt(L,'rdTitle', { y:c.season })} lede={rt(L,'rdLede')} />
      <RsBanners c={c} />
      <div className="rs-btnrow" style={{ marginTop:0 }}>
        <RsBtn icon="play" onClick={() => setReplay(true)} disabled={!canReplay} id="rs-replay-open">{rt(L,'rpBtnW')}</RsBtn>
        <RsBtn kind="secondary" icon="up" onClick={share} disabled={!has} id="rs-share-card">{rt(L,'shareCard')}</RsBtn>
      </div>
      {!canReplay && <p className="rs-note">{rt(L, has ? 'rpNeed' : 'rpNeedNone')}</p>}
      {!has && <div className="rs-empty" style={{ marginTop:14 }}><b>{rt(L,'recapEmptyT', { y:c.season })}</b><p>{rt(L,'recapEmptyP')}</p></div>}
      <div className="rs-cols rs-after-btns">
        <div>
          {has && <><h2 className="rs-sec">{rt(L,'rdNumbers')}</h2>
          <div className="rs-card">
            <div className="rs-grid2 rs-recapnums" style={{ marginTop:0 }}>
              <div><div className="rs-meta">{rt(L,'rdRatio')}</div><div className="rs-mid tn">{f.ratio > 0 ? fmt(f.ratio, 1) + ':1' : '0'}</div><div className="rs-meta tn">{rt(L,'rdTheory', { r: fmt(theory, 1) })}</div></div>
              <div><div className="rs-meta">{rt(L,'rdLength')}</div><div className="rs-mid tn">{f.days != null ? f.days : '0'}<small>{rt(L,'daysW')}</small></div>
                <div className="rs-meta tn">{f.first && f.last ? rt(L,'rangeTo', { a: srDateShort(f.first, L), b: srDateShort(f.last, L) }) : rt(L,'rdNoDates')}</div></div>
              <div><div className="rs-meta">{rt(L,'rdBest')}</div><div className="rs-mid tn">{f.best ? fmt(parseFloat(f.best.val) || 0, 0) : '0'}<small>{u}</small></div><div className="rs-meta tn">{f.best ? srDateShort(f.best.date, L) : ''}</div></div>
              <div><div className="rs-meta">{rt(L,'rdRo')}</div><div className="rs-mid tn">{srVol(f.roGal, c.units)}<small>{u}</small></div>
                <div className="rs-meta tn">{f.roGal > 0 && f.evapGal > 0 ? rt(L,'rdUtil', { p: fmt(f.roGal / f.evapGal * 100, 0) }) : ''}</div></div>
              <div><div className="rs-meta">{rt(L,'avgBrix')}</div><div className="rs-mid tn">{fmt(f.brixAvg != null ? f.brixAvg : D.brix, 2)}<small>%</small></div>
                <div className="rs-meta tn">{f.brixMax != null ? rt(L,'rdBrixRange', { a: fmt(f.brixMin, 2), b: fmt(f.brixMax, 2) }) : rt(L,'brixSetting')}</div></div>
              <div><div className="rs-meta">{rt(L,'rdEntries')}</div><div className="rs-mid tn">{((D.slog.sapCollected || []).length + (D.slog.syrupMade || []).length)}</div>
                <div className="rs-meta tn">{rt(L,'rdEntriesSub', { s:(D.slog.sapCollected || []).length, y:(D.slog.syrupMade || []).length })}</div></div>
            </div>
          </div></>}
          {(f.sapChg != null || f.syrupChg != null) && <>
            <h2 className="rs-sec">{rt(L,'rdYoy', { y:c.season - 1 })}</h2>
            <div className="rs-list">
              {f.sapChg != null && <RsRow chev={false} title={rt(L,'sapCollected')} sub={rt(L,'rdYoySub', { a: srVol(f.prevSap, c.units), b: srVol(f.sapGal, c.units), u })}
                value={<RsSt kind={f.sapChg >= 0 ? 'ok' : 'check'}>{(f.sapChg >= 0 ? '+' : '-') + fmt(Math.abs(f.sapChg), 1)}%</RsSt>} />}
              {f.syrupChg != null && <RsRow chev={false} title={rt(L,'syrupMadeW')} sub={rt(L,'rdYoySub', { a: srVol(f.prevSyrup, c.units, 1), b: srVol(f.syrupGal, c.units, 1), u })}
                value={<RsSt kind={f.syrupChg >= 0 ? 'ok' : 'check'}>{(f.syrupChg >= 0 ? '+' : '-') + fmt(Math.abs(f.syrupChg), 1)}%</RsSt>} />}
            </div>
          </>}
          {has && <>
            <h2 className="rs-sec">{rt(L,'rdScoreT')}{sc.graded && <button type="button" className="rs-more" onClick={copyScore}>{rt(L, copied === true ? 'copied' : 'copyScore')}</button>}</h2>
            {sc.suspect ? <div className="rs-err"><b>{rt(L,'suspectT')}</b><p>{rt(L,'suspectP', { r: fmt(f.sapGal / (f.syrupGal || 1), 0), f: fmt(SR_RATIO_FLOOR, 0) })}</p>
                <RsBtn kind="secondary" href={rsHref('shack/log')}>{rt(L,'checkEntries')}</RsBtn></div>
              : <div className="rs-card rs-stack">
                {sc.graded ? <div className="rs-split" style={{ alignItems:'center' }}><div><div className="rs-meta">{rt(L,'scoreWord')}</div><div className="rs-huge tn">{sc.overall}<small>/ 100</small></div></div>
                  <div className="rs-gradel" aria-label={rt(L,'gradeAria', { g: sc.grade })}>{sc.grade}</div></div>
                  : <div><b className="rs-cardt">{rt(L,'noGradeT')}</b><p className="rs-meta">{rt(L,'noGradeP')}</p></div>}
                {rows.map(r => <RsBarRow key={r.id} label={rt(L, 'sr_' + r.id)} value={String(r.score)} pct={r.score} tone={r.score >= 80 ? 'ok' : r.score >= 60 ? '' : 'bad'} sub={srScoreSub(r, D.model, L, c.units)} />)}
              </div>}
          </>}
          {has && f.ratio > 0 && theory > 0 && <>
            <h2 className="rs-sec">{rt(L,'rdConvT')}</h2>
            <div className="rs-card">
              <div className="rs-grid3">
                <div><div className="rs-meta">{rt(L,'rdActual')}</div><div className="rs-mid tn">{fmt(f.ratio, 1)}:1</div></div>
                <div><div className="rs-meta">{rt(L,'rdRule86', { b: fmt(D.brix, 1) })}</div><div className="rs-mid tn">{fmt(theory, 1)}:1</div></div>
                <div><div className="rs-meta">{rt(L,'rdVsTheory')}</div><div className="rs-mid tn">{(f.ratio >= theory ? '+' : '-') + fmt(Math.abs((f.ratio - theory) / theory * 100), 0)}%</div></div>
              </div>
              {f.ratio > theory * 1.15 && <p className="rs-note">{rt(L,'rdConvHigh', { p: fmt((f.ratio - theory) / theory * 100, 0) })}</p>}
            </div>
          </>}
          <h2 className="rs-sec">{rt(L,'rdOpName')}</h2>
          <input className="rs-field" aria-label={rt(L,'rdOpName')} value={op} maxLength={48} placeholder={rt(L,'rdOpPh')} onChange={e => { setOp(e.target.value); ls.set('sg_operator', e.target.value); }} />
          <p className="rs-note">{rt(L,'rdOpNote')}</p>
        </div>
        <div>
          {gap && <>
            <h2 className="rs-sec">{rt(L,'gapT')}</h2>
            <div className="rs-card">
              <div className="rs-grid2" style={{ marginTop:0 }}>
                <div><div className="rs-meta">{rt(L,'gapMade')}</div><div className="rs-mid tn">{srVol(f.syrupGal, c.units, 1)}<small>{u}</small></div></div>
                <div><div className="rs-meta">{rt(L, gap.gapMid > 0 ? 'gapGap' : 'gapSurplus')}</div><div className="rs-mid tn">{gap.gapMid > 0 ? srVol(gap.gapMid, c.units) : '+' + srVol(Math.abs(gap.gapLow), c.units)}<small>{u}</small></div></div>
              </div>
              <RsKv rows={[[rt(L,'gapBench'), `${rt(L,'rangeTo', { a: srVol(gap.lo, c.units), b: srVol(gap.hi, c.units) })} ${u}`]]} />
              <p className="rs-meta tn">{rt(L,'gapBenchNote', { a: fmt(fromGal(D.model.low, c.units), 2), b: fmt(fromGal(D.model.high, c.units), 2), u, m: srModelName(D.model.label, L), na: fmt(fromGal(SR_YIELD_BAND.low, c.units), 2), nb: fmt(fromGal(SR_YIELD_BAND.high, c.units), 2) })}</p>
              {gap.gapMid > 0 && <RsBarRow label={rt(L,'gapYours')} value={`${srVol(f.syrupGal, c.units, 1)} / ${srVol(gap.hi, c.units)} ${u}`} pct={Math.min(100, f.syrupGal / gap.hi * 100)} />}
              {gap.gapMid > 2 && <div className="rs-split" style={{ marginTop:12, alignItems:'flex-end' }}><div><b>{rt(L,'gapCosts')}</b><div className="rs-meta">{rt(L,'gapAtPrice', { p: srMoney(srPerU(parseFloat(price) || 0, c.units), c.units === 'L' ? 2 : 0), u })}</div></div>
                <div className="rs-big tn">{srMoney(gap.dollarGap)}</div></div>}
              <label className="rs-fl" htmlFor="rs-gap-p">{rt(L,'bevPrice', { u })}</label>
              <RsMoney id="rs-gap-p" value={c.units === 'L' ? +srPerU(parseFloat(price) || 0, c.units).toFixed(2) : price} onChange={x => setPrice(x === '' ? '' : srPerGal(x, c.units))} label={rt(L,'bevPrice', { u })} steps={[-1, 1]} dp={c.units === 'L' ? 2 : 0} />
            </div>
            <h2 className="rs-sec">{rt(L,'gapCausesT')}</h2>
            <div className="rs-stack">{gap.causes.map(cz => <RsDisclose key={cz.id} tone={cz.sev} kicker={rt(L, 'sev_' + cz.sev)} title={rt(L, 'gc_' + cz.id)}
              sub={rt(L, 'gc_' + cz.id + '_d', { u, y: fmt(fromGal(gap.ypp, c.units), 2), a: fmt(fromGal(D.model.low, c.units), 2), b: fmt(fromGal(D.model.high, c.units), 2), m: srModelName(D.model.label, L), na: fmt(fromGal(SR_YIELD_BAND.low, c.units), 2), nb: fmt(fromGal(SR_YIELD_BAND.high, c.units), 2), cw: rt(L, cz.cls === 'strong' ? 'ycStrong' : 'ycNormal'), add: srVol(cz.add || 0, c.units), r: fmt(gap.actualRatio || 0, 0), p: fmt(100 - (gap.effPct || 0), 0), bx: fmt(D.brix, 1) })}>
              <div className="rs-list">{cz.fixes.map(fx => <div key={fx} className="rs-row rs-fix"><span className="rs-rt"><b>{rt(L, 'fix_' + fx)}</b>
                <span>{rt(L,'fixMeta', { c: rt(L, 'fixC_' + fx), t: rt(L, 'fixT_' + fx) })}</span></span><span className="rs-rv">{rt(L, 'imp_' + SR_FIXES[fx].impact)}</span></div>)}</div>
            </RsDisclose>)}</div>
          </>}
          {has && <RsRoSavings c={c} f={f} brix={D.brix} />}
          {bp && <>
            <h2 className="rs-sec">{rt(L,'rdPoints')}</h2>
            <div className="rs-list">
              {bp.rows.map(p => <RsRow key={p.id} chev={false} icon={null} title={<><span className="rs-cpdot" style={{ background:p.color }} aria-hidden="true" />{p.name}</>}
                sub={rt(L,'rdPointSub', { n: p.runs, r: p.syrup > 0 ? fmt(p.sap / p.syrup, 1) + ':1' : rt(L,'noRatio') })} value={`${fmt(p.sap, 1)} ${u}`} />)}
              {(bp.unSap > 0 || bp.unSyrup > 0) && <RsRow chev={false} title={rt(L,'rdUnassigned')} value={`${fmt(bp.unSap, 1)} ${u}`} />}
            </div>
          </>}
          <div style={{ marginTop:16 }}><RsBtn kind="secondary" icon="download" onClick={() => exportSeasonPDF({ season:c.season, trees:c.trees, units:c.units, logs: ls.get('sg_logs2', {}), brixLog: D.brixArr, sapBrix:c.sapBrix })}>{rt(L,'exportPdf', { y:c.season })}</RsBtn></div>
        </div>
      </div>
      {replay && canReplay && <RsReplay c={c} D={D} onClose={() => setReplay(false)} onShare={share} />}
    </div>
  );
}
// Per-tap and per-gallon figures are computed in gallons and shown in the display unit.
function srScoreSub(r, model, L, units) {
  const u = srU(units);
  if (r.id === 'yield') return rt(L, 'srs_yield_' + r.band, { y: fmt(fromGal(r.ypp, units), 2), a: fmt(fromGal(SR_YIELD_BAND.low, units), 2), b: fmt(fromGal(SR_YIELD_BAND.high, units), 2), m: srModelName(model.label, L), u });
  if (r.id === 'eff') return rt(L, 'srs_eff', { a: fmt(r.ratio, 0), t: fmt(r.theory, 0) });
  if (r.id === 'fuel') return rt(L, 'srs_fuel', { f: srFine(srPerU(r.fr, units)), b: srFine(srPerU(r.bench, units)), fu: r.unit, w: rt(L, units === 'L' ? 'litreW' : 'gallonW') });
  return rt(L, 'srs_data', { n: r.pts });
}

// RO savings against a straight boil. Inputs live in sg_recap_* and sg_dx_robrix.
function RsRoSavings({ c, f, brix }) {
  const L = c.lang, u = srU(c.units);
  const [ev, setEv] = useRsPref('sg_recap_evap', 50);
  const [burn, setBurn] = useRsPref('sg_recap_burn', 23);
  const [pre, setPreS] = useState(() => !!ls.get('sg_recap_preheat', false));
  const [rb, setRb] = useRsPref('sg_dx_robrix', 8);
  const setPre = x => { setPreS(x); ls.set('sg_recap_preheat', x); };
  const s = srRoSavings(f.sapGal, f.roGal, parseFloat(ev) || 50, parseFloat(burn) || 23, pre, parseFloat(rb) || 8, brix);
  if (!s) return null;
  const n1 = x => x >= 10 ? fmt(x, 0) : fmt(x, 1);
  return <>
    <h2 className="rs-sec">{rt(L,'roSavT')}</h2>
    <div className="rs-card rs-stack">
      <div className="rs-meta">{rt(L,'roSavHours')}</div>
      <RsBarRow label={rt(L,'roStraight')} value={`${n1(s.straightHrs)} h`} pct={100} tone="mute" />
      <RsBarRow label={rt(L, pre ? 'roWithPre' : 'roWith')} value={`${n1(s.roHrs)} h`} pct={s.roHrs / Math.max(s.straightHrs, 0.1) * 100}
        sub={f.roGal > 0 ? rt(L,'roConcNote', { r: srVol(f.roGal, c.units), c: srVol(s.roConc, c.units), u }) : rt(L,'roNoData')} />
      <div className="rs-meta">{rt(L,'roSavWood')}</div>
      <RsBarRow label={rt(L,'roStraight')} value={`${n1(s.straightWood)} lb`} pct={100} tone="mute" />
      <RsBarRow label={rt(L, pre ? 'roWithPre' : 'roWith')} value={`${n1(s.roWood)} lb`} pct={s.roWood / Math.max(s.straightWood, 0.1) * 100} />
      {s.savedHrs > 0 && <div className="rs-grid3" style={{ marginTop:6 }}>
        <div><div className="rs-meta">{rt(L,'roSavedH')}</div><div className="rs-mid tn">{fmt(s.savedHrs, 0)}<small>h</small></div></div>
        <div><div className="rs-meta">{rt(L,'roSavedW')}</div><div className="rs-mid tn">{s.savedWood >= 1000 ? fmt(s.savedWood / 1000, 1) + 'k' : fmt(s.savedWood, 0)}<small>lb</small></div></div>
        <div><div className="rs-meta">{rt(L,'roSavedC')}</div><div className="rs-mid tn">{fmt(s.cords, 2)}</div></div>
      </div>}
      {f.roGal === 0 && <p className="rs-note">{rt(L,'roLogNote')}</p>}
      <RsDisclose title={rt(L,'roInputs')} sub={rt(L,'roInputsSub', { e: fmt(parseFloat(ev) || 50, 0), b: fmt(parseFloat(burn) || 23, 0), x: fmt(parseFloat(rb) || 8, 1) })}>
        <div className="rs-grid2">
          <div><label className="rs-fl" htmlFor="rs-ro-e">{rt(L,'roEvapRate')}</label><RsStepper id="rs-ro-e" value={ev} onChange={setEv} steps={[-5, 5]} unit="gal/h" label={rt(L,'roEvapRate')} min={1} max={500} big={false} /></div>
          <div><label className="rs-fl" htmlFor="rs-ro-b">{rt(L,'roBurn')}</label><RsStepper id="rs-ro-b" value={burn} onChange={setBurn} steps={[-1, 1]} unit="lb/h" label={rt(L,'roBurn')} min={5} max={100} big={false} /></div>
        </div>
        <label className="rs-fl" htmlFor="rs-ro-x">{rt(L,'roOutBrix')}</label><RsStepper id="rs-ro-x" value={rb} onChange={setRb} steps={[-0.5, 0.5]} dp={1} unit="%" label={rt(L,'roOutBrix')} min={1} max={20} big={false} />
        <label className="rs-fl">{rt(L,'roPreheater')}</label>
        <RsSeg label={rt(L,'roPreheater')} value={pre} onChange={setPre} options={[[false, rt(L,'noW')], [true, rt(L,'yesW')]]} />
      </RsDisclose>
    </div>
  </>;
}

// ── Season replay: one step per logged day, bars rise, totals count up ──────
function RsReplay({ c, D, onClose, onShare }) {
  const L = c.lang, u = srU(c.units);
  const rm = srRM();
  const steps = D.replay.steps, stepMs = srReplayStepMs(steps.length);
  const [idx, setIdx] = useState(rm ? 0 : -1);
  const [playing, setPlaying] = useState(!rm);
  const idxRef = React.useRef(idx); idxRef.current = idx;
  useEffect(() => {
    if (rm || !playing) return;
    let raf, last = performance.now();
    const tick = now => { if (now - last >= stepMs) { last = now; if (idxRef.current >= steps.length - 1) { setPlaying(false); return; } setIdx(i => Math.min(i + 1, steps.length - 1)); } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, rm, stepMs, steps.length]);
  const cur = idx >= 0 ? steps[idx] : null, done = idx >= steps.length - 1, ended = done && !playing && idx >= 0;
  const caps = cur ? D.moments.filter(m => m.date === cur.date).map(m => m.type === 'bestRun' ? rt(L,'rpBest', { v: fmt(m.val, 0), u }) : m.type === 'firstBoil' ? rt(L,'rpFirst') : rt(L,'rpPeak', { v: fmt(parseFloat(m.val) || 0, 1) })) : [];
  const bars = []; steps.forEach((st, si) => st.bars.forEach(v => bars.push({ v, si, best: v === D.replay.maxBar })));
  return (
    <RsSheet title={rt(L,'rpTitleW', { y:c.season })} onClose={onClose} id="rs-replay">
      <div className="rs-rpbars" aria-hidden="true">{bars.map((b, i) => <i key={i} className={`${idx >= b.si ? 'on' : ''}${b.best ? ' best' : ''}`} style={{ height: Math.max(3, Math.round(b.v / D.replay.maxBar * 100)) + '%' }} />)}</div>
      <div className="rs-bar" style={{ marginTop:10 }}><i style={{ width: (idx < 0 ? 0 : steps.length > 1 ? idx / (steps.length - 1) * 100 : 100) + '%', background:T.bar }} /></div>
      <div className="rs-split rs-meta tn" style={{ marginTop:6 }}><span>{srDateShort(steps[0].date, L)}</span><span>{srDateShort(steps[steps.length - 1].date, L)}</span></div>
      <p className="rs-rpcap" aria-live="polite">{cur ? [srDateShort(cur.date, L), ...caps].join(' · ') : ' '}</p>
      <div className="rs-grid3">
        <div><div className="rs-meta">{rt(L,'rpSap', { u })}</div><div className="rs-mid tn">{fmt(cur ? cur.sapRun : 0, 0)}</div></div>
        <div><div className="rs-meta">{rt(L,'rpSyrup', { u })}</div><div className="rs-mid tn">{fmt(cur ? cur.syRun : 0, 1)}</div></div>
        <div><div className="rs-meta">{rt(L,'rpDay')}</div><div className="rs-mid tn">{Math.max(idx + 1, 0)}<small>/ {steps.length}</small></div></div>
      </div>
      <div className="rs-btnrow">
        {rm ? <><RsBtn kind="secondary" disabled={idx <= 0} onClick={() => setIdx(i => Math.max(0, i - 1))}>{rt(L,'rpPrevW')}</RsBtn>
            <RsBtn kind="secondary" disabled={done} onClick={() => setIdx(i => Math.min(steps.length - 1, i + 1))}>{rt(L,'rpNextW')}</RsBtn></>
          : ended ? <RsBtn kind="secondary" icon="play" onClick={() => { setIdx(-1); setPlaying(true); }}>{rt(L,'rpAgain')}</RsBtn>
          : <RsBtn kind="secondary" onClick={() => setPlaying(p => !p)}>{rt(L, playing ? 'rpPause' : 'rpPlay')}</RsBtn>}
        {(ended || rm) ? <RsBtn icon="up" onClick={onShare}>{rt(L,'shareCard')}</RsBtn> : <span />}
      </div>
    </RsSheet>
  );
}

// ── Share card: 1200 x 630 PNG drawn on this device. The same four totals as
// the pre-cutover card; Ember colours read from the tokens at draw time. Shared
// through the OS sheet when it takes files, otherwise downloaded. ────────────
const SR_CARD_W = 1200, SR_CARD_H = 630;
function srShareCardPng(c, D, op) {
  const L = c.lang, u = srU(c.units), f = D.f;
  const cv = document.createElement('canvas'); cv.width = SR_CARD_W; cv.height = SR_CARD_H;
  const ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return;
  const W = SR_CARD_W, H = SR_CARD_H, F = "'Barlow', system-ui, -apple-system, 'Segoe UI', sans-serif";
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, tok('s2')); g.addColorStop(1, tok('bg'));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(780, 60); ctx.scale(8.2, 8.2); ctx.strokeStyle = tok('acc'); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.globalAlpha = 0.9; ctx.lineWidth = 2.2; ctx.stroke(new Path2D(M_TREE_CROWN_D)); ctx.lineWidth = 3.4; ctx.stroke(new Path2D(M_TREE_GROUND_D)); ctx.restore();
  ctx.textAlign = 'left'; ctx.fillStyle = tok('tx'); ctx.font = `800 60px ${F}`;
  ctx.fillText((op || '').trim() || rt(L,'scName'), 84, 160, 640);
  ctx.fillStyle = tok('acc'); ctx.font = `700 26px ${F}`; ctx.fillText(rt(L,'scSeason', { y:c.season }).toUpperCase(), 84, 212, 640);
  ctx.fillStyle = tok('line2'); ctx.fillRect(84, 244, 560, 2);
  const stats = [
    [f.syrupGal > 0 ? fmt(fromGal(f.syrupGal, c.units), 1) : '0', u, rt(L,'scSyrup')], [f.sapGal > 0 ? fmt(fromGal(f.sapGal, c.units), 0) : '0', u, rt(L,'scSap')],
    [f.ratio > 0 ? fmt(f.ratio, 1) + ':1' : '0', '', rt(L,'scRatio')], [D.taps > 0 ? fmt(D.taps, 0) : '0', '', rt(L,'scTaps')]];
  stats.forEach(([val, unit, lbl], i) => {
    const x = 84 + i * 262; ctx.fillStyle = tok('tx'); ctx.font = `800 64px ${F}`; ctx.fillText(val, x, 520, 226);
    if (unit) { const w = Math.min(ctx.measureText(val).width, 226); ctx.fillStyle = tok('dim'); ctx.font = `600 26px ${F}`; ctx.fillText(unit, x + w + 10, 520); }
    ctx.fillStyle = tok('mute'); ctx.font = `700 20px ${F}`; ctx.fillText(lbl.toUpperCase(), x, 558);
  });
  ctx.textAlign = 'right'; ctx.fillStyle = tok('acc'); ctx.font = `700 24px ${F}`; ctx.fillText('sweetrun.app', W - 84, H - 40);
  cv.toBlob(blob => {
    if (!blob) return;
    const name = `sweetrun-season-${c.season}.png`;
    const tryShare = async () => {
      if (navigator.share && navigator.canShare) { try { const file = new File([blob], name, { type:'image/png' }); if (navigator.canShare({ files:[file] })) { await navigator.share({ files:[file] }); return true; } } catch (e) { if (e && e.name === 'AbortError') return true; } }
      return false;
    };
    tryShare().then(ok => { if (ok) return; const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); srToast(rt(L,'scSaved')); });
  }, 'image/png');
}

// ── Diagnose a slow season (replaces DiagnoseTab) ────────────────────────────
const SR_DX_DP = { ypt:1, lo:0, hi:0, gap:1, taps:0, lost:0, r:1, syr:1, price:0, ar:1, tr:1, off:0, excess:0, floor:0, maxB:0, brix:1, pct:0, cords:1,
  save:0, ro:1, ev:1, wood:0, rb:1, addl:0, roi:0, bad:0, n:0, worst:1, chg:0, sChg:0, now:0, prev:0, syNow:1, syPrev:1, avg:2, late:2, hrs:0, lr:0, cost:0, rev:0, runs:0 };
function srDxVars(f, units, L) {
  const o = { u: srU(units) };
  Object.keys(f.v || {}).forEach(k => { const x = f.v[k]; o[k] = typeof x === 'number' ? fmt(Math.abs(x), SR_DX_DP[k] ?? 1) : x; });
  if (f.v && f.v.vac) o.vac = rt(L, 'vac_' + f.v.vac);
  if (f.v && f.v.chg != null) o.sign = f.v.chg >= 0 ? '+' : '-';
  if (f.v && f.v.sChg != null) o.sSign = f.v.sChg >= 0 ? '+' : '-';
  o.roiV = fmt(f.roi || 0, 0);
  return o;
}
const SR_DX_DETAILS = { yield:4, conv:3, convBad:3, roLow:4, roNone:3, roBrixLow:3, vacuum:4, grades:4, yoyDown:4, yoyUp:4, brixDown:3, labor:4 };
function RsDiagnose({ c }) {
  const L = c.lang, u = srU(c.units);
  const v = useSrDataVersion();
  const [price, setPriceS] = useState(() => getSyrupPrice());
  const [wood, setWoodS] = useState(() => getWoodCost());
  const [lr, setLrS] = useState(() => getLaborRate());
  const [ro, setRo] = useRsPref('sg_dx_robrix', 0);
  const [vac, setVac] = useRsPref('sg_dx_vac', 'gravity');
  const w = (k, set) => x => { set(x); if (x !== '') ls.set(k, x); };
  const logs = React.useMemo(() => ls.get('sg_logs2', {}) || {}, [v]);
  const slog = logs[c.season] || {};
  const has = (slog.sapCollected || []).length > 0 || (slog.syrupMade || []).length > 0;
  const findings = srDiagnose({ slog, prevSlog: logs[c.season - 1] || {}, brixLog: ls.get('sg_brixlog', []), pins: ls.get('sg_lines_pins', []),
    routeResults: ls.get('sg_lines_results', []), trees: c.trees, units: c.units, sapBrix: c.sapBrix, syrupPrice: parseFloat(price) || 0,
    woodCost: parseFloat(wood) || 0, laborRate: parseFloat(lr) || 0, vacLevel: vac, roOutBrix: ro });
  const total = findings.reduce((s, f) => s + (Number.isFinite(f.roi) ? f.roi : 0), 0);
  const cnt = s => findings.filter(f => f.sev === s).length;
  const G = seasonTotalsGal(slog, c.units);
  const fuelDef = FUELS.find(x => x.label === ls.get('sg_fuel', 'Firewood (cord)')) || FUELS[0];
  const brix = parseFloat(c.sapBrix) || 2.0, taps = parseInt(c.trees) || 0;
  const sc = srSeasonScore({ sapT:G.sapGal, syT:G.syrupGal, fuelT:G.fuelT, taps, brix, yieldModel:yieldModelSaved(), fuelSpu:fuelDef.spu });
  const ins = srInsights(G.sapGal, G.syrupGal, G.roGal, G.fuelT, taps, brix, sc.effScore, fuelDef);
  const kind = s => s === 'high' ? 'fault' : s === 'medium' ? 'check' : s === 'low' ? 'idle' : 'ok';
  return (
    <div className="rs-inner">
      <RsSubHead c={c} back="stage/recap" backLabel={rt(L,'st_recap')} eyebrow={rt(L,'stageOf', { n:6 })} title={rt(L,'sc_diagnose')} lede={rt(L,'dxLede', { y:c.season })} />
      <RsBanners c={c} />
      <div className="rs-cols">
        <div>
          <div className="rs-card">
            <div className="rs-grid2">
              <div><label className="rs-fl" htmlFor="rs-dx-p" style={{ marginTop:0 }}>{rt(L,'dxPrice')}</label><RsMoney id="rs-dx-p" value={price} onChange={w('sg_price_syrup', setPriceS)} label={rt(L,'dxPrice')} steps={[-1, 1]} unit="/gal" /></div>
              <div><label className="rs-fl" htmlFor="rs-dx-w" style={{ marginTop:0 }}>{rt(L,'dxWood')}</label><RsMoney id="rs-dx-w" value={wood} onChange={w('sg_cost_wood', setWoodS)} label={rt(L,'dxWood')} steps={[-10, 10]} unit="/cord" /></div>
              <div><label className="rs-fl" htmlFor="rs-dx-l">{rt(L,'evLaborR')}</label><RsMoney id="rs-dx-l" value={lr} onChange={w('sg_rate_labor', setLrS)} label={rt(L,'evLaborR')} steps={[-1, 1]} unit="/h" /></div>
              <div><label className="rs-fl" htmlFor="rs-dx-r">{rt(L,'dxRoBrix')}</label><RsStepper id="rs-dx-r" value={ro} onChange={setRo} steps={[-0.5, 0.5]} dp={1} unit="%" label={rt(L,'dxRoBrix')} min={0} max={30} big={false} /></div>
            </div>
            <p className="rs-note">{rt(L,'dxRoBrixNote')}</p>
            <label className="rs-fl">{rt(L,'dxVac')}</label>
            <div className="rs-opts three" role="group" aria-label={rt(L,'dxVac')}>{['gravity', 'vac15', 'high'].map(k => <button key={k} type="button" className={`rs-opt${vac === k ? ' on' : ''}`}
              aria-pressed={vac === k} onClick={() => setVac(k)}><b>{rt(L, 'vacB_' + k)}</b><span>{rt(L, 'vacS_' + k)}</span></button>)}</div>
            <p className="rs-note">{rt(L,'dxGalNote')}</p>
          </div>
          {ins.length > 0 && <>
            <h2 className="rs-sec">{rt(L,'insT')}</h2>
            <div className="rs-stack">{ins.map(i => <RsDisclose key={i.id} tone={i.type === 'warn' ? 'medium' : i.type === 'ok' ? 'good' : 'low'} title={rt(L, 'ins_' + i.id)}
              sub={rt(L, 'ins_' + i.id + '_b', { su: u, y: fmt(fromGal(i.v.ypp || 0, c.units), 2), lo: fmt(fromGal(SR_YIELD_BAND.low, c.units), 2), hi: fmt(fromGal(SR_YIELD_BAND.high, c.units), 2), n: fmt(fromGal(NASS_US_AVG, c.units), 2), r: fmt(i.v.ratio || 0, 0), e: i.v.eff, g: i.v.gapPct, bx: fmt(i.v.brix || 0, 1),
                f: srFine(srPerU(i.v.fr || 0, c.units)), b: srFine(srPerU(i.v.bench || 0, c.units)), u: i.v.unit, w: rt(L, c.units === 'L' ? 'litreW' : 'gallonW'), p: i.v.pct })}>
              <p className="rs-body">{rt(L, 'ins_' + i.id + '_a')}</p></RsDisclose>)}</div>
          </>}
        </div>
        <div>
          {!has && <div className="rs-empty"><b>{rt(L,'dxNoneT', { y:c.season })}</b><p>{rt(L,'dxNoneP')}</p>
            <div className="rs-btnrow"><RsBtn kind="secondary" href={rsHref('shack/log')}>{rt(L,'sc_log')}</RsBtn><span /></div></div>}
          {findings.length > 0 && <>
            <h2 className="rs-sec">{rt(L,'dxFindings')}</h2>
            <div className="rs-grid2 rs-dxcount" style={{ marginTop:0 }}>
              {['high','medium','low','good'].map(s => <div key={s} className="rs-num"><span className="rs-nl"><RsSt kind={kind(s)}>{rt(L, 'sev_' + s)}</RsSt></span><span className="rs-nv tn">{cnt(s)}</span></div>)}
            </div>
            <div className="rs-stack" style={{ marginTop:12 }}>{findings.map(f => { const V = srDxVars(f, c.units, L); const nd = SR_DX_DETAILS[f.id] || 0;
              return <RsDisclose key={f.id} tone={f.sev} kicker={<>{rt(L, 'sev_' + f.sev)}{f.roi > 0 && Number.isFinite(f.roi) ? ' · ' + rt(L,'dxRoi', { v: f.roi >= 1000 ? fmt(f.roi / 1000, 1) + 'k' : fmt(f.roi, 0) }) : ''}</>}
                title={rt(L, 'dx_' + f.id + '_t', V)} sub={rt(L, 'dx_' + f.id + '_s', V)}>
                {RS_TR.en['dx_' + f.id + '_a'] && <div className="rs-card rs-tip"><b>{rt(L,'dxAction')}</b><p>{rt(L, 'dx_' + f.id + '_a', V)}</p></div>}
                {RS_TR.en['dx_' + f.id + '_p'] && <p className="rs-okline">{rt(L, 'dx_' + f.id + '_p', V)}</p>}
                {RS_TR.en['dx_' + f.id + '_e'] && <p className="rs-meta">{rt(L,'dxEffort', { e: rt(L, 'dx_' + f.id + '_e') })}</p>}
                {nd > 0 && <ul className="rs-details tn">{Array.from({ length:nd }, (_, i) => <li key={i}>{rt(L, 'dx_' + f.id + '_d' + (i + 1), V)}</li>)}</ul>}
              </RsDisclose>; })}</div>
            {total > 0 && <div className="rs-card" style={{ marginTop:12 }}><div className="rs-meta">{rt(L,'dxTotal')}</div><div className="rs-big tn">{srMoney(total)}</div><p className="rs-note">{rt(L,'dxTotalNote')}</p></div>}
            <p className="rs-note">{rt(L,'dxSources')}</p>
          </>}
        </div>
      </div>
    </div>
  );
}

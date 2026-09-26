// ─── 6 · Recap (Phase 6) ─────────────────────────────────────────────────────
// Totals, the goal ring, the season score (seasonScore, the one model Recap
// and SugarSage share), five charts from logged data, and the grade mix. The
// classic Recap (score detail, replay, share card, RO savings) and Diagnose
// stay reachable as detail rows until they are rebuilt.

function RsRecapStage({ c }) {
  const L = c.lang, u = srU(c.units);
  const m = useRsSeasonModel(c);
  const s = m.d.slog;
  const T_ = m.totals, G = m.totalsGal;
  const pct = m.goalGal > 0 ? Math.min(100, G.syrupGal / m.goalGal * 100) : null;
  const yr = String(c.season);
  const bxSeason = m.d.brixlog.filter(e => String(e.date || '').startsWith(yr) || (srDateParts(e.date) || {}).y === +yr).map(e => parseFloat(e.brix)).filter(isFinite);
  const avgBx = bxSeason.length ? bxSeason.reduce((a, b) => a + b, 0) / bxSeason.length : null;
  const fuelDef = FUELS.find(f => f.label === ls.get('sg_fuel', 'Firewood (cord)')) || FUELS[0];
  const sc = seasonScore({ sapT: G.sapGal, syT: G.syrupGal, fuelT: G.fuelT, taps: m.taps, brix: parseFloat(c.sapBrix) || 2.0, yieldModel: m.model, fuelSpu: fuelDef.spu });
  // Sap a day, first sap day to today (or the last logged day for a past season)
  const first = m.series.firstSap;
  const sapBy = srDayTotals(s.sapCollected);
  const lastSap = Object.keys(sapBy).sort().pop();
  const endIso = c.season < parseInt(m.todayIso.slice(0, 4)) ? (lastSap || m.todayIso) : m.todayIso;
  const nDays = first ? Math.min(90, srDaysBetween(first, endIso) + 1) : 0;
  const sapDays = nDays > 0 ? Array.from({ length:nDays }, (_, i) => sapBy[srIsoAdd(first, i)] || 0) : [];
  const peakI = sapDays.reduce((b, v, i) => v > sapDays[b] ? i : b, 0);
  const cum = first ? srCumFromFirst(s, Math.max(2, nDays)) : [];
  const perTap = m.taps > 0 ? cum.map(v => toGal(v, c.units) / m.taps) : [];
  const bl = m.d.brixlog.filter(e => (srDateParts(e.date) || {}).y === +yr && isFinite(parseFloat(e.brix))).slice().sort((a, b) => srDateMs(a.date) - srDateMs(b.date));
  const grades = {};
  (s.syrupMade || []).forEach(e => { const g = e.grade && e.grade !== '—' ? e.grade : 'none'; grades[g] = (grades[g] || 0) + (parseFloat(e.val) || 0); });
  const gOrder = [...SR_GRADES, 'none'].filter(g => grades[g] > 0);
  const gTot = gOrder.reduce((a, g) => a + grades[g], 0);
  const has = T_.sapT > 0 || T_.syT > 0;
  return (
    <>
      <RsHero photo="syrup-bottles" />
      <div className="rs-inner">
        <RsStageHead c={c} id="recap" m={m} lede={rt(L,'recapLede', { y:c.season })} />
        <RsBanners c={c} />
        {!has ? (
          <div className="rs-empty"><div className="rs-mk"><M.jug size={52} /></div><b>{rt(L,'recapEmptyT', { y:c.season })}</b><p>{rt(L,'recapEmptyP')}</p></div>
        ) : null}
        <div className="rs-cols rs-recapgrid">
          <div className="rc-col">
            <div className="rc-kpi"><div className="rs-card">
              <div className="rs-split" style={{ alignItems:'center' }}>
                <div><div className="rs-meta">{rt(L,'nSyrupSoFar')}</div><div className="rs-huge tn">{fmt(T_.syT, 1)}<small>{u}</small></div></div>
                {pct != null && <RsRing pct={pct} size={104} label={rt(L,'goalAria', { p: Math.round(pct), g: srVol(m.goalGal, c.units), u })} />}
              </div>
              {pct != null && <div className="rs-meta">{rt(L,'goalLine', { g: srVol(m.goalGal, c.units), u, t: fmt(m.taps, 0), m: m.model.label })}</div>}
              <div className="rs-grid2 rs-recapnums">
                <div><div className="rs-meta">{rt(L,'perTapW')}</div><div className="rs-mid tn">{m.taps > 0 ? fmt(T_.syT / m.taps, 2) : '0'}<small>{u}</small></div></div>
                <div><div className="rs-meta">{rt(L,'sapCollected')}</div><div className="rs-mid tn">{fmt(T_.sapT, 0)}<small>{u}</small></div></div>
                <div><div className="rs-meta">{rt(L,'avgBrix')}</div><div className="rs-mid tn">{avgBx != null ? fmt(avgBx, 1) + '%' : fmt(parseFloat(c.sapBrix) || 2, 1) + '%'}</div>
                  <div className="rs-meta">{avgBx != null ? rt(L,'nReadings', { n: bxSeason.length }) : rt(L,'brixSetting')}</div></div>
                <div><div className="rs-meta">{rt(L,'nBoilHours')}</div><div className="rs-mid tn">{fmt(T_.hoursT, 1)}<small>h</small></div></div>
              </div>
            </div></div>
            <div className="rc-grade"><h2 className="rs-sec">{rt(L,'seasonGrade')}</h2>
            {sc.suspect ? (
              <div className="rs-err"><b>{rt(L,'suspectT')}</b><p>{rt(L,'suspectP', { r: fmt(T_.sapT / (T_.syT || 1), 0), f: fmt(SR_RATIO_FLOOR, 0) })}</p>
                <RsBtn kind="secondary" href={rsHref('shack/log')}>{rt(L,'checkEntries')}</RsBtn></div>
            ) : sc.graded ? (
              <div className="rs-card rs-scorecard">
                <div className="rs-split" style={{ alignItems:'center' }}>
                  <div><div className="rs-meta">{rt(L,'scoreWord')}</div><div className="rs-huge tn">{sc.overall}<small>/ 100</small></div></div>
                  <div className="rs-gradel" aria-label={rt(L,'gradeAria', { g: sc.grade })}>{sc.grade}</div>
                </div>
                <RsKv rows={[
                  sc.yieldScore != null ? [rt(L,'subYield'), `${sc.yieldScore}`] : null,
                  sc.effScore != null ? [rt(L,'subEff'), `${sc.effScore}`] : null,
                  sc.fuelScore != null ? [rt(L,'subFuel'), `${sc.fuelScore}`] : null,
                  [rt(L,'subData'), rt(L,'subDataV', { n: sc.dataPts })],
                ]} />
              </div>
            ) : (
              <div className="rs-empty"><b>{rt(L,'noGradeT')}</b><p>{rt(L,'noGradeP')}</p></div>
            )}
            </div>
            {gOrder.length > 0 && <div className="rc-mix">
              <h2 className="rs-sec">{rt(L,'byGrade')}</h2>
              <div className="rs-card">
                <div className="rs-gradebar" role="img" aria-label={rt(L,'gradeMixAria')}>{gOrder.map((g, i) => <i key={g} style={{ flex: grades[g], background: `var(--rs-grade-${g === 'none' ? 'x' : SR_GRADES.indexOf(g) + 1})` }} />)}</div>
                <RsKv rows={gOrder.map(g => [<><span className="rs-swatch" style={{ background: `var(--rs-grade-${g === 'none' ? 'x' : SR_GRADES.indexOf(g) + 1})` }} />{g === 'none' ? rt(L,'noGradeGiven') : srGradeLabel(g, L)}</>,
                  `${fmt(grades[g], 1)} ${u} · ${fmt(grades[g] / gTot * 100, 0)}%`])} />
              </div>
            </div>}
          </div>
          <div className="rc-col">
            <div className="rc-charts"><h2 className="rs-sec">{rt(L,'howGoing')}</h2>
            <div className="rs-stack">
              <RsSyrupVsLast c={c} slog={s} prev={m.d.prevSlog} dayOfRun={m.series.dayOfRun || nDays} />
              {sapDays.length > 0 && <RsStat title={rt(L,'sapADay')} value={fmt(sapDays[sapDays.length - 1], 0)} unit={rt(L,'uLast', { u })}
                delta={<>{rt(L,'peakV', { v: fmt(sapDays[peakI], 0) })}<br /><span>{srDayLabel(srIsoAdd(first, peakI), L)}</span></>}>
                <RsBarChart v={sapDays} hi={sapDays.length - 1} unitFmt={x => fmt(x, 0)} label={rt(L,'sapDayAria', { n: nDays })}
                  xLabels={[[0, srDayLabel(first, L)], [sapDays.length - 1, srDayLabel(srIsoAdd(first, sapDays.length - 1), L)]]} />
              </RsStat>}
              {perTap.length > 1 && (() => {
                // Per tap in the display unit; the NASS benchmark (gal a tap) converted with it.
                const pt = perTap.map(v => fromGal(v, c.units)), last = pt[pt.length - 1], nass = fromGal(NASS_US_AVG, c.units);
                const step = c.units === 'L' ? 0.5 : 0.1, top = Math.ceil(Math.max(fromGal(0.4, c.units), last) / step - 1e-9) * step;
                const tk = +(top / 2).toFixed(2), topR = +top.toFixed(2);
                return <RsStat title={rt(L,'perTapTitle')} value={fmt(last, 3)} unit={rt(L,'uPerTap', { u })}
                  delta={<span>{rt(L,'usAvg', { v: fmt(nass, 2) })}</span>} note={rt(L,'nassNote')}>
                  <RsLineChart yMax={topR} yTicks={[0, tk, topR]} refLine={{ v: nass, l: rt(L,'usWord') }} series={[{ v: pt, c:T.tx, area:true, end: fmt(last, 2) }]}
                    xLabels={[[0, rt(L,'dayN', { n:1 })], [pt.length - 1, rt(L,'dayN', { n: pt.length })]]} label={rt(L,'perTapAria')} />
                </RsStat>; })()}
              {bl.length >= 2 && <RsStat title={rt(L,'sugarInSap')} value={fmt(parseFloat(bl[bl.length - 1].brix), 1)} unit={rt(L,'pctLast')}
                delta={<span>{rt(L,'fromFirst', { v: fmt(parseFloat(bl[0].brix), 1) })}</span>} note={rt(L,'brixDrift')}>
                <RsLineChart yMax={Math.ceil(Math.max(...bl.map(e => parseFloat(e.brix))) + 0.5)} yTicks={[0, Math.ceil(Math.max(...bl.map(e => parseFloat(e.brix))) + 0.5)]}
                  series={[{ v: bl.map(e => parseFloat(e.brix)), c:T.sap, area:true, end: fmt(parseFloat(bl[bl.length - 1].brix), 1) + '%' }]}
                  xLabels={[[0, srDateShort(bl[0].date, L)], [bl.length - 1, srDateShort(bl[bl.length - 1].date, L)]]} label={rt(L,'brixTrendAria', { n: bl.length })} />
              </RsStat>}
            </div>
            </div>
            <div className="rc-more"><h2 className="rs-sec">{rt(L,'moreRecap')}</h2>
            <RsDetailRows c={c} paths={['stage/recap/season','stage/recap/diagnose']} />
            <div className="rs-list" style={{ marginTop:12 }}>
              <RsRow icon="list" family="power" title={rt(L,'sc_log')} sub={rt(L,'exportCsvS')} href={rsHref('shack/log')} />
            </div>
            <div style={{ marginTop:16 }}><RsBtn icon="download" id="rs-recap-pdf"
              onClick={() => exportSeasonPDF({ season:c.season, trees:c.trees, units:c.units, logs:m.d.logs, brixLog: ls.get('sg_brixlog',[]), sapBrix:c.sapBrix })}>{rt(L,'exportPdf', { y:c.season })}</RsBtn></div></div>
          </div>
        </div>
      </div>
    </>
  );
}

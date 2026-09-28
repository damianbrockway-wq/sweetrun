// ─── Weather watch detail screens (Phase 6) ─────────────────────────────────
// RsForecast replaces WeatherTab: the same Open-Meteo 7-day call, every day
// scored by _sapRunScore (the classic function, called as is, with the same
// run streak), the freeze-thaw ribbon, and each day's scoring factors.
// RsDegreeDays replaces SeasonTab: degree days since your start date (base
// 40°F, srDegreeDays) and the Brix trend with its buddy warning. Same keys:
// sg_wx_*, sg_ddlat/lon/loc/start, sg_brixlog.

// 7-day detail forecast, kept in memory for 30 minutes. Nothing is stored.
const _srWx7 = { key:null, at:0, data:null };
function srFetchWx7(lat, lon) {
  const key = `${lat},${lon}`;
  if (_srWx7.key === key && _srWx7.data && Date.now() - _srWx7.at < 1800000) return Promise.resolve(_srWx7.data);
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon
    + '&daily=temperature_2m_max,temperature_2m_min,windspeed_10m_max,precipitation_sum,sunshine_duration,weathercode'
    + '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=7';
  return fetch(url).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(d => {
    if (!d || !d.daily || !d.daily.time) throw new Error('no data');
    _srWx7.key = key; _srWx7.data = d; _srWx7.at = Date.now(); return d;
  });
}
// WeatherTab's day builder, unchanged: rounded temps, the run streak carried
// day to day (a day scoring 44+ extends it), yesterday's high for bud risk.
function srScoreForecast(D) {
  let runStreak = 0;
  return (D.time || []).slice(0, 7).map((date, i) => {
    const hiF = Math.round(D.temperature_2m_max?.[i] ?? 32);
    const loF = Math.round(D.temperature_2m_min?.[i] ?? 20);
    const windMph = Math.round(D.windspeed_10m_max?.[i] || 0);
    const precipIn = +((D.precipitation_sum?.[i] || 0).toFixed(2));
    const sunSec = D.sunshine_duration?.[i] || 0;
    const prevHiF = i > 0 ? Math.round(D.temperature_2m_max[i - 1]) : null;
    const sc = _sapRunScore(hiF, loF, windMph, precipIn, sunSec, prevHiF, runStreak);
    if (sc.score >= 44) runStreak++; else runStreak = 0;
    return { date, i, hiF, loF, windMph, precipIn, sunSec, score: sc.score, quality: sc.quality, buddyRisk: sc.buddyRisk };
  });
}
const SR_QUAL_KEY = { 'Excellent':'qExcellent', 'Good':'qGood', 'Fair':'qFair', 'Poor':'qPoor', 'No Flow':'qNoFlow' };

function RsForecast({ c }) {
  const L = c.lang;
  const v = useSrDataVersion();
  const loc = React.useMemo(() => selLocation(), [v]);
  const [st, setSt] = useState({ status: loc ? 'loading' : 'none', d: null });
  const [tick, setTick] = useState(0);
  const [editLoc, setEditLoc] = useState(false);
  const [sel, setSel] = useState(0);
  useEffect(() => {
    if (!loc) { setSt({ status:'none', d:null }); return; }
    let live = true; setSt(s => ({ status: s.d ? 'ok' : 'loading', d: s.d }));
    srFetchWx7(loc.lat, loc.lon).then(d => live && setSt({ status:'ok', d })).catch(() => live && setSt({ status:'error', d:null }));
    return () => { live = false; };
  }, [loc && loc.lat, loc && loc.lon, tick]);
  const days = st.d ? srScoreForecast(st.d.daily) : [];
  const good = days.filter(d => d.score >= 44).length;
  const best = days.length ? Math.max(...days.map(d => d.score)) : 0;
  const day = days[sel] || days[0];
  const dayName = d => d.i === 0 ? rt(L,'today') : srWeekday(d.date, L);
  let body;
  if (st.status === 'none' || editLoc) body = <RsPlaceSearch c={c} onDone={() => { setEditLoc(false); setTick(x => x + 1); }} onCancel={loc ? () => setEditLoc(false) : null} />;
  else if (st.status === 'loading') body = <div className="rs-card" aria-busy="true"><div className="rs-sk" style={{ height:18, width:'50%' }} />
    <div className="rs-sk" style={{ height:44, width:'35%', marginTop:12 }} /><div className="rs-sk" style={{ height:150, marginTop:16 }} /></div>;
  else if (st.status === 'error') body = <div className="rs-err" role="alert"><b>{rt(L,'wxErrT')}</b><p>{rt(L,'wxErrP')}</p>
    <RsBtn kind="secondary" onClick={() => { _srWx7.key = null; setTick(x => x + 1); }}>{rt(L,'tryAgain')}</RsBtn></div>;
  else body = <>
    <div className="rs-card">
      <div className="rs-split">
        <div><div className="rs-meta">{rt(L,'fcRunDays')}</div><div className="rs-big tn">{good}<small>{rt(L,'ofN', { n: days.length })}</small></div></div>
        <div style={{ textAlign:'right' }}><div className="rs-meta">{rt(L,'fcBest')}</div><div className="rs-mid tn">{best}<small>/ 100</small></div></div>
      </div>
      <div className="rs-scorebars" role="group" aria-label={rt(L,'fcPickDay')}>
        {days.map((d, i) => (
          <button key={d.date} type="button" className={`rs-sbar${i === sel ? ' on' : ''}${d.score >= 44 ? ' run' : ''}`} aria-pressed={i === sel}
            aria-label={rt(L,'fcDayAria', { d: dayName(d), s: d.score, q: rt(L, SR_QUAL_KEY[d.quality] || 'qNoFlow') })} onClick={() => setSel(i)}>
            <span className="rs-sbd">{d.i === 0 ? rt(L,'todayShort') : dayName(d)}</span>
            <span className="rs-sbtrack"><i style={{ height: Math.max(d.score > 0 ? 6 : 0, d.score) + '%' }} /></span>
            <b className="tn">{d.score > 0 ? d.score : '0'}</b>
            <span className="rs-sbt tn"><span>{d.hiF}°</span><span>{d.loF}°</span></span>
          </button>
        ))}
      </div>
      <p className="rs-note">{rt(L,'fcBarsNote')}</p>
    </div>
    {day && <div className="rs-card" style={{ marginTop:12 }}>
      <div className="rs-split" style={{ alignItems:'flex-start' }}>
        <div><div className="rs-meta">{dayName(day)}, {srDayLabel(day.date, L)}</div>
          <b className="rs-cardt">{rt(L, SR_QUAL_KEY[day.quality] || 'qNoFlow')}, {day.score} / 100</b></div>
        <div className="rs-mid tn" style={{ textAlign:'right' }}>{day.hiF}°<small>/ {day.loF}°F</small></div>
      </div>
      <RsKv rows={srFactorRows(day, L)} />
      {day.buddyRisk && <div className="rs-banner" style={{ marginTop:12 }}><span className="rs-bic"><RsIcon name="alert" size={22} /></span>
        <span className="rs-bt"><b>{rt(L,'buddyT')}</b><span>{rt(L,'buddyP')}</span></span></div>}
      <p className="rs-note">{rt(L,'fcModelNote')}</p>
    </div>}
  </>;
  return (
    <div className="rs-inner">
      <RsSubHead c={c} back="stage/weather" backLabel={rt(L,'st_weather')} eyebrow={rt(L,'stageOf', { n:1 })} title={rt(L,'sc_forecast')} lede={rt(L,'fcLede')} />
      <RsBanners c={c} />
      <div className="rs-cols">
        <div>{body}</div>
        <div>
          {days.length > 1 && !editLoc && <>
            <h2 className="rs-sec">{rt(L,'ribbonT')}</h2>
            <div className="rs-card"><RsRibbon days={days} lang={L} dayName={dayName} /><p className="rs-note">{rt(L,'ribbonNote')}</p></div>
          </>}
          {loc && !editLoc && <>
            <h2 className="rs-sec">{rt(L,'forecastFor')}</h2>
            <div className="rs-list"><RsRow icon="gps" family="weather" title={loc.name || rt(L,'yourPlace')} value={rt(L,'change')} onClick={() => setEditLoc(true)} /></div>
          </>}
          <h2 className="rs-sec">{rt(L,'handT')}</h2>
          <RsHandCheck c={c} />
          <h2 className="rs-sec">{rt(L,'moneyT')}</h2>
          <div className="rs-list"><RsRow icon="calc" family="power" title={rt(L,'bevTitle')} sub={rt(L,'bevSub')} href={rsHref('shack/breakeven')} /></div>
        </div>
      </div>
    </div>
  );
}
function srFactorRows(d, L) {
  const sw = d.hiF - d.loF, sunH = (d.sunSec || 0) / 3600;
  const n = k => rt(L, k);
  return [
    [n('fNight'), `${d.loF}°F · ${n(d.loF >= 18 && d.loF <= 28 ? 'fIdeal' : d.loF < 18 ? 'fVeryCold' : d.loF < 32 ? 'fLightFreeze' : 'fNoFreeze')}`],
    [n('fDay'),   `${d.hiF}°F · ${n(d.hiF >= 40 && d.hiF < 46 ? 'fIdeal' : d.hiF >= 50 ? 'fBuddy' : d.hiF >= 33 ? 'fMarginal' : 'fNoThaw')}`],
    [n('fSwing'), `${sw}°F · ${n(sw >= 25 ? 'fExcellent' : sw >= 18 ? 'fGood' : 'fLimited')}`],
    [n('fWind'),  `${d.windMph} mph · ${n(d.windMph <= 10 ? 'fCalm' : d.windMph <= 20 ? 'fLightWind' : 'fCutsFlow')}`],
    [n('fRain'),  `${d.precipIn} ${srUnitL('in', L)} · ${n(d.precipIn < 0.05 ? 'fDry' : d.precipIn < 0.2 ? 'fLightRain' : 'fHeavyRain')}`],
    [n('fSun'),   `${fmt(sunH, 1)} h · ${n(sunH >= 7 ? 'fSunny' : sunH >= 4 ? 'fPartSun' : 'fOvercast')}`],
  ];
}
// Freeze-thaw ribbon: highs and lows as two lines, the 32°F line, run days
// (the ideal rule) shaded. Drawn at its rendered width.
function RsRibbon({ days, lang, dayName }) {
  const [ref, W] = useRsWidth(320);
  const H = 120, pt = 10, pb = 22, pl = 8, pr = 40, ih = H - pt - pb, n = days.length, cw = (W - pl - pr) / n;
  const lo = Math.min(...days.map(d => d.loF), 28) - 4, hi = Math.max(...days.map(d => d.hiF), 40) + 4;
  const Y = v => pt + (hi - v) / (hi - lo) * ih, X = i => pl + (i + 0.5) * cw;
  const path = k => 'M' + days.map((d, i) => `${X(i).toFixed(1)} ${Y(d[k]).toFixed(1)}`).join(' L');
  return (
    <div ref={ref} className="rs-chartwrap">
      <svg className="rs-chart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={rt(lang,'ribbonAria', { n: days.filter(d => d.hiF >= 40 && d.loF <= 28).length })}>
        {days.map((d, i) => d.hiF >= 40 && d.loF <= 28 ? <rect key={i} x={pl + i * cw + 1} y={pt} width={cw - 2} height={ih} rx="4" style={{ fill:T.accSoft }} /> : null)}
        <line x1={pl} x2={W - pr} y1={Y(32)} y2={Y(32)} className="rs-refl" />
        <text x={W - pr + 4} y={Y(32) + 4} className="rs-ct">32°F</text>
        <path d={path('hiF')} fill="none" style={{ stroke:T.acc }} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={path('loF')} fill="none" style={{ stroke:T.ice }} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {days.map((d, i) => <g key={'p' + i}><circle cx={X(i)} cy={Y(d.hiF)} r="3" style={{ fill:T.acc }} /><circle cx={X(i)} cy={Y(d.loF)} r="3" style={{ fill:T.ice }} /></g>)}
        {days.map((d, i) => <text key={'t' + i} x={X(i)} y={H - 4} textAnchor="middle" className="rs-ct">{d.i === 0 ? rt(lang,'todayShort') : dayName(d).slice(0, 3)}</text>)}
      </svg>
      <div className="rs-legend"><span><i className="lg" style={{ background:T.acc }} />{rt(lang,'lgHigh')}</span><span><i className="lg" style={{ background:T.ice }} />{rt(lang,'lgLow')}</span>
        <span><i className="lg" style={{ background:T.accSoft, outline:`1px solid ${T.acc}` }} />{rt(lang,'lgRunDay')}</span></div>
      <RsDataTable caption={rt(lang,'ribbonAria', { n: days.filter(d => d.hiF >= 40 && d.loF <= 28).length })} head={['', rt(lang,'lgHigh'), rt(lang,'lgLow')]}
        rows={days.map(d => [dayName(d), fmt(d.hiF, 0) + '°F', fmt(d.loF, 0) + '°F'])} />
    </div>
  );
}
// A day judged by hand (SeasonIntelligence's quick check): no network needed.
function RsHandCheck({ c }) {
  const L = c.lang;
  const [hi, setHi] = useState(42), [lo, setLo] = useState(24);
  const r = srHandFlow(hi, lo);
  return (
    <div className="rs-card">
      <div className="rs-grid2">
        <div><label className="rs-fl" htmlFor="rs-hc-hi">{rt(L,'handHi')}</label><RsStepper id="rs-hc-hi" value={hi} onChange={setHi} steps={[-1, 1]} unit="°F" label={rt(L,'handHi')} min={-40} max={90} big={false} /></div>
        <div><label className="rs-fl" htmlFor="rs-hc-lo">{rt(L,'handLo')}</label><RsStepper id="rs-hc-lo" value={lo} onChange={setLo} steps={[-1, 1]} unit="°F" label={rt(L,'handLo')} min={-40} max={90} big={false} /></div>
      </div>
      {r && <RsBarRow label={rt(L, 'hand_' + r.id)} value={`${r.score} / 100`} pct={r.score} tone={r.score >= 70 ? '' : 'mute'} />}
    </div>
  );
}

// ── Degree days and Brix trend ───────────────────────────────────────────────
function RsDegreeDays({ c }) {
  const L = c.lang;
  const v = useSrDataVersion();
  const place = React.useMemo(() => { const la = ls.get('sg_ddlat', null), lo = ls.get('sg_ddlon', null); return la != null && lo != null ? { lat:la, lon:lo, name: ls.get('sg_ddloc', '') } : null; }, [v]);
  const wxLoc = React.useMemo(() => { const la = ls.get('sg_wx_lat', null), lo = ls.get('sg_wx_lon', null); return la != null && lo != null ? { lat:la, lon:lo, name: ls.get('sg_wx_name', '') } : null; }, [v]);
  const [start, setStartS] = useState(() => ls.get('sg_ddstart', '') || '');
  const [edit, setEdit] = useState(false);
  const [st, setSt] = useState({ status:'idle', d:null, err:'' });
  const [brixSheet, setBrixSheet] = useState(false);
  const [armed, setArmed] = useState(null);
  useEffect(() => { if (armed == null) return; const tm = setTimeout(() => setArmed(null), 3000); return () => clearTimeout(tm); }, [armed]);
  const setStart = s => { setStartS(s); ls.set('sg_ddstart', s); };
  const setPlace = (la, lo, name) => { ls.set('sg_ddlat', la); ls.set('sg_ddlon', lo); ls.set('sg_ddloc', name); };
  const slog = React.useMemo(() => ((ls.get('sg_logs2', {}) || {})[c.season]) || {}, [v, c.season]);
  const firstSap = srFirstIso(slog.sapCollected);
  useEffect(() => {
    if (!place || !start) { setSt({ status:'idle', d:null, err:'' }); return; }
    let live = true; setSt(s => ({ ...s, status:'loading' }));
    const today = new Date().toISOString().split('T')[0];
    const end = start > today ? start : today;
    fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${place.lat}&longitude=${place.lon}&start_date=${start}&end_date=${end}&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto`)
      .then(r => r.json()).then(d => { if (d.error) throw new Error(d.reason || 'error'); if (live) setSt({ status:'ok', d, err:'' }); })
      .catch(e => { if (live) setSt({ status:'error', d:null, err: e.message || '' }); });
    return () => { live = false; };
  }, [place && place.lat, place && place.lon, start]);
  const dd = st.d ? srDegreeDays(st.d.daily) : null;
  const log = React.useMemo(() => ls.get('sg_brixlog', []) || [], [v]);
  const tr = srBrixTrend(log);
  const del = id => { if (armed !== id) { setArmed(id); srToast(rt(L,'tapAgainDelete')); return; } if (ls.set('sg_brixlog', log.filter(e => e.id !== id))) { setArmed(null); srDataChanged(); } };
  const bmax = Math.ceil(Math.max(3, ...log.map(e => parseFloat(e.brix) || 0)) + 0.5);
  return (
    <div className="rs-inner">
      <RsSubHead c={c} back="stage/weather" backLabel={rt(L,'st_weather')} eyebrow={rt(L,'stageOf', { n:1 })} title={rt(L,'sc_degree')} lede={rt(L,'ddLede')} />
      <RsBanners c={c} />
      <div className="rs-cols">
        <div>
          <h2 className="rs-sec" style={{ marginTop:0 }}>{rt(L,'ddTitle')}</h2>
          {!place || edit ? <>
            <RsPlaceSearch c={c} onPick={setPlace} onDone={() => setEdit(false)} onCancel={place ? () => setEdit(false) : null} title={rt(L,'ddPlaceT')} lede={rt(L,'ddPlaceP')} />
            {wxLoc && <div style={{ marginTop:10 }}><RsBtn kind="secondary" icon="gps" onClick={() => { setPlace(wxLoc.lat, wxLoc.lon, wxLoc.name); srDataChanged(); setEdit(false); }}>{rt(L,'ddUseWx', { p: wxLoc.name || rt(L,'yourPlace') })}</RsBtn></div>}
          </> : <div className="rs-list"><RsRow icon="gps" family="weather" title={place.name || rt(L,'yourPlace')} sub={rt(L,'ddPlaceSub')} value={rt(L,'change')} onClick={() => setEdit(true)} /></div>}
          <div className="rs-card" style={{ marginTop:12 }}>
            <label className="rs-fl" htmlFor="rs-dd-start" style={{ marginTop:0 }}>{rt(L,'ddStart')}</label>
            <input id="rs-dd-start" className="rs-field" type="date" value={start} onChange={e => setStart(e.target.value)} />
            {firstSap && firstSap !== start && <div style={{ marginTop:10 }}><RsBtn kind="secondary" onClick={() => setStart(firstSap)}>{rt(L,'ddUseFirst', { d: srDateShort(firstSap, L) })}</RsBtn></div>}
          </div>
          {st.status === 'loading' && <div className="rs-card" aria-busy="true" style={{ marginTop:12 }}><div className="rs-sk" style={{ height:44, width:'40%' }} /><div className="rs-sk" style={{ height:120, marginTop:12 }} /></div>}
          {st.status === 'error' && <div className="rs-err" role="alert" style={{ marginTop:12 }}><b>{rt(L,'ddErrT')}</b><p>{rt(L,'ddErrP')}</p></div>}
          {st.status === 'idle' && <div className="rs-empty" style={{ marginTop:12 }}><b>{rt(L,'ddIdleT')}</b><p>{rt(L,'ddIdleP')}</p></div>}
          {dd && dd.days.length > 0 && <>
            <div className="rs-card" style={{ marginTop:12 }}>
              <div className="rs-grid3">
                <div><div className="rs-meta">{rt(L,'ddTotal')}</div><div className="rs-mid tn">{Math.round(dd.cumDD)}</div></div>
                <div><div className="rs-meta">{rt(L,'ddDays')}</div><div className="rs-mid tn">{dd.days.length}</div></div>
                <div><div className="rs-meta">{rt(L,'ddAvg')}</div><div className="rs-mid tn">{fmt(dd.avg, 1)}</div></div>
              </div>
              <div className="rs-list rs-ladder" style={{ marginTop:14 }}>
                {SR_DD_STAGES.map(s => <div key={s.id} className={`rs-rung${dd.stage === s.id ? ' on' : dd.cumDD >= s.t ? ' past' : ''}`}>
                  <span className="rs-rt"><b>{rt(L, 'dd_' + s.id)}</b>{dd.stage === s.id && <span>{rt(L, 'dd_' + s.id + '_n')}</span>}</span>
                  <span className="rs-rv tn">{s.t} DD</span></div>)}
              </div>
            </div>
            <div style={{ marginTop:12 }}>
              <RsDisclose title={rt(L,'ddDaily', { n: dd.days.length })}>
                <table className="rs-table tn"><thead><tr><th>{rt(L,'date')}</th><th>{rt(L,'hiW')}</th><th>{rt(L,'loW')}</th><th>DD</th><th>{rt(L,'totalW')}</th></tr></thead>
                  <tbody>{dd.days.slice().reverse().map(d => <tr key={d.date}><td>{srDateShort(d.date, L)}</td><td>{d.hi}°</td><td>{d.lo}°</td><td>{d.dd}</td><td>{d.cum}</td></tr>)}</tbody></table>
              </RsDisclose>
            </div>
          </>}
        </div>
        <div>
          <h2 className="rs-sec">{rt(L,'brixTrendT')}</h2>
          {tr.buddy && <div className="rs-banner" style={{ marginBottom:12 }}><span className="rs-bic"><RsIcon name="alert" size={22} /></span>
            <span className="rs-bt"><b>{rt(L,'buddyDropT')}</b><span>{rt(L,'buddyDropP', { l: fmt(tr.last, 1), p: fmt(tr.peak, 1) })}</span></span></div>}
          {log.length === 0 ? <div className="rs-empty"><b>{rt(L,'brixNoneT')}</b><p>{rt(L,'brixNoneP')}</p></div> :
            <RsStat title={rt(L,'latestReading')} value={fmt(tr.last, 1)} unit="%" delta={log.length >= 2 ? <span>{rt(L,'peakBrixV', { v: fmt(tr.peak, 1) })}</span> : null}>
              {log.length >= 2 && <RsLineChart yMax={bmax} yTicks={[0, bmax]} series={[{ v: log.map(e => parseFloat(e.brix) || 0), c:T.sap, area:true, name:'Brix', end: fmt(tr.last, 1) + '%' }]}
                xLabels={[[0, srDateShort(log[0].date, L)], [log.length - 1, srDateShort(log[log.length - 1].date, L)]]} label={rt(L,'brixTrendAria', { n: log.length })} rowLabel={i => srDateShort(log[i].date, L)} rowHead={rt(L,'date')} dp={1} />}
            </RsStat>}
          <div style={{ marginTop:12 }}><RsBtn icon="drop" onClick={() => setBrixSheet(true)}>{rt(L,'logBrix')}</RsBtn></div>
          {log.length > 0 && <div className="rs-list" style={{ marginTop:12 }}>
            {log.slice().reverse().map(e => <div key={e.id} className="rs-row rs-equip">
              <span className="rs-rt"><b className="tn">{fmt(parseFloat(e.brix) || 0, 1)}% Brix</b><span>{[srDateShort(e.date, L), e.note].filter(Boolean).join(' · ')}</span></span>
              <button type="button" className={`rs-iconbtn${armed === e.id ? ' bad' : ''}`} aria-label={rt(L,'deleteReading')} onClick={() => del(e.id)}><RsIcon name="trash" size={20} /></button>
            </div>)}
          </div>}
        </div>
      </div>
      {brixSheet && <RsBrixSheet c={c} onClose={() => setBrixSheet(false)} />}
    </div>
  );
}

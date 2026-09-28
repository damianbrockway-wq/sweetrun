// ─── Stage screens 1-3 (Phase 6): Weather watch, Plan & tap, Lines & tanks ───
// Each replaces the Phase 4 stage hub list. Classic screens that have not been
// rebuilt stay reachable as detail rows under their stage (RS_SCREENS).

function RsStageHead({ c, id, m, lede }) {
  const L = c.lang;
  const i = SR_STAGE_IDS.indexOf(id);
  const here = m && m.stageIdx === i, done = m && i < m.stageIdx;
  return (
    <header className="rs-phead">
      <RsPushBar href={rsHref('season')} label={rt(L,'tabSeason')} />
      <div className={`rs-eyebrow${here ? '' : ' plain'}`}>{rt(L,'stageOf', { n:i + 1 })}{here ? ' · ' + rt(L,'youAreHere') : done ? ' · ' + rt(L,'doneWord') : ''}</div>
      <h1 className="sm">{rt(L, 'st_' + id)}</h1>
      {lede !== false && <p className="rs-lede">{lede || rt(L, 'st_' + id + '_l')}</p>}
    </header>
  );
}
// Rows to the classic detail screens that live under this stage.
function RsDetailRows({ c, paths }) {
  const L = c.lang;
  const rows = paths.filter(p => RS_SCREENS[p] && !(RS_SCREENS[p].beta && !BETA_FEATURES));
  if (!rows.length) return null;
  return <div className="rs-list">{rows.map(p => <RsRow key={p} icon={RS_SCREENS[p].icon} family={RS_SCREENS[p].family}
    title={rt(L, RS_SCREENS[p].title)} sub={rt(L, RS_SCREENS[p].sub)} href={rsHref(p)} />)}</div>;
}
const srWeekday = (iso, lang) => { const p = srDateParts(iso); return p ? DAY[lang === 'fr' ? 'fr' : 'en'][new Date(p.y, p.mo - 1, p.d, 12).getDay()] : ''; };

// ── 1 · Weather watch ────────────────────────────────────────────────────────
function RsWeatherStage({ c }) {
  const L = c.lang;
  const m = useRsSeasonModel(c);
  const [editLoc, setEditLoc] = useState(false);
  const wx = m.wx;
  const days = [0,1,2,3,4,5,6,7,8,9].map(i => { const iso = srIsoAdd(m.todayIso, i); const d = wx.data && wx.data[iso]; return d ? { iso, i, hi: Math.round(d.hi), lo: Math.round(d.lo), cls: srDayClass(d.hi, d.lo) } : null; }).filter(Boolean);
  const good = days.filter(d => d.cls === 'ideal').length;
  let streak = null;
  for (let k = 0; k < days.length - 1; k++) if (days[k].cls === 'ideal' && days[k + 1].cls === 'ideal') { streak = days[k]; break; }
  const tonight = wx.data && wx.data[m.minutes >= 720 ? srIsoAdd(m.todayIso, 1) : m.todayIso];
  const x = v => Math.max(0, Math.min(100, (v - 10) / 50 * 100));
  const clsWord = cls => rt(L, cls === 'ideal' ? 'wxGoodRun' : cls === 'freezeThaw' ? 'wxFreezeThaw' : cls === 'tooWarm' ? 'wxTooWarm' : cls === 'allFreeze' ? 'wxAllFreeze' : 'wxNoRun');
  const clsKind = cls => cls === 'ideal' ? 'ok' : cls === 'allFreeze' ? 'ice' : 'idle';
  let body;
  if (wx.status === 'none' || editLoc) body = <RsPlaceSearch c={c} onDone={() => setEditLoc(false)} onCancel={m.d.loc ? () => setEditLoc(false) : null} />;
  else if (wx.status === 'loading') body = <div className="rs-card" aria-busy="true"><div className="rs-sk" style={{ height:18, width:'55%' }} /><div className="rs-sk" style={{ height:48, width:'40%', marginTop:14 }} />
    {[0,1,2,3,4,5].map(k => <div key={k} className="rs-sk" style={{ height:36, marginTop:12 }} />)}</div>;
  else if (wx.status === 'error') body = <div className="rs-err" role="alert"><b>{rt(L,'wxErrT')}</b><p>{rt(L,'wxErrP')}</p><RsBtn kind="secondary" onClick={wx.retry}>{rt(L,'tryAgain')}</RsBtn></div>;
  else body = (
    <div className="rs-card">
      <div className="rs-split"><div><div className="rs-meta">{rt(L,'goodDays10')}</div><div className="rs-big tn">{good}<small>{rt(L,'ofN', { n: days.length })}</small></div></div>
        <span className="rs-fresh"><RsIcon name="clock" size={14} />{rt(L,'updatedAt', { t: srClock(wx.at || Date.now(), L) })}</span></div>
      <p className="rs-meta" style={{ marginTop:8 }}>{rt(L,'runRule')}</p>
      <div style={{ marginTop:14 }}>
        {days.map(d => (
          <div key={d.iso} className="rs-wxd">
            <div className="rs-dname">{d.i === 0 ? rt(L,'today') : srWeekday(d.iso, L)}</div>
            <div className="rs-wxbar" role="img" aria-label={rt(L,'wxAria', { lo:d.lo, hi:d.hi })}><span className="fz" style={{ left: x(32) + '%' }} /><i style={{ left: x(d.lo) + '%', width: Math.max(2, x(d.hi) - x(d.lo)) + '%' }} /></div>
            <div className="rs-res"><RsSt kind={clsKind(d.cls)}>{clsWord(d.cls)}</RsSt><div className="rs-mute tn">{d.lo}° / {d.hi}°</div></div>
          </div>
        ))}
      </div>
      <p className="rs-note">{rt(L,'wxBarsNote')}</p>
    </div>
  );
  const first = m.series.firstSap;
  return (
    <>
      <RsHero photo="frost-morning" />
      <div className="rs-inner">
        <RsStageHead c={c} id="weather" m={m} lede={rt(L,'wxLede')} />
        <RsBanners c={c} />
        <div className="rs-cols">
          <div>
            {body}
            {m.d.loc && !editLoc && <div className="rs-list" style={{ marginTop:12 }}>
              <RsRow icon="gps" family="weather" title={m.d.loc.name || rt(L,'yourPlace')} sub={rt(L,'forecastFor')} value={rt(L,'change')} onClick={() => setEditLoc(true)} />
            </div>}
          </div>
          <div>
            <h2 className="rs-sec">{rt(L,'whenToTap')}</h2>
            <div className="rs-card">
              <b className="rs-cardt">{first ? rt(L,'firstSapOn', { d: srDateShort(first, L) }) : streak ? rt(L,'streakOn', { d: `${srWeekday(streak.iso, L)} ${srDayLabel(streak.iso, L)}` }) : rt(L,'noStreak')}</b>
              <p className="rs-meta">{first ? rt(L,'firstSapP', { n: m.series.dayOfRun }) : streak ? rt(L,'streakP') : rt(L,'noStreakP')}</p>
            </div>
            {tonight && <>
              <h2 className="rs-sec">{rt(L,'tonight')}</h2>
              <div className="rs-list">
                <RsRow icon="snow" family={tonight.lo <= 28 ? 'ice' : 'power'} chev={false}
                  title={tonight.lo <= 28 ? rt(L,'freezeTonight', { lo: Math.round(tonight.lo) }) : rt(L,'noFreezeTonight', { lo: Math.round(tonight.lo) })}
                  sub={tonight.lo <= 28 ? rt(L,'freezeTonightS') : rt(L,'noFreezeTonightS')} />
              </div>
            </>}
            <h2 className="rs-sec">{rt(L,'moreWeather')}</h2>
            <RsDetailRows c={c} paths={['stage/weather/forecast','stage/weather/degree-days']} />
            <div style={{ marginTop:16 }}><RsBtn onClick={() => rsGo('stage/tap')}>{rt(L,'goTap')}</RsBtn></div>
          </div>
        </div>
      </div>
    </>
  );
}
// Place search: Open-Meteo geocoding and GPS with Nominatim, writing the same
// sg_wx_name/lat/lon keys the classic Weather tab writes, in the same format.
function RsPlaceSearch({ c, onDone, onCancel, onPick, title, lede }) {
  const L = c.lang;
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = (la, lo, name) => { if (onPick) onPick(la, lo, name); else { ls.set('sg_wx_lat', la); ls.set('sg_wx_lon', lo); ls.set('sg_wx_name', name); } srDataChanged(); onDone && onDone(); };
  const search = async () => {
    if (!q.trim()) return;
    setBusy(true); setErr(''); setRes(null);
    try {
      const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=5&language=en&format=json');
      const d = await r.json();
      if (d.results && d.results.length) setRes(d.results); else setErr(rt(L,'placeNotFound'));
    } catch { setErr(rt(L,'searchFailed')); }
    setBusy(false);
  };
  const gps = () => {
    if (!navigator.geolocation) { setErr(rt(L,'noGps')); return; }
    setBusy(true); setErr('');
    navigator.geolocation.getCurrentPosition(async pos => {
      const la = pos.coords.latitude, lo = pos.coords.longitude;
      let name = la.toFixed(2) + '°, ' + lo.toFixed(2) + '°';
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${lo}&format=json&zoom=10`, { headers: { 'Accept-Language': 'en' } });
        const d = await r.json(); const a = d.address || {};
        const place = a.town || a.city || a.village || a.hamlet || a.county || a.state || '';
        const state = a.state || a.country || '';
        if (place) name = [place, state].filter(Boolean).join(', ');
      } catch {}
      setBusy(false); pick(la, lo, name);
    }, e => { setBusy(false); setErr(rt(L, e.code === 1 ? 'gpsDenied' : 'gpsFailed')); }, { timeout:10000, maximumAge:300000 });
  };
  return (
    <div className="rs-card">
      <b className="rs-cardt">{title || rt(L,'setPlaceT')}</b>
      <p className="rs-meta" style={{ margin:'4px 0 12px' }}>{lede || rt(L,'setPlaceP')}</p>
      <div className="rs-inline">
        <input className="rs-field" type="search" aria-label={rt(L,'placeSearch')} placeholder={rt(L,'placePh')} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
        <RsBtn kind="secondary" onClick={search} disabled={busy}>{rt(L,'find')}</RsBtn>
      </div>
      {res && <div className="rs-list" style={{ marginTop:10, background:'var(--rs-s2)' }}>
        {res.map((r, i) => { const name = [r.name, r.admin1, r.country_code].filter(Boolean).join(', ');
          return <RsRow key={i} title={r.name} sub={[r.admin1, r.country].filter(Boolean).join(', ')} onClick={() => pick(r.latitude, r.longitude, name)} />; })}
      </div>}
      {err && <p className="rs-errline" role="alert">{err}</p>}
      {onCancel ? <div className="rs-btnrow">
        <RsBtn kind="secondary" icon="gps" onClick={gps} disabled={busy}>{rt(L,'useGps')}</RsBtn>
        <RsBtn kind="secondary" onClick={onCancel}>{rt(L,'cancel')}</RsBtn>
      </div> : <div style={{ marginTop:12 }}><RsBtn kind="secondary" icon="gps" onClick={gps} disabled={busy}>{rt(L,'useGps')}</RsBtn></div>}
    </div>
  );
}

// ── 2 · Plan & tap ───────────────────────────────────────────────────────────
function RsTapStage({ c }) {
  const L = c.lang;
  const m = useRsSeasonModel(c);
  const trees = m.d.treePins;
  const [q, setQ] = useState('');
  const [f, setF] = useState('all');
  const [all, setAll] = useState(false);
  const [tree, setTree] = useState(null);
  const [dbh, setDbh] = useState(() => ls.get('sg_dbh', 14));
  const tapsOf = p => parseInt(p.taps) || 0;
  const look = p => (p.health && p.health !== 'good') || !!(p.notes && String(p.notes).trim());
  const cnt = { all: trees.length, two: trees.filter(p => tapsOf(p) >= 2).length, look: trees.filter(look).length, none: trees.filter(p => !tapsOf(p)).length };
  const Q = q.trim().toLowerCase();
  const list = trees.filter(p => f === 'all' || (f === 'two' && tapsOf(p) >= 2) || (f === 'look' && look(p)) || (f === 'none' && !tapsOf(p)))
    .filter(p => !Q || String(p.tagged || '').toLowerCase().includes(Q) || String(p.label || '').toLowerCase().includes(Q));
  const shown = all ? list : list.slice(0, 25);
  const tapSum = trees.reduce((s, p) => s + tapsOf(p), 0);
  const byLine = {};
  trees.forEach(p => { const k = p.mainline || ''; byLine[k] = byLine[k] || { trees:0, taps:0 }; byLine[k].trees++; byLine[k].taps += tapsOf(p); });
  const lineName = id => { const ml = m.d.mainlines.find(x => x.id === id); return ml ? ml.label : id ? rt(L,'mainlineN', { id }) : rt(L,'noMainline'); };
  const setD = v => { setDbh(v); if (v !== '') ls.set('sg_dbh', v); };
  return (
    <>
      <RsHero photo="tap-spout" />
      <div className="rs-inner">
        <RsStageHead c={c} id="tap" m={m} lede={rt(L,'tapLede')} />
        <RsBanners c={c} />
        <div className="rs-cols">
          <div>
            <div className="rs-card">
              <div className="rs-split">
                <div><div className="rs-meta">{rt(L,'tapsPlanned')}</div><div className="rs-big tn">{fmt(m.taps, 0)}<small>{rt(L,'tapsWord')}</small></div></div>
                <RsSt kind={trees.length ? 'ok' : 'idle'}>{rt(L, trees.length ? 'onMapN' : 'noneOnMap', { n: trees.length })}</RsSt>
              </div>
              {trees.length > 0 && <>
                <div className="rs-bar"><i style={{ width: (m.taps > 0 ? Math.min(100, tapSum / m.taps * 100) : 0) + '%' }} /></div>
                <p className="rs-meta tn" style={{ marginTop:6 }}>{rt(L,'tapsMapped', { t: fmt(tapSum, 0), n: fmt(trees.length, 0) })}</p>
                <RsKv rows={Object.keys(byLine).sort().map(k => [lineName(k), rt(L,'treesTaps', { t: byLine[k].trees, n: byLine[k].taps })])} />
              </>}
              <p className="rs-note">{rt(L,'tapsSetting')}</p>
            </div>
            <h2 className="rs-sec">{rt(L,'howManyTaps')}</h2>
            <div className="rs-card">
              <label className="rs-fl" htmlFor="rs-dbh">{rt(L,'dbhLabel')}</label>
              <RsStepper id="rs-dbh" value={dbh} onChange={setD} steps={[-2, -1, 1, 2]} dp={0} unit="in" label={rt(L,'dbhLabel')} min={1} max={60} big={false} />
              <div className="rs-hr" />
              <div className="rs-split" style={{ alignItems:'baseline' }}><div className="rs-meta">{rt(L,'takes')}</div>
                <div className="rs-big tn">{tapsPer(parseFloat(dbh) || 0)}<small>{rt(L, tapsPer(parseFloat(dbh) || 0) === 1 ? 'tapWord1' : 'tapsWord')}</small></div></div>
            </div>
            <div className="rs-list" style={{ marginTop:12 }}>
              <RsRow chev={false} title={rt(L,'dbhU10')} sub={rt(L,'dbhU10s')} value="0" />
              <RsRow chev={false} title={rt(L,'dbh10')} value="1" />
              <RsRow chev={false} title={rt(L,'dbh18')} value="2" />
              <RsRow chev={false} title={rt(L,'dbh25')} value="3" />
            </div>
            <p className="rs-note">{rt(L,'dbhNote')}</p>
          </div>
          <div>
            <section className="rs-group span" aria-label={rt(L,'treesWord')}>
            <h2 className="rs-sec">{rt(L,'treesWord')}</h2>
            {trees.length === 0 ? (
              <div className="rs-empty"><div className="rs-mk"><M.tree size={52} /></div>
                <b>{rt(L,'noTreesT')}</b><p>{rt(L,'noTreesP')}</p></div>
            ) : <>
              <input className="rs-field" type="search" aria-label={rt(L,'findTree')} placeholder={rt(L,'findTreePh')} value={q} onChange={e => setQ(e.target.value)} />
              <div style={{ marginTop:10 }}>
                <RsChips label={rt(L,'filterTrees')} value={f} onChange={setF}
                  options={[['all', rt(L,'fAll'), cnt.all], ['two', rt(L,'fTwo'), cnt.two], ['look', rt(L,'fLook'), cnt.look], ['none', rt(L,'fNone'), cnt.none]]} />
              </div>
              {list.length === 0 ? (
                <div className="rs-empty" style={{ marginTop:12 }}>
                  <b>{Q ? rt(L,'noTreeQ', { q }) : rt(L,'noTreeF')}</b><p>{rt(L,'noTreeHint')}</p>
                  <div className="rs-btnrow"><RsBtn kind="secondary" onClick={() => { setQ(''); setF('all'); }}>{rt(L,'showAllTrees')}</RsBtn><span /></div>
                </div>
              ) : <>
                <div className="rs-list" style={{ marginTop:12 }}>
                  {shown.map(p => <RsRow key={p.id} title={p.tagged || p.label || rt(L,'treeWord')}
                    sub={[p.dbh ? `${p.dbh} ${srUnitL('in', L)}` : null, rt(L, tapsOf(p) === 1 ? 'nTap1' : 'nTaps', { n: tapsOf(p) }), p.mainline ? lineName(p.mainline) : null, look(p) ? rt(L,'needsLook') : null].filter(Boolean).join(' · ')}
                    onClick={() => setTree(p)} />)}
                </div>
                {list.length > 25 && !all && <div style={{ marginTop:10 }}><RsBtn kind="secondary" onClick={() => setAll(true)}>{rt(L,'showAllN', { n: list.length })}</RsBtn></div>}
              </>}
            </>}
            </section>
            <h2 className="rs-sec">{rt(L,'tapDetail')}</h2>
            <RsDetailRows c={c} paths={['stage/tap/guide']} />
            <div style={{ marginTop:16 }}><RsBtn icon="map" onClick={() => rsGo('bush')}>{rt(L,'addTreesBush')}</RsBtn></div>
          </div>
        </div>
      </div>
      {tree && <RsSheet title={tree.tagged || tree.label || rt(L,'treeWord')} onClose={() => setTree(null)}>
        <RsKv rows={[
          tree.label && tree.tagged ? [rt(L,'nameWord'), tree.label] : null,
          tree.species ? [rt(L,'species'), String(tree.species).replace(/_/g, ' ')] : null,
          tree.dbh ? [rt(L,'diameter'), `${tree.dbh} ${srUnitL('in', L)}`] : null,
          [rt(L,'tapsWordC'), String(tapsOf(tree))],
          tree.mainline ? [rt(L,'mainlineWord'), lineName(tree.mainline)] : null,
          tree.health ? [rt(L,'health'), String(tree.health)] : null,
          tree.yearAdded ? [rt(L,'added'), String(tree.yearAdded)] : null,
        ]} />
        {tree.notes && <p style={{ marginTop:12 }}>{tree.notes}</p>}
        <div style={{ marginTop:16 }}><RsBtn icon="map" onClick={() => { const id = tree.id; setTree(null); rsGo('bush/tree/' + id); }}>{rt(L,'showOnBush')}</RsBtn></div>
      </RsSheet>}
    </>
  );
}

// ── 3 · Lines & tanks ────────────────────────────────────────────────────────
function RsLinesStage({ c }) {
  const L = c.lang;
  const m = useRsSeasonModel(c);
  const ml = m.d.mainlines, trees = m.d.treePins;
  const per = id => trees.filter(p => p.mainline === id);
  const tapsOf = p => parseInt(p.taps) || 0;
  const tanks = m.d.tanks.filter(t => t.levelGal != null);
  return (
    <>
      <RsHero photo="bush-aerial" />
      <div className="rs-inner">
        <RsStageHead c={c} id="lines" m={m} lede={rt(L,'linesLede')} />
        <RsBanners c={c} />
        <div className="rs-cols">
          <div>
            <a className="rs-card rs-bushcard" href={rsHref('bush')}>
              <RsTile icon="map" family="lines" size={48} />
              <span className="rs-rt"><b>{rt(L,'sc_map')}</b><span className="tn">{rt(L,'bushCounts', { m: ml.length, p: m.d.pins.length, t: m.d.tankPins.length })}</span></span>
              <span className="rs-chev"><RsIcon name="chev" size={22} /></span>
            </a>
            <h2 className="rs-sec">{rt(L,'mainlines')}</h2>
            {ml.length === 0 ? <div className="rs-empty"><b>{rt(L,'noLinesT')}</b><p>{rt(L,'noLinesP')}</p></div> :
              <div className="rs-list">
                {ml.map(x => { const tr = per(x.id); return (
                  <RsRow key={x.id} icon={null} title={x.label || rt(L,'mainlineN', { id:x.id })}
                    sub={tr.length ? rt(L,'treesTaps', { t: tr.length, n: tr.reduce((s, p) => s + tapsOf(p), 0) }) : rt(L,'noTreesOnLine')}
                    value={<svg className="rs-mldash" width="36" height="6" viewBox="0 0 36 6" aria-hidden="true"><line x1="2" y1="3" x2="34" y2="3" strokeDasharray={SR_LINE_DASH[ml.indexOf(x) % SR_LINE_DASH.length] || undefined} /></svg>} href={rsHref('bush/line/' + x.id)} />); })}
              </div>}
            <p className="rs-note">{rt(L,'linesNote')}</p>
          </div>
          <div>
            <h2 className="rs-sec">{rt(L,'tanksWord')}</h2>
            {tanks.length ? <div className="rs-tankrow">{tanks.map(t => (
              <div key={t.id} className="rs-tankcell"><RsTankViz level={t.levelGal} cap={t.capGal} w={84} h={128} tone={t.role === 'concentrate' ? 'conc' : 'sap'} />
                <b className="tn">{srVol(t.levelGal, c.units)}</b><span>{t.name}</span></div>))}</div>
              : <RsTankCard c={c} tanks={[]} tankPins={m.d.tankPins} />}
            {m.d.tankPins.length > 0 && <div className="rs-list" style={{ marginTop:12 }}>
              {m.d.tankPins.map(p => <RsRow key={p.id} icon="tank" family="collect" title={p.label || rt(L,'tankWord')} sub={p.notes || rt(L,'onTheMap')} href={rsHref('bush')} />)}
            </div>}
            <h2 className="rs-sec">{rt(L,'tubingWord')}</h2>
            <div className="rs-list">
              <RsRow icon="calc" family="lines" title={rt(L,'sc_tubing')} sub={rt(L,'sc_tubing_s')} href={rsHref('stage/lines/tubing')} />
              <RsRow icon="up" family="lines" title={rt(L,'importKml')} sub={rt(L,'importKmlS')} href={rsHref('bush/tools')} />
            </div>
            <div style={{ marginTop:16 }}><RsBtn icon="plus" onClick={() => rsGo('bush/tools')}>{rt(L,'drawLine')}</RsBtn></div>
          </div>
        </div>
      </div>
    </>
  );
}

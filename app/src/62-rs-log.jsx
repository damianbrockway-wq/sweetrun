// ─── Log sheet and Log history (Phase 5) ─────────────────────────────────────
// The sheet writes through exactly LogTab's path: srMakeEntry (LogTab's entry
// shape), srAppendEntry (updLog's merge), ls.set('sg_logs2') checked before
// anything is shown as saved, sg_log_last_kind remembered, and the sap
// auto-copy as a second write. Units: the value is stored in the display unit
// the sugarmaker is working in, as every entry always has been.

// The six kinds, same order, units and decimals as LogTab's KINDS.
// A kind's name inside a sentence: lower case, except acronyms ("RO" stays "RO").
const srKindWord = K => /^[A-Z]{2,}$/.test(K.l) ? K.l : K.l.toLowerCase();
function srKinds(lang, units) {
  const u = srU(units);
  const fuelF = FUELS.find(f => f.label === ls.get('sg_fuel', 'Firewood (cord)')) || FUELS[0], fuelU = lang === 'fr' ? fuelF.unitFr : fuelF.unit;
  return [
    { k:'sapCollected', l:rt(lang,'kSap'),   unit:u,     dp:0, steps:[-100,-10,10,100], icon:'pail' },
    { k:'syrupMade',    l:rt(lang,'kSyrup'), unit:u,     dp:1, steps:[-1,-0.1,0.1,1],   icon:'jug', grade:true },
    { k:'sapRO',        l:rt(lang,'kRO'),    unit:u,     dp:0, steps:[-100,-10,10,100], icon:'ro' },
    { k:'sapEvap',      l:rt(lang,'kEvap'),  unit:u,     dp:0, steps:[-100,-10,10,100], icon:'flame' },
    { k:'fuelUsed',     l:rt(lang,'kFuel'),  unit:fuelU, dp:1, steps:[-1,-0.1,0.1,1],   icon:'fuel' },
    { k:'boilHours',    l:rt(lang,'kHours'), unit:srUnitL('hr', lang),  dp:1, steps:[-1,-0.5,0.5,1],   icon:'clock' },
  ];
}
const SR_GRADES = ['Golden Delicate','Amber Rich','Dark Robust','Very Dark Strong'];
const srGradeLabel = (g, lang) => ({ 'Golden Delicate':t(lang,'gradeGolden'), 'Amber Rich':t(lang,'gradeAmber'),
  'Dark Robust':t(lang,'gradeDark'), 'Very Dark Strong':t(lang,'gradeVeryDark') })[g] || g;

// editing: an entry {…, kind} to change or delete, or null for a new one.
function RsLogSheet({ c, kind: kind0, editing, onClose }) {
  const L = c.lang;
  const kinds = srKinds(L, c.units);
  const [kind, setKind] = useState(editing ? editing.kind : (kinds.find(k => k.k === kind0) ? kind0 : 'sapCollected'));
  const K = kinds.find(k => k.k === kind);
  const [val, setVal] = useState(editing ? editing.val : '');
  const [note, setNote] = useState(editing ? (editing.note || '') : '');
  const [grade, setGrade] = useState(editing && editing.grade ? editing.grade : '—');
  const [brix, setBrix] = useState(editing && editing.brix != null ? editing.brix : '');
  const [point, setPoint] = useState(editing ? (editing.point || null) : null);
  const [dateISO, setDateISO] = useState(() => {
    if (!editing) return ''; const p = srDateParts(editing.date); return p ? srIsoOf(new Date(p.y, p.mo - 1, p.d, 12)) : '';
  });
  const [fail, setFail] = useState(null);
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const tm = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(tm); }, [armed]);
  const cpoints = ls.get('sg_cpoints', []) || [];
  const pickKind = k => { setKind(k); setGrade('—'); setBrix(''); setFail(null); };
  const isSyrup = kind === 'syrupMade', isSap = kind === 'sapCollected';
  const bx = parseFloat(brix);
  const inRange = isFinite(bx) && bx >= 66 && bx <= 68.9;   // FinishTab's legal range

  const writeLogs = up => { if (!ls.set('sg_logs2', up)) { setFail(SR_WRITE_FAIL || 'locked'); return false; } return true; };
  const save = () => {
    const n = parseFloat(val);
    if (!n) { const el = document.getElementById('rs-log-v'); if (el) el.focus(); return; }
    const all = ls.get('sg_logs2', {}) || {};
    if (editing) {
      const slog = all[c.season] || SR_EMPTY_SLOG();
      const changes = { val: n, note, grade: K.grade ? grade : undefined, brix: SR_KIND_FIELDS[kind].brix && brix !== '' ? parseFloat(brix) : undefined };
      if (dateISO) changes.date = dateISO;
      const up = { ...all, [c.season]: { ...slog, [kind]: (slog[kind] || []).map(x => x.id === editing.id ? { ...x, ...changes } : x) } };
      if (!writeLogs(up)) return;
      srDataChanged(); srToast(rt(L,'entryChanged')); onClose(); return;
    }
    const entry = srMakeEntry(kind, { val: n, note, grade, brix: brix === '' ? '' : String(brix), point }, Date.now(), srToday());
    if (!writeLogs(srAppendEntry(all, c.season, kind, entry))) return;
    ls.set('sg_log_last_kind', kind);
    if (isSap) {
      const ac = ls.get('sg_autocopy', { ro:false, evap:false }) || {};
      const up2 = srAutoCopy(ls.get('sg_logs2', {}), c.season, entry, ac, Date.now());
      if (up2) ls.set('sg_logs2', up2);
    }
    srDataChanged();
    srToast(rt(L,'savedEntry', { v: fmt(n, K.dp), u: K.unit, k: srKindWord(K) }));
    onClose();
  };
  const del = () => {
    if (!armed) { setArmed(true); return; }
    const all = ls.get('sg_logs2', {}) || {};
    const slog = all[c.season] || SR_EMPTY_SLOG();
    const up = { ...all, [c.season]: { ...slog, [kind]: (slog[kind] || []).filter(x => x.id !== editing.id) } };
    if (!writeLogs(up)) return;
    srDataChanged(); srToast(rt(L,'entryDeleted')); onClose();
  };
  const title = editing ? rt(L,'changeEntry') : rt(L,'logKind', { k: srKindWord(K) });
  return (
    <RsSheet title={title} onClose={onClose} id="rs-log-sheet">
      {!editing && <>
        <RsSeg label={rt(L,'whatLog')} value={kind === 'sapCollected' || kind === 'syrupMade' ? kind : null}
          options={[['sapCollected', rt(L,'kSap')], ['syrupMade', rt(L,'kSyrup')]]} onChange={pickKind} />
        <div className="rs-chips rs-kindmore" role="group" aria-label={rt(L,'somethingElse')}>
          {kinds.slice(2).map(x => <button key={x.k} type="button" className={`rs-chip${kind === x.k ? ' on' : ''}`} aria-pressed={kind === x.k} onClick={() => pickKind(x.k)}>{x.l}</button>)}
        </div>
      </>}
      {editing && <>
        <label className="rs-fl" htmlFor="rs-log-date">{rt(L,'date')}</label>
        <input id="rs-log-date" className="rs-field" type="date" value={dateISO} onChange={e => setDateISO(e.target.value)} />
      </>}
      <RsStepper id="rs-log-v" value={val} onChange={setVal} steps={K.steps} dp={K.dp} unit={K.unit} label={rt(L,'amountIn', { k:K.l, u:K.unit })} />
      {isSap && cpoints.length > 0 && <>
        <label className="rs-fl">{rt(L,'fromWhere')}</label>
        <RsChips label={rt(L,'fromWhere')} value={point} onChange={setPoint}
          options={[[null, rt(L,'allPoints')], ...cpoints.map(p => [p.id, p.name])]} />
      </>}
      {isSyrup && <>
        <label className="rs-fl">{rt(L,'grade')}</label>
        <RsChips label={rt(L,'grade')} value={grade} onChange={setGrade}
          options={[['—', rt(L,'gradeNone')], ...SR_GRADES.map(g => [g, srGradeLabel(g, L)])]} />
        <label className="rs-fl" htmlFor="rs-log-bx">{rt(L,'syrupBrixOpt')}</label>
        <div className="rs-split rs-bxrow">
          <RsStepper id="rs-log-bx" value={brix} onChange={setBrix} steps={[-0.1, 0.1]} dp={1} unit="Brix" label={rt(L,'syrupBrixOpt')} min={0} max={100} big={false} base={66.9} />
          {brix !== '' && <RsSt kind={inRange ? 'ok' : 'check'}>{rt(L, inRange ? 'onTarget' : 'offTarget')}</RsSt>}
        </div>
      </>}
      {isSap && <>
        <label className="rs-fl" htmlFor="rs-log-bx">{rt(L,'sapBrixOpt')}</label>
        <RsStepper id="rs-log-bx" value={brix} onChange={setBrix} steps={[-0.1, 0.1]} dp={1} unit="%" label={rt(L,'sapBrixOpt')} min={0} max={10} big={false} base={parseFloat(c.sapBrix) || 2} />
      </>}
      <label className="rs-fl" htmlFor="rs-log-note">{rt(L,'noteOpt')}</label>
      <input id="rs-log-note" className="rs-field" type="text" value={note} onChange={e => setNote(e.target.value)} placeholder={rt(L,'addNote')}
        onKeyDown={e => { if (e.key === 'Enter') save(); }} />
      <div className="rs-sheetfoot">
      {fail && <div className="rs-banner bad rs-sheetfail" role="alert">
        <span className="rs-bic"><RsIcon name="alert" size={24} sw={2.4} /></span>
        <span className="rs-bt"><b>{rt(L,'bNotSavedT')}</b><span>{rt(L, fail === 'quota' ? 'bQuotaP' : 'bLockedP')}</span></span>
        {fail !== 'quota' && <button type="button" className="rs-bbtn" onClick={() => { onClose(); c.setShowLicense(true); }}>{rt(L,'bEnterKey')}</button>}
      </div>}
        <RsBtn onClick={save} id="rs-log-save">{editing ? rt(L,'saveChange')
          : parseFloat(val) ? rt(L,'saveAmt', { v: fmt(parseFloat(val), K.dp), u: K.unit, k: srKindWord(K) }) : rt(L,'saveKind', { k: srKindWord(K) })}</RsBtn>
      </div>
      {editing && <div style={{ marginTop:10 }}><RsBtn kind="bad" onClick={del} id="rs-log-del">{rt(L, armed ? 'tapAgainDelete' : 'deleteEntry')}</RsBtn></div>}
    </RsSheet>
  );
}

// ── Log history (Sugar Shack > Log history) ──────────────────────────────────
function RsLogHistory({ c, openLog }) {
  const L = c.lang, u = srU(c.units);
  const v = useSrDataVersion();
  const logs = React.useMemo(() => ls.get('sg_logs2', {}) || {}, [v]);
  const slog = logs[c.season] || {};
  const kinds = srKinds(L, c.units);
  const [filter, setFilter] = useState('all');
  const [pt, setPt] = useState(null);
  const [edit, setEdit] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [cpName, setCpName] = useState('');
  const cpoints = React.useMemo(() => ls.get('sg_cpoints', []) || [], [v]);
  const autoCopy = React.useMemo(() => ls.get('sg_autocopy', { ro:false, evap:false }) || { ro:false, evap:false }, [v]);
  const T_ = seasonTotals(slog);
  const seasons = [...new Set([...Object.keys(logs).map(Number), c.season])].filter(y => isFinite(y)).sort((a, b) => b - a);
  const all = kinds.flatMap(K => (slog[K.k] || []).map(e => ({ ...e, kind:K.k })))
    .filter(e => filter === 'all' || e.kind === filter)
    .filter(e => !pt || e.point === pt)
    .sort((a, b) => (srDateMs(b.date) - srDateMs(a.date)) || ((b.id || 0) - (a.id || 0)));
  const groups = [];
  all.forEach(e => { const k = srDateShort(e.date, L); const g = groups[groups.length - 1]; if (g && g.k === k) g.items.push(e); else groups.push({ k, items:[e] }); });
  const [limit, setLimit] = useState(60);

  // CSV: LogTab.exportCSV, unchanged (all six kinds, a Unit column, RFC 4180 quoting).
  const exportCSV = () => {
    const esc = x => `"${String(x ?? '').replace(/"/g,'""')}"`;
    const fuelUnit = (FUELS.find(f=>f.label===ls.get('sg_fuel','Firewood (cord)'))||FUELS[0]).unit;
    const rows=[['Type','Date','Value','Unit','Note']];
    [['sapCollected',u],['syrupMade',u],['sapRO',u],['sapEvap',u],['fuelUsed',fuelUnit],['boilHours','hr']].forEach(([k,unit])=>{
      (slog[k]||[]).forEach(e=>rows.push([t(L,k),e.date,e.val,unit,e.note||'']));
    });
    const csv=rows.map(r=>r.map(esc).join(',')).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`sweetrun-${c.season}.csv`; a.click();
  };
  const setAC = (field, on) => { ls.set('sg_autocopy', { ...autoCopy, [field]: on }); srDataChanged(); };
  const addCp = () => {
    const name = cpName.trim(); if (!name || cpoints.length >= 6) return;
    const next = [...cpoints, { id:'pt_' + Date.now(), name, color: tok('pt-' + (cpoints.length % 6)) }];
    if (ls.set('sg_cpoints', next)) { setCpName(''); srDataChanged(); }
  };
  const rmCp = id => { if (ls.set('sg_cpoints', cpoints.filter(p => p.id !== id))) { if (pt === id) setPt(null); srDataChanged(); } };
  const K = k => kinds.find(x => x.k === k);

  return (
    <div className="rs-inner">
      <header className="rs-phead">
        <RsPushBar href={rsHref('shack')} label={rt(L,'shackTitle')} />
        <h1 className="sm">{rt(L,'sc_log')}</h1>
      </header>
      <RsBanners c={c} />
      <div className="rs-cols">
        <div>
          <div className="rs-card">
            <div className="rs-split"><div className="rs-meta">{rt(L,'seasonN', { y:c.season })}</div>
              {seasons.length > 1 && <select className="rs-field rs-select" aria-label={rt(L,'pickSeason')} value={c.season} onChange={e => c.setSeason(parseInt(e.target.value))}>
                {seasons.map(y => <option key={y} value={y}>{y}</option>)}</select>}
            </div>
            <div className="rs-grid3 tn" style={{ marginTop:10 }}>
              <div><div className="rs-meta">{rt(L,'kSyrup')}</div><div className="rs-bign">{fmt(T_.syT, 1)}<small>{u}</small></div></div>
              <div><div className="rs-meta">{rt(L,'kSap')}</div><div className="rs-bign">{fmt(T_.sapT, 0)}<small>{u}</small></div></div>
              <div><div className="rs-meta">{rt(L,'kRO')}</div><div className="rs-bign">{fmt(T_.roT, 0)}<small>{u}</small></div></div>
            </div>
          </div>
          <label className="rs-fl" style={{ marginTop:18 }}>{rt(L,'showKind')}</label>
          <RsChips label={rt(L,'showKind')} value={filter} onChange={setFilter}
            options={[['all', rt(L,'allKinds')], ...kinds.map(k => [k.k, k.l, (slog[k.k] || []).length])]} />
          {cpoints.length > 0 && <>
            <label className="rs-fl" style={{ marginTop:14 }}>{rt(L,'collectionPoint')}</label>
            <RsChips label={rt(L,'collectionPoint')} value={pt} onChange={setPt} options={[[null, rt(L,'allPoints')], ...cpoints.map(p => [p.id, p.name])]} />
          </>}
          <h2 className="rs-sec">{rt(L,'entries')}</h2>
          {all.length === 0 ? (
            <div className="rs-empty">
              <div className="rs-mk"><M.jug size={48} /></div>
              <b>{rt(L, filter === 'all' && !pt ? 'noEntriesT' : 'noEntriesFT')}</b>
              <p>{rt(L, filter === 'all' && !pt ? 'noEntriesP' : 'noEntriesFP')}</p>
              <div style={{ marginTop:14 }}><RsBtn onClick={() => openLog(filter === 'all' ? null : filter)} icon="plus">{rt(L,'logSomething')}</RsBtn></div>
            </div>
          ) : <>
            {groups.reduce((acc, g) => { if (acc.n >= limit) return acc; const items = g.items.slice(0, limit - acc.n); acc.n += items.length; acc.out.push({ ...g, items }); return acc; }, { n:0, out:[] }).out.map(g => (
              <div key={g.k} className="rs-daygroup">
                <div className="rs-dayhead tn">{g.k}</div>
                <div className="rs-list">
                  {g.items.map(e => { const k = K(e.kind); const p = e.point ? cpoints.find(x => x.id === e.point) : null;
                    const extra = [e.grade && e.grade !== '—' ? srGradeLabel(e.grade, L) : null, e.brix != null ? `${fmt(e.brix, 1)} Brix` : null, p ? p.name : null, e.note || null].filter(Boolean).join(' · ');
                    return <button key={e.kind + e.id} type="button" className="rs-row rs-entry" onClick={() => setEdit(e)}
                      aria-label={rt(L,'entryAria', { k:k.l, v:fmt(e.val, k.dp), u:k.unit, d:g.k })}>
                      <RsTile icon={k.icon} family={e.kind === 'syrupMade' || e.kind === 'sapEvap' || e.kind === 'boilHours' ? 'boil' : e.kind === 'fuelUsed' ? 'power' : 'collect'} size={36} />
                      <span className="rs-rt"><b>{k.l}</b>{extra && <span>{extra}</span>}</span>
                      <span className="rs-amt tn">{fmt(e.val, k.dp)}<small>{k.unit}</small></span>
                    </button>; })}
                </div>
              </div>
            ))}
            {all.length > limit && <div style={{ marginTop:12 }}><RsBtn kind="secondary" onClick={() => setLimit(x => x + 100)}>{rt(L,'showMore', { n: all.length - limit })}</RsBtn></div>}
            <div style={{ marginTop:16 }}><RsBtn onClick={() => openLog(null)} icon="plus" id="rs-hist-log">{rt(L,'logSomething')}</RsBtn></div>
          </>}
        </div>
        <div>
          <h2 className="rs-sec">{rt(L,'exportImport')}</h2>
          <div className="rs-list">
            <RsRow icon="download" title={rt(L,'exportCsv', { y:c.season })} sub={rt(L,'exportCsvS')} onClick={exportCSV} />
            <RsRow icon="book" title={rt(L,'exportPdf', { y:c.season })} sub={rt(L,'exportPdfS')}
              onClick={() => exportSeasonPDF({ season:c.season, trees:c.trees, units:c.units, logs, brixLog: ls.get('sg_brixlog',[]), sapBrix:c.sapBrix })} />
            <RsRow icon="up" title={rt(L,'importMon')} sub={rt(L,'importMonS')} onClick={() => setShowImport(true)} />
          </div>
          <h2 className="rs-sec">{rt(L,'autoCopy')}</h2>
          <div className="rs-list">
            <RsSwitch on={autoCopy.ro} onChange={on => setAC('ro', on)} title={rt(L,'acRO')} sub={rt(L,'acSub')} />
            <RsSwitch on={autoCopy.evap} onChange={on => setAC('evap', on)} title={rt(L,'acEvap')} sub={rt(L,'acSub')} />
          </div>
          <h2 className="rs-sec">{rt(L,'collectionPoints')}</h2>
          <div className="rs-card">
            <p className="rs-meta" style={{ marginBottom:10 }}>{rt(L,'cpLede')}</p>
            {cpoints.map(p => <div key={p.id} className="rs-cprow"><span className="rs-cpdot" style={{ background: p.color || T.mute }} /><b>{p.name}</b>
              <button type="button" className="rs-linkbtn" onClick={() => rmCp(p.id)}>{rt(L,'remove')}</button></div>)}
            {cpoints.length < 6 ? <div className="rs-inline" style={{ marginTop:10 }}>
              <input className="rs-field" aria-label={rt(L,'cpNew')} placeholder={rt(L,'cpPh')} value={cpName} onChange={e => setCpName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCp()} />
              <RsBtn kind="secondary" onClick={addCp}>{rt(L,'add')}</RsBtn>
            </div> : <p className="rs-note">{rt(L,'cpMax')}</p>}
          </div>
        </div>
      </div>
      {edit && <RsLogSheet c={c} editing={edit} onClose={() => setEdit(null)} />}
      {showImport && <RsImportSheet c={c} onClose={() => setShowImport(false)} />}
    </div>
  );
}
function RsSwitch({ on, onChange, title, sub }) {
  return (
    <button type="button" className={`rs-sw${on ? ' on' : ''}`} role="switch" aria-checked={!!on} onClick={() => onChange(!on)}>
      <span className="rs-rt"><b>{title}</b>{sub && <span>{sub}</span>}</span><span className="rs-tg" aria-hidden="true" />
    </button>
  );
}

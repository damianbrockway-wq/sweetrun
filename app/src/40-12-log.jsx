// ─── LOG TAB ──────────────────────────────────────────────────────────────────
// ─── Log micro-delight helpers (Pass 5) ─────────────────────────────────────
// Presentation only. The saved-entry "moment" (teal drop into the bucket mark)
// and the number roll are fire-and-forget renders; the save path itself is
// untouched. Both collapse to the static end-state under reduced motion.
const srReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// A number that rolls 0 → value over ~400ms. tabular-nums so digits don't
// shift the row while rolling. Reduced motion: renders the value immediately.
function RollNum({ value, dp = 0 }) {
  const target = parseFloat(value) || 0;
  const [disp, setDisp] = React.useState(() => (srReducedMotion() ? target : 0));
  React.useEffect(() => {
    if (srReducedMotion()) { setDisp(target); return; }
    let raf; const t0 = performance.now(), DUR = 400;
    const step = now => {
      const k = Math.min(1, (now - t0) / DUR);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisp(target * eased);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <span style={{ fontVariantNumeric:'tabular-nums' }}>{fmt(disp, dp)}</span>;
}

function LogTab({ season, setSeason, trees, setTrees, units, sapBrix, lang='en' }) {
  const u    = units === 'L' ? 'L' : 'gal';
  const conv = v => units === 'L' ? +(v*3.78541).toFixed(1) : +v.toFixed(1);
  const [logs, setLogs] = useState(()=>ls.get('sg_logs2',{}));
  const [showF, setShowF] = useState(false);
  const [showC, setShowC] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [autoCopy, setAutoCopy] = useState(()=>ls.get('sg_autocopy',{ro:false,evap:false}));
  const [bfTarget, setBfTarget] = useState({ro:false,evap:false});
  const setAutoCopyField = (field, val) => {
    const next = {...autoCopy, [field]:val};
    setAutoCopy(next); ls.set('sg_autocopy', next);
  };

  // ── Collection Points ────────────────────────────────────────────────────
  const PT_COLORS = ['#ff7b54','#a78bfa','#f472b6','#34d399','#fbbf24','#60a5fa'];
  const [cpoints,      setCpoints]      = useState(() => ls.get('sg_cpoints', []));
  const [activePoint,  setActivePoint]  = useState(null); // null = All/shared
  const [newPtName,    setNewPtName]    = useState('');
  const [showCPSetup,  setShowCPSetup]  = useState(false);

  const addCpoint = () => {
    const name = newPtName.trim();
    if (!name) return;
    const id = 'pt_' + Date.now();
    const color = PT_COLORS[cpoints.length % PT_COLORS.length];
    const next = [...cpoints, { id, name, color }];
    setCpoints(next); ls.set('sg_cpoints', next);
    setNewPtName('');
  };
  const removeCpoint = id => {
    const next = cpoints.filter(p => p.id !== id);
    setCpoints(next); ls.set('sg_cpoints', next);
    if (activePoint === id) setActivePoint(null);
  };
  const empty = { sapCollected:[], syrupMade:[], sapRO:[], sapEvap:[] };
  const slog  = logs[season] || empty;

  // Write first, then reflect it. Updating React state before checking ls.set
  // meant a trial-expired user saw their entries land in the list, dismissed the
  // lock banner as noise, closed the app, and lost all of it — the app had shown
  // them a save that never happened. BoilDay already gated on this; now so does
  // the main log. Returns false so callers can tell the save didn't take.
  const updLog = (k, entries) => {
    const up = { ...logs, [season]:{ ...slog, [k]:entries } };
    if (!ls.set('sg_logs2', up)) return false;   // locked or quota: banner explains
    setLogs(up);
    return true;
  };
  // sapT/syT/roT/evT stay in the display unit for the figures; the goal is in
  // gallons, so the progress bar compares the gallon total or it reads 100% on a
  // season barely a third done.
  const { sapT, syT, roT, evapT: evT } = seasonTotals(slog);
  const syrupGal = toGal(syT, units);
  const goal = trees * yieldMidOf(yieldModelSaved()), pct = goal>0 ? Math.min(100,(syrupGal/goal)*100) : 0;
  const seasons = Object.keys(logs).map(Number).sort((a,b)=>b-a);

  const exportCSV = () => {
    // All six entry kinds (Debug M3 — Fuel and Hours used to be dropped), with a
    // Unit column because fuel and hours aren't gallons, and RFC-4180 quote
    // doubling so a note containing " can't break its row.
    const esc = c => `"${String(c ?? '').replace(/"/g,'""')}"`;
    const fuelUnit = (FUELS.find(f=>f.label===ls.get('sg_fuel','Firewood (cord)'))||FUELS[0]).unit;
    const rows=[['Type','Date','Value','Unit','Note']];
    [['sapCollected',u],['syrupMade',u],['sapRO',u],['sapEvap',u],['fuelUsed',fuelUnit],['boilHours','hr']].forEach(([k,unit])=>{
      (slog[k]||[]).forEach(e=>rows.push([t(lang,k),e.date,e.val,unit,e.note||'']));
    });
    const csv=rows.map(r=>r.map(esc).join(',')).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`sweetrun-${season}.csv`; a.click();
  };

  const GRADES = ['—','Golden Delicate','Amber Rich','Dark Robust','Very Dark Strong'];
  const GRADE_LABELS = {'—':'—','Golden Delicate':t(lang,'gradeGolden'),'Amber Rich':t(lang,'gradeAmber'),'Dark Robust':t(lang,'gradeDark'),'Very Dark Strong':t(lang,'gradeVeryDark')};
  const GRADE_COLORS = { 'Golden Delicate':'#f5c842','Amber Rich':'#e0a44a','Dark Robust':'#c47a28','Very Dark Strong':'#8b4513' };

  function LogSection({ label, logKey, color, icon, showGrade=false, showBrix=false, onAdd=null, unitLabel=null, dp=1 }) {
    const uLbl = unitLabel || u;
    const entries        = slog[logKey] || [];
    // Filter displayed entries by active collection point (null = show all)
    const displayEntries = (activePoint
      ? entries.filter(e => e.point === activePoint)
      : entries).slice().sort((a, b) => (srDateMs(b.date) - srDateMs(a.date)) || ((b.id||0) - (a.id||0)));
    const tot2    = displayEntries.reduce((s,e)=>s+(parseFloat(e.val)||0),0);
    const [val,   setVal]   = useState('');
    const [note,  setNote]  = useState('');
    const [grade, setGrade] = useState('—');
    const [brix,  setBrix]  = useState('');
    const [editDateId, setEditDateId] = useState(null);
    const Ic2 = I[icon];
    const toISO = ds => {
      const d = new Date(ds);
      if (isNaN(d)) return '';
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    };
    const add = () => {
      if (!val) return;
      const entry = {
        id:    Date.now(),
        date:  srToday(),
        val:   parseFloat(val),
        note,
        grade: showGrade ? grade : undefined,
        brix:  showBrix && brix ? parseFloat(brix) : undefined,
        point: activePoint || undefined, // tag with active collection point
      };
      updLog(logKey, [...entries, entry]);
      if (onAdd) onAdd(parseFloat(val), entry.date, note);
      setVal(''); setNote(''); setGrade('—'); setBrix('');
    };
    // ID-based date edit (safe when entries are filtered)
    const updateDate = (id, isoVal) => {
      if (!isoVal) return;
      const [y,m,d] = isoVal.split('-').map(Number);
      const newDate = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      updLog(logKey, entries.map(x => x.id===id ? {...x, date:newDate} : x));
      setEditDateId(null);
    };
    return (
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div className="card-icon">{Ic2?<Ic2 size={20} color="#7f92a6"/>:null}</div>
            <div>
              <span style={{ fontWeight:700, fontSize:16 }}>{label}</span>
              {activePoint && (() => { const pt=cpoints.find(p=>p.id===activePoint); return pt ? <span style={{ fontSize:13, color:pt.color, fontWeight:700, marginLeft:6 }}>· {pt.name}</span> : null; })()}
            </div>
          </div>
          <span className="badge">{fmt(tot2,dp)} <span style={{ fontWeight:500, color:'#7f92a6' }}>{uLbl}</span></span>
        </div>
        <div className="field-label">{lang==='fr' ? 'Nouvelle entrée' : 'New entry'} <span style={{ fontWeight:400 }}>· {uLbl}{lang==='fr' ? ' et note' : ' and note'}</span></div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ flex:1, position:'relative' }}>
            <NumInput label={`${label} — amount in ${uLbl}`} value={val} onChange={setVal} min={0} step={0.1} placeholder=" " />
            <span aria-hidden="true" style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#7f92a6', pointerEvents:'none' }}>{uLbl}</span>
          </div>
          <div style={{ flex:2 }}><input aria-label={t(lang,'note')} type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder={t(lang,'note')} onKeyDown={e=>e.key==='Enter'&&add()} /></div>
          <button onClick={add} aria-label={`Add ${label} entry`} title={`Add ${label} entry`} className="btn-icon"
            style={ val ? { background:'#2dd4a7' } : { background:'transparent', border:'1px solid #1e2d3d', color:'#7f92a6' } }>
            <I.check size={18} color="currentColor" />
          </button>
        </div>
        {showBrix && (
          <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ flex:1 }}>
              <div className="field-label">{t(lang,'sapBrix')} <span style={{ fontWeight:400 }}>({t(lang,'optional')})</span></div>
              <input aria-label={`${t(lang,'sapBrix')} (${t(lang,'optional')})`} type="text" inputMode="decimal" value={brix}
                onChange={e=>{ const raw=e.target.value; if(!/^[\d.,\s]*$/.test(raw)) return; setBrix(raw); }}
                onBlur={e=>{ const n=srParseNum(e.target.value); setBrix(n===null?'':String(Math.max(0,Math.min(10,n)))); }}
                placeholder="e.g. 2.1"
                style={{ width:'100%', boxSizing:'border-box' }} />
            </div>
          </div>
        )}
        {showGrade && (
          <div style={{ marginTop:8 }}>
            <div className="field-label">{lang==='fr' ? 'Classe' : 'Grade'} <span style={{ fontWeight:400 }}>({t(lang,'optional')})</span></div>
            <select aria-label={`${lang==='fr' ? 'Classe' : 'Grade'} (${t(lang,'optional')})`} value={grade} onChange={e=>setGrade(e.target.value)}
              style={{ color: grade==='—' ? '#7f92a6' : '#e6edf3' }}>
              {GRADES.map(g=><option key={g} value={g}>{g==='—' ? (lang==='fr' ? 'Aucune' : 'None') : (GRADE_LABELS[g]||g)}</option>)}
            </select>
          </div>
        )}
        {displayEntries.length===0 && (
          <div style={{ textAlign:'center', color:'#7f92a6', fontSize:13, padding:'10px 0' }}>
            {activePoint ? `No entries for this collection point yet.` : t(lang,'noEntries')}
          </div>
        )}
        {displayEntries.map((e)=>(
          <div key={e.id} className="log-entry">
            <div style={{ flex:1 }}>
              <span style={{ fontWeight:700 }}>{fmt(e.val,dp)} <span style={{ fontWeight:500, color:'#7f92a6' }}>{uLbl}</span></span>
              {e.brix != null && <span style={{ fontSize:13, fontWeight:600, color:'#2dd4a7', background:'#2dd4a722', borderRadius:6, padding:'1px 7px', marginLeft:6 }}>{e.brix.toFixed(1)}°Bx</span>}
              {e.grade && e.grade !== '—' && <span style={{ fontSize:13, fontWeight:700, color: GRADE_COLORS[e.grade]||'#e0a44a', background:(GRADE_COLORS[e.grade]||'#e0a44a')+'22', borderRadius:6, padding:'1px 7px', marginLeft:6 }}>{GRADE_LABELS[e.grade]||e.grade}</span>}
              {/* Collection point badge — only show in All view to avoid redundancy */}
              {!activePoint && e.point && (() => { const pt=cpoints.find(p=>p.id===e.point); return pt ? <span style={{ fontSize:12, fontWeight:700, color:pt.color, background:pt.color+'22', borderRadius:5, padding:'1px 6px', marginLeft:5 }}>{pt.name}</span> : null; })()}
              {e.note && <span style={{ color:'#7f92a6', fontSize:13 }}> · {e.note}</span>}
              {editDateId === e.id ? (
                <input aria-label="Entry date" type="date" autoFocus
                  defaultValue={toISO(e.date)}
                  onChange={ev => updateDate(e.id, ev.target.value)}
                  onBlur={() => setEditDateId(null)}
                  style={{ background:'#081622', border:'1px solid #58a6ff', borderRadius:6, padding:'1px 6px', color:'#c9d1d9', fontSize:12, marginLeft:8, outline:'none', colorScheme:'dark' }}
                />
              ) : (
                <span onClick={()=>setEditDateId(e.id)}
                  title="Click to edit date"
                  style={{ color:'#7f92a6', fontSize:12, marginLeft:8, cursor:'pointer' }}>
                  {e.date}
                </span>
              )}
            </div>
            <button className="delete-btn" aria-label={`Delete this ${label} entry`} title="Delete entry" onClick={()=>updLog(logKey, entries.filter(x=>x.id!==e.id))}><I.x size={15} /></button>
          </div>
        ))}
      </div>
    );
  }

  // ── The record, flattened: every entry of every kind, newest first ──
  const KINDS = [
    { k:'sapCollected', l: lang==='fr' ? 'Sève'      : 'Sap',   long:t(lang,'sapCollected'), unit:u,        dp:0, brix:true },
    { k:'syrupMade',    l: lang==='fr' ? 'Sirop'     : 'Syrup', long:t(lang,'syrupMade'),    unit:u,        dp:1, grade:true, brix:true },
    { k:'sapRO',        l:'R/O',                               long:t(lang,'sapRO'),        unit:u,        dp:0 },
    { k:'sapEvap',      l: lang==='fr' ? 'Évap'      : 'Evap',  long:t(lang,'sapEvap'),      unit:u,        dp:0 },
    { k:'fuelUsed',     l: lang==='fr' ? 'Combust.'  : 'Fuel',  long:t(lang,'fuelUsed'),     unit:(FUELS.find(f=>f.label===ls.get('sg_fuel','Firewood (cord)'))||FUELS[0]).unit, dp:1 },
    { k:'boilHours',    l: lang==='fr' ? 'Heures'    : 'Hours', long:t(lang,'boilHours'),    unit:'hr',     dp:1 },
  ];
  const kindOf = k => KINDS.find(x => x.k === k) || KINDS[0];
  // "Sap Collected" is the section title the CSV and PDF importers know; the list speaks in sentence case.
  const sentence = str => str.charAt(0) + str.slice(1).replace(/ ([A-Z])(?=[a-z])/g, m => m.toLowerCase());
  const allEntries = KINDS.flatMap(K => (slog[K.k] || []).map(e => ({ ...e, kind:K.k })))
    .filter(e => !activePoint || e.point === activePoint)
    .sort((a, b) => (srDateMs(b.date) - srDateMs(a.date)) || ((b.id||0) - (a.id||0)));
  const shortDate = ds => srDateShort(ds, lang);

  // The sheet
  const [showSheet, setShowSheet] = useState(false);
  const [sheetKind, setSheetKind] = useState(() => ls.get('sg_log_last_kind', 'sapCollected'));
  const openSheet = () => { setEditing(null); setSheetKind(ls.get('sg_log_last_kind', 'sapCollected')); setShowSheet(true); };
  // The desktop sidebar's persistent "Log a run" navigates here then fires this
  // event; opening the sheet directly saves the second tap.
  useEffect(() => {
    const h = () => openSheet();
    window.addEventListener('sr-log-a-run', h);
    return () => window.removeEventListener('sr-log-a-run', h);
  }, []);
  // The saved-entry moment (Pass 5): id+kind of the entry the sheet just
  // saved. Set AFTER the writes below run — pure render state, auto-clears.
  const [moment, setMoment] = useState(null);
  useEffect(() => {
    if (!moment) return;
    const tm = setTimeout(() => setMoment(null), 900);
    return () => clearTimeout(tm);
  }, [moment]);
  const saveEntry = (kind, entry) => {
    // If the write didn't take, stop here: no celebration for a save that didn't
    // happen, and no auto-copy rows that would be just as unsaved. The lock or
    // quota banner is already explaining why.
    if (!updLog(kind, [...(slog[kind] || []), entry])) return;
    ls.set('sg_log_last_kind', kind);
    // Micro-delight — fire-and-forget; nothing below reads it, nothing above waits on it.
    try { setMoment({ id: entry.id, kind }); } catch {}
    // Auto-copy sap collected into R/O and/or the evaporator, exactly as the old section did:
    // a functional update so both targets are written atomically.
    if (kind === 'sapCollected' && (autoCopy.ro || autoCopy.evap)) {
      const amount = entry.val, date = entry.date;
      setLogs(prevLogs => {
        const prevSlog = prevLogs[season] || empty;
        const updates  = { ...prevSlog };
        if (autoCopy.ro)   updates.sapRO   = [...(prevSlog.sapRO  ||[]), { id:Date.now(),   date, val:amount, note:'← auto from sap collected' }];
        if (autoCopy.evap) updates.sapEvap = [...(prevSlog.sapEvap||[]), { id:Date.now()+1, date, val:amount, note:'← auto from sap collected' }];
        const up = { ...prevLogs, [season]: updates };
        if (!ls.set('sg_logs2', up)) return prevLogs;   // reject the copy too
        return up;
      });
    }
  };
  const deleteEntry = (kind, id) => updLog(kind, (slog[kind] || []).filter(x => x.id !== id));
  const updateEntry = (kind, id, changes) => updLog(kind, (slog[kind] || []).map(x => x.id===id ? {...x, ...changes} : x));
  const [editing, setEditing] = useState(null);   // the entry a tapped row opened in the sheet, or null for a new one
  const GRADE_CODES = { 'Golden Delicate':'GD', 'Amber Rich':'AR', 'Dark Robust':'DR', 'Very Dark Strong':'VD' };

  // The verdict: yield per tap so far against the producer's own benchmark
  const yModel = yieldModelSaved();
  const perTap = trees > 0 && syT > 0 ? syT / trees : null;
  const perTapGal = perTap == null ? null : (units === 'L' ? perTap / 3.78541 : perTap);
  const standing = perTapGal == null ? null : perTapGal >= yModel.high ? 'above the range' : perTapGal >= yModel.low ? 'inside the range' : 'below the range';
  const [showMore, setShowMore] = useState(false);
  const tracking = ls.get('sg_fresh_status', 'idle') === 'tracking';

  return (
    <div style={{ paddingBottom: allEntries.length > 8 ? 84 : 0 }}>

      {showImport && <SapImportModal season={season} lang={lang} onClose={()=>setShowImport(false)} onImport={updated=>{setLogs(updated);}} />}

      {/* ── Season totals: the Today figure treatment, the signature on Syrup ── */}
      <div className="stat3" style={{ padding:'2px 0 10px', borderBottom:'1px solid #131e2c' }}>
        <div className="eyebrow">{lang==='fr' ? 'Sirop' : 'Syrup'}</div><div className="eyebrow">{lang==='fr' ? 'Sève' : 'Sap'}</div><div className="eyebrow">R/O</div>
        <div className="fig lead"><span className="v">{fmt(syT,1)}</span><span className="u">{u}</span></div>
        <div className="fig"><span className="v">{fmt(sapT,0)}</span><span className="u">{u}</span></div>
        <div className="fig"><span className="v">{fmt(roT,0)}</span><span className="u">{u}</span></div>
      </div>
      <div style={{ fontSize:13, color:'#7f92a6', lineHeight:1.5, padding:'10px 0 0' }}>
        {standing
          ? <><b style={{ color:'#e6edf3' }}>{fmt(perTap,2)} {u}/tap</b> so far · {fmt(trees,0)} taps</>
          : <>No syrup logged yet · {fmt(trees,0)} taps</>}
      </div>

      {tracking && <div style={{ marginTop:12 }}><SapFreshnessTracker /></div>}

      {/* ── Collection Point filter pills (only shown when points are defined) ── */}
      {cpoints.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', margin:'12px 0 4px', padding:'2px 0' }}>
          <button onClick={()=>setActivePoint(null)}
            style={{ background: activePoint===null ? '#2dd4a7' : '#0f1720', border:`1px solid ${activePoint===null ? '#2dd4a7' : '#1e2d3d'}`, borderRadius:20, padding:'5px 14px', color: activePoint===null ? '#07090f' : '#7f92a6', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.15s' }}>
            All
          </button>
          {cpoints.map(pt => (
            <button key={pt.id} onClick={()=>setActivePoint(pt.id)}
              style={{ background: activePoint===pt.id ? pt.color+'30' : '#0f1720', border:`1px solid ${activePoint===pt.id ? pt.color : '#1e2d3d'}`, borderRadius:20, padding:'5px 14px', color: activePoint===pt.id ? pt.color : '#7f92a6', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.15s', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:pt.color, display:'inline-block' }} />
              {pt.name}
            </button>
          ))}
        </div>
      )}


      {/* ── Entries, newest first, on hairlines ── */}
      <div className="eyebrow" style={{ margin:'16px 0 4px' }}>{lang==='fr' ? 'Entrées' : 'Entries'}</div>
      {allEntries.length === 0 && (activePoint ? (
        <div style={{ fontSize:14, color:'#7f92a6', padding:'14px 2px', lineHeight:1.5 }}>No entries for this collection point yet.</div>
      ) : (
        <div style={{ textAlign:'center', padding:'24px 20px 8px' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
            <M.jug size={72} color="#EB9A33" />
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:'#e6edf3', marginBottom:4 }}>{t(lang,'noEntries')}</div>
          <div style={{ fontSize:13, color:'#7f92a6', lineHeight:1.6, marginBottom:14 }}>{t(lang,'logEmptySub')}</div>
          <button onClick={openSheet}
            style={{ minHeight:44, padding:'0 18px', borderRadius:22, border:'1.5px solid #2dd4a7',
              background:'transparent', color:'#2dd4a7', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            {lang==='fr' ? 'Noter une coulée' : 'Log a run'}
          </button>
        </div>
      ))}
      {allEntries.map(e => { const K = kindOf(e.kind); const pt = e.point && !activePoint ? cpoints.find(p=>p.id===e.point) : null; return (
        <button key={e.kind+e.id} className="log-row" onClick={()=>{ setEditing(e); setSheetKind(e.kind); setShowSheet(true); }}
          aria-label={`${sentence(K.long)}, ${fmt(e.val, K.dp)} ${K.unit}, ${e.date}. Tap to change or delete.`}>
          <span className="log-date">{shortDate(e.date)}</span>
          <span className="log-kind">
            <span>{sentence(K.long)}</span>
            {e.grade && e.grade !== '—' && <span className="log-chip amber" title={GRADE_LABELS[e.grade]||e.grade} aria-label={GRADE_LABELS[e.grade]||e.grade}>{GRADE_CODES[e.grade]||e.grade}</span>}
            {e.brix != null && <span className="log-chip">{Number(e.brix).toFixed(1)}°Bx</span>}
            {pt && <span className="log-chip" style={{ color:pt.color }}>{pt.name}</span>}
            {e.note && <span className="log-note">{e.note}</span>}
          </span>
          <span className="log-amt">{moment && moment.id === e.id && moment.kind === e.kind
            ? <RollNum value={e.val} dp={K.dp} />
            : fmt(e.val, K.dp)} <span className="u">{K.unit}</span></span>
        </button>
      ); })}

      {/* The furnished empty state above carries its own Log-a-run chip; only
          skip this bar in that exact case so the action never appears twice. */}
      {allEntries.length <= 8 && (allEntries.length > 0 || activePoint) && (
        <div className="primary-bar" style={{ margin:'16px 0 4px' }}>
          <button className="btn-primary" onClick={openSheet} id="log-a-run" style={{ minHeight:52, fontSize:16 }}>
            <I.plus size={18} color="#07090f" /> {lang==='fr' ? 'Noter une coulée' : 'Log a run'}
          </button>
        </div>
      )}

      {/* ── Everything else, behind one row ── */}
      <button className="more-row" onClick={()=>setShowMore(v=>!v)} aria-expanded={showMore}>
        <span>{lang==='fr' ? 'Plus' : 'More'}</span>
        <span className="sub">{lang==='fr' ? 'Exporter · Points de collecte · Copie auto' : 'Export · Collection points · Auto-copy'}</span>
        {showMore ? <I.chevUp size={16} color="#7f92a6" /> : <I.chevDown size={16} color="#7f92a6" />}
      </button>
      {showMore && (
        <div style={{ marginTop:12 }}>
      {/* ── Export, one quiet row ── */}
      <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'12px 16px', minHeight:60 }}>
        <span style={{ fontSize:15, fontWeight:700 }}>Export {season}</span>
        <span style={{ display:'flex', gap:8 }}>
          <button onClick={exportCSV} className="btn-secondary" style={{ width:'auto', padding:'0 14px', fontSize:14 }}><I.download size={16} color="#7f92a6" /> CSV</button>
          <button onClick={()=>exportSeasonPDF({ season, trees, units, logs, brixLog: ls.get('sg_brixlog',[]), sapBrix })}
            className="btn-secondary" style={{ width:'auto', padding:'0 14px', fontSize:14 }}>
            <I.clipboard size={16} color="#7f92a6" /> PDF
          </button>
        </span>
      </div>

      {/* ── Collection Points setup ── */}
      <div className="card" style={{ marginBottom:8 }}>
        <div className="collapsible-header" onClick={()=>setShowCPSetup(s=>!s)}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <CardIcon bg="#1a1030" icon="circle" />
            <span style={{ fontWeight:700, fontSize:15 }}>Collection Points</span>
            {cpoints.length > 0 && <span style={{ fontSize:12, color:'#7f92a6' }}>{cpoints.length} defined</span>}
          </div>
          {showCPSetup ? <I.chevUp size={16} color="#7f92a6" /> : <I.chevDown size={16} color="#7f92a6" />}
        </div>
        {showCPSetup && (
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:13, color:'#7f92a6', marginBottom:10, lineHeight:1.5 }}>
              Track sap from separate pumphouses or gathering tanks. Select a collection point before logging to tag that entry — or leave it on <strong style={{ color:'#7f92a6' }}>All</strong> for shared/unassigned entries.
            </div>
            {cpoints.map(pt => (
              <div key={pt.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid #131e2c' }}>
                <div style={{ width:11, height:11, borderRadius:'50%', background:pt.color, flexShrink:0 }} />
                <span style={{ flex:1, fontWeight:600, fontSize:14, color:'#e6edf3' }}>{pt.name}</span>
                <button onClick={()=>removeCpoint(pt.id)} style={{ background:'none', border:'none', color:'#7f92a6', cursor:'pointer', fontSize:12, textDecoration:'underline' }}>Remove</button>
              </div>
            ))}
            {cpoints.length < 6 && (
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <input aria-label="Name of the new collection point" type="text" value={newPtName} onChange={e=>setNewPtName(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addCpoint()}
                  placeholder="e.g. Pumphouse 1, North Woods…"
                  style={{ flex:1 }} />
                <button onClick={addCpoint} style={{ background:'#2dd4a7', border:'none', borderRadius:8, padding:'0 16px', fontWeight:700, fontSize:14, color:'#07090f', cursor:'pointer' }}>Add</button>
              </div>
            )}
            {cpoints.length === 6 && <div style={{ fontSize:12, color:'#7f92a6', marginTop:8 }}>Maximum 6 collection points.</div>}
          </div>
        )}
      </div>

      {/* Auto-copy settings */}
      <div className="card" style={{ marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <I.zap size={15} color="#7f92a6" />
          <span style={{ fontWeight:700, fontSize:15 }}>Auto-copy Sap Collected</span>
          <span style={{ fontSize:12, color:'#7f92a6' }}>(off by default)</span>
        </div>
        <div style={{ fontSize:13, color:'#7f92a6', marginBottom:10 }}>When you log sap collected, automatically add the same amount to:</div>
        <div style={{ display:'flex', gap:16 }}>
          <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:14 }}>
            <input type="checkbox" checked={autoCopy.ro} onChange={e=>setAutoCopyField('ro',e.target.checked)}
              style={{ accentColor:'#2dd4a7', width:16, height:16 }} />
            <span style={{ fontWeight:600 }}>R/O</span>
          </label>
          <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:14 }}>
            <input type="checkbox" checked={autoCopy.evap} onChange={e=>setAutoCopyField('evap',e.target.checked)}
              style={{ accentColor:'#2dd4a7', width:16, height:16 }} />
            <span style={{ fontWeight:600 }}>Evaporator</span>
          </label>
        </div>
      </div>

      {/* ── FILL FROM SEASON TOTAL ── */}
      {sapT > 0 && (
        <div className="card" style={{ marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <I.download size={15} color="#7f92a6" />
            <span style={{ fontWeight:700, fontSize:15, color:'#e6edf3' }}>Fill R/O &amp; Evaporator from Season Total</span>
          </div>
          <div style={{ fontSize:13, color:'#7f92a6', marginBottom:12, lineHeight:1.5 }}>
            You have <strong style={{ color:'#e6edf3' }}>{fmt(sapT,0)} gal</strong> of sap logged this season.
            If all of it went through R/O and/or the evaporator, use this to add that total as a single entry — no need to re-enter run by run.
          </div>
          <div style={{ display:'flex', gap:16, marginBottom:14 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <input type="checkbox" checked={bfTarget.ro} onChange={e=>setBfTarget(p=>({...p,ro:e.target.checked}))}
                style={{ accentColor:'#2dd4a7', width:17, height:17 }} />
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>R/O</div>
                {roT > 0 && <div style={{ fontSize:13, color:'#7f92a6', marginTop:1 }}>{fmt(roT,0)} gal already logged — will add to it</div>}
              </div>
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <input type="checkbox" checked={bfTarget.evap} onChange={e=>setBfTarget(p=>({...p,evap:e.target.checked}))}
                style={{ accentColor:'#2dd4a7', width:17, height:17 }} />
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>Evaporator</div>
                {evT > 0 && <div style={{ fontSize:13, color:'#7f92a6', marginTop:1 }}>{fmt(evT,0)} gal already logged — will add to it</div>}
              </div>
            </label>
          </div>
          <button
            disabled={!bfTarget.ro && !bfTarget.evap}
            onClick={() => {
              const targets = [bfTarget.ro && 'R/O', bfTarget.evap && 'Evaporator'].filter(Boolean).join(' and ');
              const warn = [bfTarget.ro && roT > 0 && `R/O already has ${fmt(roT,1)} gal`, bfTarget.evap && evT > 0 && `Evaporator already has ${fmt(evT,1)} gal`].filter(Boolean);
              const warnStr = warn.length > 0 ? `\n\nHeads up: ${warn.join(', ')} — this adds on top of that, it does not replace it.` : '';
              if (!window.confirm(`Add ${fmt(sapT,1)} gal to ${targets}?${warnStr}`)) return;
              const today = new Date().toISOString().split('T')[0];
              setLogs(prev => {
                const prevSlog = prev[season] || empty;
                const updates  = { ...prevSlog };
                if (bfTarget.ro)   updates.sapRO   = [...(prevSlog.sapRO  ||[]), { id:Date.now(),   date:today, val:sapT, note:'← season total (all sap)' }];
                if (bfTarget.evap) updates.sapEvap = [...(prevSlog.sapEvap||[]), { id:Date.now()+1, date:today, val:sapT, note:'← season total (all sap)' }];
                const up = { ...prev, [season]: updates };
                ls.set('sg_logs2', up);
                return up;
              });
              setBfTarget({ro:false,evap:false});
            }}
            style={{ width:'100%', padding:'12px', borderRadius:10, border:'none',
              background: (bfTarget.ro||bfTarget.evap) ? '#2dd4a7' : '#0d1a2b',
              color: (bfTarget.ro||bfTarget.evap) ? '#07090f' : '#7f92a6',
              fontSize:14, fontWeight:700, cursor:(bfTarget.ro||bfTarget.evap)?'pointer':'not-allowed',
              transition:'all 0.15s' }}>
            Add {fmt(sapT,0)} gal to {[bfTarget.ro&&'R/O',bfTarget.evap&&'Evaporator'].filter(Boolean).join(' + ') || 'selected fields'}
          </button>
        </div>
      )}

      {/* ── SapSpy / CSV import — a row, not a banner ── */}
      <button onClick={()=>setShowImport(true)} className="card" style={{ width:'100%', display:'flex', alignItems:'center', gap:12, cursor:'pointer', textAlign:'left', padding:'12px 16px', minHeight:60, marginBottom:8, font:'inherit', color:'inherit' }}>
        <I.download size={20} color="#7f92a6" />
        <span style={{ flex:1, minWidth:0 }}>
          <span style={{ display:'block', fontSize:15, fontWeight:700, color:'#e6edf3' }}>Import CSV</span>
          <span style={{ display:'block', fontSize:13, color:'#7f92a6', marginTop:1 }}>SapSpy, SapTrac, SugarCalc or any CSV</span>
        </span>
        <span style={{ color:'#7f92a6', fontSize:16, flexShrink:0 }}>›</span>
      </button>

      {!tracking && <SapFreshnessTracker />}
      <div style={{ textAlign:'center', marginBottom:14 }}>
        <button onClick={()=>{if(!window.confirm('Clear all data for '+season+'?'))return;const up={...logs};delete up[season];setLogs(up);ls.set('sg_logs2',up);}} style={{ background:'none', border:'none', color:'#7f92a6', fontSize:14, textDecoration:'underline', cursor:'pointer' }}>
          {t(lang,'clearSeason')}
        </button>
      </div>

      <div className="card">
        <div className="collapsible-header" onClick={()=>setShowF(s=>!s)}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}><CardIcon bg="#2d2010" icon="zap" /><span style={{ fontWeight:700, fontSize:15 }}>{t(lang,'seasonForecast')}</span></div>
          {showF ? <I.chevUp size={16} color="#7f92a6" /> : <I.chevDown size={16} color="#7f92a6" />}
        </div>
        {showF && (
          <div style={{ marginTop:12 }}>
            {sapT===0 ? <div style={{ textAlign:'center', color:'#7f92a6', fontSize:14, padding:'10px 0' }}>No sap logged yet. Start collecting to see a forecast.</div> : (
              <div>
                <InfoRow label={t(lang,'collectedSoFar')}            value={`${fmt(sapT,1)} ${u}`} />
                <InfoRow label={`${t(lang,'projectedYield')} (at ${fmt(rule86(sapBrix),0)}:1)`} value={`${fmt(syrupY(sapT,sapBrix),1)} ${u}`} />
                <InfoRow label={t(lang,'progressToGoal')}            value={`${fmt(pct,0)}%`} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="collapsible-header" onClick={()=>setShowC(s=>!s)}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}><CardIcon bg="#1c2128" icon="barChart" /><span style={{ fontWeight:700, fontSize:15 }}>{t(lang,'seasonComparison')}</span></div>
          {showC ? <I.chevUp size={16} color="#7f92a6" /> : <I.chevDown size={16} color="#7f92a6" />}
        </div>
        {showC && (
          <div style={{ marginTop:12 }}>
            {seasons.length===0 ? <div style={{ textAlign:'center', color:'#7f92a6', fontSize:14 }}>{t(lang,'noSeasonData')}</div> : (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, fontSize:12, fontWeight:600, color:'#7f92a6', marginBottom:6, padding:'0 4px' }}>
                  <span>Season</span><span style={{ textAlign:'right' }}>Sap</span><span style={{ textAlign:'right' }}>Syrup</span>
                </div>
                {seasons.map(yr=>{
                  const sl=logs[yr]||empty;
                  const s2=(sl.sapCollected||[]).reduce((a,e)=>a+(parseFloat(e.val)||0),0);
                  const sy2=(sl.syrupMade||[]).reduce((a,e)=>a+(parseFloat(e.val)||0),0);
                  return (
                    <div key={yr} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, padding:'8px 4px', borderBottom:'1px solid #1e2d3d', fontSize:14 }}>
                      <span style={{ fontWeight:yr===season?700:400, color:yr===season?'#2dd4a7':'#e6edf3' }}>{yr}</span>
                      <span style={{ textAlign:'right' }}>{fmt(s2,1)}</span>
                      <span style={{ textAlign:'right', color:'#e0a44a' }}>{fmt(sy2,1)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
        </div>
      )}

      {allEntries.length > 8 && (
        <div className="primary-bar pinned">
          <button className="btn-primary" onClick={openSheet} id="log-a-run">
            <I.plus size={18} color="#07090f" /> {lang==='fr' ? 'Noter une coulée' : 'Log a run'}
          </button>
        </div>
      )}

      {/* The moment: a teal sap drop falls into the bucket mark for ~700ms.
          Non-blocking (pointer-events none), skipped under reduced motion —
          the rolled number in the row is the static story there. */}
      {moment && !srReducedMotion() && (
        <div className="sr-save-moment" key={`${moment.kind}${moment.id}`} aria-hidden="true">
          <span className="sr-save-drop">
            <svg width="13" height="17" viewBox="0 0 13 17" fill="none" aria-hidden="true">
              <path fill="#2DD4A7" d="M6.5 0.8 C9.2 4.9 10.9 7.4 10.9 9.9 A4.4 4.4 0 1 1 2.1 9.9 C2.1 7.4 3.8 4.9 6.5 0.8 Z"/>
            </svg>
          </span>
          <M.bucket size={48} color="#EB9A33" />
        </div>
      )}

      {showSheet && <LogEntrySheet kinds={KINDS} kind={sheetKind} setKind={setSheetKind} lang={lang} units={units}
        activePoint={activePoint} grades={GRADES} gradeLabels={GRADE_LABELS} onSave={saveEntry} onClose={()=>{ setShowSheet(false); setEditing(null); }}
        editing={editing} onUpdate={updateEntry} onDelete={deleteEntry} />}
    </div>
  );
}


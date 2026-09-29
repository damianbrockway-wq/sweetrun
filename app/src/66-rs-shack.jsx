// ─── Sugar Shack (Phase 6): calculators, records, data, pass, settings ──────
// Every row opens a Run Sheet screen or sheet. Built here: Sap to syrup,
// Checklists, Equipment + transfer time, Backup and restore, and Settings
// (first name, units, language, season, boil screen style). Import KML/GPX and
// offline tiles open the Bush tools sheet.

function RsShack({ c }) {
  const L = c.lang;
  const s = c.lic.status;
  const passTitle = s === 'licensed' ? rt(L,'pass_licensed') : s === 'expired' ? rt(L,'pass_expired')
    : s === 'trial' ? rt(L,'pass_trial', { n:c.lic.daysLeft }) : rt(L,'pass_checking');
  const [nameDraft, setNameDraft] = useState(c.firstName || '');
  const [backup, setBackup] = useState(false);
  const [imp, setImp] = useState(false);
  const [bg, setBg] = useState(() => ls.get('sg_boil_bg', 'photo') === 'steam' ? 'steam' : 'photo');
  const setBoilBg = v => { setBg(v); ls.set('sg_boil_bg', v); };
  const R = (p, icon, family) => { const sc = RS_SCREENS[p]; if (!sc || (sc.beta && !BETA_FEATURES)) return null;
    return <RsRow key={p} icon={icon || sc.icon} family={family || sc.family} title={rt(L, sc.title)} sub={rt(L, sc.sub)} href={rsHref(p)} />; };
  return (
    <div className="rs-inner">
      <header className="rs-phead">
        <h1>{rt(L,'shackTitle')}</h1>
        <p className="rs-lede">{rt(L,'shackLede')}</p>
      </header>
      <RsBanners c={c} />
      <div className="rs-cols three">
        <div>
          <h2 className="rs-sec">{rt(L,'secCalc')}</h2>
          <div className="rs-list">
            {R('shack/sap', 'calc', 'collect')}{R('stage/collect/ro', 'ro', 'collect')}{R('stage/boil/draw-off', 'therm', 'boil')}
            {R('stage/boil/de', 'filter', 'boil')}{R('stage/boil/evaporator', 'flame', 'boil')}{R('stage/boil/finishing', 'book', 'boil')}
            {R('stage/lines/tubing', 'calc', 'lines')}{R('shack/breakeven', 'calc', 'power')}
          </div>
          <h2 className="rs-sec">{rt(L,'secGuide')}</h2>
          <div className="rs-list">{R('shack/guide', 'book', 'recap')}{R('stage/recap/diagnose', 'info', 'recap')}</div>
        </div>
        <div>
          <h2 className="rs-sec">{rt(L,'secRecords')}</h2>
          <div className="rs-list">{R('shack/log', 'list', 'recap')}{R('shack/batches', 'jug', 'boil')}{R('shack/equipment', 'wrench')}{R('shack/checklists', 'check', 'weather')}</div>
          <h2 className="rs-sec">{rt(L,'secData')}</h2>
          <div className="rs-list">
            <RsRow icon="data" title={rt(L,'set_backup')} sub={rt(L,'set_backup_s')} onClick={() => setBackup(true)} />
            <RsRow icon="up" title={rt(L,'set_import')} sub={rt(L,'set_import_s2')} onClick={() => setImp(true)} />
            <RsRow icon="map" family="lines" title={rt(L,'importKml')} sub={rt(L,'importKmlS2')} href={rsHref('bush/tools')} />
            <RsRow icon="layers" family="lines" title={rt(L,'offlineTiles')} sub={rt(L,'offlineTilesS')} href={rsHref('bush/tools')} />
          </div>
          <h2 className="rs-sec">{rt(L,'secPass')}</h2>
          <div className="rs-list">
            <RsRow icon="pass" family={s === 'expired' ? 'bad' : 'power'} title={passTitle} sub={rt(L,'pass_sub')} onClick={() => c.setShowLicense(true)} />
          </div>
        </div>
        <div>
          <h2 className="rs-sec">{rt(L,'secSettings')}</h2>
          <div className="rs-card rs-settings">
            <label className="rs-fl" htmlFor="rs-first-name">{rt(L,'firstName')}</label>
            <input id="rs-first-name" className="rs-field" type="text" autoComplete="given-name" maxLength={24}
              value={nameDraft} onChange={e => setNameDraft(e.target.value)} onBlur={() => c.setFirstName(srGreetName(nameDraft))} placeholder={rt(L,'firstNamePh')} />
            <div className="rs-note">{rt(L,'firstNameHint')}</div>
            <label className="rs-fl">{rt(L,'unitsWord')}</label>
            <RsSeg label={rt(L,'unitsWord')} value={c.units} onChange={c.setUnits} options={[['GAL', rt(L,'gallons')], ['L', rt(L,'litres')]]} />
            <div className="rs-note">{rt(L,'unitsNote', { u: rt(L, srLegacyUnits() === 'L' ? 'litres' : 'gallons').toLowerCase() })}</div>
            <label className="rs-fl">{rt(L,'langWord')}</label>
            <RsSeg label={rt(L,'langWord')} value={c.lang} onChange={c.setLang} options={[['en', 'English'], ['fr', 'Français']]} />
            <label className="rs-fl">{rt(L,'seasonYear')}</label>
            <div className="rs-yearstep">
              <button type="button" className="rs-btn2 sq" aria-label={rt(L,'prevSeason')} onClick={() => c.setSeason(y => y - 1)}><RsIcon name="back" size={22} /></button>
              <b className="tn">{c.season}</b>
              <button type="button" className="rs-btn2 sq" aria-label={rt(L,'nextSeason')} onClick={() => c.setSeason(y => y + 1)}><RsIcon name="chev" size={22} /></button>
            </div>
            <label className="rs-fl">{rt(L,'boilScreen')}</label>
            <RsSeg label={rt(L,'boilScreen')} value={bg} onChange={setBoilBg} options={[['photo', rt(L,'photoSteam')], ['steam', rt(L,'justSteam')]]} />
          </div>
          <RsOpsSettings c={c} />
          <div className="rs-list" style={{ marginTop:12 }}>
            <RsRow icon="tree" family="tap" title={rt(L,'set_wizard')} sub={rt(L,'set_wizard_s')} onClick={() => c.setShowWizard(true)} />
          </div>
        </div>
      </div>
      {backup && <RsBackupSheet c={c} onClose={() => setBackup(false)} />}
      {imp && <RsImportSheet c={c} onClose={() => setImp(false)} />}
    </div>
  );
}

// Push-screen head for Shack pages.
function RsShackHead({ c, title, eyebrow, lede }) {
  const L = c.lang;
  return (
    <header className="rs-phead"><RsPushBar href={rsHref('shack')} label={rt(L,'shackTitle')} />
      {eyebrow && <div className="rs-eyebrow plain">{eyebrow}</div>}<h1 className="sm">{title}</h1>{lede && <p className="rs-lede">{lede}</p>}</header>
  );
}

// ── Sap to syrup (replaces SapTab): rule86, jones87, syrupY ──────────────────
// Sap is typed in your unit and syrup comes out in the same unit (syrupY is a
// ratio); SapTab converted the result a second time in litre mode.
function RsSapCalc({ c }) {
  const L = c.lang, u = srU(c.units);
  const [sap, setSap] = useState(500);
  const b = parseFloat(c.sapBrix) || 0;
  const sy = syrupY(parseFloat(sap) || 0, b);
  const taps = parseInt(c.trees) || 0;
  return (
    <div className="rs-inner">
      <RsShackHead c={c} title={rt(L,'sc_sap')} eyebrow={rt(L,'calcWord')} />
      <RsBanners c={c} />
      <div className="rs-cols">
        <div className="rs-card">
          <label className="rs-fl" htmlFor="rs-sc-sap">{rt(L,'sapWordC', { u })}</label>
          <RsStepper id="rs-sc-sap" value={sap} onChange={setSap} steps={[-100, -10, 10, 100]} dp={0} unit={u} label={rt(L,'sapWordC', { u })} min={0} max={100000} />
          <label className="rs-fl" htmlFor="rs-sc-b">{rt(L,'sapBrixPct')}</label>
          <RsStepper id="rs-sc-b" value={b} onChange={v => c.setSapBrix(v === '' ? 0 : v)} steps={[-0.1, 0.1]} dp={1} unit="%" label={rt(L,'sapBrixPct')} min={0.5} max={10} big={false} />
          <p className="rs-note">{rt(L,'sharedBrix')}</p>
        </div>
        <div>
          <div className="rs-card">
            <div className="rs-meta">{rt(L,'makesAbout')}</div>
            <div className="rs-big tn">{fmt(sy, 1)}<small>{rt(L,'uSyrup', { u })}</small></div>
            <p className="rs-meta tn">{rt(L,'ratioLine', { r: fmt(rule86(b), 1), u })}</p>
            <RsKv rows={[[rt(L,'rule86'), `${fmt(rule86(b), 1)}:1`], [rt(L,'jones'), `${fmt(jones87(b), 1)}:1`],
              taps > 0 ? [rt(L,'perTapN', { n: fmt(taps, 0) }), `${fmt(sy / taps, 3)} ${u}`] : null]} />
            <p className="rs-note">{rt(L,'rule86Note')}</p>
          </div>
          <h2 className="rs-sec">{rt(L,'quickRef')}</h2>
          <div className="rs-list">{[1.5, 2.0, 2.5, 3.0].map(x => <RsRow key={x} chev={false} title={`${fmt(x, 1)}% Brix`} value={`${Math.round(rule86(x))}:1`} />)}</div>
        </div>
      </div>
    </div>
  );
}

// ── Checklists (replaces TasksTab; same sg_checks2 / sg_custom2 shapes) ──────
function RsChecklists({ c }) {
  const L = c.lang;
  const v = useSrDataVersion();
  const [phase, setPhase] = useState(() => { const st = srStageOf({ todayIso:srToday(), season:c.season, slog:(ls.get('sg_logs2',{})||{})[c.season] || {} }); return st === 'recap' ? 'post' : 'pre'; });
  const checks = React.useMemo(() => ls.get('sg_checks2', {}) || {}, [v]);
  const custom = React.useMemo(() => ls.get('sg_custom2', { pre:[], post:[] }) || { pre:[], post:[] }, [v]);
  const [newT, setNewT] = useState('');
  const key = `${c.season}-${phase}`;
  const base = phase === 'pre' ? PRE_TASKS : POST_TASKS;
  const cust = custom[phase] || [];
  const all = [...base, ...cust];
  const chk = checks[key] || {};
  const done = all.filter((_, i) => chk[i]).length;
  const W = (k, val) => { if (ls.set(k, val)) srDataChanged(); };
  const toggle = i => W('sg_checks2', { ...checks, [key]: { ...chk, [i]: !chk[i] } });
  const reset = () => { const up = { ...checks }; delete up[key]; W('sg_checks2', up); };
  const addT = () => { if (!newT.trim()) return; W('sg_custom2', { ...custom, [phase]: [...cust, newT.trim()] }); setNewT(''); };
  const remT = idx => W('sg_custom2', { ...custom, [phase]: cust.filter((_, i) => i !== idx) });
  return (
    <div className="rs-inner">
      <RsShackHead c={c} title={rt(L,'sc_tasks')} lede={rt(L,'tasksLede', { y:c.season })} />
      <RsBanners c={c} />
      <RsSeg label={rt(L,'sc_tasks')} value={phase} onChange={setPhase} options={[['pre', rt(L,'preSeasonW')], ['post', rt(L,'postSeasonW')]]} />
      <div className="rs-card" style={{ marginTop:12 }}>
        <div className="rs-split"><div className="rs-meta tn">{rt(L,'doneOf', { d: done, n: all.length })}</div><div className="rs-meta tn">{all.length ? Math.round(done / all.length * 100) : 0}%</div></div>
        <div className="rs-bar"><i style={{ width: (all.length ? done / all.length * 100 : 0) + '%', background:T.ok }} /></div>
      </div>
      <div className="rs-list" style={{ marginTop:12 }}>
        {all.map((task, i) => <div key={i} className={`rs-chk${chk[i] ? ' on' : ''}`}>
          <button type="button" className="rs-chkbtn" role="checkbox" aria-checked={!!chk[i]} onClick={() => toggle(i)}>
            <span className="rs-box" aria-hidden="true">{chk[i] && <RsIcon name="check" size={20} sw={3} />}</span><span className="rs-rt"><b>{i < base.length ? rt(L, (phase === 'pre' ? 'taskPre' : 'taskPost') + i) : task}</b></span>
          </button>
          {i >= base.length && <button type="button" className="rs-iconbtn" aria-label={rt(L,'removeTask')} onClick={() => remT(i - base.length)}><RsIcon name="x" size={18} /></button>}
        </div>)}
      </div>
      <div className="rs-inline" style={{ marginTop:12 }}>
        <input className="rs-field" aria-label={rt(L,'addTask')} placeholder={rt(L,'addTaskPh')} value={newT} onChange={e => setNewT(e.target.value)} onKeyDown={e => e.key === 'Enter' && addT()} />
        <RsBtn kind="secondary" onClick={addT}>{rt(L,'add')}</RsBtn>
      </div>
      <div style={{ marginTop:12 }}><RsBtn kind="secondary" onClick={reset}>{rt(L,'resetList', { y:c.season })}</RsBtn></div>
    </div>
  );
}

// ── Equipment + transfer time (replaces EquipTab; sg_equip2, sg_pump_*) ──────
function RsEquipment({ c }) {
  const L = c.lang, u = srU(c.units);
  const v = useSrDataVersion();
  const items = React.useMemo(() => ls.get('sg_equip2', []) || [], [v]);
  const [sheet, setSheet] = useState(false);
  const [armed, setArmed] = useState(null);
  useEffect(() => { if (armed == null) return; const tm = setTimeout(() => setArmed(null), 3000); return () => clearTimeout(tm); }, [armed]);
  const P = (k, d) => { const x = ls.get(k, d); return x === '' || x == null ? d : x; };
  // Pump rate and tank size are kept in gallons and shown in the user's unit (L/min and L in litre mode).
  const [gpm, setGpm] = useRsGalPref('sg_pump_gpm', 28, c.units);
  const [tank, setTank] = useRsGalPref('sg_pump_tank', 300, c.units);
  const gpmG = parseFloat(gpm) > 0 ? srGalStored(parseFloat(gpm), c.units) : 28, tankG = parseFloat(tank) > 0 ? srGalStored(parseFloat(tank), c.units) : 300;
  const [line, setLine] = useState(() => P('sg_pump_line', 0));
  const [lift, setLift] = useState(() => P('sg_pump_lift', 0));
  const [setup, setSetup] = useState(() => P('sg_pump_setup', 4));
  const sv = (k, set, d) => x => { set(x); ls.set(k, x === '' ? d : x); };
  const sapT = React.useMemo(() => seasonTotals(srReadLogs(c.units)[c.season] || {}).sapT, [v, c.season, c.units]);
  const tt = srTransferTime(gpmG, tankG, parseFloat(line) || 0, parseFloat(lift) || 0, parseFloat(setup) || 0, toGal(sapT, c.units));
  const del = i => { if (armed !== i) { setArmed(i); srToast(rt(L,'tapAgainDelete')); return; } if (ls.set('sg_equip2', items.filter((_, j) => j !== i))) { setArmed(null); srDataChanged(); } };
  const cond = x => x === 'Good' ? 'ok' : x === 'Poor' ? 'fault' : 'check';
  const condW = x => t(L, x === 'Good' ? 'condGood' : x === 'Fair' ? 'condFair' : 'condPoor');
  return (
    <div className="rs-inner">
      <RsShackHead c={c} title={rt(L,'sc_equip')} lede={rt(L,'equipLede')} />
      <RsBanners c={c} />
      <div className="rs-cols">
        <div>
          <h2 className="rs-sec">{rt(L,'whatYouOwn')}</h2>
          {items.length === 0 ? <div className="rs-empty"><div className="rs-mk"><M.evaporator size={52} /></div><b>{rt(L,'noEquipT')}</b><p>{rt(L,'noEquipP')}</p></div> :
            <div className="rs-list">{items.map((it, i) => <div key={it.id || i} className="rs-row rs-equip">
              <span className="rs-rt"><b>{it.name}{it.qty > 1 ? ` × ${it.qty}` : ''}</b>
                <span>{[it.brand, it.year, it.notes].filter(Boolean).join(' · ') || ' '}</span></span>
              <RsSt kind={cond(it.condition)}>{condW(it.condition)}</RsSt>
              <button type="button" className={`rs-iconbtn${armed === i ? ' bad' : ''}`} aria-label={rt(L,'deleteItem', { n: it.name })} onClick={() => del(i)}><RsIcon name="trash" size={20} /></button>
            </div>)}</div>}
          <div style={{ marginTop:16 }}><RsBtn icon="plus" onClick={() => setSheet(true)} id="rs-equip-add">{rt(L,'addEquip')}</RsBtn></div>
        </div>
        <div>
          <h2 className="rs-sec">{rt(L,'transferTime')}</h2>
          <div className="rs-card">
            <div className="rs-grid2">
              <div><label className="rs-fl" htmlFor="rs-t-gpm">{rt(L,'pumpGpm')}</label><RsStepper id="rs-t-gpm" value={gpm} onChange={setGpm} steps={srVolSteps([-1, 1], [-5, 5], c.units)} dp={0} unit={c.units === 'L' ? 'L/min' : 'gpm'} label={rt(L,'pumpGpm')} min={1} max={c.units === 'L' ? 1900 : 500} big={false} /></div>
              <div><label className="rs-fl" htmlFor="rs-t-tank">{rt(L,'tankGal')}</label><RsStepper id="rs-t-tank" value={tank} onChange={setTank} steps={srVolSteps([-50, 50], [-200, 200], c.units)} dp={0} unit={u} label={rt(L,'tankGal')} min={c.units === 'L' ? 40 : 10} max={c.units === 'L' ? 75000 : 20000} big={false} /></div>
              <div><label className="rs-fl" htmlFor="rs-t-line">{rt(L,'lineFt')}</label><RsStepper id="rs-t-line" value={line} onChange={sv('sg_pump_line', setLine, 0)} steps={[-100, 100]} dp={0} unit="ft" label={rt(L,'lineFt')} min={0} max={10000} big={false} /></div>
              <div><label className="rs-fl" htmlFor="rs-t-lift">{rt(L,'liftFt')}</label><RsStepper id="rs-t-lift" value={lift} onChange={sv('sg_pump_lift', setLift, 0)} steps={[-1, 1]} dp={0} unit="ft" label={rt(L,'liftFt')} min={0} max={200} big={false} /></div>
            </div>
            <label className="rs-fl" htmlFor="rs-t-set">{rt(L,'setupMin')}</label><RsStepper id="rs-t-set" value={setup} onChange={sv('sg_pump_setup', setSetup, 4)} steps={[-1, 1]} dp={0} unit="min" label={rt(L,'setupMin')} min={0} max={120} big={false} />
            <div className="rs-hr" />
            <div className="rs-split">
              <div><div className="rs-meta">{rt(L,'realistic')}</div><div className="rs-big tn">{fmt(tt.realisticTotal, 0)}<small>min</small></div></div>
              <div style={{ textAlign:'right' }}><div className="rs-meta">{rt(L,'theoretical')}</div><div className="rs-mid tn">{fmt(tt.baseTotal, 0)}<small>min</small></div></div>
            </div>
            <p className="rs-meta tn">{rt(L,'fillSetup', { f: fmt(tt.realFillMin, 0), s: fmt(parseFloat(setup) || 0, 0) })}{tt.effectiveGPM < gpmG ? ' · ' + rt(L,'flowDrop', { g: fmt(fromGal(tt.effectiveGPM, c.units), 0), u: c.units === 'L' ? 'L/min' : 'gpm' }) : ''}</p>
            {tt.numHauls ? <RsKv rows={[[rt(L,'haulsSeason', { y:c.season }), String(tt.numHauls)], [rt(L,'haulTime'), `${fmt(tt.totalHaulHrs, 1)} h`], [rt(L,'avgHaul'), `${fmt(sapT / tt.numHauls, 0)} ${u}`]]} />
              : <p className="rs-note">{rt(L,'haulNoSap')}</p>}
            <p className="rs-note">{rt(L,'haulNote', { g: fmt(fromGal(tankG * 0.9, c.units), 0), u })}</p>
          </div>
        </div>
      </div>
      {sheet && <RsEquipSheet c={c} onClose={() => setSheet(false)} />}
    </div>
  );
}
function RsEquipSheet({ c, onClose }) {
  const L = c.lang;
  const [f, setF] = useState({ name:'', brand:'', qty:1, year:'', condition:'Good', notes:'' });
  const [fail, setFail] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.name.trim()) { const el = document.getElementById('rs-eq-name'); if (el) el.focus(); return; }
    const all = ls.get('sg_equip2', []) || [];
    if (!ls.set('sg_equip2', [...all, { ...f, id: Date.now() }])) { setFail(true); return; }
    srDataChanged(); srToast(rt(L,'equipSaved', { n: f.name.trim() })); onClose();
  };
  return (
    <RsSheet title={rt(L,'addEquip')} onClose={onClose}>
      <label className="rs-fl" htmlFor="rs-eq-name">{rt(L,'equipName')}</label>
      <input id="rs-eq-name" className="rs-field" value={f.name} onChange={e => set('name', e.target.value)} placeholder={rt(L,'equipNamePh')} />
      <div className="rs-grid2">
        <div><label className="rs-fl" htmlFor="rs-eq-brand">{rt(L,'brand')}</label><input id="rs-eq-brand" className="rs-field" value={f.brand} onChange={e => set('brand', e.target.value)} /></div>
        <div><label className="rs-fl" htmlFor="rs-eq-year">{rt(L,'yearWord')}</label><input id="rs-eq-year" className="rs-field" inputMode="numeric" value={f.year} onChange={e => set('year', e.target.value)} /></div>
      </div>
      <label className="rs-fl" htmlFor="rs-eq-qty">{rt(L,'qty')}</label>
      <RsStepper id="rs-eq-qty" value={f.qty} onChange={v => set('qty', v === '' ? 1 : v)} steps={[-1, 1]} dp={0} unit="" label={rt(L,'qty')} min={1} max={9999} big={false} />
      <label className="rs-fl">{rt(L,'condition')}</label>
      <RsSeg label={rt(L,'condition')} value={f.condition} onChange={v => set('condition', v)} options={[['Good', t(L,'condGood')], ['Fair', t(L,'condFair')], ['Poor', t(L,'condPoor')]]} />
      <label className="rs-fl" htmlFor="rs-eq-notes">{rt(L,'noteOpt')}</label>
      <input id="rs-eq-notes" className="rs-field" value={f.notes} onChange={e => set('notes', e.target.value)} />
      <div className="rs-sheetfoot">
      {fail && <p className="rs-errline" role="alert">{rt(L,'bNotSavedT')}. {rt(L,'bLockedP')}</p>}
      <div><RsBtn onClick={save}>{rt(L,'saveEquip')}</RsBtn></div></div>
    </RsSheet>
  );
}

// ── Backup and restore (BackupModal's logic: every sg_* key, format 1) ───────
function RsBackupSheet({ c, onClose }) {
  const L = c.lang;
  const [persisted, setPersisted] = useState(null);
  const [msg, setMsg] = useState(null);
  const [pending, setPending] = useState(null);
  useEffect(() => { if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(setPersisted).catch(() => {}); }, []);
  const keyCount = Object.keys(localStorage).filter(k => k.startsWith('sg_')).length;
  const doExport = () => {
    const keys = {};
    Object.keys(localStorage).forEach(k => { if (k.startsWith('sg_')) keys[k] = localStorage.getItem(k); });
    const payload = { app:'SweetRun', format:1, exportedAt:new Date().toISOString(), keys };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(payload)], { type:'application/json' }));
    a.download = `sweetrun-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setMsg({ ok:true, text: rt(L,'backupDone', { n: Object.keys(keys).length }) });
  };
  const doImport = e => {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!obj || obj.app !== 'SweetRun' || !obj.keys || typeof obj.keys !== 'object') throw new Error('bad format');
        const entries = Object.entries(obj.keys).filter(([k, v]) => k.startsWith('sg_') && typeof v === 'string');
        if (!entries.length) throw new Error('empty');
        setPending({ entries, when: obj.exportedAt ? String(obj.exportedAt).split('T')[0] : null }); setMsg(null);
      } catch { setMsg({ ok:false, text: rt(L,'backupBad') }); }
    };
    reader.readAsText(file);
  };
  const restore = () => {
    pending.entries.forEach(([k, v]) => { try { localStorage.setItem(k, v); } catch {} });
    // Untagged entries in the backup were logged in its own unit: a backup made before log
    // units carries no sg_units_legacy, so its sg_units stands in (see srSlogInUnit).
    if (!pending.entries.some(([k]) => k === 'sg_units_legacy')) { const bu = pending.entries.find(([k]) => k === 'sg_units'); let x = 'GAL'; try { x = bu && JSON.parse(bu[1]) === 'L' ? 'L' : 'GAL'; } catch {} try { localStorage.setItem('sg_units_legacy', JSON.stringify(x)); } catch {} }
    window.location.reload();
  };
  return (
    <RsSheet title={rt(L,'set_backup')} onClose={onClose} id="rs-backup-sheet">
      <p className="rs-meta">{rt(L,'backupLede', { n: keyCount })}</p>
      {persisted === false && <div className="rs-banner" style={{ marginTop:12 }}><span className="rs-bic"><RsIcon name="alert" size={22} /></span>
        <span className="rs-bt"><span>{rt(L,'notPersisted')}</span></span></div>}
      {pending ? <div className="rs-card rs-confirm" style={{ marginTop:14 }}>
        <b className="rs-cardt">{rt(L,'restoreQ', { n: pending.entries.length, d: pending.when ? srDateShort(pending.when, L) : '' })}</b>
        <p className="rs-meta">{rt(L,'restoreWarn')}</p>
        <div style={{ marginTop:14 }}><RsBtn onClick={restore} id="rs-restore-go">{rt(L,'restoreGo')}</RsBtn></div>
        <div style={{ marginTop:10 }}><RsBtn kind="secondary" onClick={() => setPending(null)}>{rt(L,'cancel')}</RsBtn></div>
      </div> : <>
        <div style={{ marginTop:16 }}><RsBtn icon="download" onClick={doExport} id="rs-backup-dl">{rt(L,'backupDl')}</RsBtn></div>
        <label className="rs-btn2 rs-filebtn" style={{ marginTop:10 }}>
          <RsIcon name="up" size={22} />{rt(L,'restoreFrom')}
          <input type="file" accept=".json,application/json" onChange={doImport} id="rs-restore-file" />
        </label>
      </>}
      {msg && <p className={msg.ok ? 'rs-okline' : 'rs-errline'} role="status">{msg.text}</p>}
    </RsSheet>
  );
}

// Pumps and alerts: the defaults behind the leak rule, freeze prep, fuel and
// stale readings (sg_watch_prefs), and the Demo readings switch for Watch mode.
// All preference keys: they still save during an expired trial.
function RsOpsSettings({ c }) {
  const L = c.lang;
  const v = useSrDataVersion();
  const P = React.useMemo(() => srOpsPrefs(ls.get('sg_watch_prefs', {})), [v]);
  const demo = React.useMemo(() => !!ls.get('sg_demo_readings', false), [v]);
  const put = patch => { ls.set('sg_watch_prefs', { ...srObj(ls.get('sg_watch_prefs', {})), ...patch }); srDataChanged(); };
  const setDemo = on => { ls.set('sg_demo_readings', !!on); srDataChanged(); srToast(rt(L, on ? 'demoOnToast' : 'demoOffToast')); };
  return <>
    <h2 className="rs-sec">{rt(L,'secOps')}</h2>
    <div className="rs-card rs-settings" id="rs-ops-settings">
      <label className="rs-fl" htmlFor="rs-leak-lim">{rt(L,'setLeak')}</label>
      <RsStepper id="rs-leak-lim" value={String(P.leakLimitIn)} onChange={x => put({ leakLimitIn: x === '' ? null : x })} steps={[-0.5, -0.1, 0.1, 0.5]} dp={1} unit="in" label={rt(L,'setLeak')} min={0.5} max={10} big={false} />
      <div className="rs-note">{rt(L,'setLeakN', { d: fmt(SR_OPS_DEFAULTS.leakLimitIn, 1) })}</div>
      <label className="rs-fl" htmlFor="rs-freeze-f">{rt(L,'setFreeze')}</label>
      <RsStepper id="rs-freeze-f" value={String(P.freezeF)} onChange={x => put({ freezeF: x === '' ? null : x })} steps={[-2, -1, 1, 2]} dp={0} unit="°F" label={rt(L,'setFreeze')} min={0} max={40} big={false} />
      <div className="rs-note">{rt(L,'setFreezeN', { d: SR_OPS_DEFAULTS.freezeF })}</div>
      <label className="rs-fl" htmlFor="rs-fuel-h">{rt(L,'setFuel')}</label>
      <RsStepper id="rs-fuel-h" value={String(P.fuelLowH)} onChange={x => put({ fuelLowH: x === '' ? null : x })} steps={[-1, 1]} dp={0} unit="h" label={rt(L,'setFuel')} min={1} max={24} big={false} />
      <label className="rs-fl" htmlFor="rs-stale-h">{rt(L,'setStale')}</label>
      <RsStepper id="rs-stale-h" value={String(P.staleH)} onChange={x => put({ staleH: x === '' ? null : x })} steps={[-2, 2]} dp={0} unit="h" label={rt(L,'setStale')} min={1} max={72} big={false} />
      <div className="rs-note">{rt(L,'setDefaultsN')}</div>
    </div>
    <div className="rs-list" style={{ marginTop:12 }}>
      <RsSwitch on={demo} onChange={setDemo} title={rt(L,'demoTitle')} sub={rt(L, demo ? 'demoOnS' : 'demoOffS')} />
    </div>
  </>;
}

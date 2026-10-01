// ─── Sheets rebuilt (Phase 6): Season Pass, first-season setup, import ──────
// RsPassSheet replaces LicenseModal (verifyLicense, sg_license, the buy link,
// the optional email through pingEvent). RsWizard replaces FirstSeasonWizard
// (srWizardPlan / srWizardData: the same sg_wizard_data, sg_onboarded,
// sg_trees and sg_fuel writes). RsImportSheet replaces SapImportModal
// (srParseSapCsv, srParseSugarCalcText, dedupeImport, srMergeImport) and now
// checks the write, so an expired trial says "not saved" instead of closing.

function RsPassSheet({ c, onClose }) {
  const L = c.lang, lic = c.lic;
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState(null);
  const [email, setEmail] = useState('');
  const [emsg, setEmsg] = useState(null);
  useEffect(() => { ls.set('sg_email_prompted', true); }, []);
  const apply = async () => {
    const p = await verifyLicense(key);
    if (p && p.unverifiable) { setMsg({ ok:false, t: rt(L, p.offline ? 'passCheckOffline' : 'passCantCheck') }); return; }
    if (!p) { setMsg({ ok:false, t: rt(L,'passBad') }); return; }
    if (p.expired) { setMsg({ ok:false, t: rt(L,'passExpired2', { d: srDateMid(p.x, L) }) }); return; }
    SR_LOCKED = false; SR_TRIAL_GATE = null; _srClear();
    ls.set('sg_license', key.trim());
    setMsg({ ok:true, t: rt(L,'passOk2', { d: srDateMid(p.x, L) }) });
    c.setLic({ status:'licensed', until:p.x });
  };
  const saveEmail = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setEmsg({ ok:false, t: rt(L,'emailBad') }); return; }
    try { await pingEvent('trial_email', email); setEmsg({ ok:true, t: rt(L,'emailOk') }); } catch { setEmsg({ ok:false, t: rt(L,'emailFail') }); }
  };
  return (
    <RsSheet title={rt(L,'secPass')} onClose={onClose} id="rs-pass-sheet">
      <p className="rs-body" id="rs-pass-status">{lic.status === 'licensed' ? rt(L,'passActiveP2', { d: srDateMid(lic.until, L) }) : lic.status === 'expired' ? rt(L,'passEndedP')
        : lic.trial && lic.trial.mode === 'sap' ? rt(L,'passTrialSapP', { u: rt(L, lic.trial.sapUsed === 0 ? 'sapDays0' : lic.trial.sapUsed === 1 ? 'sapDays1' : 'sapDaysN', { n: lic.trial.sapUsed }),
            left: lic.trial.lastFree ? rt(L,'passSapLeft0') : rt(L, lic.trial.sapLeft === 1 ? 'passSapLeft1' : 'passSapLeftN', { n: lic.trial.sapLeft }) })
        : rt(L,'passTrialP', { n: lic.daysLeft })}</p>
      {lic.cantCheck && <p className="rs-errline" role="alert" id="rs-pass-cantcheck">{rt(L,'passCantCheck')}</p>}
      {lic.status !== 'licensed' && <div style={{ marginTop:14 }}><RsBtn href={STRIPE_BUY_URL} ext>{rt(L,'passBuy')}</RsBtn></div>}
      <label className="rs-fl" htmlFor="rs-pass-key">{rt(L,'passHave')}</label>
      <textarea id="rs-pass-key" className="rs-field rs-mono" rows={3} value={key} onChange={e => setKey(e.target.value)} placeholder={rt(L,'passPh')} />
      <div style={{ marginTop:10 }}><RsBtn kind="secondary" onClick={apply} id="rs-pass-apply">{rt(L,'passActivate')}</RsBtn></div>
      {msg && <p className={msg.ok ? 'rs-okline' : 'rs-errline'} role="status">{msg.t}</p>}
      {lic.status !== 'licensed' && <>
        <div className="rs-hr" />
        <label className="rs-fl" htmlFor="rs-pass-email">{rt(L,'emailAsk')}</label>
        <div className="rs-inline">
          <input id="rs-pass-email" className="rs-field" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={rt(L,'emailPh')} />
          <RsBtn kind="secondary" onClick={saveEmail}>{rt(L,'emailBtn')}</RsBtn>
        </div>
        {emsg && <p className={emsg.ok ? 'rs-okline' : 'rs-errline'} role="status">{emsg.t}</p>}
        <p className="rs-note">{rt(L,'emailWhy')}</p>
      </>}
    </RsSheet>
  );
}

// ── First-season setup ───────────────────────────────────────────────────────
function RsWizard({ c, onClose, onComplete }) {
  const L = c.lang, u = srU(c.units);
  const [step, setStep] = useState(0);
  const [o, setO] = useState({ treeCount:'', trunkSize:'medium', systemType:'gravity', collectionType:'mainline', hasEvap:null, panSize:'2x4',
    fuelType:'Firewood (cord)', fuelCost:'', syrupPrice:'' });
  const set = k => x => setO(p => ({ ...p, [k]: x }));
  const p = srWizardPlan({ ...o, syrupPrice: o.syrupPrice === '' ? '' : srPerGal(parseFloat(o.syrupPrice) || 0, c.units) });
  // Fix pass 2 (item 34): a first step for language and units, so a French phone starts in French
  // and litres, °C and cm are chosen before any number is typed. Steps: u, 0, 1, 2, 3, 4.
  const KEYS = ['u', '0', '1', '2', '3', '4'], sk = KEYS[step];
  const [fail, setFail] = useState(null);
  const can = [true, p.trees > 0, true, o.hasEvap !== null, true, true][step];
  // Money is typed per the display unit (a litre in litre mode) and kept per US gallon, as every price is.
  const oG = { ...o, syrupPrice: o.syrupPrice === '' ? '' : srPerGal(parseFloat(o.syrupPrice) || 0, c.units) };
  const finish = () => {
    if (srFormBlocked('rs-wizard')) return;
    const data = srWizardData(oG);
    // Fix pass 2 (item 23): a refused write (an ended trial) says so; it never says "saved".
    if (!ls.set('sg_wizard_data', data)) { setFail(SR_WRITE_FAIL || 'locked'); return; }
    ls.set('sg_onboarded', true);
    srDataChanged(); onComplete(data);
  };
  const Opt = ({ k, val, label, sub }) => <button type="button" className={`rs-opt${o[k] === val ? ' on' : ''}`} aria-pressed={o[k] === val} onClick={() => set(k)(val)}>
    <b>{label}</b>{sub && <span>{sub}</span>}</button>;
  const Y = m => `${rt(L,'rangeTo', { a: fmt(fromGal(m.low, c.units), 2), b: fmt(fromGal(m.high, c.units), 2) })} ${u}`;
  const steps = [
    <div key="u">
      <p className="rs-meta" style={{ marginTop:0 }}>{rt(L,'wzuP')}</p>
      <label className="rs-fl">{rt(L,'langWord')}</label>
      <RsSeg label={rt(L,'langWord')} value={c.lang} onChange={c.setLang} options={[['en', 'English'], ['fr', 'Français']]} />
      <label className="rs-fl">{rt(L,'unitsWord')}</label>
      <RsSeg label={rt(L,'unitsWord')} value={c.units} onChange={c.setUnits} options={[['GAL', rt(L,'gallons')], ['L', rt(L,'litres')]]} />
      <label className="rs-fl">{rt(L,'measureWord')}</label>
      <RsSeg label={rt(L,'measureWord')} value={c.metric ? 'metric' : 'us'} onChange={c.setMeasure} options={[['us', rt(L,'measureUS')], ['metric', rt(L,'measureMetric')]]} />
    </div>,
    <div key="0">
      <p className="rs-meta" style={{ marginTop:0 }}>{rt(L,'wz0P')}</p>
      <label className="rs-fl" htmlFor="rs-wz-trees">{rt(L,'wzTrees')}</label>
      <RsStepper id="rs-wz-trees" value={o.treeCount} onChange={set('treeCount')} steps={[-10, -1, 1, 10]} unit={rt(L,'treesWord').toLowerCase()} label={rt(L,'wzTrees')} min={0} max={100000} base={50} ph="0" />
      {p.trees <= 0 && <p className="rs-note" style={{ marginTop:8 }}>{rt(L,'wzNeedTrees')}</p>}
      <label className="rs-fl">{rt(L,'wzTrunk')}</label>
      <div className="rs-opts three"><Opt k="trunkSize" val="small" label={rt(L,'wzSmall')} sub={rt(L,'wzSmallS')} /><Opt k="trunkSize" val="medium" label={rt(L,'wzMed')} sub={rt(L,'wzMedS')} /><Opt k="trunkSize" val="large" label={rt(L,'wzLarge')} sub={rt(L,'wzLargeS')} /></div>
    </div>,
    <div key="1">
      <p className="rs-meta" style={{ marginTop:0 }}>{rt(L,'wz1P')}</p>
      <label className="rs-fl">{rt(L,'wzSystem')}</label>
      <div className="rs-opts"><Opt k="systemType" val="gravity" label={rt(L,'wzGravity')} sub={Y(YIELD_MODELS.gravity)} /><Opt k="systemType" val="vacuum" label={rt(L,'wzVacuum')} sub={Y(YIELD_MODELS.vacuum)} /></div>
      <label className="rs-fl">{rt(L,'wzCollect')}</label>
      <div className="rs-opts"><Opt k="collectionType" val="buckets" label={rt(L,'wzBuckets')} sub={rt(L,'wzBucketsS')} /><Opt k="collectionType" val="mainline" label={rt(L,'wzMainline')} sub={rt(L,'wzMainlineS')} /></div>
    </div>,
    <div key="2">
      <p className="rs-meta" style={{ marginTop:0 }}>{rt(L,'wz2P')}</p>
      <label className="rs-fl">{rt(L,'wzHasEvap')}</label>
      <div className="rs-opts"><Opt k="hasEvap" val={true} label={rt(L,'wzYes')} sub={rt(L,'wzYesS')} /><Opt k="hasEvap" val={false} label={rt(L,'wzNo')} sub={rt(L,'wzNoS')} /></div>
      {o.hasEvap && <><label className="rs-fl">{rt(L,'evPan')}</label>
        <RsSeg wrap label={rt(L,'evPan')} value={o.panSize} onChange={set('panSize')} options={Object.keys(SR_WIZ_PANS).map(k => [k, k.replace('x', '×')])} />
        <p className="rs-note">{rt(L,'wzPanRate', { v: srVol(SR_WIZ_PANS[o.panSize] || 0, c.units), u })}</p></>}
      <label className="rs-fl">{rt(L,'evFuelT')}</label>
      <RsSeg wrap label={rt(L,'evFuelT')} value={o.fuelType} onChange={set('fuelType')} options={FUELS.map(f => [f.label, f.unit === 'ccf' ? rt(L,'fuelGas') : f.unit === 'cord' ? rt(L,'fuelWood') : fuelLabel(f, L).replace(/ \(.*\)/, '')])} />
    </div>,
    <div key="3">
      <p className="rs-meta" style={{ marginTop:0 }}>{rt(L,'wz3P')}</p>
      <label className="rs-fl" htmlFor="rs-wz-fc">{rt(L,'wzFuelCost')}</label>
      <RsMoney id="rs-wz-fc" value={o.fuelCost} onChange={set('fuelCost')} label={rt(L,'wzFuelCost')} steps={[-50, 50]} />
      <p className="rs-note">{rt(L,'wzFuelCostNote')}</p>
      <label className="rs-fl" htmlFor="rs-wz-sp">{rt(L,'wzPrice')}</label>
      <RsMoney id="rs-wz-sp" value={o.syrupPrice} onChange={set('syrupPrice')} label={rt(L,'wzPrice')} steps={c.units === 'L' ? [-1, 1] : [-5, 5]} dp={c.units === 'L' ? 2 : 0} unit={'/' + u} />
      <p className="rs-note">{rt(L,'wzPriceNote')}</p>
    </div>,
    <div key="4">
      {p.trees > 0 ? <>
        <div className="rs-grid2">
          <RsNum label={rt(L,'wzRecTaps')} value={fmt(p.recTaps, 0)} />
          <RsNum label={rt(L,'wzSyrupRange')} value={srVol(p.syrupMid, c.units)} unit={u} sub={rt(L,'wzRange', { a: srVol(p.syrupLow, c.units), b: srVol(p.syrupHigh, c.units), u })} />
          <RsNum label={rt(L,'wzSapEst')} value={srVol(p.sapMid, c.units)} unit={u} />
          <RsNum label={rt(L,'wzRevenue')} value={srMoney(p.syrupMid * p.price)} sub={rt(L,'wzAvgYear')} />
          {p.sessions && <RsNum label={rt(L,'wzSessions')} value={String(p.sessions)} />}
          {p.firewood && <RsNum label={rt(L,'wzCords')} value={fmt(p.firewood, 1)} />}
        </div>
        <h2 className="rs-sec">{rt(L,'wzChecklist')}</h2>
        <ol className="rs-steps">{[1,2,3,4,5,6].map(i => <li key={i}><b>{rt(L, 'wzc' + i + 'T')}</b>{' '}{rt(L, 'wzc' + i + 'P')}</li>)}</ol>
      </> : <div className="rs-empty"><b>{rt(L,'wzNoTreesT')}</b><p>{rt(L,'wzNoTreesP')}</p></div>}
    </div>,
  ];
  return (
    <RsSheet title={rt(L, 'wzT' + sk)} onClose={onClose} id="rs-wizard">
      <div className="rs-eyebrow plain" style={{ marginTop:-6 }}>{rt(L,'wzStep6', { n: step + 1 })}</div>
      <div className="rs-wzbar" aria-hidden="true">{KEYS.map((k, i) => <i key={k} className={i <= step ? 'on' : ''} />)}</div>
      {steps[step]}
      <div className="rs-sheetfoot"><RsSheetFail c={c} fail={fail} onClose={onClose} /><div className="rs-btnrow">
        {step > 0 ? <RsBtn kind="secondary" onClick={() => setStep(s => s - 1)}>{rt(L,'backW')}</RsBtn> : <RsBtn kind="secondary" onClick={onClose}>{rt(L,'notNow')}</RsBtn>}
        {step < KEYS.length - 1 ? <RsBtn onClick={() => { if (srFormBlocked('rs-wizard')) return; can && setStep(s => s + 1); }} disabled={!can} id="rs-wz-next">{rt(L,'nextW')}</RsBtn>
          : <RsBtn onClick={finish} disabled={p.trees <= 0} id="rs-wz-finish">{rt(L,'wzFinish')}</RsBtn>}
      </div></div>
    </RsSheet>
  );
}

// ── Sap monitor import ───────────────────────────────────────────────────────
function srLoadPdfJs() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = ''; resolve(); };
    s.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(s);
  });
}
const SR_IMPORT_SOURCES = ['sugarcalc_pdf', 'sapspy', 'saptrac', 'generic', 'manual'];
function RsImportSheet({ c, onClose }) {
  const L = c.lang, u = srU(c.units);
  const [src, setSrc] = useState('sugarcalc_pdf');
  const [text, setText] = useState('');
  const [pv, setPv] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(false);
  const take = r => { if (r.error) { setErr(r.error); setPv(null); } else { setErr(''); setPv(r); } };
  // SweetRun's own CSV names each kind the way the Log does, in English or French.
  const kindLabels = React.useMemo(() => Object.fromEntries(SR_LOG_KINDS.map(k => [k, [t('en', k), t('fr', k)]])), []);
  const parseCsv = txt => srParseSapCsv(txt, kindLabels);
  const readPdf = async file => {
    setBusy(true); setErr(''); setPv(null);
    try {
      await srLoadPdfJs();
      const buf = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = e => res(e.target.result); fr.onerror = () => rej(new Error('read')); fr.readAsArrayBuffer(file); });
      const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      let full = '';
      for (let i = 1; i <= pdf.numPages; i++) { const pg = await pdf.getPage(i); full += (await pg.getTextContent()).items.map(x => x.str).join(' ') + ' '; }
      take(srParseSugarCalcText(full, new Date().getFullYear()));
    } catch { setErr('impPdfFail'); }
    setBusy(false);
  };
  const onFile = e => {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.pdf') || src === 'sugarcalc_pdf') { readPdf(file); return; }
    const r = new FileReader(); r.onload = ev => { setText(ev.target.result); take(parseCsv(ev.target.result)); }; r.readAsText(file);
  };
  // Each row files into the season its date belongs to (srSeasonOf), like a new log entry;
  // the PDF report's rows fall back to the year it was for.
  const target = pv ? (pv.isPDF ? (pv.detectedYear || c.season) : c.season) : c.season;
  const adds = pv ? srImportAdditions(pv, src) : null;
  const bySeason = adds ? srImportBySeason(adds, target) : {};
  const seasons = Object.keys(bySeason).map(Number).sort();
  const dd = pv ? (() => { const all = ls.get('sg_logs2', {}) || {}; let addedCount = 0, skippedCount = 0;
    seasons.forEach(y => { const r = dedupeImport(all[y] || {}, bySeason[y]); addedCount += r.addedCount; skippedCount += r.skippedCount; });
    return { addedCount, skippedCount }; })() : null;
  const doImport = () => {
    let next = ls.get('sg_logs2', {}) || {};
    seasons.forEach(y => {
      const { added: a0 } = dedupeImport(next[y] || {}, bySeason[y]);
      // A row says its unit when the file did (a Unit column, or L / gal in a header); else it is the display unit.
      const added = Object.fromEntries(Object.entries(a0).map(([k, arr]) => [k, (arr || []).map(e => e.u ? e : srTagUnit(k, e, c.units))]));
      next = srMergeImport(next, y, added);
    });
    if (!ls.set('sg_logs2', next)) { setFail(true); return; }
    srDataChanged(); srToast(rt(L,'impDone', { n: dd.addedCount })); onClose();
  };
  return (
    <RsSheet title={rt(L,'impTitle')} onClose={onClose} id="rs-import-sheet">
      <label className="rs-fl" style={{ marginTop:0 }}>{rt(L,'impSource')}</label>
      <RsChips label={rt(L,'impSource')} value={src} onChange={s => { setSrc(s); setErr(''); }} options={SR_IMPORT_SOURCES.map(k => [k, rt(L, 'imp_' + k)])} />
      <p className="rs-meta" style={{ marginTop:10 }}>{rt(L, 'imp_' + src + '_h')}</p>
      <label className="rs-btn2 rs-filebtn" style={{ marginTop:10 }}>
        <RsIcon name="up" size={22} />{rt(L, src === 'sugarcalc_pdf' ? 'impPickPdf' : 'impPickCsv')}
        <input type="file" accept=".csv,.txt,.pdf,application/pdf,text/csv,text/plain" onChange={onFile} id="rs-import-file" />
      </label>
      {src !== 'sugarcalc_pdf' && <>
        <label className="rs-fl" htmlFor="rs-import-text">{rt(L,'impPaste')}</label>
        <textarea id="rs-import-text" className="rs-field rs-mono" rows={5} value={text} placeholder={'date,sap_gallons,syrup_gallons\n2027-03-15,450,4.2'}
          onChange={e => { setText(e.target.value); if (e.target.value.trim()) take(parseCsv(e.target.value)); else { setPv(null); setErr(''); } }} />
      </>}
      {busy && <div className="rs-sk" style={{ height:60, marginTop:12 }} aria-busy="true" />}
      {err && <p className="rs-errline" role="alert">{rt(L, err)}</p>}
      {pv && !err && <div className="rs-card" style={{ marginTop:12 }}>
        <b className="rs-cardt">{rt(L,'impReady', { n: pv.rows.length, y: seasons.length ? seasons.join(', ') : target })}</b>
        <RsKv rows={[pv.totalSap ? [rt(L,'sapCollected'), `${fmt(pv.totalSap, 1)} ${u}`] : null, pv.totalSyrup ? [rt(L,'syrupMadeW'), `${fmt(pv.totalSyrup, 1)} ${u}`] : null,
          pv.totalRO ? [rt(L,'impRo'), `${fmt(pv.totalRO, 1)} ${u}`] : null, pv.totalEvap ? [rt(L,'impEvap'), `${fmt(pv.totalEvap, 1)} ${u}`] : null,
          pv.totalFuel ? [rt(L,'kFuel'), fmt(pv.totalFuel, 1)] : null, pv.totalHours ? [rt(L,'kHours'), `${fmt(pv.totalHours, 1)} h`] : null]} />
        {dd.skippedCount > 0 && <p className="rs-meta">{rt(L,'impSkip', { n: dd.skippedCount })}</p>}
        {pv.badDates > 0 && <p className="rs-errline">{rt(L,'impBadDateRows', { n: pv.badDates })}</p>}
        <p className="rs-note">{rt(L,'impUnitNote', { u })}</p>
      </div>}
      <div className="rs-sheetfoot">{fail && <p className="rs-errline" role="alert">{rt(L,'bNotSavedT')}. {rt(L, srFailKey(SR_WRITE_FAIL))}</p>}
        <div><RsBtn onClick={doImport} disabled={!pv || !!err || !dd || dd.addedCount === 0} id="rs-import-go">{rt(L,'impGo', { n: dd ? dd.addedCount : 0 })}</RsBtn></div></div>
    </RsSheet>
  );
}

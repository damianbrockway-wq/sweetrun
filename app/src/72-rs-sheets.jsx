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
    if (!p) { setMsg({ ok:false, t: rt(L,'passBad') }); return; }
    if (p.expired) { setMsg({ ok:false, t: rt(L,'passExpired', { d: p.x }) }); return; }
    SR_LOCKED = false; _srClear();
    ls.set('sg_license', key.trim());
    setMsg({ ok:true, t: rt(L,'passOk', { d: p.x }) });
    c.setLic({ status:'licensed', until:p.x });
  };
  const saveEmail = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setEmsg({ ok:false, t: rt(L,'emailBad') }); return; }
    try { await pingEvent('trial_email', email); setEmsg({ ok:true, t: rt(L,'emailOk') }); } catch { setEmsg({ ok:false, t: rt(L,'emailFail') }); }
  };
  return (
    <RsSheet title={rt(L,'secPass')} onClose={onClose} id="rs-pass-sheet">
      <p className="rs-body">{lic.status === 'licensed' ? rt(L,'passActiveP', { d: lic.until }) : lic.status === 'expired' ? rt(L,'passEndedP') : rt(L,'passTrialP', { n: lic.daysLeft })}</p>
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
  const p = srWizardPlan(o);
  const can = [p.trees > 0, true, o.hasEvap !== null, true, true][step];
  const finish = () => {
    const data = srWizardData(o);
    ls.set('sg_wizard_data', data); ls.set('sg_onboarded', true);
    srDataChanged(); onComplete(data);
  };
  const Opt = ({ k, val, label, sub }) => <button type="button" className={`rs-opt${o[k] === val ? ' on' : ''}`} aria-pressed={o[k] === val} onClick={() => set(k)(val)}>
    <b>{label}</b>{sub && <span>{sub}</span>}</button>;
  const Y = m => `${fmt(fromGal(m.low, c.units), 2)} to ${fmt(fromGal(m.high, c.units), 2)} ${u}`;
  const steps = [
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
        <RsSeg wrap label={rt(L,'evPan')} value={o.panSize} onChange={set('panSize')} options={Object.keys(SR_WIZ_PANS).map(k => [k, k.replace('x', '×')])} /></>}
      <label className="rs-fl">{rt(L,'evFuelT')}</label>
      <RsSeg wrap label={rt(L,'evFuelT')} value={o.fuelType} onChange={set('fuelType')} options={FUELS.map(f => [f.label, f.unit === 'ccf' ? rt(L,'fuelGas') : fuelLabel(f, L).replace(/ \(.*\)/, '')])} />
    </div>,
    <div key="3">
      <p className="rs-meta" style={{ marginTop:0 }}>{rt(L,'wz3P')}</p>
      <label className="rs-fl" htmlFor="rs-wz-fc">{rt(L,'wzFuelCost')}</label>
      <RsMoney id="rs-wz-fc" value={o.fuelCost} onChange={set('fuelCost')} label={rt(L,'wzFuelCost')} steps={[-50, 50]} />
      <p className="rs-note">{rt(L,'wzFuelCostNote')}</p>
      <label className="rs-fl" htmlFor="rs-wz-sp">{rt(L,'wzPrice')}</label>
      <RsMoney id="rs-wz-sp" value={o.syrupPrice} onChange={set('syrupPrice')} label={rt(L,'wzPrice')} steps={[-5, 5]} unit="/gal" />
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
    <RsSheet title={rt(L, 'wzT' + step)} onClose={onClose} id="rs-wizard">
      <div className="rs-eyebrow plain" style={{ marginTop:-6 }}>{rt(L,'wzStep', { n: step + 1 })}</div>
      <div className="rs-wzbar" aria-hidden="true">{[0,1,2,3,4].map(i => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
      {steps[step]}
      <div className="rs-sheetfoot"><div className="rs-btnrow">
        {step > 0 ? <RsBtn kind="secondary" onClick={() => setStep(s => s - 1)}>{rt(L,'backW')}</RsBtn> : <RsBtn kind="secondary" onClick={onClose}>{rt(L,'notNow')}</RsBtn>}
        {step < 4 ? <RsBtn onClick={() => can && setStep(s => s + 1)} disabled={!can} id="rs-wz-next">{rt(L,'nextW')}</RsBtn>
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
    const r = new FileReader(); r.onload = ev => { setText(ev.target.result); take(srParseSapCsv(ev.target.result)); }; r.readAsText(file);
  };
  const target = pv ? (pv.isPDF ? (pv.detectedYear || c.season) : c.season) : c.season;
  const adds = pv ? srImportAdditions(pv, src) : null;
  const dd = pv ? dedupeImport(((ls.get('sg_logs2', {}) || {})[target]) || {}, adds) : null;
  const doImport = () => {
    const existing = ls.get('sg_logs2', {}) || {};
    const { added } = dedupeImport(existing[target] || {}, adds);
    if (!ls.set('sg_logs2', srMergeImport(existing, target, added))) { setFail(true); return; }
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
          onChange={e => { setText(e.target.value); if (e.target.value.trim()) take(srParseSapCsv(e.target.value)); else { setPv(null); setErr(''); } }} />
      </>}
      {busy && <div className="rs-sk" style={{ height:60, marginTop:12 }} aria-busy="true" />}
      {err && <p className="rs-errline" role="alert">{rt(L, err)}</p>}
      {pv && !err && <div className="rs-card" style={{ marginTop:12 }}>
        <b className="rs-cardt">{rt(L,'impReady', { n: pv.rows.length, y: target })}</b>
        <RsKv rows={[pv.totalSap ? [rt(L,'sapCollected'), `${fmt(pv.totalSap, 1)} ${u}`] : null, pv.totalSyrup ? [rt(L,'syrupMadeW'), `${fmt(pv.totalSyrup, 1)} ${u}`] : null,
          pv.totalRO ? [rt(L,'impRo'), `${fmt(pv.totalRO, 1)} ${u}`] : null, pv.totalEvap ? [rt(L,'impEvap'), `${fmt(pv.totalEvap, 1)} ${u}`] : null]} />
        {dd.skippedCount > 0 && <p className="rs-meta">{rt(L,'impSkip', { n: dd.skippedCount })}</p>}
        <p className="rs-note">{rt(L,'impUnitNote', { u })}</p>
      </div>}
      <div className="rs-sheetfoot">{fail && <p className="rs-errline" role="alert">{rt(L,'bNotSavedT')}. {rt(L,'bLockedP')}</p>}
        <div><RsBtn onClick={doImport} disabled={!pv || !!err || !dd || dd.addedCount === 0} id="rs-import-go">{rt(L,'impGo', { n: dd ? dd.addedCount : 0 })}</RsBtn></div></div>
    </RsSheet>
  );
}

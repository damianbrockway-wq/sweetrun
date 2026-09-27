// ─── Tools rebuilt (Phase 6): tapping guide, tubing, evaporator, finishing,
// break-even. Each replaces its classic screen with the same keys and the same
// arithmetic (22-rs-engine2.jsx). Volumes are typed and shown in your unit and
// converted to gallons at the edge; nothing stored is converted.

// ── Tapping guide (replaces TappingTab: sg_dbh, sg_vacuum, sg_spoutidx,
// sg_treenotes, sg_rotation) ──────────────────────────────────────────────────
const SR_VAC_KEYS = ['gravBuckets', 'lowVac', 'highVac'];
const SR_HEALTH_TAGS = ['goodProd', 'lowOutput', 'sapWatery', 'woundScar', 'skipYear', 'topProd'];
const SR_SIDES = { N:'north', S:'south', E:'east', W:'west' };
function RsTapGuide({ c }) {
  const L = c.lang, u = srU(c.units);
  const v = useSrDataVersion();
  const [dbh, setDbh] = useRsPref('sg_dbh', 14);
  const [vac, setVac] = useRsPref('sg_vacuum', t('en', 'gravBuckets'));
  const [spout, setSpout] = useRsPref('sg_spoutidx', 0);
  const [noteSheet, setNoteSheet] = useState(false), [rotSheet, setRotSheet] = useState(false);
  const [armed, setArmed] = useState(null);
  useEffect(() => { if (armed == null) return; const tm = setTimeout(() => setArmed(null), 3000); return () => clearTimeout(tm); }, [armed]);
  const notes = React.useMemo(() => ls.get('sg_treenotes', []) || [], [v]);
  const rots = React.useMemo(() => ls.get('sg_rotation', []) || [], [v]);
  const est = srTapEstimate(c.trees, parseFloat(dbh) || 0, c.sapBrix, yieldModelSaved());
  const sp = SPOUTS[parseInt(spout) || 0] || SPOUTS[0];
  const del = (key, list, id) => { const k = key + id; if (armed !== k) { setArmed(k); srToast(rt(L,'tapAgainDelete')); return; }
    if (ls.set(key, list.filter(x => x.id !== id))) { setArmed(null); srDataChanged(); } };
  const sizes = [['sizeSmall','doNotTap','0'], ['sizeMarginal','tapMarginal','1'], ['sizeStandard','tapStandard','1'], ['sizeGood','tapGoodProd','2'], ['sizeHigh','tapHighProd','3']];
  return (
    <div className="rs-inner">
      <RsSubHead c={c} back="stage/tap" backLabel={rt(L,'st_tap')} eyebrow={rt(L,'stageOf', { n:2 })} title={rt(L,'sc_tapping')} lede={rt(L,'tgLede')} />
      <RsBanners c={c} />
      <div className="rs-cols">
        <div>
          <div className="rs-card">
            <div className="rs-grid2">
              <div><label className="rs-fl" htmlFor="rs-tg-trees" style={{ marginTop:0 }}>{rt(L,'tgTrees')}</label>
                <RsStepper id="rs-tg-trees" value={c.trees} onChange={x => c.setTrees(x === '' ? 0 : x)} steps={[-10, 10]} unit="" label={rt(L,'tgTrees')} min={0} max={100000} big={false} /></div>
              <div><label className="rs-fl" htmlFor="rs-tg-dbh" style={{ marginTop:0 }}>{rt(L,'tgDbh')}</label>
                <RsStepper id="rs-tg-dbh" value={dbh} onChange={setDbh} steps={[-1, 1]} unit="in" label={rt(L,'dbhLabel')} min={6} max={60} big={false} /></div>
            </div>
            <label className="rs-fl">{rt(L,'tgVac')}</label>
            <div className="rs-opts three" role="group" aria-label={rt(L,'tgVac')}>{SR_VAC_KEYS.map(k => <button key={k} type="button" className={`rs-opt${vac === t('en', k) ? ' on' : ''}`}
              aria-pressed={vac === t('en', k)} onClick={() => setVac(t('en', k))}><b>{rt(L, 'tgv_' + k)}</b><span>{rt(L, 'tgv_' + k + '_s')}</span></button>)}</div>
            <div className="rs-hr" />
            <div className="rs-grid2">
              <div><div className="rs-meta">{rt(L,'tgPerTree')}</div><div className="rs-big tn">{est.tpt}<small>{rt(L, est.tpt === 1 ? 'tapWord1' : 'tapsWord')}</small></div></div>
              <div><div className="rs-meta">{rt(L,'tgTotal')}</div><div className="rs-big tn">{fmt(est.tot, 0)}<small>{rt(L,'tapsWord')}</small></div></div>
              <div><div className="rs-meta">{rt(L,'tgSap')}</div><div className="rs-mid tn">{srVol(est.sapGal, c.units)}<small>{u}</small></div></div>
              <div><div className="rs-meta">{rt(L,'tgSyrup')}</div><div className="rs-mid tn">{srVol(est.syrupGal, c.units, 1)}<small>{u}</small></div></div>
            </div>
            <p className="rs-note">{rt(L,'tgEstNote', { r: fmt(rule86(c.sapBrix), 0), m: srModelName(yieldModelSaved().label, L) })}</p>
          </div>
          <h2 className="rs-sec">{rt(L,'tgSizeT')}</h2>
          <div className="rs-list">{sizes.map(([s, n, k]) => <RsRow key={s} chev={false} title={srPlain(t(L, s), L)} sub={t(L, n)} value={rt(L, k === '1' ? 'nTap1' : 'nTaps', { n:k })} />)}</div>
          <h2 className="rs-sec">{rt(L,'tgSpoutT')}</h2>
          <div className="rs-card">
            <div className="rs-opts three" role="group" aria-label={rt(L,'tgSpoutT')}>{SPOUTS.map((sp_, i) => <button key={i} type="button" className={`rs-opt${(parseInt(spout) || 0) === i ? ' on' : ''}`}
              aria-pressed={(parseInt(spout) || 0) === i} onClick={() => setSpout(i)}><b>{sp_.bit}</b><span>{rt(L, 'spoutS' + i)}</span></button>)}</div>
            <RsKv rows={[[rt(L,'tgBit'), sp.bit], [rt(L,'tgDepth'), srPlain(sp.depth, L).replace(/ in$/, ' ' + srUnitL('in', L))]]} />
            <p className="rs-note">{rt(L, 'spoutN' + (SPOUTS.indexOf(sp)))}</p>
          </div>
        </div>
        <div>
          <h2 className="rs-sec">{rt(L,'tgDrillT')}</h2>
          <ol className="rs-steps rs-card">{[1,2,3,4,5,6].map(i => <li key={i}><b>{srPlain(t(L, 'drillTip' + i), L)}</b></li>)}</ol>
          <h2 className="rs-sec">{rt(L,'tgNotesT')}<span className="rs-meta tn">{notes.length}</span></h2>
          {notes.length === 0 ? <div className="rs-empty"><b>{rt(L,'tgNotesNoneT')}</b><p>{rt(L,'tgNotesNoneP')}</p></div> :
            <div className="rs-list">{notes.slice().reverse().map(n => <div key={n.id} className="rs-row rs-equip">
              <span className="rs-rt"><b>{n.tree || rt(L,'tgNoId')}</b><span>{[n.obs, srDateShort(n.date, L)].filter(Boolean).join(' · ')}</span></span>
              <button type="button" className={`rs-iconbtn${armed === 'sg_treenotes' + n.id ? ' bad' : ''}`} aria-label={rt(L,'deleteNote')} onClick={() => del('sg_treenotes', notes, n.id)}><RsIcon name="trash" size={20} /></button>
            </div>)}</div>}
          <div style={{ marginTop:10 }}><RsBtn kind="secondary" icon="plus" onClick={() => setNoteSheet(true)}>{rt(L,'tgAddNote')}</RsBtn></div>
          <h2 className="rs-sec">{rt(L,'tgRotT')}</h2>
          <p className="rs-meta" style={{ marginTop:-4, marginBottom:10 }}>{rt(L,'tgRotP')}</p>
          {rots.length === 0 ? <div className="rs-empty"><b>{rt(L,'tgRotNoneT')}</b><p>{rt(L,'tgRotNoneP')}</p></div> :
            <div className="rs-list">{rots.slice().reverse().map(e => <div key={e.id} className="rs-row rs-equip">
              <span className="rs-rt"><b>{e.tree || rt(L,'tgNoId')} · {e.year}</b><span>{rt(L,'tgRotLine', { s: t(L, SR_SIDES[e.side] || 'north'), n: t(L, SR_SIDES[SR_ROT_OPP[e.side]] || 'south') })}</span></span>
              <button type="button" className={`rs-iconbtn${armed === 'sg_rotation' + e.id ? ' bad' : ''}`} aria-label={rt(L,'deleteEntry')} onClick={() => del('sg_rotation', rots, e.id)}><RsIcon name="trash" size={20} /></button>
            </div>)}</div>}
          <div style={{ marginTop:10 }}><RsBtn icon="plus" onClick={() => setRotSheet(true)}>{rt(L,'tgAddRot')}</RsBtn></div>
        </div>
      </div>
      {noteSheet && <RsTreeNoteSheet c={c} onClose={() => setNoteSheet(false)} />}
      {rotSheet && <RsRotSheet c={c} onClose={() => setRotSheet(false)} />}
    </div>
  );
}
function RsTreeNoteSheet({ c, onClose }) {
  const L = c.lang;
  const [f, setF] = useState({ tree:'', obs:'', date: srToday() });
  const [fail, setFail] = useState(false);
  const save = () => {
    if (!f.tree && !f.obs) { const el = document.getElementById('rs-tn-tree'); el && el.focus(); return; }
    const all = ls.get('sg_treenotes', []) || [];
    if (!ls.set('sg_treenotes', [...all, { ...f, id: Date.now() }])) { setFail(true); return; }
    srDataChanged(); srToast(rt(L,'noteSaved')); onClose();
  };
  return (
    <RsSheet title={rt(L,'tgAddNote')} onClose={onClose} id="rs-tn-sheet">
      <div className="rs-grid2">
        <div><label className="rs-fl" htmlFor="rs-tn-tree">{rt(L,'tgTreeId')}</label><input id="rs-tn-tree" className="rs-field" value={f.tree} onChange={e => setF(p => ({ ...p, tree:e.target.value }))} placeholder={rt(L,'tgTreeIdPh')} /></div>
        <div><label className="rs-fl" htmlFor="rs-tn-date">{rt(L,'date')}</label><input id="rs-tn-date" className="rs-field" type="date" value={f.date} onChange={e => setF(p => ({ ...p, date:e.target.value }))} /></div>
      </div>
      <label className="rs-fl">{rt(L,'tgTags')}</label>
      <div className="rs-chips wrap">{SR_HEALTH_TAGS.map(k => <button key={k} type="button" className="rs-chip" onClick={() => setF(p => ({ ...p, obs: p.obs ? p.obs + ', ' + t(L, k) : t(L, k) }))}>{t(L, k)}</button>)}</div>
      <label className="rs-fl" htmlFor="rs-tn-obs">{rt(L,'tgObs')}</label>
      <input id="rs-tn-obs" className="rs-field" value={f.obs} onChange={e => setF(p => ({ ...p, obs:e.target.value }))} placeholder={rt(L,'tgObsPh')} />
      <div className="rs-sheetfoot">{fail && <p className="rs-errline" role="alert">{rt(L,'bNotSavedT')}. {rt(L,'bLockedP')}</p>}
        <div><RsBtn onClick={save} id="rs-tn-save">{rt(L,'saveNote')}</RsBtn></div></div>
    </RsSheet>
  );
}
function RsRotSheet({ c, onClose }) {
  const L = c.lang;
  const [f, setF] = useState({ tree:'', side:'N', year: new Date().getFullYear() });
  const [fail, setFail] = useState(false);
  const save = () => {
    if (!f.tree) { const el = document.getElementById('rs-rot-tree'); el && el.focus(); return; }
    const all = ls.get('sg_rotation', []) || [];
    if (!ls.set('sg_rotation', [...all, { ...f, id: Date.now() }])) { setFail(true); return; }
    srDataChanged(); srToast(rt(L,'rotSaved')); onClose();
  };
  return (
    <RsSheet title={rt(L,'tgAddRot')} onClose={onClose} id="rs-rot-sheet">
      <label className="rs-fl" htmlFor="rs-rot-tree">{rt(L,'tgTreeId')}</label>
      <input id="rs-rot-tree" className="rs-field" value={f.tree} onChange={e => setF(p => ({ ...p, tree:e.target.value }))} placeholder={rt(L,'tgTreeIdPh')} />
      <label className="rs-fl">{rt(L,'tgSide')}</label>
      <RsSeg label={rt(L,'tgSide')} value={f.side} onChange={s => setF(p => ({ ...p, side:s }))} options={Object.keys(SR_SIDES).map(k => [k, t(L, SR_SIDES[k])])} />
      <label className="rs-fl" htmlFor="rs-rot-y">{rt(L,'yearWord')}</label>
      <RsStepper id="rs-rot-y" value={f.year} onChange={y => setF(p => ({ ...p, year: y === '' ? p.year : y }))} steps={[-1, 1]} unit="" label={rt(L,'yearWord')} min={2000} max={2100} big={false} />
      <div className="rs-sheetfoot">{fail && <p className="rs-errline" role="alert">{rt(L,'bNotSavedT')}. {rt(L,'bLockedP')}</p>}
        <div><RsBtn onClick={save} id="rs-rot-save">{rt(L,'tgAddRot')}</RsBtn></div></div>
    </RsSheet>
  );
}

// ── Tubing (replaces TubingTab; nothing stored, as before) ───────────────────
function RsTubing({ c }) {
  const L = c.lang;
  const [f, setF] = useState(() => ({ taps: parseInt(c.trees) || '', ml: '', g: '', tv: 25, lt: 12 }));
  const set = k => x => setF(p => ({ ...p, [k]: x }));
  const r = srTubing(f.taps, f.ml, f.g, f.tv, f.lt);
  const presets = [['small', 200, 800, 6], ['mid', 500, 2000, 8], ['large', 1200, 4000, 10]];
  return (
    <div className="rs-inner">
      <RsSubHead c={c} back="stage/lines" backLabel={rt(L,'st_lines')} eyebrow={rt(L,'stageOf', { n:3 })} title={rt(L,'sc_tubing')} lede={rt(L,'tuLede')} />
      <RsBanners c={c} />
      <div className="rs-cols">
        <div>
          <div className="rs-card">
            <div className="rs-grid2">
              <div><label className="rs-fl" htmlFor="rs-tu-t" style={{ marginTop:0 }}>{rt(L,'tuTaps')}</label><RsStepper id="rs-tu-t" value={f.taps} onChange={set('taps')} steps={[-50, 50]} unit="" label={rt(L,'tuTaps')} min={0} max={100000} big={false} base={100} /></div>
              <div><label className="rs-fl" htmlFor="rs-tu-ml" style={{ marginTop:0 }}>{rt(L,'tuMain')}</label><RsStepper id="rs-tu-ml" value={f.ml} onChange={set('ml')} steps={[-100, 100]} unit="ft" label={rt(L,'tuMain')} min={0} max={50000} big={false} base={1000} ph="0" /></div>
              <div><label className="rs-fl" htmlFor="rs-tu-g">{rt(L,'tuGrade')}</label><RsStepper id="rs-tu-g" value={f.g} onChange={set('g')} steps={[-1, 1]} unit="%" label={rt(L,'tuGrade')} min={0} max={60} big={false} base={5} ph="0" /></div>
              <div><label className="rs-fl" htmlFor="rs-tu-tv">{rt(L,'tuVac')}</label><RsStepper id="rs-tu-tv" value={f.tv} onChange={set('tv')} steps={[-1, 1]} unit="in Hg" label={rt(L,'tuVac')} min={5} max={29} big={false} /></div>
            </div>
            <label className="rs-fl" htmlFor="rs-tu-lt">{rt(L,'tuLat')}</label><RsStepper id="rs-tu-lt" value={f.lt} onChange={set('lt')} steps={[-1, 1]} unit={rt(L,'tapsWord')} label={rt(L,'tuLat')} min={1} max={60} big={false} />
            <p className="rs-note">{rt(L,'tuInNote')}</p>
          </div>
          {!r && <div className="rs-empty" style={{ marginTop:12 }}><b>{rt(L,'tuEmptyT')}</b><p>{rt(L,'tuEmptyP')}</p>
            <div className="rs-chips wrap" style={{ marginTop:12 }}>{presets.map(([k, t_, ml, g]) => <button key={k} type="button" className="rs-chip" onClick={() => setF(p => ({ ...p, taps:t_, ml, g }))}>{rt(L, 'tuPre_' + k)}</button>)}</div></div>}
          {r && <>
            <h2 className="rs-sec">{rt(L,'tuVacT')}</h2>
            <div className="rs-card">
              <RsKv rows={[[rt(L,'tuTarget'), `${fmt(r.targetVac, 1)} in Hg`], [rt(L,'tuLoss'), `${fmt(r.vacLoss, 1)} in Hg`], [rt(L,'tuAssist'), `${fmt(r.vacGain, 1)} in Hg`]]} />
              <div className="rs-hr" />
              <div className="rs-split" style={{ alignItems:'flex-end' }}><div><div className="rs-meta">{rt(L,'tuPumpVac')}</div><div className="rs-big tn">{fmt(r.vacPump, 1)}<small>{srUnitL('in Hg', L)}</small></div></div>
                <RsSt kind={r.vacPump > 28 ? 'fault' : r.vacPump > 24 ? 'check' : 'ok'}>{rt(L, r.vacPump > 28 ? 'tuHard' : r.vacPump > 24 ? 'tuHigh' : 'tuEasy')}</RsSt></div>
              {r.pumpHigh && <p className="rs-errline">{rt(L,'tuPumpHighP')}</p>}
              {r.gradeHelps && <p className="rs-okline">{rt(L,'tuGradeP', { ft: fmt(r.elevDrop, 0) })}</p>}
            </div>
          </>}
        </div>
        <div>
          {r && <>
            <h2 className="rs-sec">{rt(L,'tuMainT')}</h2>
            <div className="rs-card rs-bigsize"><span className="rs-sizering tn">{r.ms}</span>
              <span><b className="rs-cardt">{rt(L,'tuMainLine', { s: r.frac, mm: r.mm })}</b><span className="rs-meta">{rt(L,'tuMainFor', { t: fmt(parseInt(f.taps) || 0, 0), ft: fmt(parseFloat(f.ml) || 0, 0) })}</span></span></div>
            <div className="rs-grid2" style={{ marginTop:10 }}>
              <RsNum label={rt(L,'tuLatT')} value={fmt(r.numLat, 0)} sub={rt(L,'tuLatFt', { ft: fmt(r.latFtTot, 0) })} />
              <RsNum label={rt(L,'tuPumpT')} value={fmt(r.cfm, 0)} unit="CFM" sub={rt(L, 'tu_' + r.pump, { c: r.cfm })} />
            </div>
            <h2 className="rs-sec">{rt(L,'tuMatT')}</h2>
            <div className="rs-list">
              <RsRow chev={false} title={rt(L,'tuMatMain', { s: r.ms })} sub={rt(L,'tuWaste')} value={`${fmt(r.mainFt, 0)} ft`} />
              <RsRow chev={false} title={rt(L,'tuMatLat')} sub={rt(L,'tuWaste')} value={`${fmt(r.latFt, 0)} ft`} />
              <RsRow chev={false} title={rt(L,'tuMatDrop')} sub={rt(L,'tuDropNote')} value={`${fmt(r.dropFt, 0)} ft`} />
              <RsRow chev={false} title={rt(L,'tuMatTee')} sub={rt(L,'tuTeeNote')} value={fmt(r.tees, 0)} />
              <RsRow chev={false} title={rt(L,'tuMatCap')} sub={rt(L,'tuCapNote')} value={fmt(r.caps, 0)} />
            </div>
            <p className="rs-note">{rt(L,'tuSource')}</p>
          </>}
        </div>
      </div>
    </div>
  );
}

// ── Evaporator, fuel, true cost and retail (replaces EvapTab) ───────────────
function RsEvaporator({ c }) {
  const L = c.lang, u = srU(c.units);
  const [panIdx, setPanIdx] = useRsPref('sg_panIdx', 0);
  const [panW, setPanW] = useRsPref('sg_panW', '');
  const [panH, setPanH] = useRsPref('sg_panH', '');
  const [customR, setCustomR] = useState('');
  const [sap, setSap] = useState(() => c.units === 'L' ? 1900 : 500);
  const [laborHrs, setLaborHrs] = useRsPref('sg_laborhrs', 0);
  const [laborRate, setLaborRate] = useState(() => getLaborRate());
  const [spoutC, setSpoutC] = useRsPref('sg_spoutcost', 0), [bottleC, setBottleC] = useRsPref('sg_bottlecost', 0);
  const [filterC, setFilterC] = useRsPref('sg_filtercost', 0), [otherC, setOtherC] = useRsPref('sg_othercost', 0);
  const [margin, setMargin] = useRsPref('sg_retailmargin', 40);
  const [cpgU, setCpgU] = useState('');
  const er = srEvapRate(panIdx, panW, panH, customR === '' ? '' : toGal(parseFloat(customR) || 0, c.units));
  useEffect(() => { c.setEvapRate(er.rate); }, [er.rate]);
  const setLR = x => { setLaborRate(x); if (x !== '') ls.set('sg_rate_labor', x); };
  const sapGal = toGal(parseFloat(sap) || 0, c.units);
  const k = srEvapCosts({ fuelType:c.fuelType, sapGal, brix:c.sapBrix, rate:er.rate, fuelCost:c.fuelCost, laborHrs, laborRate,
    supplies:[spoutC, bottleC, filterC, otherC], margin, cpgOverride: cpgU === '' ? '' : srPerGal(parseFloat(cpgU) || 0, c.units) });
  const fl = f => f.unit === 'ccf' ? rt(L,'fuelGas') : f.unit === 'cord' ? rt(L,'fuelWood') : fuelLabel(f, L).replace(/ \(.*\)/, '');
  const fu = L === 'fr' ? (k.fuel.unitFr || k.fuel.unit) : k.fuel.unit;
  const bottleName = { '250ml':'250 mL', '500ml':'500 mL', '1l':'1 L', '1qt':'1 qt', '1gal':'1 gal' };
  return (
    <div className="rs-inner">
      <RsSubHead c={c} back="stage/boil" backLabel={rt(L,'st_boil')} eyebrow={rt(L,'stageOf', { n:5 })} title={rt(L,'sc_evap')} lede={rt(L,'evLede')} />
      <RsBanners c={c} />
      <div className="rs-cols">
        <div>
          <div className="rs-card">
            <label className="rs-fl" style={{ marginTop:0 }}>{rt(L,'evPan')}</label>
            <div className="rs-opts five" role="group" aria-label={rt(L,'evPan')}>{PAN_SIZES.map((p, i) => <button key={i} type="button" className={`rs-opt${(parseInt(panIdx) || 0) === i ? ' on' : ''}`}
              aria-pressed={(parseInt(panIdx) || 0) === i} onClick={() => { setPanIdx(i); setCustomR(''); }}>
              <b>{i === CUSTOM_PAN_IDX ? rt(L,'evCustom') : p.label.replace(/ ft.*$/, '')}</b><span className="tn">{i === CUSTOM_PAN_IDX ? rt(L,'evYourSize') : `${srVol(p.rate, c.units)} ${u}/h`}</span></button>)}</div>
            {er.isCustomPan && <div className="rs-grid2">
              <div><label className="rs-fl" htmlFor="rs-ev-w">{rt(L,'evWidth')}</label><RsStepper id="rs-ev-w" value={panW} onChange={setPanW} steps={[-0.5, 0.5]} dp={1} unit="ft" label={rt(L,'evWidth')} min={0} max={20} big={false} base={2} /></div>
              <div><label className="rs-fl" htmlFor="rs-ev-h">{rt(L,'evLength')}</label><RsStepper id="rs-ev-h" value={panH} onChange={setPanH} steps={[-0.5, 0.5]} dp={1} unit="ft" label={rt(L,'evLength')} min={0} max={30} big={false} base={6} /></div>
            </div>}
            <label className="rs-fl" htmlFor="rs-ev-r">{rt(L,'evOwnRate')}</label>
            <RsStepper id="rs-ev-r" value={customR} onChange={setCustomR} steps={[-5, 5]} unit={u + '/h'} label={rt(L,'evOwnRate')} min={0} max={2000} big={false} base={Math.round(fromGal(er.isCustomPan ? er.customCalcR : er.panRate, c.units))} ph={String(Math.round(fromGal(er.isCustomPan ? er.customCalcR : er.panRate, c.units)) || 0)} />
            <p className="rs-note">{rt(L,'evOwnRateNote')}</p>
            <div className="rs-hr" />
            <div className="rs-grid2">
              <div><div className="rs-meta">{rt(L,'evRate')}</div><div className="rs-big tn">{srVol(er.rate, c.units)}<small>{u}/h</small></div></div>
              <div><div className="rs-meta">{rt(L,'evEff')}</div><div className="rs-mid tn">{er.eff != null ? fmt(fromGal(er.eff, c.units), 2) : '0'}<small>{u}/ft²/h</small></div></div>
            </div>
          </div>
          <h2 className="rs-sec">{rt(L,'evBoilT')}</h2>
          <div className="rs-card">
            <div className="rs-grid2">
              <div><label className="rs-fl" htmlFor="rs-ev-sap" style={{ marginTop:0 }}>{rt(L,'sapWordC', { u })}</label><RsStepper id="rs-ev-sap" value={sap} onChange={setSap} steps={[-100, 100]} unit={u} label={rt(L,'sapWordC', { u })} min={0} max={1e6} big={false} /></div>
              <div><label className="rs-fl" htmlFor="rs-ev-bx" style={{ marginTop:0 }}>{rt(L,'sapBrixPct')}</label><RsStepper id="rs-ev-bx" value={c.sapBrix} onChange={x => c.setSapBrix(x === '' ? 0 : x)} steps={[-0.1, 0.1]} dp={1} unit="%" label={rt(L,'sapBrixPct')} min={0.5} max={10} big={false} /></div>
            </div>
            <div className="rs-hr" />
            <div className="rs-grid2">
              <div><div className="rs-meta">{rt(L,'evBoilTime')}</div><div className="rs-mid tn">{srDur(k.boilH, L) || '0 min'}</div></div>
              <div><div className="rs-meta">{rt(L,'evSyrup')}</div><div className="rs-mid tn">{srVol(k.syrupGal, c.units, 1)}<small>{u}</small></div></div>
            </div>
          </div>
          <h2 className="rs-sec">{rt(L,'evFuelT')}</h2>
          <div className="rs-card">
            <RsSeg wrap label={rt(L,'evFuelT')} value={c.fuelType} onChange={c.setFuelType} options={FUELS.map(f => [f.label, fl(f)])} />
            <label className="rs-fl" htmlFor="rs-ev-fc">{rt(L,'evFuelCost', { u: fu })}</label>
            <RsMoney id="rs-ev-fc" value={c.fuelCost} onChange={x => c.setFuelCost(x === '' ? 0 : x)} label={rt(L,'evFuelCost', { u: fu })} />
            <div className="rs-hr" />
            <div className="rs-grid2">
              <div><div className="rs-meta">{rt(L,'evFuelNeed')}</div><div className="rs-mid tn">{fmt(k.uNeeded, 2)}<small>{fu}</small></div></div>
              <div><div className="rs-meta">{rt(L,'evFuelSpend')}</div><div className="rs-mid tn">{srMoney(k.cost, 2)}</div></div>
            </div>
            <p className="rs-note">{rt(L,'evForSap', { v: fmt(parseFloat(sap) || 0, 0), u })}</p>
          </div>
        </div>
        <div>
          <h2 className="rs-sec" style={{ marginTop:0 }}>{rt(L,'evTrueT')}</h2>
          <div className="rs-card">
            <div className="rs-grid2">
              <div><label className="rs-fl" htmlFor="rs-ev-lh" style={{ marginTop:0 }}>{rt(L,'evLaborH')}</label><RsStepper id="rs-ev-lh" value={laborHrs} onChange={setLaborHrs} steps={[-1, 1]} dp={1} unit="h" label={rt(L,'evLaborH')} min={0} max={10000} big={false} /></div>
              <div><label className="rs-fl" htmlFor="rs-ev-lr" style={{ marginTop:0 }}>{rt(L,'evLaborR')}</label><RsMoney id="rs-ev-lr" value={laborRate} onChange={setLR} label={rt(L,'evLaborR')} steps={[-1, 1]} unit="/h" /></div>
              <div><label className="rs-fl" htmlFor="rs-ev-s1">{rt(L,'evSpouts')}</label><RsMoney steps={[-10, 10]} id="rs-ev-s1" value={spoutC} onChange={setSpoutC} label={rt(L,'evSpouts')} /></div>
              <div><label className="rs-fl" htmlFor="rs-ev-s2">{rt(L,'evBottles')}</label><RsMoney steps={[-10, 10]} id="rs-ev-s2" value={bottleC} onChange={setBottleC} label={rt(L,'evBottles')} /></div>
              <div><label className="rs-fl" htmlFor="rs-ev-s3">{rt(L,'evFilters')}</label><RsMoney steps={[-10, 10]} id="rs-ev-s3" value={filterC} onChange={setFilterC} label={rt(L,'evFilters')} /></div>
              <div><label className="rs-fl" htmlFor="rs-ev-s4">{rt(L,'evOther')}</label><RsMoney steps={[-10, 10]} id="rs-ev-s4" value={otherC} onChange={setOtherC} label={rt(L,'evOther')} /></div>
            </div>
            <div className="rs-hr" />
            <RsKv rows={[[rt(L,'evFuelW'), srMoney(k.cost)], [rt(L,'evLaborW'), srMoney(k.laborTotal)], [rt(L,'evSuppliesW'), srMoney(k.suppliesTotal)], [rt(L,'totalW'), srMoney(k.totalCost)]]} />
            <div className="rs-split" style={{ marginTop:12, alignItems:'flex-end' }}><div className="rs-meta">{rt(L,'evCostPer', { u })}</div>
              <div className="rs-big tn">{srMoney(srPerU(k.autoCpg, c.units), 2)}</div></div>
            <p className="rs-note">{rt(L,'evCostNote', { s: srVol(k.syrupGal, c.units, 1), p: fmt(parseFloat(sap) || 0, 0), u })}</p>
          </div>
          <h2 className="rs-sec">{rt(L,'evRetailT')}</h2>
          <div className="rs-card">
            <p className="rs-meta" style={{ marginTop:0 }}>{rt(L,'evRetailP')}</p>
            <div className="rs-grid2">
              <div><label className="rs-fl" htmlFor="rs-ev-m">{rt(L,'evMargin')}</label><RsStepper id="rs-ev-m" value={margin} onChange={setMargin} steps={[-5, 5]} unit="%" label={rt(L,'evMargin')} min={0} max={95} big={false} /></div>
              <div><label className="rs-fl" htmlFor="rs-ev-cpg">{rt(L,'evYourCost', { u })}</label><RsMoney id="rs-ev-cpg" value={cpgU} onChange={setCpgU} label={rt(L,'evYourCost', { u })} steps={[-1, 1]} dp={2} /></div>
            </div>
            <p className="rs-note">{rt(L,'evYourCostNote')}</p>
            <table className="rs-table tn" style={{ marginTop:10 }}><thead><tr><th>{rt(L,'evBottle')}</th><th>{rt(L,'evCostW')}</th><th>{rt(L,'evPriceW')}</th><th>{rt(L,'evProfitW')}</th></tr></thead>
              <tbody>{k.bottles.map(b => <tr key={b.id}><td>{bottleName[b.id]}</td><td>{srMoney(b.cost, 2)}</td><td><b>{srMoney(b.retail, 2)}</b></td><td>{srMoney(b.profit, 2)}</td></tr>)}</tbody></table>
          </div>
          <h2 className="rs-sec">{rt(L,'evBenchT')}</h2>
          <div className="rs-list">{SR_USDA_BENCH.map(b => <RsRow key={b.g} chev={false} title={t(L, { golden:'gradeGolden', amber:'gradeAmber', dark:'gradeDark', vdark:'gradeVeryDark' }[b.g])}
            value={rt(L,'perUnit', { p: srMoney(srPerU(b.price, c.units), c.units === 'L' ? 2 : 0), u })} />)}</div>
          <p className="rs-note">{rt(L,'evBenchNote')}</p>
          <div className="rs-list" style={{ marginTop:12 }}><RsRow icon="jug" family="boil" title={rt(L,'batchesTitle')} sub={rt(L,'batchesSub')} href={rsHref('shack/batches')} /></div>
        </div>
      </div>
    </div>
  );
}

// ── Finishing: grades, canning, candy (replaces the rest of FinishTab) ───────
function RsFinishing({ c }) {
  const L = c.lang;
  const bp = c.waterBP, fin = finTemp(bp), toC = f => (f - 32) * 5 / 9;
  const grades = [['gradeGolden', '>75%', '66.0 to 66.5', 1, 'fgNote1'], ['gradeAmber', '25 to 75%', '66.5 to 67.5', 2, 'fgNote2'],
    ['gradeDark', '<25%', '67.0 to 68.9', 3, 'fgNote3'], ['gradeVeryDark', '<10%', '67.0 to 68.9', 4, 'fgNote4']];
  const R = s => s.replace(/^(.+?) to (.+)$/, (_, a, b) => rt(L, 'rangeTo', { a, b }));   // "66.0 to 66.5" in the reader's language
  return (
    <div className="rs-inner">
      <RsSubHead c={c} back="stage/boil" backLabel={rt(L,'st_boil')} eyebrow={rt(L,'stageOf', { n:5 })} title={rt(L,'sc_finish')} lede={rt(L,'fiLede')} />
      <RsBanners c={c} />
      <div className="rs-cols">
        <div>
          <a className="rs-card rs-bushcard" href={rsHref('stage/boil/draw-off')}>
            <RsTile icon="therm" family="boil" size={48} />
            <span className="rs-rt"><b>{rt(L,'fiDrawAt', { f: fmt(fin, 1), c: fmt(toC(fin), 1) })}</b><span>{rt(L,'fiDrawSub', { bp: fmt(bp, 1) })}</span></span>
            <span className="rs-chev"><RsIcon name="chev" size={22} /></span>
          </a>
          <h2 className="rs-sec">{rt(L,'fiGradesT')}</h2>
          <div className="rs-list">{grades.map(([g, light, brix, n, note]) => <div key={g} className="rs-row rs-grade">
            <span className="rs-swatch big" style={{ background:`var(--rs-grade-${n})` }} aria-hidden="true" />
            <span className="rs-rt"><b>{t(L, g)}</b><span>{rt(L,'fiLight', { l: R(light) })} · {rt(L, note)}</span></span>
            <span className="rs-rv tn">{R(brix)}</span></div>)}</div>
          <RsKv rows={[[rt(L,'fiLegal'), rt(L,'fiLegalV')], [rt(L,'fiWeight'), rt(L,'fiWeightV')]]} />
          <h2 className="rs-sec">{rt(L,'fiCanT')}</h2>
          <div className="rs-card">
            <div className="rs-meta">{rt(L,'fiCanBetween')}</div>
            <div className="rs-huge tn">{rt(L,'rangeTo', { a: 180, b: 190 })}<small>°F</small></div>
            <p className="rs-meta tn">{rt(L,'fiCanC')}</p>
            <p className="rs-body" style={{ marginTop:12 }}>{rt(L,'fiWhyRange')}</p>
          </div>
          <div style={{ marginTop:10 }} className="rs-stack">
            {[1,2,3,4,5].map(i => <RsDisclose key={i} title={rt(L, 'fiCan' + i + 'T')}><p className="rs-body">{rt(L, 'fiCan' + i + 'P')}</p></RsDisclose>)}
          </div>
          <p className="rs-note">{rt(L,'fiYield')}</p>
        </div>
        <div>
          <h2 className="rs-sec">{rt(L,'fiCandyT')}</h2>
          <p className="rs-meta" style={{ marginTop:-4, marginBottom:10 }}>{rt(L,'fiCandyP', { bp: fmt(bp, 1) })}</p>
          <div className="rs-list">{SR_CANDY.map(k => <div key={k.id} className="rs-row rs-candy">
            <span className="rs-rt"><b>{rt(L, 'candy_' + k.id)}</b><span>{rt(L,'fiBpPlus', { o: k.off })} {rt(L, 'candy_' + k.id + '_d')}</span></span>
            <span className="rs-rv"><b className="tn">{fmt(bp + k.off, 1)}°F</b><span className="tn">{fmt(toC(bp + k.off), 1)}°C</span></span></div>)}</div>
          <h2 className="rs-sec">{rt(L,'fiMoldT')}</h2>
          <ol className="rs-steps rs-card">{[1,2,3,4,5,6].map(i => <li key={i}><b>{rt(L, 'mold' + i + 'T', { t: fmt(bp + 34, 1) })}</b>{' '}{rt(L, 'mold' + i + 'P')}</li>)}</ol>
          <div className="rs-list" style={{ marginTop:12 }}>
            <RsRow icon="filter" family="boil" title={rt(L,'deCalc')} sub={rt(L,'deCalcS')} href={rsHref('stage/boil/de')} />
            <RsRow icon="therm" family="boil" title={rt(L,'hydroFix')} sub={rt(L,'fiHydroSub')} href={rsHref('stage/boil/draw-off')} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Break-even (replaces BreakevenCalculator: sg_bev_*, sg_price_syrup,
// sg_rate_labor) ─────────────────────────────────────────────────────────────
function RsBreakeven({ c }) {
  const L = c.lang, u = srU(c.units);
  const wiz = ls.get('sg_wizard_data', {}) || {};
  const [taps, setTaps] = useRsPref('sg_bev_taps', parseInt(c.trees) || 0);
  const [fuel, setFuel] = useRsPref('sg_bev_fuel', wiz.fuelCost || 300);
  const [price, setPriceS] = useState(() => getSyrupPrice());
  const [sup, setSup] = useRsPref('sg_bev_supply', 0);
  const [lh, setLh] = useRsPref('sg_bev_lhrs', 0);
  const [lr, setLrS] = useState(() => getLaborRate());
  const [hobby, setHobbyS] = useState(() => ls.get('sg_bev_hobby', true));
  const setPrice = x => { setPriceS(x); if (x !== '') ls.set('sg_price_syrup', x); };
  const setLr = x => { setLrS(x); if (x !== '') ls.set('sg_rate_labor', x); };
  const setHobby = x => { setHobbyS(x); ls.set('sg_bev_hobby', x); };
  const b = srBreakeven({ taps, fuelCost:fuel, price, supplies:sup, laborHrs:lh, laborRate:lr, hobby });
  const pU = srPerU(parseFloat(price) || 0, c.units);
  return (
    <div className="rs-inner">
      <RsShackHead c={c} title={rt(L,'bevTitle')} eyebrow={rt(L,'calcWord')} lede={rt(L,'bevLede')} />
      <RsBanners c={c} />
      <div className="rs-cols">
        <div className="rs-card">
          <div className="rs-grid2">
            <div><label className="rs-fl" htmlFor="rs-bv-t" style={{ marginTop:0 }}>{rt(L,'tuTaps')}</label><RsStepper id="rs-bv-t" value={taps} onChange={setTaps} steps={[-10, 10]} unit="" label={rt(L,'tuTaps')} min={0} max={100000} big={false} /></div>
            <div><label className="rs-fl" htmlFor="rs-bv-f" style={{ marginTop:0 }}>{rt(L,'bevFuel')}</label><RsMoney id="rs-bv-f" value={fuel} onChange={setFuel} label={rt(L,'bevFuel')} steps={[-50, 50]} /></div>
            <div><label className="rs-fl" htmlFor="rs-bv-p">{rt(L,'bevPrice', { u })}</label><RsMoney id="rs-bv-p" value={c.units === 'L' ? +pU.toFixed(2) : price} onChange={x => setPrice(x === '' ? '' : srPerGal(x, c.units))} label={rt(L,'bevPrice', { u })} steps={[-1, 1]} dp={c.units === 'L' ? 2 : 0} /></div>
            <div><label className="rs-fl" htmlFor="rs-bv-s">{rt(L,'bevSupplies')}</label><RsMoney id="rs-bv-s" value={sup} onChange={setSup} label={rt(L,'bevSupplies')} steps={[-25, 25]} /></div>
          </div>
          <label className="rs-fl">{rt(L,'bevLabor')}</label>
          <RsSeg label={rt(L,'bevLabor')} value={!!hobby} onChange={setHobby} options={[[true, rt(L,'bevHobby')], [false, rt(L,'bevPaid')]]} />
          {!hobby && <div className="rs-grid2">
            <div><label className="rs-fl" htmlFor="rs-bv-lh">{rt(L,'bevHours')}</label><RsStepper id="rs-bv-lh" value={lh} onChange={setLh} steps={[-5, 5]} unit="h" label={rt(L,'bevHours')} min={0} max={10000} big={false} /></div>
            <div><label className="rs-fl" htmlFor="rs-bv-lr">{rt(L,'evLaborR')}</label><RsMoney id="rs-bv-lr" value={lr} onChange={setLr} label={rt(L,'evLaborR')} steps={[-1, 1]} unit="/h" /></div>
          </div>}
        </div>
        <div>
          {b.totalCost === 0 ? <div className="rs-empty"><b>{rt(L,'bevEmptyT')}</b><p>{rt(L,'bevEmptyP')}</p></div> : <>
            <div className="rs-card">
              <div className="rs-meta">{rt(L,'bevPoint')}</div>
              <div className="rs-huge tn">{fmt(fromGal(b.bevPerTap, c.units), c.units === 'L' ? 2 : 2)}<small>{rt(L,'uPerTap', { u })}</small></div>
              <RsKv rows={[[rt(L,'bevTotalSyrup'), `${srVol(b.bevGal, c.units, 1)} ${u}`], [rt(L,'bevSeasonCost'), srMoney(b.totalCost)], b.labor > 0 ? [rt(L,'bevInclLabor'), srMoney(b.labor)] : null]} />
            </div>
            <h2 className="rs-sec">{rt(L,'bevScenT')}</h2>
            <div className="rs-card rs-stack">
              {b.scenarios.map(s => <RsBarRow key={s.id} label={rt(L, 'bev_' + s.id)} tone={s.above ? '' : 'bad'} pct={s.barPct} marker={s.bevPct}
                value={s.profit >= 0 ? '+' + srMoney(s.profit) : srMoney(s.profit)}
                sub={rt(L,'bevScenSub', { y: fmt(fromGal(s.yld, c.units), 2), t: srVol(s.syrupGal, c.units, 1), u, w: rt(L, s.above ? 'bevAbove' : 'bevBelow') })} />)}
              <p className="rs-note">{rt(L,'bevMarkerNote')}</p>
            </div>
            {b.tooHigh && <div className="rs-err" style={{ marginTop:12 }}><b>{rt(L,'bevHighT')}</b><p>{rt(L,'bevHighP', { v: fmt(fromGal(b.bevPerTap, c.units), 2), u })}</p></div>}
          </>}
        </div>
      </div>
    </div>
  );
}

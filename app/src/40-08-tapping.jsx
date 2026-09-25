// ─── TAPPING TAB ──────────────────────────────────────────────────────────────
function TappingTab({ sapBrix, trees, setTrees, units, lang='en' }) {
  const [dbh,      setDbh]      = useState(() => ls.get('sg_dbh', 14));
  const [vacuum,   setVacuum]   = useState(() => ls.get('sg_vacuum', 'Gravity / Buckets'));
  const [spoutIdx, setSpoutIdx] = useState(() => ls.get('sg_spoutidx', 0));
  const [treeNotes, setTreeNotes] = useState(() => ls.get('sg_treenotes', []));
  const [tnForm, setTnForm] = useState({ tree:'', obs:'', date: srToday() });
  const [showTN, setShowTN] = useState(false);
  const [rotEntries, setRotEntries] = useState(() => ls.get('sg_rotation', []));
  const [rotForm, setRotForm] = useState({ tree:'', side:'N', year:new Date().getFullYear() });
  const [showRot, setShowRot] = useState(false);
  useEffect(() => { ls.set('sg_dbh',      dbh);      }, [dbh]);
  useEffect(() => { ls.set('sg_vacuum',   vacuum);   }, [vacuum]);
  useEffect(() => { ls.set('sg_spoutidx', spoutIdx); }, [spoutIdx]);
  useEffect(() => { ls.set('sg_treenotes', treeNotes); }, [treeNotes]);
  useEffect(() => { ls.set('sg_rotation', rotEntries); }, [rotEntries]);
  const addRotEntry = () => {
    if (!rotForm.tree) return;
    setRotEntries(p => [...p, { ...rotForm, id: Date.now() }]);
    setRotForm({ tree:'', side:'N', year:new Date().getFullYear() });
  };
  const addNote = () => {
    if (!tnForm.tree && !tnForm.obs) return;
    setTreeNotes(p => [...p, { ...tnForm, id: Date.now() }]);
    setTnForm({ tree:'', obs:'', date: srToday() });
    setShowTN(false);
  };
  const HEALTH_TAGS = (l) => [t(l,'goodProd'),t(l,'lowOutput'),t(l,'sapWatery'),t(l,'woundScar'),t(l,'skipYear'),t(l,'topProd')];
  const u    = units === 'L' ? 'L' : 'gal';
  const conv = v => units === 'L' ? (v*3.78541).toFixed(1) : v.toFixed(1);
  const tpt  = tapsPer(dbh);
  const tot  = tpt * trees;
  // was a flat 10 gal of sap per tap, which ignored the tap system completely
  const tapModel = yieldModelSaved();
  const sap  = Math.round(tot * yieldMidOf(tapModel) * (RULE_DIVISOR / (parseFloat(sapBrix) || 2)));
  const sy   = syrupY(sap, sapBrix);
  const sp   = SPOUTS[spoutIdx];
  const sizeGuide = (l) => [
    { s:t(l,'sizeSmall'),    taps:t(l,'doNotTap'),  n:t(l,'tapMarginal').replace('Marginal', lang==='fr'?'Trop petit':'Too small') },
    { s:t(l,'sizeMarginal'), taps:`1 ${t(l,'tapSingular')}`, n:t(l,'tapMarginal') },
    { s:t(l,'sizeStandard'), taps:`1 ${t(l,'tapSingular')}`, n:t(l,'tapStandard') },
    { s:t(l,'sizeGood'),     taps:`2 ${t(l,'tapPlural')}`,   n:t(l,'tapGoodProd') },
    { s:t(l,'sizeHigh'),     taps:`3 ${t(l,'tapPlural')}`,   n:t(l,'tapHighProd') },
  ];
  const drillTips = (l) => ['drillTip1','drillTip2','drillTip3','drillTip4','drillTip5','drillTip6'].map(k=>t(l,k));

  return (
    <div>
      <div className="card">
        <div className="card-title"><CardIcon bg="#0d2b15" icon="tree" />{t(lang,'tapCalcTitle')}</div>
        <div className="two-col" style={{ marginBottom:10 }}>
          <div><div className="field-label">{t(lang,'numTrees')}</div><NumInput label={t(lang,'numTrees')} value={trees} onChange={setTrees} min={1} max={10000} step={1} /></div>
          <div>
            <div className="field-label">{t(lang,'avgTrunkDiam')}</div>
            <NumInput label={t(lang,'avgTrunkDiam')} value={dbh} onChange={setDbh} min={6} max={60} step={1} />
            <div style={{ fontSize:13, color:'#7f92a6', marginTop:3 }}>{t(lang,'dbhHint')}</div>
          </div>
        </div>
        <div className="field-label">{t(lang,'vacSystemQ')}</div>
        <select aria-label={t(lang,'vacSystemQ')} value={vacuum} onChange={e=>setVacuum(e.target.value)} style={{ marginBottom:12 }}>
          {[{k:'gravBuckets'},{k:'lowVac'},{k:'highVac'}].map(v=><option key={v.k} value={t('en',v.k)}>{t(lang,v.k)}</option>)}
        </select>
        <div className="result-box green" style={{ marginBottom:10 }}>
          <div className="two-col">
            <div><div className="result-label" style={{ color:'#3fb950' }}>{t(lang,'perTree')}</div><div className="result-value" style={{ color:'#3fb950', fontSize:36 }}>{tpt}</div><div style={{ color:'#3fb950', fontSize:13 }}>{tpt===1?`1 ${t(lang,'tapSingular')}`:`${tpt} ${t(lang,'tapPlural')}`}</div></div>
            <div><div className="result-label" style={{ color:'#3fb950' }}>{t(lang,'totalTaps')}</div><div className="result-value" style={{ color:'#3fb950', fontSize:36 }}>{tot}</div><div style={{ color:'#3fb950', fontSize:13 }}>{trees} {t(lang,'treesUnit')}</div></div>
          </div>
        </div>
        <div className="result-box orange">
          <div className="two-col">
            <div><div className="result-label" style={{ color:'#e0a44a' }}>{t(lang,'estSapSeason')}</div><div className="result-value" style={{ color:'#e0a44a' }}>{conv(sap)} {u}</div><div style={{ color:'#7f92a6', fontSize:13 }}>{t(lang,'perTapUnit').replace('{u}',u).replace('{n}', tot>0 ? fmt(conv(sap)/tot,1) : '0')}</div></div>
            <div><div className="result-label" style={{ color:'#e0a44a' }}>{t(lang,'estSyrupYield')}</div><div className="result-value" style={{ color:'#e0a44a' }}>{conv(sy)} {u}</div><div style={{ color:'#7f92a6', fontSize:13 }}>{t(lang,'atRatioLbl').replace('{n}',fmt(rule86(sapBrix),0))}</div></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom:10 }}><CardIcon bg="#1c2128" icon="ruler" />{t(lang,'minTreeGuide')}</div>
        {sizeGuide(lang).map(r=>(
          <div key={r.s} className="info-row">
            <div><span style={{ fontWeight:600 }}>{r.s}</span> <span style={{ color:'#7f92a6', fontSize:13 }}>• {r.n}</span></div>
            <span style={{ color:'#2dd4a7', fontWeight:600 }}>{r.taps}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title"><CardIcon bg="#0d1a2b" icon="circle" />{t(lang,'spoutBit')}</div>
        <div className="field-label">{t(lang,'spoutType')}</div>
        <select aria-label={t(lang,'spoutType')} value={spoutIdx} onChange={e=>setSpoutIdx(+e.target.value)} style={{ marginBottom:12 }}>
          {SPOUTS.map((s,i)=><option key={i} value={i}>{s.label}</option>)}
        </select>
        <div className="result-box blue">
          <div className="two-col" style={{ marginBottom:8 }}>
            <div><div className="result-label" style={{ color:'#58a6ff' }}>{t(lang,'drillBit')}</div><div className="result-value" style={{ color:'#58a6ff' }}>{sp.bit}</div></div>
            <div><div className="result-label" style={{ color:'#58a6ff' }}>{t(lang,'tapDepth')}</div><div className="result-value" style={{ color:'#58a6ff', fontSize:22 }}>{sp.depth}</div></div>
          </div>
          <div style={{ background:'#081622', borderRadius:8, padding:'8px 12px', fontSize:14, color:'#7f92a6', display:'flex', alignItems:'center', gap:8 }}>
            <I.info size={14} color="#58a6ff" /> {sp.note}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom:12 }}><CardIcon bg="#0d2b15" icon="tree" />{t(lang,'drillingBP')}</div>
        {drillTips(lang).map((tip,i)=><TipItem key={i}>{tip}</TipItem>)}
      </div>

      <div className="card">
        <div className="collapsible-header" onClick={()=>setShowTN(s=>!s)}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <CardIcon bg="#0d2b15" icon="clipboard" />
            <div>
              <div style={{ fontWeight:600 }}>{t(lang,'treeNotes')}</div>
              <div style={{ fontSize:12, color:'#7f92a6' }}>{treeNotes.length} {treeNotes.length!==1?t(lang,'notesRecorded'):t(lang,'noteRecorded')}</div>
            </div>
          </div>
          {showTN ? <I.chevUp size={16} color="#7f92a6" /> : <I.chevDown size={16} color="#7f92a6" />}
        </div>
        {showTN && (
          <div style={{ marginTop:12 }}>
            <div style={{ background:'#0f1720', borderRadius:10, padding:14, marginBottom:12 }}>
              <div className="two-col" style={{ marginBottom:8 }}>
                <div><div className="field-label">{t(lang,'treeIdName')}</div><input aria-label={t(lang,'treeIdName')} type="text" value={tnForm.tree} onChange={e=>setTnForm(p=>({...p,tree:e.target.value}))} placeholder={t(lang,'treeIdPh')} /></div>
                <div><div className="field-label">Date</div><input aria-label="Date" type="text" value={tnForm.date} onChange={e=>setTnForm(p=>({...p,date:e.target.value}))} /></div>
              </div>
              <div style={{ marginBottom:8 }}>
                <div className="field-label">{t(lang,'obsTag')}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                  {HEALTH_TAGS(lang).map(tag=>(
                    <button key={t} onClick={()=>setTnForm(p=>({...p,obs:p.obs?p.obs+', '+tag:tag}))}
                      style={{ background:'#131e2c', border:'1px solid #1e2d3d', borderRadius:8, padding:'4px 10px', fontSize:12, color:'#7f92a6', cursor:'pointer' }}>
                      {tag}
                    </button>
                  ))}
                </div>
                <input aria-label={t(lang,'obsTag')} type="text" value={tnForm.obs} onChange={e=>setTnForm(p=>({...p,obs:e.target.value}))} placeholder={t(lang,'customNote')} />
              </div>
              <div className="two-col">
                <button className="btn-secondary" onClick={()=>setShowTN(false)}>{t(lang,'cancel')}</button>
                <button className="btn-primary" onClick={addNote}>{t(lang,'saveNote')}</button>
              </div>
            </div>
            <button className="btn-secondary" style={{ marginBottom:12 }} onClick={()=>setShowTN(true)}>
              <I.edit size={16} color="#7f92a6" /> {t(lang,'addNote')}
            </button>
            {treeNotes.length===0 && <div style={{ textAlign:'center', color:'#7f92a6', fontSize:13, padding:'6px 0' }}>{t(lang,'noTreeNotesYet')}</div>}
            {treeNotes.slice().reverse().map((n,i)=>(
              <div key={n.id} style={{ background:'#0f1720', borderRadius:10, padding:'11px 14px', marginBottom:7, border:'1px solid #1e2d3d', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#3fb950' }}>{n.tree||t(lang,'noId')} <span style={{ color:'#7f92a6', fontSize:12, fontWeight:400 }}>{n.date}</span></div>
                  <div style={{ color:'#b0bec8', fontSize:13, marginTop:3 }}>{n.obs}</div>
                </div>
                <button className="delete-btn" aria-label="Delete this tree note" title="Delete note" onClick={()=>setTreeNotes(p=>p.filter(t=>t.id!==n.id))}><I.x size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="collapsible-header" onClick={()=>setShowRot(s=>!s)}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <CardIcon bg="#1a0d2b" icon="refresh" />
            <div>
              <div style={{ fontWeight:600 }}>{t(lang,'tapRotTitle')}</div>
              <div style={{ fontSize:12, color:'#7f92a6' }}>{t(lang,'tapRotDesc')}</div>
            </div>
          </div>
          {showRot ? <I.chevUp size={16} color="#7f92a6" /> : <I.chevDown size={16} color="#7f92a6" />}
        </div>
        {showRot && (
          <div style={{ marginTop:14 }}>
            <div style={{ background:'#0f1720', borderRadius:10, padding:14, marginBottom:12 }}>
              <div className="two-col" style={{ marginBottom:8 }}>
                <div>
                  <div className="field-label">{t(lang,'treeIdRot')}</div>
                  <input aria-label={t(lang,'treeIdRot')} type="text" value={rotForm.tree} onChange={e=>setRotForm(p=>({...p,tree:e.target.value}))} placeholder={t(lang,'treeIdPh')} />
                </div>
                <div>
                  <div className="field-label">{t(lang,'year')}</div>
                  <input aria-label={t(lang,'year')} type="number" value={rotForm.year} onChange={e=>setRotForm(p=>({...p,year:e.target.value}))} min="2000" max="2100" />
                </div>
              </div>
              <div style={{ marginBottom:8 }}>
                <div className="field-label">{t(lang,'side')}</div>
                <div style={{ display:'flex', gap:8 }}>
                  {['N','S','E','W'].map(s=>(
                    <button key={s} onClick={()=>setRotForm(p=>({...p,side:s}))}
                      style={{ flex:1, background:rotForm.side===s?'#2dd4a7':'#131e2c', border:`1px solid ${rotForm.side===s?'#a855f7':'#1e2d3d'}`, borderRadius:8, padding:'8px 4px', fontSize:14, fontWeight:700, color:rotForm.side===s?'#fff':'#7f92a6', cursor:'pointer' }}>
                      {t(lang,s==='N'?'north':s==='S'?'south':s==='E'?'east':'west')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="two-col">
                <button className="btn-secondary" onClick={()=>setShowRot(false)}>{t(lang,'cancel')}</button>
                <button className="btn-primary" onClick={addRotEntry}>{t(lang,'addRotEntry')}</button>
              </div>
            </div>
            {rotEntries.length===0 && <div style={{ textAlign:'center', color:'#7f92a6', fontSize:13, padding:'6px 0' }}>{t(lang,'noRotEntries')}</div>}
            {rotEntries.slice().reverse().map(e=>{
              const OPPOSITE = {N:'S',S:'N',E:'W',W:'E'};
              const opp = OPPOSITE[e.side];
              return (
                <div key={e.id} style={{ background:'#0f1720', borderRadius:10, padding:'11px 14px', marginBottom:7, border:'1px solid #1e2d3d', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, color:'#a855f7' }}>
                      {e.tree||'(no ID)'} <span style={{ color:'#7f92a6', fontSize:12, fontWeight:400 }}>{e.year}</span>
                    </div>
                    <div style={{ color:'#b0bec8', fontSize:13, marginTop:2 }}>
                      {t(lang,'side')}: <strong>{t(lang,e.side==='N'?'north':e.side==='S'?'south':e.side==='E'?'east':'west')}</strong>
                      <span style={{ color:'#a855f7', marginLeft:10 }}>→ {t(lang,'rotDue')}: {t(lang,opp==='N'?'north':opp==='S'?'south':opp==='E'?'east':'west')}</span>
                    </div>
                  </div>
                  <button className="delete-btn" aria-label="Delete this rotation entry" title="Delete entry" onClick={()=>setRotEntries(p=>p.filter(r=>r.id!==e.id))}><I.x size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


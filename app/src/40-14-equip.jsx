// ─── EQUIP TAB ────────────────────────────────────────────────────────────────
function EquipTab({ lang='en' }) {
  const [items, setItems] = useState(()=>ls.get('sg_equip2',[]));
  const [show,  setShow]  = useState(false);
  const [form,  setForm]  = useState({ name:'', brand:'', qty:1, year:'', condition:'Good', notes:'' });
  useEffect(()=>{ ls.set('sg_equip2',items); },[items]);
  const addItem = () => {
    if (!form.name.trim()) return;
    setItems(p=>[...p,{...form,id:Date.now()}]);
    setForm({name:'',brand:'',qty:1,year:'',condition:'Good',notes:''});
    setShow(false);
  };
  const cColor = { Good:'#3fb950', Fair:'#e0a44a', Poor:'#f85149' };

  // ── Transfer Time Calculator state ───────────────────────────────────────
  const [showTransfer, setShowTransfer] = useState(false);
  const [pumpGPM,  setPumpGPM]  = useState(() => ls.get('sg_pump_gpm',    28));
  const [tankGal,  setTankGal]  = useState(() => ls.get('sg_pump_tank',  300));
  const [lineLen,  setLineLen]  = useState(() => ls.get('sg_pump_line',    0));
  const [liftFt,   setLiftFt]   = useState(() => ls.get('sg_pump_lift',    0));
  const [setupMin, setSetupMin] = useState(() => ls.get('sg_pump_setup',   4));
  const saveP = (key, setter) => v => { setter(v); ls.set(key, v); };

  // Physics model: calibrated to match 800 ft + 12 ft lift → 18 min for 300 gal at 28 GPM
  const flowFactor    = Math.max(0.30, 1 - (lineLen / 1000) * 0.25 - (liftFt / 50) * 0.30);
  const effectiveGPM  = pumpGPM * flowFactor;
  const baseFillMin   = tankGal / Math.max(pumpGPM, 0.1);
  const realFillMin   = tankGal / Math.max(effectiveGPM, 0.1);
  const baseTotal     = baseFillMin + setupMin;
  const realisticTotal= realFillMin + setupMin;
  const extraMin      = realisticTotal - baseTotal;

  // Season haul estimate from log data
  const curSeason = ls.get('sg_season', new Date().getFullYear());
  const sapT      = ((ls.get('sg_logs2',{})[curSeason]||{}).sapCollected||[])
                      .reduce((s,e)=>s+(parseFloat(e.val)||0),0);
  // sapT is in the sugarmaker's display unit; the tank size is entered in gallons
  // (its own label says so). Dividing litres by a gallon tank overstated hauls by
  // 3.79x — 3000 L read as 12 hauls when it is really 3. Convert to gallons first.
  const sapGalHaul = toGal(sapT, ls.get('sg_units','GAL') === 'L' ? 'L' : 'GAL');
  const numHauls  = sapGalHaul > 0 ? Math.ceil(sapGalHaul / (tankGal * 0.90)) : null; // haul at 90% full
  const totalHaulHrs = numHauls ? (numHauls * realisticTotal / 60) : null;

  return (
    <div>
      {/* ── Transfer Time Calculator ── */}
      <div className="card" style={{ marginBottom:14 }}>
        <div className="collapsible-header" onClick={()=>setShowTransfer(s=>!s)}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <CardIcon bg="#0d1a2b" icon="clock" />
            <span style={{ fontWeight:600 }}>Transfer Time Calculator</span>
          </div>
          {showTransfer ? <I.chevUp size={16} color="#7f92a6" /> : <I.chevDown size={16} color="#7f92a6" />}
        </div>
        {showTransfer && (
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:13, color:'#7f92a6', marginBottom:12, lineHeight:1.5 }}>
              Enter your pump and line specs to get a realistic haul time estimate.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:13, color:'#7f92a6', marginBottom:3 }}>Pump flow (GPM)</div>
                <input aria-label="Pump flow in gallons per minute" type="number" value={pumpGPM} min={1} max={500} step={1}
                  onChange={e => saveP('sg_pump_gpm', setPumpGPM)(parseFloat(e.target.value)||28)}
                  style={{ width:'100%', boxSizing:'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize:13, color:'#7f92a6', marginBottom:3 }}>Tank size (gal)</div>
                <input aria-label="Tank size in gallons" type="number" value={tankGal} min={10} max={10000} step={50}
                  onChange={e => saveP('sg_pump_tank', setTankGal)(parseFloat(e.target.value)||300)}
                  style={{ width:'100%', boxSizing:'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize:13, color:'#7f92a6', marginBottom:3 }}>Line length (ft)</div>
                <input aria-label="Line length in feet" type="number" value={lineLen} min={0} max={5000} step={50}
                  onChange={e => saveP('sg_pump_line', setLineLen)(parseFloat(e.target.value)||0)}
                  style={{ width:'100%', boxSizing:'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize:13, color:'#7f92a6', marginBottom:3 }}>Vertical lift (ft)</div>
                <input aria-label="Vertical lift in feet" type="number" value={liftFt} min={0} max={200} step={1}
                  onChange={e => saveP('sg_pump_lift', setLiftFt)(parseFloat(e.target.value)||0)}
                  style={{ width:'100%', boxSizing:'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize:13, color:'#7f92a6', marginBottom:3 }}>Setup time (min)</div>
                <input aria-label="Setup time in minutes" type="number" value={setupMin} min={0} max={30} step={1}
                  onChange={e => saveP('sg_pump_setup', setSetupMin)(parseFloat(e.target.value)||4)}
                  style={{ width:'100%', boxSizing:'border-box' }} />
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:2 }}>
                <div style={{ fontSize:12, color:'#7f92a6', lineHeight:1.4 }}>
                  {effectiveGPM < pumpGPM
                    ? `Line + lift reduces flow to ~${effectiveGPM.toFixed(0)} GPM`
                    : 'No friction/lift penalty'}
                </div>
              </div>
            </div>

            {/* Results */}
            <div style={{ background:'#0a1420', border:'1px solid #1e2d3d', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:13, color:'#7f92a6', marginBottom:2 }}>Theoretical</div>
                  <div style={{ fontSize:22, fontWeight:800, color:'#7f92a6' }}>{baseTotal.toFixed(0)} <span style={{ fontSize:13, fontWeight:400 }}>min</span></div>
                  <div style={{ fontSize:13, color:'#7f92a6' }}>{baseFillMin.toFixed(0)} fill + {setupMin} setup</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:13, color:'#2dd4a7', marginBottom:2, fontWeight:600 }}>Realistic</div>
                  <div style={{ fontSize:22, fontWeight:800, color:'#2dd4a7' }}>{realisticTotal.toFixed(0)} <span style={{ fontSize:13, fontWeight:400 }}>min</span></div>
                  <div style={{ fontSize:13, color:'#7f92a6' }}>{realFillMin.toFixed(0)} fill + {setupMin} setup{extraMin > 0.5 ? ` (+${extraMin.toFixed(0)} friction)` : ''}</div>
                </div>
              </div>

              {numHauls && (
                <div style={{ borderTop:'1px solid #1e2d3d', paddingTop:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:13, color:'#7f92a6' }}>Hauls this season ({curSeason})</span>
                    <span style={{ fontWeight:700, fontSize:14, color:'#e6edf3' }}>{numHauls} hauls</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:13, color:'#7f92a6' }}>Total haul time</span>
                    <span style={{ fontWeight:700, fontSize:14, color:'#e6edf3' }}>{totalHaulHrs.toFixed(1)} hrs</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:13, color:'#7f92a6' }}>Avg gal/haul</span>
                    <span style={{ fontWeight:700, fontSize:14, color:'#e6edf3' }}>{(sapT / numHauls).toFixed(0)} gal</span>
                  </div>
                  <div style={{ fontSize:13, color:'#7f92a6', marginTop:8, lineHeight:1.5 }}>
                    Based on {sapT.toFixed(0)} gal logged · hauling at 90% tank capacity ({(tankGal * 0.9).toFixed(0)} gal)
                  </div>
                </div>
              )}
              {!numHauls && (
                <div style={{ fontSize:12, color:'#7f92a6', textAlign:'center', paddingTop:6 }}>
                  Log sap in the Log tab to see seasonal haul estimates.
                </div>
              )}
            </div>

            {/* Smart scheduling tip */}
            {numHauls && totalHaulHrs && (
              <div style={{ background:'rgba(45,212,167,0.06)', border:'1px solid rgba(45,212,167,0.2)', borderRadius:10, padding:'10px 12px', marginTop:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#2dd4a7', marginBottom:4 }}>Smart Scheduling Tip</div>
                <div style={{ fontSize:12, color:'#7f92a6', lineHeight:1.5 }}>
                  Hauling at 90% full ({(tankGal * 0.9).toFixed(0)} gal) instead of daily keeps your runs fewer and longer. Coordinate hauls with forecast sap-run days to minimize idle trips.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <button onClick={()=>setShow(s=>!s)} style={{ background:'transparent', border:'1px solid #2dd4a7', color:'#2dd4a7', borderRadius:10, padding:'13px 20px', fontSize:15, fontWeight:600, width:'100%', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
        <I.wrench size={16} color="#2dd4a7" /> {t(lang,'addEquipItem')}
      </button>
      {show && (
        <div className="card">
          <div style={{ fontWeight:600, fontSize:16, marginBottom:14 }}>{t(lang,'newItem')}</div>
          <div style={{ marginBottom:8 }}><input aria-label={t(lang,'equipNamePh')} type="text" placeholder={t(lang,'equipNamePh')} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} /></div>
          <div className="two-col" style={{ marginBottom:8 }}>
            <input aria-label={t(lang,'equipBrandPh')} type="text" placeholder={t(lang,'equipBrandPh')} value={form.brand} onChange={e=>setForm(p=>({...p,brand:e.target.value}))} />
            <NumInput label={t(lang,'equipQtyPh') || 'Quantity'} value={form.qty} onChange={v=>setForm(p=>({...p,qty:v}))} min={1} max={9999} step={1} placeholder={t(lang,'equipQtyPh')} />
          </div>
          <div className="two-col" style={{ marginBottom:8 }}>
            <input aria-label={t(lang,'equipYearPh')} type="text" placeholder={t(lang,'equipYearPh')} value={form.year} onChange={e=>setForm(p=>({...p,year:e.target.value}))} />
            <select aria-label={t(lang,'condition') || 'Condition'} value={form.condition} onChange={e=>setForm(p=>({...p,condition:e.target.value}))}><option value="Good">{t(lang,'condGood')}</option><option value="Fair">{t(lang,'condFair')}</option><option value="Poor">{t(lang,'condPoor')}</option></select>
          </div>
          <input aria-label={t(lang,'notes')} type="text" placeholder={t(lang,'notes')} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={{ marginBottom:12 }} />
          <div className="two-col">
            <button className="btn-secondary" onClick={()=>setShow(false)}>{t(lang,'cancel')}</button>
            <button className="btn-primary" onClick={addItem}>{t(lang,'add')}</button>
          </div>
        </div>
      )}
      {items.length===0 && !show && (
        <div className="card" style={{ textAlign:'center', padding:'28px 20px' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
            <M.evaporator size={72} color="#EB9A33" />
          </div>
          <div style={{ fontWeight:600, fontSize:16, marginBottom:6 }}>{t(lang,'noEquipYet')}</div>
          <div style={{ color:'#7f92a6', fontSize:14 }}>{t(lang,'equipDesc')}</div>
        </div>
      )}
      {items.map((item,i)=>(
        <div key={item.id} className="equip-item">
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:16, marginBottom:4 }}>{item.name}</div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:4 }}>
              {item.brand && <span style={{ color:'#7f92a6', fontSize:13 }}>{item.brand}</span>}
              {item.year  && <span style={{ color:'#7f92a6', fontSize:13 }}>· {item.year}</span>}
              {item.qty>1 && <span style={{ color:'#7f92a6', fontSize:13 }}>· {t(lang,'equipQtyLabel')} {item.qty}</span>}
              <span style={{ fontSize:12, fontWeight:600, color:cColor[item.condition]||'#7f92a6' }}>● {item.condition==='Good'?t(lang,'condGood'):item.condition==='Fair'?t(lang,'condFair'):t(lang,'condPoor')}</span>
            </div>
            {item.notes && <div style={{ color:'#7f92a6', fontSize:13 }}>{item.notes}</div>}
          </div>
          <button className="delete-btn" aria-label="Delete this equipment item" title="Delete item" onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))}><I.trash size={15} /></button>
        </div>
      ))}
    </div>
  );
}


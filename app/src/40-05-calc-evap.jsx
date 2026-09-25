// ─── EVAP TAB ─────────────────────────────────────────────────────────────────
function EvapTab({ sapBrix, setSapBrix, units, setEvapRate, fuelType, setFuelType, fuelCost, setFuelCost, season, trees, lang='en' }) {
  const [panIdx,    setPanIdx]   = useState(() => ls.get('sg_panIdx', 0));
  const [customR,   setCustomR]  = useState('');
  const [panW,      setPanW]     = useState(() => ls.get('sg_panW', ''));
  const [panH,      setPanH]     = useState(() => ls.get('sg_panH', ''));
  const [sapGal,    setSapGal]   = useState(500);
  const [batches,   setBatches]  = useState(() => ls.get('sg_batches', []));
  const [showForm,  setShowForm] = useState(false);
  const [bf, setBf] = useState({ date: new Date().toISOString().split('T')[0], sapIn:'', syrupOut:'', grade:'amber', loc:'', notes:'' });
  const [locLoading, setLocLoading] = useState(false);
  const [laborHrs,  setLaborHrs]  = useState(() => ls.get('sg_laborhrs', 0));
  const [laborRate, setLaborRate] = useState(() => getLaborRate());
  const [spoutCost, setSpoutCost] = useState(() => ls.get('sg_spoutcost', 0));
  const [bottleCost,setBottleCost]= useState(() => ls.get('sg_bottlecost', 0));
  const [filterCost,setFilterCost]= useState(() => ls.get('sg_filtercost', 0));
  const [otherCost, setOtherCost] = useState(() => ls.get('sg_othercost', 0));
  const [retailMargin,      setRetailMargin]      = useState(() => ls.get('sg_retailmargin', 40));
  const [retailCostOverride,setRetailCostOverride] = useState('');
  useEffect(()=>{ ls.set('sg_panIdx', panIdx); },[panIdx]);
  useEffect(()=>{ ls.set('sg_panW',   panW);   },[panW]);
  useEffect(()=>{ ls.set('sg_panH',   panH);   },[panH]);
  useEffect(()=>{ ls.set('sg_retailmargin', retailMargin); },[retailMargin]);
  useEffect(()=>{ ls.set('sg_laborhrs',  laborHrs);  },[laborHrs]);
  useEffect(()=>{ ls.set('sg_rate_labor', laborRate); },[laborRate]);
  useEffect(()=>{ ls.set('sg_spoutcost', spoutCost); },[spoutCost]);
  useEffect(()=>{ ls.set('sg_bottlecost',bottleCost);},[bottleCost]);
  useEffect(()=>{ ls.set('sg_filtercost',filterCost);},[filterCost]);
  useEffect(()=>{ ls.set('sg_othercost', otherCost); },[otherCost]);

  const pan        = PAN_SIZES[panIdx];
  const isCustomPan = panIdx === CUSTOM_PAN_IDX;
  const customArea  = isCustomPan ? (parseFloat(panW)||0) * (parseFloat(panH)||0) : 0;
  const customCalcR = isCustomPan ? Math.round(customArea * 2.5) : 0;   // ~2.5 gal/hr per sq ft, flue rig
  const rate = customR > 0 ? parseFloat(customR) : (isCustomPan ? customCalcR : pan.rate);
  const area = isCustomPan ? customArea : pan.area;
  const eff  = area > 0 ? (rate / area).toFixed(2) : '—';
  const sy   = syrupY(sapGal, sapBrix);
  const bh   = boilTime(sapGal, sapBrix, rate);
  const u    = units === 'L' ? 'L' : 'gal';
  const conv = v => units === 'L' ? (v*3.78541).toFixed(1) : v.toFixed(1);
  const fuel = FUELS.find(f=>f.label===fuelType) || FUELS[0];
  const uNeeded = sapGal / fuel.spu;
  const cost    = uNeeded * fuelCost;

  useEffect(() => { setEvapRate(rate); }, [rate]);
  useEffect(() => { ls.set('sg_batches', batches); }, [batches]);

  const gpsLoc = () => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const d = await r.json();
          const a = d.address || {};
          const city  = a.city || a.town || a.village || a.hamlet || a.county || '';
          const region = a.state || a.province || a.region || '';
          const loc = [city, region].filter(Boolean).join(', ');
          if (loc) setBf(p => ({ ...p, loc }));
        } catch(e) {}
        setLocLoading(false);
      },
      () => setLocLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const addBatch = () => {
    if (!bf.syrupOut && !bf.sapIn) return;
    setBatches(p => [...p, { ...bf, id:Date.now() }]);
    setBf({ date:new Date().toISOString().split('T')[0], sapIn:'', syrupOut:'', grade:'amber', loc:'', notes:'' });
    setShowForm(false);
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <CardIcon bg="#2b1a0d" icon="flame" />
          {t(lang,'evapTitle')}
        </div>
        <div className="field-label">{t(lang,'panSize')}</div>
        <select aria-label={t(lang,'panSize')} value={panIdx} onChange={e=>{setPanIdx(+e.target.value);setCustomR('');}} style={{ marginBottom:12 }}>
          {PAN_SIZES.map((p,i)=><option key={i} value={i}>{p.label}</option>)}
        </select>
        {isCustomPan && (
          <div className="two-col" style={{ marginBottom:12 }}>
            <div>
              <div className="field-label">Width (ft)</div>
              <NumInput label="Width (ft)" value={panW} onChange={setPanW} min={1} max={20} step={0.5} placeholder="e.g. 2" />
            </div>
            <div>
              <div className="field-label">Length (ft)</div>
              <NumInput label="Length (ft)" value={panH} onChange={setPanH} min={1} max={30} step={0.5} placeholder="e.g. 6" />
            </div>
          </div>
        )}
        {isCustomPan && customArea > 0 && (
          <div style={{ fontSize:12, color:'#e0a44a', marginBottom:10 }}>
            {customArea} ft² → estimated <strong>{customCalcR} GPH</strong> at 1.5 gal/ft²/hr
          </div>
        )}
        <div className="field-label">{t(lang,'customRate')}</div>
        <NumInput label={t(lang,'customRate')} value={customR} onChange={setCustomR} min={1} max={500} step={1} placeholder={isCustomPan && customCalcR > 0 ? `Leave blank for ~${customCalcR} GPH` : lang==='fr'?`Laisser vide — ~${pan.rate} GPH`:`Leave blank for ~${pan.rate} GPH`} />
        <div className="result-box orange" style={{ marginTop:12 }}>
          <div className="two-col">
            <div><div className="result-label" style={{ color:'#e0a44a' }}>{t(lang,'boilRate')}</div><div className="result-value" style={{ color:'#e0a44a' }}>{rate} GPH</div></div>
            <div><div className="result-label" style={{ color:'#e0a44a' }}>{t(lang,'efficiency')}</div><div className="result-value" style={{ color:'#e0a44a' }}>{eff} gal/ft²/hr</div></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <CardIcon bg="#2b1a0d" icon="clock" />
          {t(lang,'boilTime')}
        </div>
        <div className="two-col" style={{ marginBottom:12 }}>
          <div><div className="field-label">{t(lang,'sapToBoil')} ({u})</div><NumInput label={`${t(lang,'sapToBoil')} (${u})`} value={sapGal} onChange={setSapGal} min={1} max={100000} step={1} /></div>
          <div><div className="field-label">{t(lang,'sapBrix')}</div><input aria-label={t(lang,'sapBrix')} type="number" value={sapBrix} onChange={e=>setSapBrix(parseFloat(e.target.value)||0)} onFocus={e=>e.target.select()} min={0.5} max={10} step={0.1} /></div>
        </div>
        <div className="result-box orange">
          <div className="two-col">
            <div><div className="result-label" style={{ color:'#e0a44a' }}>{t(lang,'boilTimeRes')}</div><div className="result-value" style={{ color:'#e0a44a' }}>{fmtH(bh)}</div></div>
            <div><div className="result-label" style={{ color:'#e0a44a' }}>{t(lang,'syrupYield')}</div><div className="result-value" style={{ color:'#e0a44a' }}>{conv(sy)} {u}</div></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <CardIcon bg="#0d2b15" icon="dollar" />
          {t(lang,'fuelCost')}
          </div>
        <div className="field-label">{t(lang,'fuelType')}</div>
        <select aria-label={t(lang,'fuelType')} value={fuelType} onChange={e=>setFuelType(e.target.value)} style={{ marginBottom:12 }}>
          {FUELS.map(f=><option key={f.label} value={f.label}>{fuelLabel(f,lang)}</option>)}
        </select>
        <div className="field-label">{t(lang,'costPerUnit')} {fuel.unit} ($)</div>
        <NumInput label={`${t(lang,'costPerUnit')} ${fuel.unit} ($)`} value={fuelCost} onChange={setFuelCost} min={1} max={10000} step={1} />
        <div className="result-box green" style={{ marginTop:12 }}>
          <div className="two-col">
            <div><div className="result-label" style={{ color:'#3fb950' }}>{t(lang,'fuelNeeded')}</div><div className="result-value" style={{ color:'#3fb950' }}>{fmt(uNeeded,2)} {fuel.unit}s</div></div>
            <div><div className="result-label" style={{ color:'#3fb950' }}>{t(lang,'estCost')}</div><div className="result-value" style={{ color:'#3fb950' }}>${fmt(cost,2)}</div></div>
          </div>
          <div style={{ fontSize:13, color:'#7f92a6', marginTop:6 }}>{t(lang,'forSap')} {conv(sapGal)} {u} {t(lang,'ofSap')}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <CardIcon bg="#0a2b15" icon="dollar" />
          {t(lang,'trueCost')}
        </div>
        <div className="section-header">{t(lang,'fuelFromAbove')}</div>
        <InfoRow label={fuelLabel(fuel,lang)} value={`$${fmt(cost,2)}`} />
        <div className="section-header" style={{ marginTop:10 }}>{t(lang,'labour')}</div>
        <div className="two-col" style={{ marginBottom:10 }}>
          <div><div className="field-label">{t(lang,'hoursThisSeason')}</div><NumInput label={t(lang,'hoursThisSeason')} value={laborHrs} onChange={setLaborHrs} min={0} max={10000} step={0.5} /></div>
          <div><div className="field-label">{t(lang,'dollarsPerHr')}</div><NumInput label={t(lang,'dollarsPerHr')} value={laborRate} onChange={setLaborRate} min={0} max={500} step={1} /></div>
        </div>
        <div className="section-header">{t(lang,'supplies')}</div>
        <div className="two-col" style={{ marginBottom:10 }}>
          <div><div className="field-label">{t(lang,'spoutsLabel')}</div><NumInput label={t(lang,'spoutsLabel')} value={spoutCost} onChange={setSpoutCost} min={0} step={1} /></div>
          <div><div className="field-label">{t(lang,'bottlesLabel')}</div><NumInput label={t(lang,'bottlesLabel')} value={bottleCost} onChange={setBottleCost} min={0} step={1} /></div>
        </div>
        <div className="two-col" style={{ marginBottom:12 }}>
          <div><div className="field-label">{t(lang,'filtersLabel')}</div><NumInput label={t(lang,'filtersLabel')} value={filterCost} onChange={setFilterCost} min={0} step={1} /></div>
          <div><div className="field-label">{t(lang,'otherLabel')}</div><NumInput label={t(lang,'otherLabel')} value={otherCost} onChange={setOtherCost} min={0} step={1} /></div>
        </div>
        {(() => {
          const laborTotal   = laborHrs * laborRate;
          const suppliesTotal= parseFloat(spoutCost||0) + parseFloat(bottleCost||0) + parseFloat(filterCost||0) + parseFloat(otherCost||0);
          const totalCost    = cost + laborTotal + suppliesTotal;
          const syrupYield   = syrupY(sapGal, sapBrix);
          const cpg          = syrupYield > 0 ? totalCost / syrupYield : 0;
          const u2 = units === 'L' ? 'L' : 'gal';
          return (
            <div className="result-box green">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, marginBottom:10 }}>
                {[
                  { l:t(lang,'fuel'),     v:`$${fmt(cost,0)}` },
                  { l:t(lang,'labour'),   v:`$${fmt(laborTotal,0)}` },
                  { l:t(lang,'supplies'), v:`$${fmt(suppliesTotal,0)}` },
                  { l:t(lang,'total'),    v:`$${fmt(totalCost,0)}` },
                ].map(r=>(
                  <div key={r.l} style={{ textAlign:'center', background:'#081e0e', borderRadius:8, padding:'8px 4px' }}>
                    <div style={{ fontSize:12, color:'#7f92a6', fontWeight:600 }}>{r.l}</div>
                    <div style={{ fontWeight:700, color:'#3fb950', fontSize:16 }}>{r.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign:'center', borderTop:'1px solid #1a4a25', paddingTop:10 }}>
                <div style={{ fontSize:13, color:'#3fb950', fontWeight:600, letterSpacing:'0.08em', marginBottom:3 }}>{t(lang,'costPerGal').replace('GAL',u2.toUpperCase())}</div>
                <div style={{ fontSize:34, fontWeight:800, color:'#3fb950' }}>${fmt(cpg,2)}</div>
                <div style={{ color:'#7f92a6', fontSize:12, marginTop:2 }}>{t(lang,'forSap')} {fmt(syrupYield,1)} {u2} {t(lang,'sapSyrup')} — {fmt(sapGal,0)} {u2} {t(lang,'sapSap')}</div>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom:8 }}>
          <CardIcon bg="#0d1a2b" icon="dollar" />
          {t(lang,'retailTitle')}
        </div>
        <div style={{ fontSize:13, color:'#7f92a6', marginBottom:12 }}>{t(lang,'retailDesc')}</div>
        <div className="two-col" style={{ marginBottom:12 }}>
          <div>
            <div className="field-label">{t(lang,'marginLabel')}</div>
            <NumInput label={t(lang,'marginLabel')} value={retailMargin} onChange={setRetailMargin} min={0} max={95} step={1} />
          </div>
          <div>
            <div className="field-label">{t(lang,'yourCostPerGal')} <span style={{ color:'#7f92a6', fontSize:13 }}>({t(lang,'orEnterManual')})</span></div>
            <NumInput label={t(lang,'yourCostPerGal')} value={retailCostOverride} onChange={setRetailCostOverride} min={0} step={0.5} placeholder="auto" />
          </div>
        </div>
        {(() => {
          const laborTotal    = laborHrs * laborRate;
          const suppliesTotal = parseFloat(spoutCost||0)+parseFloat(bottleCost||0)+parseFloat(filterCost||0)+parseFloat(otherCost||0);
          const totalCost     = cost + laborTotal + suppliesTotal;
          const syrupYield    = syrupY(sapGal, sapBrix);
          const autoCpg       = syrupYield > 0 ? totalCost / syrupYield : 0;
          const cpg           = parseFloat(retailCostOverride) > 0 ? parseFloat(retailCostOverride) : autoCpg;
          const margin        = Math.min(Math.max(parseFloat(retailMargin)||40, 0), 95) / 100;
          // Bottle sizes in gallons
          const BOTTLE_SIZES  = [
            { label:'250 mL', gal:0.0660 },
            { label:'500 mL', gal:0.1321 },
            { label:'1 L',    gal:0.2642 },
            { label:'1 qt',   gal:0.25   },
            { label:'1 gal',  gal:1.0    },
          ];
          // USDA bulk benchmark price by grade (approx 2024, $/gal)
          const USDA_GRADES = [
            { grade:t(lang,'gradeGolden'), price:45 },
            { grade:t(lang,'gradeAmber'),  price:38 },
            { grade:t(lang,'gradeDark'),   price:34 },
            { grade:t(lang,'gradeVeryDark'), price:30 },
          ];
          return (
            <>
              <div className="result-box blue" style={{ padding:'10px 14px', marginBottom:14 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:4, marginBottom:6 }}>
                  <div style={{ color:'#7f92a6', fontSize:13, fontWeight:600 }}>{t(lang,'bottleSize')}</div>
                  <div style={{ color:'#7f92a6', fontSize:13, fontWeight:600, textAlign:'center' }}>{t(lang,'costPerBottle')}</div>
                  <div style={{ color:'#7f92a6', fontSize:13, fontWeight:600, textAlign:'center' }}>{t(lang,'retail')}</div>
                  <div style={{ color:'#7f92a6', fontSize:13, fontWeight:600, textAlign:'center' }}>{t(lang,'profit')}</div>
                </div>
                {BOTTLE_SIZES.map(bs=>{
                  const bottleCpg  = cpg * bs.gal;
                  const retailP    = margin < 1 ? bottleCpg / (1 - margin) : 0;
                  const profitP    = retailP - bottleCpg;
                  return (
                    <div key={bs.label} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:4, padding:'7px 0', borderTop:'1px solid #1e2d3d' }}>
                      <div style={{ fontWeight:600, fontSize:13 }}>{bs.label}</div>
                      <div style={{ textAlign:'center', color:'#7f92a6', fontSize:13 }}>${fmt(bottleCpg,2)}</div>
                      <div style={{ textAlign:'center', color:'#58a6ff', fontWeight:700, fontSize:14 }}>${fmt(retailP,2)}</div>
                      <div style={{ textAlign:'center', color:'#3fb950', fontSize:13 }}>${fmt(profitP,2)}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ background:'#0f1720', borderRadius:10, padding:'10px 14px' }}>
                <div style={{ fontSize:13, color:'#7f92a6', fontWeight:600, letterSpacing:'0.08em', marginBottom:8 }}>{t(lang,'usdaBenchmark')}</div>
                {USDA_GRADES.map(g=>(
                  <div key={g.grade} style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid #1e2d3d', padding:'6px 0', fontSize:13 }}>
                    <span style={{ color:'#7f92a6' }}>{g.grade}</span>
                    <span style={{ color:'#e0a44a', fontWeight:600 }}>${g.price}/gal</span>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>

      <div className="card">
        <div className="card-title">
          <CardIcon bg="#2b1a0d" icon="clipboard" />
          {t(lang,'batchLog')}
          <button onClick={()=>setShowForm(s=>!s)} style={{ marginLeft:'auto', background:'#e0a44a', color:'#0d1117', border:'none', borderRadius:8, padding:'7px 14px', fontWeight:600, fontSize:13 }}>{t(lang,'addBatch')}</button>
        </div>
        {showForm && (
          <div style={{ background:'#0f1720', borderRadius:10, padding:14, marginBottom:12 }}>
            <div className="two-col" style={{ marginBottom:8 }}>
              <div><div className="field-label">{t(lang,'date')}</div><input aria-label={t(lang,'date')} type="date" value={bf.date} onChange={e=>setBf(p=>({...p,date:e.target.value}))} /></div>
              <div><div className="field-label">Grade</div>
                <select aria-label="Grade" value={bf.grade} onChange={e=>setBf(p=>({...p,grade:e.target.value}))} style={{ background:'#0f1720', color:'#c9d1d9', border:'1px solid #2a3a4a', borderRadius:8, padding:'6px 10px', fontSize:14 }}>
                  {Object.entries(BATCH_GRADES).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
                </select>
              </div>
            </div>
            <div className="two-col" style={{ marginBottom:8 }}>
              <div><div className="field-label">{t(lang,'sapIn')} ({u})</div><NumInput label={`${t(lang,'sapIn')} (${u})`} value={bf.sapIn} onChange={v=>setBf(p=>({...p,sapIn:v}))} min={0} step={1} /></div>
              <div><div className="field-label">{t(lang,'syrupOut')} ({u})</div><NumInput label={`${t(lang,'syrupOut')} (${u})`} value={bf.syrupOut} onChange={v=>setBf(p=>({...p,syrupOut:v}))} min={0} step={0.1} /></div>
            </div>
            <div className="two-col" style={{ marginBottom:8 }}>
              <div><div className="field-label">Location</div>
                <div style={{ display:'flex', gap:6 }}>
                  <input aria-label="Location" type="text" value={bf.loc} onChange={e=>setBf(p=>({...p,loc:e.target.value}))} placeholder="e.g. Craftsbury, VT" style={{ flex:1 }} />
                  <button onClick={gpsLoc} disabled={locLoading} title="Use my location" style={{ background:'rgba(45,212,167,0.1)', border:'1px solid rgba(45,212,167,0.25)', borderRadius:8, padding:'0 10px', fontSize:16, cursor:'pointer', color: locLoading ? '#7f92a6' : '#2dd4a7', flexShrink:0 }}>
                    {locLoading ? <I.clock size={15} color="#7f92a6" /> : <I.mapPin size={15} color="#7f92a6" />}
                  </button>
                </div>
              </div>
              <div><div className="field-label">{t(lang,'notes')}</div><input aria-label={t(lang,'notes')} type="text" value={bf.notes} onChange={e=>setBf(p=>({...p,notes:e.target.value}))} placeholder={t(lang,'optional')} /></div>
            </div>
            <div className="two-col">
              <button className="btn-secondary" onClick={()=>setShowForm(false)}>{t(lang,'cancel')}</button>
              <button className="btn-primary" onClick={addBatch}>{t(lang,'saveBatch')}</button>
            </div>
          </div>
        )}
        {batches.length===0 && !showForm && (
          <div style={{ textAlign:'center', color:'#7f92a6', padding:'16px 0', fontSize:14 }}>{t(lang,'noBatchesLong')}</div>
        )}
        {batches.length>0 && (
          <div style={{ fontSize:13, color:'#7f92a6', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
            <I.tag size={15} color="#7f92a6" />
            <span>Tap <strong style={{color:'#2dd4a7'}}>Label</strong> on any batch to download a printable provenance label with a QR code.</span>
          </div>
        )}
        {batches.map((b,i) => {
          const bg = BATCH_GRADES[b.grade] || BATCH_GRADES.amber;
          return (
            <div key={b.id} className="log-entry" style={{ gap:8 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:bg.color, flexShrink:0, marginTop:3 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{srDateShort(b.date, lang)}{b.loc ? <span style={{ fontWeight:400, color:'#7f92a6', fontSize:12 }}> · {b.loc}</span> : ''}</div>
                <div style={{ color:'#7f92a6', fontSize:12 }}>{bg.name} · Sap: {b.sapIn} {u} → Syrup: {b.syrupOut} {u}{b.notes?` • ${b.notes}`:''}</div>
              </div>
              <button
                onClick={()=>_downloadBatchLabel(b, i+1, season, trees, units)}
                title="Download provenance label PNG"
                style={{ background:'rgba(45,212,167,0.1)', border:'1px solid rgba(45,212,167,0.25)', borderRadius:7, padding:'5px 10px', fontSize:13, fontWeight:700, color:'#2dd4a7', cursor:'pointer', flexShrink:0, letterSpacing:'0.03em', lineHeight:1.3, textAlign:'center' }}>
                <I.tag size={15} color="#7f92a6" /><br/>Label
              </button>
              <button className="delete-btn" aria-label="Delete this batch" title="Delete batch" onClick={()=>setBatches(p=>p.filter((_,j)=>j!==i))}><I.trash size={15} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


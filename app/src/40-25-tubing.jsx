// ─── TUBING CALCULATOR TAB ────────────────────────────────────────────────────
function TInput({label, val, set, ph, unit, hint}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:700,color:'#7f92a6',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <input
          value={val}
          onChange={e=>set(e.target.value)}
          onFocus={e=>{setFocused(true); e.target.select();}}
          onBlur={()=>setFocused(false)}
          aria-label={unit ? `${label} in ${unit}` : label}
          placeholder={ph}
          type="text"
          inputMode="decimal"
          style={{flex:1,padding:'9px 12px',border:`1.5px solid ${focused?'#58a6ff':'#1e2d3d'}`,borderRadius:10,
            fontSize:15,outline:'none',fontFamily:'inherit',
            background:'#07090f',color:'#c9d1d9',transition:'border-color 0.15s'}}/>
        {unit && <span style={{fontSize:12,color:'#7f92a6',whiteSpace:'nowrap',minWidth:40}}>{unit}</span>}
      </div>
      {hint && <div style={{fontSize:13,color:'#7f92a6',marginTop:3,lineHeight:1.4}}>{hint}</div>}
    </div>
  );
}

function TubingTab({ trees }) {
  const [taps,      setTaps]      = React.useState(trees || '');
  const [mainLen,   setMainLen]   = React.useState('');
  const [grade,     setGrade]     = React.useState('');
  const [targetVac, setTargetVac] = React.useState('25');
  const [latTaps,   setLatTaps]   = React.useState('12');

  const calc = React.useMemo(() => {
    const t  = parseInt(taps)      || 0;
    const ml = parseFloat(mainLen) || 0;
    const g  = parseFloat(grade)   || 0;
    const tv = parseFloat(targetVac) || 25;
    const lt = parseInt(latTaps)   || 12;
    if (!t || !ml) return null;

    let ms, msLabel, msColor;
    if      (t <=  100) { ms='3/4"';  msLabel='3/4 inch (19mm)';  msColor='#3fb950'; }
    else if (t <=  300) { ms='1"';    msLabel='1 inch (25mm)';     msColor='#58a6ff'; }
    else if (t <=  600) { ms='1¼"';   msLabel='1¼ inch (32mm)';    msColor='#c990ff'; }
    else if (t <= 1200) { ms='1½"';   msLabel='1½ inch (38mm)';    msColor='#e0a44a'; }
    else                { ms='2"';    msLabel='2 inch (50mm)';      msColor='#f85149'; }

    const diamFactor = {'3/4"':1.8,'1"':1.0,'1¼"':0.65,'1½"':0.45,'2"':0.25};
    const vacLoss  = ((ml/1000)*(diamFactor[ms]||1.0)*2).toFixed(1);
    const elevDrop = (ml*(g/100)).toFixed(0);
    const vacGain  = ((ml*g/100)/10*0.4).toFixed(1);
    // Vacuum at the far tap can never exceed pump vacuum, so the pump must be
    // sized at least to the target; grade assist reduces the burden but can't
    // push the required pump below the target. Without the floor, the app told a
    // producer at 8% grade to buy a 21" pump for a 25" system — an under-buy of
    // half — and rendered it green. Floor at the target.
    const vacPump  = Math.max(tv, tv + parseFloat(vacLoss) - parseFloat(vacGain)).toFixed(1);
    const numLat   = Math.ceil(t/lt);
    const latFtTot = (numLat*lt*8).toFixed(0);
    const cfm      = Math.ceil(t*0.05);
    const pump     = cfm<=10  ? '½ HP rotary vane (10 CFM)'
                   : cfm<=20  ? '1 HP rotary vane (20 CFM)'
                   : cfm<=40  ? '2 HP rotary vane (40 CFM)'
                   : cfm<=75  ? '3–5 HP rotary vane (75 CFM)'
                   :            `Large system (${cfm}+ CFM)`;
    return { ms, msLabel, msColor, vacLoss, vacGain, vacPump, elevDrop,
      numLat, latFtTot, cfm, pump,
      mainFt: Math.ceil(ml*1.1), latFt: Math.ceil(parseInt(latFtTot)*1.1),
      dropFt: t*4, tees: t, caps: numLat };
  }, [taps, mainLen, grade, targetVac, latTaps]);

  return (
    <div style={{maxWidth:800,margin:'0 auto',padding:'0 0 80px'}}>

      {/* Header */}
      <div style={{background:'#0d1a2b',border:'1px solid #1e2d3d',borderRadius:16,padding:'18px 22px',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
          <div style={{width:42,height:42,background:'linear-gradient(135deg,#0d1a2b,#1e3a5f)',borderRadius:10,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,
            border:'1px solid #1e3a5f',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><I.wrench size={19} color="#58a6ff" /></div>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:'#c9d1d9',letterSpacing:'-0.5px'}}>Tubing Calculator</div>
            <div style={{fontSize:13,color:'#7f92a6',marginTop:1}}>Mainline sizing · Vacuum analysis · Materials estimator</div>
          </div>
        </div>
        <div style={{fontSize:13,color:'#7f92a6',marginTop:2}}>Based on Cornell Maple Program & UVM Proctor research guidelines</div>
      </div>

      {/* Inputs */}
      <div style={{background:'#0d1a2b',border:'1px solid #1e2d3d',borderRadius:16,padding:20,marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:'#7f92a6',marginBottom:14,textTransform:'uppercase',letterSpacing:'0.08em'}}><I.ruler size={13} color="#7f92a6" /> Your System</div>
        <TInput label="Total Taps"             val={taps}      set={setTaps}      ph="e.g. 500"  unit="taps"    hint="Total taps in this tubing system"/>
        <TInput label="Mainline Length"         val={mainLen}   set={setMainLen}   ph="e.g. 2000" unit="ft"      hint="From vacuum pump to farthest tap"/>
        <TInput label="Average Downhill Grade"  val={grade}     set={setGrade}     ph="e.g. 8"    unit="% slope" hint="Slope toward collection tank — provides natural vacuum assist"/>
        <TInput label="Target Vacuum at Tap"    val={targetVac} set={setTargetVac} ph="25"         unit="in Hg"   hint="High-vacuum systems typically target 25–27 in Hg"/>
        <TInput label="Taps per Lateral"        val={latTaps}   set={setLatTaps}   ph="12"         unit="taps"    hint="Taps per lateral run — 8–15 is typical for 5/16″ line"/>
      </div>

      {calc ? (<>

        {/* Mainline recommendation */}
        <div style={{background:'#0d1a2b',border:`1.5px solid ${calc.msColor}40`,borderLeft:`4px solid ${calc.msColor}`,
          borderRadius:'0 14px 14px 0',padding:20,marginBottom:14}} className="sage-fadein">
          <div style={{fontSize:12,fontWeight:700,color:'#7f92a6',letterSpacing:'0.1em',marginBottom:12}}>RECOMMENDED MAINLINE SIZE</div>
          <div style={{display:'flex',alignItems:'center',gap:18}}>
            <div style={{width:72,height:72,borderRadius:'50%',
              background:`${calc.msColor}15`,border:`3px solid ${calc.msColor}`,
              display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{fontSize:20,fontWeight:900,color:calc.msColor}}>{calc.ms}</span>
            </div>
            <div>
              <div style={{fontSize:22,fontWeight:800,color:calc.msColor}}>{calc.msLabel}</div>
              <div style={{fontSize:12,color:'#7f92a6',marginTop:4}}>For {taps} taps · {mainLen} ft mainline · Cornell guidelines</div>
            </div>
          </div>
        </div>

        {/* Vacuum analysis */}
        <div style={{background:'#0d1a2b',border:'1px solid #1e2d3d',borderRadius:14,padding:20,marginBottom:14}} className="sage-fadein">
          <div style={{fontSize:12,fontWeight:700,color:'#7f92a6',letterSpacing:'0.1em',marginBottom:14}}>VACUUM ANALYSIS</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
            {[
              {label:'Target at Tap', val:`${targetVac}"`,      color:'#58a6ff'},
              {label:'Line Loss',     val:`−${calc.vacLoss}"`,  color:'#f85149'},
              {label:'Grade Assist',  val:`+${calc.vacGain}"`,  color:'#3fb950'},
            ].map(x=>(
              <div key={x.label} style={{textAlign:'center',background:'#07090f',borderRadius:10,padding:'12px 6px',border:`1px solid ${x.color}25`}}>
                <div style={{fontSize:20,fontWeight:700,color:x.color}}>{x.val}</div>
                <div style={{fontSize:12,color:'#7f92a6',marginTop:4,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{x.label}</div>
              </div>
            ))}
          </div>
          <div style={{padding:'12px 16px',background:'#07090f',borderRadius:10,border:'1px solid #1e2d3d',
            display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:13,fontWeight:600,color:'#7f92a6'}}>Required pump vacuum:</span>
            <span style={{fontSize:22,fontWeight:900,
              color: parseFloat(calc.vacPump)>28?'#f85149':parseFloat(calc.vacPump)>24?'#e0a44a':'#3fb950'}}>
              {calc.vacPump}" Hg
            </span>
          </div>
          {parseFloat(calc.vacPump)>27 && (
            <div style={{marginTop:10,padding:'9px 12px',background:'#1a0a0a',borderLeft:'3px solid #f85149',borderRadius:'0 8px 8px 0',fontSize:12,color:'#f85149',lineHeight:1.5}}>
              <I.alert size={13} color="currentColor" /> Pump requirement is high — consider upgrading mainline diameter or adding a mid-line pump.
            </div>
          )}
          {parseFloat(calc.vacGain)>2 && (
            <div style={{marginTop:8,padding:'9px 12px',background:'#071a0e',borderLeft:'3px solid #3fb950',borderRadius:'0 8px 8px 0',fontSize:12,color:'#3fb950',lineHeight:1.5}}>
              ✓ Your {calc.elevDrop} ft elevation drop provides meaningful natural vacuum assist.
            </div>
          )}
        </div>

        {/* Laterals + Pump */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
          <div style={{background:'#0d1a2b',border:'1px solid #1e2d3d',borderRadius:14,padding:18}} className="sage-fadein">
            <div style={{fontSize:12,fontWeight:700,color:'#7f92a6',letterSpacing:'0.1em',marginBottom:10}}>LATERAL LINES</div>
            <div style={{fontSize:32,fontWeight:900,color:'#c9d1d9',lineHeight:1}}>{calc.numLat}</div>
            <div style={{fontSize:13,color:'#7f92a6',marginTop:2,marginBottom:8}}>lateral runs</div>
            <div style={{fontSize:20,fontWeight:800,color:'#7f92a6'}}>{parseInt(calc.latFtTot).toLocaleString()} ft</div>
            <div style={{fontSize:13,color:'#7f92a6'}}>total lateral footage</div>
          </div>
          <div style={{background:'#0d1a2b',border:'1px solid #1e2d3d',borderRadius:14,padding:18}} className="sage-fadein">
            <div style={{fontSize:12,fontWeight:700,color:'#7f92a6',letterSpacing:'0.1em',marginBottom:10}}>VACUUM PUMP</div>
            <div style={{marginBottom:6,display:'flex',justifyContent:'center'}}><I.wind size={28} color="#58a6ff" /></div>
            <div style={{fontSize:13,fontWeight:700,color:'#c9d1d9',lineHeight:1.4}}>{calc.pump}</div>
            <div style={{fontSize:13,color:'#7f92a6',marginTop:4}}>{calc.cfm} CFM needed</div>
          </div>
        </div>

        {/* Materials */}
        <div style={{background:'#0d1a2b',border:'1px solid #1e2d3d',borderRadius:14,padding:20}} className="sage-fadein">
          <div style={{fontSize:12,fontWeight:700,color:'#7f92a6',letterSpacing:'0.1em',marginBottom:14}}>MATERIALS ESTIMATE</div>
          {[
            { item:`Mainline tubing (${calc.ms})`, qty:`${calc.mainFt.toLocaleString()} ft`,  note:'Includes 10% waste',   color:'#58a6ff' },
            { item:'Lateral tubing (5/16")',        qty:`${calc.latFt.toLocaleString()} ft`,   note:'Includes 10% waste',   color:'#3fb950' },
            { item:'Drop lines (5/16")',             qty:`${calc.dropFt.toLocaleString()} ft`,  note:'~4 ft per tap',        color:'#3fb950' },
            { item:'Tee fittings',                  qty:calc.tees.toLocaleString(),             note:'1 per tap',            color:'#e0a44a' },
            { item:'Lateral end caps',              qty:calc.caps.toLocaleString(),             note:'1 per lateral',        color:'#c990ff' },
          ].map((r,i)=>(
            <div key={r.item} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'10px 0',borderBottom:i<4?'1px solid #1e2d3d':'none'}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'#c9d1d9'}}>{r.item}</div>
                <div style={{fontSize:13,color:'#7f92a6'}}>{r.note}</div>
              </div>
              <div style={{fontSize:16,fontWeight:800,color:r.color}}>{r.qty}</div>
            </div>
          ))}
          <div style={{marginTop:12,fontSize:13,color:'#7f92a6',lineHeight:1.65,borderTop:'1px solid #1e2d3d',paddingTop:10}}>
            Cornell Maple Program guidelines · 8 ft average tree spacing assumed · Consult your dealer for exact quantities.
          </div>
        </div>

      </>) : (
        <div style={{textAlign:'center',padding:'28px 20px'}}>
          <div style={{fontSize:15,fontWeight:700,color:'#e6edf3',marginBottom:6,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><I.wrench size={20} color="#7f92a6" /> Enter your system details above</div>
          <div style={{fontSize:12,color:'#7f92a6',lineHeight:1.65,marginBottom:20}}>
            Mainline size, vacuum analysis, pump sizing, and materials list will appear instantly.
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center'}}>
            {[['Small woodlot','200','800','6'],['Mid-size','500','2000','8'],['Large operation','1200','4000','10']].map(([label,t,ml,g])=>(
              <button key={label} onClick={()=>{setTaps(t);setMainLen(ml);setGrade(g);}}
                style={{padding:'7px 14px',borderRadius:20,border:'1.5px solid #1e2d3d',
                  background:'#0d1a2b',color:'#58a6ff',fontSize:12,cursor:'pointer',fontWeight:600,
                  transition:'all 0.15s'}}
                onMouseEnter={e=>{e.target.style.borderColor='#58a6ff';}}
                onMouseLeave={e=>{e.target.style.borderColor='#1e2d3d';}}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


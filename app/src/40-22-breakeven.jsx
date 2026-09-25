// ─── Breakeven Calculator ─────────────────────────────────────────────────────
// BevInput lives at module scope. It was defined inside BreakevenCalculator's
// body, so every keystroke created a new component type → React remounted the
// input → keyboard focus dropped after each digit (Debug H5).
const BevInput = ({ label, val, set, prefix, suffix, small }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:700,color:'#7f92a6',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>{label}</div>
      <div style={{display:'flex',alignItems:'center',gap:6,background:'#0a1420',border:`1.5px solid ${focused?'#3fb950':'#1e2d3d'}`,borderRadius:9,padding:'8px 12px',transition:'border-color 0.15s'}}>
        {prefix && <span style={{color:'#7f92a6',fontSize:14,flexShrink:0}}>{prefix}</span>}
        <input type="number" value={val||''} onChange={e=>set(parseFloat(e.target.value)||0)}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          aria-label={[label, prefix === '$' ? 'in dollars' : null, suffix].filter(Boolean).join(' ')}
          placeholder="0" min="0"
          style={{flex:1,background:'transparent',border:'none',outline:'none',color:'#e6edf3',fontSize:small?13:15,fontFamily:'inherit'}}/>
        {suffix && <span style={{color:'#7f92a6',fontSize:13,flexShrink:0}}>{suffix}</span>}
      </div>
    </div>
  );
};

function BreakevenCalculator({ trees, units }) {
  const wizData     = ls.get('sg_wizard_data', {});
  const [taps,      setTaps]      = React.useState(()=> ls.get('sg_bev_taps',   parseInt(trees)||0));
  const [fuelCost,  setFuelCost]  = React.useState(()=> ls.get('sg_bev_fuel',   wizData.fuelCost||300));
  const [syrupPx,   setSyrupPx]   = React.useState(()=> getSyrupPrice());
  const [supplies,  setSupplies]  = React.useState(()=> ls.get('sg_bev_supply', 0));
  const [laborHrs,  setLaborHrs]  = React.useState(()=> ls.get('sg_bev_lhrs',  0));
  const [laborRate, setLaborRate] = React.useState(()=> getLaborRate());
  const [hobby,     setHobby]     = React.useState(()=> ls.get('sg_bev_hobby',  true));

  // persist on change
  React.useEffect(()=>{ ls.set('sg_bev_taps',   taps);     },[taps]);
  React.useEffect(()=>{ ls.set('sg_bev_fuel',   fuelCost); },[fuelCost]);
  React.useEffect(()=>{ ls.set('sg_price_syrup', syrupPx); },[syrupPx]);
  React.useEffect(()=>{ ls.set('sg_bev_supply', supplies); },[supplies]);
  React.useEffect(()=>{ ls.set('sg_bev_lhrs',   laborHrs); },[laborHrs]);
  React.useEffect(()=>{ ls.set('sg_rate_labor', laborRate);},[laborRate]);
  React.useEffect(()=>{ ls.set('sg_bev_hobby',  hobby);    },[hobby]);

  const t        = Math.max(1, parseInt(taps)   || 1);
  const fuel     = parseFloat(fuelCost)  || 0;
  const price    = Math.max(0.01, parseFloat(syrupPx) || 40);
  const supCost  = parseFloat(supplies)  || 0;
  const labor    = hobby ? 0 : (parseFloat(laborHrs)||0) * (parseFloat(laborRate)||0);
  const totalCost = fuel + supCost + labor;
  const bevGal   = price > 0 ? totalCost / price : 0;   // total syrup gal to break even
  const bevPerTap = bevGal / t;                          // gal/tap to break even

  // 3 scenarios: bad / average / great
  const scenarios = [
    { label:'Bad Year',  yld:0.14, color:'#f85149', bgc:'rgba(248,81,73,0.06)'  },
    { label:'Average',   yld:0.22, color:'#e0a44a', bgc:'rgba(245,158,11,0.06)' },
    { label:'Great Year',yld:0.30, color:'#3fb950', bgc:'rgba(63,185,80,0.06)'  },
  ];

  const maxYld = 0.35;

  return (
    <div style={{background:'#0a1420',border:'1px solid #1e2d3d',borderRadius:12,padding:'16px 16px',marginBottom:16}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <div style={{width:32,height:32,borderRadius:8,background:'rgba(88,166,255,0.1)',border:'1px solid rgba(88,166,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <I.dollar size={16} color="#e0a44a" />
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:'#e6edf3',lineHeight:1.2}}>Break-Even Calculator</div>
          <div style={{fontSize:13,color:'#7f92a6',marginTop:2}}>How much do you need to make to cover costs?</div>
        </div>
      </div>

      {/* Input grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0,columnGap:12}}>
        <BevInput label="Number of Taps"         val={taps}     set={setTaps}     suffix="taps"/>
        <BevInput label="Fuel Cost (season)"     val={fuelCost} set={setFuelCost} prefix="$"/>
        <BevInput label="Syrup Price / Gallon"   val={syrupPx}  set={setSyrupPx}  prefix="$"/>
        <BevInput label="Supplies & Misc"        val={supplies} set={setSupplies} prefix="$"/>
      </div>

      {/* Labor toggle */}
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div style={{fontSize:12,fontWeight:700,color:'#7f92a6',textTransform:'uppercase',letterSpacing:'0.06em'}}>Labor Cost</div>
          <button onClick={()=>setHobby(v=>!v)}
            style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',padding:0}}>
            <div style={{width:32,height:18,borderRadius:9,background:hobby?'#3fb950':'#1e2d3d',transition:'background 0.2s',position:'relative',flexShrink:0}}>
              <div style={{position:'absolute',top:2,left:hobby?14:2,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
            </div>
            <span style={{fontSize:13,color:hobby?'#3fb950':'#7f92a6',fontWeight:600}}>{hobby?'Hobby ($0)':'Paid labor'}</span>
          </button>
        </div>
        {!hobby && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <BevInput label="Hours / Season" val={laborHrs}  set={setLaborHrs}  suffix="hrs" small/>
            <BevInput label="Hourly Rate"    val={laborRate} set={setLaborRate} prefix="$"   small/>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{borderTop:'1px solid #1e2d3d',marginBottom:16}}/>

      {/* Break-even answer */}
      <div style={{background:'linear-gradient(135deg,#071020,#0d1a2b)',border:'1px solid #1e2d3d',borderRadius:10,padding:'14px 16px',marginBottom:14}}>
        {totalCost === 0 ? (
          <div style={{textAlign:'center',color:'#7f92a6',fontSize:13}}>Enter your costs above to calculate break-even.</div>
        ) : (
          <>
            <div style={{fontSize:13,fontWeight:700,color:'#58a6ff',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Your Break-Even Point</div>
            <div style={{fontSize:13,color:'#c9d1d9',lineHeight:1.9}}>
              <span style={{color:'#58a6ff',fontWeight:800,fontSize:22}}>{bevPerTap.toFixed(2)}</span>
              <span style={{color:'#7f92a6',fontSize:13}}> gal/tap needed  ·  </span>
              <span style={{color:'#a78bfa',fontWeight:700,fontSize:16}}>{bevGal.toFixed(1)} gal</span>
              <span style={{color:'#7f92a6',fontSize:12}}> total</span>
            </div>
            <div style={{fontSize:12,color:'#7f92a6',marginTop:4}}>
              Total season cost: <span style={{color:'#e0a44a',fontWeight:600}}>${totalCost.toLocaleString()}</span>
              {labor > 0 && <span> (incl. ${labor.toFixed(0)} labor)</span>}
            </div>
          </>
        )}
      </div>

      {/* Scenario bars */}
      <div style={{fontSize:12,fontWeight:700,color:'#7f92a6',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Season Scenarios</div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {scenarios.map(({label,yld,color,bgc})=>{
          const syrupGal  = t * yld;
          const revenue   = syrupGal * price;
          const profit    = revenue - totalCost;
          const above     = bevPerTap > 0 ? yld >= bevPerTap : true;
          const barWidth  = Math.min(100, (yld / maxYld) * 100);
          const bevLine   = bevPerTap > 0 ? Math.min(100, (bevPerTap / maxYld) * 100) : null;
          return (
            <div key={label} style={{background:bgc,border:`1px solid ${color}30`,borderRadius:10,padding:'10px 12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color}}>{label}</span>
                <span style={{fontSize:12,fontWeight:700,color:above?'#3fb950':'#f85149'}}>
                  {totalCost===0?'—':profit>=0?`+$${profit.toFixed(0)}`:`-$${Math.abs(profit).toFixed(0)}`}
                </span>
              </div>
              {/* Bar */}
              <div style={{position:'relative',height:8,background:'#131e2c',borderRadius:4,overflow:'hidden'}}>
                <div style={{position:'absolute',left:0,top:0,height:'100%',width:`${barWidth}%`,
                  background:color,borderRadius:4,transition:'width 0.4s ease'}}/>
                {bevLine != null && (
                  <div style={{position:'absolute',left:`${bevLine}%`,top:-2,height:12,width:2,
                    background:'#fff',borderRadius:1,opacity:0.6}}/>
                )}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                <span style={{fontSize:12,color:'#7f92a6'}}>{yld.toFixed(2)} gal/tap · {syrupGal.toFixed(1)} gal total</span>
                <span style={{fontSize:12,color:above?'#3fb950':'#f85149',fontWeight:600}}>
                  {totalCost===0?'':above?'Above break-even ✓':'Below break-even'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {totalCost > 0 && bevPerTap > 0.30 && (
        <div style={{marginTop:12,background:'rgba(248,81,73,0.06)',border:'1px solid rgba(248,81,73,0.2)',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#f85149',lineHeight:1.5}}>
          <I.alert size={13} color="currentColor" /> Your break-even ({bevPerTap.toFixed(2)} gal/tap) is above the great-year benchmark. Consider reducing costs or increasing your selling price.
        </div>
      )}
    </div>
  );
}



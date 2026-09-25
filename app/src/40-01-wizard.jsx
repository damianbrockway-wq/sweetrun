// ─── First Season Wizard ─────────────────────────────────────────────────────
function FirstSeasonWizard({ onClose, onComplete }) {
  const STEPS = 5;
  const [step, setStep] = React.useState(0);
  const [treeCount, setTreeCount] = React.useState('');
  const [trunkSize, setTrunkSize] = React.useState('medium');
  const [systemType, setSystemType] = React.useState('gravity');
  const [collectionType, setCollectionType] = React.useState('mainline');
  const [hasEvap, setHasEvap] = React.useState(null);
  const [panSize, setPanSize] = React.useState('2x4');
  const [wizFuelType, setWizFuelType] = React.useState('Firewood (cord)');
  const [fuelCostVal, setFuelCostVal] = React.useState('');
  const [syrupPrice, setSyrupPrice] = React.useState('');

  const trees = parseInt(treeCount) || 0;
  const tapsPerTree = trunkSize === 'large' ? 2 : 1;
  const recTaps = trees * tapsPerTree;
  const yModel    = yieldModelFor(systemType, collectionType);
  const yieldLow  = yModel.low;
  const yieldHigh = yModel.high;
  const yieldMid  = yieldMidOf(yModel);
  const syrupLow  = Math.round(recTaps * yieldLow  * 10) / 10;
  const syrupMid  = Math.round(recTaps * yieldMid  * 10) / 10;
  const syrupHigh = Math.round(recTaps * yieldHigh * 10) / 10;
  const sapMid    = Math.round(syrupMid * 43);
  const evapRates = { '2x3':10,'2x4':16,'2x6':25,'2x8':35,'3x8':70,'3x10':85,'4x12':140,'4x14':163,'5x16':232 };
  const evapGph   = evapRates[panSize] || 6;
  const sessions  = hasEvap ? Math.ceil(Math.max(1, sapMid) / (evapGph * 4)) : null;
  const firewood  = wizFuelType.includes('Firewood') ? Math.max(0.1, syrupMid / 30).toFixed(1) : null;
  const price     = parseFloat(syrupPrice) || 40;

  const goNext = () => setStep(s => s + 1);
  const goBack = () => setStep(s => s - 1);

  const finish = () => {
    const data = { trees, tapsPerTree, recTaps, systemType, collectionType, hasEvap, panSize,
      fuelType: wizFuelType, fuelCost: parseFloat(fuelCostVal) || 300, syrupPrice: price };
    ls.set('sg_wizard_data', data);
    ls.set('sg_onboarded', true);
    onComplete(data);
  };

  const stepTitles = ['Your Trees', 'Your System', 'Your Evaporator', 'Costs & Goals', 'Your Season Plan'];
  const stepIcons  = [I.tree, I.wrench, I.flame, I.dollar, I.clipboard];
  const canNext    = [trees > 0, true, hasEvap !== null, true, true][step];

  // One selection color, app-wide: teal (#2dd4a7). The wizard used to switch
  // accent per step (teal → blue → purple → amber) — same control, four looks.
  const Opt = ({ val, cur, set, icon, Icon, label, sub, wide }) => {
    const accent = '#2dd4a7';
    const glyph = Icon
      ? <Icon size={wide ? 21 : 23} color={cur===val ? accent : '#7d8ca3'} />
      : icon;
    return (
    <button onClick={()=>set(val)}
      style={{padding: wide ? '12px 14px' : '12px 8px', borderRadius:12,
        border:`2px solid ${cur===val ? accent : '#1e2d3d'}`,
        background: cur===val ? 'rgba(45,212,167,0.09)' : '#0a1420',
        cursor:'pointer', transition:'all 0.15s', textAlign: wide ? 'left' : 'center',
        display: wide ? 'flex' : 'block', alignItems: wide ? 'center' : undefined, gap: wide ? 10 : 0,
        width:'100%', minWidth:0, boxSizing:'border-box'}}>
      {wide
        ? <><span style={{display:'inline-flex',alignItems:'center',fontSize:20,flexShrink:0}}>{glyph}</span>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:cur===val?accent:'#c9d1d9'}}>{label}</div>
              <div style={{fontSize:12,color:'#7f92a6'}}>{sub}</div>
            </div></>
        : <><div style={{fontSize:20,marginBottom:5,display:'flex',justifyContent:'center'}}>{glyph}</div>
            <div style={{fontSize:13,fontWeight:700,color:cur===val?accent:'#c9d1d9'}}>{label}</div>
            {sub && <div style={{fontSize:12,color:'#7f92a6',marginTop:2,lineHeight:1.3}}>{sub}</div>}</>
      }
    </button>
  );
  };

  const steps = [
    // 0 — Trees
    <div key="s0">
      <p style={{fontSize:13,color:'#7f92a6',marginBottom:18,lineHeight:1.6}}>
        Let's start with your trees. This helps SweetRun calculate your real production potential.
      </p>
      <div style={{marginBottom:18}}>
        <label style={{fontSize:13,fontWeight:700,color:'#7f92a6',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:8}}>
          How many maple trees do you tap?
        </label>
        <input aria-label="How many maple trees do you tap?" type="number" value={treeCount} onChange={e=>setTreeCount(e.target.value)}
          placeholder="e.g. 150" min="1"
          style={{width:'100%',background:'#0a1420',border:'1.5px solid #1e2d3d',borderRadius:10,
            padding:'11px 14px',color:'#e6edf3',fontSize:16,boxSizing:'border-box',outline:'none'}}/>
      </div>
      <label style={{fontSize:13,fontWeight:700,color:'#7f92a6',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:10}}>
        Average trunk diameter at chest height
      </label>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,minWidth:0}}>
        <Opt val="small"  cur={trunkSize} set={setTrunkSize} Icon={I.leaf} label='Under 10"' sub="1 tap/tree"/>
        <Opt val="medium" cur={trunkSize} set={setTrunkSize} Icon={I.tree} label='10–18"'    sub="1–2 taps"/>
        <Opt val="large"  cur={trunkSize} set={setTrunkSize} Icon={I.mapleLeaf} label='Over 18"'  sub="2–3 taps"/>
      </div>
    </div>,

    // 1 — System
    <div key="s1">
      <p style={{fontSize:13,color:'#7f92a6',marginBottom:18,lineHeight:1.6}}>
        Your system type is the biggest lever on how much sap you collect per tap.
      </p>
      <label style={{fontSize:13,fontWeight:700,color:'#7f92a6',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:10}}>Tap system</label>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:18}}>
        <Opt val="gravity" cur={systemType} set={setSystemType} Icon={I.droplet} label="Gravity" sub={`Natural flow\n${YIELD_MODELS.gravity.low}–${YIELD_MODELS.gravity.high} gal/tap`}/>
        <Opt val="vacuum"  cur={systemType} set={setSystemType} Icon={I.wind} label="Vacuum"  sub={`Pump-assisted\n${YIELD_MODELS.vacuum.low}–${YIELD_MODELS.vacuum.high} gal/tap`}/>
      </div>
      <label style={{fontSize:13,fontWeight:700,color:'#7f92a6',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:10}}>Collection method</label>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <Opt val="buckets"  cur={collectionType} set={setCollectionType} Icon={I.bucket} label="Buckets"  sub="Classic, manual"/>
        <Opt val="mainline" cur={collectionType} set={setCollectionType} Icon={I.link} label="Mainline" sub="Flows to tank"/>
      </div>
    </div>,

    // 2 — Evaporator
    <div key="s2">
      <p style={{fontSize:13,color:'#7f92a6',marginBottom:18,lineHeight:1.6}}>
        Your evaporator size determines how many sessions your season will take.
      </p>
      <label style={{fontSize:13,fontWeight:700,color:'#7f92a6',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:10}}>Do you have an evaporator?</label>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:18}}>
        <Opt val={true}  cur={hasEvap} set={setHasEvap} Icon={I.check} label="Yes, I do"  sub="Ready to boil"/>
        <Opt val={false} cur={hasEvap} set={setHasEvap} Icon={I.clipboard} label="Not yet"    sub="Planning ahead"/>
      </div>
      {hasEvap && <>
        <label style={{fontSize:13,fontWeight:700,color:'#7f92a6',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:10}}>Pan size</label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(56px,1fr))',gap:6,marginBottom:18}}>
          {['2x3','2x4','2x6','2x8','3x8','3x10','4x12','4x14','5x16'].map(sz=>(
            <button key={sz} onClick={()=>setPanSize(sz)}
              style={{padding:'9px 4px',borderRadius:10,border:`2px solid ${panSize===sz?'#2dd4a7':'#1e2d3d'}`,
                background:panSize===sz?'rgba(45,212,167,0.09)':'#0a1420',cursor:'pointer',transition:'all 0.15s',textAlign:'center'}}>
              <div style={{fontSize:13,fontWeight:700,color:panSize===sz?'#2dd4a7':'#c9d1d9'}}>{sz}</div>
              <div style={{fontSize:12,color:'#7f92a6',marginTop:2}}>{evapRates[sz]}gph</div>
            </button>
          ))}
        </div>
      </>}
      <label style={{fontSize:13,fontWeight:700,color:'#7f92a6',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:10}}>Fuel type</label>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {[['Firewood (cord)',I.firewood,'Wood-fired'],['Oil (gallon)',I.fuel,'Oil burner'],
          ['Propane (gallon)',I.flame,'Propane'],['Natural Gas (ccf)',I.zap,'Gas line']].map(([v,Ico,desc])=>(
          <Opt key={v} val={v} cur={wizFuelType} set={setWizFuelType} Icon={Ico} label={v.split(' ')[0]} sub={desc} wide/>
        ))}
      </div>
    </div>,

    // 3 — Costs
    <div key="s3">
      <p style={{fontSize:13,color:'#7f92a6',marginBottom:18,lineHeight:1.6}}>
        Two numbers that unlock the full financial picture of your operation.
      </p>
      <div style={{marginBottom:18}}>
        <label style={{fontSize:13,fontWeight:700,color:'#7f92a6',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:8}}>
          Fuel cost this season ({wizFuelType})
        </label>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{color:'#7f92a6',fontSize:16,flexShrink:0}}>$</span>
          <input aria-label={`Fuel cost this season in dollars (${wizFuelType})`} type="number" value={fuelCostVal} onChange={e=>setFuelCostVal(e.target.value)}
            placeholder={wizFuelType.includes('Firewood')?'300':'120'} min="0"
            style={{flex:1,background:'#0a1420',border:'1.5px solid #1e2d3d',borderRadius:10,
              padding:'11px 14px',color:'#e6edf3',fontSize:15,outline:'none'}}/>
        </div>
        <div style={{fontSize:13,color:'#7f92a6',marginTop:4}}>Whole-season total, for break-even. Your price per cord or gallon is set on the Evap tab.</div>
      </div>
      <div style={{marginBottom:18}}>
        <label style={{fontSize:13,fontWeight:700,color:'#7f92a6',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:8}}>
          Syrup selling price (per gallon)
        </label>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{color:'#7f92a6',fontSize:16,flexShrink:0}}>$</span>
          <input aria-label="Syrup selling price per gallon, in dollars" type="number" value={syrupPrice} onChange={e=>setSyrupPrice(e.target.value)}
            placeholder="40" min="0"
            style={{flex:1,background:'#0a1420',border:'1.5px solid #1e2d3d',borderRadius:10,
              padding:'11px 14px',color:'#e6edf3',fontSize:15,outline:'none'}}/>
        </div>
        <div style={{fontSize:13,color:'#7f92a6',marginTop:4}}>Retail bulk maple typically sells $35–$70/gal.</div>
      </div>
      {trees > 0 && (
        <div style={{background:'rgba(63,185,80,0.06)',border:'1px solid rgba(63,185,80,0.2)',borderRadius:12,padding:'14px 16px'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#3fb950',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Revenue Snapshot</div>
          <div style={{fontSize:13,color:'#c9d1d9',lineHeight:1.9}}>
            <div>Bad year: <span style={{color:'#e0a44a',fontWeight:700}}>{syrupLow.toFixed(1)} gal → ${(syrupLow * price).toFixed(0)}</span></div>
            <div>Average: <span style={{color:'#2dd4a7',fontWeight:700}}>{syrupMid.toFixed(1)} gal → ${(syrupMid * price).toFixed(0)}</span></div>
            <div>Great year: <span style={{color:'#3fb950',fontWeight:700}}>{syrupHigh.toFixed(1)} gal → ${(syrupHigh * price).toFixed(0)}</span></div>
          </div>
        </div>
      )}
    </div>,

    // 4 — Season Plan
    <div key="s4">
      {trees > 0 ? <>
        <div style={{background:'linear-gradient(135deg,#071a0e,#0a2010)',border:'1px solid #1a4a25',borderRadius:14,padding:'16px 18px',marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:'#3fb950',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>
            <I.mapleLeaf size={19} color="#2dd4a7" /> Your {new Date().getFullYear()} Season Plan
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            {[
              [recTaps,        'Recommended taps',   '#2dd4a7'],
              [syrupLow.toFixed(0)+'–'+syrupHigh.toFixed(0), 'Expected gal syrup','#a78bfa'],
              [sapMid.toLocaleString(), 'Estimated gal sap',  '#58a6ff'],
              ['$'+(syrupMid*price).toFixed(0), 'Avg season revenue','#e0a44a'],
            ].map(([val,lbl,clr],i)=>(
              <div key={i} style={{textAlign:'center',background:'rgba(0,0,0,0.25)',borderRadius:10,padding:'12px 8px'}}>
                <div style={{fontSize:24,fontWeight:800,color:clr,lineHeight:1}}>{val}</div>
                <div style={{fontSize:12,color:'#7f92a6',marginTop:4}}>{lbl}</div>
              </div>
            ))}
          </div>
          {hasEvap && sessions && (
            <div style={{paddingTop:12,borderTop:'1px solid #1a4a25',display:'flex',gap:20,justifyContent:'center'}}>
              <div style={{textAlign:'center'}}>
                <span style={{fontSize:18,fontWeight:700,color:'#e0a44a'}}>{sessions}</span>
                <span style={{fontSize:13,color:'#7f92a6',display:'block'}}>evap sessions</span>
              </div>
              {firewood && (
                <div style={{textAlign:'center'}}>
                  <span style={{fontSize:18,fontWeight:700,color:'#e8865a'}}>{firewood}</span>
                  <span style={{fontSize:13,color:'#7f92a6',display:'block'}}>cords wood</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{background:'#0a1420',border:'1px solid #1e2d3d',borderRadius:12,padding:'14px 16px'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#58a6ff',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}><I.calendar size={13} color="#58a6ff" /> Season Checklist</div>
          {[
            ['Feb · Prep',       'Inspect all equipment, drill bits, spouts, lines. Order supplies now — stock runs out.',  '#2dd4a7'],
            ['Late Feb · Watch', 'Monitor 10-day forecast. Look for 40°F+ days with sub-freezing nights.',                  '#58a6ff'],
            ['First Run',        "Tap when the forecast shows the pattern. Don't wait — early sap is your best.",           '#3fb950'],
            ['During Season',    'Collect sap within 24–48 hrs. Refrigerate if not boiling same day. Log every run.',       '#e0a44a'],
            ['Late Season',      'Watch for buddy sap (cloudy, off-taste). Pull taps when buds swell.',                     '#a78bfa'],
            ['After Season',     "Clean lines, store equipment dry, log final numbers in SweetRun's Recap tab.",            '#e8865a'],
          ].map(([title,desc,clr],i,arr)=>(
            <div key={i} style={{display:'flex',gap:10,marginBottom:i<arr.length-1?10:0,paddingBottom:i<arr.length-1?10:0,borderBottom:i<arr.length-1?'1px solid #131e2c':'none'}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:clr,marginTop:5,flexShrink:0}}/>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#c9d1d9',marginBottom:2}}>{title}</div>
                <div style={{fontSize:13,color:'#7f92a6',lineHeight:1.5}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </> : (
        <div style={{textAlign:'center',padding:'28px 20px',color:'#7f92a6'}}>
          <div style={{fontSize:14,color:'#e6edf3',marginBottom:6,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><I.tree size={20} color="#7f92a6" /> Go back and enter your tree count</div>
          <div style={{fontSize:12}}>to generate your personalized season plan.</div>
        </div>
      )}
    </div>,
  ];

  return (
    <div className="scrim" style={{zIndex:9000}}>
      <div className="sheet" style={{maxHeight:'92vh',overflowX:'hidden'}}>
        <div className="sheet-handle" />
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:'#2dd4a7',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
                {React.createElement(stepIcons[step], { size:14, color:'#2dd4a7' })}
                Step {step+1} of {STEPS}
              </span>
            </div>
            <div style={{fontSize:20,fontWeight:800,color:'#e6edf3'}}>{stepTitles[step]}</div>
          </div>
          <button onClick={onClose}
            style={{background:'none',border:'none',color:'#7f92a6',padding:4,cursor:'pointer',display:'flex'}}>
            <I.x size={20} color="#7f92a6"/>
          </button>
        </div>
        {/* Progress */}
        <div style={{height:3,background:'#131e2c',borderRadius:3,marginBottom:22,overflow:'hidden'}}>
          <div style={{height:'100%',borderRadius:3,background:'linear-gradient(90deg,#2dd4a7,#58a6ff)',
            width:`${((step+1)/STEPS)*100}%`,transition:'width 0.35s ease'}}/>
        </div>
        {/* Content */}
        <div style={{minHeight:260}}>{steps[step]}</div>
        {/* Nav */}
        <div style={{display:'flex',gap:10,marginTop:22}}>
          {step > 0 && (
            <button onClick={goBack}
              style={{flex:1,padding:'13px',borderRadius:12,border:'1px solid #1e2d3d',
                background:'transparent',color:'#7f92a6',fontSize:14,fontWeight:600,cursor:'pointer'}}>
              ← Back
            </button>
          )}
          {step < STEPS-1 ? (
            <button onClick={goNext} disabled={!canNext}
              style={{flex:2,padding:'13px',borderRadius:12,border:'none',
                background:canNext?'#2dd4a7':'#131e2c',
                color:canNext?'#07090f':'#7f92a6',fontSize:14,fontWeight:700,
                cursor:canNext?'pointer':'not-allowed',transition:'all 0.15s'}}>
              Continue →
            </button>
          ) : (
            <button onClick={finish}
              style={{flex:2,padding:'13px',borderRadius:12,border:'none',
                background:'#3fb950',color:'#fff',
                fontSize:14,fontWeight:700,cursor:'pointer'}}>
              <I.mapleLeaf size={17} color="#07090f" /> Start My Season
            </button>
          )}
        </div>
        {step === 0 && (
          <div style={{textAlign:'center',marginTop:12}}>
            <button onClick={onClose}
              style={{background:'none',border:'none',color:'#7f92a6',fontSize:12,cursor:'pointer'}}>
              Skip — I'll set up later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


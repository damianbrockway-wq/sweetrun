function SugarSageTab({ season, sapBrix, trees, units }) {
  const [query,        setQuery]        = React.useState('');
  const [activeCat,    setActiveCat]    = React.useState('all');
  const [results,      setResults]      = React.useState([]);
  const [searched,     setSearched]     = React.useState(false);
  const [expandedId,   setExpandedId]   = React.useState(null);
  const [showSeason,   setShowSeason]   = React.useState(true);
  const [promptIdx,    setPromptIdx]    = React.useState(0);
  const [promptFade,   setPromptFade]   = React.useState(true);
  const inputRef = React.useRef(null);

  const prompts = [
    'How can SugarSage help today?',
    'What would you like to know?',
    'Ask about yields, vacuum, RO, or anything maple.',
    'What are you working on this season?',
    'Ready when you are.',
    'What\'s on your mind?',
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPromptFade(false);
      setTimeout(() => {
        setPromptIdx(i => (i + 1) % prompts.length);
        setPromptFade(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const slog  = ls.get('sg_logs2', {})[season] || {};
  const roGal = (slog.sapRO||[]).reduce((s,e)=>s+(parseFloat(e.val)||0),0);
  const ctx   = { hasRO: roGal>0, hasVacuum: ls.get('sg_dx_vac','gravity')!=='gravity', trees: trees||0 };

  const doSearch = React.useCallback(() => {
    if (!query.trim() && activeCat==='all') { setResults([]); setSearched(false); return; }
    let res = query.trim() ? ssSearch(query, ctx) : SS_KB.filter(e=>e.cat===activeCat);
    if (activeCat !== 'all') res = res.filter(e=>e.cat===activeCat);
    setResults(res); setSearched(true);
  }, [query, activeCat]);

  React.useEffect(() => {
    const id = setTimeout(doSearch, 300);
    return () => clearTimeout(id);
  }, [doSearch]);

  const handleSubmit = (e) => { e.preventDefault(); doSearch(); };
  const clearSearch  = () => { setQuery(''); setResults([]); setSearched(false); setActiveCat('all'); inputRef.current?.focus(); };

  const catEntries  = activeCat==='all' ? SS_KB : SS_KB.filter(e=>e.cat===activeCat);
  const displayList = searched ? results : (activeCat!=='all' ? catEntries : []);
  // An answer (or category browse) is on screen — results take the stage.
  const showingResults = displayList.length > 0;

  const CAT_LABELS = {
    all:'All', biology:'Biology', tapping:'Tapping', vacuum:'Vacuum',
    ro:'R/O', evaporation:'Evaporation', finishing:'Finishing', weather:'Weather',
    tree_health:'Tree Health', business:'Business', lines:'Lines', troubleshooting:'Troubleshoot',
  };

  return (
    <div style={{maxWidth:740,margin:'0 auto',padding:'0 0 80px'}}>

      {/* ── Hero header ── */}
      <div style={{textAlign:'center',padding:'32px 16px 24px',borderBottom:'1px solid #1e2d3d',marginBottom:0}}>
        <div style={{fontSize:13,color:'#3fb950',fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:10}}><I.mapleLeaf size={14} color="#3fb950" /> Maple Intelligence</div>
        <div style={{fontSize:36,fontWeight:900,color:'#c9d1d9',letterSpacing:'-1px',lineHeight:1,marginBottom:14}}>SugarSage</div>
        <div style={{
          fontSize:16,color:'#7f92a6',fontWeight:400,minHeight:24,
          opacity: promptFade ? 1 : 0,
          transition:'opacity 0.35s ease',
        }}>{prompts[promptIdx]}</div>
      </div>

      {/* ── Search form ── */}
      <div style={{padding:'20px 0 0',marginBottom:16}}>
        <form onSubmit={handleSubmit} style={{display:'flex',gap:0,position:'relative'}}>
          <input
            ref={inputRef}
            value={query}
            onChange={e=>{setQuery(e.target.value);setExpandedId(null);}}
            aria-label="Ask SugarSage a question about maple production"
            placeholder="Ask anything about maple production…"
            style={{flex:1,padding:query?'14px 104px 14px 18px':'14px 64px 14px 18px',fontSize:15,
              border:'1.5px solid #1e2d3d',borderRadius:14,outline:'none',
              background:'#0d1a2b',color:'#c9d1d9',fontFamily:'inherit',
              transition:'border-color 0.15s,box-shadow 0.15s'}}
            onFocus={e=>{e.target.style.borderColor='#3fb950';e.target.style.boxShadow='0 0 0 3px #3fb95018';}}
            onBlur={e=>{e.target.style.borderColor='#1e2d3d';e.target.style.boxShadow='none';}}
          />
          {/* The Ask action never disappears; clear is its own small ×.
              Enter submits the form (this is the one submit button). */}
          {query && (
            <button type="button" onClick={clearSearch} aria-label="Clear question"
              style={{position:'absolute',right:66,top:'50%',transform:'translateY(-50%)',
                background:'none',border:'none',cursor:'pointer',color:'#7f92a6',fontSize:15,
                display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,borderRadius:8}}>✕</button>
          )}
          <button type="submit"
            style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',
              background:'#3fb950',border:'none',cursor:'pointer',color:'#07090f',
              borderRadius:8,padding:'6px 12px',fontSize:13,fontWeight:700,
              display:'flex',alignItems:'center',gap:4}}>Ask</button>
        </form>

        {/* Suggestion chips */}
        {!searched && activeCat==='all' && (
          <div style={{display:'flex',flexWrap:'wrap',gap:7,marginTop:12}}>
            {['Why does sap flow?','How does RO work?','Best vacuum level','Niter in syrup','Yield per tap','Off-flavors'].map(s=>(
              <button key={s} onClick={()=>{setQuery(s); setTimeout(doSearch,50);}}
                style={{padding:'6px 13px',borderRadius:20,border:'1px solid #1e2d3d',
                  background:'transparent',color:'#7f92a6',fontSize:12,cursor:'pointer',
                  transition:'all 0.15s'}}
                onMouseEnter={e=>{e.target.style.borderColor='#3fb950';e.target.style.color='#c9d1d9';}}
                onMouseLeave={e=>{e.target.style.borderColor='#1e2d3d';e.target.style.color='#7f92a6';}}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Category filter ── */}
      <div style={{display:'flex',overflowX:'auto',gap:4,marginBottom:20,paddingBottom:4,
        scrollbarWidth:'none',WebkitOverflowScrolling:'touch'}}>
        {['all','biology','tapping','vacuum','ro','evaporation','finishing','weather','tree_health','business','lines','troubleshooting'].map(id=>{
          const active = activeCat===id;
          return (
            <button key={id} onClick={()=>{setActiveCat(id);setExpandedId(null);}}
              style={{padding:'5px 14px',borderRadius:20,fontSize:13,fontWeight:600,cursor:'pointer',
                whiteSpace:'nowrap',flexShrink:0,
                border:`1px solid ${active?'#3fb950':'#1e2d3d'}`,
                background: active?'#3fb950':'transparent',
                color: active?'#07090f':'#7f92a6',
                transition:'all 0.15s'}}>
              {CAT_LABELS[id]}
            </button>
          );
        })}
      </div>

      {/* ── Results — FIRST, directly under the question, so asking never
          dead-ends below the dashboard. The dashboard and break-even step
          aside while an answer is on screen and return on clear. ── */}
      {showingResults && (
        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:16}}>
          {displayList.map(entry=>(
            <SageCard key={entry.id} entry={entry} expanded={expandedId===entry.id}
              onToggle={()=>setExpandedId(expandedId===entry.id ? null : entry.id)}/>
          ))}
        </div>
      )}

      {searched && results.length===0 && (
        <div style={{textAlign:'center',padding:'32px 20px'}}>
          <div style={{fontSize:14,fontWeight:600,color:'#7f92a6',marginBottom:6}}>No results found</div>
          <div style={{fontSize:12,color:'#7f92a6'}}>Try different keywords, or browse a category above.</div>
        </div>
      )}

      {/* ── Season intelligence toggle ── */}
      {!showingResults && (<>
      <button onClick={()=>setShowSeason(v=>!v)}
        style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',
          background:'#0d1a2b',border:'1px solid #1e2d3d',borderRadius:10,
          padding:'10px 16px',cursor:'pointer',marginBottom: showSeason?0:16,
          borderBottomLeftRadius: showSeason?0:10, borderBottomRightRadius: showSeason?0:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#3fb950'}}/>
          <span style={{fontSize:12,fontWeight:700,color:'#7f92a6',letterSpacing:'0.06em',textTransform:'uppercase'}}>Your Season Dashboard</span>
        </div>
        <span style={{fontSize:13,color:'#7f92a6'}}>{showSeason?'Hide ▲':'Show ▼'}</span>
      </button>
      {showSeason && (
        <div style={{border:'1px solid #1e2d3d',borderTop:'none',borderRadius:'0 0 10px 10px',marginBottom:16,overflow:'hidden'}}>
          <SeasonIntelligence season={season} sapBrix={sapBrix} trees={trees} units={units}/>
        </div>
      )}

      {/* ── Breakeven Calculator ── */}
      <BreakevenCalculator trees={trees} units={units} />

      {/* ── Empty state ── */}
      {!searched && activeCat==='all' && (
        <div style={{textAlign:'center',padding:'24px 20px 8px',color:'#7f92a6'}}>
          <div style={{fontSize:12,lineHeight:1.8}}>
            Sourced from UVM Proctor, Cornell Maple Program, and leading maple research.
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}

function SageCard({ entry, expanded, onToggle }) {
  const catColors = {
    biology:'#3fb950', tapping:'#e0a44a', vacuum:'#58a6ff', ro:'#22d3ee',
    evaporation:'#e0a44a', finishing:'#c990ff', weather:'#58a6ff',
    tree_health:'#3fb950', business:'#58a6ff', lines:'#7f92a6', troubleshooting:'#f85149',
  };
  const CAT_LABELS = {
    biology:'Biology', tapping:'Tapping', vacuum:'Vacuum', ro:'R/O',
    evaporation:'Evaporation', finishing:'Finishing', weather:'Weather',
    tree_health:'Tree Health', business:'Business', lines:'Lines', troubleshooting:'Troubleshoot',
  };
  const color    = catColors[entry.cat] || '#7f92a6';
  const catLabel = CAT_LABELS[entry.cat] || entry.cat;

  return (
    <div style={{background:'#0d1a2b',border:'1px solid #1e2d3d',borderLeft:`3px solid ${color}`,
      borderRadius:'0 10px 10px 0',overflow:'hidden'}}>
      <button onClick={onToggle}
        style={{width:'100%',textAlign:'left',padding:'13px 16px',background:'none',border:'none',
          cursor:'pointer',display:'flex',alignItems:'flex-start',gap:10}}>
        <div style={{flex:1}}>
          <div style={{marginBottom:4}}>
            <span style={{fontSize:12,fontWeight:700,color,textTransform:'uppercase',letterSpacing:'0.06em'}}>
              {catLabel}
            </span>
          </div>
          <div style={{fontSize:14,fontWeight:600,color:'#c9d1d9',lineHeight:1.4}}>{entry.q}</div>
          {!expanded && (
            <div style={{fontSize:12,color:'#7f92a6',marginTop:4,lineHeight:1.55,
              overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
              {entry.a.substring(0,160)}…
            </div>
          )}
        </div>
        <span style={{fontSize:13,color:'#7f92a6',marginTop:2,flexShrink:0,marginLeft:8}}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>
      {expanded && (
        <div style={{padding:'0 16px 16px',borderTop:'1px solid #1e2d3d'}}>
          <p style={{fontSize:13,lineHeight:1.8,color:'#7f92a6',margin:'12px 0 14px'}}>{entry.a}</p>
          {entry.tip && (
            <div style={{borderLeft:`2px solid ${color}`,paddingLeft:12,marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color,letterSpacing:'0.08em',marginBottom:4,textTransform:'uppercase'}}>Pro tip</div>
              <div style={{fontSize:12,color:'#7f92a6',lineHeight:1.65}}>{entry.tip}</div>
            </div>
          )}
          <div style={{fontSize:12,color:'#7f92a6',lineHeight:1.5,borderTop:'1px solid #1e2d3d',paddingTop:10,marginTop:4}}>
            <span style={{color:'#7f92a6',fontWeight:600}}>Source: </span>{entry.src}
          </div>
        </div>
      )}
    </div>
  );
}


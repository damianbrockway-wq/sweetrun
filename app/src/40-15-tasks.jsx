// ─── TASKS TAB ────────────────────────────────────────────────────────────────
function TasksTab({ season, lang='en' }) {
  const [phase,  setPhase]  = useState('pre');
  const [checks, setChecks] = useState(()=>ls.get('sg_checks2',{}));
  const [custom, setCustom] = useState(()=>ls.get('sg_custom2',{pre:[],post:[]}));
  const [newT,   setNewT]   = useState('');
  useEffect(()=>{ ls.set('sg_checks2',checks); },[checks]);
  useEffect(()=>{ ls.set('sg_custom2',custom);  },[custom]);

  const key    = `${season}-${phase}`;
  const base   = phase==='pre' ? PRE_TASKS : POST_TASKS;
  const cust   = custom[phase]||[];
  const all    = [...base,...cust];
  const chk    = checks[key]||{};
  const done   = all.filter((_,i)=>chk[i]).length;
  const pct    = all.length>0 ? Math.round((done/all.length)*100) : 0;
  const toggle = i => setChecks(p=>({...p,[key]:{...chk,[i]:!chk[i]}}));
  const reset  = () => { const up={...checks}; delete up[key]; setChecks(up); };
  const addT   = () => { if(!newT.trim())return; setCustom(p=>({...p,[phase]:[...(p[phase]||[]),newT.trim()]})); setNewT(''); };
  const remT   = idx => { setCustom(p=>({...p,[phase]:(p[phase]||[]).filter((_,i)=>i!==idx)})); };

  return (
    <div>
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <I.clipboard size={22} color="#e6edf3" />
            <span style={{ fontWeight:700, fontSize:18 }}>{t(lang,'seasonChecklists')}</span>
            <span className="badge">{season}</span>
          </div>
          <button onClick={reset} title="Reset" style={{ background:'none', border:'none', color:'#7f92a6', display:'flex', padding:4 }}><I.refresh size={18} color="#7f92a6" /></button>
        </div>
        <div className="two-col" style={{ marginBottom:12, gap:6 }}>
          <button onClick={()=>setPhase('pre')}  style={{ background:phase==='pre'?'#2dd4a7':'#0f1720', color:phase==='pre'?'#07090f':'#7f92a6', border:`1px solid ${phase==='pre'?'transparent':'#1e2d3d'}`, borderRadius:11, padding:11, fontWeight:700, fontSize:14, boxShadow:phase==='pre'?'0 3px 14px rgba(45,212,167,0.28)':'none', transition:'all 0.18s' }}>{t(lang,'preSeason')}</button>
          <button onClick={()=>setPhase('post')} style={{ background:phase==='post'?'#e0a44a':'#0f1720', color:phase==='post'?'#07090f':'#7f92a6', border:`1px solid ${phase==='post'?'transparent':'#1e2d3d'}`, borderRadius:11, padding:11, fontWeight:700, fontSize:14, boxShadow:phase==='post'?'0 3px 14px rgba(224,164,74,0.28)':'none', transition:'all 0.18s' }}>{t(lang,'postSeason')}</button>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:14, color:'#7f92a6' }}>
          <span>{done} {t(lang,'taskOf')} {all.length} {t(lang,'taskDone')}</span><span>{pct}%</span>
        </div>
        <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width:`${pct}%`, background:phase==='pre'?'#2dd4a7':'#e0a44a' }} /></div>
      </div>

      <div className="card" style={{ padding:0 }}>
        {all.map((task,i)=>{
          const isC = i>=base.length;
          return (
            <div key={i} className="checklist-item" onClick={()=>toggle(i)}>
              <div className={`checkbox${chk[i]?' checked':''}`}>{chk[i]&&<I.check size={13} color="#0d1117" />}</div>
              <span style={{ flex:1, fontSize:15, color:chk[i]?'#6e7681':'#e6edf3', textDecoration:chk[i]?'line-through':'none', lineHeight:1.4 }}>{task}</span>
              {isC && <button onClick={e=>{e.stopPropagation();remT(i-base.length);}} aria-label="Delete this task" title="Delete task" className="delete-btn"><I.x size={15} /></button>}
            </div>
          );
        })}
        <div style={{ padding:'12px 16px', display:'flex', gap:8, alignItems:'center' }}>
          <input aria-label={t(lang,'addCustomTask')} type="text" placeholder={t(lang,'addCustomTask')} value={newT} onChange={e=>setNewT(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addT()} style={{ flex:1, background:'transparent', border:'none', borderBottom:'1px solid #30363d', borderRadius:0, padding:'6px 0', color:'#e6edf3' }} />
          {newT && <button onClick={addT} style={{ background:'#2dd4a7', border:'none', borderRadius:8, padding:'6px 14px', fontWeight:600, color:'#0d1117', fontSize:14 }}>Add</button>}
        </div>
      </div>
    </div>
  );
}


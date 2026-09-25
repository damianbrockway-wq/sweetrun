// ─── SETTINGS SHEET ───────────────────────────────────────────────────────────
// Units, language, the setup wizard and backup used to live as four pill groups
// in the header, which pushed the header to 250px on a 390px phone. They are
// here now, one tap behind the gear.
function SettingsSheet({ units, setUnits, lang, setLang, season, setSeason,
                         onWizard, onBackup, onClose }) {
  const Row = ({ label, hint, children }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
      padding:'14px 0', borderBottom:'1px solid #131e2c' }}>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:650, color:'#e6edf3' }}>{label}</div>
        {hint && <div style={{ fontSize:12, color:'#7f92a6', marginTop:2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  );
  const Seg = ({ opts, val, set, tint }) => (
    <div style={{ display:'flex', background:'#0f1720', border:'1px solid #1e2d3d', borderRadius:10, padding:2 }}>
      {opts.map(o => (
        <button key={o.v} onClick={()=>set(o.v)} aria-pressed={val===o.v}
          style={{ background: val===o.v ? 'rgba(45,212,167,0.16)' : 'transparent', color: val===o.v ? '#2dd4a7' : '#7f92a6',
            border:'none', borderRadius:8, padding:'8px 15px', fontSize:13, fontWeight:700,
            cursor:'pointer', minHeight:38 }}>{o.l}</button>
      ))}
    </div>
  );
  const Action = ({ Icon, label, hint, tint, onClick }) => (
    <button onClick={onClick} style={{ width:'100%', background:'#0f1720', border:'1px solid #1e2d3d',
      borderRadius:12, padding:'13px 14px', display:'flex', alignItems:'center', gap:11,
      cursor:'pointer', textAlign:'left', minHeight:58, marginTop:8 }}>
      <Icon size={18} color={tint} />
      <span style={{ flex:1, minWidth:0 }}>
        <span style={{ display:'block', fontSize:14, fontWeight:650, color:'#e6edf3' }}>{label}</span>
        <span style={{ display:'block', fontSize:12, color:'#7f92a6', marginTop:1 }}>{hint}</span>
      </span>
      <span style={{ color:'#7f92a6' }}>›</span>
    </button>
  );
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Settings" className="scrim">
      <div onClick={e=>e.stopPropagation()} className="sheet">
        <div className="sheet-handle" />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <div style={{ fontWeight:800, fontSize:17 }}>Settings</div>
          <button onClick={onClose} aria-label="Close settings"
            style={{ background:'none', border:'none', color:'#7f92a6', cursor:'pointer', padding:6 }}>
            <I.x size={17} />
          </button>
        </div>

        <Row label="Units" hint="Gallons or litres, everywhere">
          <Seg opts={[{v:'GAL',l:'GAL'},{v:'L',l:'L'}]} val={units} set={setUnits} tint="#2dd4a7" />
        </Row>
        <Row label="Language">
          <Seg opts={[{v:'en',l:'EN'},{v:'fr',l:'FR'}]} val={lang} set={setLang} tint="#2dd4a7" />
        </Row>
        <Row label="Season" hint="Which year your log and recap show">
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <button onClick={()=>setSeason(s=>s-1)} aria-label="Previous season"
              style={{ background:'#0f1720', border:'1px solid #1e2d3d', borderRadius:10, width:44, height:44,
                color:'#7f92a6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <I.chevDown size={15} color="#7f92a6" />
            </button>
            <span style={{ fontSize:15, fontWeight:700, minWidth:48, textAlign:'center' }}>{season}</span>
            <button onClick={()=>setSeason(s=>s+1)} aria-label="Next season"
              style={{ background:'#0f1720', border:'1px solid #1e2d3d', borderRadius:10, width:44, height:44,
                color:'#7f92a6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <I.chevUp size={15} color="#7f92a6" />
            </button>
          </div>
        </Row>

        <div style={{ marginTop:16 }}>
          <Action Icon={I.compass} tint="#2dd4a7" label="Season setup"
            hint="Trees, tap system, evaporator and costs" onClick={()=>{ onClose(); onWizard(); }} />
          <Action Icon={I.save} tint="#2dd4a7" label="Data and backup"
            hint="Download a copy, or restore one" onClick={()=>{ onClose(); onBackup(); }} />
        </div>
      </div>
    </div>
  );
}


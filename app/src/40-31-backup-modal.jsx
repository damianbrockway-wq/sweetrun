// ─── Data & Backup modal ─────────────────────────────────────────────────────
function BackupModal({ onClose }) {
  const [persisted, setPersisted] = useState(null);
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(setPersisted).catch(()=>{});
    }
  }, []);
  const keyCount = Object.keys(localStorage).filter(k => k.startsWith('sg_')).length;

  const doExport = () => {
    const keys = {};
    Object.keys(localStorage).forEach(k => { if (k.startsWith('sg_')) keys[k] = localStorage.getItem(k); });
    const payload = { app:'SweetRun', format:1, exportedAt:new Date().toISOString(), keys };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(payload)], { type:'application/json' }));
    a.download = `sweetrun-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setMsg({ ok:true, text:`Backup downloaded — ${Object.keys(keys).length} data entries. Keep it somewhere safe (email it to yourself, or save to cloud storage).` });
  };

  const doImport = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!obj || obj.app !== 'SweetRun' || !obj.keys || typeof obj.keys !== 'object') throw new Error('bad format');
        const entries = Object.entries(obj.keys).filter(([k,v]) => k.startsWith('sg_') && typeof v === 'string');
        if (!entries.length) throw new Error('empty');
        const when = obj.exportedAt ? ` from ${String(obj.exportedAt).split('T')[0]}` : '';
        if (!window.confirm(`Restore ${entries.length} data entries${when}?\n\nMatching data on this device will be OVERWRITTEN. The app will reload afterward.`)) return;
        entries.forEach(([k,v]) => { try { localStorage.setItem(k, v); } catch {} });
        window.location.reload();
      } catch {
        setMsg({ ok:false, text:"Couldn't read that file — it doesn't look like a SweetRun backup." });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div onClick={onClose} className="scrim" role="dialog" aria-modal="true" aria-label="Data and backup">
      <div onClick={e=>e.stopPropagation()} className="sheet">
        <div className="sheet-handle" />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <div style={{ fontWeight:800, fontSize:17 }}><I.save size={18} color="#2dd4a7" /> Data &amp; Backup</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#7f92a6', cursor:'pointer', padding:4 }}><I.x size={16}/></button>
        </div>
        <div style={{ fontSize:13, color:'#7f92a6', lineHeight:1.5, marginBottom:14 }}>
          All your SweetRun data lives on this device only ({keyCount} entries). Download a backup after each session you care about — it's the only copy that exists.
        </div>
        {persisted === false && (
          <div style={{ background:'rgba(244,164,74,0.08)', border:'1px solid rgba(244,164,74,0.3)', borderRadius:10, padding:'10px 12px', fontSize:12, color:'#e0a44a', lineHeight:1.5, marginBottom:14 }}>
            <I.alert size={13} color="currentColor" /> Your browser hasn't guaranteed persistent storage. If you use SweetRun in a browser tab (not installed to your home screen) and don't open it for a while, the browser may erase your data. Install the app and keep backups.
          </div>
        )}
        <button onClick={doExport} style={{ width:'100%', background:'#2dd4a7', border:'none', borderRadius:10, padding:'12px 16px', fontWeight:700, fontSize:14, color:'#07090f', cursor:'pointer', marginBottom:10 }}>
          ⬇ Download backup (.json)
        </button>
        <label style={{ display:'block', width:'100%', background:'#0f1720', border:'1px solid #1e2d3d', borderRadius:10, padding:'12px 16px', fontWeight:700, fontSize:14, color:'#7f92a6', cursor:'pointer', textAlign:'center' }}>
          <I.upload size={15} color="#7f92a6" /> Restore from backup…
          <input type="file" accept=".json,application/json" onChange={doImport} style={{ display:'none' }} />
        </label>
        {msg && (
          <div style={{ marginTop:12, fontSize:12.5, lineHeight:1.5, color: msg.ok ? '#3fb950' : '#f85149' }}>{msg.text}</div>
        )}
      </div>
    </div>
  );
}


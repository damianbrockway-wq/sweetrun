// ─── License / Season Pass modal ─────────────────────────────────────────────
function LicenseModal({ onClose, lic, onLicenseSaved }) {
  const [key, setKey] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const [emailMsg, setEmailMsg] = useState(null);
  useEffect(() => { ls.set('sg_email_prompted', true); }, []);

  const applyKey = async () => {
    const payload = await verifyLicense(key);
    if (!payload) { setMsg({ ok:false, text:"That key doesn't look right — check for missing characters, or email hello@sweetrun.app and I'll sort it out." }); return; }
    if (payload.expired) { setMsg({ ok:false, text:`This Season Pass expired ${payload.x}. Grab a new one below.` }); return; }
    SR_LOCKED = false; _srClear();
    ls.set('sg_license', key.trim());
    setMsg({ ok:true, text:`✓ Season Pass active through ${payload.x}. Boil on!` });
    onLicenseSaved(payload);
  };
  const saveEmail = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setEmailMsg("That email doesn't look complete."); return; }
    try { await pingEvent('trial_email', email); setEmailMsg("✓ Got it — you're on the list."); }
    catch { setEmailMsg("Didn't go through — try again in a bit?"); }
  };

  const inp = { width:'100%', background:'#0f1720', border:'1px solid #1e2d3d', borderRadius:10, padding:'12px 14px', color:'#e6edf3', fontSize:14, marginBottom:8, boxSizing:'border-box' };
  return (
    <div onClick={onClose} className="scrim" role="dialog" aria-modal="true" aria-label="Season Pass">
      <div onClick={e=>e.stopPropagation()} className="sheet">
        <div className="sheet-handle" />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <div style={{ fontWeight:800, fontSize:17 }}><I.mapleLeaf size={18} color="#2dd4a7" /> Season Pass</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#7f92a6', cursor:'pointer', padding:4 }}><I.x size={16}/></button>
        </div>
        {lic.status === 'licensed' ? (
          <div style={{ fontSize:13.5, color:'#3fb950', lineHeight:1.6, marginBottom:8 }}>✓ Your Season Pass is active through {lic.until}. Thank you for supporting a one-person project.</div>
        ) : (
          <div style={{ fontSize:13, color:'#7f92a6', lineHeight:1.5, marginBottom:14 }}>
            {lic.status === 'expired'
              ? 'Your Season Trial has ended. Your data is safe — viewing and export always work — but new entries need a pass.'
              : `You're on a free Season Trial (${lic.daysLeft} days left — and it never ends before you've had 3 real sap days). Every feature is unlocked.`}
          </div>
        )}
        {lic.status !== 'licensed' && (
          <a href={STRIPE_BUY_URL} target="_blank" rel="noopener"
            style={{ display:'block', textAlign:'center', background:'#2dd4a7', borderRadius:10, padding:'13px 16px', fontWeight:800, fontSize:14, color:'#07090f', textDecoration:'none', marginBottom:14 }}>
            Get your Season Pass — $49.99/year
          </a>
        )}
        <div style={{ fontSize:13, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:'#7f92a6', marginBottom:6 }}>Have a pass key?</div>
        <textarea value={key} onChange={e=>setKey(e.target.value)} placeholder="Paste your Season Pass key here" rows={2} style={{ ...inp, resize:'vertical', fontFamily:'monospace', fontSize:12 }} />
        <button onClick={applyKey} style={{ width:'100%', background:'#0f1720', border:'1px solid #2dd4a7', borderRadius:10, padding:'11px 16px', fontWeight:700, fontSize:13.5, color:'#2dd4a7', cursor:'pointer' }}>Activate</button>
        {msg && <div style={{ marginTop:8, fontSize:12.5, lineHeight:1.5, color: msg.ok ? '#3fb950' : '#f85149' }}>{msg.text}</div>}
        {lic.status !== 'licensed' && (
          <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid #131e2c' }}>
            <div style={{ fontSize:12.5, color:'#7f92a6', lineHeight:1.5, marginBottom:8 }}>Want sap-season tips and a heads-up before your trial ends? <span style={{color:'#7f92a6'}}>(optional)</span></div>
            <input aria-label="you@sugarbush.com" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@sugarbush.com" style={inp} />
            <button onClick={saveEmail} style={{ width:'100%', background:'#0f1720', border:'1px solid #1e2d3d', borderRadius:10, padding:'10px 16px', fontWeight:700, fontSize:13, color:'#7f92a6', cursor:'pointer' }}>Keep me posted</button>
            {emailMsg && <div style={{ marginTop:6, fontSize:12, color:'#7f92a6' }}>{emailMsg}</div>}
          </div>
        )}
      </div>
    </div>
  );
}


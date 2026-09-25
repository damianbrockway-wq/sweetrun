// ─── SAP MONITOR IMPORT ───────────────────────────────────────────────────────
function SapImportModal({ season, onClose, onImport, lang='en' }) {
  const [csvText, setCsvText]   = React.useState('');
  const [preview, setPreview]   = React.useState(null);
  const [error, setError]       = React.useState('');
  const [source, setSource]     = React.useState('sugarcalc_pdf');

  const SOURCES = [
    { id:'sugarcalc_pdf', label:'SugarCalc PDF', hint:'Drop in any SugarCalc Season Report PDF — SweetRun reads it automatically' },
    { id:'sapspy',        label:'SapSpy CSV',     hint:'Exports via Settings → Data Export → CSV' },
    { id:'saptrac',       label:'SapTrac CSV',    hint:'File → Export → Sap Log CSV' },
    { id:'generic',       label:'Generic CSV',    hint:'date, sap_gallons, syrup_gallons columns' },
    { id:'manual',        label:'Paste Raw Data', hint:'Comma-separated: date, sap, syrup' },
  ];

  // ── PDF.js loader + SugarCalc PDF parser ─────────────────────────────────
  const loadPdfJs = () => new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      // Disable worker for iOS/WKWebView compatibility
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(s);
  });

  const parseSugarCalcPDF = async (file) => {
    setError(''); setPreview(null);
    try {
      await loadPdfJs();
      // Use FileReader for iOS Safari compatibility (arrayBuffer() unreliable on iOS)
      const buf = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload  = e => resolve(e.target.result);
        fr.onerror = () => reject(new Error('Could not read file'));
        fr.readAsArrayBuffer(file);
      });
      const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      let fullText = '';
      for (let p = 1; p <= pdf.numPages; p++) {
        const page  = await pdf.getPage(p);
        const items = (await page.getTextContent()).items;
        fullText   += items.map(i => i.str).join(' ') + ' ';
      }
      const CAT_MAP = {
        'Sap Collected':     'sap',
        'Syrup Made':        'syrup',
        'Sap Thru R/O':      'ro',
        'Sap through R/O':   'ro',
        'Sap in Evaporator': 'evap',
      };
      const re = /(\d{1,2}\/\d{1,2}\/\d{4})\s+(Sap Collected|Syrup Made|Sap Thru R\/O|Sap through R\/O|Sap in Evaporator)\s+([\d.]+)/g;
      const rows = [];
      let m;
      while ((m = re.exec(fullText)) !== null) {
        const val = parseFloat(m[3]);
        if (val > 0) rows.push({ date: m[1], cat: CAT_MAP[m[2]], val });
      }
      if (rows.length === 0) {
        setError('No log entries found. Make sure this is a SugarCalc Season Report PDF.');
        return;
      }
      const years = rows.map(r => parseInt(r.date.split('/')[2])).filter(Boolean);
      const detectedYear = years.length ? Math.max(...years) : new Date().getFullYear();
      const totals = { sap:0, syrup:0, ro:0, evap:0 };
      rows.forEach(r => { totals[r.cat] = (totals[r.cat]||0) + r.val; });
      setPreview({ rows, totalSap:totals.sap, totalSyrup:totals.syrup,
        totalRO:totals.ro, totalEvap:totals.evap, detectedYear, isPDF:true });
    } catch(e) {
      setError('Could not read PDF: ' + e.message);
    }
  };

  const parseCSV = (text, src) => {
    setError('');
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) { setError('Need at least a header row and one data row.'); return; }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/['"]/g,''));

    // Auto-detect column indices based on source
    const sapIdx   = headers.findIndex(h => h.includes('sap') && (h.includes('gal') || h.includes('col') || h.includes('vol') || h === 'sap'));
    const syrupIdx = headers.findIndex(h => h.includes('syrup') || h.includes('prod') || h.includes('made'));
    const dateIdx  = headers.findIndex(h => h.includes('date') || h.includes('day') || h.includes('time'));
    const roIdx    = headers.findIndex(h => h.includes('ro') || h.includes('r/o') || h.includes('reverse'));

    if (sapIdx === -1 && syrupIdx === -1) {
      setError('Could not detect sap or syrup columns. Check that your CSV has columns named "sap", "syrup", or similar.');
      return;
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/['"]/g,''));
      const sap   = sapIdx   >= 0 && sapIdx   < cols.length ? parseFloat(cols[sapIdx])   || 0 : 0;
      const syrup = syrupIdx >= 0 && syrupIdx < cols.length ? parseFloat(cols[syrupIdx]) || 0 : 0;
      const ro    = roIdx    >= 0 && roIdx    < cols.length ? parseFloat(cols[roIdx])    || 0 : 0;
      const date  = dateIdx  >= 0 && dateIdx  < cols.length ? cols[dateIdx] : `Day ${i}`;
      if (sap > 0 || syrup > 0 || ro > 0) rows.push({ date, sap, syrup, ro });
    }

    if (rows.length === 0) { setError('No valid data rows found. Check your CSV format.'); return; }

    setPreview({ rows, sapIdx, syrupIdx, dateIdx, roIdx,
      totalSap: rows.reduce((s,r)=>s+r.sap,0),
      totalSyrup: rows.reduce((s,r)=>s+r.syrup,0),
      totalRO: rows.reduce((s,r)=>s+r.ro,0),
    });
  };

  // What this preview would add, keyed by log kind — used by both the dedupe
  // report below and the import itself, so they can never disagree.
  const buildAdditions = () => {
    let newSap=[], newSyrup=[], newRO=[], newEvap=[];
    if (preview.isPDF) {
      const label = 'SugarCalc PDF';
      preview.rows.forEach(r => {
        const entry = { val: r.val, note: `Imported (${label})`, date: r.date };
        if      (r.cat === 'sap')   newSap.push(entry);
        else if (r.cat === 'syrup') newSyrup.push(entry);
        else if (r.cat === 'ro')    newRO.push(entry);
        else if (r.cat === 'evap')  newEvap.push(entry);
      });
    } else {
      newSap   = preview.rows.filter(r=>r.sap>0).map(r=>({ val:r.sap,   note:`Imported (${source})`, date:r.date }));
      newSyrup = preview.rows.filter(r=>r.syrup>0).map(r=>({ val:r.syrup,note:`Imported (${source})`, date:r.date }));
      newRO    = preview.rows.filter(r=>r.ro>0).map(r=>({ val:r.ro,     note:`Imported (${source})`, date:r.date }));
    }
    return { sapCollected:newSap, syrupMade:newSyrup, sapRO:newRO, sapEvap:newEvap };
  };

  // Dedupe report for the preview (Debug M4 — re-importing a file used to
  // double the season). Exact kind+date+value matches are skipped.
  const dd = React.useMemo(() => {
    if (!preview) return null;
    const targetSeason = preview.isPDF ? (preview.detectedYear || season) : season;
    const slog = ls.get('sg_logs2', {})[targetSeason] || {};
    const { addedCount, skippedCount } = dedupeImport(slog, buildAdditions());
    return { addedCount, skippedCount, targetSeason };
  }, [preview, source, season]);

  const doImport = () => {
    if (!preview) return;
    const targetSeason = preview.isPDF ? (preview.detectedYear || season) : season;
    const existing = ls.get('sg_logs2', {});
    const slog = existing[targetSeason] || { sapCollected:[], syrupMade:[], sapRO:[], sapEvap:[] };

    const { added } = dedupeImport(slog, buildAdditions());
    const updated = {
      ...existing,
      [targetSeason]: {
        ...slog,
        sapCollected: [...(slog.sapCollected||[]), ...added.sapCollected],
        syrupMade:    [...(slog.syrupMade||[]),    ...added.syrupMade],
        sapRO:        [...(slog.sapRO||[]),         ...added.sapRO],
        sapEvap:      [...(slog.sapEvap||[]),        ...added.sapEvap],
      }
    };
    ls.set('sg_logs2', updated);
    onImport(updated);
    onClose();
  };

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.pdf') || source === 'sugarcalc_pdf') {
      parseSugarCalcPDF(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setCsvText(ev.target.result);
      parseCSV(ev.target.result, source);
    };
    reader.readAsText(file);
  };

  return (
    <div className="scrim" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:'#fff'}}><I.import size={17} color="#fff" /> Import Season Data</div>
            <div style={{fontSize:12,color:'#7f92a6',marginTop:2}}>SugarCalc PDF · SapSpy · SapTrac · CSV</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#7f92a6',
            fontSize:22,cursor:'pointer',padding:'4px 8px'}}>✕</button>
        </div>

        {/* Source selector */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:'#7f92a6',marginBottom:8}}>DATA SOURCE</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {SOURCES.map(s=>(
              <button key={s.id} onClick={()=>setSource(s.id)}
                style={{padding:'6px 14px',borderRadius:20,fontSize:13,fontWeight:500,cursor:'pointer',
                  border:'1.5px solid',
                  borderColor: source===s.id ? '#58a6ff' : '#1e2d3d',
                  background: source===s.id ? '#0d1117' : '#161b22',
                  color: source===s.id ? '#58a6ff' : '#7f92a6'}}>
                {s.label}
              </button>
            ))}
          </div>
          <div style={{fontSize:13,color:'#7f92a6',marginTop:6}}>
            {SOURCES.find(s=>s.id===source)?.hint}
          </div>
        </div>

        {/* File upload — iOS-safe: label wraps input directly, no JS click() needed */}
        <label htmlFor="csv-file-input" style={{border:'2px dashed #1e2d3d',borderRadius:12,
          padding:20,textAlign:'center',marginBottom:16,cursor:'pointer',display:'block'}}>
          <input id="csv-file-input" type="file"
            accept=".csv,.txt,.pdf,application/pdf,text/csv,text/plain"
            onChange={handleFile}
            style={{display:'none'}} />
          <div style={{marginBottom:8,display:'flex',justifyContent:'center'}}><I.folder size={28} color="#58a6ff" /></div>
          <div style={{fontSize:14,fontWeight:600,color:'#e6edf3'}}>
            {source === 'sugarcalc_pdf' ? 'Tap to select PDF' : 'Tap to select CSV file'}
          </div>
          <div style={{fontSize:12,color:'#7f92a6',marginTop:4}}>
            {source === 'sugarcalc_pdf' ? 'SugarCalc Season Report PDF' : 'or paste data below'}
          </div>
        </label>

        {/* Paste area */}
        <textarea
          value={csvText}
          onChange={e=>{setCsvText(e.target.value); if(e.target.value.trim()) parseCSV(e.target.value,source);}}
          placeholder={"date,sap_gallons,syrup_gallons\n2024-03-15,450,4.2\n2024-03-16,380,3.5\n..."}
          rows={5}
          style={{width:'100%',boxSizing:'border-box',padding:'10px 12px',background:'#0d1117',
            border:'1.5px solid #1e2d3d',borderRadius:10,color:'#e6edf3',fontSize:12,
            fontFamily:'monospace',resize:'vertical',outline:'none',marginBottom:12}}
        />

        {/* Error */}
        {error && (
          <div style={{background:'#2d1010',border:'1px solid #f85149',borderRadius:8,
            padding:'10px 14px',fontSize:13,color:'#f85149',marginBottom:12}}>
            <I.alert size={14} color="currentColor" /> {error}
          </div>
        )}

        {/* Preview */}
        {preview && !error && (
          <div style={{background:'#0d1117',border:'1px solid #1e2d3d',borderRadius:12,
            padding:16,marginBottom:16}}>
            {preview.isPDF && (
              <div style={{background:'rgba(63,185,80,0.08)',border:'1px solid rgba(63,185,80,0.25)',
                borderRadius:8,padding:'8px 12px',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <I.clipboard size={14} color="#7f92a6" />
                <div style={{fontSize:12,color:'#3fb950',fontWeight:600}}>
                  SugarCalc PDF · {preview.rows.length} entries · Season {preview.detectedYear}
                </div>
              </div>
            )}
            <div style={{fontSize:13,fontWeight:700,color:'#3fb950',marginBottom: dd && dd.skippedCount>0 ? 6 : 12}}>
              <I.check size={14} color="currentColor" /> Ready to import — {preview.rows.length} rows detected
            </div>
            {dd && dd.skippedCount > 0 && (
              <div style={{fontSize:12,fontWeight:600,color:'#e0a44a',marginBottom:12}}>
                {t(lang,'importDupNote').replace('{n}', dd.addedCount).replace('{m}', dd.skippedCount)}
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:12}}>
              {[
                {label:'Sap',   val:preview.totalSap   > 0 ? preview.totalSap.toFixed(0)+' gal'   : '—', color:'#58a6ff'},
                {label:'Syrup', val:preview.totalSyrup > 0 ? preview.totalSyrup.toFixed(1)+' gal' : '—', color:'#3fb950'},
                {label:'RO',    val:preview.totalRO    > 0 ? preview.totalRO.toFixed(0)+' gal'    : '—', color:'#a78bfa'},
                {label:'Evap',  val:(preview.totalEvap||0) > 0 ? (preview.totalEvap||0).toFixed(0)+' gal' : '—', color:'#e0a44a'},
              ].map(x=>(
                <div key={x.label} style={{textAlign:'center',background:'#161b22',borderRadius:8,padding:'10px 6px'}}>
                  <div style={{fontSize:16,fontWeight:700,color:x.color}}>{x.val}</div>
                  <div style={{fontSize:12,color:'#7f92a6',marginTop:2}}>{x.label}</div>
                </div>
              ))}
            </div>
            <div style={{maxHeight:160,overflowY:'auto',borderRadius:8,border:'1px solid #1e2d3d'}}>
              {(preview.isPDF ? preview.rows.slice(0,8) : preview.rows.slice(0,5)).map((r,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',
                  padding:'7px 12px',borderBottom:'1px solid #161b22',fontSize:12,color:'#7f92a6'}}>
                  <span>{r.date}</span>
                  {preview.isPDF
                    ? <span style={{color: r.cat==='sap'?'#58a6ff':r.cat==='syrup'?'#3fb950':r.cat==='ro'?'#a78bfa':'#e0a44a'}}>
                        {r.val} gal {r.cat==='sap'?'sap':r.cat==='syrup'?'syrup':r.cat==='ro'?'RO':'evap'}
                      </span>
                    : <>
                        {r.sap>0   && <span style={{color:'#58a6ff'}}>{r.sap} gal sap</span>}
                        {r.syrup>0 && <span style={{color:'#3fb950'}}>{r.syrup} gal syrup</span>}
                        {r.ro>0    && <span style={{color:'#a78bfa'}}>{r.ro} gal RO</span>}
                      </>
                  }
                </div>
              ))}
              {preview.rows.length > (preview.isPDF ? 8 : 5) && (
                <div style={{padding:'6px 12px',fontSize:13,color:'#7f92a6',textAlign:'center'}}>
                  + {preview.rows.length - (preview.isPDF ? 8 : 5)} more entries…
                </div>
              )}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose}
            style={{flex:1,padding:'13px',borderRadius:12,border:'1.5px solid #1e2d3d',
              background:'#161b22',color:'#7f92a6',fontSize:15,cursor:'pointer',fontWeight:500}}>
            Cancel
          </button>
          <button onClick={doImport} disabled={!preview || !!error || (dd && dd.addedCount === 0)}
            style={{flex:2,padding:'13px',borderRadius:12,border:'none',
              background: preview && !error && (!dd || dd.addedCount > 0) ? '#238636' : '#1c2128',
              color: preview && !error && (!dd || dd.addedCount > 0) ? '#fff' : '#484f58',
              fontSize:15,cursor: preview && !error && (!dd || dd.addedCount > 0) ? 'pointer' : 'default',fontWeight:700}}>
            {preview && !error
              ? (dd && dd.addedCount === 0
                  ? t(lang,'importAllDup')
                  : `Import ${dd ? dd.addedCount : preview.rows.length} entries into ${preview.isPDF && preview.detectedYear ? preview.detectedYear : season}`)
              : 'Import Data'}
          </button>
        </div>
      </div>
    </div>
  );
}


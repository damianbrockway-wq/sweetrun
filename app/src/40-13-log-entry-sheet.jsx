// ─── LOG ENTRY SHEET ─────────────────────────────────────────────────────────
// One sheet for every kind of entry. It opens on the kind used last, the keypad is up
// when it opens, and Save is one tap. The data written is exactly what the old
// per-section forms wrote: {id, date, val, note, grade?, brix?, point?}.
function LogEntrySheet({ kinds, kind, setKind, lang, units, activePoint, grades, gradeLabels, onSave, onClose, editing = null, onUpdate, onDelete }) {
  const K = kinds.find(x => x.k === kind) || kinds[0];
  const [val,   setVal]   = useState(editing ? editing.val : 0);
  const [note,  setNote]  = useState(editing ? (editing.note || '') : '');
  const [grade, setGrade] = useState(editing && editing.grade ? editing.grade : '—');
  const [brix,  setBrix]  = useState(editing && editing.brix != null ? String(editing.brix) : '');
  const toISO = ds => { const d = new Date(ds); if (isNaN(d)) return ''; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const [dateISO, setDateISO] = useState(editing ? toISO(editing.date) : '');
  const [armed, setArmed] = useState(false);
  React.useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t); }, [armed]);
  // The sheet opens on the kind used last, which saves a tap for anyone logging
  // sap five times a day — but a generic "Log a run" headline let that memory
  // turn into a silent mis-entry at the end of a long boil. The title now names
  // the kind, so the largest words in the sheet say what is about to be written.
  const title = editing
    ? (lang==='fr' ? 'Modifier l’entrée' : 'Change this entry')
    : (lang==='fr' ? `Noter : ${K.l.toLowerCase()}` : `Log ${K.l.toLowerCase()}`);
  const save = () => {
    if (!val) { const el = document.getElementById('log-amount'); if (el) el.focus(); return; }
    if (editing) {
      const changes = { val: parseFloat(val), note, grade: K.grade ? grade : undefined, brix: K.brix && brix ? parseFloat(brix) : undefined };
      if (dateISO) { changes.date = dateISO; }  // already ISO from the date input
      onUpdate(editing.kind, editing.id, changes);
      onClose(); return;
    }
    const entry = {
      id:    Date.now(),
      date:  srToday(),
      val:   parseFloat(val),
      note,
      grade: K.grade ? grade : undefined,
      brix:  K.brix && brix ? parseFloat(brix) : undefined,
      point: activePoint || undefined,
    };
    onSave(K.k, entry);
    onClose();
  };
  return (
    <div className="scrim" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet sheet-form" onClick={e=>e.stopPropagation()}>
        <div className="sheet-handle" />
        <div style={{ fontWeight:800, fontSize:17, marginBottom:12 }}>{title}</div>
        {!editing && (
          <div className="picker" role="group" aria-label="What are you logging">
            {kinds.map(x => (
              <button key={x.k} className={`seg${x.k===K.k ? ' on' : ''}`} aria-pressed={x.k===K.k} onClick={()=>{ setKind(x.k); setGrade('—'); setBrix(''); }}>{x.l}</button>
            ))}
          </div>
        )}
        {editing && (
          <div style={{ marginBottom:4 }}>
            <div className="field-label">{lang==='fr' ? 'Date' : 'Date'}</div>
            <input aria-label="Entry date" type="date" value={dateISO} onChange={e=>setDateISO(e.target.value)} style={{ colorScheme:'dark' }} />
          </div>
        )}
        <div className="field-label" style={{ marginTop:14 }}>{K.long.charAt(0) + K.long.slice(1).replace(/ ([A-Z])(?=[a-z])/g, m => m.toLowerCase())}</div>
        <div className="amount">
          <NumInput id="log-amount" autoFocus label={`${K.long} — amount in ${K.unit}`} value={val} onChange={setVal} min={0} step={K.dp ? 0.1 : 1} placeholder=" " />
          <span className="unit" aria-hidden="true">{K.unit}</span>
        </div>
        {K.grade && K.brix && (
          <div className="two-col">
            <div>
              <div className="field-label">{lang==='fr' ? 'Classe' : 'Grade'} <span style={{ fontWeight:400 }}>({t(lang,'optional')})</span></div>
              <div className="select-wrap">
                <select aria-label={`${lang==='fr' ? 'Classe' : 'Grade'} (${t(lang,'optional')})`} value={grade} onChange={e=>setGrade(e.target.value)} style={{ color: grade==='—' ? '#7f92a6' : '#e6edf3' }}>
                  {grades.map(g=><option key={g} value={g}>{g==='—' ? (lang==='fr' ? 'Aucune' : 'None') : (gradeLabels[g]||g)}</option>)}
                </select>
                <I.chevDown size={16} color="#7f92a6" />
              </div>
            </div>
            <div>
              <div className="field-label">{t(lang,'syrupBrix')} <span style={{ fontWeight:400 }}>({t(lang,'optional')})</span></div>
              <input aria-label={`${t(lang,'syrupBrix')} (${t(lang,'optional')})`} type="text" inputMode="decimal" value={brix} placeholder="e.g. 66.9"
                onChange={e=>{ const raw=e.target.value; if(!/^[\d.,\s]*$/.test(raw)) return; setBrix(raw); }}
                onBlur={e=>{ const n=srParseNum(e.target.value); setBrix(n===null?'':String(Math.max(0,Math.min(100,n)))); }} />
            </div>
          </div>
        )}
        {K.brix && !K.grade && (
          <div style={{ marginBottom:14 }}>
            <div className="field-label">{t(lang,'sapBrix')} <span style={{ fontWeight:400 }}>({t(lang,'optional')})</span></div>
            <input aria-label={`${t(lang,'sapBrix')} (${t(lang,'optional')})`} type="text" inputMode="decimal" value={brix} placeholder="e.g. 2.1"
              onChange={e=>{ const raw=e.target.value; if(!/^[\d.,\s]*$/.test(raw)) return; setBrix(raw); }}
              onBlur={e=>{ const n=srParseNum(e.target.value); setBrix(n===null?'':String(Math.max(0,Math.min(10,n)))); }} />
          </div>
        )}
        <div className="field-label">{t(lang,'note')} <span style={{ fontWeight:400 }}>({t(lang,'optional')})</span></div>
        <input aria-label={t(lang,'note')} type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder={lang==='fr' ? 'Ajouter une note' : 'Add a note'} onKeyDown={e=>e.key==='Enter'&&save()} />
        <div className="sheet-foot">
          <button className="btn-primary" onClick={save} id="log-save" style={{ minHeight:52, fontSize:16 }}>
            <I.check size={18} color="#07090f" /> {lang==='fr' ? 'Enregistrer' : 'Save'}
          </button>
          <button className="sheet-cancel" onClick={onClose}>{lang==='fr' ? 'Annuler' : 'Cancel'}</button>
          {editing && (
            <button className={`sheet-delete${armed ? ' armed' : ''}`} id="log-delete"
              onClick={()=>{ if (armed) { onDelete(editing.kind, editing.id); onClose(); } else setArmed(true); }}
              aria-label={armed ? 'Confirm: delete this entry' : 'Delete this entry'}>
              {armed ? (lang==='fr' ? 'Appuyez encore pour supprimer' : 'Tap again to delete') : (lang==='fr' ? 'Supprimer l’entrée' : 'Delete entry')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


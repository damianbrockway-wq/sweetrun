// ─── Shared UI pieces ─────────────────────────────────────────────────────────
// Accepts a comma decimal ("2,5" is how a French-Canadian producer types 2.5 —
// parseFloat used to read that as 25). Rejects letters and a leading minus.
// Clamps to the field's own min/max on blur.
function srParseNum(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/\s/g, '');
  // "1,500" / "12,345.67" are US thousands groups — strip the commas.
  // A lone comma not forming 3-digit groups is a French decimal ("2,5" → 2.5).
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(',', '.');
  if (s === '' || s === '.' || s === '-') return null;
  if (!/^-?\d*\.?\d*$/.test(s)) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
// `label` is what a screen reader announces. Every call site passes the same
// words the sighted user reads above the box, so the two never drift.
function NumInput({ value, onChange, min, max, step = 0.1, placeholder, label, id, autoFocus = false }) {
  const [display, setDisplay] = React.useState(value === 0 ? '' : String(value));
  React.useEffect(() => {
    if (document.activeElement && document.activeElement.dataset.numinput === 'true') return;
    setDisplay(value === 0 ? '' : String(value));
  }, [value]);
  const clamp = n => {
    let v = n;
    if (min != null && v < min) v = min;
    if (max != null && v > max) v = max;
    return v;
  };
  return (
    <input
      type="text"
      inputMode="decimal"
      data-numinput="true"
      id={id}
      autoFocus={autoFocus}
      aria-label={label}
      value={display}
      placeholder={placeholder || (value === 0 ? '0' : '')}
      onChange={e => {
        const raw = e.target.value;
        if (!/^-?[\d.,\s]*$/.test(raw)) return;   // ignore letters outright
        setDisplay(raw);
        const n = srParseNum(raw);
        if (n !== null) onChange(clamp(n));
      }}
      onFocus={e => { if (srParseNum(e.target.value) === 0) setDisplay(''); }}
      onBlur={e => {
        const n = srParseNum(e.target.value);
        // Typing was clamped; clearing the box was not, so an emptied field wrote
        // a raw 0 straight past its own min. On "Water boils at" (min 200) that
        // put 0.0°F on four screens and a 7.1°F draw-off target; on Brix it made
        // the season's opportunity figure read "$Infinity". An emptied field now
        // falls back to its minimum, which is the lowest value it ever meant.
        if (n === null) { const z = clamp(min != null ? min : 0); onChange(z); setDisplay(min != null ? String(z) : ''); }
        else { const c = clamp(n); onChange(c); setDisplay(String(c)); }
      }}
    />
  );
}
function CardIcon({ bg, icon }) {
  // One well for every card title: inset fill, dim icon. The per-card tint was decoration.
  const Ic = I[icon];
  return <div className="card-icon">{Ic ? <Ic size={20} color="#7f92a6" /> : null}</div>;
}
function TipItem({ children }) {
  return <div className="tip-item"><div className="tip-dot" /><span>{children}</span></div>;
}
function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span style={{ color:'#7f92a6', fontSize:14 }}>{label}</span>
      <span style={{ fontWeight:600, fontSize:14 }}>{value}</span>
    </div>
  );
}


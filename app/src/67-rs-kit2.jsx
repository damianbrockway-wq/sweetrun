// ─── Run Sheet kit, part 3 (Phase 6): pieces for the rebuilt detail screens ─
//   RsSubHead     push-screen head: back link, eyebrow, title, lede
//   RsDisclose    a row that opens to show more (aria-expanded); one open look
//   RsBarRow      label, value and a thin bar (score parts, savings, scenarios)
//   RsPlain       long reference text, run through srPlain (no dashes)
//   RsMoney       $ stepper with the house step keys
//   useRsPref     a number or string setting kept in one sg_ key via ls.set
// Colours only through T / tokens.

function RsSubHead({ c, back, backLabel, eyebrow, title, lede }) {
  return (
    <header className="rs-phead">
      <RsPushBar href={rsHref(back)} label={backLabel} />
      {eyebrow && <div className="rs-eyebrow plain">{eyebrow}</div>}
      <h1 className="sm">{title}</h1>
      {lede && <p className="rs-lede">{lede}</p>}
    </header>
  );
}

let _rsDisc = 0;
function RsDisclose({ title, sub, tone, kicker, children, defaultOpen = false, icon, family }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = React.useMemo(() => 'rsd' + (++_rsDisc), []);
  return (
    <div className={`rs-disc${open ? ' open' : ''}${tone ? ' ' + tone : ''}`}>
      <button type="button" className="rs-discbtn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
        {icon && <RsTile icon={icon} family={family} size={36} />}
        <span className="rs-rt">{kicker && <span className="rs-kick">{kicker}</span>}<b>{title}</b>{sub && <span>{sub}</span>}</span>
        <span className="rs-chev rs-discchev"><RsIcon name="chev" size={20} /></span>
      </button>
      {open && <div className="rs-discbody" id={id}>{children}</div>}
    </div>
  );
}

function RsBarRow({ label, value, pct, sub, tone, marker }) {
  return (
    <div className="rs-barrow">
      <div className="rs-split"><span className="rs-brl">{label}</span><b className="tn">{value}</b></div>
      {sub && <div className="rs-meta tn">{sub}</div>}
      <div className={`rs-bar${tone ? ' ' + tone : ''}`} role="presentation">
        <i style={{ width: Math.max(0, Math.min(100, pct || 0)) + '%' }} />
        {marker != null && <em style={{ left: Math.max(0, Math.min(100, marker)) + '%' }} />}
      </div>
    </div>
  );
}

function RsPlain({ text, className }) { return <p className={className || 'rs-body'}>{srPlain(text)}</p>; }

function RsMoney({ id, value, onChange, label, steps = [-10, -1, 1, 10], dp = 0, max = 1e6, unit }) {
  return <RsStepper id={id} value={value} onChange={onChange} steps={steps} dp={dp} pre="$" unit={unit} label={label} min={0} max={max} big={false} />;
}

// A setting in one sg_ key. Writes go through ls.set (quota, trial lock); the
// key must be a preference key or a data key the classic screen already wrote.
function useRsPref(key, def) {
  const [v, setV] = useState(() => { const x = ls.get(key, def); return x === null || x === undefined ? def : x; });
  const set = x => { setV(x); if (x !== '' && x != null) ls.set(key, x); };
  return [v, set];
}
// Display helpers for money and litre-aware rates.
// Small ratios keep a third decimal so a real 0.004 never reads as 0.00.
const srFine = n => (n == null || !isFinite(n)) ? '' : fmt(n, Math.abs(n) > 0 && Math.abs(n) < 0.1 ? 3 : 2);
const srMoney = (n, dp = 0) => (n == null || !isFinite(n)) ? '' : (n < 0 ? '-$' : '$') + fmt(Math.abs(n), dp);
// A price per gallon shown per the display unit (per litre in litre mode).
const srPerU = (perGal, units) => units === 'L' ? perGal / SR_L_PER_GAL : perGal;
const srPerGal = (perU, units) => units === 'L' ? perU * SR_L_PER_GAL : perU;

// ─── Run Sheet kit, part 2 (Phase 5): the working components ────────────────
// Component vocabulary for every Phase 5-6 screen (DESIGN.md "Run Sheet"):
//   RsBtn        one solid orange primary per screen; secondary is outlined
//   RsNextCard   the "Do this next" card (the only card with an orange frame)
//   RsAlert      a ranked job below the Next card (max 3)
//   RsNum        big-number card: caps label, 40px value + unit, one sub line
//   RsStat       big number + chart card
//   RsKv         two-column facts list
//   RsSeg/RsChips segmented control (48px) and filter chips (48px)
//   RsStepper    72px value with measured width + 64px keys
//   RsSheet      bottom sheet: focus moves in, Esc closes, Tab stays inside
//   RsTankViz    animated tank (fills from empty on arrival, old to new level)
//   RsRing       goal ring (chart orange)
//   RsLineChart / RsBarChart / RsSeasonChart   drawn at their rendered width
//   RsEvap / RsJugs / RsBoilHero               the boil atmosphere
// Colours only through T / tokens (token law, tests/runsheet.test.mjs).


// Glyphs the Phase 5-6 screens add (prototype IC set, Feather grammar).
Object.assign(RS_GLYPH, {
  pail:   <><path d="M5 8h14l-1.6 11.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8z"/><path d="M4 8h16"/><path d="M5.5 8C6.5 3.5 17.5 3.5 18.5 8"/></>,
  jug:    <><path d="M10 3h4v3h-4z"/><path d="M10 6c-4 1-5 4-5 8 0 4 3 7 7 7s7-3 7-7c0-4-1-7-5-8"/><path d="M18 9c2 0 2.5 3 .5 4"/></>,
  snow:   <><path d="M12 2v20M4.9 6.5l14.2 11M4.9 17.5l14.2-11"/><path d="M9 3.5 12 6l3-2.5M9 20.5 12 18l3 2.5"/></>,
  tank:   <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M5 12h14"/><path d="M9 16h6"/></>,
  fuel:   <><path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16"/><path d="M3 21h13"/><path d="M7 8h5"/><path d="M15 10h2a2 2 0 0 1 2 2v4.5a1.5 1.5 0 0 0 3 0V8l-3-3"/></>,
  gps:    <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/></>,
  info:   <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></>,
  download:<><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></>,
  tag:    <><path d="M3 12V4h8l10 10-8 8z"/><path d="M7.5 7.5h.01"/></>,
  trash:  <><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></>,
  minus:  <path d="M5 12h14"/>,
});

const srRM = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
// Looping animations (steam, fire, bubbles, the tank wave) pause while scrolled out of
// view: an IntersectionObserver sets .rs-offscreen on the node, and CSS pauses every
// animation under it. Nothing re-renders.
function useRsPauseOffscreen(ref) {
  useEffect(() => {
    const el = ref.current; if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(es => es.forEach(e => el.classList.toggle('rs-offscreen', !e.isIntersecting)), { rootMargin: '48px' });
    io.observe(el); return () => io.disconnect();
  }, []);
}
function srToast(text) { try { window.dispatchEvent(new CustomEvent('sr-toast', { detail:text })); } catch {} }

// Display helpers. Canonical gallons -> display unit, and the unit label.
const srU = units => units === 'L' ? 'L' : 'gal';
const srVol = (gal, units, dp = 0) => fmt(fromGal(gal, units), dp);
// A number, or '' when it isn't one (never the em dash fmt() uses for NaN).
const srN = (n, dp = 0) => (n == null || !isFinite(n)) ? '' : fmt(n, dp);
function srClock(ms, lang) {
  const d = new Date(ms); const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
  return lang === 'fr' ? `${h} h ${m}` : `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}
function srDur(hours, lang) {
  if (hours == null || !isFinite(hours)) return '';
  const min = Math.max(0, Math.round(hours * 60 / 5) * 5), h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h${m ? ' ' + m + ' min' : ''}` : `${m} min`;
}
function srDayLabel(iso, lang) {
  const p = srDateParts(iso); if (!p) return '';
  const L = lang === 'fr' ? 'fr' : 'en';
  return L === 'fr' ? `${p.d} ${MON.fr[p.mo - 1]}` : `${MON.en[p.mo - 1]} ${p.d}`;
}

// Width of an element, re-measured on resize, so charts draw at the size they
// render (DESIGN.md lesson 11: a fixed viewBox scaled up blows labels up 2x).
function useRsWidth(fallback = 320) {
  const ref = React.useRef(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const set = () => { const x = Math.round(el.getBoundingClientRect().width); if (x > 0) setW(x); };
    set();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', set); return () => window.removeEventListener('resize', set); }
    const ro = new ResizeObserver(set); ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// ── Buttons ──────────────────────────────────────────────────────────────────
function RsBtn({ children, onClick, href, icon, kind = 'primary', disabled, id, label, big, ext }) {
  const cls = `${kind === 'primary' ? 'rs-btn' : 'rs-btn2'}${kind === 'bad' ? ' bad' : ''}${big ? ' big' : ''}`;
  const inner = <>{icon && <RsIcon name={icon} size={22} sw={kind === 'primary' ? 2.6 : 2.2} />}{children}</>;
  return href
    ? <a className={cls} href={href} id={id} aria-label={label} {...(ext ? { target:'_blank', rel:'noopener' } : {})}>{inner}</a>
    : <button type="button" className={cls} onClick={onClick} disabled={disabled} id={id} aria-label={label}>{inner}</button>;
}

// ── Next card and alerts ─────────────────────────────────────────────────────
function RsNextCard({ title, why, btn, onAct, icon = 'drop', eyebrow }) {
  return (
    <section className="rs-next" aria-labelledby="rs-next-t">
      <div className="rs-k"><RsIcon name={icon} size={18} sw={2.4} />{eyebrow}</div>
      <h2 id="rs-next-t">{title}</h2>
      {why && <p className="tn">{why}</p>}
      <RsBtn onClick={onAct} id="rs-next-btn">{btn}</RsBtn>
    </section>
  );
}
function RsAlert({ title, sub, icon, family, tone, onClick }) {
  return (
    <button type="button" className={`rs-al${tone ? ' ' + tone : ''}`} onClick={onClick}>
      <RsTile icon={icon} family={family} />
      <span className="rs-alt"><b>{title}</b>{sub && <span className="tn">{sub}</span>}</span>
      <span className="rs-chev"><RsIcon name="chev" size={20} /></span>
    </button>
  );
}

// ── Numbers ──────────────────────────────────────────────────────────────────
function RsNum({ label, value, unit, sub, href, live, subTone }) {
  const inner = <>
    <span className="rs-nl"><span>{label}</span>{live && <span className="rs-live">{live}</span>}</span>
    <span className="rs-nv tn">{value}{unit && <small>{unit}</small>}</span>
    {sub && <span className={`rs-nd tn${subTone ? ' ' + subTone : ''}`}>{sub}</span>}
  </>;
  return href ? <a className="rs-num" href={href}>{inner}</a> : <div className="rs-num">{inner}</div>;
}
function RsKv({ rows, big }) {
  return (
    <dl className={`rs-kv tn${big ? ' big' : ''}`}>
      {rows.filter(Boolean).map(([k, v, tone], i) => <React.Fragment key={i}><dt>{k}</dt><dd className={tone || ''}>{v}</dd></React.Fragment>)}
    </dl>
  );
}
function RsStat({ title, value, unit, delta, note, children }) {
  return (
    <section className="rs-card rs-stat">
      <div className="rs-split">
        <div><div className="rs-meta">{title}</div><div className="rs-statv tn">{value}{unit && <small>{unit}</small>}</div></div>
        {delta && <div className="rs-delta tn">{delta}</div>}
      </div>
      {children}
      {note && <p className="rs-note">{note}</p>}
    </section>
  );
}
// Status: colour + word + shape (dot ok, ring check/idle, triangle fault, star freeze)
function RsSt({ kind = 'ok', children }) { return <span className={`rs-st ${kind}`}>{children}</span>; }

// ── Segmented control and chips ──────────────────────────────────────────────
function RsSeg({ options, value, onChange, label, wrap }) {
  return (
    <div className={`rs-seg${wrap ? ' wrap' : ''}`} role="group" aria-label={label}>
      {options.map(([k, l]) => (
        <button key={String(k)} type="button" className={value === k ? 'on' : ''} aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>
      ))}
    </div>
  );
}
function RsChips({ options, value, onChange, label }) {
  return (
    <div className="rs-chips" role="group" aria-label={label}>
      {options.map(([k, l, n]) => (
        <button key={String(k)} type="button" className={`rs-chip${value === k ? ' on' : ''}`} aria-pressed={value === k} onClick={() => onChange(k)}>
          {l}{n != null && <span className="n tn">{n}</span>}
        </button>
      ))}
    </div>
  );
}

// ── Stepper: 72px number whose box is measured from the rendered text ────────
// (DESIGN.md lesson 3: ch units misjudge proportional digits both ways.)
// Imperial length units in the reader's language (po, pi in French). Display only.
const SR_UNIT_FR = { 'in':'po', 'ft':'pi', 'in Hg':'po Hg', 'hr':'h' };
const srUnitL = (u, L) => (L || ls.get('sg_lang', 'en')) === 'fr' && SR_UNIT_FR[u] ? SR_UNIT_FR[u] : u;
// The yield method's name in the reader's language (YIELD_MODELS labels are English).
const srModelName = (label, L) => { const k = Object.keys(YIELD_MODELS).find(x => YIELD_MODELS[x].label === label); return k ? rt(L, 'ym_' + k) : label; };
let _srCv = null;
function RsStepper({ id, value, onChange, steps, dp = 0, unit, label, min = 0, max = 1e7, big = true, base, pre, ph }) {
  const inRef = React.useRef(null);
  const [draft, setDraft] = useState(null);           // text while typing
  const shown = draft != null ? draft : (value === '' || value == null ? '' : String(+(+value).toFixed(dp)));
  React.useLayoutEffect(() => {
    const el = inRef.current; if (!el) return;
    try {
      _srCv = _srCv || document.createElement('canvas').getContext('2d');
      const cs = getComputedStyle(el);
      _srCv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const ls_ = parseFloat(cs.letterSpacing) || 0;
      const txt = shown || ph || '0';
      const w = _srCv.measureText(txt).width + ls_ * txt.length;
      el.style.width = Math.max(64, Math.ceil(w + parseFloat(cs.fontSize) * 0.2 + 8)) + 'px';
    } catch {}
  });
  const clamp = n => Math.min(max, Math.max(min, n));
  const bump = d => { setDraft(null); if ((value === '' || value == null) && base != null) { onChange(+(+base).toFixed(dp)); return; } const cur = parseFloat(value) || 0; onChange(+clamp(cur + d).toFixed(dp)); };
  return (
    <div className="rs-stepper">
      <label className={`rs-stepv${big ? '' : ' sm'}`} htmlFor={id}>
        {pre && <small className="pre">{pre}</small>}
        <input ref={inRef} id={id} className="tn" type="text" inputMode="decimal" autoComplete="off" aria-label={label} placeholder={ph}
          value={shown}
          onChange={e => { const raw = e.target.value; if (!/^[\d.,\s]*$/.test(raw)) return; setDraft(raw); const n = srParseNum(raw); onChange(n == null ? '' : clamp(n)); }}
          onFocus={e => { try { e.target.select(); } catch {} }}
          onBlur={() => setDraft(null)} />
        {unit && <small>{srUnitL(unit)}</small>}
      </label>
      <div className="rs-keys">
        {steps.map(d => (
          <button key={d} type="button" onClick={() => bump(d)} aria-label={`${d > 0 ? '+' : '-'}${Math.abs(d)} ${srUnitL(unit || '')}`.trim()}>
            {d > 0 ? '+' : '−'}{Math.abs(d)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Sheet ────────────────────────────────────────────────────────────────────
function RsSheet({ title, onClose, children, id }) {
  const ref = React.useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    const t0 = setTimeout(() => { try { el && el.focus({ preventScroll:true }); } catch {} }, 20);
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !el) return;
      const f = [...el.querySelectorAll('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    document.documentElement.classList.add('rs-sheet-open');
    return () => {
      clearTimeout(t0); document.removeEventListener('keydown', onKey, true);
      document.documentElement.classList.remove('rs-sheet-open');
      try { prev && prev.focus && prev.focus({ preventScroll:true }); } catch {}
    };
  }, []);
  // Portalled to <body>: a sheet opened from inside a fixed full-screen view (the
  // Bush map, Phase 7) would otherwise be trapped in that view's stacking context
  // under the tab bar. The stacking rule in FOUNDATION-NOTES still holds.
  const tree = (
    <div className="rs-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="rs-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} id={id}>
        <div className="rs-grab" aria-hidden="true" />
        <div className="rs-shead"><h2>{title}</h2>
          <button type="button" className="rs-xbtn" aria-label={rt(ls.get('sg_lang','en'),'close')} onClick={onClose}><RsIcon name="x" size={22} /></button>
        </div>
        {children}
      </section>
    </div>
  );
  return typeof ReactDOM !== 'undefined' && ReactDOM.createPortal ? ReactDOM.createPortal(tree, document.body) : tree;
}

// Toast: one line at the foot of the screen after a save.
function RsToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let tm = null;
    const h = e => { setMsg(null); clearTimeout(tm); requestAnimationFrame(() => setMsg(e.detail)); tm = setTimeout(() => setMsg(null), 2600); };
    window.addEventListener('sr-toast', h);
    return () => { window.removeEventListener('sr-toast', h); clearTimeout(tm); };
  }, []);
  return <div className={`rs-toast${msg ? ' show' : ''}`} role="status" aria-live="polite">{msg && <><RsIcon name="check" size={20} sw={2.6} />{msg}</>}</div>;
}

// ── Tank ─────────────────────────────────────────────────────────────────────
// Liquid rises from empty the first time it is drawn (1.3 s ease-out) and from
// the old level to the new one when the level changes. Reduced motion: CSS
// removes the transition, so it simply sits at the level.
let _srTk = 0;
function RsTankViz({ level, cap, w = 92, h = 150, tone = 'sap', empty }) {
  const id = React.useMemo(() => 'rstk' + (++_srTk), []);
  const p = cap > 0 && level != null ? Math.max(0, Math.min(1, level / cap)) : 0;
  const ix = 8, iy = 8, iw = w - 16, ih = h - 16, y = iy + ih * (1 - p);
  const [shown, setShown] = useState(srRM());
  useEffect(() => { if (shown) return; let a = requestAnimationFrame(() => { a = requestAnimationFrame(() => setShown(true)); });
  return () => cancelAnimationFrame(a); }, []);
  const ref = React.useRef(null); useRsPauseOffscreen(ref);
  const ty = shown ? y : iy + ih;
  const wl = iw;
  const wave = `M${ix - wl} 4 q ${wl/4} -7 ${wl/2} 0 t ${wl/2} 0 t ${wl/2} 0 t ${wl/2} 0`;
  return (
    <svg ref={ref} className="rs-tankviz" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img"
      aria-label={rt(ls.get('sg_lang', 'en'), empty ? 'noLevelYet' : 'tankPct', { p: Math.round(p * 100) })}>
      <defs>
        <clipPath id={id}><rect x={ix} y={iy} width={iw} height={ih} rx={Math.min(12, w / 8)} /></clipPath>
        <linearGradient id={id + 'g'} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={{ stopColor: tone === 'conc' ? 'var(--rs-conc)' : 'var(--rs-sap)' }} />
          <stop offset="1" style={{ stopColor: tone === 'conc' ? 'var(--rs-conc2)' : 'var(--rs-sap2)' }} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width={w - 4} height={h - 4} rx={Math.min(16, w / 6)} className="rs-tk-wall" strokeDasharray={empty ? '6 6' : undefined} />
      {!empty && <g clipPath={`url(#${id})`}>
        <g className="rs-liq" style={{ transform:`translateY(${ty}px)` }}>
          <g className="rs-wave" style={{ '--wl': wl + 'px' }}><path d={`${wave} V ${h + ih} H ${ix - wl} Z`} fill={`url(#${id}g)`} /></g>
          <path d={wave} fill="none" className="rs-wave rs-tk-hi" style={{ '--wl': wl + 'px' }} />
        </g>
      </g>}
      {[.25, .5, .75].map(f => <line key={f} x1={w - 14} x2={w - 5} y1={iy + ih * (1 - f)} y2={iy + ih * (1 - f)} className="rs-tk-tick" />)}
    </svg>
  );
}

// ── Ring gauge (goal) ────────────────────────────────────────────────────────
function RsRing({ pct, size = 112, label }) {
  const r = size / 2 - 9, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, (pct || 0) / 100));
  const [shown, setShown] = useState(srRM());
  useEffect(() => { if (shown) return; const a = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(a); }, []);
  return (
    <svg className="rs-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label || `${Math.round(pct)} percent`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" style={{ stroke:T.s4 }} strokeWidth="10" />
      <circle className="rs-ringarc" cx={size/2} cy={size/2} r={r} fill="none" style={{ stroke:T.bar }} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(c * (shown ? f : 0)).toFixed(1)} ${c.toFixed(1)}`} transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" dy={size * .09} textAnchor="middle" className="rs-ringt" style={{ fontSize: Math.round(size * .26) }}>{Math.round(pct || 0)}%</text>
    </svg>
  );
}

// The table behind a chart, for screen readers (visually hidden). Every chart that
// draws data renders one: a caption (the chart's label), column heads, one row per point.
function RsDataTable({ caption, head, rows }) {
  if (!rows || !rows.length) return null;
  return (
    <table className="rs-vh">
      <caption>{caption}</caption>
      <thead><tr>{head.map((h, i) => <th key={i} scope="col">{h || (i === 0 ? rt(ls.get('sg_lang', 'en'), 'rpDay') : '')}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}><th scope="row">{r[0]}</th>{r.slice(1).map((v, k) => <td key={k}>{v}</td>)}</tr>)}</tbody>
    </table>
  );
}
// ── Charts (dataviz rules: thin marks, one axis, hairline grid, text colours) ─
function RsLineChart({ series, yMax, yTicks, xLabels, refLine, h = 150, label, rowLabel, rowHead = '', dp = 2 }) {
  const [ref, W] = useRsWidth();
  const pl = 34, pr = 58, pt = 10, pb = 24, iw = Math.max(40, W - pl - pr), ih = h - pt - pb;
  const n = Math.max(2, ...series.map(s => s.v.length));
  const X = i => pl + i / (n - 1) * iw, Y = v => pt + (1 - v / (yMax || 1)) * ih;
  return (
    <div ref={ref} className="rs-chartwrap">
      <svg className="rs-chart" width={W} height={h} viewBox={`0 0 ${W} ${h}`} role="img" aria-label={label}>
        {yTicks.map(t => <g key={t}><line x1={pl} x2={W - pr} y1={Y(t)} y2={Y(t)} className="rs-grid" /><text x={pl - 6} y={Y(t) + 4} textAnchor="end" className="rs-ct">{t}</text></g>)}
        {refLine && (() => {
          // Keep the reference label clear of the series end labels (both sit in the right margin).
          const ry = Y(refLine.v), ends = series.filter(s => s.end && s.v.length).map(s => Y(s.v[s.v.length - 1]));
          const hit = ends.find(e => Math.abs(e - ry) < 14);
          const ly = hit == null ? ry + 4 : (ry >= hit ? hit + 18 : hit - 12);
          return <g><line x1={pl} x2={W - pr} y1={ry} y2={ry} className="rs-refl" /><text x={W - pr + 4} y={ly} className="rs-ct">{refLine.l}</text></g>;
        })()}
        {series.map((s, k) => {
          const pts = s.v.map((v, i) => v == null ? null : [X(i), Y(v)]).filter(Boolean);
          if (!pts.length) return null;
          const d = 'M' + pts.map(p => p.map(q => q.toFixed(1)).join(' ')).join(' L');
          const e = pts[pts.length - 1];
          return <g key={k}>
            {s.area && <path d={`${d} L${e[0]} ${pt + ih} L${pts[0][0]} ${pt + ih} Z`} style={{ fill:s.c }} opacity=".10" />}
            <path d={d} fill="none" style={{ stroke:s.c }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dash} />
            <circle cx={e[0]} cy={e[1]} r="4.5" style={{ fill:s.c, stroke:T.s1 }} strokeWidth="2" />
            {s.end && <text x={e[0] + 8} y={e[1] + 4} className="rs-ct strong">{s.end}</text>}
          </g>;
        })}
        {xLabels.map(([i, t], k) => <text key={k} x={X(i)} y={h - 4} textAnchor={k === 0 ? 'start' : k === xLabels.length - 1 ? 'end' : 'middle'} className="rs-ct">{t}</text>)}
      </svg>
      <RsDataTable caption={label} head={[rowHead, ...series.map(s => s.name || s.end || '')]}
        rows={Array.from({ length: n }, (_, i) => [rowLabel ? rowLabel(i) : String(i + 1), ...series.map(s => s.v[i] == null ? '' : fmt(s.v[i], dp))])
          .filter(r => r.slice(1).some(Boolean))} />
    </div>
  );
}
function RsBarChart({ v, hi, h = 130, label, xLabels, unitFmt = x => x, rowLabel, rowHead = '', valueHead = '' }) {
  const [ref, W] = useRsWidth();
  const pl = 38, pr = 6, pt = 8, pb = 22, iw = Math.max(40, W - pl - pr), ih = h - pt - pb;
  const mx = Math.max(1, ...v), bw = iw / Math.max(1, v.length), B = Math.max(2, Math.min(18, bw - 2));
  const nice = mx >= 1000 ? 500 : mx >= 200 ? 100 : mx >= 40 ? 20 : mx >= 10 ? 5 : 1;
  const top = Math.ceil(mx / nice) * nice, yt = [0, top / 2, top];
  const Y = t => pt + ih - t / top * ih;
  return (
    <div ref={ref} className="rs-chartwrap">
      <svg className="rs-chart" width={W} height={h} viewBox={`0 0 ${W} ${h}`} role="img" aria-label={label}>
        {yt.map(t => <g key={t}><line x1={pl} x2={W - pr} y1={Y(t)} y2={Y(t)} className="rs-grid" /><text x={pl - 6} y={Y(t) + 4} textAnchor="end" className="rs-ct">{unitFmt(t)}</text></g>)}
        {v.map((q, i) => {
          if (!q) return null;
          const hh = q / top * ih, x0 = pl + i * bw + (bw - B) / 2, r = Math.min(4, B / 2);
          return <path key={i} d={`M${x0} ${pt + ih} V${pt + ih - hh + r} q0 -${r} ${r} -${r} h${B - 2 * r} q${r} 0 ${r} ${r} V${pt + ih} Z`} style={{ fill: i === hi ? T.tx : T.bar }} />;
        })}
        {(xLabels || []).map(([i, t], k, a) => <text key={k} x={pl + i * bw + bw / 2} y={h - 4} textAnchor={k === 0 ? 'start' : k === a.length - 1 ? 'end' : 'middle'} className="rs-ct">{t}</text>)}
      </svg>
      <RsDataTable caption={label} head={[rowHead, valueHead]} rows={v.map((q, i) => q ? [rowLabel ? rowLabel(i) : String(i + 1), unitFmt(q)] : null).filter(Boolean)} />
    </div>
  );
}

// The Season chart: sap a day as orange bars, the run-weather strip under the
// axis, the forecast hatched, and an orange "you are here" line. Tap or drag
// reads out any day.
function RsSeasonChart({ series, units, lang, wxStatus }) {
  const [ref, W] = useRsWidth(326);
  const H = 140, top = 16, bh = 88, base = top + bh, D = series.days.length, bw = W / D;
  const mx = Math.max(1, ...series.days.map(d => d.sap));
  const x = i => i * bw;
  const [sel, setSel] = useState(null);
  const pick = e => {
    const r = e.currentTarget.getBoundingClientRect();
    setSel(Math.max(0, Math.min(D - 1, Math.floor((e.clientX - r.left) / r.width * D))));
  };
  const ti = series.todayIdx;
  const fcStart = ti + 1, fcEnd = Math.min(D, ti + 11);
  const monthTicks = series.days.map((d, i) => ({ i, d })).filter(({ d, i }) => i === 0 || d.iso.endsWith('-01')).filter((t, k, a) => k === 0 || t.i - a[k - 1].i > 6);
  const u = srU(units);
  const read = i => {
    const d = series.days[i];
    const wxWord = d.cls === 'ideal' ? rt(lang,'wxGood') : d.cls === 'freezeThaw' ? rt(lang,'wxSome') : d.cls ? rt(lang,'wxNone') : '';
    const lbl = i === ti ? rt(lang,'todayOn', { d: srDayLabel(d.iso, lang) }) : srDayLabel(d.iso, lang);
    const what = d.sap > 0 ? `${fmt(d.sap, 0)} ${u} ${rt(lang,'sapWord')}` : d.fc ? (wxWord ? rt(lang,'fcWord', { w: wxWord }) : rt(lang,'ahead')) : (wxWord || rt(lang,'noSapLogged'));
    return <><b>{lbl}</b> · {what}</>;
  };
  return (
    <div>
      <div ref={ref} className="rs-chartwrap season">
        <svg className="rs-chart rs-schart" width={W} height={H + 10} viewBox={`0 -10 ${W} ${H + 10}`} role="img"
          onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setSel(null)}
          tabIndex={0} onBlur={() => setSel(null)} aria-describedby="rs-sread"
          onKeyDown={e => { const k = { ArrowLeft: -1, ArrowRight: 1 }[e.key], cur = sel == null ? ti : sel;
            if (k) { e.preventDefault(); setSel(Math.max(0, Math.min(D - 1, cur + k))); }
            else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); setSel(e.key === 'Home' ? 0 : D - 1); } }}
          aria-label={rt(lang,'chartAria', { n: series.days.filter(d => d.sap > 0).length, peak: fmt(series.peak.sap, 0), u })}>
          <defs><pattern id="rs-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" className="rs-hatchl" strokeWidth="2" /></pattern></defs>
          {fcEnd > fcStart && <><rect x={x(fcStart)} y={top - 6} width={x(fcEnd) - x(fcStart)} height={bh + 6} fill="url(#rs-hatch)" opacity=".6" />
            <text x={x(fcStart) + 4} y={top - 12} className="rs-ct">{rt(lang,'forecast')}</text></>}
          <line x1="0" x2={W} y1={base} y2={base} className="rs-grid" />
          {series.days.map((d, i) => {
            if (!(d.sap > 0)) return null;
            const hh = Math.max(2, d.sap / mx * bh), X = x(i) + 1, BW = Math.max(2, bw - 2), r = Math.min(2, BW / 2);
            return <path key={i} d={`M${X} ${base} V${base - hh + r} q0 -${r} ${r} -${r} h${BW - 2*r} q${r} 0 ${r} ${r} V${base} Z`}
              style={{ fill: i === ti ? T.tx : T.bar, opacity: sel == null || sel === i ? 1 : .55 }} />;
          })}
          {series.days.map((d, i) => {
            if (!d.cls) return null;
            const X = x(i) + 1, BW = Math.max(2, bw - 2), yy = base + 8;
            return d.cls === 'ideal'
              ? <rect key={i} x={X} y={yy} width={BW} height="8" rx="2" style={{ fill:T.run }} opacity={d.fc ? .55 : 1} />
              : <rect key={i} x={X + .5} y={yy + .5} width={BW - 1} height="7" rx="2" fill="none" className={d.cls === 'freezeThaw' ? 'rs-strip-some' : 'rs-strip-none'} strokeWidth="1" />;
          })}
          <line x1={x(ti) + bw / 2} x2={x(ti) + bw / 2} y1={top - 8} y2={base + 20} style={{ stroke:T.acc }} strokeWidth="2" />
          <circle cx={x(ti) + bw / 2} cy={top - 8} r="4" style={{ fill:T.acc, stroke:T.s1 }} strokeWidth="2" />
          {monthTicks.map(({ i, d }) => <text key={i} x={x(i)} y={H - 2} className="rs-ct">{srDayLabel(d.iso, lang)}</text>)}
          <rect x="0" y="0" width={W} height={H} fill="transparent" />
        </svg>
      </div>
      <RsDataTable caption={rt(lang,'chartAria', { n: series.days.filter(d => d.sap > 0).length, peak: fmt(series.peak.sap, 0), u })} head={[rt(lang,'date'), rt(lang,'sapWordC', { u })]}
        rows={series.days.filter(d => d.sap > 0).map(d => [srDayLabel(d.iso, lang), fmt(d.sap, 0)])} />
      <div className="rs-sread tn" id="rs-sread" aria-live="polite">{read(sel == null ? ti : sel)}</div>
      <div className="rs-legend">
        <span><i className="lg" style={{ background:T.bar }} />{rt(lang,'lgSap')}</span>
        {wxStatus === 'ok' && <><span><i className="lg" style={{ background:T.run }} />{rt(lang,'lgRun')}</span><span><i className="lg ol" />{rt(lang,'lgNoRun')}</span></>}
        <span><i className="lg here" />{rt(lang,'lgToday')}</span>
      </div>
      {wxStatus !== 'ok' && <p className="rs-note" style={{ marginTop:6 }}>{rt(lang, wxStatus === 'none' ? 'wxStripNone' : wxStatus === 'loading' ? 'wxStripLoading' : 'wxStripErr')}</p>}
    </div>
  );
}

// ── Boil atmosphere ──────────────────────────────────────────────────────────
function RsEvap({ on, lang }) {
  const ref = React.useRef(null); useRsPauseOffscreen(ref);
  const steam = on ? [0,1,2,3,4,5,6,7,8] : [];
  const bubbles = on ? [0,1,2,3,4,5,6,7,8,9,10] : [];
  return (
    <svg ref={ref} className="rs-evap" viewBox="0 0 340 204" width="100%" role="img" aria-label={rt(lang, on ? 'evapOn' : 'evapOff')}>
      <defs>
        <linearGradient id="rs-fireg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style={{ stopColor:'var(--rs-fire-a)' }} /><stop offset="1" style={{ stopColor:'var(--rs-fire-b)' }} /></linearGradient>
        <linearGradient id="rs-sapg" x1="0" x2="1"><stop offset="0" style={{ stopColor:'var(--rs-sap-lt)' }} /><stop offset=".7" style={{ stopColor:'var(--rs-syrup-lt)' }} /><stop offset="1" style={{ stopColor:'var(--rs-syrup)' }} /></linearGradient>
        {/* Soft-edged puff drawn by the gradient itself: an SVG blur filter here was re-rasterized every frame */}
        <radialGradient id="rs-steamg"><stop offset=".35" style={{ stopColor:'var(--rs-steam)', stopOpacity:1 }} /><stop offset="1" style={{ stopColor:'var(--rs-steam)', stopOpacity:0 }} /></radialGradient>
      </defs>
      {steam.map(k => <ellipse key={k} className="rs-steam" style={{ animationDelay:`${(k * .42).toFixed(2)}s` }} cx={58 + k * 27 + (k % 2 ? 7 : -3)} cy="86" rx={19 + (k % 3) * 5} ry={15 + (k % 2) * 4} fill="url(#rs-steamg)" />)}
      <rect x="296" y="4" width="20" height="92" rx="3" className="rs-ev-stack" strokeWidth="2" />
      <path d="M36 92 H244 V112 H36 Z" className="rs-ev-pan" /><path d="M246 94 H316 V112 H246 Z" className="rs-ev-pan" />
      <rect x="40" y="94" width="200" height="10" rx="2" fill="url(#rs-sapg)" />
      <rect x="250" y="96" width="62" height="8" rx="2" style={{ fill:T.syrup }} />
      {bubbles.map(k => <circle key={k} className="rs-bub" style={{ animationDelay:`${(k * .23).toFixed(2)}s` }} cx={50 + k * 21} cy="96" r={2 + (k % 3)} />)}
      <rect x="26" y="112" width="300" height="64" rx="8" className="rs-ev-arch" strokeWidth="2" />
      {[0,1,2,3,4,5,6,7].map(k => <line key={k} x1={44 + k * 36} x2={44 + k * 36} y1="116" y2="172" className="rs-ev-rib" strokeWidth="2" />)}
      <rect x="48" y="126" width="68" height="40" rx="6" className="rs-ev-door" strokeWidth="2" />
      {on && <rect className="rs-fire" x="54" y="132" width="56" height="28" rx="4" fill="url(#rs-fireg)" />}
      <path d="M316 104 v16 h8" className="rs-ev-valve" strokeWidth="4" fill="none" strokeLinecap="round" />
      {on && <circle className="rs-drip" cx="324" cy="126" r="3" style={{ fill:T.syrup }} />}
      <text x="140" y="198" className="rs-ct" textAnchor="middle">{rt(lang,'evapFlue')}</text><text x="281" y="198" className="rs-ct" textAnchor="middle">{rt(lang,'evapSyrupPan')}</text>
    </svg>
  );
}
function RsJugs({ gal, label }) {
  const n = Math.max(1, Math.ceil(gal) || 1), full = Math.floor(gal), part = gal - full;
  return (
    <div className="rs-jugs" role="img" aria-label={label}>
      {Array.from({ length: Math.min(n, 14) }, (_, k) => {
        const f = k < full ? 1 : part;
        return <svg key={k} width="20" height="26" viewBox="0 0 22 28" aria-hidden="true">
          <defs><clipPath id={`rs-jc${k}`}><path d="M5 9c-2 2-3 4-3 8v6a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-6c0-4-1-6-3-8z" /></clipPath></defs>
          <rect x="0" y={26 - 17 * f} width="22" height={17 * f + 2} style={{ fill:T.syrup }} clipPath={`url(#rs-jc${k})`} />
          <path d="M8 2h6v4H8zM5 9c-2 2-3 4-3 8v6a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-6c0-4-1-6-3-8M8 6v3M14 6v3" fill="none" style={{ stroke:T.tx }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>;
      })}
    </div>
  );
}
// The Boil screen's tall header: the evaporator photo fading to black with
// steam rising over it (default), or steam alone over black (Settings >
// Boil screen). Steam only rises while a boil is on; it never covers the
// back button or title (masked out of the top quarter).
const SR_STEAM_PUFFS = [[8,0,1.1,14],[26,1.6,1.4,36],[44,.8,1.2,26],[62,2.4,1.5,44],[80,1.2,1.1,50],[16,3.4,1.3,14],[54,4.2,1.6,36],[72,5.2,1.2,26],[36,6,1.4,44],[88,3,1,50]];
function RsBoilHero({ on, mode }) {
  const steamOnly = mode === 'steam';
  const ref = React.useRef(null); useRsPauseOffscreen(ref);
  return (
    <div ref={ref} className={`rs-hero rs-boilhero${steamOnly ? ' solo' : ''}${on ? ' live' : ''}`} aria-hidden="true">
      {!steamOnly && <><img src="/app/photos/evaporator-steam.webp" alt="" loading="lazy" decoding="async" /><div className="rs-hshade" /></>}
      {(on || steamOnly) && <div className={`rs-bsteam${steamOnly ? ' solo' : ''}${on ? '' : ' still'}`}>
        {SR_STEAM_PUFFS.map(([l, d, sc, b], i) => <i key={i} style={{ left:l + '%', animationDelay:d + 's', '--sc':sc, '--b':b + '%' }} />)}
      </div>}
    </div>
  );
}

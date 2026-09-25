// ─── Run Sheet UI kit ─────────────────────────────────────────────────────────
// Small presentational primitives for the new shell and, later, the new
// screens. Colours only through T (tokens); layout lives in app/runsheet.css.
// New screens (Phases 5-8) should build from these and add siblings here
// (NextCard, NumCard, Stepper, Sheet, Seg …) rather than inline one-offs.

// Glyphs from the approved prototype (Feather grammar, 24 grid). Stroke icons
// only; the brand leaf and hand-cut marks stay in I.mapleLeaf and M.* unchanged.
const RS_GLYPH = {
  season: <><circle cx="4.5" cy="12" r="2"/><circle cx="12" cy="12" r="2.5"/><circle cx="19.5" cy="12" r="2"/><path d="M6.5 12h3M14.5 12h3"/></>,
  bush:   <><path d="M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></>,
  plus:   <path d="M12 5v14M5 12h14"/>,
  pump:   <><circle cx="9" cy="14" r="5.5"/><path d="M9 14l2.8-2.8"/><path d="M9 8.5V5h11"/><path d="M14.5 14H20"/><path d="M4 21h10"/></>,
  shack:  <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a2.1 2.1 0 0 0 3 3l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>,
  watch:  <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m7 13 3-3 2 2 4-4"/></>,
  therm:  <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>,
  tree:   <><path d="M12 21v-7"/><path d="M12 14c-1.2 1.2-2.6 1.6-4 1"/><path d="M8.2 15.3A3.6 3.6 0 0 1 5 11.6a3.4 3.4 0 0 1 2-3.1 4 4 0 0 1 3.4-4.8A3.3 3.3 0 0 1 13.6 3a4 4 0 0 1 3.7 3 3.5 3.5 0 0 1 2.5 3.4 3.6 3.6 0 0 1 .2 4.8 3.6 3.6 0 0 1-3.9 1.3"/><path d="M12 14c1.2 1.2 2.6 1.6 4.1 1.3"/></>,
  map:    <><path d="M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></>,
  drop:   <path d="M12 3.5c3.2 4.3 5.5 7.6 5.5 10.6a5.5 5.5 0 0 1-11 0c0-3 2.3-6.3 5.5-10.6z"/>,
  flame:  <path d="M12 21a6 6 0 0 0 6-6c0-3.8-3-6-4-10-2.2 1.6-3.5 4-3.2 6.3-1-.4-1.8-1.3-2.2-2.4A7.5 7.5 0 0 0 6 15a6 6 0 0 0 6 6z"/>,
  chart:  <><path d="M4 20V4M4 20h16"/><path d="m7 15 4-4 3 3 5-6"/></>,
  calc:   <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></>,
  ro:     <><rect x="3" y="8" width="18" height="8" rx="4"/><path d="M7 12h10"/><path d="M12 16v4M9 20h6"/><path d="M12 8V4"/></>,
  filter: <path d="M4 4h16l-6 8v6l-4 2v-8z"/>,
  list:   <><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></>,
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a2.1 2.1 0 0 0 3 3l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>,
  check:  <path d="M5 12.5 10 17 19 7"/>,
  book:   <><path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2.5z"/><path d="M4 19.5A2 2 0 0 0 6 22h14"/></>,
  gear:   <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  data:   <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></>,
  pass:   <><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></>,
  user:   <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  up:     <><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></>,
  alert:  <><path d="M12 3 2 20h20z"/><path d="M12 10v4.5"/><path d="M12 17.5h.01"/></>,
  sun:    <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  lock:   <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
  chev:   <path d="m9 6 6 6-6 6"/>,
  back:   <path d="m15 6-6 6 6 6"/>,
  x:      <path d="M18 6 6 18M6 6l12 12"/>,
  clock:  <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
};
function RsIcon({ name, size = 24, sw = 2 }) {
  return (
    <svg className="rs-ic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{RS_GLYPH[name] || null}</svg>
  );
}
// Stage tile: a white glyph on a solid rounded square whose colour is the stage
// family (T.tile.*). Radius is 28% of the size, per the round 2 tile grammar.
function RsTile({ icon, family = 'power', size = 40 }) {
  return (
    <span className="rs-tile" style={{ width:size, height:size, borderRadius:Math.round(size * 0.28), background:T.tile[family] || T.tile.power }}>
      <RsIcon name={icon} size={Math.round(size * 0.55)} sw={2.6} />
    </span>
  );
}
// The in-app brand mark: the live SweetRun app icon, unchanged (precached).
function RsBrandMark({ size = 30 }) {
  return <img className="rs-brandmark" src="/app/icon-512.png" width={size} height={size} alt="" />;
}
// A tappable list row. `href` rows are links (hash routes); `onClick` rows are buttons.
function RsRow({ icon, family, title, sub, value, href, onClick, chev = true }) {
  const inner = <>
    {icon && <RsTile icon={icon} family={family} />}
    <span className="rs-rt"><b>{title}</b>{sub && <span>{sub}</span>}</span>
    {value != null && <span className="rs-rv">{value}</span>}
    {chev && <span className="rs-chev"><RsIcon name="chev" size={22} /></span>}
  </>;
  return href
    ? <a className="rs-row" href={href}>{inner}</a>
    : <button type="button" className="rs-row" onClick={onClick}>{inner}</button>;
}
// Photo header: its own lazily loaded WebP file from /app/photos (cached by the
// service worker on first view). Decorative, so empty alt and aria-hidden.
function RsHero({ photo }) {
  if (!photo) return null;
  return (
    <div className="rs-hero" aria-hidden="true">
      <img src={`/app/photos/${photo}.webp`} alt="" loading="lazy" decoding="async" />
      <div className="rs-hshade" />
    </div>
  );
}
function RsPushBar({ href, label }) {
  return (
    <div className="rs-pushbar">
      <a className="rs-back" href={href} style={{ textDecoration:'none' }}><RsIcon name="back" size={24} /> {label}</a>
    </div>
  );
}

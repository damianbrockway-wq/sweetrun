// ─── Run Sheet tokens (JS mirror of app/tokens.css) ─────────────────────────
// Inline styles in new code read colours as T.dim, T.acc … which resolve to the
// CSS custom properties, so a palette swap in tokens.css reaches every screen.
// Never write a hex value in a 4x-/5x-/6x-/9x- Run Sheet part; tokens.css is
// the only place they live. Canvas, SVG exports and Leaflet overlays that need
// a real colour string call tok('acc') at draw time instead.
const T = {
  bg:'var(--rs-bg)', s1:'var(--rs-s1)', s2:'var(--rs-s2)', s3:'var(--rs-s3)', s4:'var(--rs-s4)',
  line:'var(--rs-line)', line2:'var(--rs-line2)',
  tx:'var(--rs-tx)', dim:'var(--rs-dim)', mute:'var(--rs-mute)',
  acc:'var(--rs-acc)', accInk:'var(--rs-acc-ink)', accSoft:'var(--rs-acc-soft)',
  ok:'var(--rs-ok)', bad:'var(--rs-bad)', badSoft:'var(--rs-bad-soft)', ice:'var(--rs-ice)', iceSoft:'var(--rs-ice-soft)',
  sap:'var(--rs-sap)', syrup:'var(--rs-syrup)', bar:'var(--rs-bar)', run:'var(--rs-run)',
  tile: { weather:'var(--rs-t-weather)', tap:'var(--rs-t-tap)', lines:'var(--rs-t-lines)', collect:'var(--rs-t-collect)',
          boil:'var(--rs-t-boil)', recap:'var(--rs-t-recap)', power:'var(--rs-t-power)', bad:'var(--rs-t-bad)', ice:'var(--rs-t-ice)' },
  f:'var(--rs-f)', fc:'var(--rs-fc)',
};
// Resolved value of a token, e.g. tok('acc') -> '#DC8234'. Read at draw time
// (not cached) so a palette or night switch is picked up on the next draw.
function tok(name) {
  try { return getComputedStyle(document.documentElement).getPropertyValue('--rs-' + name).trim(); }
  catch { return ''; }
}

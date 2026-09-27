// ─── Bush (Phase 7): the real Leaflet map in Run Sheet chrome ───────────────
// Replaces the classic LinesTab mount on #/bush. Same data, same keys:
// sg_lines_pins (pins in _dropPin's shape), sg_mainlines ({id,label,color}
// only), sg_property_geo (imported boundary), the SW tile cache
// (sweetrun-tiles-v1). Per-line data lives in sg_line_meta and readings in
// sg_readings (26-rs-ops.jsx), never on the mainline list.
//
// Drawing grammar (DESIGN.md, Phases 7-8): imagery toned into the dark
// ground; lines white with one dash pattern each and a letter plate at the
// top end; the vacuum layer recolours a line by its latest reading; a leak
// suspect gets a red casing and a pulsing ring. Colours come from CSS classes
// (runsheet.css), so the token law holds inside Leaflet too.
//
// Routes: #/bush, #/bush/tree/<pinId>, #/bush/line/<id>, #/bush/draw/<id>,
// #/bush/tools. Selection after load is kept in state (and mirrored to the
// hash with replaceState) so the map is not rebuilt on every tap.

const SR_LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const SR_LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
// The same URLs classic loads, so the service worker's precache serves them offline.
function useSrLeaflet() {
  const [st, setSt] = useState(() => (window.L ? 'ready' : 'loading'));
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.L) { setSt('ready'); return; }
    setSt('loading');
    if (!document.querySelector(`link[href="${SR_LEAFLET_CSS}"]`)) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = SR_LEAFLET_CSS; document.head.appendChild(l);
    }
    let s = document.querySelector(`script[src="${SR_LEAFLET_JS}"]`);
    if (s && n) { s.remove(); s = null; }
    const done = () => setSt(window.L ? 'ready' : 'error');
    const tm = setTimeout(() => { if (!window.L) setSt('error'); }, 9000);
    if (!s) { s = document.createElement('script'); s.src = SR_LEAFLET_JS; document.body.appendChild(s); }
    s.addEventListener('load', done); s.addEventListener('error', () => setSt('error'));
    return () => { clearTimeout(tm); s.removeEventListener('load', done); };
  }, [n]);
  return [st, () => setN(x => x + 1)];
}
function useRsWide(q = '(min-width: 1100px)') {
  const [w, setW] = useState(() => { try { return window.matchMedia(q).matches; } catch { return false; } });
  useEffect(() => {
    let m; try { m = window.matchMedia(q); } catch { return; }
    const h = () => setW(m.matches); h();
    m.addEventListener ? m.addEventListener('change', h) : m.addListener(h);
    return () => { m.removeEventListener ? m.removeEventListener('change', h) : m.removeListener(h); };
  }, [q]);
  return w;
}

const SR_BUSH_LAYERS = { base: 'sat', trees: true, laterals: true, mainlines: true, vacuum: true, brix: false, pumps: true, tanks: true, property: true };
const srEsc = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
// Impeller glyph (prototype): a ring and four vanes that turn while the pump runs.
function srImpellerSvg(size, spin) {
  const vanes = [0, 90, 180, 270].map(a => `<path transform="rotate(${a} 12 12)" d="M12 12 C 12.4 8.6 14.6 6.6 17.4 6.4"/>`).join('');
  return `<svg class="rs-imp" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">` +
    `<circle cx="12" cy="12" r="9.6"/><g class="${spin ? 'rs-spin' : ''}">${vanes}</g><circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none"/></svg>`;
}
const SR_BOLT_SVG = size => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>`;
function RsImpeller({ size = 24, spin }) {
  return <span className="rs-impwrap" aria-hidden="true" dangerouslySetInnerHTML={{ __html: srImpellerSvg(size, spin) }} />;
}
// Pump tile: family colour while running, power grey when stopped, red with a notch on a fault.
function RsPumpTile({ p, size = 40 }) {
  const fam = p.status === 'fault' ? 'bad' : p.status === 'running' ? (SR_PUMP_FAMILY[p.kind] || 'power') : 'power';
  const run = p.status === 'running';
  return (
    <span className={`rs-tile rs-ptile ${p.status || 'stopped'}`} style={{ width:size, height:size, borderRadius:Math.round(size * .28), background:T.tile[fam] }}>
      {p.kind === 'generator' ? <span className={run ? 'rs-hum' : ''} style={{ display:'grid' }}><RsIcon name="bolt" size={Math.round(size * .56)} sw={2.7} /></span>
        : <RsImpeller size={Math.round(size * .64)} spin={run} />}
      {p.status === 'fault' && <i className="rs-pfault" />}
    </span>
  );
}
Object.assign(RS_GLYPH, {
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z"/>,
  gpsfix: <><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/></>,
  pen: <><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></>,
  undo: <><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></>,
  more: <><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></>,
  pin: <><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></>,
  gauge: <><path d="M4 16a8 8 0 1 1 16 0"/><path d="m12 16 4-5"/></>,
  house: <><path d="M3 11 12 4l9 7v9H3z"/><path d="M9 20v-6h6v6"/></>,
});

// ── Drawing ──────────────────────────────────────────────────────────────────
// Everything on the map is redrawn from the model into layer groups; Leaflet
// paths get CSS classes so their colours come from tokens.
function srBushBounds(model) {
  const pts = [];
  model.pins.forEach(p => { if (srFin(p.lat) && srFin(p.lon)) pts.push([p.lat, p.lon]); });
  model.lines.forEach(l => l.geo.pts.forEach(p => pts.push(p)));
  const gj = model.property;
  (gj && (gj.features || [gj]) || []).forEach(f => {
    const g = f && f.geometry; if (!g) return;
    const cs = g.type === 'Polygon' ? g.coordinates[0] : g.type === 'LineString' ? g.coordinates : [];
    (cs || []).forEach(c => { if (srFin(c[1]) && srFin(c[0])) pts.push([c[1], c[0]]); });
  });
  return pts;
}
function srDrawBush(L, map, G, model, ly, o) {
  const opt = o || {};
  Object.values(G).forEach(g => g.clearLayers());
  const rm = srRM();
  const watch = !!opt.watch;
  // Watch plates are room-sized; on a phone-width map they would collide, so they drop to the Bush size.
  const bigPlates = watch && map.getSize().x >= 640;
  const vacOn = watch || ly.vacuum;
  const sel = opt.sel || {};
  const byTree = {};
  // Property line
  if (ly.property && model.property && !watch) {
    const feats = model.property.type === 'FeatureCollection' ? (model.property.features || []) : [model.property];
    // A file line he made into a mainline path is drawn as that mainline, not twice.
    const used = new Set(model.lines.map(l => l.meta && l.meta.pathFrom != null ? l.meta.pathFrom : null).filter(x => x != null));
    feats.forEach((f, i) => {
      const g = f && f.geometry; if (!g || used.has(i)) return;
      const cs = g.type === 'Polygon' ? g.coordinates[0] : g.type === 'LineString' ? g.coordinates : null;
      if (!cs || cs.length < 2) return;
      const ll = cs.map(c => [c[1], c[0]]);
      L[ll.length > 2 && g.type === 'Polygon' ? 'polygon' : 'polyline'](ll, { className: 'rs-prop', weight: 2, dashArray: '8 8', fill: false, interactive: false }).addTo(G.base);
    });
  }
  // Lines: laterals, casing, core, flow, hit area
  model.lines.forEach(l => {
    const pts = l.geo.pts;
    const leak = l.leak.status === 'suspect';
    const vs = l.latest ? srVacStep(l.latest.v) : null;
    const tone = vacOn ? (leak ? ' leak' : vs != null ? ' v' + vs : ' none') : '';
    const isSel = sel.type === 'line' && sel.id === l.id;
    const watchOne = opt.one && opt.one !== l.id;
    if ((ly.laterals || watch) && pts.length >= 2) l.trees.forEach(t => {
      const q = srNearestOnPath([t.lat, t.lon], pts); if (!q) return;
      byTree[t.id] = l.id;
      L.polyline([[t.lat, t.lon], q], { className: 'rs-lat' + tone + (watchOne ? ' dim' : ''), weight: watch ? 2.4 : 1.3, interactive: false }).addTo(G.lines);
    });
    if (!(ly.mainlines || watch) || pts.length < 2) return;
    L.polyline(pts, { className: 'rs-ml-case' + (leak && vacOn ? ' leak' : '') + (isSel ? ' sel' : '') + (watchOne ? ' dim' : ''), weight: watch ? 14 : 9, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(G.lines);
    L.polyline(pts, { className: 'rs-ml-core' + tone + (watchOne ? ' dim' : ''), weight: watch ? 7 : 4, dashArray: watch ? null : (l.dash || null), lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(G.lines);
    if (l.flowing && !rm && !opt.stale) {
      const fl = L.polyline(pts, { className: 'rs-ml-flow' + (leak ? ' slow' : ''), weight: watch ? 4.5 : 3.5, dashArray: '0 22', lineCap: 'round', interactive: false }).addTo(G.lines);
      // Keep the flow's phase across redraws, so dots don't jump back when a reading changes.
      try { const dur = leak ? 3200 : 1600; fl._path.style.animationDelay = -(performance.now() % dur) + 'ms'; } catch {}
    }
    const hit = L.polyline(pts, { className: 'rs-ml-hit', weight: 26, interactive: true, bubblingMouseEvents: false });
    hit.on('click', () => opt.onLine && opt.onLine(l.id));
    hit.addTo(G.lines);
    // Letter plate at the top end, the reading beside it on the vacuum layer.
    const top = pts[0];
    const val = l.latest ? fmt(l.latest.v, 1) : null;
    const cls = 'rs-plate' + (vacOn && leak ? ' leak' : '') + (isSel ? ' sel' : '') + (bigPlates ? ' big' : '') + (watchOne ? ' dim' : '');
    const html = bigPlates
      ? `<button type="button" class="${cls}" data-line="${srEsc(l.id)}" data-fk="line:${srEsc(l.id)}" aria-label="${srEsc(opt.lineAria ? opt.lineAria(l) : l.label)}"><b>${srEsc(l.id)}</b><span class="rs-pv">${val ? srEsc(val) : '&middot;'}</span><small>${val ? srEsc(opt.unitIn || 'in') : srEsc(opt.noReading || '')}</small></button>`
      : `<button type="button" class="${cls}" data-line="${srEsc(l.id)}" data-fk="line:${srEsc(l.id)}" aria-label="${srEsc(opt.lineAria ? opt.lineAria(l) : l.label)}"><b>${srEsc(l.id)}</b>${vacOn && val ? `<span class="rs-pv">${srEsc(val)}</span>` : ''}</button>`;
    const mk = L.marker(top, { icon: L.divIcon({ className: 'rs-divicon', html, iconSize: null, iconAnchor: [0, 0] }), keyboard: false, zIndexOffset: 800, bubblingMouseEvents: false });
    mk.on('click', () => opt.onLine && opt.onLine(l.id));
    mk.addTo(G.marks);
    if (vacOn && leak && !watchOne) {
      L.marker(top, { icon: L.divIcon({ className: 'rs-divicon', html: `<span class="rs-leakring${rm ? '' : ' pulse'}"></span>${watch ? '' : `<span class="rs-leakpill">${srEsc(opt.leakWord || '')}</span>`}`, iconSize: null, iconAnchor: [0, 0] }), interactive: false, keyboard: false }).addTo(G.marks);
    }
  });
  // Trees (and Brix at the tree)
  if (!watch && (ly.trees || ly.brix)) model.pins.filter(p => p.type === 'tree' && srFin(p.lat) && srFin(p.lon)).forEach(t => {
    const isSel = sel.type === 'tree' && sel.id === t.id;
    const bx = ly.brix ? (model.treeBrix[t.id] || []).slice(-1)[0] : null;
    if (bx) {
      const b = parseFloat(bx.brix);
      L.marker([t.lat, t.lon], { icon: L.divIcon({ className: 'rs-divicon', html: `<span class="rs-bxdot${b >= 2.5 ? ' hi' : b >= 2 ? ' mid' : ''}${isSel ? ' sel' : ''}">${srEsc(fmt(b, 1))}</span>`, iconSize: null, iconAnchor: [0, 0] }), keyboard: false, bubblingMouseEvents: false })
        .on('click', () => opt.onTree && opt.onTree(t.id)).addTo(G.marks);
      return;
    }
    if (!ly.trees) return;
    L.circleMarker([t.lat, t.lon], { radius: isSel ? 7 : 4.2, className: 'rs-tree' + (t.health === 'dead' ? ' dead' : '') + (isSel ? ' sel' : '') + (t.mainline ? '' : ' free'), weight: 1.4, fillOpacity: 1, interactive: false }).addTo(G.trees);
    L.circleMarker([t.lat, t.lon], { radius: 14, className: 'rs-hitdot', weight: 0, fillOpacity: 0, interactive: true, bubblingMouseEvents: false })
      .on('click', () => opt.onTree && opt.onTree(t.id)).addTo(G.trees);
  });
  // Tanks, pumps, sugarhouse, other pins
  const tankPts = [], pumpMks = [];
  model.pins.forEach(p => {
    if (!srFin(p.lat) || !srFin(p.lon) || p.type === 'tree') return;
    const isSel = sel.type === 'pin' && sel.id === p.id;
    let html = null, anchor = [0, 0];
    if (p.type === 'tank') {
      if (!(ly.tanks || watch)) return;
      const t = model.tanks.find(x => String(x.pinId) === String(p.id)) || null;
      const tk = t && (model.tankLevels || {})[t.id];
      const pct = tk && tk.capGal > 0 && tk.levelGal != null ? Math.max(0, Math.min(1, tk.levelGal / tk.capGal)) : null;
      html = `<span class="rs-mtank${isSel ? ' sel' : ''}${watch ? ' big' : ''}"><span class="rs-mtk"><i style="height:${pct != null ? Math.round(pct * 100) : 0}%"></i></span>` +
        `<span class="rs-mlbl">${srEsc(p.label || 'Tank')}${pct != null ? ' &middot; ' + Math.round(pct * 100) + '%' : ''}</span></span>`;
    } else if (p.type === 'pump') {
      if (!(ly.pumps || watch)) return;
      const pu = model.pumps.find(x => String(x.pinId) === String(p.id));
      const st = pu ? pu.status : 'stopped';
      const fam = st === 'fault' ? 'bad' : st === 'running' ? (SR_PUMP_FAMILY[pu.kind] || 'power') : 'power';
      html = `<span class="rs-mpump${isSel ? ' sel' : ''}${watch ? ' big' : ''}" style="background:var(--rs-t-${fam})">${pu && pu.kind === 'generator' ? SR_BOLT_SVG(watch ? 22 : 15) : srImpellerSvg(watch ? 24 : 16, st === 'running' && !rm && !opt.stale)}</span>` +
        `<span class="rs-mlbl side">${srEsc(pu ? pu.name : (p.label || 'Pump'))}</span>`;
    } else if (p.type === 'sugarhouse') {
      if (watch && !opt.showHouse) return;
      html = `<span class="rs-mhouse${isSel ? ' sel' : ''}"><svg width="26" height="24" viewBox="0 0 26 24" aria-hidden="true"><path d="M2 12 13 3l11 9v10H2z"/></svg></span><span class="rs-mlbl">${srEsc(p.label || 'Sugarhouse')}</span>`;
    } else {
      if (watch) return;
      html = `<span class="rs-mpin${isSel ? ' sel' : ''}"></span><span class="rs-mlbl dim">${srEsc(p.label || '')}</span>`;
    }
    // Focusable when it opens something (the Bush, not Watch): Tab reaches it, Enter or
    // Space opens its detail, and data-fk lets focus find it again after a redraw.
    const kb = !!opt.onPin;
    const mk = L.marker([p.lat, p.lon], { icon: L.divIcon({ className: 'rs-divicon rs-center', html, iconSize: null, iconAnchor: anchor }), keyboard: kb, bubblingMouseEvents: false, zIndexOffset: 600 });
    mk.on('click', () => opt.onPin && opt.onPin(p.id));
    // Set on 'add', when Leaflet has made the icon element (it does not exist yet while
    // the marker group is off the map, as on the first draw).
    if (kb) mk.on('add', () => {
      const mel = mk.getElement && mk.getElement(); if (!mel || mel.hasAttribute('data-fk')) return;
      mel.setAttribute('aria-label', opt.pinAria ? opt.pinAria(p, (mel.textContent || '').replace(/\s+/g, ' ').trim()) : String(p.label || p.type));
      mel.setAttribute('data-fk', 'pin:' + p.id);
      mel.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); mk.fire('click'); } });
    });
    mk.addTo(G.marks);
    if (p.type === 'tank') tankPts.push([p.lat, p.lon]); else if (p.type === 'pump') pumpMks.push(mk);
  });
  // A pump is usually a few metres from its tank; at bush zoom the two tiles
  // would sit on top of each other. Slide the pump beside the tank on screen
  // (its real spot is unchanged) and redo it after every zoom.
  const tankHalf = watch ? 30 : 20;
  const nudge = () => {
    pumpMks.forEach(mk => {
      const el = mk.getElement && mk.getElement(); if (!el) return;
      const pp = map.latLngToContainerPoint(mk.getLatLng());
      let dx = 0;
      tankPts.forEach(t => { const tp = map.latLngToContainerPoint(t); if (Math.abs(tp.y - pp.y) < 44 && Math.abs(tp.x - pp.x) < tankHalf + 20) dx = Math.max(dx, tp.x + tankHalf + 22 - pp.x); });
      el.style.marginLeft = dx ? Math.round(dx) + 'px' : '';
    });
  };
  if (map._rsNudge) map.off('zoomend moveend', map._rsNudge);
  map._rsNudge = nudge; map.on('zoomend moveend', nudge);
  // The first draw can run before the view exists (the fit comes right after it), so run once more on the next frame.
  try { nudge(); } catch {}
  requestAnimationFrame(() => { try { nudge(); } catch {} });
  // Draw-mode path in progress
  if (opt.draft && opt.draft.length) {
    if (opt.draft.length >= 2) L.polyline(opt.draft, { className: 'rs-draft', weight: 4, dashArray: '6 8', interactive: false }).addTo(G.marks);
    opt.draft.forEach((p, i) => L.circleMarker(p, { radius: i === 0 ? 7 : 5, className: 'rs-draftdot', weight: 2, fillOpacity: 1, interactive: false }).addTo(G.marks));
  }
}

// Base imagery, toned by CSS (.rs-map .leaflet-tile-pane). Classic's layer set.
function srApplyBase(L, map, base) {
  if (!map._rs) {
    if (!map.getPane('rs-terrain')) { const p = map.createPane('rs-terrain'); p.style.zIndex = 250; p.classList.add('rs-terrain-pane'); }
    map._rs = {
      sat: L.tileLayer(SR_TILE.sat, { attribution: 'Imagery &copy; Esri', maxZoom: 20, maxNativeZoom: 19 }),
      hill: L.tileLayer(SR_TILE.hill, { attribution: 'Hillshade &copy; Esri', pane: 'rs-terrain', maxNativeZoom: 16, maxZoom: 20, opacity: .5 }),
      topo: L.tileLayer(SR_TILE.topo, { attribution: 'USGS The National Map', maxNativeZoom: 16, maxZoom: 19 }),
      street: L.tileLayer(SR_TILE.street, { attribution: '&copy; OpenStreetMap', maxZoom: 19 }),
    };
  }
  const want = { sat: base === 'sat' || base === 'sat-terrain', hill: base === 'sat-terrain', topo: base === 'topo', street: base === 'street' };
  Object.keys(want).forEach(k => { const l = map._rs[k]; if (want[k]) { if (!map.hasLayer(l)) l.addTo(map); } else if (map.hasLayer(l)) map.removeLayer(l); });
}

// A Leaflet map in a div, torn down on unmount. Returns [mapRef, groupsRef, tileState].
function useSrMap(divRef, lf, opts) {
  const mapRef = React.useRef(null), gRef = React.useRef(null);
  const [tiles, setTiles] = useState({ ok: 0, err: 0 });
  useEffect(() => {
    if (lf !== 'ready' || !divRef.current || mapRef.current) return;
    const L = window.L;
    // fadeAnimation off: tiles appear at once (no half-faded imagery under reduced motion or a paused clock).
    const map = L.map(divRef.current, { zoomControl: false, attributionControl: true, zoomSnap: 0.5, fadeAnimation: false, ...(opts || {}) });
    try { map.attributionControl.setPrefix(false); } catch {}
    mapRef.current = map; window._rsMap = map;   // the headless suites read it
    gRef.current = { base: L.layerGroup().addTo(map), lines: L.layerGroup().addTo(map), trees: L.layerGroup().addTo(map), marks: L.layerGroup().addTo(map), gps: L.layerGroup().addTo(map) };
    let ok = 0, err = 0, tm = null;
    const bump = () => { clearTimeout(tm); tm = setTimeout(() => setTiles({ ok, err }), 250); };
    map.on('tileload', () => { ok++; bump(); });
    map.on('tileerror', () => { err++; bump(); });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { try { map.invalidateSize(); } catch {} }) : null;
    if (ro) ro.observe(divRef.current);
    return () => { clearTimeout(tm); if (ro) ro.disconnect(); try { map.remove(); } catch {} mapRef.current = null; gRef.current = null; if (window._rsMap === map) window._rsMap = null; };
  }, [lf]);
  return [mapRef, gRef, tiles];
}

// Plain-language reading age: "read 2 h ago", "read just now".
function srAgo(ms, now, L) {
  if (!srFin(ms)) return '';
  const m = Math.max(0, Math.round((now - ms) / 60000));
  if (m < 1) return rt(L, 'agoNow');
  if (m < 60) return rt(L, 'agoMin', { n: m });
  const h = m / 60;
  if (h < 24) return rt(L, 'agoH', { n: h < 10 ? fmt(Math.floor(h * 2) / 2, h % 1 >= .5 && h < 10 ? 1 : 0) : fmt(Math.round(h), 0) });
  const d = Math.round(h / 24);
  return rt(L, d === 1 ? 'agoD1' : 'agoD', { n: d });
}

// ── The screen ───────────────────────────────────────────────────────────────
function RsBush({ c, sub }) {
  const L_ = c.lang;
  const [lf, retryLf] = useSrLeaflet();
  const model = useSrOps(c);
  const wide = useRsWide();
  const [layers, setLayersState] = useState(() => ({ ...SR_BUSH_LAYERS, ...srObj(ls.get('sg_bush_layers', {})) }));
  const setLayers = patch => setLayersState(s => { const n = { ...s, ...patch }; ls.set('sg_bush_layers', n); return n; });
  const s0 = sub || [];
  const [sel, setSelState] = useState(() => s0[0] === 'tree' ? { type: 'tree', id: +s0[1] } : s0[0] === 'line' ? { type: 'line', id: s0[1] } : null);
  const [sheet, setSheet] = useState(() => s0[0] === 'tools' ? 'tools' : null);
  const [mode, setMode] = useState(() => s0[0] === 'draw' && s0[1] ? { kind: 'draw', id: s0[1], pts: [] } : null);   // {kind:'add', type, line} | {kind:'draw', id, pts}
  const [gps, setGps] = useState({ on: false, acc: null, err: null, pos: null });
  const [msg, setMsg] = useState(null);
  const divRef = React.useRef(null);
  const [mapRef, gRef, tiles] = useSrMap(divRef, lf);
  const fitted = React.useRef(false);
  const setSel = s => {
    setSelState(s);
    try { history.replaceState(null, '', '#/bush' + (s ? '/' + s.type + '/' + s.id : '')); } catch {}
  };
  const tankLevels = React.useMemo(() => { const o = {}; model.tanks.forEach(t => { o[t.id] = t; }); return o; }, [model.tanks]);
  const drawModel = React.useMemo(() => ({ ...model, tanks: model.tanksRaw, tankLevels }), [model, tankLevels]);

  // Draw (and first fit) whenever the data, the layers or the selection change.
  useEffect(() => {
    const map = mapRef.current, G = gRef.current; if (!map || !G) return;
    const L = window.L;
    srApplyBase(L, map, layers.base);
    srDrawBush(L, map, G, drawModel, layers, {
      sel, draft: mode && mode.kind === 'draw' ? mode.pts : null, leakWord: rt(L_, 'leakSuspectW'),
      unitIn: srUnitL('in', L_),
      lineAria: l => rt(L_, 'lineAria', { n: l.label, v: l.latest ? fmt(l.latest.v, 1) : rt(L_, 'noReadingW') }),
      // The name a screen reader hears is what the map shows ("Vacuum pump", "Tank 1 · 78%"), plus the kind when the label does not say it.
      pinAria: (p, shown) => { const k = rt(L_, 'pinK_' + p.type), t = shown || p.label || ''; return !t ? k : t.toLowerCase().includes(k.toLowerCase()) ? t : `${t}, ${k}`; },
      onLine: id => { if (mode) return; setSel({ type: 'line', id }); },
      onTree: id => { if (mode) return; setSel({ type: 'tree', id }); },
      onPin: id => { if (mode) return; const p = model.pins.find(x => x.id === id); if (p) setSel({ type: 'pin', id }); },
    });
    if (!fitted.current) {
      fitted.current = true;
      const pts = srBushBounds(drawModel);
      if (sel && sel.type === 'tree') { const t = model.pins.find(p => p.id === sel.id); if (t) { map.setView([t.lat, t.lon], 18); return; } }
      if (sel && sel.type === 'line') { const l = model.lines.find(x => x.id === sel.id); if (l && l.geo.pts.length >= 2) { map.fitBounds(L.latLngBounds(l.geo.pts), { padding: [60, 60], maxZoom: 18 }); return; } }
      // Room for the chrome: the title plate and buttons on top, the Watch button and chips below.
      if (pts.length >= 2) map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [40, 120], paddingBottomRight: [40, 150], maxZoom: 18 });
      else if (pts.length === 1) map.setView(pts[0], 17);
      else map.setView([45.5, -72.0], 14);
    }
  }, [lf, model.ver, layers, sel, mode, L_]);

  // Map taps: add a pin, add a draw vertex, or clear the selection.
  const modeRef = React.useRef(mode); modeRef.current = mode;
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const h = e => {
      const M = modeRef.current;
      if (M && M.kind === 'draw') { setMode(m => ({ ...m, pts: [...m.pts, [e.latlng.lat, e.latlng.lng]] })); return; }
      if (M && M.kind === 'add') { dropPin(e.latlng.lat, e.latlng.lng, M, null); return; }
      setSel(null);
    };
    map.on('click', h);
    return () => { map.off('click', h); };
  }, [lf]);

  // GPS tracking with the accuracy badge (classic's watchPosition settings).
  const gpsWatch = React.useRef(null), gpsFirst = React.useRef(false);
  useEffect(() => () => { if (gpsWatch.current != null) try { navigator.geolocation.clearWatch(gpsWatch.current); } catch {} }, []);
  useEffect(() => {
    const G = gRef.current, map = mapRef.current; if (!G || !map) return;
    G.gps.clearLayers();
    if (!gps.pos) return;
    const L = window.L;
    L.circle(gps.pos, { radius: gps.acc || 10, className: 'rs-gpsacc', weight: 1, interactive: false }).addTo(G.gps);
    L.marker(gps.pos, { icon: L.divIcon({ className: 'rs-divicon', html: '<span class="rs-gpsdot"></span>', iconSize: null, iconAnchor: [0, 0] }), interactive: false, keyboard: false, zIndexOffset: 1000 }).addTo(G.gps);
  }, [gps.pos, gps.acc, lf]);
  const toggleGps = () => {
    if (gps.on) {
      if (gpsWatch.current != null) try { navigator.geolocation.clearWatch(gpsWatch.current); } catch {}
      gpsWatch.current = null; setGps({ on: false, acc: null, err: null, pos: null }); return;
    }
    if (!navigator.geolocation) { setGps(g => ({ ...g, err: 'none' })); return; }
    gpsFirst.current = true;
    setGps({ on: true, acc: null, err: null, pos: null });
    gpsWatch.current = navigator.geolocation.watchPosition(p => {
      const pos = [p.coords.latitude, p.coords.longitude], acc = p.coords.accuracy != null ? Math.round(p.coords.accuracy) : null;
      setGps({ on: true, acc, err: null, pos });
      const map = mapRef.current;
      if (map) { if (gpsFirst.current) { gpsFirst.current = false; map.setView(pos, Math.max(map.getZoom(), 17)); } else map.panTo(pos); }
    }, e => setGps(g => ({ ...g, err: e && e.code === 1 ? 'denied' : 'lost' })), { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 });
  };

  // Pins: _dropPin's shape, written through ls.set and checked.
  const dropPin = (lat, lon, M, acc) => {
    const all = srArr(ls.get('sg_lines_pins', []));
    const extra = { ...(acc != null ? { accuracy: acc } : {}), ...(M.type === 'tree' && M.line ? { mainline: M.line } : {}) };
    const pin = srMakePin(all, lat, lon, M.type, extra, Date.now());
    if (!srSavePins([...all, pin])) { setMsg({ bad: true, t: rt(L_, 'bNotSavedT') + ' ' + rt(L_, SR_WRITE_FAIL === 'quota' ? 'bQuotaP' : 'bLockedP') }); setMode(null); return; }
    srToast(acc != null ? rt(L_, 'pinAddedAcc', { n: pin.tagged || pin.label, a: acc }) : rt(L_, 'pinAdded', { n: pin.tagged || pin.label }));
    if (!(M.keep)) setMode(null);
    if (M.type === 'tree') setSel({ type: 'tree', id: pin.id });
  };
  const addAtGps = M => {
    if (!navigator.geolocation) { setMsg({ bad: true, t: rt(L_, 'gpsNone') }); return; }
    setMsg({ t: rt(L_, 'gpsFinding') });
    navigator.geolocation.getCurrentPosition(p => {
      setMsg(null);
      const acc = p.coords.accuracy != null ? Math.round(p.coords.accuracy) : null;
      dropPin(p.coords.latitude, p.coords.longitude, M, acc);
      const map = mapRef.current; if (map) map.setView([p.coords.latitude, p.coords.longitude], 18);
    }, e => setMsg({ bad: true, t: rt(L_, e && e.code === 1 ? 'gpsDeniedS' : 'gpsLost') }), { enableHighAccuracy: true, timeout: 12000 });
  };
  const finishDraw = () => {
    if (!mode || mode.pts.length < 2) { setMode(null); return; }
    if (!srSaveLineMeta(mode.id, { path: mode.pts.map(p => [+p[0].toFixed(7), +p[1].toFixed(7)]), pathFrom: null })) {
      setMsg({ bad: true, t: rt(L_, 'bNotSavedT') + ' ' + rt(L_, SR_WRITE_FAIL === 'quota' ? 'bQuotaP' : 'bLockedP') }); return;
    }
    const id = mode.id; setMode(null); setSel({ type: 'line', id }); srToast(rt(L_, 'lineDrawn'));
  };

  // Closing the wide panel's detail: focus goes back to the plate or pin that opened it
  // (redrawn meanwhile, found by data-fk), or to the tree finder for a tree.
  const closeSide = () => {
    const s = sel; setSel(null);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (s && s.type === 'tree') { const q = document.getElementById('rs-tfind-q'); if (q) { q.focus(); return; } }
      if (s) srFocusBack(null, (s.type === 'pin' ? 'pin:' : 'line:') + s.id);
    }));
  };
  // A tree picked from the finder: select it and bring it into view.
  const pickTree = t => { setSel({ type: 'tree', id: t.id }); const map = mapRef.current; if (map && srFin(t.lat) && srFin(t.lon)) map.setView([t.lat, t.lon], Math.max(map.getZoom(), 18)); };
  const selTree = sel && sel.type === 'tree' ? model.pins.find(p => p.id === sel.id && p.type === 'tree') : null;
  const selLine = sel && sel.type === 'line' ? model.lines.find(l => l.id === sel.id) : null;
  const selPin = sel && sel.type === 'pin' ? model.pins.find(p => p.id === sel.id) : null;
  const trees = model.pins.filter(p => p.type === 'tree');
  const taps = trees.reduce((s, p) => s + (parseInt(p.taps) || 0), 0);
  const empty = model.pins.length === 0 && !model.property;
  const tileTrouble = tiles.err > 8 && tiles.ok === 0 && lf === 'ready';
  const accTier = gps.acc == null ? '' : gps.acc <= 5 ? 'ok' : gps.acc <= 15 ? 'check' : 'bad';
  const detail = selTree ? <RsTreeDetail c={c} model={model} tree={selTree} onClose={() => setSel(null)} />
    : selLine ? <RsLineDetail c={c} model={model} line={selLine} onClose={() => setSel(null)} onDraw={() => { setSel(null); setMode({ kind: 'draw', id: selLine.id, pts: [] }); }} />
    : selPin ? <RsPinDetail c={c} model={model} pin={selPin} onClose={() => setSel(null)} /> : null;
  const detailTitle = selTree ? (selTree.tagged || selTree.label) : selLine ? selLine.label : selPin ? selPin.label : '';

  return (
    <div className={`rs-bushwrap${wide ? ' wide' : ''}`}>
      <div className="rs-bushmap">
        <div ref={divRef} className={`rs-map base-${layers.base}`} role="region" aria-label={rt(L_, 'bushMapAria', { t: trees.length, l: model.lines.length })} />
        {lf === 'loading' && <div className="rs-mapskel" aria-hidden="true" />}
        {lf === 'error' && <div className="rs-mapstate"><div className="rs-empty"><b>{rt(L_, 'mapLoadT')}</b><p>{rt(L_, 'mapLoadP')}</p>
          <RsBtn kind="secondary" onClick={retryLf}>{rt(L_, 'tryAgain')}</RsBtn></div></div>}
        <header className="rs-phead rs-maptop">
          <div className="rs-mapt"><h1>{rt(L_, 'bushMap')}</h1><span className="tn">{rt(L_, 'bushCountsT', { t: fmt(taps, 0), l: model.lines.length }).replace(' · ', '\u00a0· ')}</span></div>
          <div className="rs-mbtns">
            <button type="button" className="rs-mbtn" aria-label={rt(L_, 'addToMap')} onClick={() => setSheet('add')}><RsIcon name="plus" size={26} sw={2.4} /></button>
            <button type="button" className="rs-mbtn" aria-label={rt(L_, 'bushLayers')} onClick={() => setSheet('layers')}><RsIcon name="layers" size={25} sw={2.2} /></button>
            <button type="button" className={`rs-mbtn${gps.on ? ' on' : ''}`} aria-pressed={gps.on} aria-label={rt(L_, gps.on ? 'gpsStop' : 'gpsStart')} onClick={toggleGps}><RsIcon name="gps" size={25} sw={2.2} /></button>
          </div>
        </header>
        <div className="rs-mapnotes">
          <RsBanners c={c} />
          {gps.on && <div className={`rs-accbadge ${accTier}`} role="status">{gps.err ? rt(L_, gps.err === 'denied' ? 'gpsDeniedS' : 'gpsLost') : gps.acc == null ? rt(L_, 'gpsFinding') : rt(L_, 'gpsAcc', { a: gps.acc })}</div>}
          {tileTrouble && <div className="rs-mapmsg" role="status"><RsIcon name="info" size={20} />{rt(L_, 'tilesDown')}</div>}
          {msg && <div className={`rs-mapmsg${msg.bad ? ' bad' : ''}`} role="status">{msg.t}<button type="button" className="rs-xbtn" aria-label={rt(L_, 'dismiss')} onClick={() => setMsg(null)}><RsIcon name="x" size={20} /></button></div>}
          {mode && mode.kind === 'add' && <div className="rs-mapmode" role="status"><b>{rt(L_, 'tapToAdd', { k: rt(L_, 'pinK_' + mode.type).toLowerCase() })}</b>
            <button type="button" className="rs-btn2 sm" onClick={() => setMode(null)}>{rt(L_, 'doneW')}</button></div>}
          {mode && mode.kind === 'draw' && <div className="rs-mapmode" role="status">
            <b>{rt(L_, 'drawHint', { n: (model.lines.find(l => l.id === mode.id) || {}).label || mode.id })}</b>
            <span className="rs-meta tn">{rt(L_, 'drawPts', { n: mode.pts.length })}</span>
            <div className="rs-drawbtns">
              <button type="button" className="rs-btn2 sm" disabled={!mode.pts.length} onClick={() => setMode(m => ({ ...m, pts: m.pts.slice(0, -1) }))}><RsIcon name="undo" size={20} />{rt(L_, 'undoW')}</button>
              <button type="button" className="rs-btn2 sm" onClick={() => setMode(null)}>{rt(L_, 'cancelW')}</button>
              <button type="button" className="rs-btn sm" disabled={mode.pts.length < 2} onClick={finishDraw}>{rt(L_, 'saveLine')}</button>
            </div></div>}
        </div>
        {empty && lf === 'ready' && !mode && <div className="rs-mapempty">
          <div className="rs-mk"><M.tree size={44} /></div>
          <b>{rt(L_, 'bushEmptyT')}</b><p>{rt(L_, 'bushEmptyP')}</p>
          <RsBtn icon="gps" onClick={() => addAtGps({ type: 'tree' })}>{rt(L_, 'addTreeHere')}</RsBtn>
          <div style={{ marginTop: 10 }}><RsBtn kind="secondary" icon="up" onClick={() => setSheet('tools')}>{rt(L_, 'importBoundary')}</RsBtn></div>
        </div>}
        <div className="rs-mapfoot">
          <a className="rs-mbtn wide" href={rsHref('watch')}><RsIcon name="watch" size={24} /><span>{rt(L_, 'watchBush')}</span></a>
          <div className="rs-mzoom">
            {!wide && trees.length > 0 && <button type="button" className="rs-mbtn rs-mfind" data-fk="find" aria-label={rt(L_, 'findTree')} onClick={() => setSheet('find')}><RsIcon name="search" size={24} /></button>}
            <button type="button" className="rs-mbtn" aria-label={rt(L_, 'zoomIn')} onClick={() => mapRef.current && mapRef.current.zoomIn()}><RsIcon name="plus" size={24} /></button>
            <button type="button" className="rs-mbtn" aria-label={rt(L_, 'zoomOut')} onClick={() => mapRef.current && mapRef.current.zoomOut()}><RsIcon name="minus" size={24} /></button>
          </div>
        </div>
        {!wide && <div className="rs-mapchips" role="group" aria-label={rt(L_, 'bushLayers')}>
          {[['trees', 'lyTrees'], ['mainlines', 'lyLines'], ['vacuum', 'lyVacuum'], ['brix', 'lyBrix'], ['pumps', 'lyPumps'], ['tanks', 'lyTanks']].map(([k, l]) =>
            <button key={k} type="button" className={`rs-chip${layers[k] ? ' on' : ''}`} aria-pressed={!!layers[k]} onClick={() => setLayers({ [k]: !layers[k] })}>{rt(L_, l)}</button>)}
        </div>}
      </div>
      {wide && <aside className="rs-bushside" aria-label={rt(L_, 'bushPanel')}>
        {detail ? <div className="rs-sidedetail">
          <div className="rs-shead"><h2>{detailTitle}</h2><button type="button" className="rs-xbtn" aria-label={rt(L_, 'close')} onClick={closeSide}><RsIcon name="x" size={22} /></button></div>
          {detail}
        </div> : <RsBushOverview c={c} model={model} layers={layers} setLayers={setLayers} onTree={pickTree} onLine={id => { setSel({ type: 'line', id }); const l = model.lines.find(x => x.id === id); if (l && l.geo.pts.length >= 2 && mapRef.current) mapRef.current.fitBounds(window.L.latLngBounds(l.geo.pts), { padding: [60, 60], maxZoom: 18 }); }}
          onTools={() => setSheet('tools')} onAdd={() => setSheet('add')} />}
      </aside>}
      {!wide && detail && <RsSheet title={detailTitle} onClose={() => setSel(null)} id="rs-bush-detail"
        returnTo={selLine ? 'line:' + selLine.id : selPin ? 'pin:' + selPin.id : selTree ? 'find' : null}>{detail}</RsSheet>}
      {sheet === 'find' && <RsSheet title={rt(L_, 'findTree')} onClose={() => setSheet(null)} id="rs-tfind-sheet">
        <RsTreeFinder c={c} model={model} autoFocus onPick={t => { setSheet(null); pickTree(t); }} /></RsSheet>}
      {sheet === 'layers' && <RsLayersSheet c={c} layers={layers} setLayers={setLayers} hasProperty={!!model.property} onClose={() => setSheet(null)} />}
      {sheet === 'add' && <RsAddSheet c={c} model={model} onClose={() => setSheet(null)}
        onGps={M => { setSheet(null); addAtGps(M); }} onTap={M => { setSheet(null); setSel(null); setMode({ kind: 'add', keep: true, ...M }); }}
        onCoords={(lat, lon, M) => { setSheet(null); dropPin(lat, lon, M, null); const map = mapRef.current; if (map) map.setView([lat, lon], 18); }}
        onTools={() => setSheet('tools')} />}
      {sheet === 'tools' && <RsMapTools c={c} model={model} mapRef={mapRef} base={layers.base} onClose={() => setSheet(null)}
        onDraw={id => { setSheet(null); setSel(null); setMode({ kind: 'draw', id, pts: [] }); }} />}
    </div>
  );
}

// Find a tree: the keyboard and screen-reader path to every tree on the map (trees
// are drawn as SVG dots, and hundreds of Tab stops would be worse than none). A
// search by tag or name, then the same tree detail a tap on the map opens.
function RsTreeFinder({ c, model, onPick, autoFocus, cap = 40 }) {
  const L = c.lang;
  const [q, setQ] = useState('');
  const tagOf = t => String(t.tagged || t.label || '');
  const all = React.useMemo(() => model.pins.filter(p => p.type === 'tree')
    .sort((a, b) => tagOf(a).localeCompare(tagOf(b), undefined, { numeric: true })), [model.pins]);
  if (!all.length) return null;
  const k = q.trim().toLowerCase();
  const hits = k ? all.filter(t => tagOf(t).toLowerCase().includes(k)) : all;
  const shown = hits.slice(0, cap);
  return (
    <div className="rs-tfind">
      <label className="rs-vh" htmlFor="rs-tfind-q">{rt(L, 'findTree')}</label>
      <input id="rs-tfind-q" className="rs-field" type="search" autoComplete="off" value={q} placeholder={rt(L, 'findTreePh')} data-autofocus={autoFocus ? '' : undefined}
        onChange={e => setQ(e.target.value)} />
      {shown.length ? <div className="rs-list" style={{ marginTop: 10 }}>{shown.map(t => (
        <button key={t.id} type="button" className="rs-row" onClick={() => onPick(t)}>
          <span className="rs-rt"><b>{tagOf(t) || rt(L, 'pinK_tree')}</b>
            <span className="tn">{[t.mainline ? rt(L, 'lineN', { id: t.mainline }) : rt(L, 'noLineW'), rt(L, 'nTaps', { n: parseInt(t.taps) || 0 })].join(' · ')}</span></span>
          <span className="rs-chev"><RsIcon name="chev" size={22} /></span>
        </button>))}</div>
        : <div className="rs-empty" style={{ marginTop: 10 }}><b>{rt(L, 'findNone', { q: q.trim() })}</b><p>{rt(L, 'findNoneP')}</p>
          <RsBtn kind="secondary" onClick={() => setQ('')}>{rt(L, 'showAllTrees')}</RsBtn></div>}
      {hits.length > cap && <p className="rs-note" role="status">{rt(L, 'findMore', { n: cap, t: hits.length })}</p>}
    </div>
  );
}

// Wide side panel with nothing selected: lines, tanks, pumps, layer switches.
function RsBushOverview({ c, model, layers, setLayers, onLine, onTree, onTools, onAdd }) {
  const L = c.lang, u = srU(c.units);
  return (
    <div className="rs-sideov">
      <h2 className="rs-sec">{rt(L, 'mainlines')}</h2>
      {model.lines.length ? <div className="rs-list">{model.lines.map(l => (
        <button key={l.id} type="button" className="rs-row" onClick={() => onLine(l.id)}>
          <RsLinePlate l={l} />
          <span className="rs-rt"><b>{l.label}</b><span className="tn">{rt(L, 'treesTaps', { t: l.trees.length, n: l.taps })}{l.latest ? ' · ' + srAgo(l.latest.ms, model.now, L) : ''}</span></span>
          <RsVacValue l={l} L={L} />
        </button>))}</div>
        : <div className="rs-empty"><b>{rt(L, 'noLinesT')}</b><p>{rt(L, 'noLinesBush')}</p></div>}
      {onTree && model.pins.some(p => p.type === 'tree') && <><h2 className="rs-sec">{rt(L, 'findTree')}</h2><RsTreeFinder c={c} model={model} onPick={onTree} cap={8} /></>}
      {model.tanks.length > 0 && <><h2 className="rs-sec">{rt(L, 'tanksWord')}</h2>
        <div className="rs-list">{model.tanks.map(t => (
          <RsRow key={t.id} icon="tank" family="collect" title={t.name} href={rsHref('pumps/tank/' + t.id)}
            sub={t.levelGal != null ? rt(L, 'tankLine', { v: srVol(t.levelGal, c.units), u, p: t.capGal > 0 ? Math.round(t.levelGal / t.capGal * 100) : 0 }) : rt(L, 'noLevelYet')} />))}</div></>}
      {model.pumps.length > 0 && <><h2 className="rs-sec">{rt(L, 'tabPumps')}</h2>
        <div className="rs-list">{model.pumps.map(p => (
          <a key={p.id} className="rs-row" href={rsHref('pumps/' + p.id)}><RsPumpTile p={p} />
            <span className="rs-rt"><b>{p.name}</b><RsPumpStatus p={p} L={L} now={model.now} /></span><span className="rs-chev"><RsIcon name="chev" size={22} /></span></a>))}</div></>}
      <h2 className="rs-sec">{rt(L, 'bushLayers')}</h2>
      <div className="rs-chips wrapchips" role="group" aria-label={rt(L, 'bushLayers')}>
        {[['trees', 'lyTrees'], ['laterals', 'lyLaterals'], ['mainlines', 'lyLines'], ['vacuum', 'lyVacuum'], ['brix', 'lyBrix'], ['pumps', 'lyPumps'], ['tanks', 'lyTanks']].map(([k, l]) =>
          <button key={k} type="button" className={`rs-chip${layers[k] ? ' on' : ''}`} aria-pressed={!!layers[k]} onClick={() => setLayers({ [k]: !layers[k] })}>{rt(L, l)}</button>)}
      </div>
      <div className="rs-btnrow" style={{ marginTop: 16 }}>
        <RsBtn kind="secondary" icon="plus" onClick={onAdd}>{rt(L, 'addToMap')}</RsBtn>
        <RsBtn kind="secondary" icon="more" onClick={onTools}>{rt(L, 'mapTools')}</RsBtn>
      </div>
    </div>
  );
}
// The line letter on a plate, drawn like the map (dash sample under the letter).
function RsLinePlate({ l, size = 44 }) {
  const leak = l.leak && l.leak.status === 'suspect';
  return (
    <span className={`rs-lplate${leak ? ' leak' : ''}`} style={{ width: size, height: size }} aria-hidden="true">
      <b>{l.id}</b>
      <svg width={size - 12} height="6" viewBox={`0 0 ${size - 12} 6`}><line x1="2" y1="3" x2={size - 14} y2="3" strokeDasharray={l.dash || undefined} /></svg>
    </span>
  );
}
function RsVacValue({ l, L }) {
  if (!l.latest) return <span className="rs-rv rs-mute">{rt(L, 'noReadingW')}</span>;
  const leak = l.leak.status === 'suspect';
  return <span className={`rs-rv tn${leak ? ' bad' : ''}${l.tier === 'old' ? ' old' : ''}`}>{fmt(l.latest.v, 1)}<small> {srUnitL('in', L)}</small></span>;
}
// One verdict sentence for a srLeakFind result, the same on every screen.
// Returns [tone, text]: tone is 'bad' | 'ok' | 'idle'.
function srLeakVerdict(L, lk, P) {
  const h = fmt((P && P.pairH) || SR_OPS_DEFAULTS.pairH, 0);
  const d = fmt(Math.max(0, lk.drop || 0), 1);
  if (lk.method === 'releaser' && lk.releaser) return [lk.status === 'suspect' ? 'bad' : 'ok', rt(L, lk.status === 'suspect' ? 'leakVerdictR' : 'holdingVerdictR', { d, r: fmt(lk.releaser.v, 1) })];
  if (lk.status === 'suspect') return ['bad', rt(L, 'leakVerdict', { d, b: fmt(lk.baseline, 1), h })];
  if (lk.status === 'ok') return ['ok', rt(L, 'holdingVerdict', { d, b: fmt(lk.baseline, 1), h })];
  if (lk.status === 'single') return ['idle', rt(L, 'oneReadingVerdict', { h })];
  return ['idle', rt(L, 'noReadingVerdict')];
}
// The gauge chain: the pump (releaser) reading, the drop, the line-end reading.
// The leak rule made visible. big = Watch sizes.
function RsLeakChain({ c, l, now, P, demo, big, onLogPump }) {
  const L = c.lang, lk = l.leak;
  if (!lk || lk.status === 'none') return null;
  const rel = lk.releaser, end = lk.latest, bad = lk.status === 'suspect';
  const when = ms => demo ? rt(L, 'wDemoTag') : srAgo(ms, now, L);
  return (
    <div className={`rs-chain${big ? ' big' : ''}${bad ? ' bad' : ''}`} role="group"
      aria-label={rel ? rt(L, 'chainAria', { r: fmt(rel.v, 1), e: fmt(end.v, 1), d: fmt(lk.drop, 1), l: fmt(P.leakLimitIn, 1) }) : rt(L, 'chainNoPump', { h: fmt(P.pairH, 0) })}>
      <div className="rs-chg"><span className="rs-chlbl">{rt(L, 'chainPump')}</span>
        {rel ? <><b className="tn">{fmt(rel.v, 1)}<small> {srUnitL('in', L)}</small></b><span className="rs-chw">{when(rel.ms)}</span></>
          : <><b className="rs-mute">·</b><span className="rs-chw">{rt(L, 'chainNoPump', { h: fmt(P.pairH, 0) })}</span></>}</div>
      <div className="rs-cha" aria-hidden="true"><span className="tn">{rel ? rt(L, 'chainDrop', { d: fmt(lk.drop, 1) }) : ''}</span><i /><span>{rt(L, 'chainLimit', { l: fmt(P.leakLimitIn, 1) })}</span></div>
      <div className="rs-chg"><span className="rs-chlbl">{rt(L, 'chainEnd')}</span>
        <b className={`tn${bad ? ' bad' : ''}`}>{fmt(end.v, 1)}<small> {srUnitL('in', L)}</small></b><span className="rs-chw">{when(end.ms)}</span></div>
      {!rel && onLogPump && <button type="button" className="rs-btn2 rs-chlog" onClick={onLogPump}><RsIcon name="gauge" size={18} />{rt(L, 'chainLogPump')}</button>}
    </div>
  );
}

// The gauge chain with mid-line gauges (fix pass 2; DESIGN.md line 104): the pump,
// every gauge in walking order, the far end, the drop across each stretch, and the
// stretch that loses the vacuum, named by its gauges and taps (srGaugeLocate). The
// line's leak verdict above it is still srLeakFind's. onLog(node) makes each row a
// button that logs that gauge; Watch shows it read-only at big size.
function RsGaugeChain({ c, l, now, P, big, onLog, hasPump }) {
  const L = c.lang, ch = l.chain, loc = ch.loc, u = srUnitL('in', L);
  const nm = n => n.kind === 'pump' ? rt(L, 'chainPump') : n.kind === 'end' ? rt(L, 'chainEnd') : n.name;
  const full = n => n.kind === 'gauge' && n.at ? `${n.name} ${rt(L, 'gAt', { t: n.at })}` : nm(n);
  const seg = loc.seg;
  // The span the readings cover ("from the pump to C2"), and the gauges this round did not read.
  const noun = n => n.kind === 'pump' ? rt(L, 'gThePump') : n.kind === 'end' ? rt(L, 'gTheEnd') : n.name;
  const readIdx = loc.reads.map((r, i) => r ? i : -1).filter(i => i >= 0);
  const span = readIdx.length >= 2 ? { a: noun(ch.nodes[readIdx[0]]), b: noun(ch.nodes[readIdx[readIdx.length - 1]]) } : null;
  const unread = ch.nodes.filter((n, i) => !loc.reads[i]).map(nm).join(', ');
  const tail = unread ? ' ' + rt(L, 'gSkipped', { n: unread }) : '';
  let head;
  if (loc.status === 'located') {
    const a = ch.nodes[seg.from], b = ch.nodes[seg.to];
    const ft = a.pos && b.pos ? Math.round(srDistM(a.pos, b.pos) * 3.28084 / 10) * 10 : null;
    head = ['bad', rt(L, 'gWalkT', { a: nm(a), b: nm(b) }), [rt(L, 'gWalkP', { a: full(a), b: full(b), d: fmt(seg.drop, 1), u }),
      ft ? rt(L, 'gDist', { f: fmt(ft, 0), u: srUnitL('ft', L) }) : '', unread ? rt(L, 'gSkipped', { n: unread }) : ''].filter(Boolean).join(' ')];
  } else if (loc.status === 'spread') head = ['bad', rt(L, 'gSpreadT'), rt(L, 'gSpreadP', { t: fmt(loc.total, 1), u, ...span }) + tail];
  else if (loc.status === 'ok') head = ['ok', rt(L, 'gOkT'), rt(L, 'gOkP', { t: fmt(loc.total, 1), l: fmt(P.leakLimitIn, 1), u, ...span }) + tail];
  else head = ['idle', rt(L, 'gFewT'), rt(L, 'gFewP', { h: fmt(P.pairH, 0) })];
  return (
    <div className={`rs-gchain${big ? ' big' : ''}`} role="group" aria-label={rt(L, 'gAria', { n: l.label })}>
      {!big && <span className="rs-chlbl">{rt(L, 'gChainLbl')}</span>}
      <p className={`rs-gh ${head[0]}`}><b>{head[1]}</b><span>{head[2]}</span></p>
      {big ? <ol className="rs-grow-h" style={{ gridTemplateColumns: `repeat(${ch.nodes.length}, minmax(0, 1fr))` }}>
        {ch.nodes.map((n, i) => { const r = loc.reads[i];
          return <li key={i} className={`rs-gcol${seg && i > seg.from && i <= seg.to ? ' badin' : ''}${seg && i >= seg.from && i < seg.to ? ' badout' : ''}`}
            aria-label={`${full(n)}, ${r ? fmt(r.v, 1) + ' ' + u : rt(L, 'gNotRead')}`}>
            <b className={`tn${r ? '' : ' none'}${r && seg && i >= seg.to ? ' bad' : ''}`} aria-hidden="true">{r ? fmt(r.v, 1) : '·'}</b>
            <span className={`rs-gdot${r ? (seg && i >= seg.to ? ' bad' : '') : ' off'}`} aria-hidden="true" />
            <span className="rs-gcn" aria-hidden="true">{n.kind === 'gauge' ? n.name : rt(L, n.kind === 'pump' ? 'gPumpS' : 'gEndS')}</span>
            {n.kind === 'gauge' && n.at ? <small aria-hidden="true">{n.at}</small> : null}
          </li>; })}
      </ol> : <ol className="rs-gl">
        {ch.nodes.map((n, i) => {
          const r = loc.reads[i], g = loc.segs.find(x => x.to === i), bad = !!(seg && i > seg.from && i <= seg.to);
          const val = r ? `${fmt(r.v, 1)} ${u}` : rt(L, 'gNotRead');
          const can = onLog && (n.kind !== 'pump' || hasPump);
          const body = <>
            <span className={`rs-gdot${r ? (seg && i >= seg.to ? ' bad' : '') : ' off'}`} aria-hidden="true" />
            <span className="rs-gname"><b>{nm(n)}</b>{n.kind === 'gauge' && n.at ? <small>{rt(L, 'gAt', { t: n.at })}</small> : null}</span>
            <span className={`rs-gval tn${r ? '' : ' none'}`}>{r ? <><b>{fmt(r.v, 1)}<small> {u}</small></b><small className="rs-gago">{srAgo(r.ms, now, L)}</small></> : rt(L, 'gNotRead')}</span>
          </>;
          return <React.Fragment key={i}>
            {i > 0 && <li className={`rs-gseg${bad ? ' bad' : ''}`}><span className="rs-grail" aria-hidden="true" />
              {g ? <span className="tn">{seg && g === seg ? rt(L, 'gLosesHere', { d: fmt(Math.max(0, g.drop), 1), u }) : rt(L, 'chainDrop', { d: fmt(Math.max(0, g.drop), 1) })}</span> : null}</li>}
            <li className={`rs-gnode${seg && i > seg.from && i <= seg.to ? ' badin' : ''}${seg && i >= seg.from && i < seg.to ? ' badout' : ''}`}>{can
              ? <button type="button" className="rs-grow" onClick={() => onLog(n)} aria-label={rt(L, 'gLogAria', { n: full(n), v: val })}>{body}<span className="rs-glog" aria-hidden="true"><RsIcon name="plus" size={18} sw={2.4} /></span></button>
              : <div className="rs-grow">{body}</div>}</li>
          </React.Fragment>;
        })}
      </ol>}
    </div>
  );
}

// Gauges along a line: add, order (walking order from the pump) and remove.
// Written to sg_line_gauges; their readings stay in sg_readings under the gauge id.
function RsGaugeEdit({ c, line, onFail }) {
  const L = c.lang, list = line.gauges;
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [at, setAt] = useState('');
  const [armed, setArmed] = useState(null);
  useEffect(() => { if (armed == null) return; const tm = setTimeout(() => setArmed(null), 3000); return () => clearTimeout(tm); }, [armed]);
  const save = next => { if (!srSaveLineGauges(line.id, next)) { onFail(SR_WRITE_FAIL || 'locked'); return false; } onFail(null); return true; };
  const defName = srNextGaugeName(line.id, list);
  const tagOf = t => String(t.tagged || t.label || '');
  const trees = line.trees.slice().sort((a, b) => tagOf(a).localeCompare(tagOf(b), undefined, { numeric: true }));
  const add = () => {
    const tr = pin !== '' ? trees.find(t => String(t.id) === pin) : null;
    const g = { id: srUid('g'), name: name.trim() || defName, at: tr ? tagOf(tr) : at.trim(), pinId: tr ? tr.id : null };
    if (save([...list, g])) { setName(''); setPin(''); setAt(''); srToast(rt(L, 'gAdded', { n: g.name })); }
  };
  const move = (i, d) => { const a = list.slice(), j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; save(a); };
  const del = i => { if (armed !== i) { setArmed(i); return; } setArmed(null); if (save(list.filter((_, k) => k !== i))) srToast(rt(L, 'gRemoved', { n: list[i].name })); };
  return <>
    {list.length ? <ol className="rs-list rs-gedit">{list.map((g, i) => (
      <li key={g.id} className="rs-row">
        <span className="rs-rt"><b>{g.name}</b><span>{g.at ? rt(L, 'gAt', { t: g.at }) : rt(L, 'gAtNone')}</span></span>
        <button type="button" className="rs-xbtn" aria-label={rt(L, 'gUp', { n: g.name })} disabled={i === 0} onClick={() => move(i, -1)}><RsIcon name="up" size={20} /></button>
        <button type="button" className="rs-xbtn" aria-label={rt(L, 'gDown', { n: g.name })} disabled={i === list.length - 1} onClick={() => move(i, 1)}><RsIcon name="down" size={20} /></button>
        <button type="button" className={`rs-linkbtn${armed === i ? ' bad' : ''}`} onClick={() => del(i)} aria-label={armed === i ? undefined : rt(L, 'gRemove', { n: g.name })}>{rt(L, armed === i ? 'tapAgainDelete' : 'remove')}</button>
      </li>))}</ol>
      : <p className="rs-meta">{rt(L, 'gNone')}</p>}
    <p className="rs-note">{rt(L, 'gOrder')}</p>
    <label className="rs-fl" htmlFor="rs-g-name">{rt(L, 'gName')}</label>
    <input id="rs-g-name" className="rs-field" value={name} placeholder={defName} onChange={e => setName(e.target.value)} />
    {trees.length > 0 && <><label className="rs-fl" htmlFor="rs-g-pin">{rt(L, 'gAtL')}</label>
      <select id="rs-g-pin" className="rs-field" value={pin} onChange={e => setPin(e.target.value)}>
        <option value="">{rt(L, 'gAtNone')}</option>
        {trees.map(t => <option key={t.id} value={String(t.id)}>{tagOf(t) || rt(L, 'pinK_tree')}</option>)}
      </select></>}
    {pin === '' && <><label className="rs-fl" htmlFor="rs-g-at">{rt(L, 'gAtText')}</label>
      <input id="rs-g-at" className="rs-field" value={at} placeholder="C-058" onChange={e => setAt(e.target.value)} /></>}
    <div style={{ marginTop: 12 }}><RsBtn kind="secondary" icon="plus" onClick={add} id="rs-g-add">{rt(L, 'gAdd', { n: name.trim() || defName })}</RsBtn></div>
  </>;
}

// ── Detail: a tree ───────────────────────────────────────────────────────────
function RsTreeDetail({ c, model, tree, onClose }) {
  const L = c.lang;
  const [fail, setFail] = useState(null);
  const [bx, setBx] = useState('');
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const tm = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(tm); }, [armed]);
  const save = patch => {
    const all = srArr(ls.get('sg_lines_pins', []));
    if (!srSavePins(all.map(p => p.id === tree.id ? { ...p, ...patch } : p))) { setFail(SR_WRITE_FAIL || 'locked'); return false; }
    setFail(null); return true;
  };
  const readings = (model.treeBrix[tree.id] || []).slice().reverse();
  const logBrix = () => {
    const v = parseFloat(bx); if (!(v > 0 && v < 15)) { const el = document.getElementById('rs-tree-bx'); if (el) el.focus(); return; }
    const all = srObj(ls.get('sg_tree_brix', {}));
    const t = new Date();
    if (!ls.set('sg_tree_brix', { ...all, [tree.id]: [...srArr(all[tree.id]), { t: t.toISOString(), brix: v }] })) { setFail(SR_WRITE_FAIL || 'locked'); return; }
    // Also a normal sg_brixlog entry (same shape SeasonTab writes), so the Brix trend counts it.
    const bl = srArr(ls.get('sg_brixlog', []));
    ls.set('sg_brixlog', [...bl, { id: Date.now(), date: srToday(), brix: v, note: rt(L, 'brixAtTreeN', { n: tree.tagged || tree.label }) }]);
    srDataChanged(); setBx(''); srToast(rt(L, 'brixSaved', { v: fmt(v, 1), n: tree.tagged || tree.label }));
  };
  const del = () => {
    if (!armed) { setArmed(true); return; }
    const all = srArr(ls.get('sg_lines_pins', []));
    if (!srSavePins(all.filter(p => p.id !== tree.id))) { setFail(SR_WRITE_FAIL || 'locked'); return; }
    onClose(); srToast(rt(L, 'treeDeleted'));
  };
  const lines = model.lines;
  return (
    <div className="rs-detail">
      <RsKv rows={[
        tree.label && tree.tagged ? [rt(L, 'nameWord'), tree.label] : null,
        tree.species ? [rt(L, 'species'), String(tree.species).replace(/_/g, ' ')] : null,
        tree.dbh ? [rt(L, 'diameter'), `${tree.dbh} ${srUnitL('in', L)}`] : null,
        srFin(parseFloat(tree.elev)) ? [rt(L, 'elevation'), `${fmt(parseFloat(tree.elev), 0)} ft`] : null,
        tree.accuracy != null ? [rt(L, 'placedBy'), <span className={`rs-acc ${tree.accuracy <= 5 ? 'ok' : tree.accuracy <= 15 ? 'check' : 'bad'}`}>{rt(L, 'gpsAccShort', { a: tree.accuracy })}</span>] : [rt(L, 'placedBy'), rt(L, 'placedByHand')],
      ]} />
      <label className="rs-fl" htmlFor="rs-tree-taps" style={{ marginTop: 16 }}>{rt(L, 'tapsWordC')}</label>
      <RsStepper id="rs-tree-taps" value={String(parseInt(tree.taps) || 0)} onChange={v => save({ taps: Math.max(0, Math.min(4, parseInt(v) || 0)) })} steps={[-1, 1]} dp={0} label={rt(L, 'tapsWordC')} min={0} max={4} big={false} />
      <label className="rs-fl" style={{ marginTop: 16 }}>{rt(L, 'mainlineWord')}</label>
      <RsChips label={rt(L, 'mainlineWord')} value={tree.mainline ? String(tree.mainline) : null} onChange={v => save({ mainline: v })}
        options={[[null, rt(L, 'noLineW')], ...lines.map(l => [l.id, l.id])]} />
      <label className="rs-fl" style={{ marginTop: 16 }}>{rt(L, 'health')}</label>
      <RsChips label={rt(L, 'health')} value={tree.health || 'good'} onChange={v => save({ health: v })}
        options={['excellent', 'good', 'fair', 'poor', 'dead'].map(h => [h, rt(L, 'h_' + h)])} />
      <h3 className="rs-sec">{rt(L, 'brixHere')}</h3>
      {readings.length ? <RsKv rows={readings.slice(0, 3).map(r => [srDayLabel(srIsoOf(new Date(r.t)), L), `${fmt(parseFloat(r.brix), 1)}%`])} />
        : <p className="rs-meta">{rt(L, 'noBrixHere')}</p>}
      <div className="rs-split rs-bxrow" style={{ marginTop: 10, alignItems: 'center' }}>
        <RsStepper id="rs-tree-bx" value={bx} onChange={setBx} steps={[-0.1, 0.1]} dp={1} unit="%" label={rt(L, 'brixHere')} min={0} max={15} big={false} base={parseFloat(c.sapBrix) || 2} ph={fmt(parseFloat(c.sapBrix) || 2, 1)} />
      </div>
      {fail && <p className="rs-errline" role="alert">{rt(L, 'bNotSavedT')} {rt(L, fail === 'quota' ? 'bQuotaP' : 'bLockedP')}</p>}
      <div style={{ marginTop: 14 }}><RsBtn onClick={logBrix} id="rs-tree-logbx" icon="drop">{bx !== '' ? rt(L, 'saveBrixV', { v: fmt(parseFloat(bx) || 0, 1) }) : rt(L, 'logBrixHere')}</RsBtn></div>
      {tree.notes && <p className="rs-body" style={{ marginTop: 12 }}>{tree.notes}</p>}
      <div style={{ marginTop: 10 }}><RsBtn kind="bad" onClick={del}>{rt(L, armed ? 'tapAgainDelete' : 'deleteTree')}</RsBtn></div>
    </div>
  );
}

// ── Detail: a mainline ───────────────────────────────────────────────────────
function RsLineDetail({ c, model, line, onClose, onDraw, watch }) {
  const L = c.lang;
  const [reading, setReading] = useState(false);
  const [fail, setFail] = useState(null);
  const [name, setName] = useState(line.label);
  useEffect(() => setName(line.label), [line.id, line.label]);
  const lk = line.leak, P = model.prefs;
  const hist = line.hist.slice(-12);
  const verdict = srLeakVerdict(L, lk, P);
  const relPump = (line.relPumps || [])[0] || null;
  const mark = () => { if (!srSaveLineMeta(line.id, { checkedAt: new Date().toISOString() })) { setFail(SR_WRITE_FAIL || 'locked'); return; } srToast(rt(L, 'checkedSaved', { n: line.label })); };
  const rename = () => { const n = name.trim(); if (!n || n === line.label) return; if (!srRenameMainline(line.id, n)) setFail(SR_WRITE_FAIL || 'locked'); };
  const setTaps = v => { const n = parseInt(v); if (!srSaveLineMeta(line.id, { taps: isFinite(n) && n >= 0 ? n : null })) setFail(SR_WRITE_FAIL || 'locked'); };
  const pumps = (line.relPumps || line.pumps).map(p => p.name).join(', ');
  return (
    <div className="rs-detail">
      <div className="rs-linehead">
        <RsLinePlate l={line} size={56} />
        <div><div className={`rs-bigv tn${lk.status === 'suspect' ? ' bad' : ''}`}>{line.latest ? fmt(line.latest.v, 1) : '·'}<small>{line.latest ? ' ' + srUnitL('in', L) : ''}</small></div>
          <div className="rs-meta tn">{line.latest ? rt(L, 'readAgo', { a: srAgo(line.latest.ms, model.now, L), t: srClock(line.latest.ms, L) }) : rt(L, 'noReadingYet')}</div></div>
      </div>
      <p className={`rs-verdict ${verdict[0]}`}>{verdict[1]}</p>
      {line.chain ? <RsGaugeChain c={c} l={line} now={model.now} P={P} hasPump={!!relPump}
          onLog={n => setReading(n.kind === 'pump' ? 'pump' : n.kind === 'end' ? true : { g: n })} />
        : <RsLeakChain c={c} l={line} now={model.now} P={P} onLogPump={relPump ? () => setReading('pump') : null} />}
      {hist.length >= 2 && <RsTimeChart series={[{ id: line.id, pts: hist, dash: line.dash, leak: lk.status === 'suspect' }]} from={hist[0].ms - SR_H_MS} to={model.now}
        yMin={14} yMax={28} yTicks={[16, 20, 24, 28]} h={140} lang={L} label={rt(L, 'vacTrendAria', { n: line.label, k: hist.length })} />}
      <RsKv rows={[
        [rt(L, 'treesWord'), String(line.trees.length)],
        [rt(L, 'tapsWordC'), line.tapsSet ? rt(L, 'tapsSetV', { n: fmt(line.taps, 0) }) : fmt(line.taps, 0)],
        line.lengthFt ? [rt(L, 'lengthW'), `${fmt(line.lengthFt, 0)} ${srUnitL('ft', L)}`] : null,
        [rt(L, 'drawnW'), rt(L, line.geo.source === 'drawn' ? (line.meta && line.meta.pathFrom != null ? 'drawnImported' : 'drawnByYou') : line.geo.source === 'trees' ? (line.geo.byElev ? 'drawnTreesElev' : 'drawnTrees') : 'notDrawn', { n: line.trees.length })],
        [rt(L, 'lastChecked'), line.checkedMs ? `${srDayLabel(srIsoOf(new Date(line.checkedMs)), L)}, ${srClock(line.checkedMs, L)}` : rt(L, 'neverW')],
        pumps ? [rt(L, 'servedBy'), pumps] : null,
      ]} />
      <p className="rs-note">{rt(L, 'leakRuleNote', { l: fmt(P.leakLimitIn, 1), d: fmt(P.baselineDays, 0), h: fmt(P.pairH, 0) })}</p>
      {fail && <p className="rs-errline" role="alert">{rt(L, 'bNotSavedT')} {rt(L, fail === 'quota' ? 'bQuotaP' : 'bLockedP')}</p>}
      <div style={{ marginTop: 14 }}><RsBtn icon="gauge" onClick={() => setReading(true)} id="rs-line-read">{rt(L, 'logVacuum')}</RsBtn></div>
      <div className="rs-btnrow">
        <RsBtn kind="secondary" icon="check" onClick={mark}>{rt(L, 'markChecked')}</RsBtn>
        {!watch ? <RsBtn kind="secondary" icon="watch" href={rsHref('watch/line/' + line.id)}>{rt(L, 'watchLine')}</RsBtn>
          : <RsBtn kind="secondary" icon="map" href={rsHref('bush/line/' + line.id)}>{rt(L, 'openBush')}</RsBtn>}
      </div>
      {!watch && <RsDisclose title={rt(L, 'editLine')} icon="pen" family="lines">
        <label className="rs-fl" htmlFor="rs-line-name">{rt(L, 'nameWord')}</label>
        <input id="rs-line-name" className="rs-field" value={name} onChange={e => setName(e.target.value)} onBlur={rename} onKeyDown={e => { if (e.key === 'Enter') rename(); }} />
        <label className="rs-fl" htmlFor="rs-line-taps" style={{ marginTop: 14 }}>{rt(L, 'tapsOnLine')}</label>
        <RsStepper id="rs-line-taps" value={line.tapsSet ? String(line.taps) : ''} onChange={setTaps} steps={[-10, -1, 1, 10]} dp={0} label={rt(L, 'tapsOnLine')} min={0} max={100000} big={false} ph={String(line.treeTaps)} />
        <p className="rs-note">{rt(L, 'tapsOnLineNote', { n: line.treeTaps })}</p>
        {onDraw && <div style={{ marginTop: 12 }}><RsBtn kind="secondary" icon="pen" onClick={onDraw}>{rt(L, line.geo.source === 'drawn' ? 'redrawLine' : 'drawThisLine')}</RsBtn></div>}
      </RsDisclose>}
      {!watch && <RsDisclose title={rt(L, 'gEditT')} sub={line.gauges.length ? rt(L, 'gCount', { n: line.gauges.length }) : null} icon="gauge" family="lines">
        <RsGaugeEdit c={c} line={line} onFail={setFail} />
      </RsDisclose>}
      {reading && reading.g && <RsReadingSheet c={c} title={rt(L, 'gReadT', { n: reading.g.name })} unit="in" dp={1} steps={[-1, -0.1, 0.1, 1]} min={0} max={30}
        base={(reading.g.hist.slice(-1)[0] || {}).v || (line.latest ? line.latest.v : 24)} sensor={{ id: reading.g.sid, quantity: 'vacuum', target: { type: 'line', id: line.id }, unit: 'inHg' }}
        onClose={() => setReading(false)} />}
      {reading === 'pump' && relPump && <RsReadingSheet c={c} title={rt(L, 'releaserOf', { n: relPump.name })} unit="in" dp={1} steps={[-1, -0.1, 0.1, 1]} min={0} max={30}
        base={relPump.vac ? relPump.vac.v : 25} sensor={{ id: srSensorId('pump', relPump.id), quantity: 'vacuum', target: { type: 'pump', id: relPump.id }, unit: 'inHg' }} onClose={() => setReading(false)} />}
      {reading === true && <RsReadingSheet c={c} title={rt(L, 'vacAtEnd', { n: line.label })} unit="in" dp={1} steps={[-1, -0.1, 0.1, 1]} min={0} max={30}
        base={line.latest ? line.latest.v : 24} sensor={{ id: line.sid, quantity: 'vacuum', target: { type: 'line', id: line.id }, unit: 'inHg' }}
        onSaved={() => { srSaveLineMeta(line.id, { checkedAt: new Date().toISOString() }); }} onClose={() => setReading(false)} />}
    </div>
  );
}

// ── Detail: a tank, pump, sugarhouse or waypoint pin ─────────────────────────
function RsPinDetail({ c, model, pin }) {
  const L = c.lang, u = srU(c.units);
  const tank = pin.type === 'tank' ? model.tanksRaw.find(t => String(t.pinId) === String(pin.id)) : null;
  const tl = tank ? model.tanks.find(t => t.id === tank.id) : null;
  const pump = pin.type === 'pump' ? model.pumps.find(p => String(p.pinId) === String(pin.id)) : null;
  return (
    <div className="rs-detail">
      <RsKv rows={[
        [rt(L, 'kindW'), rt(L, 'pinK_' + pin.type)],
        pin.notes ? [rt(L, 'noteW'), pin.notes] : null,
        tl && tl.levelGal != null ? [rt(L, 'levelW'), `${srVol(tl.levelGal, c.units)} ${u}`] : null,
        pin.accuracy != null ? [rt(L, 'placedBy'), rt(L, 'gpsAccShort', { a: pin.accuracy })] : null,
        [rt(L, 'coordsW'), `${fmt(pin.lat, 5)}, ${fmt(pin.lon, 5)}`],
      ]} />
      {tank && <div style={{ marginTop: 14 }}><RsBtn href={rsHref('pumps/tank/' + tank.id)} icon="tank">{rt(L, 'openTank', { n: tank.name })}</RsBtn></div>}
      {pump && <div style={{ marginTop: 14 }}><RsBtn href={rsHref('pumps/' + pump.id)} icon="pump">{rt(L, 'openPump', { n: pump.name })}</RsBtn></div>}
      {pin.type === 'tank' && !tank && <div style={{ marginTop: 14 }}><RsBtn kind="secondary" href={rsHref('pumps/add-tank/' + pin.id)} icon="tank">{rt(L, 'trackTank')}</RsBtn></div>}
      {pin.type === 'pump' && !pump && <div style={{ marginTop: 14 }}><RsBtn kind="secondary" href={rsHref('pumps/add/' + pin.id)} icon="pump">{rt(L, 'trackPump')}</RsBtn></div>}
    </div>
  );
}

// ── Sheets: layers, add, map tools ───────────────────────────────────────────
function RsLayersSheet({ c, layers, setLayers, hasProperty, onClose }) {
  const L = c.lang;
  const rows = [['trees', 'lyTrees', 'lyTreesS'], ['laterals', 'lyLaterals', 'lyLateralsS'], ['mainlines', 'lyLines', 'lyLinesS'], ['vacuum', 'lyVacuum', 'lyVacuumS'],
    ['brix', 'lyBrix', 'lyBrixS'], ['pumps', 'lyPumps', 'lyPumpsS'], ['tanks', 'lyTanks', 'lyTanksS'], ...(hasProperty ? [['property', 'lyProperty', 'lyPropertyS']] : [])];
  return (
    <RsSheet title={rt(L, 'bushLayers')} onClose={onClose} id="rs-layers">
      <label className="rs-fl">{rt(L, 'baseMap')}</label>
      <RsSeg label={rt(L, 'baseMap')} wrap value={layers.base} onChange={v => setLayers({ base: v })}
        options={[['sat', rt(L, 'baseSat')], ['sat-terrain', rt(L, 'baseSatT')], ['topo', rt(L, 'baseTopo')], ['street', rt(L, 'baseStreet')]]} />
      <div className="rs-list" style={{ marginTop: 16 }}>
        {rows.map(([k, t, s]) => <button key={k} type="button" className={`rs-row rs-chk tog${layers[k] ? ' on' : ''}`} aria-pressed={!!layers[k]} onClick={() => setLayers({ [k]: !layers[k] })}>
          <span className="rs-box"><RsIcon name="check" size={18} sw={3} /></span>
          <span className="rs-rt"><b>{rt(L, t)}</b><span>{rt(L, s)}</span></span></button>)}
      </div>
      <p className="rs-note">{rt(L, 'layersNote')}</p>
    </RsSheet>
  );
}
function RsAddSheet({ c, model, onClose, onGps, onTap, onCoords, onTools }) {
  const L = c.lang;
  const [type, setType] = useState('tree');
  const [line, setLine] = useState(null);
  const [lat, setLat] = useState(''), [lon, setLon] = useState('');
  const [err, setErr] = useState(null);
  const M = { type, line: type === 'tree' ? line : null };
  const byCoords = () => {
    const a = srParseNum(lat), b = srParseNum(lon);   // "44,5412" typed in French reads as 44.5412
    if (!srFin(a) || !srFin(b) || a < -90 || a > 90 || b < -180 || b > 180) { setErr(rt(L, 'coordsBad')); return; }
    onCoords(a, b, M);
  };
  return (
    <RsSheet title={rt(L, 'addToMap')} onClose={onClose} id="rs-add">
      <label className="rs-fl">{rt(L, 'whatAdd')}</label>
      <RsChips label={rt(L, 'whatAdd')} value={type} onChange={setType}
        options={['tree', 'tank', 'pump', 'sugarhouse', 'marker'].map(k => [k, rt(L, 'pinK_' + k)])} />
      {type === 'tree' && model.lines.length > 0 && <>
        <label className="rs-fl" style={{ marginTop: 14 }}>{rt(L, 'onWhichLine')}</label>
        <RsChips label={rt(L, 'onWhichLine')} value={line} onChange={setLine} options={[[null, rt(L, 'noLineW')], ...model.lines.map(l => [l.id, l.label])]} />
      </>}
      <div style={{ marginTop: 18 }}><RsBtn icon="gps" onClick={() => onGps(M)} id="rs-add-gps">{rt(L, 'addAtGps')}</RsBtn></div>
      <div style={{ marginTop: 10 }}><RsBtn kind="secondary" icon="pin" onClick={() => onTap(M)} id="rs-add-tap">{rt(L, 'addByTap')}</RsBtn></div>
      <p className="rs-note">{rt(L, 'gpsCanopy')}</p>
      <RsDisclose title={rt(L, 'typeCoords')} icon="pin" family="lines">
        <div className="rs-grid2">
          <div><label className="rs-fl" htmlFor="rs-lat">{rt(L, 'latW')}</label><input id="rs-lat" className="rs-field tn" inputMode="decimal" value={lat} placeholder="44.5412" onChange={e => { setLat(e.target.value); setErr(null); }} /></div>
          <div><label className="rs-fl" htmlFor="rs-lon">{rt(L, 'lonW')}</label><input id="rs-lon" className="rs-field tn" inputMode="decimal" value={lon} placeholder="-69.6203" onChange={e => { setLon(e.target.value); setErr(null); }} /></div>
        </div>
        {err && <p className="rs-errline" role="alert">{err}</p>}
        <div style={{ marginTop: 12 }}><RsBtn kind="secondary" onClick={byCoords}>{rt(L, 'addAtCoords')}</RsBtn></div>
      </RsDisclose>
      <div className="rs-list" style={{ marginTop: 14 }}>
        <RsRow icon="more" family="lines" title={rt(L, 'mapTools')} sub={rt(L, 'mapToolsS')} onClick={onTools} />
      </div>
    </RsSheet>
  );
}
// Boundary import: classic's parsers (KML Polygon/LineString placemarks, GPX
// tracks and routes closed into a polygon, GeoJSON as is), written to sg_property_geo.
function srParseBoundary(text, ext) {
  if (ext === 'geojson' || ext === 'json') return JSON.parse(text);
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const features = [];
  const pts = t => (t || '').trim().split(/\s+/).filter(Boolean).map(s => { const [lng, lat] = s.split(',').map(Number); return [lng, lat]; }).filter(p => srFin(p[0]) && srFin(p[1]));
  if (ext === 'kml') doc.querySelectorAll('Placemark').forEach(pm => {
    const name = (pm.querySelector('name') || {}).textContent || 'Property';
    const poly = pm.querySelector('Polygon coordinates') || pm.querySelector('outerBoundaryIs coordinates');
    const line = pm.querySelector('LineString coordinates');
    if (poly) { const c = pts(poly.textContent); if (c.length > 2) features.push({ type: 'Feature', properties: { name }, geometry: { type: 'Polygon', coordinates: [c] } }); }
    else if (line) { const c = pts(line.textContent); if (c.length > 1) features.push({ type: 'Feature', properties: { name }, geometry: { type: 'LineString', coordinates: c } }); }
  });
  if (ext === 'gpx') doc.querySelectorAll('trk,rte').forEach(el => {
    const name = (el.querySelector('name') || {}).textContent || 'Track';
    const c = []; el.querySelectorAll('trkpt,rtept').forEach(p => c.push([parseFloat(p.getAttribute('lon')), parseFloat(p.getAttribute('lat'))]));
    if (c.length > 1) { c.push(c[0]); features.push({ type: 'Feature', properties: { name }, geometry: { type: 'Polygon', coordinates: [c] } }); }
  });
  return { type: 'FeatureCollection', features };
}
function srBoundaryCount(gj) {
  const f = gj && (gj.type === 'FeatureCollection' ? gj.features : [gj]) || [];
  return f.filter(x => x && x.geometry && ['Polygon', 'LineString'].includes(x.geometry.type)).length;
}
function RsMapTools({ c, model, mapRef, base, onClose, onDraw }) {
  const L = c.lang;
  const [imp, setImp] = useState(null);
  const [save, setSave] = useState(null);   // {pct, done, total} | {result}
  const [armed, setArmed] = useState(false);
  const [newLine, setNewLine] = useState(false);
  const busy = save && !save.result;
  const onFile = f => {
    if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const r = new FileReader();
    r.onload = e => {
      let gj = null;
      try { gj = srParseBoundary(String(e.target.result), ext); } catch { gj = null; }
      const n = gj ? srBoundaryCount(gj) : 0;
      if (!['kml', 'gpx', 'geojson', 'json'].includes(ext) || !gj) { setImp({ bad: true, t: rt(L, 'impBad') }); return; }
      if (!n) { setImp({ bad: true, t: rt(L, 'impNone') }); return; }
      if (!ls.set('sg_property_geo', gj)) { setImp({ bad: true, t: rt(L, 'bNotSavedT') + ' ' + rt(L, SR_WRITE_FAIL === 'quota' ? 'bQuotaP' : 'bLockedP') }); return; }
      // Feature indexes belong to the old file: keep the paths, forget where they came from.
      const lm = srObj(ls.get('sg_line_meta', {}));
      if (Object.values(lm).some(m => m && m.pathFrom != null)) ls.set('sg_line_meta', Object.fromEntries(Object.entries(lm).map(([k, m]) => [k, { ...srObj(m), pathFrom: null }])));
      srDataChanged(); setImp({ t: rt(L, n === 1 ? 'impOk1' : 'impOk', { n }) });
      try { const map = mapRef.current, b = srBushBounds({ pins: [], lines: [], property: gj }); if (map && b.length >= 2) map.fitBounds(window.L.latLngBounds(b), { padding: [40, 40] }); } catch {}
    };
    r.readAsText(f);
  };
  const saveTiles = async () => {
    const map = mapRef.current; if (!map || busy) return;
    const bb = map.getBounds();
    const mode = base === 'street' ? 'sat' : base;
    const plan = srTileUrls({ north: bb.getNorth(), south: bb.getSouth(), west: bb.getWest(), east: bb.getEast() }, map.getZoom(), mode);
    if (!plan.urls.length) { setSave({ result: { bad: true, t: rt(L, 'tilesZoomOut') } }); return; }
    if (plan.tooMany) { setSave({ result: { bad: true, t: rt(L, 'tilesTooMany', { n: fmt(plan.tiles, 0) }) } }); return; }
    let done = 0, errors = 0;
    setSave({ pct: 0, done: 0, total: plan.urls.length });
    for (const url of plan.urls) {
      try { const res = await fetch(url, { mode: 'cors' }); if (!res.ok) errors++; } catch { errors++; }
      done++; if (done % 4 === 0 || done === plan.urls.length) setSave({ pct: Math.round(done / plan.urls.length * 100), done, total: plan.urls.length });
    }
    const per = plan.urls.length / plan.tiles, count = plan.tiles, saved = Math.max(0, Math.round((plan.urls.length - errors) / per));
    setSave({ result: errors === 0 ? { t: rt(L, 'tilesOk', { n: fmt(count, 0) }) } : saved === 0 ? { bad: true, t: rt(L, 'tilesNone', { n: fmt(count, 0) }) }
      : { bad: true, t: rt(L, 'tilesSome', { s: fmt(saved, 0), n: fmt(count, 0) }) } });
  };
  const clearProp = () => { if (!armed) { setArmed(true); return; } if (!ls.set('sg_property_geo', null)) { setImp({ bad: true, t: rt(L, 'bNotSavedT') }); return; } srDataChanged(); setArmed(false); setImp({ t: rt(L, 'boundaryCleared') }); };
  // Traced lines in the imported file, offered as mainline paths.
  const feats = model.property ? (model.property.type === 'FeatureCollection' ? (model.property.features || []) : [model.property]) : [];
  const fileLines = React.useMemo(() => srImportedLines(feats, model.lines), [model.property, model.lines.length]);
  const [pick, setPick] = useState(null);   // { [featureIndex]: lineId | '' }
  useEffect(() => {
    const cur = {};
    fileLines.forEach(x => { const on = model.lines.find(l => l.meta && l.meta.pathFrom === x.i); cur[x.i] = on ? on.id : (x.suggest || ''); });
    setPick(cur);
  }, [fileLines]);
  const [pathMsg, setPathMsg] = useState(null);
  const usePaths = () => {
    const chosen = fileLines.filter(x => pick && pick[x.i]);
    if (!chosen.length) { setPathMsg({ bad: true, t: rt(L, 'impPickOne') }); return; }
    const all = srObj(ls.get('sg_line_meta', {}));
    const next = { ...all };
    // A line that used to come from the file but is now unassigned keeps its path; only chosen ones change.
    chosen.forEach(x => { next[pick[x.i]] = { ...srObj(all[pick[x.i]]), path: x.pts.map(p => [+p[0].toFixed(7), +p[1].toFixed(7)]), pathFrom: x.i }; });
    if (!srOpsSet('sg_line_meta', next)) { setPathMsg({ bad: true, t: rt(L, 'bNotSavedT') + ' ' + rt(L, SR_WRITE_FAIL === 'quota' ? 'bQuotaP' : 'bLockedP') }); return; }
    setPathMsg({ t: rt(L, 'impSaved', { n: chosen.length }) });
  };
  const addLine = () => { const id = srAddMainline(); if (!id) { setImp({ bad: true, t: rt(L, 'bNotSavedT') + ' ' + rt(L, SR_WRITE_FAIL === 'quota' ? 'bQuotaP' : 'bLockedP') }); return; } onDraw(id); };
  return (
    <RsSheet title={rt(L, 'mapTools')} onClose={onClose} id="rs-tools">
      <h3 className="rs-sec" style={{ marginTop: 0 }}>{rt(L, 'drawAMainline')}</h3>
      <p className="rs-meta">{rt(L, 'drawAMainlineP')}</p>
      <div className="rs-chips wrapchips" role="group" aria-label={rt(L, 'drawAMainline')} style={{ marginTop: 10 }}>
        {model.lines.map(l => <button key={l.id} type="button" className="rs-chip" onClick={() => onDraw(l.id)}>{l.label}</button>)}
        <button type="button" className="rs-chip" onClick={addLine}><RsIcon name="plus" size={18} />{rt(L, 'newMainline')}</button>
      </div>
      <h3 className="rs-sec">{rt(L, 'importBoundary')}</h3>
      <p className="rs-meta">{rt(L, 'importBoundaryP')}</p>
      <label className="rs-btn2 rs-filebtn" style={{ marginTop: 10 }}>
        <RsIcon name="up" size={22} />{rt(L, 'chooseFile')}
        <input type="file" accept=".kml,.gpx,.geojson,.json" onChange={e => { onFile(e.target.files[0]); e.target.value = ''; }} />
      </label>
      {imp && <p className={imp.bad ? 'rs-errline' : 'rs-okline'} role="status">{imp.t}</p>}
      {fileLines.length > 0 && pick && <div className="rs-implines" id="rs-implines">
        <h3 className="rs-subsec">{rt(L, 'impLinesT')}</h3>
        <p className="rs-meta">{rt(L, 'impLinesP')}</p>
        <div className="rs-list">{fileLines.map((x, k) => {
          const nm = x.name || rt(L, 'impUnnamed', { i: k + 1 });
          return (
            <div key={x.i} className="rs-row rs-implrow">
              <span className="rs-rt"><b>{nm}</b><span className="tn">{fmt(x.ft, 0)} {srUnitL('ft', L)}</span></span>
              <select className="rs-field rs-sel" aria-label={rt(L, 'impLineAria', { n: nm })} value={pick[x.i] || ''}
                onChange={e => { const v = e.target.value; setPathMsg(null); setPick(p => { const n = { ...p }; Object.keys(n).forEach(k2 => { if (v && n[k2] === v) n[k2] = ''; }); n[x.i] = v; return n; }); }}>
                <option value="">{rt(L, 'impNotUsed')}</option>
                {model.lines.map(l => <option key={l.id} value={l.id}>{rt(L, 'impUseAs')} {l.label}</option>)}
              </select>
            </div>);
        })}</div>
        <div style={{ marginTop: 12 }}><RsBtn icon="check" onClick={usePaths} id="rs-imp-use">{rt(L, 'impSave')}</RsBtn></div>
        {pathMsg && <p className={pathMsg.bad ? 'rs-errline' : 'rs-okline'} role="status">{pathMsg.t}</p>}
      </div>}
      {model.property && <div style={{ marginTop: 10 }}><RsBtn kind="bad" onClick={clearProp}>{rt(L, armed ? 'tapAgainClear' : 'clearBoundary')}</RsBtn></div>}
      <h3 className="rs-sec">{rt(L, 'offlineTiles')}</h3>
      <p className="rs-meta">{rt(L, 'offlineP')}</p>
      {busy ? <div className="rs-progress" role="progressbar" aria-valuenow={save.pct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: save.pct + '%' }} />
        <span className="tn">{rt(L, 'tilesSaving', { d: save.done, t: save.total })}</span></div>
        : <div style={{ marginTop: 10 }}><RsBtn kind={fileLines.length ? 'secondary' : undefined} icon="download" onClick={saveTiles} id="rs-save-tiles">{rt(L, 'saveArea')}</RsBtn></div>}
      {save && save.result && <p className={save.result.bad ? 'rs-errline' : 'rs-okline'} role="status">{save.result.t}</p>}
    </RsSheet>
  );
}

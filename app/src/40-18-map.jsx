// ─── LINES TAB / SUGARBUSH MAP ────────────────────────────────────────────────
let _lMap = null;
let _lMarkers = {};
// Anything a producer typed — a pin label, a name inside an imported KML —
// goes through this before it reaches a popup or a divIcon. An apostrophe in
// "Bill's Corner" used to break the chip; a bracket broke the whole popup.
const _sbEsc = v => String(v == null ? '' : v)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
let _lRouteLines = [];
let _lSpotMarkers = [];
let _lPropertyLayers = [];
let _lSeasonLayer = null;
let _lSliderEl = null;
let _lGpsMarker = null;
let _lGpsCircle = null;
let _lMeasureLayers = [];
let _lYieldLayers = [];        // yield-heat halos (Pass 5) — cleared on toggle-off and unmount
let _lTerrainActive = false;   // terrain modes brighten the route glow so lines stay legible

// New tile surfaces (Pass 4). Both verified live 2026-09-20 (real 256×256 tiles
// over Maine, z13). Hillshade is Esri World Hillshade — the "LiDAR look";
// topo is USGS (US coverage only; outside the US Leaflet shows blanks).
const _SB_HILLSHADE_URL = 'https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}';
const _SB_TOPO_URL      = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}';
// One representative tile per source for the Layers panel thumbnails (Sugarloaf, z13).
const _SB_THUMB = {
  sat:       'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/13/2945/2496',
  hillshade: 'https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/13/2945/2496',
  topo:      'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/13/2945/2496',
  street:    'https://tile.openstreetmap.org/13/2496/2945.png',
  naip:      'https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer/tile/13/2945/2496',
  clarity:   'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/13/2945/2496',
};

// ── BASE-LAYER SWITCHING (Pass 4) ──
// mapType: 'satellite' | 'sat-terrain' | 'terrain' | 'topo' | 'street'.
// The hillshade overlay lives in its own pane above the imagery tiles with
// CSS mix-blend-mode: multiply (overlay was tested too: satellite greens sit
// near mid-gray, so overlay's brightening half cancels most of the relief —
// multiply keeps every shadow and the ridges actually carve). Terrain-only
// re-uses the same tiles as a normal base, tinted warm via CSS so it doesn't
// read clinical-gray.
function _sbApplyBase(map, mapType, terrainOpacity) {
  if (!map || !window.L) return;
  if (!map.getPane('sr-terrain')) {
    const pane = map.createPane('sr-terrain');
    pane.style.zIndex = 250;                  // above tilePane (200), below overlayPane (400)
    pane.classList.add('sr-terrain-pane');
  }
  if (!map._terrain) map._terrain = window.L.tileLayer(_SB_HILLSHADE_URL,
    { attribution:'Hillshade © Esri', pane:'sr-terrain', maxNativeZoom:16, maxZoom:20, opacity: terrainOpacity });
  if (!map._terrainBase) map._terrainBase = window.L.tileLayer(_SB_HILLSHADE_URL,
    { attribution:'Hillshade © Esri', className:'sr-terrain-tint', maxNativeZoom:16, maxZoom:20 });
  if (!map._topo) map._topo = window.L.tileLayer(_SB_TOPO_URL,
    { attribution:'USGS The National Map', maxNativeZoom:16, maxZoom:19 });
  const want = {
    _sat:         mapType === 'satellite' || mapType === 'sat-terrain',
    _labels:      mapType === 'satellite' || mapType === 'sat-terrain',
    _street:      mapType === 'street',
    _topo:        mapType === 'topo',
    _terrain:     mapType === 'sat-terrain',
    _terrainBase: mapType === 'terrain',
  };
  Object.keys(want).forEach(k => {
    const layer = map[k];
    if (!layer) return;
    if (want[k]) { if (!map.hasLayer(layer)) layer.addTo(map); }
    else if (map.hasLayer(layer)) map.removeLayer(layer);
  });
  _sbTuneRouteGlow(mapType === 'sat-terrain' || mapType === 'terrain');
}

// Multiply dims what sits under it; when a terrain mode is active the mainline
// glow + flow layers get a touch more opacity so Pass 3.5's lines stay fully
// legible. The core grade-colored stroke is data and is never touched.
function _sbTuneRouteGlow(active) {
  _lTerrainActive = !!active;
  _lRouteLines.forEach(l => {
    try {
      const cn = l.options && l.options.className;
      if (cn === 'sr-line-glow') l.setStyle({ opacity: _lTerrainActive ? 0.5 : 0.3 });
      else if (cn === 'sr-flow-dash') l.setStyle({ opacity: _lTerrainActive ? 0.75 : 0.55 });
    } catch {}
  });
}

// ── MEASURE TOOL DRAWING (Pass 4) ──
// Ephemeral by design: never written to storage, cleared on Done/unmount.
function _sbClearMeasure() {
  _lMeasureLayers.forEach(l => { try { l.remove(); } catch {} });
  _lMeasureLayers = [];
}
function _sbDrawMeasure(verts, closed, onFirstDot) {
  _sbClearMeasure();
  if (!_lMap || !window.L || !verts.length) return;
  const latlngs = verts.map(v => [v.lat, v.lon]);
  if (closed && verts.length >= 3) {
    const ring = window.L.polygon(latlngs, { color:'#EB9A33', weight:2.5, opacity:0.9,
      dashArray:'6,6', fillColor:'#EB9A33', fillOpacity:0.12, interactive:false });
    ring.addTo(_lMap); _lMeasureLayers.push(ring);
  } else if (latlngs.length >= 2) {
    const tape = window.L.polyline(latlngs, { color:'#EB9A33', weight:2.5, opacity:0.9,
      dashArray:'6,6', interactive:false });
    tape.addTo(_lMap); _lMeasureLayers.push(tape);
  }
  verts.forEach((v, i) => {
    const closable = i === 0 && !closed && verts.length >= 3;
    const dot = window.L.circleMarker([v.lat, v.lon], {
      radius: i === 0 ? 7 : 5, color:'#EB9A33', weight:2,
      fillColor: closable ? '#EB9A33' : '#0d1521', fillOpacity:1,
      interactive: i === 0 && !closed,
      // Paths bubble clicks to the map by default — that would close the ring
      // AND lay a vertex on the same tap. The dot swallows its click instead.
      bubblingMouseEvents: false,
    }).addTo(_lMap);
    if (i === 0 && !closed && onFirstDot) {
      dot.on('click', e => {
        try { if (e && e.originalEvent) window.L.DomEvent.stop(e.originalEvent); } catch {}
        onFirstDot();
      });
    }
    _lMeasureLayers.push(dot);
  });
}

function haversineFt(lat1, lon1, lat2, lon2) {
  const R = 20925524;
  const dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

// Batch elevation fetch — tries Open-Topo-Data (fast, 1 req for all pts) then EPQS fallback
async function _fetchElevBatch(latlons) {
  if (!latlons.length) return [];
  const locs = latlons.map(p => p.lat.toFixed(6) + ',' + p.lon.toFixed(6)).join('|');
  // Primary: Open-Topo-Data NED10m (US, 10m resolution) — returns metres, convert to ft
  const datasets = ['ned10m', 'srtm30m'];
  for (const ds of datasets) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 9000);
      const r = await fetch('https://api.opentopodata.org/v1/' + ds + '?locations=' + locs, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!r.ok) continue;
      const d = await r.json();
      if (d.status === 'OK' && d.results && d.results.length === latlons.length) {
        const elevs = d.results.map(x => x.elevation != null ? +(x.elevation * 3.28084).toFixed(1) : null);
        if (elevs.some(e => e != null)) return elevs;
      }
    } catch {}
  }
  // Fallback: USGS EPQS one-at-a-time (US only, slower but familiar)
  return Promise.all(latlons.map(async p => {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(
        'https://epqs.nationalmap.gov/v1/json?x=' + p.lon + '&y=' + p.lat + '&units=Feet&wkid=4326&includeDate=false',
        { signal: ctrl.signal }
      );
      clearTimeout(tid);
      const d = await r.json();
      const v = parseFloat(d.value);
      return isNaN(v) ? null : v;
    } catch { return null; }
  }));
}

async function _fetchElev(lat, lon) {
  const result = await _fetchElevBatch([{ lat, lon }]);
  return result[0] ?? null;
}

// Sample path elevation — all points fetched in ONE batch request (10-20x faster)
async function _samplePathElev(lat1, lon1, lat2, lon2, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const frac = i / n;
    pts.push({ lat: lat1 + (lat2 - lat1) * frac, lon: lon1 + (lon2 - lon1) * frac });
  }
  const elevs = await _fetchElevBatch(pts);
  return pts.map((p, i) => ({ ...p, elev: elevs[i] }));
}

function _analyzeSegGrades(pts) {
  const segs = []; let minGrade = Infinity, totalDist = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i-1].elev == null || pts[i].elev == null) continue;
    const dist = haversineFt(pts[i-1].lat, pts[i-1].lon, pts[i].lat, pts[i].lon);
    const drop = pts[i-1].elev - pts[i].elev;
    const grade = dist > 0 ? (drop/dist)*100 : 0;
    segs.push({ from: pts[i-1], to: pts[i], dist, drop, grade });
    if (grade < minGrade) minGrade = grade;
    totalDist += dist;
  }
  const totalDrop = (pts[0]?.elev != null && pts[pts.length-1]?.elev != null)
    ? pts[0].elev - pts[pts.length-1].elev : 0;
  const overallGrade = totalDist > 0 ? (totalDrop/totalDist)*100 : 0;
  return { segs, minGrade: minGrade === Infinity ? 0 : minGrade, overallGrade, totalDist, totalDrop };
}

// Instrument-panel numerals: numeric readouts in the map band share this style.
const _MONO = { fontFamily: "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace", fontVariantNumeric: 'tabular-nums' };

// One row of the Layers panel: 44px tile thumbnail, name + sub, active check.
// thumbs: array of { src, cls } stacked in the thumbnail box (the Sat+Terrain
// row stacks the hillshade over the imagery with the same multiply blend the
// live pane uses, so the thumbnail IS the preview).
function _LyRow({ active, onClick, thumbs, name, sub }) {
  return (
    <button className={`ly-row${active ? ' on' : ''}`} onClick={onClick} aria-pressed={active}>
      <span className="ly-thumb" aria-hidden="true">
        {thumbs.map((th, i) => <img key={i} src={th.src} alt="" loading="lazy" className={th.cls || ''} />)}
      </span>
      <span style={{ flex:1, minWidth:0 }}>
        <span className="ly-name">{name}</span>
        {sub ? <span className="ly-sub">{sub}</span> : null}
      </span>
      {active ? <I.check size={18} color="#2dd4a7" /> : null}
    </button>
  );
}

// One-sweep radar scan over the viewport when route analysis kicks off.
// Pure presentation: appended, animated by CSS, removed. Skipped entirely
// under prefers-reduced-motion. Never touches map state.
function _sbScanSweep() {
  try {
    if (!_lMap) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = document.createElement('div');
    el.className = 'sr-scan';
    _lMap.getContainer().appendChild(el);
    setTimeout(() => { try { el.remove(); } catch {} }, 1300);
  } catch {}
}

// Draw route lines — one polyline per segment, colored by grade
// results is an array of line objects from analyzeRoutes
// Presentation layers around the core stroke (which is unchanged):
//   1. a wider blurred glow underlay in the same grade colour (non-interactive)
//   2. the core line, exactly as before — popups and colors identical
//   3. on segments the analysis says flow downhill at a workable grade (≥1%),
//      a thin animated white dash sliding from→to. The analysis builds each
//      line high→low, so the path direction IS the downhill direction; uphill
//      and flat segments keep their static warning dash and never get flow.
function _drawRouteLines(results) {
  _clearRouteLines();
  if (!_lMap || !window.L) return;
  results.forEach(r => {
    r.segments.forEach(seg => {
      const color = _gradeColor(seg.grade);
      const latlngs = [[seg.from.lat, seg.from.lon], [seg.to.lat, seg.to.lon]];
      const glow = window.L.polyline(latlngs,
        { color, weight: (seg.isToTank ? 5 : 3) + 7, opacity: _lTerrainActive ? 0.5 : 0.3,
          interactive: false, className: 'sr-line-glow' }
      ).addTo(_lMap);
      _lRouteLines.push(glow);
      const line = window.L.polyline(
        latlngs,
        { color, weight: seg.isToTank ? 5 : 3, opacity: 0.92,
          dashArray: seg.grade < 1.0 ? '8,5' : null }
      ).addTo(_lMap);
      const fromName = _sbEsc(seg.from.label || 'Pin');
      const toName   = _sbEsc(seg.to.label   || 'Pin');
      line.bindPopup(
        `<b>${fromName} → ${toName}</b><br/>` +
        `Grade: <b>${seg.grade.toFixed(2)}%</b><br/>` +
        `Drop: ${Math.abs(seg.drop).toFixed(1)} ft &nbsp;·&nbsp; Dist: ${seg.dist.toFixed(0)} ft`
      );
      _lRouteLines.push(line);
      if (seg.grade >= 1.0) {
        const flow = window.L.polyline(latlngs,
          { color: '#ffffff', weight: 2, opacity: _lTerrainActive ? 0.75 : 0.55, dashArray: '5,17',
            interactive: false, className: 'sr-flow-dash' }
        ).addTo(_lMap);
        _lRouteLines.push(flow);
      }
    });
  });
}

function _gradeColor(g) {
  return g < 0 ? '#f85149' : g < 0.5 ? '#f85149' : g < 1.0 ? '#e0a44a' : g <= 6.0 ? '#3fb950' : '#e0a44a';
}

function _clearRouteLines() {
  _lRouteLines.forEach(l => { try { l.remove(); } catch {} });
  _lRouteLines = [];
}
function _clearSpotMarkers() {
  _lSpotMarkers.forEach(m => { try { m.remove(); } catch {} });
  _lSpotMarkers = [];
}

// Legacy stub — new code calls _drawRouteLines directly
function _drawRoutePaths(results) { _drawRouteLines(results); }

// ─── SUGARBUSH MAP MARKER SYSTEM ──────────────────────────────────────────────
const _SB_SVGS = {
  tree:       '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2C9 5 6 6 4 8c2 0 3 1 3 3-2-1-4 0-4 2h4c0 2-1 3-2 4h5v3h4v-3h5c-1-1-2-2-2-4h4c0-2-2-3-4-2 0-2 1-3 3-3-2-2-5-3-8-6z"/></svg>',
  tank:       '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12M20 6v12"/><ellipse cx="12" cy="18" rx="8" ry="3"/><path d="M4 12a8 3 0 0 0 16 0" opacity=".4"/></svg>',
  sugarhouse: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  pump:       '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>',
  junction:   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="4" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="20"/><line x1="4" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="20" y2="12"/></svg>',
  marker:     '<svg width="12" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="5" y1="4" x2="5" y2="22"/><path d="M5 4h12l-3 4 3 4H5"/></svg>',
};
// Mainlines used to be four fixed lines baked into the component. A bush with
// six mainlines had nowhere to put the other two, and renaming one was not
// possible at all. They are a saved list now; pins still reference them by the
// same single-letter id, so existing pin data keeps working untouched.
const _ML_PALETTE = ['#3b82f6','#8b5cf6','#ec4899','#f97316','#14b8a6','#eab308','#ef4444','#22c55e'];
const _ML_DEFAULTS = ['A','B','C','D'].map((id,i) => ({ id, label:'Mainline '+id, color:_ML_PALETTE[i] }));
let _ML_LIST = null;
function mainlinesSaved() {
  if (_ML_LIST) return _ML_LIST;
  const raw = ls.get('sg_mainlines', null);
  _ML_LIST = (Array.isArray(raw) && raw.length && raw.every(m => m && m.id))
    ? raw.map(m => ({ id:String(m.id), label:String(m.label || 'Mainline '+m.id), color:m.color || _ML_PALETTE[0] }))
    : _ML_DEFAULTS.map(m => ({ ...m }));
  return _ML_LIST;
}
function saveMainlines(list) { _ML_LIST = list; ls.set('sg_mainlines', list); }
function nextMainlineId() {
  const used = new Set(mainlinesSaved().map(m => m.id));
  for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') if (!used.has(c)) return c;
  return null;
}
const _mlColor = id => (mainlinesSaved().find(m => m.id === id) || {}).color || null;
const _SPECIES_COLORS = { sugar_maple:'#f97316', red_maple:'#ef4444', silver_maple:'#94a3b8', black_maple:'#44403c', other:'#6b7280' };
const _SPECIES_LABELS = { sugar_maple:'Sugar Maple', red_maple:'Red Maple', silver_maple:'Silver Maple', black_maple:'Black Maple', other:'Other' };
const _HEALTH_COLORS = { excellent:'#22c55e', good:'#84cc16', fair:'#eab308', poor:'#f97316', dead:'#ef4444' };
// A faceted maple tree for the map: a five-lobe geometric leaf as the canopy, split light/dark down
// the midrib with two facets a side, on a thin trunk with two branches. 28×36 grid. One colour — the
// health tone — drives the whole tree; the four facet shades are derived from it. Drawn from the
// client's reference; the source of truth is design/tree-markers/trees.js.
function _sbTreeSvg(tone, opts = {}) {
  const rgb = h => { h = String(h).replace('#',''); return [0,2,4].map(i => parseInt(h.slice(i,i+2),16)); };
  const mix = (a, b, t) => '#' + a.map((v,i) => Math.round(v + (b[i]-v)*t).toString(16).padStart(2,'0')).join('');
  const c = rgb(tone);
  const s = { light: mix(c,[255,255,255],0.28), base: tone, dark: mix(c,[0,0,0],0.32), deep: mix(c,[0,0,0],0.52) };
  const pts = a => a.map(p => p.join(',')).join(' ');
  const leftUpper  = [[14,2],[12.2,6.4],[8.4,4.4],[9.4,9],[3.6,8.2],[6.6,12.4],[14,11.4]];
  const leftLower  = [[14,11.4],[6.6,12.4],[1.8,15.2],[8,16.6],[6.4,20.6],[12.4,19.2],[14,20.2]];
  const rightUpper = leftUpper.map(([x,y]) => [28-x,y]);
  const rightLower = leftLower.map(([x,y]) => [28-x,y]);
  const trunk = opts.trunk || '#5c6470', sw = opts.stroke || '#07090f';
  const w = opts.width || 30, h = opts.height || 39;
  return `<svg width="${w}" height="${h}" viewBox="-2 -2 32 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g stroke="#07090f" stroke-width="2.8" stroke-linejoin="round" fill="#07090f">
      <polygon points="${pts(leftUpper)}"/><polygon points="${pts(leftLower)}"/><polygon points="${pts(rightUpper)}"/><polygon points="${pts(rightLower)}"/></g>
    <line x1="14" y1="20" x2="14" y2="34" stroke="#07090f" stroke-width="4.2" stroke-linecap="round"/>
    <g stroke="${sw}" stroke-width="0.6" stroke-linejoin="round">
      <polygon points="${pts(leftUpper)}" fill="${s.light}"/>
      <polygon points="${pts(leftLower)}" fill="${s.base}"/>
      <polygon points="${pts(rightUpper)}" fill="${s.dark}"/>
      <polygon points="${pts(rightLower)}" fill="${s.deep}"/>
    </g>
    <g stroke="${trunk}" stroke-width="1.5" stroke-linecap="round" fill="none">
      <line x1="14" y1="20.4" x2="14" y2="34"/>
      <line x1="14" y1="26" x2="10.5" y2="22.8"/>
      <line x1="14" y1="28.5" x2="17.5" y2="25.2"/>
    </g>
  </svg>`;
}
// Selection and zoom are read at icon time, so a re-icon is all a change needs.
let _sbSelectedId = null;
let _sbLastZoomLabels = true;
const _SB_LABEL_MIN_ZOOM = 16;
const _HEALTH_LABELS = { excellent:'Excellent', good:'Good', fair:'Fair', poor:'Poor', dead:'Dead' };
const _PIN_TYPE_CFG = [
  { id:'tree',       label:'Tap Tree',    Icon:I.mapleLeaf,  bg:'#3fb950', radius:'50%',  size:30 },
  { id:'tank',       label:'Tank',        Icon:I.tank,       bg:'#1f6feb', radius:'6px',  size:34 },
  { id:'sugarhouse', label:'Sugarhouse',  Icon:I.sugarhouse, bg:'#e0a44a', radius:'6px',  size:30 },
  { id:'pump',       label:'Pump House',  Icon:I.settings,   bg:'#f97316', radius:'50%', size:28 },
  { id:'junction',   label:'Junction',    Icon:I.network,    bg:'#8b5cf6', radius:'50%', size:28 },
  { id:'marker',     label:'Waypoint',    Icon:I.mapPin,     bg:'#ef4444', radius:'50%', size:26 },
];

function _sbMakeIcon(pin) {
  const cfg = _PIN_TYPE_CFG.find(t => t.id === pin.type) || _PIN_TYPE_CFG[0];
  const font = "font-family:Inter,-apple-system,sans-serif";

  if (pin.type === 'tree') {
    // ── The faceted maple, standing on its coordinate; code and taps beneath ──
    // Health drives the tree's colour (a dead tree is grey and stays on the map — it is information);
    // selection turns the trunk and the label teal. Species and mainline live in the pin panel.
    const health  = pin.health || 'good';
    const tone    = health === 'dead' ? '#6b7280' : (_HEALTH_COLORS[health] || '#84cc16');
    const selected= _sbSelectedId != null && _sbSelectedId === pin.id;
    const taps    = parseInt(pin.taps) || 0;
    // Shorten: "Tree 1" → "T1", keep max 5 chars
    const code = _sbEsc(String(pin.label || '').replace(/^(Tap\s+)?Tree\s*/i,'T').replace(/\s+/g,'').slice(0,5));
    const zoom = _lMap && typeof _lMap.getZoom === 'function' ? _lMap.getZoom() : 99;
    const showLabel = zoom >= _SB_LABEL_MIN_ZOOM;
    const labelColor = selected ? '#2dd4a7' : '#f0f0f0';
    const shadow = 'text-shadow:0 0 3px #07090f,0 0 3px #07090f,0 1px 2px #07090f';
    const label = showLabel
      ? `<div style="position:absolute;left:50%;top:39px;transform:translateX(-50%);white-space:nowrap;pointer-events:none;font-size:10px;font-weight:800;line-height:1.1;color:${labelColor};${shadow};${font}">${code}${taps > 0 ? ` <span style="font-weight:800">${taps}t</span>` : ''}</div>`
      : '';
    return window.L.divIcon({
      className: '',
      html: `<div style="position:relative;width:30px;height:39px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.6))">
        ${selected ? '<div class="sr-pulse"></div>' : ''}
        ${_sbTreeSvg(tone, { trunk: selected ? '#2dd4a7' : '#5c6470' })}
        ${label}
      </div>`,
      iconSize:   [30,39],
      iconAnchor: [15,37],
      popupAnchor:[0,-40],
    });
  }

  if (pin.type === 'tank') {
    // ── Flat badge: bold label on blue ──
    const short = _sbEsc(String(pin.label || '').slice(0,12));
    return window.L.divIcon({
      className: '',
      html: `<div style="display:inline-flex;align-items:center;gap:5px;background:#1d4ed8;border-radius:7px;padding:4px 10px 4px 8px;box-shadow:0 3px 14px rgba(29,78,216,0.55),0 1px 3px rgba(0,0,0,0.4);border-bottom:2px solid rgba(255,255,255,0.12)">
        ${_SB_SVGS.tank}
        <span style="font-size:9.5px;font-weight:800;color:#fff;${font};white-space:nowrap">${short}</span>
      </div>`,
      iconSize:   [1,1],
      iconAnchor: [0,0],
      popupAnchor:[40,-8],
    });
  }

  // ── All other types: teardrop pin with SVG icon inside ──
  const color = cfg.bg;
  const svg   = _SB_SVGS[pin.type] || _SB_SVGS.marker;
  // Teardrop: circle r=11 centered at (15,13), tail to (15,38)
  return window.L.divIcon({
    className: '',
    html: `<div style="position:relative;width:30px;height:40px;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.6))">
      <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 39 C15 39,4 26,4 15 A11 11 0 1 1 26 15 C26 26,15 39,15 39 Z" fill="${color}"/>
        <path d="M9 10 A9 9 0 0 1 21 10" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <div style="position:absolute;top:4px;left:50%;transform:translateX(-50%)">${svg}</div>
    </div>`,
    iconSize:   [30,40],
    iconAnchor: [15,40],
    popupAnchor:[0,-42],
  });
}

function _sbRenderMarker(pin) {
  if (!_lMap || !window.L) return;
  const marker = window.L.marker([pin.lat, pin.lon], { icon: _sbMakeIcon(pin) }).addTo(_lMap);
  marker.on('click', () => { if (window._sgMapPinClick) window._sgMapPinClick(pin.id); });
  _lMarkers[pin.id] = marker;
}

function _sbUpdateMarker(pin) {
  if (_lMarkers[pin.id]) _lMarkers[pin.id].setIcon(_sbMakeIcon(pin));
}

// Shim for old code paths that called _renderMarker
function _renderMarker(pin) { _sbRenderMarker(pin); }

// ─── Yield heat (Pass 5) ─────────────────────────────────────────────────────
// The honest v1: collection points carry the season sap totals but no
// coordinates; tank/pump pins carry coordinates but no yield. So the user
// assigns a collection point to a tank or pump pin (pin sheet; stored as
// `cpoint` on the pin in sg_lines_pins — inside the sg_* backup sweep), and
// the pin wears that point's season sap total as an amber halo. Unassigned
// pins, and points with no sap yet, draw nothing. No geo data is invented.
function _sbYieldTotals(pointIds) {
  // Same shared path LogTab uses: seasonTotals over entries filtered by
  // `e.point === id` (invariant 4 — reuse the metric, don't restate it).
  const season = ls.get('sg_season', new Date().getFullYear());
  const slog = (ls.get('sg_logs2', {})[season]) || {};
  const out = {};
  pointIds.forEach(pid => {
    out[pid] = seasonTotals({ sapCollected: (slog.sapCollected || []).filter(e => e.point === pid) }).sapT;
  });
  return out;
}

function _sbClearYieldHeat() {
  _lYieldLayers.forEach(l => { try { l.remove(); } catch {} });
  _lYieldLayers = [];
}

function _sbDrawYieldHeat(pins, unitLbl) {
  _sbClearYieldHeat();
  if (!_lMap || !window.L) return;
  const withPt = pins.filter(p => (p.type === 'tank' || p.type === 'pump') && p.cpoint);
  if (!withPt.length) return;
  // Own pane below the marker pane (600) so halos never block pin taps.
  if (!_lMap.getPane('sr-yield')) {
    const pane = _lMap.createPane('sr-yield');
    pane.style.zIndex = 450;
    pane.style.pointerEvents = 'none';
  }
  const totals = _sbYieldTotals([...new Set(withPt.map(p => p.cpoint))]);
  const max = Math.max(0, ...Object.values(totals));
  if (max <= 0) return;   // assigned, but no sap logged yet — nothing to show, honestly
  withPt.forEach(p => {
    const v = totals[p.cpoint] || 0;
    if (v <= 0) return;
    const r = Math.round(20 + 40 * Math.sqrt(v / max));   // sqrt scale, 20–60px
    const d = r * 2;
    const html = `<div style="width:${d}px;height:${d}px;border-radius:50%;background:radial-gradient(circle, rgba(235,154,51,0.5) 0%, rgba(235,154,51,0.26) 45%, rgba(235,154,51,0) 72%)"></div>`
      + `<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-family:ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;font-size:11px;font-weight:800;color:#EB9A33;text-shadow:0 0 3px #07090f,0 0 3px #07090f,0 1px 2px #07090f;white-space:nowrap">${fmt(v,0)} ${unitLbl}</div>`;
    const m = window.L.marker([p.lat, p.lon], {
      pane: 'sr-yield', interactive: false, keyboard: false,
      icon: window.L.divIcon({ className: 'sr-yield-halo', html, iconSize: [d, d], iconAnchor: [r, r] }),
    }).addTo(_lMap);
    _lYieldLayers.push(m);
  });
}

function _dropPin(lat, lon, type, pinsRef, setPins, extra = {}) {
  const id = Date.now();
  const count = pinsRef.current.filter(p => p.type === type).length + 1;
  const typeLabels = { tree:'Tree', tank:'Tank', sugarhouse:'Sugarhouse', pump:'Pump', junction:'Junction', marker:'Waypoint' };
  const label = (typeLabels[type] || type) + ' ' + count;
  const pin = {
    id, lat, lon, type, label, elev: null, notes: '',
    ...(type === 'tree' ? {
      species: 'sugar_maple', dbh: 12, health: 'good', taps: 1,
      mainline: null, tagged: 'T' + String(count).padStart(3, '0'), yearAdded: new Date().getFullYear()
    } : {}),
    ...extra,
  };
  const updated = [...pinsRef.current, pin];
  setPins(updated); ls.set('sg_lines_pins', updated);
  _sbRenderMarker(pin);
  // Presentation: a 250ms scale-settle on the freshly dropped marker only —
  // init-time renders don't animate. The class goes on the marker's inner
  // wrapper, never the Leaflet icon element (Leaflet owns its transform).
  try {
    const el = _lMarkers[id] && _lMarkers[id]._icon;
    const w = el && el.firstElementChild;
    if (w && w.classList) w.classList.add('sr-drop');
  } catch {}
  _fetchElev(lat, lon).then(elev => {
    const withElev = ls.get('sg_lines_pins', []).map(p => p.id === id ? { ...p, elev } : p);
    ls.set('sg_lines_pins', withElev); setPins(withElev);
  });
}

// ── SEASONAL IMAGERY ──
function _sbApplySeasonLayer(map, mode) {
  if (_lSeasonLayer) { try { map.removeLayer(_lSeasonLayer); } catch {} _lSeasonLayer = null; }
  if (_lSliderEl) { try { _lSliderEl.remove(); } catch {} _lSliderEl = null; }
  if (mode === 'naip') {
    _lSeasonLayer = window.L.tileLayer('https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer/tile/{z}/{y}/{x}', { attribution:'USDA NAIP', maxZoom:19 });
    _lSeasonLayer.addTo(map);
  } else if (mode === 'clarity') {
    _lSeasonLayer = window.L.tileLayer('https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution:'Esri Clarity', maxZoom:19 });
    _lSeasonLayer.addTo(map);
  } else if (mode === 'compare') {
    _lSeasonLayer = window.L.tileLayer('https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution:'Esri Clarity', maxZoom:19 });
    _lSeasonLayer.addTo(map);
    const container = map.getContainer();
    const slider = document.createElement('div');
    slider.style.cssText = 'position:absolute;top:0;left:50%;height:100%;z-index:800;cursor:ew-resize;user-select:none;pointer-events:all';
    slider.innerHTML = '<div style="position:absolute;top:0;left:-1.5px;width:3px;height:100%;background:rgba(255,255,255,0.85)"></div><div style="position:absolute;top:50%;left:-32px;transform:translateY(-50%);background:rgba(0,0,0,0.65);color:#fff;border-radius:16px;padding:5px 8px;font-size:11px;font-weight:700;white-space:nowrap;border:1px solid rgba(255,255,255,0.25);pointer-events:none">LEAF ON &nbsp;⟺&nbsp; LEAF OFF</div>';
    container.appendChild(slider);
    _lSliderEl = slider;
    let dragging = false;
    const onMove = (clientX) => {
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      slider.style.left = x + 'px';
      const pane = map.getPane('tilePane');
      if (pane) { const layers = pane.querySelectorAll('.leaflet-layer'); if (layers.length >= 2) layers[layers.length - 1].style.clipPath = `inset(0 0 0 ${x}px)`; }
    };
    slider.addEventListener('mousedown', e => { dragging = true; e.preventDefault(); });
    slider.addEventListener('touchstart', () => { dragging = true; }, { passive: true });
    document.addEventListener('mousemove', e => { if (dragging) onMove(e.clientX); });
    document.addEventListener('touchmove', e => { if (dragging) onMove(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('mouseup', () => { dragging = false; });
    document.addEventListener('touchend', () => { dragging = false; });
  }
}

// ── PROPERTY LINE IMPORT ──
function _sbParseKML(text) {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const features = [];
  doc.querySelectorAll('Placemark').forEach(pm => {
    const name = pm.querySelector('name')?.textContent || 'Property';
    const polyTxt = pm.querySelector('Polygon coordinates')?.textContent || pm.querySelector('outerBoundaryIs coordinates')?.textContent;
    const lineTxt = pm.querySelector('LineString coordinates')?.textContent;
    const parsePts = t => (t || '').trim().split(/\s+/).filter(Boolean).map(c => { const [lng,lat] = c.split(',').map(Number); return [lng,lat]; }).filter(c => !isNaN(c[0]));
    if (polyTxt) { const c = parsePts(polyTxt); if (c.length > 2) features.push({ type:'Feature', properties:{name}, geometry:{ type:'Polygon', coordinates:[c] } }); }
    else if (lineTxt) { const c = parsePts(lineTxt); if (c.length > 1) features.push({ type:'Feature', properties:{name}, geometry:{ type:'LineString', coordinates:c } }); }
  });
  return { type:'FeatureCollection', features };
}

function _sbParseGPX(text) {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const features = [];
  doc.querySelectorAll('trk,rte').forEach(el => {
    const name = el.querySelector('name')?.textContent || 'Track';
    const pts = [];
    el.querySelectorAll('trkpt,rtept').forEach(pt => pts.push([parseFloat(pt.getAttribute('lon')), parseFloat(pt.getAttribute('lat'))]));
    if (pts.length > 1) { pts.push(pts[0]); features.push({ type:'Feature', properties:{name}, geometry:{ type:'Polygon', coordinates:[pts] } }); }
  });
  return { type:'FeatureCollection', features };
}

// Property boundaries used to live only in _lPropertyLayers, which is wiped
// every time the Map tab unmounts. An imported boundary vanished on the first
// tab switch and never appeared in a backup. It is saved now, and redrawn on
// every map init, which also puts it in the backup for free (the backup sweeps
// every sg_ key).
const PROPERTY_KEY = 'sg_property_geo';

function _sbDrawProperty(gj) {
  if (!_lMap || !window.L || !gj) return 0;
  _lPropertyLayers.forEach(l => { try { _lMap.removeLayer(l); } catch {} });
  _lPropertyLayers = [];
  const palette = ['#e0a44a','#3b82f6','#22c55e','#a855f7','#ef4444'];
  let ci = 0, drawn = 0;
  const feats = gj.type === 'FeatureCollection' ? (gj.features || []) : [gj];
  feats.forEach(f => {
        if (!f || !f.geometry) return;
        const geom = f.geometry;
        let coords = [];
        if (geom.type === 'Polygon') coords = geom.coordinates[0].map(c => [c[1], c[0]]);
        else if (geom.type === 'LineString') coords = geom.coordinates.map(c => [c[1], c[0]]);
        if (coords.length < 2) return;
        const color = palette[ci++ % palette.length];
        const layer = window.L[coords.length > 2 ? 'polygon' : 'polyline'](coords, { color, weight:2.5, opacity:.85, fillColor:color, fillOpacity:.07, dashArray:'8,4' }).addTo(_lMap);
        _lPropertyLayers.push(layer); drawn++;
        const ctr = layer.getBounds().getCenter();
        const name = _sbEsc(f.properties?.name || f.properties?.NAME || 'Property');
        const lbl = window.L.marker(ctr, { icon: window.L.divIcon({ className:'', html:`<div style="font-size:10px;font-weight:700;color:${color};text-shadow:0 0 4px rgba(0,0,0,.9);pointer-events:none">${name}</div>`, iconSize:[0,0], iconAnchor:[0,0] }), interactive:false }).addTo(_lMap);
        _lPropertyLayers.push(lbl);
  });
  return drawn;
}

function _sbRestoreProperty() {
  const gj = ls.get(PROPERTY_KEY, null);
  if (gj) _sbDrawProperty(gj);
}

function _sbClearProperty() {
  _lPropertyLayers.forEach(l => { try { _lMap && _lMap.removeLayer(l); } catch {} });
  _lPropertyLayers = [];
  ls.set(PROPERTY_KEY, null);
}

function _sbImportPropertyFile(file, onDone) {
  if (!_lMap || !window.L) return;
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const ext = file.name.split('.').pop().toLowerCase();
    let gj = null;
    try {
      if (ext === 'geojson' || ext === 'json') gj = JSON.parse(text);
      else if (ext === 'kml') gj = _sbParseKML(text);
      else if (ext === 'gpx') gj = _sbParseGPX(text);
      if (!gj) { onDone && onDone({ ok:false, text:"Couldn't read that file. SweetRun accepts .kml, .gpx and .geojson." }); return; }
      const drawn = _sbDrawProperty(gj);
      if (!drawn) { onDone && onDone({ ok:false, text:'That file had no boundary lines SweetRun could draw.' }); return; }
      const saved = ls.set(PROPERTY_KEY, gj);
      onDone && onDone({ ok:true, text:`${drawn} boundar${drawn!==1?'ies':'y'} drawn` + (saved ? ' and saved. It will still be here next time, and it goes into your backup.' : '. It could not be saved to this device, so it will be gone when you leave the tab.') });
    } catch (err) {
      console.warn('Property import error:', err);
      onDone && onDone({ ok:false, text:"Couldn't read that file. SweetRun accepts .kml, .gpx and .geojson." });
    }
  };
  reader.readAsText(file);
}

// ── OFFLINE TILE CACHE ──────────────────────────────────────────────────────
// Convert lat/lng to Slippy Map tile x,y at a given zoom level.
function _sbTileXY(lat, lng, z) {
  const n = 1 << z;
  const x = Math.floor((lng + 180) / 360 * n);
  const latR = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

// Pre-fetch the ACTIVE layer mode's tiles at current zoom ±1 so the service
// worker caches them and the map works offline next time. Satellite (and
// street, which has always cached the satellite set as its offline fallback)
// keeps the original sat + labels pair; the Pass 4 modes add or swap in their
// own sources. Hillshade/topo are native to z16 — above that Leaflet upsamples
// from cached z16 tiles, so those sources are only fetched up to 16.
async function _sbCacheTiles(map, onProgress, mode = 'satellite') {
  if (!map) return { error: 'Map not ready.' };
  const bounds = map.getBounds();
  const z      = Math.round(map.getZoom());
  const minZ   = Math.max(12, z - 1);
  const maxZ   = Math.min(18, z + 1);
  const hsOnly   = mode === 'terrain';
  const topoOnly = mode === 'topo';
  const withHs   = mode === 'sat-terrain';

  const urls = [];
  let tileCount = 0;
  for (let zoom = minZ; zoom <= maxZ; zoom++) {
    const nw = _sbTileXY(bounds.getNorth(), bounds.getWest(), zoom);
    const se = _sbTileXY(bounds.getSouth(), bounds.getEast(), zoom);
    for (let tx = nw.x; tx <= se.x; tx++) {
      for (let ty = nw.y; ty <= se.y; ty++) {
        tileCount++;
        if (hsOnly || topoOnly) {
          if (zoom <= 16) urls.push((hsOnly ? _SB_HILLSHADE_URL : _SB_TOPO_URL)
            .replace('{z}', zoom).replace('{y}', ty).replace('{x}', tx));
          continue;
        }
        // Esri uses z/y/x tile order
        urls.push(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`);
        urls.push(`https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${zoom}/${ty}/${tx}`);
        if (withHs && zoom <= 16) urls.push(_SB_HILLSHADE_URL.replace('{z}', zoom).replace('{y}', ty).replace('{x}', tx));
      }
    }
  }
  if (!urls.length) return { error: 'Nothing to save at this zoom. Zoom out a step and try again.' };
  // Average fetches per tile position for this mode — keeps the reported tile
  // count honest across 1-, 2- and 3-source modes.
  const per = urls.length / tileCount;

  const MAX = 600;
  if (urls.length > MAX) {
    return { error: `Area too large (${Math.round(urls.length / per)} tiles). Zoom in closer and try again.` };
  }

  let done = 0, errors = 0;
  for (const url of urls) {
    try { const r = await fetch(url); if (!r.ok) errors++; } catch { errors++; }
    done++;
    onProgress(Math.round(done / urls.length * 100), done, urls.length);
  }
  const count = Math.round(urls.length / per);
  const saved = Math.max(0, Math.round((urls.length - errors) / per));
  return { count, saved, errors };
}

function LinesTab({ lang='en' }) {
  const [leafletReady, setLeafletReady] = React.useState(!!window.L);
  const [leafletError, setLeafletError] = React.useState(false);
  const [pins, setPins]           = React.useState(() => ls.get('sg_lines_pins', []));
  const [mode, setMode]           = React.useState('tree');
  // Base map: 'satellite' | 'sat-terrain' | 'terrain' | 'topo' | 'street' (Pass 4)
  const [mapType, setMapType]     = React.useState('satellite');
  const [terrainOpacity, setTerrainOpacity] = React.useState(0.55);
  const [showLayerPanel, setShowLayerPanel] = React.useState(false);
  const [seasonMode, setSeasonMode] = React.useState('off');
  // Measure tool — ephemeral by design: armed mode routes map taps to the tape
  // (pin drops suppressed); Done/unmount clears everything. Never persisted.
  // Yield heat (Pass 5) — view-only toggle; halos derive from sg_logs2 +
  // pin.cpoint assignments and are redrawn whenever either changes.
  const [yieldHeat, setYieldHeat] = React.useState(false);
  const [measuring, setMeasuring] = React.useState(false);
  const [mVerts, setMVerts]       = React.useState([]);
  const [mClosed, setMClosed]     = React.useState(false);
  const measureRef = React.useRef({ on:false, closed:false });
  const [analyzing, setAnalyzing]       = React.useState(false);
  const [gpsLoading, setGpsLoading]     = React.useState(false);
  const [gpsTracking, setGpsTracking]   = React.useState(false);
  // HUD readout only (presentation): last reported live-tracking accuracy in m.
  // React bails on same-value sets, so ~1 Hz GPS ticks rarely cause a render.
  const [gpsAcc, setGpsAcc]             = React.useState(null);
  const [caching, setCaching]           = React.useState(false);
  const [cacheMsg, setCacheMsg]         = React.useState('');
  const [cachePct, setCachePct]         = React.useState(0);
  const [findingSpots, setFindingSpots] = React.useState(false);
  const [routeResults, setRouteResults] = React.useState([]);
  const [tankSpots, setTankSpots]       = React.useState([]);
  const [routeMsg, setRouteMsg]         = React.useState('');
  const [routeProgress, setRouteProgress] = React.useState('');
  const [editingId, setEditingId]       = React.useState(null);
  const [editLabel, setEditLabel]       = React.useState('');
  const [showCoordPanel, setShowCoordPanel] = React.useState(false);
  const [coordLat, setCoordLat]         = React.useState('');
  const [coordLon, setCoordLon]         = React.useState('');
  // Sugarbush-specific state
  const [mainTab, setMainTab]       = React.useState('map');   // map | trees | mainlines | property
  const [selectedPinId, setSelectedPinId] = React.useState(null);
  const [showPinPanel, setShowPinPanel]   = React.useState(false);
  const [elevDraft, setElevDraft]     = React.useState('');
  const [propMsg, setPropMsg]         = React.useState(null);
  const [hasProperty, setHasProperty]  = React.useState(() => !!ls.get(PROPERTY_KEY, null));
  const [mainlines, setMainlines] = React.useState(() => mainlinesSaved());
  const commitMainlines = list => { saveMainlines(list); setMainlines(list); };
  const renameMainline  = (id, label) => commitMainlines(mainlines.map(m => m.id === id ? { ...m, label } : m));
  const addMainline     = () => {
    const id = nextMainlineId();
    if (!id) return;
    commitMainlines([...mainlines, { id, label:'Mainline '+id, color:_ML_PALETTE[mainlines.length % _ML_PALETTE.length] }]);
  };
  const deleteMainline  = id => {
    const n = pinsRef.current.filter(p => p.mainline === id).length;
    const ml = mainlines.find(m => m.id === id);
    if (!window.confirm(`Delete ${ml ? ml.label : id}?` + (n ? `\n\n${n} tree${n!==1?'s':''} assigned to it will become unassigned. The trees themselves are kept.` : ''))) return;
    if (n) {
      const cleared = pinsRef.current.map(p => p.mainline === id ? { ...p, mainline:null } : p);
      setPins(cleared); ls.set('sg_lines_pins', cleared); pinsRef.current = cleared;
      cleared.forEach(p => { if (p.type === 'tree') _sbUpdateMarker(p); });
    }
    commitMainlines(mainlines.filter(m => m.id !== id));
  };
  // Materials estimator
  const [vacSystem, setVacSystem] = React.useState(() => ls.get('sg_vacsystem', false));
  const [mainSize,  setMainSize]  = React.useState(() => ls.get('sg_mainsize', '3/4"'));
  const [showMatPrices, setShowMatPrices] = React.useState(false);
  const [matPrices, setMatPrices] = React.useState(() => ls.get('sg_matprices', {
    lateral: 0.07, mainline: 0.65, drop: 0.18, spile: 0.85, tee: 0.65, mainTee: 1.10,
  }));
  const updateMatPrice = (k, v) => {
    const next = { ...matPrices, [k]: parseFloat(v) || 0 };
    setMatPrices(next); ls.set('sg_matprices', next);
  };
  React.useEffect(() => { ls.set('sg_vacsystem', vacSystem); }, [vacSystem]);
  React.useEffect(() => { ls.set('sg_mainsize',  mainSize);  }, [mainSize]);
  const mapRef = React.useRef(null);
  const modeRef = React.useRef(mode); modeRef.current = mode;
  const pinsRef = React.useRef(pins); pinsRef.current = pins;
  const gpsWatchRef = React.useRef(null);

  // Load Leaflet CSS + JS on demand
  React.useEffect(() => {
    if (window.L) { setLeafletReady(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    const timer = setTimeout(() => { if (!window.L) setLeafletError(true); }, 8000);
    script.onload  = () => { clearTimeout(timer); setLeafletReady(true); };
    script.onerror = () => { clearTimeout(timer); setLeafletError(true); };
    document.body.appendChild(script);
  }, []);

  // Init map once Leaflet ready
  React.useEffect(() => {
    if (!leafletReady || !mapRef.current || _lMap) return;
    _lMap = window.L.map(mapRef.current, { zoomControl:true });
    if (_lMap.attributionControl) _lMap.attributionControl.setPrefix(false);
    window._sgMap = _lMap;   // for the headless suites, which zoom and read the map
    _lMap._sat = window.L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution:'Imagery © Esri', maxZoom:20 }
    );
    _lMap._labels = window.L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { attribution:'', maxZoom:20, opacity:0.85 }
    );
    _lMap._street = window.L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution:'© OpenStreetMap', maxZoom:19 }
    );
    _lMap._sat.addTo(_lMap); _lMap._labels.addTo(_lMap);
    const saved = ls.get('sg_lines_pins', []);
    if (saved.length > 0) {
      _lMap.setView([saved[0].lat, saved[0].lon], 17);
      saved.forEach(p => _sbRenderMarker(p));
    } else {
      _lMap.setView([45.5, -72.0], 14);
      navigator.geolocation?.getCurrentPosition(
        pos => _lMap.setView([pos.coords.latitude, pos.coords.longitude], 16), () => {}
      );
    }
    // A boundary imported in an earlier session is drawn again here, so it
    // survives tab switches, reloads and a restore from backup.
    _sbRestoreProperty();

    // Wire up pin-click callback to show detail panel
    window._sgMapPinClick = (pinId) => { setSelectedPinId(pinId); setShowPinPanel(true); };
    // labels come and go with zoom
    _lMap.on('zoomend', () => { const z = _lMap.getZoom(); if ((z >= _SB_LABEL_MIN_ZOOM) !== (_sbLastZoomLabels)) { _sbLastZoomLabels = z >= _SB_LABEL_MIN_ZOOM; pinsRef.current.forEach(p => { if (p.type === 'tree') _sbUpdateMarker(p); }); } });

    // Tear the map down when the tab unmounts so it can be rebuilt next time
    return () => {
      if (gpsWatchRef.current != null) {
        try { navigator.geolocation.clearWatch(gpsWatchRef.current); } catch {}
        gpsWatchRef.current = null;
      }
      try { if (_lMap) _lMap.remove(); } catch {}
      _lMap = null;
      _lMarkers = {};
      _lRouteLines = [];
      _lSpotMarkers = [];
      _lPropertyLayers = [];
      _lSeasonLayer = null;
      _lSliderEl = null;
      _lGpsMarker = null;
      _lGpsCircle = null;
      _lMeasureLayers = [];
      _lYieldLayers = [];
      _lTerrainActive = false;
      window._sgMapPinClick = null;
    };
  }, [leafletReady]);

  // Yield heat: draw/clear the halos. Depends on pins so a new collection-point
  // assignment (or a deleted pin) redraws while the view is on.
  React.useEffect(() => {
    if (!leafletReady || !_lMap) return;
    if (yieldHeat) _sbDrawYieldHeat(pinsRef.current, ls.get('sg_units','GAL') === 'L' ? 'L' : 'gal');
    else _sbClearYieldHeat();
  }, [yieldHeat, pins, leafletReady]);

  // Base-layer switching (satellite / sat+terrain / terrain / topo / street)
  React.useEffect(() => {
    if (!_lMap) return;
    _sbApplyBase(_lMap, mapType, terrainOpacity);
  }, [mapType, leafletReady]);

  // Terrain overlay strength — applied live, no re-add
  React.useEffect(() => {
    if (_lMap && _lMap._terrain) { try { _lMap._terrain.setOpacity(terrainOpacity); } catch {} }
  }, [terrainOpacity]);

  // Seasonal imagery overlay
  React.useEffect(() => {
    if (!_lMap) return;
    _sbApplySeasonLayer(_lMap, seasonMode);
  }, [seasonMode, leafletReady]);

  // Map click → measure vertex while the tape is armed, else drop pin.
  // Disarmed, the handler is byte-identical to the original pin drop.
  React.useEffect(() => {
    if (!_lMap) return;
    const h = e => {
      const M = measureRef.current;
      if (M.on) {
        if (M.closed) return;   // ring closed: read the numbers, taps do nothing
        setMVerts(vs => [...vs, { lat: e.latlng.lat, lon: e.latlng.lng }]);
        return;
      }
      _dropPin(e.latlng.lat, e.latlng.lng, modeRef.current, pinsRef, setPins);
    };
    _lMap.on('click', h);
    return () => { _lMap?.off('click', h); };
  }, [leafletReady]);

  // Measure tape drawing — redraws on every vertex; clears when disarmed
  React.useEffect(() => {
    measureRef.current = { on: measuring, closed: mClosed };
    if (!leafletReady) return;
    if (!measuring) { _sbClearMeasure(); return; }
    _sbDrawMeasure(mVerts, mClosed, () => { if (mVerts.length >= 3) setMClosed(true); });
  }, [measuring, mVerts, mClosed, leafletReady]);

  const measureUndo  = () => { setMVerts(vs => vs.slice(0, -1)); setMClosed(false); };
  const measureClear = () => { setMVerts([]); setMClosed(false); };
  const measureDone  = () => { setMeasuring(false); setMVerts([]); setMClosed(false); };
  const measureToggle = () => { measuring ? measureDone() : setMeasuring(true); };
  // Running numbers, both unit systems — tabular-nums in the readout
  const mDistM  = mVerts.reduce((s, v, i) => i ? s + srHaversineM(mVerts[i-1].lat, mVerts[i-1].lon, v.lat, v.lon) : 0, 0);
  const mPerimM = (mClosed && mVerts.length >= 3)
    ? mDistM + srHaversineM(mVerts[mVerts.length-1].lat, mVerts[mVerts.length-1].lon, mVerts[0].lat, mVerts[0].lon)
    : mDistM;
  const mAreaM2 = (mClosed && mVerts.length >= 3) ? srPolyAreaM2(mVerts) : 0;
  const _fmtN = (n, d = 0) => n.toLocaleString(lang === 'fr' ? 'fr-CA' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  // GPS — drop pin at current location
  const markGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsLoading(false);
        const acc = pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : null;
        _dropPin(pos.coords.latitude, pos.coords.longitude, modeRef.current, pinsRef, setPins, { accuracy: acc });
        _lMap?.setView([pos.coords.latitude, pos.coords.longitude], 18);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy:true, timeout:12000 }
    );
  };

  // GPS — live tracking (continuous follow with blue dot)
  const startTracking = () => {
    if (!navigator.geolocation || !_lMap || !window.L) return;
    setGpsTracking(true);
    const onPos = pos => {
      const { latitude:lat, longitude:lng, accuracy:acc } = pos.coords;
      setGpsAcc(acc != null ? Math.round(acc) : null);
      if (!_lGpsMarker) {
        const myIcon = window.L.divIcon({ className:'', html:'<div style="width:16px;height:16px;background:#4285F4;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(66,133,244,0.25)"></div>', iconSize:[16,16], iconAnchor:[8,8] });
        _lGpsMarker = window.L.marker([lat, lng], { icon:myIcon, zIndexOffset:1000 }).addTo(_lMap);
        _lGpsCircle = window.L.circle([lat, lng], { radius:acc, color:'#4285F4', fillColor:'#4285F4', fillOpacity:.1, weight:1 }).addTo(_lMap);
        _lMap.setView([lat, lng], Math.max(_lMap.getZoom(), 17));
      } else {
        _lGpsMarker.setLatLng([lat, lng]);
        _lGpsCircle.setLatLng([lat, lng]).setRadius(acc);
        _lMap.panTo([lat, lng]);
      }
    };
    gpsWatchRef.current = navigator.geolocation.watchPosition(onPos, () => {}, { enableHighAccuracy:true, timeout:30000, maximumAge:5000 });
  };

  const stopTracking = () => {
    if (gpsWatchRef.current != null) { navigator.geolocation.clearWatch(gpsWatchRef.current); gpsWatchRef.current = null; }
    if (_lGpsMarker) { try { _lMap?.removeLayer(_lGpsMarker); } catch {} _lGpsMarker = null; }
    if (_lGpsCircle) { try { _lMap?.removeLayer(_lGpsCircle); } catch {} _lGpsCircle = null; }
    setGpsTracking(false);
    setGpsAcc(null);
  };

  // Save current map view tiles to offline cache
  const saveOffline = async () => {
    if (!_lMap || caching) return;
    setCaching(true);
    setCacheMsg('Saving map tiles…');
    setCachePct(0);
    const result = await _sbCacheTiles(_lMap, (pct, done, total) => {
      setCachePct(pct);
      setCacheMsg(`Saving… ${done} / ${total} tiles`);
    }, mapType);
    setCaching(false);
    if (result.error) {
      setCacheMsg('! ' + result.error);
      setTimeout(() => setCacheMsg(''), 5000);
    } else if (result.errors === 0) {
      setCacheMsg(`✓ ${result.count} tiles saved. Map works offline now.`);
      setTimeout(() => setCacheMsg(''), 5000);
    } else if (result.saved === 0) {
      setCacheMsg(`! 0 of ${result.count} tiles saved. No connection. Try again when you have signal.`);
      setTimeout(() => setCacheMsg(''), 8000);
    } else {
      setCacheMsg(`! ${result.saved} of ${result.count} tiles saved. Weak signal. Try again to fill the gaps.`);
      setTimeout(() => setCacheMsg(''), 8000);
    }
  };

  // Place pin by typed coordinates
  const addByCoords = () => {
    const lat = parseFloat(coordLat);
    const lon = parseFloat(coordLon);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setRouteMsg('Invalid coordinates. Use decimal degrees (e.g. 45.1234, -72.5678)');
      return;
    }
    _dropPin(lat, lon, mode, pinsRef, setPins);
    _lMap?.setView([lat, lon], 18);
    setCoordLat(''); setCoordLon('');
    setShowCoordPanel(false);
    setRouteMsg('');
  };

  // Zoom map to a pin
  const zoomToPin = (pin) => {
    if (!_lMap) return;
    _lMap.setView([pin.lat, pin.lon], 18);
    if (_lMarkers[pin.id]) _lMarkers[pin.id].openPopup();
  };

  // Rename a pin
  const renamePin = (id, newLabel) => {
    if (!newLabel.trim()) { setEditingId(null); setEditLabel(''); return; }
    const updated = pinsRef.current.map(p => p.id === id ? {...p, label:newLabel.trim()} : p);
    setPins(updated); ls.set('sg_lines_pins', updated);
    const pin = updated.find(p => p.id === id);
    if (pin && _lMarkers[id]) _lMarkers[id].setPopupContent(
      `<b>${_sbEsc(pin.label)}</b><br/>${pin.lat.toFixed(5)}, ${pin.lon.toFixed(5)}<br/>Elevation: ${pin.elev!=null?pin.elev.toFixed(1)+' ft':'fetching…'}`
    );
    setEditingId(null); setEditLabel('');
  };

  // Clear spot markers
  const clearSpots = () => { _clearSpotMarkers(); setTankSpots([]); setRouteMsg(''); };

  // Clear route lines
  const clearRoutes = () => { _clearRouteLines(); setRouteResults([]); setRouteProgress(''); };

  // Convert a suggested spot to a real tank pin
  const placeSpotAsTank = (spot) => {
    _dropPin(spot.lat, spot.lon, 'tank', pinsRef, setPins);
    _lMap?.setView([spot.lat, spot.lon], 17);
    _clearSpotMarkers();
    setTankSpots([]);
  };

  // Helper: ensure all pins in a list have elevations, fetching any that are missing.
  // Returns the updated pin list (also saves to state + localStorage).
  const ensureElevations = async (pinList, progressLabel) => {
    const missing = pinList.filter(p => p.elev == null);
    if (!missing.length) return pinList;
    setRouteProgress(`Fetching elevation for ${missing.length} ${progressLabel}…`);
    const elevs = await _fetchElevBatch(missing);
    let current = [...pinsRef.current];
    missing.forEach((pin, i) => {
      if (elevs[i] != null) {
        current = current.map(p => p.id === pin.id ? { ...p, elev: elevs[i] } : p);
        if (_lMarkers[pin.id]) _lMarkers[pin.id].setPopupContent(
          `<b>${_sbEsc(pin.label)}</b><br/>${pin.lat.toFixed(5)}, ${pin.lon.toFixed(5)}<br/>Elevation: ${elevs[i].toFixed(1)} ft`
        );
      }
    });
    ls.set('sg_lines_pins', current);
    setPins(current);
    pinsRef.current = current;
    return current;
  };

  // Analyze routes — uses existing pin elevations (instant, always works) then
  // optionally refines with a single terrain-profile batch call per pair.
  const analyzeRoutes = async () => {
    // ── NEW LINE-BASED ANALYSIS ──────────────────────────────────────────────
    // Philosophy: sap lines are not individual tree→tank connections.
    // They're a series of trees connected in sequence (highest → lowest)
    // running down to a collection tank.  We build one "line" per tank,
    // assign each tree to its best-fit tank, sort trees by elevation,
    // then compute grade between every consecutive node in the line.
    // ────────────────────────────────────────────────────────────────────────
    const allTrees = pinsRef.current.filter(p => p.type==='tree');
    const allTanks = pinsRef.current.filter(p => p.type==='tank');
    if (!allTrees.length) { setRouteMsg('Place at least 1 tree pin on the map first.'); return; }
    if (!allTanks.length) { setRouteMsg('Place at least 1 tank pin on the map first.'); return; }

    setRouteMsg(''); setRouteProgress(''); setAnalyzing(true); setRouteResults([]); _clearRouteLines();
    _sbScanSweep();

    // 1. Ensure elevations for all pins
    try {
      await ensureElevations(allTrees, 'tree pin(s)');
      await ensureElevations(allTanks, 'tank pin(s)');
    } catch(e) {
      setRouteMsg('Could not fetch elevations. With no signal, tap a pin and type its elevation into the Elevation box — a topo map or handheld GPS will give you the number.');
      setAnalyzing(false); setRouteProgress(''); return;
    }
    const trees = pinsRef.current.filter(p => p.type==='tree' && p.elev!=null);
    const tanks = pinsRef.current.filter(p => p.type==='tank' && p.elev!=null);
    if (!trees.length) { setRouteMsg('No tree pin has an elevation yet. Tap a tree and type its elevation, or tap Look up where you have signal.'); setAnalyzing(false); setRouteProgress(''); return; }
    if (!tanks.length) { setRouteMsg('No tank pin has an elevation yet. Tap a tank and type its elevation, or tap Look up where you have signal.'); setAnalyzing(false); setRouteProgress(''); return; }

    // 2. Assign each tree to the tank it flows to best (highest grade to that tank)
    const byTank = {};
    tanks.forEach(tank => { byTank[tank.id] = { tank, trees: [] }; });
    trees.forEach(tree => {
      let bestTank = null, bestGrade = -Infinity;
      tanks.forEach(tank => {
        const dist  = haversineFt(tree.lat, tree.lon, tank.lat, tank.lon);
        const grade = dist > 0 ? ((tree.elev - tank.elev) / dist) * 100 : -999;
        if (grade > bestGrade) { bestGrade = grade; bestTank = tank; }
      });
      if (bestTank) byTank[bestTank.id].trees.push(tree);
    });

    const results = [];
    for (const { tank, trees: lineTrees } of Object.values(byTank)) {
      if (!lineTrees.length) continue;
      setRouteProgress(`Building line → ${tank.label}…`);

      // 3. Sort trees highest→lowest (natural line flow order)
      const sorted = [...lineTrees].sort((a, b) => (b.elev||0) - (a.elev||0));

      // 4. Build node list: [tree1, tree2, ..., treeN, tank]
      //    Compute grade between every consecutive pair
      const lineNodes = [...sorted, tank];
      const segments  = [];
      let totalDist = 0, totalDrop = 0;

      for (let i = 0; i < lineNodes.length - 1; i++) {
        const from = lineNodes[i];
        const to   = lineNodes[i + 1];
        const dist = haversineFt(from.lat, from.lon, to.lat, to.lon);
        const drop = (from.elev||0) - (to.elev||0);
        const grade = dist > 0 ? (drop / dist) * 100 : 0;
        segments.push({ from, to, dist, drop, grade, isToTank: i === lineNodes.length - 2 });
        totalDist += dist;
        totalDrop += drop;
      }

      const grades      = segments.map(s => s.grade);
      const minGrade    = Math.min(...grades);
      const maxGrade    = Math.max(...grades);
      const overallGrade = totalDist > 0 ? (totalDrop / totalDist) * 100 : 0;
      const badSegs     = segments.filter(s => s.grade < 1.0);
      const goodFlow    = minGrade >= 1.0;

      results.push({ tank, trees: sorted, lineNodes, segments,
        minGrade, maxGrade, overallGrade, totalDist, totalDrop, badSegs, goodFlow });
    }

    setRouteResults(results);
    _drawRouteLines(results);
    setRouteProgress('');
    if (!results.length) setRouteMsg('No routes — verify pins have elevations loaded.');
    setAnalyzing(false);
  };

  // Suggest collection tank spots — scored by gravity-flow potential
  const findTankSpots = async () => {
    const allTrees = pinsRef.current.filter(p => p.type==='tree');
    if (allTrees.length < 2) { setRouteMsg('Place at least 2 trees on the map first.'); return; }
    setFindingSpots(true); setRouteMsg('Loading…');
    try { await ensureElevations(allTrees, 'tree pin(s)'); } catch {}
    const trees = pinsRef.current.filter(p => p.type==='tree' && p.elev!=null);
    if (trees.length < 2) { setRouteMsg('Need elevations on at least 2 trees. Tap a tree and type its elevation, or tap Look up where you have signal.'); setFindingSpots(false); return; }
    setRouteMsg('Sampling terrain grid for tank spots…');
    _clearSpotMarkers(); setTankSpots([]);
    const cLat = trees.reduce((s,p)=>s+p.lat,0)/trees.length;
    const cLon = trees.reduce((s,p)=>s+p.lon,0)/trees.length;
    const avgTreeElev = trees.reduce((s,p)=>s+p.elev,0)/trees.length;
    const offsets = [-0.003,-0.002,-0.001,0,0.001,0.002,0.003];
    const gridPts = [];
    for (const dLat of offsets) for (const dLon of offsets) gridPts.push({ lat:cLat+dLat, lon:cLon+dLon });
    let elevs;
    try {
      setRouteMsg('Fetching elevation grid (49 points)…');
      elevs = await _fetchElevBatch(gridPts);
    } catch { setRouteMsg('Elevation fetch failed. Check connection.'); setFindingSpots(false); return; }
    const candidates = gridPts
      .map((pt, i) => ({ ...pt, elev: elevs[i] }))
      .filter(c => c.elev != null && c.elev < avgTreeElev - 5);
    if (!candidates.length) {
      setRouteMsg('No lower spots found — terrain may be too flat. Consider vacuum assist.');
      setFindingSpots(false); return;
    }
    const scored = candidates.map(c => {
      let score = 0;
      trees.forEach(t => {
        const distFt = haversineFt(t.lat, t.lon, c.lat, c.lon);
        const grade = distFt > 0 ? ((t.elev - c.elev) / distFt) * 100 : 0;
        if (grade >= 2.0) score += 3;
        else if (grade >= 1.0) score += 2;
        else if (grade >= 0.5) score += 1;
      });
      return { ...c, score, treesAbove: trees.filter(t => ((t.elev-c.elev)/Math.max(haversineFt(t.lat,t.lon,c.lat,c.lon),1))*100 >= 1.0).length };
    });
    const spots = scored.sort((a,b) => b.score-a.score || a.elev-b.elev).slice(0,3);
    setTankSpots(spots);
    setRouteMsg('');
    spots.forEach((s,i) => {
      if (!_lMap || !window.L) return;
      const tankSVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12M20 6v12"/><ellipse cx="12" cy="18" rx="8" ry="3"/><path d="M4 12a8 3 0 0 0 16 0" opacity=".4"/></svg>';
      const rankLabel = ['#1','#2','#3'][i] || '';
      const m = window.L.marker([s.lat,s.lon], { icon: window.L.divIcon({
        className:'',
        html: '<div class="' + (i === 0 ? 'sr-spot-top' : '') + '" style="position:relative;width:30px;height:40px;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.6))">'
          + '<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">'
          + '<path d="M15 39 C15 39,4 26,4 15 A11 11 0 1 1 26 15 C26 26,15 39,15 39 Z" fill="#d97706"/>'
          + '<path d="M9 10 A9 9 0 0 1 21 10" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2.5" stroke-linecap="round"/>'
          + '</svg>'
          + '<div style="position:absolute;top:4px;left:50%;transform:translateX(-50%)">' + tankSVG + '</div>'
          + '<div style="position:absolute;top:-8px;right:-6px;background:#fbbf24;color:#07090f;font-size:8px;font-weight:800;border-radius:6px;padding:1px 4px;font-family:Inter,sans-serif;border:1.5px solid #fff">' + rankLabel + '</div>'
          + '</div>',
        iconSize:[30,40], iconAnchor:[15,40], popupAnchor:[0,-42],
      })}).addTo(_lMap);
      m.bindPopup('<b>★ Spot ' + (i+1) + '</b><br/>Elev: ' + s.elev.toFixed(1) + ' ft<br/>'
        + s.treesAbove + '/' + trees.length + ' trees with ≥1% gravity flow<br/>'
        + s.lat.toFixed(5) + ', ' + s.lon.toFixed(5));
      _lSpotMarkers.push(m);
    });
    setFindingSpots(false);
  };

  const removePin = id => {
    const updated = pinsRef.current.filter(p => p.id!==id);
    setPins(updated); ls.set('sg_lines_pins', updated);
    if (_lMarkers[id]) { _lMarkers[id].remove(); delete _lMarkers[id]; }
    if (editingId === id) { setEditingId(null); setEditLabel(''); }
  };
  const clearAll = () => {
    const n = pinsRef.current.length;
    if (!window.confirm(`Delete all ${n} pins? This cannot be undone.`)) return;
    setPins([]); ls.set('sg_lines_pins', []);
    Object.values(_lMarkers).forEach(m => m.remove()); _lMarkers = {};
    _clearRouteLines(); _clearSpotMarkers();
    setRouteResults([]); setTankSpots([]); setRouteMsg(''); setRouteProgress('');
    setEditingId(null); setEditLabel('');
  };


  const treePins  = pins.filter(p => p.type === 'tree');
  const tankPins  = pins.filter(p => p.type === 'tank');
  const otherPins = pins.filter(p => p.type !== 'tree' && p.type !== 'tank');
  const totalTaps = treePins.reduce((s, p) => s + (parseInt(p.taps) || 0), 0);
  const readyTrees = treePins.filter(p => p.elev != null).length;
  const readyTanks = tankPins.filter(p => p.elev != null).length;
  const gravityLines = routeResults.filter(r => r.goodFlow).length;
  const selectedPin = pins.find(p => p.id === selectedPinId) || null;

  // Load the open pin's elevation into the input, without stamping on what the
  // producer is part way through typing.
  React.useEffect(() => {
    const p = pinsRef.current.find(x => x.id === selectedPinId);
    setElevDraft(p && p.elev != null ? String(p.elev) : '');
    // the tree that was selected and the one that is now: both re-drawn
    const was = _sbSelectedId; _sbSelectedId = selectedPinId;
    [was, selectedPinId].forEach(id => { if (id == null) return; const q = pinsRef.current.find(x => x.id === id); if (q && q.type === 'tree') _sbUpdateMarker(q); });
  }, [selectedPinId]);

  const updatePinField = (id, field, val) => {
    const updated = pinsRef.current.map(p => p.id === id ? { ...p, [field]: val } : p);
    setPins(updated); ls.set('sg_lines_pins', updated);
    pinsRef.current = updated;
    const pin = updated.find(p => p.id === id);
    if (pin) _sbUpdateMarker(pin);
  };

  // Icon + colour mapping for each mode — matches app nav-tab style
  const _MODE_TABS = [
    { id:'tree',       Icon:I.mapleLeaf, label:'Tap Tree',   color:'#2dd4a7' },
    { id:'tank',       Icon:I.tank,      label:'Tank',       color:'#3b82f6' },
    { id:'sugarhouse', Icon:I.sugarhouse,label:'Sugarhouse', color:'#e0a44a' },
    { id:'pump',       Icon:I.settings,  label:'Pump',       color:'#f97316' },
    { id:'junction',   Icon:I.crosshair, label:'Junction',   color:'#8b5cf6' },
    { id:'marker',     Icon:I.mapPin,    label:'Waypoint',   color:'#ef4444' },
  ];
  const _activeCfg = _MODE_TABS.find(c => c.id === mode) || _MODE_TABS[0];

  const [betaDismissed, setBetaDismissed] = React.useState(() => ls.get('sg_map_beta_dismissed', false));
  const [showModePicker, setShowModePicker] = React.useState(false);
  // The stage fills the screen from its own top edge to the bottom bar; Leaflet is told when that changes.
  const stageRef = React.useRef(null);
  const [stageH, setStageH] = React.useState(560);
  React.useLayoutEffect(() => {
    const fit = () => {
      if (!stageRef.current) return;
      const top = stageRef.current.getBoundingClientRect().top + window.scrollY;
      const nav = document.querySelector('.bottom-nav');
      const navH = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().height : 0;
      setStageH(Math.max(420, Math.round(window.innerHeight - top - navH)));
    };
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [betaDismissed]);
  React.useEffect(() => { if (_lMap) setTimeout(() => { try { _lMap.invalidateSize(); } catch (e) {} }, 60); }, [stageH, leafletReady]);
  const dismissBeta = () => { ls.set('sg_map_beta_dismissed', true); setBetaDismissed(true); };

  return (
    <div style={{ position:'relative', marginTop:-8 }}>

      {/* ── Beta notice ─────────────────────────────────────────────────── */}
      {!betaDismissed && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:6, minHeight:32 }}>
          <div style={{ fontSize:13, color:'#7f92a6', lineHeight:1.4, minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            <span style={{ fontWeight:700, color:'#e6edf3' }}>Beta</span> · GPS ±5–15 m under canopy · routes need signal
          </div>
          <button onClick={dismissBeta} aria-label="Dismiss the beta notice"
            style={{ background:'none', border:'none', color:'#7f92a6', cursor:'pointer', flexShrink:0, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }}><I.x size={16} /></button>
        </div>
      )}

      {/* ── The stage: the map fills the screen under the sub-tab row; one floating cluster ── */}
      <div className="map-stage" ref={stageRef} style={{ height:stageH }}>
        {!leafletReady
          ? <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'0 24px', color:'#7f92a6', fontSize:13, lineHeight:1.5 }}>
              {leafletError
                ? 'The map needs a connection the first time it opens. Open this tab once with signal and tap Save offline. Your pin list below still works.'
                : <span style={{ display:'inline-block' }}>
                    <span className="sr-scanline" style={{ display:'block', width:120, margin:'0 auto 10px' }} />
                    Loading map…
                  </span>}
            </div>
          : <div ref={mapRef} style={{ height:'100%' }} />
        }
        {leafletReady && (
          <div className="map-hud" aria-hidden="true">
            <div className="map-hud-inner">
              <span><b>{pins.length}</b> pin{pins.length !== 1 ? 's' : ''}</span>
              <span className="sep">·</span>
              <span>GPS {gpsTracking ? (gpsAcc != null ? <b>±{gpsAcc}m</b> : <b>live</b>) : '—'}</span>
              <span className="sep">·</span>
              <span><b>{mapType === 'street' ? 'Street'
                : mapType === 'topo' ? 'Topo'
                : mapType === 'terrain' ? 'Terrain'
                : mapType === 'sat-terrain' ? 'Sat+Terrain'
                : seasonMode === 'naip' ? 'Leaf-on'
                : seasonMode === 'clarity' ? 'Leaf-off'
                : seasonMode === 'compare' ? 'Compare' : 'Sat'}</b></span>
              {measuring && (<React.Fragment>
                <span className="sep">·</span>
                <span><b>{mClosed && mVerts.length >= 3
                  ? `${_fmtN(mAreaM2 / SR_M2_PER_ACRE, 2)} ac`
                  : `${_fmtN(mDistM * 3.28084)} ft`}</b></span>
              </React.Fragment>)}
            </div>
          </div>
        )}
        <div className="map-cluster">
          <button className={`mfab${mapType !== 'satellite' ? ' on' : ''}`} onClick={() => setShowLayerPanel(true)}
            aria-label={t(lang,'lyTitle')} title={t(lang,'lyTitle')} aria-haspopup="dialog">
            <I.layers size={20} color="currentColor" />
          </button>
          <button className={`mfab${measuring ? ' on' : ''}`} onClick={measureToggle} aria-pressed={measuring}
            aria-label={t(lang,'msMeasure')} title={t(lang,'msMeasure')}>
            <I.ruler size={20} color="currentColor" />
          </button>
          <button className="mfab" onClick={markGPS} disabled={gpsLoading} aria-label="Drop a pin at my GPS position" title="Drop a pin at my GPS position">
            {gpsLoading ? <span style={{ fontSize:13, fontWeight:700 }}>…</span> : <I.crosshair size={20} color="currentColor" />}
          </button>
          <button className={`mfab${gpsTracking ? ' rec' : ''}`} onClick={gpsTracking ? stopTracking : startTracking} aria-pressed={gpsTracking}
            aria-label={gpsTracking ? 'Stop tracking my route' : 'Track my route'} title={gpsTracking ? 'Stop tracking' : 'Track my route'}>
            {gpsTracking ? <I.circle size={18} color="currentColor" /> : <I.mapPin size={20} color="currentColor" />}
          </button>
          <button className={`mfab${caching ? ' on' : ''}`} onClick={saveOffline} disabled={caching || !leafletReady}
            aria-label="Save this area of the map for offline use" title="Save offline">
            {caching ? <span style={{ fontSize:12, fontWeight:700 }}>{cachePct}%</span> : <I.save size={20} color="currentColor" />}
          </button>
          <button className="mfab" onClick={() => { if (pins.length) removePin(pins[pins.length - 1].id); }} disabled={pins.length === 0}
            aria-label="Undo the last pin" title="Undo">
            <I.undo size={20} color="currentColor" />
          </button>
        </div>
        {!measuring && (
          <button className="map-add" onClick={() => setShowModePicker(true)} aria-label={`Choose what a tap on the map adds. Now: ${_activeCfg.label}`}>
            <I.plus size={18} color="#07090f" /> {_activeCfg.label}
          </button>
        )}
        {/* ── Measure readout: glass instrument panel while the tape is armed ── */}
        {measuring && (
          <div className="map-measure" role="status">
            {mVerts.length === 0 ? (
              <div style={{ fontSize:13, color:'#e6edf3' }}>{t(lang,'msTapToStart')}</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
                  <span className="mm-cap">{t(lang, mClosed && mVerts.length >= 3 ? 'msPerimeter' : 'msDistance')}</span>
                  <span className="mm-val">{_fmtN(mPerimM * 3.28084)} ft</span>
                  <span className="mm-alt">{_fmtN(mPerimM)} m</span>
                </div>
                {mClosed && mVerts.length >= 3 ? (
                  <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
                    <span className="mm-cap">{t(lang,'msArea')}</span>
                    <span className="mm-val" style={{ color:'#EB9A33' }}>{_fmtN(mAreaM2 / SR_M2_PER_ACRE, 2)} ac</span>
                    <span className="mm-alt">{_fmtN(mAreaM2 / SR_M2_PER_HA, 2)} ha</span>
                  </div>
                ) : mVerts.length >= 3 ? (
                  <div style={{ fontSize:11, color:'#7f92a6' }}>{t(lang,'msCloseHint')}</div>
                ) : null}
              </div>
            )}
            <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
              <button className="mm-chip" onClick={measureUndo} disabled={mVerts.length === 0}>{t(lang,'msUndo')}</button>
              <button className="mm-chip" onClick={measureClear} disabled={mVerts.length === 0}>{t(lang,'msClear')}</button>
              {mVerts.length >= 3 && !mClosed && (
                <button className="mm-chip mm-chip-amber" onClick={() => setMClosed(true)}>{t(lang,'msCloseRing')}</button>
              )}
              <button className="mm-chip mm-chip-teal" onClick={measureDone}>{t(lang,'msDone')}</button>
            </div>
          </div>
        )}
        {cacheMsg ? (
          <div className="map-toast" style={{ display:'flex', alignItems:'center', gap:8 }}>
            {caching && (
              <div style={{ flex:1, height:3, background:'rgba(45,212,167,0.15)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${cachePct}%`, background:'#2dd4a7', borderRadius:2, transition:'width 0.2s' }} />
              </div>
            )}
            <span>{cacheMsg.replace(/^[✓!]\s*/, '')}</span>
          </div>
        ) : null}
      </div>

      {/* ── What a tap adds: a sheet, opened from the one floating button ── */}
      {showModePicker && (
        <div className="scrim" onClick={() => setShowModePicker(false)} role="dialog" aria-modal="true" aria-label="What a tap on the map adds">
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div style={{ fontWeight:800, fontSize:17, marginBottom:10 }}>Tap the map to add</div>
            {_MODE_TABS.map(({ id, Icon, label }) => (
              <button key={id} className={`pick-row${mode === id ? ' on' : ''}`} onClick={() => { setMode(id); setShowModePicker(false); }} aria-pressed={mode === id}>
                <Icon size={20} color="currentColor" /> {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Layers panel: glass sheet, every base + seasonal mode as a row ── */}
      {showLayerPanel && (
        <div className="scrim" onClick={() => setShowLayerPanel(false)} role="dialog" aria-modal="true" aria-label={t(lang,'lyTitle')}>
          <div className="sheet sheet-glass" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div style={{ fontWeight:800, fontSize:17, marginBottom:4 }}>{t(lang,'lyTitle')}</div>
            <div className="ly-cap">{t(lang,'lyBase')}</div>
            <_LyRow active={mapType === 'satellite'} onClick={() => setMapType('satellite')}
              thumbs={[{ src:_SB_THUMB.sat }]} name={t(lang,'lySat')} sub={t(lang,'lySatSub')} />
            <_LyRow active={mapType === 'sat-terrain'} onClick={() => setMapType('sat-terrain')}
              thumbs={[{ src:_SB_THUMB.sat }, { src:_SB_THUMB.hillshade, cls:'blend' }]}
              name={t(lang,'lySatTerrain')} sub={t(lang,'lySatTerrainSub')} />
            {mapType === 'sat-terrain' && (
              <div className="ly-slider">
                <label htmlFor="sr-terrain-op" style={{ fontSize:12, fontWeight:700, color:'#7f92a6' }}>{t(lang,'lyTerrainStrength')}</label>
                <input id="sr-terrain-op" type="range" min="0.2" max="0.9" step="0.05"
                  value={terrainOpacity} onChange={e => setTerrainOpacity(parseFloat(e.target.value))} />
                <span style={{ fontSize:12, fontWeight:700, color:'#e6edf3', minWidth:34, textAlign:'right', ..._MONO }}>
                  {Math.round(terrainOpacity * 100)}%
                </span>
              </div>
            )}
            <_LyRow active={mapType === 'terrain'} onClick={() => setMapType('terrain')}
              thumbs={[{ src:_SB_THUMB.hillshade, cls:'tint' }]} name={t(lang,'lyTerrain')} sub={t(lang,'lyTerrainSub')} />
            <_LyRow active={mapType === 'topo'} onClick={() => setMapType('topo')}
              thumbs={[{ src:_SB_THUMB.topo }]} name={t(lang,'lyTopo')} sub={t(lang,'lyTopoSub')} />
            <_LyRow active={mapType === 'street'} onClick={() => setMapType('street')}
              thumbs={[{ src:_SB_THUMB.street }]} name={t(lang,'lyStreet')} sub={t(lang,'lyStreetSub')} />
            <div className="ly-cap">{t(lang,'lySeasonal')}</div>
            <_LyRow active={seasonMode === 'off'} onClick={() => setSeasonMode('off')}
              thumbs={[{ src:_SB_THUMB.sat }]} name={t(lang,'lyLive')} sub={t(lang,'lySatSub')} />
            <_LyRow active={seasonMode === 'naip'} onClick={() => setSeasonMode('naip')}
              thumbs={[{ src:_SB_THUMB.naip }]} name={t(lang,'lyLeafOn')} sub={t(lang,'lyLeafOnSub')} />
            <_LyRow active={seasonMode === 'clarity'} onClick={() => setSeasonMode('clarity')}
              thumbs={[{ src:_SB_THUMB.clarity }]} name={t(lang,'lyLeafOff')} sub={t(lang,'lyLeafOffSub')} />
            <_LyRow active={seasonMode === 'compare'} onClick={() => setSeasonMode('compare')}
              thumbs={[{ src:_SB_THUMB.naip }, { src:_SB_THUMB.clarity, cls:'half' }]}
              name={t(lang,'lyCompare')} sub={t(lang,'lyCompareSub')} />
            {/* Yield heat (Pass 5) */}
            <div className="ly-cap">{t(lang,'lyYield')}</div>
            <button className={`ly-row${yieldHeat ? ' on' : ''}`} onClick={() => setYieldHeat(v => !v)} aria-pressed={yieldHeat}>
              <span className="ly-thumb sr-yield-thumb" aria-hidden="true" />
              <span style={{ flex:1, minWidth:0 }}>
                <span className="ly-name">{t(lang,'lyYieldHeat')}</span>
                <span className="ly-sub">{t(lang,'lyYieldSub')}</span>
              </span>
              {yieldHeat ? <I.check size={18} color="#2dd4a7" /> : null}
            </button>
            <div className="ly-note">{t(lang,'lyYieldNote')}</div>
          </div>
        </div>
      )}

      {/* ── Below the map: imagery, coordinates, offline ── */}
      <div style={{ background:'#0f1720', border:'1px solid #1e2d3d', borderRadius:16, overflow:'hidden', margin:'10px 0' }}>
        <div className="hscroll" style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 12px 0' }}>
          <span style={{ fontSize:12, fontWeight:700, color:'#7f92a6', letterSpacing:'0.08em', textTransform:'uppercase', flexShrink:0 }}>Imagery</span>
          {/* Season pill */}
          <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:999, padding:2, flexShrink:0 }}>
            {[{v:'off',l:'Live'},{v:'naip',Ico:I.sun},{v:'clarity',Ico:I.snowflake},{v:'compare',l:'⟺'}].map(o => (
              <button key={o.v} onClick={() => setSeasonMode(o.v)} aria-pressed={seasonMode===o.v}
                style={{ background:seasonMode===o.v?'rgba(45,212,167,0.16)':'transparent', border:'none', borderRadius:999,
                  padding:'0 10px', fontSize:13, fontWeight:700, minWidth:36,
                  color:seasonMode===o.v?'#2dd4a7':'#7f92a6', cursor:'pointer', whiteSpace:'nowrap',
                  display:'flex', alignItems:'center', justifyContent:'center', minHeight:36 }}
                aria-label={o.v==='naip' ? 'Leaf-on imagery' : o.v==='clarity' ? 'Leaf-off imagery' : o.v==='compare' ? 'Compare' : 'Live imagery'}>
                {o.Ico ? <o.Ico size={16} color={seasonMode===o.v?'#2dd4a7':'#7f92a6'} /> : o.l}
              </button>
            ))}
          </div>

          <button onClick={() => setShowCoordPanel(v => !v)} aria-pressed={showCoordPanel}
            style={{ background:showCoordPanel?'rgba(45,212,167,0.16)':'rgba(255,255,255,0.06)', border:'none', borderRadius:999,
              padding:'0 12px', minHeight:40, flexShrink:0, fontSize:13, fontWeight:700, color:showCoordPanel?'#2dd4a7':'#7f92a6' }}>
            XY
          </button>
        </div>

        {/* Coordinate entry */}
        {showCoordPanel && (
          <div style={{ margin:'8px 12px 0', background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 12px' }}>
            <div style={{ fontSize:13, color:'#7f92a6', marginBottom:6 }}>
              Drop <b style={{ color:'#c9d1d9' }}>{_activeCfg?.label || mode}</b> at coordinates:
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <input aria-label="Lat  45.1234" value={coordLat} onChange={e=>setCoordLat(e.target.value)} placeholder="Lat  45.1234"
                style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'none', borderRadius:8,
                  padding:'7px 10px', color:'#c9d1d9', fontSize:12, outline:'none' }}
                onKeyDown={e=>{if(e.key==='Enter')addByCoords();}} />
              <input aria-label="Lon  -72.567" value={coordLon} onChange={e=>setCoordLon(e.target.value)} placeholder="Lon  -72.567"
                style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'none', borderRadius:8,
                  padding:'7px 10px', color:'#c9d1d9', fontSize:12, outline:'none' }}
                onKeyDown={e=>{if(e.key==='Enter')addByCoords();}} />
              <button onClick={addByCoords}
                style={{ background:'#2dd4a7', border:'none', borderRadius:8, padding:'7px 14px',
                  fontSize:12, fontWeight:700, color:'#07090f', cursor:'pointer', whiteSpace:'nowrap' }}>Drop</button>
            </div>
          </div>
        )}

        {/* ── Offline tile save — always-visible card inside map panel ── */}
        <div style={{ margin:'0 10px 10px', padding:'10px 12px', background:'#0d1a2b', borderRadius:10 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#e6edf3', marginBottom:2 }}>Save the map for offline</div>
              <div style={{ fontSize:12, color:'#7f92a6', lineHeight:1.4 }}>
                Zoom to your sugarbush, then tap Save. Works on next visit without cell service.
              </div>
            </div>
            <button onClick={saveOffline} disabled={caching || !leafletReady}
              style={{ background:'#0f1720',
                border:'1px solid #1e2d3d', borderRadius:10, minHeight:44,
                padding:'0 16px', fontSize:14, fontWeight:700, color:caching?'#7f92a6':'#e6edf3',
                whiteSpace:'nowrap', flexShrink:0,
                opacity:(caching||!leafletReady)?0.5:1, cursor:caching?'default':'pointer' }}>
              {caching ? `${cachePct}%` : 'Save'}
            </button>
          </div>
          {cacheMsg && (
            <div role="status" style={{ marginTop:8, fontSize:12, lineHeight:1.45,
              color: cacheMsg.startsWith('✓') ? '#2dd4a7' : cacheMsg.startsWith('!') ? '#e0a44a' : '#7f92a6' }}>
              {caching && (
                <div style={{ height:2, background:'rgba(45,212,167,0.15)', borderRadius:1, marginBottom:5, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${cachePct}%`, background:'#2dd4a7', borderRadius:1, transition:'width 0.2s' }} />
                </div>
              )}
              <span style={{ display:'flex', alignItems:'flex-start', gap:7 }}>
                <span style={{ flexShrink:0, marginTop:1 }}>
                  {cacheMsg.startsWith('✓') ? <I.check size={14} color="#2dd4a7" />
                    : cacheMsg.startsWith('!') ? <I.alert size={14} color="#e0a44a" /> : null}
                </span>
                <span>{cacheMsg.replace(/^[✓!]\s*/, '')}</span>
              </span>
            </div>
          )}
        </div>

        {/* Stats + action strip */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px 10px', fontSize:13, color:'#7f92a6' }}>
          {/* Counts */}
          <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, flexWrap:'wrap' }}>
            {treePins.length > 0 && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}>
                <I.mapleLeaf size={11} color="#2dd4a7" />
                <span style={{ color:'#2dd4a7', fontWeight:700 }}>{treePins.length}</span>
                {totalTaps > 0 && <span style={{ color:'#7f92a6' }}>· {totalTaps}t</span>}
              </span>
            )}
            {tankPins.length > 0 && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}>
                <I.tank size={11} color="#60a5fa" />
                <span style={{ color:'#60a5fa', fontWeight:700 }}>{tankPins.length}</span>
              </span>
            )}
            {otherPins.length > 0 && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}>
                <I.flame size={11} color="#e0a44a" />
                <span style={{ color:'#e0a44a', fontWeight:700 }}>{otherPins.length}</span>
              </span>
            )}
            {routeResults.length > 0 && (
              <span style={{ color:gravityLines===routeResults.length?'#4ade80':'#f85149', fontWeight:700 }}>
                {gravityLines}/{routeResults.length} ✓
              </span>
            )}
            {(readyTrees < treePins.length || readyTanks < tankPins.length) && (
              <I.clock size={14} color="#e0a44a" />
            )}
          </div>

          {/* Clear all */}
          <button onClick={clearAll} disabled={pins.length === 0}
            style={{ background:'rgba(248,81,73,0.1)', border:'none', borderRadius:8,
              padding:'5px 11px', fontSize:13, fontWeight:700,
              color:pins.length?'#f85149':'#2d3d50', cursor:pins.length?'pointer':'default' }}>
            Clear All
          </button>
        </div>
      </div>

      {/* ── Main tab bar ─────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.04)', borderRadius:12, padding:3, marginBottom:10 }}>
        {[
          {id:'map',       l:'Map Tools'},
          {id:'trees',     l:'Trees'},
          {id:'mainlines', l:'Mainlines'},
          {id:'property',  l:'Property'},
        ].map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)}
            style={{ flex:1, background:mainTab===t.id?'rgba(255,255,255,0.1)':'transparent',
              border:'none', borderRadius:9, padding:'8px 4px', fontSize:13, fontWeight:700,
              color:mainTab===t.id?'#e2e8f0':'#7f92a6', cursor:'pointer', transition:'all .15s' }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── MAP TOOLS TAB ────────────────────────────────────────────── */}
      {mainTab === 'map' && (
        <div>
          {/* Action buttons */}
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <button onClick={analyzeRoutes} disabled={analyzing||!treePins.length||!tankPins.length}
              style={{ flex:2, background:analyzing?'#0d1a2b':'#2dd4a7',
                border:analyzing?'1px solid rgba(45,212,167,0.35)':'none', borderRadius:10, padding:'13px', minHeight:44, fontSize:14, fontWeight:700,
                color:analyzing?'#2dd4a7':'#07090f', cursor:'pointer', opacity:(!treePins.length||!tankPins.length)?0.4:1,
                boxShadow:(!analyzing&&treePins.length&&tankPins.length)?'0 0 16px rgba(45,212,167,0.25)':'none',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <I.ruler size={16} color={analyzing?'#2dd4a7':'#07090f'} /> {analyzing ? 'Analyzing…' : 'Analyze Routes'}
            </button>
            <button onClick={findTankSpots} disabled={findingSpots||treePins.length<2}
              style={{ flex:1, background:'#0f1720',
                border:'1px solid #1e2d3d', borderRadius:10, padding:'13px', minHeight:44, fontSize:13, fontWeight:700,
                color:'#e6edf3', cursor:'pointer', opacity:treePins.length<2?0.4:1,
                display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              {findingSpots ? '…' : <I.star size={13} color="currentColor" />} Tank Spots
            </button>
          </div>

          {/* Progress + messages */}
          {routeProgress && (
            <div style={{ background:'rgba(63,185,80,0.1)', border:'1px solid #3fb950', borderRadius:10, padding:'8px 14px', marginBottom:8, fontSize:12, color:'#3fb950' }}>
              <div className="sr-scanline" style={{ marginBottom:6 }} />
              {routeProgress}
            </div>
          )}
          {routeMsg && (
            <div role="status" style={{ background: /…$/.test(routeMsg) ? 'rgba(88,166,255,0.08)' : 'rgba(248,81,73,0.1)',
              border:`1px solid ${/…$/.test(routeMsg) ? '#58a6ff' : '#f85149'}`, borderRadius:10, padding:'10px 14px', marginBottom:8,
              fontSize:13, color: /…$/.test(routeMsg) ? '#58a6ff' : '#f85149', display:'flex', alignItems:'flex-start', gap:8, lineHeight:1.45 }}>
              <span style={{ flexShrink:0, marginTop:1 }}>
                {/…$/.test(routeMsg) ? <I.clock size={15} color="#58a6ff" /> : <I.alert size={15} color="#f85149" />}
              </span>
              <span>{routeMsg}</span>
            </div>
          )}

          {/* Route results */}
          {routeResults.length > 0 && (
            <div className="card sr-rise">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div className="card-title" style={{ marginBottom:0 }}>
                  <CardIcon bg="#0d2b15" icon="trendUp" />
                  {routeResults.length} Line{routeResults.length!==1?'s':''} · {routeResults.reduce((s,r)=>s+r.trees.length,0)} Trees
                </div>
                <button className="btn-secondary" style={{ padding:'5px 12px', fontSize:12 }} onClick={clearRoutes}>Clear</button>
              </div>

              {routeResults.map((r, ri) => {
                const col = _gradeColor(r.overallGrade);
                const statusIcon = r.goodFlow ? '✓' : r.overallGrade < 0 ? '!' : r.minGrade < 0.5 ? '!' : '↗';
                const statusText = r.overallGrade < 0    ? 'Uphill — no gravity flow'
                  : r.minGrade < 0.5  ? 'Too flat — sap pools. Vacuum needed.'
                  : r.minGrade < 1.0  ? 'Marginal — vacuum assist recommended'
                  : r.overallGrade > 6 ? 'Very steep — check fittings & connections'
                  : 'Good gravity flow';
                return (
                  <div key={r.tank.id} className="sr-rise" style={{ background:'#0f1720', borderRadius:12, padding:'12px 14px', marginBottom:10, border:`1px solid ${col}44`, animationDelay:`${ri*60}ms` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, cursor:'pointer' }}
                      onClick={() => {
                        if (!_lMap) return;
                        const pts = r.lineNodes.map(n => [n.lat, n.lon]);
                        if (pts.length >= 2) _lMap.fitBounds(pts, { padding:[40,40] });
                      }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, flex:1, minWidth:0 }}>
                        <I.tank size={15} color="#58a6ff" />
                        <span style={{ fontWeight:700, fontSize:14, color:'#c9d1d9' }}>{r.tank.label}</span>
                        <span style={{ fontSize:13, color:'#7f92a6', flexShrink:0 }}>· {r.trees.length} tree{r.trees.length!==1?'s':''}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                        <span style={{ fontSize:12, color:'#7f92a6' }}>overall</span>
                        <span style={{ fontWeight:800, color:col, fontSize:18, ..._MONO }}>{r.overallGrade.toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Flow visualization */}
                    <div style={{ overflowX:'auto', paddingBottom:4, marginBottom:10 }}>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:0, minWidth:'max-content' }}>
                        {r.lineNodes.map((node, ni) => {
                          const seg = r.segments[ni];
                          const isTank = node.type === 'tank';
                          const nc = isTank ? '#58a6ff' : '#3fb950';
                          return (
                            <React.Fragment key={node.id}>
                              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'0 2px' }}>
                                <div style={{ width:30, height:30, borderRadius:isTank?6:'50%', background:nc+'22', border:`2px solid ${nc}`, boxShadow:`0 0 8px ${nc}33`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                  {isTank ? <I.tank size={13} color={nc} /> : <I.tree size={13} color={nc} />}
                                </div>
                                <span style={{ fontSize:12, color:'#7f92a6', maxWidth:52, textAlign:'center', lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{node.label}</span>
                                <span style={{ fontSize:12, color:'#7f92a6', ..._MONO }}>{node.elev!=null ? node.elev.toFixed(0)+'ft' : '—'}</span>
                              </div>
                              {seg && (
                                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:'0 0 auto', padding:'0 1px', marginTop:-12 }}>
                                  <span style={{ fontSize:12, fontWeight:700, color:_gradeColor(seg.grade), ..._MONO }}>{seg.grade.toFixed(1)}%</span>
                                  <div style={{ height:3, width:44, background:_gradeColor(seg.grade), borderRadius:2, opacity:0.9, boxShadow:`0 0 6px ${_gradeColor(seg.grade)}55` }} />
                                  <span style={{ fontSize:12, color:'#7f92a6', ..._MONO }}>
                                    {seg.dist < 5280 ? seg.dist.toFixed(0)+'ft' : (seg.dist/5280).toFixed(2)+'mi'}
                                  </span>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4, marginBottom:8 }}>
                      {[
                        { l:'OVERALL', v:r.overallGrade.toFixed(2)+'%', c:col },
                        { l:'WORST SEG', v:r.minGrade.toFixed(2)+'%', c:_gradeColor(r.minGrade) },
                        { l:'TOTAL DROP', v:Math.abs(r.totalDrop).toFixed(1)+' ft', c:'#c9d1d9' },
                        { l:'LINE LEN', v:r.totalDist<5280?r.totalDist.toFixed(0)+' ft':(r.totalDist/5280).toFixed(2)+' mi', c:'#c9d1d9' },
                      ].map(item => (
                        <div key={item.l} style={{ textAlign:'center', background:'#081622', borderRadius:6, padding:'5px 2px' }}>
                          <div style={{ fontSize:12, color:'#7f92a6', fontWeight:600, letterSpacing:'0.04em' }}>{item.l}</div>
                          <div style={{ fontWeight:700, color:item.c, fontSize:12, marginTop:2, ..._MONO }}>{item.v}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize:12, color:col, fontWeight:600, marginBottom:r.badSegs.length?4:0 }}>
                      {statusIcon} {statusText}
                    </div>
                    {r.badSegs.length > 0 && (
                      <div style={{ marginTop:4 }}>
                        {r.badSegs.map((s, bi) => (
                          <div key={bi} style={{ fontSize:13, color:'#e0a44a', display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                            <span style={{ background:'#e0a44a22', borderRadius:4, padding:'1px 5px', fontWeight:700, ..._MONO }}>{s.grade.toFixed(2)}%</span>
                            {s.from.label} → {s.to.label}
                            <span style={{ color:'#7f92a6' }}>({s.dist.toFixed(0)} ft, {Math.abs(s.drop).toFixed(1)} ft drop)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Legend */}
              <div style={{ background:'#081622', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#7f92a6', display:'flex', flexWrap:'wrap', gap:'8px 16px', alignItems:'center' }}>
                <span style={{ color:'#7f92a6', fontWeight:600 }}>Grade key:</span>
                <span><span style={{ color:'#f85149', fontWeight:700 }}>━</span> &lt;0.5% flat</span>
                <span><span style={{ color:'#e0a44a', fontWeight:700 }}>━</span> 0.5–1% marginal</span>
                <span><span style={{ color:'#3fb950', fontWeight:700 }}>━</span> 1–6% ✓ ideal</span>
                <span><span style={{ color:'#e0a44a', fontWeight:700 }}>━</span> &gt;6% steep</span>
              </div>
            </div>
          )}

          {/* ── Materials Estimator ── */}
          {routeResults.length > 0 && (() => {
            const totalTrees2  = routeResults.reduce((s, r) => s + r.trees.length, 0);
            // Drops, spiles and lateral tees are per TAP, not per tree. An 18"
            // tree carries two, a 25" three; sizing off the tree count came up
            // short for every bush with mature timber.
            const totalTaps2   = routeResults.reduce((s, r) =>
              s + r.trees.reduce((a, t) => a + Math.max(1, parseInt(t.taps) || 1), 0), 0);
            const lateralFt    = routeResults.reduce((s, r) => s + r.segments.filter(sg=>!sg.isToTank).reduce((a,sg)=>a+sg.dist,0), 0);
            const mainFt       = routeResults.reduce((s, r) => s + r.segments.filter(sg=>sg.isToTank).reduce((a,sg)=>a+sg.dist,0), 0);
            const dropFt       = totalTaps2 * 3;
            const numSpiles    = totalTaps2;
            const numTees      = totalTaps2;
            const numMainTees  = routeResults.length;
            const latDia       = vacSystem ? '5/16"' : '3/16"';
            const latNote      = vacSystem ? 'vacuum system' : 'gravity — natural siphon effect';
            const mainRec      = totalTaps2 >= 100 ? '1"' : '3/4"';   // sizing follows flow, so taps
            const orderFt = ft => Math.ceil(ft / 100) * 100;
            const latCost    = lateralFt  * matPrices.lateral;
            const mainCost   = mainFt     * matPrices.mainline;
            const dropCost   = dropFt     * matPrices.drop;
            const spileCost  = numSpiles  * matPrices.spile;
            const teeCost    = numTees    * matPrices.tee;
            const mainTeeCost= numMainTees* matPrices.mainTee;
            const total      = latCost + mainCost + dropCost + spileCost + teeCost + mainTeeCost;
            return (
              <div className="card sr-rise" style={{ animationDelay:'120ms' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div className="card-title" style={{ marginBottom:0 }}><CardIcon bg="#0d1a2b" icon="ruler" />Materials Estimator</div>
                  <button onClick={()=>setShowMatPrices(v=>!v)}
                    style={{ background:'none', border:'1px solid #1e2d3d', borderRadius:8, padding:'4px 10px', fontSize:12, color:'#7f92a6', cursor:'pointer' }}>
                    {showMatPrices ? 'Hide' : 'Edit'} Prices
                  </button>
                </div>

                <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                  <div style={{ flex:1 }}>
                    <div className="field-label">Collection System</div>
                    <div style={{ display:'flex', gap:6 }}>
                      {[['Gravity','grav'],['Vacuum','vac']].map(([lbl,key])=>(
                        <button key={key} onClick={()=>setVacSystem(key==='vac')}
                          style={{ flex:1, background:(vacSystem===(key==='vac'))?'#2dd4a7':'#131e2c', border:'1px solid '+(vacSystem===(key==='vac')?'#58a6ff':'#1e2d3d'), borderRadius:8, padding:'7px 4px', fontSize:12, fontWeight:600, color:(vacSystem===(key==='vac'))?'#fff':'#7f92a6', cursor:'pointer' }}>{lbl}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div className="field-label">Main Line Size</div>
                    <div style={{ display:'flex', gap:6 }}>
                      {['3/4"','1"'].map(sz=>(
                        <button key={sz} onClick={()=>setMainSize(sz)}
                          style={{ flex:1, background:mainSize===sz?'#3fb950':'#131e2c', border:'1px solid '+(mainSize===sz?'#3fb950':'#1e2d3d'), borderRadius:8, padding:'7px 4px', fontSize:12, fontWeight:600, color:mainSize===sz?'#07090f':'#7f92a6', cursor:'pointer' }}>{sz}</button>
                      ))}
                    </div>
                    {mainSize !== mainRec && <div style={{ fontSize:12, color:'#e0a44a', marginTop:3, display:'flex', alignItems:'center', gap:5 }}><I.alert size={12} color="#e0a44a" /> Recommend {mainRec} for {totalTaps2} tap{totalTaps2!==1?'s':''}</div>}
                  </div>
                </div>

                {showMatPrices && (
                  <div style={{ background:'#081622', borderRadius:10, padding:'12px', marginBottom:12, border:'1px solid #1e2d3d' }}>
                    <div style={{ fontSize:12, color:'#7f92a6', marginBottom:8 }}>Price per unit (edit to match your supplier)</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      {[
                        ['lateral',  `${latDia} lateral ($/ft)`],
                        ['mainline', `${mainSize} main line ($/ft)`],
                        ['drop',     '3/16" drop tubing ($/ft)'],
                        ['spile',    'Spile / spout (each)'],
                        ['tee',      '3-way tee (each)'],
                        ['mainTee',  'Main line tee (each)'],
                      ].map(([k, label]) => (
                        <div key={k}>
                          <div style={{ fontSize:12, color:'#7f92a6', marginBottom:2 }}>{label}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <span style={{ color:'#3fb950', fontSize:12 }}>$</span>
                            <input aria-label="Main Line Size" type="number" defaultValue={matPrices[k]} step="0.01" min="0"
                              onBlur={e=>updateMatPrice(k, e.target.value)}
                              style={{ flex:1, background:'#0d1520', border:'1px solid #1e2d3d', borderRadius:6, padding:'4px 6px', color:'#c9d1d9', fontSize:12, outline:'none' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {routeResults.map((r) => {
                  const rTaps = r.trees.reduce((a,t)=>a+Math.max(1,parseInt(t.taps)||1),0);
                  const rLat  = r.segments.filter(sg=>!sg.isToTank).reduce((a,sg)=>a+sg.dist,0);
                  const rMain = r.segments.filter(sg=>sg.isToTank).reduce((a,sg)=>a+sg.dist,0);
                  return (
                    <div key={r.tank.id} style={{ background:'#0f1720', borderRadius:10, padding:'10px 12px', marginBottom:6, border:'1px solid #1e2d3d' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:600, fontSize:13 }}>
                          <I.tank size={13} color="#58a6ff" /> {r.tank.label}
                        </div>
                        <span style={{ fontSize:13, color:'#7f92a6' }}>{r.trees.length} tree{r.trees.length!==1?'s':''} · {rTaps} tap{rTaps!==1?'s':''}</span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4, fontSize:13 }}>
                        <div style={{ background:'#081622', borderRadius:6, padding:'5px 6px' }}>
                          <div style={{ color:'#7f92a6' }}>{latDia} lateral</div>
                          <div style={{ fontWeight:700, color:'#58a6ff' }}>{rLat.toFixed(0)} ft</div>
                        </div>
                        <div style={{ background:'#081622', borderRadius:6, padding:'5px 6px' }}>
                          <div style={{ color:'#7f92a6' }}>{mainSize} main</div>
                          <div style={{ fontWeight:700, color:'#3fb950' }}>{rMain.toFixed(0)} ft</div>
                        </div>
                        <div style={{ background:'#081622', borderRadius:6, padding:'5px 6px' }}>
                          <div style={{ color:'#7f92a6' }}>drops + tees</div>
                          <div style={{ fontWeight:700, color:'#e0a44a' }}>{rTaps} × each</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div style={{ background:'#0d2b15', borderRadius:10, padding:'12px 14px', border:'1px solid #1a4a25', marginTop:4 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#3fb950', marginBottom:10 }}><I.package size={14} color="#3fb950" /> Order List</div>
                  {[
                    { item:`${latDia} lateral tubing`, qty:`${lateralFt.toFixed(0)} ft`, order:`${orderFt(lateralFt)} ft`, cost:latCost, color:'#58a6ff' },
                    { item:`${mainSize} main line`,     qty:`${mainFt.toFixed(0)} ft`,    order:`${orderFt(mainFt)} ft`,   cost:mainCost,  color:'#3fb950' },
                    { item:'3/16" drop tubing (3 ft/tap)', qty:`${dropFt} ft`,            order:`${orderFt(dropFt)} ft`,  cost:dropCost,  color:'#c9d1d9' },
                    { item:'Spiles / spouts',           qty:`${numSpiles}`,               order:`${numSpiles}`,            cost:spileCost, color:'#c9d1d9' },
                    { item:'3-way tee connectors',      qty:`${numTees}`,                 order:`${numTees}`,              cost:teeCost,   color:'#c9d1d9' },
                    { item:'Main line tees',            qty:`${numMainTees}`,             order:`${numMainTees}`,          cost:mainTeeCost, color:'#c9d1d9' },
                  ].map((row, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid #1a4a25' }}>
                      <div>
                        <div style={{ fontSize:13, color:row.color, fontWeight:500 }}>{row.item}</div>
                        <div style={{ fontSize:12, color:'#7f92a6' }}>Measured: {row.qty} · Order: {row.order}</div>
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#3fb950', flexShrink:0, marginLeft:8 }}>${row.cost.toFixed(2)}</div>
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
                    <div>
                      <div style={{ fontWeight:700, color:'#3fb950', fontSize:15 }}>Est. Total</div>
                      <div style={{ fontSize:13, color:'#7f92a6' }}>Material cost only · {latNote}</div>
                    </div>
                    <div style={{ fontSize:22, fontWeight:800, color:'#3fb950' }}>${total.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Tank spots */}
          {tankSpots.length > 0 && (
            <div className="card sr-rise">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div className="card-title" style={{ marginBottom:0 }}><CardIcon bg="#1a1500" icon="mapPin" />Tank Spots</div>
                <button className="btn-secondary" style={{ padding:'5px 12px', fontSize:12 }} onClick={clearSpots}>Clear</button>
              </div>
              <div style={{ fontSize:13, color:'#7f92a6', marginBottom:8 }}>Suggested collection points — ranked by gravity-flow score.</div>
              {tankSpots.map((s,i) => (
                <div key={i} className="sr-rise" style={{ background:'#0f1720', borderRadius:10, padding:'10px 14px', marginBottom:6,
                  border: i===0 ? '1px solid rgba(235,154,51,0.55)' : '1px solid #2d2000',
                  boxShadow: i===0 ? '0 0 14px rgba(235,154,51,0.16)' : 'none',
                  animationDelay:`${i*60}ms` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight:600, color:'#e6b800', fontSize:13, display:'flex', alignItems:'center', gap:5 }}>
                        <I.star size={13} color="#e6b800" /> Spot {i+1}
                        {i===0 && <span style={{ background:'rgba(235,154,51,0.16)', border:'1px solid rgba(235,154,51,0.45)', color:'#eb9a33', borderRadius:5, padding:'1px 6px', fontSize:10, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase' }}>Best</span>}
                      </div>
                      <div style={{ fontSize:13, color:'#7f92a6', marginTop:2, ..._MONO }}>
                        {s.lat.toFixed(5)}, {s.lon.toFixed(5)} · {s.treesAbove}/{treePins.filter(p=>p.elev!=null).length} trees ≥1% grade
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                      <div style={{ fontWeight:700, color:'#e0a44a', fontSize:15, ..._MONO }}>{s.elev.toFixed(1)} ft</div>
                      <button onClick={()=>placeSpotAsTank(s)} style={{ background:'#2dd4a7', border:'none', borderRadius:7, padding:'4px 10px', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', whiteSpace:'nowrap' }}>+ Place as Tank</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TREE INVENTORY TAB ───────────────────────────────────────── */}
      {mainTab === 'trees' && (
        <div>
          {treePins.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div style={{display:'flex',justifyContent:'center',marginBottom:12}}>
                  <M.tree size={72} color="#EB9A33" />
                </div>
                <div className="empty-title">{t(lang,'dropFirstPin')}</div>
                Tap the map in Tap Tree mode to add your first tree.
              </div>
            </div>
          ) : (
            <>
              {/* Health summary grid */}
              <div className="card">
                <div className="card-title"><CardIcon bg="#0d2b15" icon="tree" />Health Overview · {treePins.length} Trees · {totalTaps} Taps</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:5, marginBottom:12 }}>
                  {Object.entries(_HEALTH_LABELS).map(([k,l]) => {
                    const cnt = treePins.filter(p => p.health === k).length;
                    return (
                      <div key={k} style={{ background:'#0f1720', borderRadius:8, padding:'8px 4px', textAlign:'center', border:`1px solid ${_HEALTH_COLORS[k]}44` }}>
                        <div style={{ fontSize:16, fontWeight:800, color:_HEALTH_COLORS[k] }}>{cnt}</div>
                        <div style={{ fontSize:12, color:'#7f92a6', marginTop:2 }}>{l}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Species breakdown */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
                  {Object.entries(_SPECIES_LABELS).map(([k,l]) => {
                    const cnt = treePins.filter(p => p.species === k).length;
                    if (cnt === 0) return null;
                    return (
                      <span key={k} style={{ background:_SPECIES_COLORS[k]+'22', border:`1px solid ${_SPECIES_COLORS[k]}55`, borderRadius:6, padding:'3px 8px', fontSize:13, color:_SPECIES_COLORS[k], fontWeight:600 }}>
                        {l} ({cnt})
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Tree list */}
              <div className="card">
                <div className="card-title"><CardIcon bg="#0d2b15" icon="list" />All Trees</div>
                {treePins.map(p => {
                  const sColor = _SPECIES_COLORS[p.species] || '#7f92a6';
                  const hColor = _HEALTH_COLORS[p.health] || '#7f92a6';
                  const mlColor = p.mainline ? _mlColor(p.mainline) : null;
                  return (
                    <div key={p.id} role="button" tabIndex={0}
                      aria-label={`${p.label} — open details`}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPinId(p.id); setShowPinPanel(true); zoomToPin(p); } }}
                      style={{ background:'#0f1720', borderRadius:10, padding:'10px 12px', marginBottom:5, border:'1px solid #1e2d3d', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}
                      onClick={() => { setSelectedPinId(p.id); setShowPinPanel(true); zoomToPin(p); }}>
                      {/* Species circle with health ring */}
                      <div style={{ position:'relative', flexShrink:0 }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:sColor+'33', border:`3px solid ${hColor}`, display:'flex', alignItems:'center', justifyContent:'center' }}><I.mapleLeaf size={17} color={sColor} /></div>
                        {mlColor && (
                          <div style={{ position:'absolute', bottom:-3, right:-3, width:14, height:14, borderRadius:'50%', background:mlColor, border:'1.5px solid #0a1420', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#fff' }}>
                            {p.mainline}
                          </div>
                        )}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:'#c9d1d9', display:'flex', alignItems:'center', gap:6 }}>
                          {p.label}
                          <span style={{ fontSize:12, color:sColor, background:sColor+'22', borderRadius:4, padding:'1px 5px' }}>{_SPECIES_LABELS[p.species]||'Unknown'}</span>
                        </div>
                        <div style={{ fontSize:13, color:'#7f92a6', marginTop:2, display:'flex', gap:8, flexWrap:'wrap' }}>
                          {p.dbh && <span>DBH: {p.dbh}"</span>}
                          {p.taps && <span>Taps: {p.taps}</span>}
                          {p.elev != null && <span style={{ color:'#e0a44a' }}>↑ {p.elev.toFixed(0)} ft</span>}
                          <span style={{ color:hColor }}>{_HEALTH_LABELS[p.health]||'?'}</span>
                        </div>
                      </div>
                      <div style={{ color:'#7f92a6', fontSize:12 }}>›</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MAINLINES TAB ────────────────────────────────────────────── */}
      {mainTab === 'mainlines' && (
        <div>
          {mainlines.map(ml => {
            const mlTrees = treePins.filter(p => p.mainline === ml.id);
            const mlTaps  = mlTrees.reduce((s, p) => s + (parseInt(p.taps) || 0), 0);
            return (
              <div key={ml.id} className="card" style={{ borderLeft:`3px solid ${ml.color}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:mlTrees.length?10:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:ml.color+'33', border:`2px solid ${ml.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:ml.color, fontSize:13, flexShrink:0 }}>{ml.id}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <input value={ml.label} aria-label={`Name of mainline ${ml.id}`}
                        onChange={e => renameMainline(ml.id, e.target.value)}
                        style={{ width:'100%', background:'transparent', border:'none', borderBottom:'1px solid transparent', color:'#c9d1d9', fontWeight:700, fontSize:13, padding:'2px 0', outline:'none', boxSizing:'border-box' }}
                        onFocus={e => e.target.style.borderBottomColor = ml.color}
                        onBlur={e => { e.target.style.borderBottomColor = 'transparent'; if (!e.target.value.trim()) renameMainline(ml.id, 'Mainline ' + ml.id); }} />
                      <div style={{ fontSize:13, color:'#7f92a6' }}>{mlTrees.length} tree{mlTrees.length!==1?'s':''} · {mlTaps} tap{mlTaps!==1?'s':''}</div>
                    </div>
                  </div>
                  <button onClick={() => deleteMainline(ml.id)} aria-label={`Delete mainline ${ml.id}`} title="Delete this mainline"
                    style={{ background:'transparent', border:'1px solid #2d3d50', borderRadius:8, color:'#7f92a6', cursor:'pointer', padding:'7px 9px', flexShrink:0, minHeight:34 }}>
                    <I.trash size={14} color="#7f92a6" />
                  </button>
                </div>
                {mlTrees.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {mlTrees.map(p => (
                      <button key={p.id} onClick={() => { setSelectedPinId(p.id); setShowPinPanel(true); zoomToPin(p); }}
                        style={{ background:ml.color+'22', border:`1px solid ${ml.color}55`, borderRadius:6, padding:'3px 9px', fontSize:13, color:ml.color, cursor:'pointer', fontWeight:600 }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <button onClick={addMainline} disabled={!nextMainlineId()}
            style={{ width:'100%', background:'transparent', border:'1px dashed #2d3d50', borderRadius:12,
              padding:'13px 16px', color: nextMainlineId() ? '#7f92a6' : '#7f92a6', fontWeight:600, fontSize:13,
              cursor: nextMainlineId() ? 'pointer' : 'default', marginBottom:8 }}>
            {nextMainlineId() ? '+ Add a mainline' : 'All 26 mainlines in use'}
          </button>

          {/* Unassigned */}
          {(() => {
            const unassigned = treePins.filter(p => !p.mainline);
            if (!unassigned.length) return null;
            return (
              <div className="card">
                <div className="card-title" style={{ color:'#7f92a6' }}><CardIcon bg="#1e2d3d" icon="mapPin" />Unassigned ({unassigned.length})</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {unassigned.map(p => (
                    <button key={p.id} onClick={() => { setSelectedPinId(p.id); setShowPinPanel(true); zoomToPin(p); }}
                      style={{ background:'#1e2d3d', border:'1px solid #2d3d50', borderRadius:6, padding:'3px 9px', fontSize:13, color:'#7f92a6', cursor:'pointer' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── PROPERTY TAB ─────────────────────────────────────────────── */}
      {mainTab === 'property' && (
        <div className="card">
          <div className="card-title"><CardIcon bg="#1a1020" icon="mapPin" />Property Lines</div>
          <div style={{ fontSize:12, color:'#7f92a6', marginBottom:12, lineHeight:1.6 }}>
            Import your property boundary from a GPS app or GIS export. Supported formats: KML (Google Earth), GPX, GeoJSON.
          </div>
          <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'linear-gradient(135deg,#8b5cf6,#6d28d9)', border:'none', borderRadius:10, padding:'13px', fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer' }}>
            <I.folder size={17} color="#fff" /> Import Property File
            <input type="file" accept=".kml,.gpx,.geojson,.json" style={{ display:'none' }}
              onChange={e => { const f = e.target.files[0]; if (f) _sbImportPropertyFile(f, r => { setPropMsg(r); setHasProperty(!!ls.get(PROPERTY_KEY, null)); }); e.target.value=''; }} />
          </label>
          {propMsg && (
            <div role="status" style={{ marginTop:10, fontSize:12.5, lineHeight:1.5, color: propMsg.ok ? '#3fb950' : '#f85149' }}>{propMsg.text}</div>
          )}
          {hasProperty && (
            <button onClick={() => {
                if (!window.confirm('Remove the imported property boundary from this device?')) return;
                _sbClearProperty(); setHasProperty(false); setPropMsg(null);
              }}
              style={{ width:'100%', marginTop:8, background:'#1a0f0f', border:'1px solid #3d1515', borderRadius:10, padding:'12px', fontSize:13, fontWeight:600, color:'#f85149', cursor:'pointer', minHeight:44 }}>
              ✕ Clear Property Lines
            </button>
          )}
          <div style={{ marginTop:12, fontSize:13, color:'#7f92a6', lineHeight:1.6 }}>
            Tip: In Google Earth, right-click your polygon → Save place as → KML.
            In onX Hunt or CalTopo, export as GeoJSON.
          </div>
        </div>
      )}

      {/* ── PIN DETAIL SLIDE-UP PANEL ────────────────────────────────── */}
      {showPinPanel && selectedPin && (
        <div className="sheet" style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:9999, maxWidth:'none', maxHeight:'72vh' }}>
          {/* Handle */}
          <div className="sheet-handle" />

          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ display:'inline-flex', alignItems:'center' }}>
                {React.createElement((_PIN_TYPE_CFG.find(c=>c.id===selectedPin.type)||{}).Icon || I.mapPin,
                  { size:20, color:(_PIN_TYPE_CFG.find(c=>c.id===selectedPin.type)||{}).bg || '#ef4444' })}
              </span>
              <div>
                <div style={{ fontWeight:800, fontSize:16, color:'#c9d1d9' }}>{selectedPin.label}</div>
                <div style={{ fontSize:13, color:'#7f92a6', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <span style={_MONO}>{selectedPin.lat.toFixed(5)}, {selectedPin.lon.toFixed(5)}</span>
                  {selectedPin.accuracy != null && (
                    <span style={{
                      fontWeight:700, fontSize:12, borderRadius:4, padding:'1px 5px', ..._MONO,
                      background: selectedPin.accuracy <= 5 ? 'rgba(45,212,167,0.15)' : selectedPin.accuracy <= 15 ? 'rgba(244,164,74,0.15)' : 'rgba(248,113,113,0.15)',
                      color:       selectedPin.accuracy <= 5 ? '#2dd4a7'              : selectedPin.accuracy <= 15 ? '#e0a44a'              : '#f85149',
                    }}>± {selectedPin.accuracy} m</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => setShowPinPanel(false)} style={{ background:'#1e2d3d', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', color:'#7f92a6', cursor:'pointer', fontSize:16 }}>✕</button>
          </div>

          {/* Tree-specific fields */}
          {selectedPin.type === 'tree' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
              {/* Species */}
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#7f92a6', marginBottom:4 }}>SPECIES</div>
                <select aria-label="Tree species" value={selectedPin.species||'sugar_maple'} onChange={e => updatePinField(selectedPin.id, 'species', e.target.value)}
                  style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'none', borderRadius:8, padding:'8px 10px', color:'#c9d1d9', fontSize:12, outline:'none' }}>
                  {Object.entries(_SPECIES_LABELS).map(([k,l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>

              {/* Health */}
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#7f92a6', marginBottom:4, letterSpacing:'0.06em' }}>HEALTH</div>
                <select aria-label="Tree health" value={selectedPin.health||'good'} onChange={e => updatePinField(selectedPin.id, 'health', e.target.value)}
                  style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'none', borderRadius:8, padding:'8px 10px', color:'#c9d1d9', fontSize:12, outline:'none' }}>
                  {Object.entries(_HEALTH_LABELS).map(([k,l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>

              {/* DBH */}
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#7f92a6', marginBottom:4 }}>DBH (inches)</div>
                <input type="number" min="1" max="60" step="0.5"
                  value={selectedPin.dbh||''} placeholder="e.g. 14"
                  onChange={e => updatePinField(selectedPin.id, 'dbh', e.target.value)}
                  style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'none', borderRadius:8, padding:'8px 10px', color:'#c9d1d9', fontSize:12, outline:'none', boxSizing:'border-box' }} />
              </div>

              {/* Taps */}
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#7f92a6', marginBottom:4, letterSpacing:'0.06em' }}>TAP COUNT</div>
                <input type="number" min="0" max="4" step="1"
                  value={selectedPin.taps||''} placeholder="0–4"
                  onChange={e => updatePinField(selectedPin.id, 'taps', e.target.value)}
                  style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'none', borderRadius:8, padding:'8px 10px', color:'#c9d1d9', fontSize:12, outline:'none', boxSizing:'border-box' }} />
              </div>

              {/* Mainline */}
              <div style={{ gridColumn:'1/-1' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#7f92a6', marginBottom:4 }}>MAINLINE ASSIGNMENT</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {[{id:'',label:'None'},...mainlines].map(ml => {
                    const on  = (selectedPin.mainline||'') === ml.id;
                    const col = ml.id ? _mlColor(ml.id) : '#58a6ff';
                    return (
                      <button key={ml.id} onClick={() => updatePinField(selectedPin.id, 'mainline', ml.id)}
                        title={ml.label} aria-label={ml.label} aria-pressed={on}
                        style={{ flex:'1 1 52px', minWidth:52, minHeight:38,
                          background: on ? col+'33' : 'transparent',
                          border:`1px solid ${on ? col : '#1e2d3d'}`,
                          borderRadius:8, padding:'7px 4px', fontSize:13, fontWeight:700,
                          color: on ? col : '#7f92a6', cursor:'pointer' }}>
                        {ml.id || '—'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Collection point assignment (Pass 5) — tank/pump pins only, and only
              once collection points exist in the Log. Powers the yield-heat view. */}
          {(selectedPin.type === 'tank' || selectedPin.type === 'pump') && (() => {
            const cps = ls.get('sg_cpoints', []);
            if (!cps.length) return null;
            return (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#7f92a6', marginBottom:4, letterSpacing:'0.06em', textTransform:'uppercase' }}>{t(lang,'pinCpoint')}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {[{ id:'', name:t(lang,'pinCpointNone'), color:'#7f92a6' }, ...cps].map(pt => {
                    const on = (selectedPin.cpoint || '') === pt.id;
                    return (
                      <button key={pt.id || 'none'} onClick={() => updatePinField(selectedPin.id, 'cpoint', pt.id || null)}
                        aria-pressed={on}
                        style={{ flex:'1 1 90px', minWidth:72, minHeight:38,
                          background: on ? pt.color + '26' : 'transparent',
                          border:`1px solid ${on ? pt.color : '#1e2d3d'}`,
                          borderRadius:8, padding:'7px 8px', fontSize:12.5, fontWeight:700,
                          color: on ? pt.color : '#7f92a6', cursor:'pointer' }}>
                        {pt.name}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize:12, color:'#7f92a6', marginTop:5, lineHeight:1.4 }}>{t(lang,'pinCpointSub')}</div>
              </div>
            );
          })()}

          {/* Label (rename) */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#7f92a6', marginBottom:4, letterSpacing:'0.06em' }}>LABEL</div>
            <input value={selectedPin.label} onChange={e => updatePinField(selectedPin.id, 'label', e.target.value)}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'none', borderRadius:8, padding:'9px 12px', color:'#e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box', fontWeight:600 }} />
          </div>

          {/* Notes */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#7f92a6', marginBottom:4, letterSpacing:'0.06em' }}>NOTES</div>
            <textarea value={selectedPin.notes||''} onChange={e => updatePinField(selectedPin.id, 'notes', e.target.value)}
              placeholder="Add notes…" rows={2}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'none', borderRadius:8, padding:'9px 12px', color:'#c9d1d9', fontSize:12, outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }} />
          </div>

          {/* Elevation — fetched when there is signal, typed when there isn't.
              Route grades are useless without it, and the bush is exactly where
              the phone has no bars. */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
              <label htmlFor="sr-pin-elev" style={{ fontSize:12, fontWeight:700, color:'#7f92a6', letterSpacing:'0.06em' }}>ELEVATION (FT)</label>
              <span style={{ fontSize:12, color: selectedPin.elev != null ? '#7f92a6' : '#e0a44a' }}>
                {selectedPin.elev != null
                  ? (selectedPin.elevManual ? 'you entered this' : 'from terrain data')
                  : 'needed for route grades'}
              </span>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <input id="sr-pin-elev" type="text" inputMode="decimal"
                value={elevDraft}
                placeholder={selectedPin.elev != null ? '' : 'e.g. 940'}
                onChange={e => setElevDraft(e.target.value)}
                onBlur={() => {
                  const t = elevDraft.trim();
                  if (t === '') { if (selectedPin.elev != null) { updatePinField(selectedPin.id, 'elev', null); updatePinField(selectedPin.id, 'elevManual', false); } return; }
                  const n = srParseNum(t);
                  if (n == null) { setElevDraft(selectedPin.elev != null ? String(selectedPin.elev) : ''); return; }
                  const clamped = Math.max(-1400, Math.min(30000, n));
                  setElevDraft(String(clamped));
                  updatePinField(selectedPin.id, 'elev', clamped);
                  updatePinField(selectedPin.id, 'elevManual', true);
                }}
                style={{ flex:1, minHeight:40, background:'rgba(255,255,255,0.06)', border:'none', borderRadius:8, padding:'9px 12px', color:'#fbbf24', fontSize:13, fontWeight:700, outline:'none', boxSizing:'border-box', ..._MONO }} />
              <button onClick={async () => {
                  setElevDraft('…');
                  const v = await _fetchElev(selectedPin.lat, selectedPin.lon);
                  if (v == null) { setElevDraft(selectedPin.elev != null ? String(selectedPin.elev) : ''); setRouteMsg('No elevation from the network. Type it in instead — a topo map or a handheld GPS will give you the number.'); return; }
                  const r = Math.round(v * 10) / 10;
                  setElevDraft(String(r));
                  updatePinField(selectedPin.id, 'elev', r);
                  updatePinField(selectedPin.id, 'elevManual', false);
                }}
                title="Look up elevation for this pin (needs a connection)"
                style={{ background:'transparent', border:'1px solid #2d3d50', borderRadius:8, color:'#7f92a6', fontSize:12, fontWeight:600, padding:'0 12px', minHeight:40, cursor:'pointer', whiteSpace:'nowrap' }}>
                Look up
              </button>
            </div>
          </div>

          {/* Delete */}
          <button onClick={() => {
              if (!window.confirm(`Delete "${selectedPin.label || 'this pin'}"?`)) return;
              removePin(selectedPin.id); setShowPinPanel(false); setSelectedPinId(null);
            }}
            style={{ width:'100%', background:'rgba(248,81,73,0.1)', border:'1px solid rgba(248,81,73,0.2)', borderRadius:10, padding:'11px', fontSize:13, fontWeight:700, color:'#f85149', cursor:'pointer' }}>
            Delete Pin
          </button>
        </div>
      )}
    </div>
  );
}


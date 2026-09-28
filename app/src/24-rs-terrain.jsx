// ── LiDAR terrain: USGS 3DEP elevation, slope, aspect, hillshade; NHD water; trails ──
// Pure request building and unit maths (formula band, tested). The screen parts are in
// 50-rs-bush. Sources (DESIGN.md "LIDAR TERRAIN LAYERS" has what was checked and how):
//   3DEP ImageServer: exportImage (tiles), getSamples (tap to read, line profiles).
//     Web Mercator 102100/3857, one F32 band of elevation in metres, raster functions allowed.
//   Esri raster functions in renderingRule: Stretch, Colormap, Remap, Slope (SlopeType 2 =
//     percent rise), Aspect; and the service's published templates by name.
//   USGSHydroCached: transparent NHD overlay tiles. Transportation MapServer layer 37: Trails.
const SR_3DEP = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer';
const SR_TRAILS_SVC = 'https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer';
const SR_HYDRO_TILE = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSHydroCached/MapServer/tile/{z}/{y}/{x}';
const SR_M_FT = 3.28084;
const SR_MERC = 20037508.342789244;

const srMToFt = m => m * SR_M_FT;
const srFtToM = f => f / SR_M_FT;
// Slope: degrees to percent rise (100 x tan), and back.
const srDegToPct = d => Math.tan(d * Math.PI / 180) * 100;
const srPctToDeg = p => Math.atan(p / 100) * 180 / Math.PI;
// Elevation in the display unit: feet, or metres in litre (metric) mode.
const srElevU = (m, units) => units === 'L' ? m : srMToFt(m);
const srElevUnit = units => units === 'L' ? 'm' : 'ft';

// A slippy tile's bounding box in Web Mercator metres: [xmin, ymin, xmax, ymax].
function srTileBBox3857(z, x, y) {
  const s = 2 * SR_MERC / Math.pow(2, z), xmin = -SR_MERC + x * s, ymax = SR_MERC - y * s;
  return [xmin, ymax - s, xmin + s, ymax];
}

// Colours are data colours (not UI chrome), so they live here with their legends.
// Elevation: low blue-green through green and gold to rust at the high ground.
const SR_ELEV_RAMP = [[43, 92, 138], [63, 143, 107], [168, 194, 106], [232, 195, 90], [217, 119, 46], [140, 59, 31]];
// Slope %: the board's classes. Flat ground drains poorly on gravity; 30 % and up is steep.
const SR_SLOPE_CLASSES = [
  { lo: 0, hi: 5, c: [154, 154, 143] }, { lo: 5, hi: 10, c: [79, 154, 85] }, { lo: 10, hi: 15, c: [181, 201, 79] },
  { lo: 15, hi: 30, c: [224, 123, 57] }, { lo: 30, hi: null, c: [196, 59, 47] }];
// Aspect: flat, then the eight directions the ground faces (Aspect gives -1 for flat).
const SR_ASPECT_CLASSES = [
  { k: 'flat', c: [154, 154, 143] }, { k: 'N', c: [60, 110, 190] }, { k: 'NE', c: [70, 170, 190] }, { k: 'E', c: [90, 170, 90] },
  { k: 'SE', c: [200, 200, 70] }, { k: 'S', c: [230, 150, 50] }, { k: 'SW', c: [220, 90, 60] }, { k: 'W', c: [190, 80, 150] }, { k: 'NW', c: [120, 90, 190] }];

// Rendering rules (renderingRule JSON for exportImage).
// Elevation: a min-max stretch of HIS bush's range to 0..255, then the ramp.
function srElevRule(range) {
  const lo = range.min, hi = Math.max(range.max, range.min + 1);
  const ramps = SR_ELEV_RAMP.slice(1).map((c, i) => ({ type: 'algorithmic', fromColor: [...SR_ELEV_RAMP[i], 255], toColor: [...c, 255], algorithm: 'esriCIELabAlgorithm' }));
  return { rasterFunction: 'Colormap', rasterFunctionArguments: {
    Colorramp: { type: 'multipart', colorRamps: ramps },
    Raster: { rasterFunction: 'Stretch', outputPixelType: 'U8', rasterFunctionArguments: {
      StretchType: 5, Statistics: [[lo, hi, (lo + hi) / 2, (hi - lo) / 4]], Min: 0, Max: 255, UseGamma: false } } } };
}
// Slope in percent rise. Web Mercator stretches ground distance by 1/cos(latitude), which
// would read every slope too shallow, so the heights are scaled by the same factor.
function srSlopeZ(lat) { return 1 / Math.cos((srFin(lat) ? lat : 45) * Math.PI / 180); }
function srSlopeRule(lat) {
  const ranges = [], out = [];
  SR_SLOPE_CLASSES.forEach((k, i) => { ranges.push(k.lo, k.hi == null ? 100000 : k.hi); out.push(i + 1); });
  return { rasterFunction: 'Colormap', rasterFunctionArguments: {
    Colormap: SR_SLOPE_CLASSES.map((k, i) => [i + 1, ...k.c]),
    Raster: { rasterFunction: 'Remap', rasterFunctionArguments: { InputRanges: ranges, OutputValues: out, AllowUnmatched: false,
      Raster: { rasterFunction: 'Slope', rasterFunctionArguments: { SlopeType: 2, ZFactor: +srSlopeZ(lat).toFixed(4) } } } } } };
}
// Aspect in compass sectors: north wraps 337.5 to 22.5.
function srAspectRule() {
  const ranges = [-2, 0], out = [1];   // class 1 flat
  ranges.push(0, 22.5); out.push(2);
  for (let i = 1; i < 8; i++) { ranges.push(22.5 + (i - 1) * 45, 22.5 + i * 45); out.push(i + 2); }
  ranges.push(337.5, 360.5); out.push(2);
  return { rasterFunction: 'Colormap', rasterFunctionArguments: {
    Colormap: SR_ASPECT_CLASSES.map((k, i) => [i + 1, ...k.c]),
    Raster: { rasterFunction: 'Remap', rasterFunctionArguments: { InputRanges: ranges, OutputValues: out, AllowUnmatched: false,
      Raster: { rasterFunction: 'Aspect', rasterFunctionArguments: {} } } } } };
}
// The service's own published functions (names read from its rasterFunctionInfos): the
// hillshade, and the fallbacks when a custom chain is refused.
const SR_3DEP_PUBLISHED = { hillshade: 'Hillshade Gray', elev: 'Hillshade Elevation Tinted', slope: 'Slope Map', aspect: 'Aspect Map' };
function srTerrainRule(kind, o) {
  const opt = o || {};
  if (kind === 'hillshade' || opt.fallback) return { rasterFunction: SR_3DEP_PUBLISHED[kind] };
  if (kind === 'elev') return srElevRule(opt.range || { min: 0, max: 100 });
  if (kind === 'slope') return srSlopeRule(opt.lat);
  if (kind === 'aspect') return srAspectRule();
  return null;
}
// One 256 px tile from exportImage. Deterministic, so the tile cache can hold it.
function srTerrainTileUrl(kind, z, x, y, o) {
  const b = srTileBBox3857(z, x, y).map(v => +v.toFixed(3));
  const q = ['bbox=' + b.join(','), 'bboxSR=3857', 'imageSR=3857', 'size=256,256', 'format=png', 'transparent=true',
    'interpolation=RSP_BilinearInterpolation', 'renderingRule=' + encodeURIComponent(JSON.stringify(srTerrainRule(kind, o))), 'f=image'];
  return SR_3DEP + '/exportImage?' + q.join('&');
}
// Trails, drawn by the transportation MapServer for one tile.
function srTrailsTileUrl(z, x, y) {
  const b = srTileBBox3857(z, x, y).map(v => +v.toFixed(3));
  return SR_TRAILS_SVC + '/export?' + ['bbox=' + b.join(','), 'bboxSR=3857', 'imageSR=3857', 'size=256,256', 'layers=show:37',
    'format=png32', 'transparent=true', 'dpi=96', 'f=image'].join('&');
}
function srHydroTileUrl(z, x, y) { return SR_HYDRO_TILE.replace('{z}', z).replace('{y}', y).replace('{x}', x); }

// getSamples for points [[lat, lon]] (WGS84). Answers carry locationId, the point's index.
function srSamplesUrl(pts) {
  const g = { points: (pts || []).map(p => [+(+p[1]).toFixed(7), +(+p[0]).toFixed(7)]), spatialReference: { wkid: 4326 } };
  return SR_3DEP + '/getSamples?' + ['geometry=' + encodeURIComponent(JSON.stringify(g)), 'geometryType=esriGeometryMultipoint',
    'returnFirstValueOnly=true', 'interpolation=RSP_BilinearInterpolation', 'f=json'].join('&');
}
// Metres per point, in input order; null where the service had no value (NoData, out of coverage).
function srParseSamples(json, n) {
  const out = Array.from({ length: n }, () => null);
  const s = json && Array.isArray(json.samples) ? json.samples : null;
  if (!s) return null;
  s.forEach((x, k) => {
    const i = srFin(+x.locationId) ? +x.locationId : k, v = parseFloat(x.value);
    if (i >= 0 && i < n && srFin(v) && v > -1000 && v < 9000) out[i] = v;
  });
  return out;
}
// A grid of n x n points over a bounds { north, south, east, west }, for the bush's range.
function srGridPoints(b, n) {
  const k = Math.max(2, n || 5), out = [];
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++)
    out.push([b.south + (b.north - b.south) * i / (k - 1), b.west + (b.east - b.west) * j / (k - 1)]);
  return out;
}
// The heat map's range from sampled heights: the low and high, padded 5 % so the ends are
// not lost to one pixel, rounded to the half metre. null with fewer than two heights.
function srElevRange(ms) {
  const v = (ms || []).filter(srFin);
  if (v.length < 2) return null;
  let lo = Math.min(...v), hi = Math.max(...v);
  if (hi - lo < 2) { const mid = (hi + lo) / 2; lo = mid - 1; hi = mid + 1; }
  const pad = (hi - lo) * 0.05;
  return { min: Math.floor((lo - pad) * 2) / 2, max: Math.ceil((hi + pad) * 2) / 2 };
}
// Legend ticks in the display unit: the low, the high and up to three round numbers between.
function srElevTicks(range, units) {
  const a = srElevU(range.min, units), b = srElevU(range.max, units), span = b - a;
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find(s => span / s <= 4) || 1000;
  const ticks = [];
  for (let v = Math.ceil(a / step) * step; v < b; v += step) if (v - a > span * .12 && b - v > span * .12) ticks.push(v);
  return [{ v: a, at: 0 }, ...ticks.map(v => ({ v, at: (v - a) / span })), { v: b, at: 1 }].map(t => ({ ...t, v: Math.round(t.v) }));
}
// The compass word for an aspect in degrees (-1 or NaN is flat).
function srAspectWord(deg) {
  if (!srFin(deg) || deg < 0) return 'flat';
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((deg % 360) / 45) % 8];
}
// Points along a path, evenly by distance, for a line profile: n points including both ends.
function srAlongPath(pts, n) {
  const P = (pts || []).filter(p => p && srFin(p[0]) && srFin(p[1]));
  if (P.length < 2) return P.slice();
  const d = [0]; for (let i = 1; i < P.length; i++) d.push(d[i - 1] + srDistM(P[i - 1], P[i]));
  const tot = d[d.length - 1], k = Math.max(2, n || 16), out = [];
  for (let j = 0; j < k; j++) {
    const t = tot * j / (k - 1); let i = 1; while (i < P.length - 1 && d[i] < t) i++;
    const f = d[i] > d[i - 1] ? (t - d[i - 1]) / (d[i] - d[i - 1]) : 0;
    out.push([P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f, t]);
  }
  return out;
}
// A mainline's fall from its profile: heights (m) at points evenly along the path.
// high end, low end, fall, average grade %, the deepest low spot inside the line that sits
// under BOTH ends by at least minDip metres (sap pools there), and the highest rise that sits
// over BOTH ends by as much (on gravity sap cannot cross it; vacuum has to lift it).
// Distances in metres, measured from the high end.
function srLineProfile(along, ms, minDip) {
  const n = Math.min((along || []).length, (ms || []).length);
  const ok = []; for (let i = 0; i < n; i++) if (srFin(ms[i])) ok.push({ i, m: ms[i], at: along[i][2] });
  if (ok.length < 2 || !srFin(ok[0].at)) return null;
  const a = ok[0], z = ok[ok.length - 1], len = z.at - a.at;
  const hiEnd = a.m >= z.m ? a : z, loEnd = a.m >= z.m ? z : a;
  const fall = hiEnd.m - loEnd.m;
  let dip = null; const lim = srFin(minDip) ? minDip : 1;
  let rise = null;
  ok.slice(1, -1).forEach(p => {
    const depth = Math.min(a.m, z.m) - p.m; if (depth >= lim && (!dip || depth > dip.depth)) dip = { depth, at: Math.abs(p.at - hiEnd.at), m: p.m };
    const up = p.m - Math.max(a.m, z.m); if (up >= lim && (!rise || up > rise.height)) rise = { height: up, at: Math.abs(p.at - hiEnd.at), m: p.m };
  });
  return { hiM: hiEnd.m, loM: loEnd.m, fallM: fall, lenM: len, gradePct: len > 0 ? fall / len * 100 : 0, highIsStart: hiEnd === a, dip, rise, n: ok.length };
}

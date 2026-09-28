// ─── Bush terrain layers: LiDAR elevation, slope, aspect, hillshade, water, trails ───
// Request building and unit maths are in 24-rs-terrain (tested). This part draws the
// layers, the legend, the layers sheet, the tap reading and a line's fall. Nothing
// sampled is stored; layer choices live in sg_bush_terrain (a preference).

// LiDAR terrain choices. overlay is one coloured layer at a time (its legend is the one
// shown); range is the elevation heat map's stretch, kept so saved tiles keep matching.
const SR_BUSH_TERRAIN = { overlay: null, opacity: 0.65, hillshade: false, water: false, trails: false, range: null };
const SR_TERRAIN_KINDS = ['elev', 'slope', 'aspect'];

// A Leaflet tile layer whose tile URL comes from a function of z/x/y.
function srFnTiles(L, urlFn, opt) {
  const C = L.TileLayer.extend({ getTileUrl: function (c) { return urlFn(c.z, c.x, c.y); } });
  return new C('', opt);
}
// Add or remove the terrain, water and trail layers to match T. o: { fb, lat, onHealth }.
function srApplyTerrain(L, map, T, o) {
  const opt = o || {};
  if (!map._rsT) {
    [['rs-lidar', 300], ['rs-hill', 310], ['rs-water', 320], ['rs-trails', 330]].forEach(([n, z]) => {
      if (!map.getPane(n)) { const p = map.createPane(n); p.style.zIndex = z; p.style.pointerEvents = 'none'; }
    });
    map._rsT = {};
  }
  const want = {};
  // The elevation heat map waits for its range (sampled from his bush) unless it fell back.
  if (T.overlay && !(T.overlay === 'elev' && !T.range && !opt.fb)) {
    const ro = { range: T.range, lat: opt.lat, fallback: !!opt.fb };
    want.ov = { key: [T.overlay, opt.fb ? 'fb' : '', T.range ? T.range.min + ',' + T.range.max : '', srFin(opt.lat) ? opt.lat.toFixed(2) : ''].join('|'),
      make: () => srFnTiles(L, (z, x, y) => srTerrainTileUrl(T.overlay, z, x, y, ro), { pane: 'rs-lidar', opacity: T.opacity, maxNativeZoom: 17, maxZoom: 20, attribution: '&copy; USGS 3DEP', kind: T.overlay }) };
  }
  if (T.hillshade) want.hill = { key: 'hill', make: () => srFnTiles(L, (z, x, y) => srTerrainTileUrl('hillshade', z, x, y), { pane: 'rs-hill', opacity: .6, maxNativeZoom: 17, maxZoom: 20, attribution: '&copy; USGS 3DEP', kind: 'hillshade' }) };
  if (T.water) want.water = { key: 'water', make: () => srFnTiles(L, srHydroTileUrl, { pane: 'rs-water', maxNativeZoom: 16, maxZoom: 20, attribution: '&copy; USGS NHD', kind: 'water' }) };
  if (T.trails) want.trails = { key: 'trails', make: () => srFnTiles(L, srTrailsTileUrl, { pane: 'rs-trails', maxNativeZoom: 17, maxZoom: 20, attribution: '&copy; USGS Trails', kind: 'trails' }) };
  ['ov', 'hill', 'water', 'trails'].forEach(k => {
    const cur = map._rsT[k], w = want[k];
    if (cur && (!w || cur.key !== w.key)) { map.removeLayer(cur.layer); delete map._rsT[k]; }
    if (w && !map._rsT[k]) {
      const layer = w.make(), h = { ok: 0, err: 0 };
      layer.on('tileload', () => { h.ok++; if (opt.onHealth) opt.onHealth(layer.options.kind, h); });
      layer.on('tileerror', () => { h.err++; if (opt.onHealth) opt.onHealth(layer.options.kind, h); });
      layer.addTo(map); map._rsT[k] = { key: w.key, layer };
    }
  });
  if (map._rsT.ov) map._rsT.ov.layer.setOpacity(T.opacity);
}

// Is the device online (navigator.onLine, kept current).
function useSrOnline() {
  const [on, setOn] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false);
    window.addEventListener('online', a); window.addEventListener('offline', b);
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b); };
  }, []);
  return on;
}

// Heights (m) for points [[lat, lon]] from 3DEP getSamples, remembered for this visit only.
const _srElevCache = new Map();
function srFetchElev(pts) {
  const key = JSON.stringify(pts.map(p => [+(+p[0]).toFixed(6), +(+p[1]).toFixed(6)]));
  if (_srElevCache.has(key)) return _srElevCache.get(key);
  const pr = fetch(srSamplesUrl(pts)).then(r => { if (!r.ok) throw new Error('http'); return r.json(); })
    .then(j => { const v = srParseSamples(j, pts.length); if (!v) throw new Error('answer'); return v; });
  pr.catch(() => _srElevCache.delete(key));
  _srElevCache.set(key, pr);
  return pr;
}
// { st: 'idle'|'loading'|'ok'|'err', v: [m|null] } for points; null points = idle.
function useSrElev(pts) {
  const key = pts && pts.length ? JSON.stringify(pts.map(p => [+(+p[0]).toFixed(6), +(+p[1]).toFixed(6)])) : null;
  const [s, setS] = useState({ st: 'idle', v: null });
  useEffect(() => {
    if (!key) { setS({ st: 'idle', v: null }); return; }
    let live = true; setS({ st: 'loading', v: null });
    srFetchElev(pts).then(v => { if (live) setS({ st: 'ok', v }); }, () => { if (live) setS({ st: 'err', v: null }); });
    return () => { live = false; };
  }, [key]);
  return s;
}
// A height for people: "342 ft", or "104 m" in metric.
function srElevText(m, units, L) { return srFin(m) ? `${fmt(srElevU(m, units), 0)} ${srUnitL(srElevUnit(units), L)}` : ''; }
const srRgb = c => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

// The legend for the coloured layer that is on.
function RsTerrainLegend({ c, kind, range, fb, compact }) {
  const L = c.lang;
  if (!kind) return null;
  const title = rt(L, kind === 'elev' ? 'lgElevT' : kind === 'slope' ? 'lgSlopeT' : 'lgAspectT', { u: srUnitL(srElevUnit(c.units), L) });
  let body;
  if (fb) body = <p className="rs-tlg-fb">{rt(L, kind === 'elev' ? 'lgElevFb' : kind === 'slope' ? 'lgSlopeFb' : 'lgAspectFb')}</p>;
  else if (kind === 'elev') {
    if (!range) body = <p className="rs-tlg-fb">{rt(L, 'lgElevWait')}</p>;
    else {
      const ticks = srElevTicks(range, c.units);
      body = <div className="rs-tlg-bar">
        <i style={{ background: `linear-gradient(90deg, ${SR_ELEV_RAMP.map((k, j) => `${srRgb(k)} ${Math.round(j / (SR_ELEV_RAMP.length - 1) * 100)}%`).join(', ')})` }} />
        <div className="rs-tlg-ticks tn">{ticks.map((t, j) => <span key={j} style={{ left: `${t.at * 100}%` }} className={j === 0 ? 'first' : j === ticks.length - 1 ? 'last' : ''}>{fmt(t.v, 0)}</span>)}</div>
      </div>;
    }
  } else if (kind === 'slope') {
    body = <div className="rs-tlg-bar classes">
      <i className="segs">{SR_SLOPE_CLASSES.map((k, j) => <b key={j} style={{ background: srRgb(k.c) }} />)}</i>
      <div className="rs-tlg-ticks tn">{[0, 5, 10, 15, 30].map((v, j) => <span key={j} style={{ left: `${j / SR_SLOPE_CLASSES.length * 100}%` }} className={j === 0 ? 'first' : ''}>{j === 4 ? '30+' : fmt(v, 0)}</span>)}</div>
    </div>;
  } else {
    body = <div className="rs-tlg-aspect">{SR_ASPECT_CLASSES.map(k => <span key={k.k}><i style={{ background: srRgb(k.c) }} />{rt(L, 'asp_' + k.k)}</span>)}</div>;
  }
  return (
    <div className={`rs-tlg${compact ? ' compact' : ''}`} role="group" aria-label={title}>
      <div className="rs-tlg-h"><b>{title}</b>{!compact && <span>{rt(L, 'src3dep')}</span>}</div>
      {body}
    </div>
  );
}

// The layers sheet: base map, the LiDAR terrain layers with their legend and strength,
// and what the map draws. Every source is named; online-only layers say so offline.
function RsLayersSheet({ c, layers, setLayers, terrain, setTerrain, hasProperty, online, fb, down, onFit, fitting, onClose }) {
  const L = c.lang;
  const ov = terrain.overlay;
  const pick = k => setTerrain({ overlay: ov === k ? null : k });
  const needs = !online ? rt(L, 'needsSignalS') : null;
  const sub = (k, s) => needs && (k === 'ov' ? ov : terrain[k]) ? needs : down && down[k === 'ov' ? ov : k] ? rt(L, 'layerDownS') : s;
  const rows = [['trees', 'lyTrees', 'lyTreesS'], ['laterals', 'lyLaterals', 'lyLateralsS'], ['mainlines', 'lyLines', 'lyLinesS'], ['vacuum', 'lyVacuum', 'lyVacuumS'],
    ['brix', 'lyBrix', 'lyBrixS'], ['pumps', 'lyPumps', 'lyPumpsS'], ['tanks', 'lyTanks', 'lyTanksS']];
  const rangeText = terrain.range ? rt(L, 'lyElevRange', { a: srElevText(terrain.range.min, c.units, L), b: srElevText(terrain.range.max, c.units, L) }) : rt(L, 'lyElevS');
  return (
    <RsSheet title={rt(L, 'bushLayers')} onClose={onClose} id="rs-layers">
      <label className="rs-fl">{rt(L, 'baseMap')}</label>
      <RsSeg label={rt(L, 'baseMap')} wrap value={layers.base} onChange={v => setLayers({ base: v })}
        options={[['sat', rt(L, 'baseSat')], ['sat-terrain', rt(L, 'baseSatT')], ['topo', rt(L, 'baseTopo')], ['street', rt(L, 'baseStreet')]]} />
      <p className="rs-note">{rt(L, layers.base === 'topo' ? 'srcTopo' : layers.base === 'street' ? 'srcStreet' : 'srcSat')}</p>

      <h3 className="rs-sec">{rt(L, 'lyTerrainH')}</h3>
      {!online && <p className="rs-errline rs-needsig" role="status"><RsIcon name="info" size={18} />{rt(L, 'needsSignalP')}</p>}
      <div className="rs-list">
        <RsSwitch on={ov === 'elev'} onChange={() => pick('elev')} title={rt(L, 'lyElev')} sub={sub('ov', ov === 'elev' && fb && fb.elev ? rt(L, 'lyFbS') : rangeText)} />
        <RsSwitch on={ov === 'slope'} onChange={() => pick('slope')} title={rt(L, 'lySlope')} sub={ov === 'slope' ? sub('ov', fb && fb.slope ? rt(L, 'lyFbS') : rt(L, 'lySlopeS')) : rt(L, 'lySlopeS')} />
        <RsSwitch on={ov === 'aspect'} onChange={() => pick('aspect')} title={rt(L, 'lyAspect')} sub={ov === 'aspect' ? sub('ov', fb && fb.aspect ? rt(L, 'lyFbS') : rt(L, 'lyAspectS')) : rt(L, 'lyAspectS')} />
        <RsSwitch on={!!terrain.hillshade} onChange={v => setTerrain({ hillshade: v })} title={rt(L, 'lyHill')} sub={sub('hillshade', rt(L, 'lyHillS'))} />
      </div>
      {ov && <div className="rs-tlg-wrap">
        <RsTerrainLegend c={c} kind={ov} range={terrain.range} fb={fb && fb[ov]} />
        <label className="rs-fl" htmlFor="rs-ly-op">{rt(L, 'lyOpacity', { p: Math.round(terrain.opacity * 100) })}</label>
        <input id="rs-ly-op" className="rs-range" type="range" min="20" max="90" step="5" value={Math.round(terrain.opacity * 100)}
          onChange={e => setTerrain({ opacity: (+e.target.value) / 100 })} aria-valuetext={`${Math.round(terrain.opacity * 100)} %`} />
        {ov === 'elev' && !(fb && fb.elev) && <div className="rs-tlg-fit"><button type="button" className="rs-linkbtn" onClick={onFit} disabled={!online || fitting}>{rt(L, fitting ? 'lyFitting' : 'lyFit')}</button></div>}
      </div>}
      <p className="rs-note">{rt(L, 'src3depNote')}</p>

      <h3 className="rs-sec">{rt(L, 'lyOnMapH')}</h3>
      <div className="rs-list">
        {rows.map(([k, t, s]) => <RsSwitch key={k} on={!!layers[k]} onChange={v => setLayers({ [k]: v })} title={rt(L, t)} sub={rt(L, s)} />)}
        {hasProperty && <RsSwitch on={!!layers.property} onChange={v => setLayers({ property: v })} title={rt(L, 'lyProperty')} sub={rt(L, 'lyPropertyS')} />}
        <RsSwitch on={!!terrain.water} onChange={v => setTerrain({ water: v })} title={rt(L, 'lyWater')} sub={sub('water', rt(L, 'lyWaterS'))} />
        <RsSwitch on={!!terrain.trails} onChange={v => setTerrain({ trails: v })} title={rt(L, 'lyTrails')} sub={sub('trails', rt(L, 'lyTrailsS'))} />
      </div>
      <p className="rs-note">{rt(L, 'layersNote')} {rt(L, 'lyOfflineNote')}</p>
    </RsSheet>
  );
}

// The fall along a mainline, from LiDAR heights at 16 points on its drawn path: the high
// end, the low end, the fall and average grade, which end the tank is at, a low spot.
function RsLineFall({ c, model, line }) {
  const L = c.lang, units = c.units, u = srUnitL(srElevUnit(units), L);
  const along = React.useMemo(() => line.geo.pts.length >= 2 ? srAlongPath(line.geo.pts, 16) : null, [line.id, line.geo.pts.length, line.geo.pts[0] && line.geo.pts[0][0]]);
  const ev = useSrElev(along ? along.map(p => [p[0], p[1]]) : null);
  if (!along) return null;
  const prof = ev.st === 'ok' ? srLineProfile(along, ev.v, 1) : null;
  const dist = m => units === 'L' ? `${fmt(m, 0)} m` : `${fmt(srMToFt(m), 0)} ${srUnitL('ft', L)}`;
  const hgt = m => `${fmt(srElevU(m, units), srElevU(Math.abs(m), units) < 10 ? 1 : 0)} ${u}`;
  // Which end is the tank's: a tank pin within 40 m of an end of the path.
  const tanks = model.pins.filter(p => p.type === 'tank' && srFin(p.lat) && srFin(p.lon));
  const endNear = pt => tanks.some(t => srDistM([t.lat, t.lon], pt) <= 40);
  const first = along[0], last = along[along.length - 1];
  const tankAtStart = endNear(first) && !endNear(last), tankAtEnd = endNear(last) && !endNear(first);
  let tankLine = null;
  if (prof && (tankAtStart || tankAtEnd)) {
    const tankHigh = (tankAtStart && prof.highIsStart) || (tankAtEnd && !prof.highIsStart);
    // At the low end sap runs down to the tank, unless a rise on the way stops it (said below).
    tankLine = tankHigh ? ['bad', rt(L, 'fallTankHigh', { d: hgt(prof.fallM) })] : prof.rise ? ['idle', rt(L, 'fallTankLowOnly')] : ['ok', rt(L, 'fallTankLow')];
  }
  return (
    <div className="rs-linefall">
      <h3 className="rs-sec">{rt(L, 'fallH')}</h3>
      {ev.st === 'loading' && <p className="rs-meta" role="status">{rt(L, 'fallLoading')}</p>}
      {ev.st === 'err' && <p className="rs-meta" role="status">{rt(L, 'fallNoSignal')}</p>}
      {ev.st === 'ok' && !prof && <p className="rs-meta">{rt(L, 'fallNoData')}</p>}
      {prof && <>
        <RsKv rows={[
          [rt(L, 'fallHigh'), hgt(prof.hiM)],
          [rt(L, 'fallLow'), hgt(prof.loM)],
          [rt(L, 'fallFall'), rt(L, 'fallOver', { d: hgt(prof.fallM), l: dist(prof.lenM), g: fmt(prof.gradePct, 1) })],
        ]} />
        {tankLine && <p className={`rs-verdict ${tankLine[0]}`} style={{ marginTop: 10 }}>{tankLine[1]}</p>}
        {prof.rise && <p className="rs-verdict bad" style={{ marginTop: 10 }}>{rt(L, 'fallRise', { d: hgt(prof.rise.height), l: dist(prof.rise.at) })}</p>}
        {prof.dip && <p className="rs-verdict bad" style={{ marginTop: 10 }}>{rt(L, 'fallDip', { d: hgt(prof.dip.depth), l: dist(prof.dip.at) })}</p>}
        <RsLineChart h={110} yMin={Math.floor(srElevU((prof.dip ? prof.dip.m : prof.loM) - Math.max(1, prof.fallM * .15), units))} yMax={Math.ceil(srElevU((prof.rise ? prof.rise.m : prof.hiM) + Math.max(1, prof.fallM * .15), units))}
          yTicks={[prof.dip ? prof.dip.m : null, prof.loM, prof.hiM, prof.rise ? prof.rise.m : null].filter(srFin).map(m => Math.round(srElevU(m, units)))}
          series={[{ v: ev.v.map(m => srFin(m) ? +srElevU(m, units).toFixed(1) : null), c: T.tx, area: true, name: rt(L, 'fallProfileN', { u }) }]}
          xLabels={[[0, dist(0)], [along.length - 1, dist(last[2])]]} rowLabel={i => dist(along[i][2])} rowHead={rt(L, 'fallAlong')} dp={0}
          label={rt(L, 'fallAria', { n: line.label, a: hgt(prof.hiM), b: hgt(prof.loM) })} />
        <p className="rs-note">{rt(L, 'fallSource')}</p>
      </>}
    </div>
  );
}

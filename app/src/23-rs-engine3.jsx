// ─── Run Sheet engine 3 (Phases 7-8): lines, pumps, readings, watch ─────────
// Pure, tested, plain JS inside the formula band (tests/runsheet.test.mjs
// evaluates this exact source). Nothing here reads localStorage or the DOM:
// selectors in 26-rs-ops.jsx gather the facts and pass them in.
//
// Storage units are canonical: gallons, inHg, °F, hours, epoch ms (ISO strings
// in storage, ms here). Display conversion happens at the edge (srVol/fromGal).
//
// Defaults below are decisions, not facts (DESIGN.md D5). Each one is shown
// on screen as "a default you can change" and lives in sg_watch_prefs.
const SR_OPS_DEFAULTS = { leakLimitIn: 2.0, baselineDays: 7, pairH: 3, freezeF: 28, fuelLowH: 4, staleH: 12 };
const SR_H_MS = 3600000;
// isFinite(null) is true (null coerces to 0); every optional number here goes through this.
const srFin = x => typeof x === 'number' && isFinite(x);
const SR_PUMP_KINDS = ['vacuum', 'transfer', 'ro', 'generator'];
// Stage family per pump kind (tile colour means family, DESIGN.md round 2):
// vacuum works the lines, transfer and RO work the collection, the generator is power.
const SR_PUMP_FAMILY = { vacuum: 'lines', transfer: 'collect', ro: 'collect', generator: 'power' };

function srMedian(a) {
  const v = (a || []).filter(srFin).slice().sort((p, q) => p - q);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// Opts merged over the defaults; junk values fall back to the default.
function srOpsPrefs(p) {
  const o = { ...SR_OPS_DEFAULTS };
  Object.keys(SR_OPS_DEFAULTS).forEach(k => { const v = p ? parseFloat(p[k]) : NaN; if (srFin(v) && v >= 0) o[k] = v; });
  return o;
}

// ── Leak rule ────────────────────────────────────────────────────────────────
// A line-end gauge is a leak suspect when its latest reading sits at least
// `limit` inHg below the line's recent baseline: the median of its readings in
// the `days` before the latest one. Needs at least one earlier reading in that
// window; with none the status is 'single' (nothing to compare against).
//   readings: [{ ms, v }] in any order (inHg)
// Returns { status: 'none'|'single'|'ok'|'suspect', latest, baseline, drop, n }.
function srLeakCheck(readings, limit, days) {
  const lim = srFin(limit) ? limit : SR_OPS_DEFAULTS.leakLimitIn;
  const win = (srFin(days) ? days : SR_OPS_DEFAULTS.baselineDays) * 24 * SR_H_MS;
  const r = (readings || []).filter(x => x && srFin(x.ms) && srFin(x.v)).slice().sort((a, b) => a.ms - b.ms);
  if (!r.length) return { status: 'none', latest: null, baseline: null, drop: null, n: 0 };
  const latest = r[r.length - 1];
  const prior = r.slice(0, -1).filter(x => x.ms < latest.ms && x.ms >= latest.ms - win);
  if (!prior.length) return { status: 'single', latest, baseline: null, drop: null, n: 0 };
  const baseline = srMedian(prior.map(x => x.v));
  const drop = Math.round((baseline - latest.v) * 100) / 100;
  return { status: drop >= lim - 1e-9 ? 'suspect' : 'ok', latest, baseline, drop, n: prior.length };
}
// The leak finder (DESIGN.md: "a line is leaking when its far end reads more
// than the limit below the releaser"). A line-end reading is paired with the
// releaser/pump reading nearest to it in time, within `pairH` hours (manual
// gauges are read on a walk, not at the same second). With a pair the drop is
// releaser minus end: method 'releaser'. With no pump reading close enough it
// falls back to the line's own recent baseline (srLeakCheck): method 'baseline'.
//   end, rel: [{ ms, v }] inHg · limit inHg · days · pairH hours
// Returns { status: 'none'|'single'|'ok'|'suspect', method: 'releaser'|'baseline'|null,
//           latest, releaser, baseline, drop, n }.
function srLeakFind(end, rel, limit, days, pairH) {
  const lim = srFin(limit) ? limit : SR_OPS_DEFAULTS.leakLimitIn;
  const win = (srFin(pairH) ? pairH : SR_OPS_DEFAULTS.pairH) * SR_H_MS;
  const base = srLeakCheck(end, lim, days);
  if (base.status === 'none') return { ...base, method: null, releaser: null };
  const L = base.latest;
  const r = (rel || []).filter(x => x && srFin(x.ms) && srFin(x.v) && Math.abs(x.ms - L.ms) <= win)
    .sort((a, b) => Math.abs(a.ms - L.ms) - Math.abs(b.ms - L.ms) || b.ms - a.ms)[0] || null;
  if (!r) return { ...base, method: base.status === 'single' ? null : 'baseline', releaser: null };
  const drop = Math.round((r.v - L.v) * 100) / 100;
  return { status: drop >= lim - 1e-9 ? 'suspect' : 'ok', method: 'releaser', latest: L, releaser: r,
    baseline: base.baseline, drop, n: base.n };
}

// The gauge chain's leak localizer (DESIGN.md line 104: "localizes the drop between
// two gauges and names the taps at each"). It answers WHERE on a line the vacuum
// is lost; WHETHER the line leaks stays srLeakFind's verdict.
//   nodes: in walking order from the pump, [{ id, hist:[{ ms, v }] }]; the first is
//          the pump (releaser), the last the line's far end, mid-line gauges between.
//   limit inHg (a line losing this much end to end is leaking) · pairH hours
// Each node takes its reading nearest the reference time (the far end's latest
// reading, else the newest reading on the line), within pairH. Consecutive read
// nodes make segments; unread nodes between them are named in `skipped`.
// Returns { status, refMs, reads:[{ v, ms }|null per node], segs:[{ from, to, drop, skipped }],
//           total, seg }: status 'none' (no reading), 'few' (fewer than two nodes read
// in the window), 'ok' (total loss under the limit), 'located' (the segment with the
// largest drop carries at least half the total: seg is it), or 'spread' (the loss is
// shared along the line, no one segment carries half).
function srGaugeLocate(nodes, limit, pairH) {
  const lim = srFin(limit) ? limit : SR_OPS_DEFAULTS.leakLimitIn;
  const win = (srFin(pairH) ? pairH : SR_OPS_DEFAULTS.pairH) * SR_H_MS;
  const N = (nodes || []).map(n => (n && n.hist || []).filter(x => x && srFin(x.ms) && srFin(x.v)));
  const none = { status: 'none', refMs: null, reads: N.map(() => null), segs: [], total: null, seg: null };
  if (N.length < 2) return none;
  const last = a => a.reduce((m, x) => (m == null || x.ms > m.ms ? x : m), null);
  const endLast = last(N[N.length - 1]);
  const anyLast = last([].concat(...N.slice(1)));
  const ref = endLast || anyLast;
  if (!ref) return none;
  const reads = N.map(a => a.filter(x => Math.abs(x.ms - ref.ms) <= win)
    .sort((p, q) => Math.abs(p.ms - ref.ms) - Math.abs(q.ms - ref.ms) || q.ms - p.ms)[0] || null);
  const idx = reads.map((r, i) => r ? i : -1).filter(i => i >= 0);
  if (idx.length < 2) return { ...none, status: 'few', refMs: ref.ms, reads };
  const r2 = x => Math.round(x * 100) / 100;
  const segs = idx.slice(1).map((to, k) => {
    const from = idx[k];
    return { from, to, drop: r2(reads[from].v - reads[to].v), skipped: Array.from({ length: to - from - 1 }, (_, j) => from + 1 + j) };
  });
  const total = r2(reads[idx[0]].v - reads[idx[idx.length - 1]].v);
  if (total < lim - 1e-9) return { status: 'ok', refMs: ref.ms, reads, segs, total, seg: null };
  const best = segs.reduce((m, g) => (g.drop > m.drop + 1e-9 ? g : m), segs[0]);
  const located = best.drop >= total / 2 - 1e-9;
  return { status: located ? 'located' : 'spread', refMs: ref.ms, reads, segs, total, seg: located ? best : null };
}
// Sensor id of a mid-line gauge: line:<lineId>:g:<gaugeId> (sg_readings rows, sg_sensors records).
function srGaugeSid(lineId, gaugeId) { return `line:${lineId}:g:${gaugeId}`; }
// Next free gauge name on a line: "C1", "C2", ... (the prototype's naming).
function srNextGaugeName(lineId, gauges) {
  const used = new Set((gauges || []).map(g => String(g && g.name)));
  for (let n = 1; n < 100; n++) if (!used.has(`${lineId}${n}`)) return `${lineId}${n}`;
  return `${lineId}${(gauges || []).length + 1}`;
}

// ── Runtime ──────────────────────────────────────────────────────────────────
// Hours a pump ran inside [fromMs, toMs]. runs: [{ start, end }] in ms (closed
// runs from sg_pump_log); runStart: ms of the open run while it is marked
// running, else null. Overlapping or backwards runs count once / not at all.
function srRunHours(runs, runStart, fromMs, toMs) {
  const lo = srFin(fromMs) ? fromMs : -Infinity, hi = toMs;
  const iv = (runs || []).filter(r => r && srFin(r.start) && srFin(r.end) && r.end > r.start).map(r => [r.start, r.end]);
  if (srFin(runStart) && runStart < hi) iv.push([runStart, hi]);
  const cl = iv.map(([a, b]) => [Math.max(a, lo), Math.min(b, hi)]).filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
  let tot = 0, curA = null, curB = null;
  cl.forEach(([a, b]) => {
    if (curB == null || a > curB) { if (curB != null) tot += curB - curA; curA = a; curB = b; }
    else curB = Math.max(curB, b);
  });
  if (curB != null) tot += curB - curA;
  return tot / SR_H_MS;
}
// "14:02:12" for a runtime clock.
function srHms(hours) {
  const s = Math.max(0, Math.floor((hours || 0) * 3600));
  const p = n => String(n).padStart(2, '0');
  return `${Math.floor(s / 3600)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}

// ── Fuel ─────────────────────────────────────────────────────────────────────
// Hours until a tank of fuel runs dry at a burn rate. null when unknown.
function srTimeToEmpty(levelGal, burnGalH) {
  const l = levelGal == null ? NaN : +levelGal, b = +burnGalH;
  if (!srFin(l) || !(b > 0)) return null;
  return Math.max(0, l) / b;
}
// Fuel left now, from the latest fuel log (the level right after filling) and
// the burn rate over the hours the pump actually ran since then.
//   fills: [{ ms, level }] gallons · runs/runStart as srRunHours · now ms
// Returns null with no fill logged, else { levelGal, pct, hoursLeft, emptyAtMs, sinceMs }.
function srFuelLeft(o) {
  const fills = (o.fills || []).filter(f => f && srFin(f.ms) && srFin(f.level) && f.ms <= o.now).sort((a, b) => a.ms - b.ms);
  if (!fills.length) return null;
  const last = fills[fills.length - 1];
  const burn = +o.burnGalH > 0 ? +o.burnGalH : 0;
  const ranH = srRunHours(o.runs, o.runStart, last.ms, o.now);
  const cap = +o.capGal > 0 ? +o.capGal : null;
  const levelGal = Math.max(0, Math.min(cap || Infinity, last.level) - burn * ranH);
  const hoursLeft = srTimeToEmpty(levelGal, burn);
  const running = srFin(o.runStart);
  return { levelGal, pct: cap ? Math.min(1, levelGal / cap) : null, hoursLeft,
    emptyAtMs: running && hoursLeft != null ? o.now + hoursLeft * SR_H_MS : null, sinceMs: last.ms };
}

// ── Readings: age and freshness ──────────────────────────────────────────────
// Manual readings are taken by hand, so "fresh" is hours, not seconds:
// fresh up to 2 h, aging to staleH (12 h default), old beyond.
function srAgeTier(ms, now, staleH) {
  if (!srFin(ms)) return 'none';
  const h = (now - ms) / SR_H_MS, s = srFin(staleH) ? staleH : SR_OPS_DEFAULTS.staleH;
  return h <= 2 ? 'fresh' : h <= s ? 'aging' : 'old';
}
// Vacuum ramp step 0..4 for 16 to 26 inHg (the tokens' --rs-vac-0..4).
function srVacStep(v) { return !srFin(v) ? null : Math.max(0, Math.min(4, Math.floor((v - 16) / 2))); }

// ── Weather at the sugarhouse ────────────────────────────────────────────────
// hourly: [{ ms, f }] (°F, Open-Meteo hourly). Temperature now (nearest hour,
// or `current`), trend over the last 3 h, the next 32°F crossing in the next
// 24 h, whether it froze in the last 24 h, and tonight's low.
function srFreezeThaw(hourly, now, current) {
  const h = (hourly || []).filter(x => x && srFin(x.ms) && srFin(x.f)).sort((a, b) => a.ms - b.ms);
  if (!h.length && !srFin(current)) return null;
  const near = h.reduce((b, x) => (b == null || Math.abs(x.ms - now) < Math.abs(b.ms - now)) ? x : b, null);
  const nowF = srFin(current) ? current : near.f;
  const back = h.filter(x => x.ms <= now && x.ms >= now - 3 * SR_H_MS);
  const d = back.length ? nowF - back[0].f : 0;
  const trend = d <= -1 ? 'falling' : d >= 1 ? 'rising' : 'steady';
  const ahead = h.filter(x => x.ms > now && x.ms <= now + 24 * SR_H_MS);
  let cross = null, prev = nowF;
  for (const x of ahead) {
    if (prev > 32 && x.f <= 32) { cross = { ms: x.ms, kind: 'freeze' }; break; }
    if (prev <= 32 && x.f > 32) { cross = { ms: x.ms, kind: 'thaw' }; break; }
    prev = x.f;
  }
  const past = h.filter(x => x.ms <= now && x.ms >= now - 24 * SR_H_MS);
  const froze = past.some(x => x.f <= 32);
  const night = ahead.filter(x => x.ms <= now + 18 * SR_H_MS);
  const low = night.length ? Math.min(...night.map(x => x.f)) : null;
  return { nowF, trend, cross, frozeLast24: froze, lowTonight: low };
}
// Is sap running? Honest version for hand readings:
//   'running' above 32°F now and a tank rising on two readings, the newer one in the last 3 h
//   'weather' above 32°F now after a freeze in the last 24 h, with no tank evidence
//   null      otherwise
// tanks: [{ fillGalH, readMs }]
function srSapRunning(o) {
  if (!o || !srFin(o.tempF) || o.tempF <= 32) return null;
  const rising = (o.tanks || []).some(t => t && t.fillGalH > 0 && srFin(t.readMs) && o.now - t.readMs <= 3 * SR_H_MS);
  if (rising) return 'running';
  return o.frozeLast24 ? 'weather' : null;
}

// ── Mainline geometry ────────────────────────────────────────────────────────
// A drawn path wins. Otherwise the line runs through its assigned trees into
// the tank it feeds: highest first when every tree has an elevation, else
// farthest from the tank first. Points are [lat, lon].
//   meta: { path?, tankId? } · trees: pins on this line · tanks: tank pins
function srDistM(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function srLinePath(meta, trees, tanks) {
  const m = meta || {};
  const path = Array.isArray(m.path) ? m.path.filter(p => Array.isArray(p) && srFin(p[0]) && srFin(p[1])) : [];
  const tk = (tanks || []).filter(t => t && srFin(t.lat) && srFin(t.lon));
  const tr = (trees || []).filter(t => t && srFin(t.lat) && srFin(t.lon));
  if (path.length >= 2) return { pts: path, source: 'drawn', tankId: m.tankId || null };
  if (!tr.length) return { pts: [], source: 'none', tankId: null };
  const cen = [tr.reduce((s, t) => s + t.lat, 0) / tr.length, tr.reduce((s, t) => s + t.lon, 0) / tr.length];
  const tank = tk.find(t => String(t.id) === String(m.tankId)) ||
    tk.slice().sort((a, b) => srDistM(cen, [a.lat, a.lon]) - srDistM(cen, [b.lat, b.lon]))[0] || null;
  const allElev = tr.every(t => srFin(parseFloat(t.elev)));
  // Order: highest first when every tree has an elevation, else farthest from
  // the tank along the line's direction first.
  const k = Math.cos(cen[0] * Math.PI / 180);
  const org = tank ? [tank.lat, tank.lon] : cen;
  const XY = q => [(q[1] - org[1]) * k * 111320, (q[0] - org[0]) * 111320];
  const far = tr.map(t => XY([t.lat, t.lon])).reduce((b, q) => Math.hypot(q[0], q[1]) > Math.hypot(b[0], b[1]) ? q : b, [0, 0]);
  const cxy = XY(cen), ax0 = tank ? cxy : far, aL = Math.hypot(ax0[0], ax0[1]) || 1, ax = [ax0[0] / aL, ax0[1] / aL];
  const proj = t => { const q = XY([t.lat, t.lon]); return { t, u: q[0] * ax[0] + q[1] * ax[1], v: -q[0] * ax[1] + q[1] * ax[0] }; };
  const P = tr.map(proj).sort((a, b) => allElev ? (parseFloat(b.t.elev) - parseFloat(a.t.elev)) || (b.u - a.u) : b.u - a.u);
  // A mainline runs down the middle of its trees, not through each one (the
  // laterals reach the trees): each point keeps its tree's distance along the
  // line and takes the average sideways offset of its neighbours (window of 5).
  const back = (u, v) => { const x = u * ax[0] - v * ax[1], y = u * ax[1] + v * ax[0]; return [+(org[0] + y / 111320).toFixed(7), +(org[1] + x / (k * 111320)).toFixed(7)]; };
  const pts = P.map((p, i) => { const w = P.slice(Math.max(0, i - 2), i + 3); return back(p.u, w.reduce((s, q) => s + q.v, 0) / w.length); });
  if (tank) pts.push([tank.lat, tank.lon]);
  return { pts: pts.length >= 2 ? pts : [], source: pts.length >= 2 ? 'trees' : 'none', tankId: tank ? tank.id : null, byElev: allElev };
}
// Nearest point of a polyline to a point (flat-earth in metres, fine inside a
// sugarbush). Used to draw a tree's lateral to its mainline.
function srNearestOnPath(p, pts) {
  if (!pts || pts.length < 2) return null;
  const k = Math.cos(p[0] * Math.PI / 180);
  const X = q => [(q[1] - p[1]) * k, q[0] - p[0]];
  let best = null, bd = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = X(pts[i]), b = X(pts[i + 1]);
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    const t = L2 > 0 ? Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / L2)) : 0;
    const x = a[0] + t * dx, y = a[1] + t * dy, d = x * x + y * y;
    if (d < bd) { bd = d; best = [pts[i][0] + t * (pts[i + 1][0] - pts[i][0]), pts[i][1] + t * (pts[i + 1][1] - pts[i][1])]; }
  }
  return best;
}
// Length of a path in feet.
function srPathFt(pts) { let m = 0; for (let i = 1; i < (pts || []).length; i++) m += srDistM(pts[i - 1], pts[i]); return m * 3.28084; }

// ── Reading providers (the data-source seam) ─────────────────────────────────
// Every screen reads numbers through one interface, so manual readings today
// and a sensor feed later look the same to the UI:
//   { id, latest(sensorId) -> {v, ms, src}|null, history(sensorId, sinceMs) -> [{v, ms}],
//     subscribe(cb) -> unsubscribe, status(now) -> 'live'|'manual'|'stale'|'off' }
// Sensor ids: 'line:<id>:end' (vacuum at the far end), 'pump:<id>:vac'
// (releaser vacuum), 'tank:<id>:level' (gallons). 'site:temp' is the outside
// temperature, which the watch screen gets from the forecast, not a sensor.
function srSensorId(kind, id) { return kind === 'line' ? `line:${id}:end` : kind === 'pump' ? `pump:${id}:vac` : kind === 'tank' ? `tank:${id}:level` : String(id); }

// Manual: hand readings from sg_readings (one season's array).
function srManualSource(readings, staleH) {
  const by = {};
  (readings || []).forEach(r => {
    const ms = Date.parse(r && r.t), v = parseFloat(r && r.v);
    if (!r || !r.s || !srFin(ms) || !srFin(v)) return;
    (by[r.s] = by[r.s] || []).push({ v, ms, src: r.src || 'manual' });
  });
  Object.values(by).forEach(a => a.sort((p, q) => p.ms - q.ms));
  return {
    id: 'manual',
    latest: sid => { const a = by[sid]; return a && a.length ? a[a.length - 1] : null; },
    history: (sid, since) => (by[sid] || []).filter(x => !srFin(since) || x.ms >= since),
    subscribe: () => () => {},
    status: now => {
      const last = Math.max(-Infinity, ...Object.values(by).map(a => a[a.length - 1].ms));
      return !srFin(last) ? 'off' : srAgeTier(last, now, staleH) === 'old' ? 'stale' : 'manual';
    },
  };
}
// Demo: a deterministic simulator seeded from the user's real lines and tanks.
// In memory only, never written to storage, and every screen that shows it
// says "Demo readings". Drift rules from the prototype: a 3 s tick, ±0.1 inHg
// jitter, tanks rising at a steady fill rate, temperature drifting slowly.
//   model: { lines:[{id, base}], pumps:[{id, base}], tanks:[{id, capGal, level, rate}], tempF }
//   clock: () => ms
function srSimSource(model, clock, t0) {
  const M = model || {};
  const start = srFin(t0) ? t0 : clock();
  const j = (seed, ms) => { const k = Math.floor(ms / 3000); return (((k * 7 + seed * 13) % 5) - 2) * 0.05; };
  const seedOf = s => String(s).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const val = (sid, ms) => {
    const [kind, id] = String(sid).split(':');
    if (kind === 'line') { const l = (M.lines || []).find(x => String(x.id) === id); return l ? +(l.base + j(seedOf(sid), ms)).toFixed(2) : null; }
    if (kind === 'pump') { const p = (M.pumps || []).find(x => String(x.id) === id); return p ? +(p.base + j(seedOf(sid), ms) / 2).toFixed(2) : null; }
    if (kind === 'tank') {
      const t = (M.tanks || []).find(x => String(x.id) === id); if (!t) return null;
      const lvl = t.level + (t.rate || 0) * Math.max(0, ms - start) / SR_H_MS;
      return Math.round(Math.min(t.capGal || Infinity, lvl) * 10) / 10;
    }
    if (sid === 'site:temp') return srFin(M.tempF) ? +(M.tempF + 0.6 * Math.sin((ms - start) / (30 * 60000))).toFixed(1) : null;
    return null;
  };
  return {
    id: 'sim',
    latest: sid => { const ms = Math.floor(clock() / 3000) * 3000, v = val(sid, ms); return v == null ? null : { v, ms, src: 'sim' }; },
    history: (sid, since) => {
      const now = clock(), out = [];
      for (let ms = Math.max(srFin(since) ? since : now - 24 * SR_H_MS, now - 24 * SR_H_MS); ms <= now; ms += SR_H_MS) {
        const v = val(sid, ms); if (v != null) out.push({ v, ms });
      }
      return out;
    },
    subscribe: cb => { const id = setInterval(() => cb({ ms: clock() }), 3000); return () => clearInterval(id); },
    status: () => 'live',
  };
}
// Which source a screen uses. The simulator only when the user switched on
// "Demo readings"; a sensor feed would slot in here ahead of manual.
function srPickSource(o) {
  return o && o.demo ? srSimSource(o.model, o.clock || (() => Date.now()), o.t0) : srManualSource(o && o.readings, o && o.staleH);
}

// ── Freeze prep ──────────────────────────────────────────────────────────────
// The checklist for a freezing night, built from the pumps he actually has.
// Keys are string ids for rt(); pumpId ties an item to its pump.
function srFreezeItems(pumps, hasLines) {
  const out = [];
  (pumps || []).forEach(p => {
    if (p.kind === 'transfer') out.push({ id: 'drain-' + p.id, key: 'fzDrainTransfer', pumpId: p.id, name: p.name });
    if (p.kind === 'vacuum') out.push({ id: 'trap-' + p.id, key: 'fzTrap', pumpId: p.id, name: p.name });
    if (p.kind === 'ro') out.push({ id: 'ro-' + p.id, key: 'fzRo', pumpId: p.id, name: p.name });
    if (p.kind === 'generator') out.push({ id: 'gen-' + p.id, key: 'fzGen', pumpId: p.id, name: p.name });
  });
  if (hasLines) out.push({ id: 'lowdrains', key: 'fzLowDrains' });
  return out;
}

// ── Pump jobs for "Do this next" ─────────────────────────────────────────────
// f.ops: {
//   pumps: [{ id, name, kind, status, statusAt(ms), note, fuel: {hoursLeft, levelGal}|null }],
//   leaks: [{ id, name, latest, baseline, drop }],
//   freeze: { lo, done, total } | null     (tonight's forecast low at or under freezeF)
//   prefs: srOpsPrefs(...)
// }
// Priorities (PORT-PLAN 3 / DESIGN.md): fault 95 · freeze prep 90 after 5 pm,
// 55 by day · fuel 75 (under fuelLowH, or dry overnight after 5 pm), 35 otherwise
// under 12 h · leak suspect 70.
function srPumpJobs(f) {
  const o = f.ops || {}, P = o.prefs || SR_OPS_DEFAULTS, J = [];
  const night = f.minutes >= 17 * 60;
  (o.pumps || []).filter(p => p.status === 'fault').forEach(p => J.push({ id: 'fault-' + p.id, p: 95, tone: 'bad', icon: 'alert', family: 'bad',
    title: 'jFaultT', why: p.note ? 'jFaultWn' : 'jFaultW', vars: { name: p.name, note: p.note || '', startMs: p.statusAt }, btn: 'jFaultB',
    act: { go: 'pumps/' + p.id }, alert: 'jFaultT', sub: p.note ? 'jFaultSn' : 'jFaultS' }));
  if (o.freeze && o.freeze.total > 0 && o.freeze.done < o.freeze.total) J.push({ id: 'freeze-prep', p: night ? 90 : 55, tone: 'ice', icon: 'snow', family: 'ice',
    title: 'jPrepT', why: 'jPrepW', vars: { lo: o.freeze.lo, done: o.freeze.done, total: o.freeze.total, left: o.freeze.total - o.freeze.done },
    btn: 'jPrepB', act: { go: 'pumps/freeze' }, alert: 'jPrepT', sub: 'jPrepS' });
  (o.pumps || []).filter(p => p.status === 'running' && p.fuel && p.fuel.hoursLeft != null).forEach(p => {
    const h = p.fuel.hoursLeft;
    const soon = h <= (P.fuelLowH || 4), overnight = night && h <= 12;
    if (soon || overnight) J.push({ id: 'fuel-' + p.id, p: 75, tone: 'bad', icon: 'fuel', family: 'power', title: overnight && !soon ? 'jFuelNT' : 'jFuelT',
      why: 'jFuelW', vars: { name: p.name, h, lvl: p.fuel.levelGal, emptyAtMs: f.now + h * SR_H_MS, nowMs: f.now }, btn: 'jFuelB', act: { go: 'pumps/' + p.id },
      alert: overnight && !soon ? 'jFuelNT' : 'jFuelT', sub: 'jFuelS' });
    else if (h <= 12) J.push({ id: 'fuel-' + p.id, p: 35, icon: 'fuel', family: 'power', title: 'jFuelT', why: 'jFuelW',
      vars: { name: p.name, h, lvl: p.fuel.levelGal, emptyAtMs: f.now + h * SR_H_MS, nowMs: f.now }, btn: 'jFuelB', act: { go: 'pumps/' + p.id }, alert: 'jFuelT', sub: 'jFuelS' });
  });
  (o.leaks || []).forEach(l => J.push({ id: 'leak-' + l.id, p: 70, tone: 'bad', icon: 'alert', family: 'bad', title: 'jLeakT',
    why: l.method === 'releaser' ? 'jLeakWR' : 'jLeakW',
    vars: { name: l.name, v: l.latest, base: l.baseline, rel: l.releaser, drop: l.drop, lim: P.leakLimitIn }, btn: 'jLeakB', act: { go: 'bush/line/' + l.id },
    alert: 'jLeakT', sub: 'jLeakS' }));
  return J;
}

// ── Offline tiles: classic's _sbCacheTiles math, lifted so it can be tested ──
// Slippy tile x/y for a point, and every tile URL for the view at zoom ±1
// (z12 to z18), capped at 600 fetches like classic. mode: 'sat' (imagery +
// labels, the offline pair classic saves), 'sat-terrain' (adds hillshade to
// z16), 'topo' (USGS to z16), 'street' (saves the imagery set, as classic).
const SR_TILE = {
  sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  hill: 'https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
  topo: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
  street: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
};
function srTileXY(lat, lng, z) {
  const n = 1 << z;
  const x = Math.floor((lng + 180) / 360 * n);
  const latR = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}
// extra (optional): the terrain layers that are on, saved with the area to z17:
//   { terrain: { kind, o } | null, hillshade, water, trails }  (24-rs-terrain builds the URLs)
function srTileUrls(b, zoom, mode, extra) {
  const X = extra || {};
  const z = Math.round(zoom), minZ = Math.max(12, z - 1), maxZ = Math.min(18, z + 1);
  const T = (u, zz, x, y) => u.replace('{z}', zz).replace('{y}', y).replace('{x}', x);
  const urls = []; let tiles = 0;
  for (let zz = minZ; zz <= maxZ; zz++) {
    const nw = srTileXY(b.north, b.west, zz), se = srTileXY(b.south, b.east, zz);
    for (let x = nw.x; x <= se.x; x++) for (let y = nw.y; y <= se.y; y++) {
      tiles++;
      if (mode === 'topo') { if (zz <= 16) urls.push(T(SR_TILE.topo, zz, x, y)); }
      else {
        urls.push(T(SR_TILE.sat, zz, x, y), T(SR_TILE.labels, zz, x, y));
        if (mode === 'sat-terrain' && zz <= 16) urls.push(T(SR_TILE.hill, zz, x, y));
      }
      if (zz <= 17) {
        if (X.terrain) urls.push(srTerrainTileUrl(X.terrain.kind, zz, x, y, X.terrain.o));
        if (X.hillshade) urls.push(srTerrainTileUrl('hillshade', zz, x, y));
        if (X.water) urls.push(srHydroTileUrl(zz, x, y));
        if (X.trails) urls.push(srTrailsTileUrl(zz, x, y));
      }
    }
  }
  return { urls, tiles, tooMany: urls.length > 600 };
}

// ── Imported lines (KML/GPX LineStrings) as mainline paths ───────────────────
// Classic's import stores a GeoJSON FeatureCollection in sg_property_geo and
// draws every feature as the property line. A LineString is often a mainline
// traced in Google Earth or on a GPS walk, so the Bush offers each one as a
// mainline path (written to sg_line_meta[id].path; sg_mainlines never changes).
// Suggestion by name: the line's own label ("Mainline A", case-insensitive),
// or "A", "Line A", "Main A", "ML A", "Mainline-A", "A line".
//   features: GeoJSON features · mainlines: [{ id, label }]
// Returns [{ i, name, pts: [[lat, lon]], ft, suggest: lineId|null }] for each
// LineString with at least two points, in file order.
function srImportedLines(features, mainlines) {
  const ml = mainlines || [];
  const norm = s => String(s || '').trim().toLowerCase().replace(/[\s_\-.]+/g, ' ');
  const byName = n => {
    const k = norm(n); if (!k) return null;
    const lab = ml.find(m => norm(m.label) === k); if (lab) return lab.id;
    const m = k.match(/^(?:(?:mainline|main line|main|line|ml)\s*)?([a-z])(?:\s*(?:line|mainline))?$/);
    if (!m) return null;
    const hit = ml.find(x => String(x.id).toLowerCase() === m[1]);
    return hit ? hit.id : null;
  };
  const out = []; const taken = new Set();
  (features || []).forEach((f, i) => {
    const g = f && f.geometry;
    if (!g || g.type !== 'LineString' || !Array.isArray(g.coordinates)) return;
    const pts = g.coordinates.filter(c => Array.isArray(c) && srFin(+c[0]) && srFin(+c[1])).map(c => [+c[1], +c[0]]);
    if (pts.length < 2) return;
    const name = (f.properties && f.properties.name) || '';
    let s = byName(name); if (s && taken.has(s)) s = null; if (s) taken.add(s);
    out.push({ i, name, pts, ft: Math.round(srPathFt(pts)), suggest: s });
  });
  return out;
}

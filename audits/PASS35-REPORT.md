# Pass 3.5 — The Map, made thrilling
**Executed 2026-09-20. Edits in `app/src/app.jsx` (the LinesTab/map band only) and `app/index.html` (CSS only), plus the `app/sw.js` cache bump v16→v17. Never touched `app/app.js`. No new dependencies — Leaflet + CSS + inline SVG only.**

**Verification used throughout:** after every batch — `cp app/src/app.jsx /tmp/app.jsx && SWEETRUN_SRC=/tmp/app.jsx node tests/formulas.test.mjs` → **53 passed, 0 failed** (unchanged; no formula-band edits this pass); full-file `@babel/parser` parse (JSX plugin) — PARSE OK; full compile with `@babel/core` + `@babel/preset-react` — COMPILE OK; compiled bundle evaluated end-to-end in Node with stubbed React/DOM/localStorage — EVAL OK (`LinesTab`, `App`, `_drawRouteLines`, `_sbScanSweep` all define; boot runs; render called; the top-level init-crash catch never fired). The sandbox has no browser access to these files, so **nothing was visually verified** — eyes-on checklist at the bottom.

**Functionality diff: none intended, and none found on review.** Two qualifications, stated honestly:
1. `startTracking`'s GPS callback now also stores the rounded accuracy in a new `gpsAcc` React state (for the HUD readout). React bails on same-value sets, so extra renders only happen when the rounded metre figure actually changes; no effect re-runs (none depend on it). No data is written anywhere — it is render-only state.
2. `_drawRouteLines` now draws up to three polylines per segment (glow underlay + the original core line + flow dash) instead of one. The **core line is byte-identical in options, color, weight, dash and popup**; the extra layers are `interactive:false`, so every click still lands on the core line, and all layers go into `_lRouteLines`, so Clear removes everything exactly as before.
Also: the "Analyzing…" button state previously rendered near-black text on a near-black background (invisible); per the restraint gate ("legibility wins") it now renders teal-on-dark with a teal hairline border. Same text, same behavior, now readable.

---

## 1. Tactical HUD chrome — DONE
- **Where:** `app/index.html` map CSS block (`.mfab`, `.map-add`, `.map-toast`, the Leaflet `.leaflet-bar a` overrides) + new `.map-hud`/`.map-hud-inner` classes; the strip itself renders in `LinesTab`'s map stage JSX (grep `map-hud` in app.jsx).
- **How:** every floating instrument is now glass — `rgba(13,21,33,0.72)` + `backdrop-filter: blur(12px)` (with `-webkit-` twin), 1px `rgba(45,212,167,0.25)` border, `inset 0 1px 0 rgba(255,255,255,0.06)` highlight top. Active states glow: `.mfab.on` teal, `.mfab.rec` red (the committed danger token), the enabled Analyze button gets a soft teal outer glow. Teal `:focus-visible` rings added to `.mfab` and the Leaflet zoom anchors; `.map-add` gets a text-color ring (it is teal-filled).
- **Status strip:** slim pill centered along the map's top edge, between the zoom control (left) and the fab cluster (right) — `pins · GPS ±m · active layer` in 10px 0.14em-tracked caps, values in ui-monospace tabular-nums. `aria-hidden` (it duplicates the stats strip below the map for a11y). GPS accuracy shows **only** while live tracking is on and the watch has reported a figure; otherwise the strip says `GPS —` — never faked.
- **Reduced motion:** nothing here animates.
- **Perf:** static styles; `backdrop-filter` on five small (≤44px) elements + one thin pill is well within mobile budget.

## 2. Living mainlines — DONE
- **Where:** `_drawRouteLines` in app.jsx; CSS `.sr-line-glow`, `.sr-flow-dash`, `@keyframes srFlow` in index.html.
- **How:** per segment, three layers: (a) glow underlay — same grade color, core weight +7, opacity 0.3, `className:'sr-line-glow'` → CSS `filter: blur(5px)` on the SVG path; (b) the core stroke **unchanged** (grade-colored data palette, solid ≥1%, static `8,5` warning dash <1% — exactly as shipped); (c) on segments with grade ≥1% only, a thin white dash (`5,17`, weight 2, opacity 0.55) animating `stroke-dashoffset` 0→−22 (one full period) at 1.5s linear — sap visibly sliding from→to. White is the app's neutral highlight tone, not a data color, so the grade palette stays unambiguous.
- **Direction honesty:** the analysis builds every line high→low (trees sorted by elevation, tank last), so the segment's from→to direction IS downhill whenever grade > 0; flow is gated on the analysis result (grade ≥1.0), and uphill/flat segments never flow — they keep their static warning dash. No flow is ever invented.
- **Reduced motion:** `.sr-flow-dash { animation:none; display:none }` — the overlay vanishes entirely, leaving the map exactly as it was before this pass.
- **Perf:** one CSS animation shared by all flow paths; `stroke-dashoffset` is cheap per the brief's spec. Blur is computed once per paint of the glow paths; no per-frame JS anywhere.

## 3. Marker presence — DONE
- **Selected pin pulse:** `_sbMakeIcon` (tree branch) injects a single `<div class="sr-pulse">` when the pin is selected — one element, `transform: scale` + `opacity` keyframes (1.8s), centered on the trunk foot (the marker's true coordinate). The rimmed faceted-maple SVG itself is untouched, per BIBLE §5b.
- **New pin drop:** `_dropPin` adds `.sr-drop` (250ms scale-settle, transform-origin at the foot) to the marker's **inner wrapper** after render — never the Leaflet icon element, because Leaflet owns that element's `transform` for positioning. Init-time renders of saved pins don't animate (the class is added only in `_dropPin`).
- **Top Tank Spot amber glow:** interpreted as the **#1 suggested spot marker** (tank *pins* carry no ranking; a placed spot becomes an ordinary pin). The rank-1 marker's wrapper gets `.sr-spot-top` — a static amber `drop-shadow` glow, no animation. Flagged for Damian: if he meant something else by "tank pins," say so and it moves.
- **Reduced motion:** pulse freezes as a faint static ring (still communicates selection); drop-settle is disabled.
- **Perf:** both animations are transform/opacity on single elements.

## 4. Analysis theater — DONE
- **Radar sweep:** `_sbScanSweep()` (module helper) appends a `.sr-scan` overlay div to the map container when `analyzeRoutes` starts, removes it after 1.3s. The sweep is a rotating conic-gradient pseudo-element (one 360° turn, 1.2s, `transform: rotate` only). JS checks `prefers-reduced-motion` and **skips the append entirely**; the CSS also hides `.sr-scan` under reduced motion as belt-and-braces. Wrapped in try/catch; touches no map state.
- **Staggered results:** the route-results card, each per-line card (60ms × index), the Materials Estimator (120ms), the Tank Spots card and each spot row (60ms × index) get `.sr-rise` — a 0.32s slide-fade (opacity + translateY(8px)).
- **Medal tier:** spot #1 gets an amber glow border (`rgba(235,154,51,0.55)` + soft outer shadow) and a small "BEST" chip; #2/#3 unchanged.
- **Loading scanline:** the green `routeProgress` box and the "Loading map…" state now carry `.sr-scanline` — a 2px teal sweep (transform-animated inner gradient), no spinner anywhere. Under reduced motion it becomes a static half-opacity line.
- **Perf:** sweep and rise are transform/opacity; the sweep element exists for 1.3s then is removed from the DOM.

## 5. Depth & atmosphere — DONE
- **Vignette:** `.map-stage::after` — inset dark box-shadow, `pointer-events:none`, z-index 650 (above tile/marker panes, below popups at 700 and controls at 1000), `border-radius:inherit` so the desktop rounded frame keeps its corners.
- **Glass depth:** 1px `rgba(255,255,255,0.06)` inset highlight tops on every glass instrument (see §1).
- **Instrument readout:** the node-by-node flow diagram now sets elevations, grades and distances in ui-monospace tabular-nums (`_MONO` shared style const in the map band); node circles and grade connector bars get a soft same-color glow. Connectors stay **grade-colored, not teal** — the grade color is data, and the restraint gate says data legibility beats the teal glow language; the glow treatment carries the instrument feel instead. Stats-grid values, bad-segment chips, tank-spot coords/elevations, pin-panel coordinates, the ±m accuracy chip and the elevation input all get the same tabular-nums monospace.

## 6. Restraint gate — honored
- Only two looping animations exist: the sap-flow dash and the selection pulse ring. Nothing bounces; entrances play once.
- Every color used is from the BIBLE/app palette (teal `#2dd4a7`, amber `#EB9A33`, card `#0d1521`, danger `#f85149`, the existing grade/data palette) plus neutral white as highlight.
- Glass panels use ≥0.72 opacity dark ground; strip values are `#e6edf3` on `rgba(13,21,33,0.72)`-over-imagery — worst case still >7:1 against the blurred dark glass.
- Cut per the gate: teal-recoloring the flow-diagram connectors (would erase grade data — see §5); animating the glow underlay (static glow reads cleaner and is cheaper).

## Housekeeping
- `app/sw.js` cache `sweetrun-v16` → **`sweetrun-v17`** (once, at the end).
- `app/app.js` untouched. No new `sg_*` keys, no storage writes added, no TR strings needed (the strip is numeric + existing-term caps; report flags this — see eyes-on #6). All ARCH invariants hold.

## Needs eyes-on after deploy
1. **The flow dash** on a real analyzed line: direction reads downhill, white glint visible on green/amber lines, not noisy at low zoom; check on a mid-range Android for jank with 20+ segments.
2. **The HUD strip at 375px:** fits between zoom and cluster with tracking on (`14 PINS · GPS ±8M · LEAF-ON` is the long case); ellipsis behavior if it overflows.
3. **Radar sweep**: covers the whole viewport on tall phone maps (the sweep disc is sized 280% of container width); verify no visible edge on very tall stages.
4. **Vignette vs popups**: open a pin popup near the map edge — the popup must read clean above the vignette.
5. **Glass blur** on older iOS Safari (backdrop-filter support) — falls back to the 0.72 solid tint, which was chosen to stand alone; confirm it looks intentional.
6. **HUD strip language:** "PINS/GPS/SAT/LEAF-ON" render as-is in FR (they're map-band terms already used untranslated in-app: the imagery row is EN-labeled today). If Damian wants FR strip labels, it's a 4-key TR addition.
7. Selected-tree pulse ring alignment on the trunk foot at zoom 16–19; drop-settle on a fresh GPS pin.
8. `prefers-reduced-motion` device pass: no sweep, no flow, no pulse motion, static scanline — map otherwise identical to Pass 3.

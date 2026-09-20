# Pass 4-Map — the flagship sugarbush map
**Executed 2026-09-20. Edits in `app/src/app.jsx`, `app/index.html` (CSS), `app/sw.js` (host list + cache bump v18→v19), `tests/formulas.test.mjs`. Never touched `app/app.js`. No new dependencies — Leaflet + CSS + inline SVG only.**

**Verification used throughout:** after every batch — `cp app/src/app.jsx /tmp/app.jsx && SWEETRUN_SRC=/tmp/app.jsx node tests/formulas.test.mjs` → **59 passed, 0 failed** (53 + 6 new measure-math assertions); full compile via `/tmp/sr-check` (`node compile.mjs` → COMPILE OK 667,956 bytes; `node evalrun.mjs` → RENDER CALLED / EVAL OK). The sandbox still cannot serve these files to the browser pane, so the app itself was **not visually verified** — but the tile sources, the blend-mode choice, and the terrain-only tint WERE visually verified in the browser against real tiles (screenshots taken during the session).

---

## 0. Tile-source verification (done FIRST, in the browser, before wiring anything)
Method: `new Image()` loads from `https://sweetrun.app` origin, z=13 over Maine (lat≈44.55, lon≈-69.6 → x=2512, y=2961 by standard slippy math). All three requested templates returned real tiles — `onload` fired, naturalWidth × naturalHeight = **256×256**:

| Source | URL template | Result |
|---|---|---|
| A. Esri World Hillshade | `services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}` | **OK — ships** as the terrain source |
| B. USGS Topo | `basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}` | **OK — ships** as the topo base |
| C. USGS Shaded Relief | `basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}` | OK — verified working, held as the documented fallback for A; not wired (A works) |

**Blend-mode choice (visually compared on real tiles — Sugarloaf z13/z14, flat river-valley z14):** `multiply` ships. On satellite greens, which sit near mid-gray, `overlay`'s brightening half cancels most of the relief and the terrain washes out; `multiply` keeps every hillshade shadow, so ridges and gullies actually carve through the canopy. Default opacity 0.55, user slider 0.2–0.9. Also compared `soft-light` (weakest of the three).

## 1. Terrain ("LiDAR") layer — DONE
- **Where:** `_sbApplyBase`, `_sbTuneRouteGlow`, `_SB_HILLSHADE_URL`, `_SB_THUMB` in the map band (grep those names); CSS `.sr-terrain-pane`, `.sr-terrain-tint` in app/index.html.
- **`mapType` is now a 5-value enum:** `'satellite' | 'sat-terrain' | 'terrain' | 'topo' | 'street'`, applied by `_sbApplyBase` (declarative want-table; layers created lazily once per map instance, stored on `_lMap` like the existing `_sat/_labels/_street`).
- **Terrain overlay (`sat-terrain`):** hillshade tiles in a dedicated Leaflet pane `sr-terrain` at zIndex 250 (above tilePane 200, below overlayPane 400) with CSS `mix-blend-mode: multiply`, opacity 0.55, `maxNativeZoom:16, maxZoom:20` (Leaflet upsamples past 16 instead of blanking). Opacity slider (0.2–0.9, step .05) lives in the Layers panel under the row, applied live via `setOpacity` — no layer re-add.
- **Terrain only (`terrain`):** the same hillshade as a normal base layer with CSS class `sr-terrain-tint` — `sepia(0.45) hue-rotate(55deg) saturate(0.55) brightness(0.85)` warms the clinical gray toward the brand's gray-green (verified on a real tile: soft warm green-gray, relief fully preserved; dark-rimmed pins and the dark glass HUD read cleanly on it).
- **Layers panel:** the layers mfab no longer flips sat↔street directly — it opens a glass sheet (`.sheet-glass`, Pass 3.5 glass values: 0.9 dark ground + blur(16px) + teal hairline + inset highlight). Every mode is a `_LyRow`: 44px tile thumbnail (`_SB_THUMB`, one representative Sugarloaf z13 tile per source; the Sat+Terrain thumbnail stacks hillshade over imagery with the live pane's own multiply — the thumbnail IS the preview), name, sub-line, teal check when active, `aria-pressed`, focus ring. Two sections: Base map (5 rows) and Seasonal imagery (Live/Leaf-on/Leaf-off/Compare — same `seasonMode` state the existing pill drives; the pill below the map is untouched and stays in sync because both write the same state).
- **HUD strip** now reads `Sat+Terrain` / `Terrain` / `Topo` / `Street` / seasonal values as before.

## 2. Topo layer — DONE
USGS Topo as a base row (`maxNativeZoom:16, maxZoom:19`), attribution `USGS The National Map`. Row sub-line carries the coverage note: “Contours, water, names · US coverage” / «Courbes, eau, noms · Couverture É.-U.». Outside the US Leaflet shows blanks, as briefed.

## 3. Measure tool — DONE
- **Formula band** (inside the test-extracted region): `SR_EARTH_M = 6378137` (the same sphere `haversineFt`'s 20,925,524 ft radius encodes — the two can never disagree), `srHaversineM`, `srPolyAreaM2` (spherical shoelace, Chamberlain–Duquette), `SR_M2_PER_ACRE`, `SR_M2_PER_HA`. **6 new assertions**: 1° lon at equator ≈ 111,319.49 m; 1° lat at 45°N same; zero distance; 100 m square at 45°N ≈ 10,000 m² (±5); that square ≈ 2.4711 acres; <3 points → 0. Suite 53 → **59**.
- **UI:** new ruler mfab (existing `I.ruler` stroke icon) arms the tape (`.on` teal state, `aria-pressed`). Armed: map taps append vertices — amber (#EB9A33) dashed polyline + amber-rimmed vertex dots; running Distance in **ft AND m** (tabular-nums mono) in a glass readout panel (`.map-measure`, amber-bordered, bottom-left; the mode-picker `map-add` button hides while armed since taps don't drop pins). At ≥3 vertices the first dot fills amber and a “Close the loop” chip appears; tapping either closes the ring → polygon fill + **Perimeter (ft/m) and Area in acres AND hectares**. Chips: Undo last, Clear, Done (Done disarms and wipes). HUD strip shows the live ft total (or acres once closed).
- **Correctness details:** vertex dots are `bubblingMouseEvents:false` — without that, closing the ring would ALSO lay a vertex on the same tap (Leaflet Paths bubble to the map by default). Closed ring ignores further taps. Numbers formatted per app language (fr-CA grouping in French).
- **Ephemeral + non-interfering:** no storage writes anywhere; module layer list `_lMeasureLayers` cleared on Done, on disarm, and in the unmount cleanup. The map-click handler's disarmed path is the original `_dropPin` call, unchanged.

## 4. Offline coverage — DONE
- **SW (`app/sw.js`):** `basemap.nationalmap.gov` added to the `isTile` hostname list; `services.arcgisonline.com` (hillshade host) was already listed. Tile cache name stays `sweetrun-tiles-v1` (invariant 3). App cache bumped **v18 → v19** (once).
- **Save offline** (`_sbCacheTiles`) now takes the active `mapType`: satellite → sat + labels (byte-identical URL list and count math, divisor 2); `sat-terrain` → sat + labels + hillshade (hillshade only to z16, its native max); `terrain` → hillshade only; `topo` → topo only; street keeps the historical sat+labels behavior. Reported tile counts stay honest via a per-mode fetches-per-tile divisor. New guard: an empty URL list (only possible zoomed past 16 in terrain/topo modes… which can't happen since minZ ≤ 17 forces z16 inclusion — belt-and-braces) returns a friendly error instead of “0 saved.”
- **CSP:** `_headers` contains **no CSP at all** (cache-control only), so nothing blocks the new hosts; per the brief, nothing was added.

## 5. Polish — DONE
- **Attribution:** each layer carries its own Leaflet attribution (`Hillshade © Esri`, `USGS The National Map`, existing `Imagery © Esri` / `© OpenStreetMap` / `USDA NAIP` / `Esri Clarity`); Leaflet's attribution control updates automatically as layers add/remove — the line always matches the active stack.
- **Flow lines over terrain:** multiply dims what's under it, so `_drawRouteLines` now draws the glow underlay at 0.5 (vs 0.3) and the flow dash at 0.75 (vs 0.55) when a terrain mode is active, and `_sbTuneRouteGlow` restyles already-drawn lines on every base switch (identified by className; the core grade-colored stroke is data and is never touched). Defaults with terrain off are the exact Pass 3.5 values.
- Everything new is in the Pass 3.5 glass/HUD language (dark glass + blur, teal hairlines, inset highlights, tabular-nums mono values, 10–11px tracked caps, focus rings). **Nothing new animates** — reduced-motion needs no new rules (checked: measure, panel, slider, tint are all static).

## Functionality diff (target: only the additions) — honest statement
Everything below is either a brief-sanctioned change or invisible when the new features are idle:
1. **Layers mfab** no longer directly toggles sat↔street; it opens the Layers panel (task 1 sanctions this: “the layer button/sheet becomes a proper glass Layers panel”). Street remains one tap deeper.
2. **Map click handler** gained the measure gate; disarmed, the code path is the original `_dropPin` call.
3. **`_sbCacheTiles`** gained a mode parameter; in satellite (the previous only behavior) the URL list, MAX check and count math are unchanged.
4. **Route glow/flow opacities** are now terrain-conditional; with terrain off they equal Pass 3.5's constants.
5. **`map-add` hides while measuring** (taps don't drop pins in that state, so the button would lie).
6. HUD layer readout extended for the new modes; satellite/street/seasonal readouts unchanged.
Unchanged and verified present: seasonal pill below the map, compare slider (its tilePane clipPath logic is untouched — the terrain pane is deliberately separate), XY entry, GPS drop/track, undo-pin fab, Save offline card, pin panel, analyze/tank-spot flows, property import.

## Needs eyes-on after deploy
1. **The flagship shot:** analyzed mainlines + Sat+Terrain at 0.55 over a real sugarbush — glow/flow legibility, and whether the Esri place-label layer (which sits under the multiply pane) dims too much in deep terrain shadow. If labels suffer, the fix is a dedicated labels pane above `sr-terrain` (one-line change, noted here deliberately — not done to keep satellite mode byte-identical).
2. Layers panel thumbnails on first open (six tile hosts; OSM street thumb subject to osm.org tile policy) and the compare row's half-clip thumb.
3. Measure at 375px: panel + chips wrap, first-dot tap target at z16–19, HUD ft readout. Tapping an existing tree marker while measuring still opens the pin panel (markers swallow their own clicks) — deliberate, but confirm it doesn't annoy in the field.
4. Six-button mfab cluster height on short viewports (≈308px + toast clearance).
5. Terrain-only tint on device (verified on one real tile in-session; check a full screen of it), and topo blanks outside the US showing the row's coverage note is explanation enough.
6. Save offline in each new mode, then airplane-mode the phone and reopen (SW v19 must be active first).
7. Reduced-motion pass: nothing new should move (nothing new animates by construction).

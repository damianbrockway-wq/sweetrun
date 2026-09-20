# PLUMB REPORT — SweetRun first full read
**Date: 2026-09-19 · Every finding cites file:line. Plain language throughout.**

## What was actually read
- `app/src/app.jsx` — **all 10,339 lines, end to end**, in eleven sequential sections. No region was merely scanned.
- `app/index.html` (structure, CSS tokens, SW registration — the one 122,957-character line, an inlined data-URI manifest at line 13, was truncated, not read byte-for-byte), `app/sw.js` (all 127 lines), root `sw.js`, `_headers`, `manifest.json`, `package.json`, `babel.config.json`, `worker/src/index.js` (all), `worker/wrangler.toml`, `draw-off-calculator.html` (script section full read).
- **Not read**: the landing page `index.html` body (1,299 lines — only its script location and formula references were grepped); the other three calculator pages beyond their formula lines; the compiled `app/app.js` (generated artifact); docs (`SWEETRUN-*.md`, `bl2-reports/`); `node_modules`. The measurements (`wc`, `grep` counts, gzip size) covered everything regardless.

## The one thing to do first
**Write characterization tests for the formula layer — before touching anything else.** The math lives in one pure band (app.jsx:699–830: rule86, syrupY, boilTime, finTemp, denCorr, brixToBe, altToBP, yield models). A plain Node script asserting ~20 known values costs half a day, needs no framework, and is the safety net for every other fix below. The proof it's needed already exists in the code: the app currently computes the Rule of 86 with **two different divisors** (finding 2), and nobody noticed because nothing checks.

---

## Findings, ranked by severity

### 1. HIGH — Zero tests on math that users spend money on
- Evidence: `find` for test/spec files returns 0 across the repo. The formula layer (app.jsx:699–830) is pure functions — the cheapest possible thing to test — and is untested.
- Why it matters: a producer reads "finish at 219.1°F" or "you need 7.2 cords" and acts on it with real fuel and real syrup. Findings 2, 3 and 9 below are all defects this net would have caught.

### 2. HIGH — The Rule of 86 disagrees with itself inside one app
- Evidence: `rule86 = 86 / b` at app.jsx:700 and RecapTab's `theorRatio = 86 / sapBrix` at :8717 — versus `86.4 / brix` at :2390 (TappingTab), :7269 and :7280 (SeasonIntelligence), :8391 and :8402 (SweetRunScore), :8484 (YieldGapAnalyzer), :9239 (TodayTab).
- The kicker: RecapTab renders SweetRunScore (86.4) and its own 86-based "Theory" figure **on the same screen**. At 2°Brix that's 43.0:1 vs 43.2:1 — small, but visibly inconsistent to the exact expert audience the app courts. One constant fixes it.

### 3. HIGH — A shipped feature is silently dead: the SugarSage brix sparkline
- Evidence: SeasonTab writes `sg_brixlog` as a **flat array** of `{id, date, brix, note}` (app.jsx:3971). SeasonIntelligence reads it as an object keyed by season and maps `e.val` (:7221–7222): `ls.get('sg_brixlog',{})[season]` is always `undefined`, so `sparkData` is always empty and the "BRIX TREND THIS SEASON" card never renders — for anyone, ever. RecapTab (:8733) and DiagnoseTab (:9366, correctly commented "stored as flat array") read the same key correctly, proving the shape drifted in one consumer.
- Related dead code: DiagnoseTab reads `sg_lines_results` (:9565) — a key **no code ever writes** (grep: 1 occurrence in the whole file). Diagnostic #6 ("line grade check") can never fire.

### 4. HIGH — The money math now lives in six places
- Evidence: besides app.jsx, `draw-off-calculator.html` script lines 3–6 restate altToBP/presToBP/finTemp; `sap-to-syrup-calculator.html`:139–141 restate rule86/jones87/syrupY; `tap-calculator.html`:153 hardcodes `RATIO_2BRIX = 43`; the DE page carries its own rates. This was a deliberate same-day-ship decision (logged), but the interest is already accruing: a divisor fix from finding 2 must now be applied in up to six files or the free pages and the paid app will disagree in public.

### 5. MEDIUM — localStorage is an 80-key database with no schema version and duplicate facts
- Evidence: 80 unique `sg_*` keys (grep inventory below). The syrup price alone lives in four places: `sg_syrup_price` (:8478), `sg_dx_price` (:9350), `sg_bev_price` (:7431), and `sg_wizard_data.syrupPrice` (:936) — change it in one screen and the other three keep the old number. Labor rate similarly in three keys. There is no `sg_schema_version`; the backup file has `format:1` (:9968) but the live store has nothing to migrate against.
- Why it matters now: **cloud sync is on the roadmap.** Sync needs a stable, versioned schema and collision-safe IDs; entry IDs are `Date.now()` (with `+1` hacks at :3224–3225 when two rows are written in one action). This is the wall the roadmap will hit.

### 6. MEDIUM — Log dates are stored as locale-formatted strings, then re-parsed
- Evidence: `date: new Date().toLocaleDateString()` at :3093 and :3553; later sorted/compared with `new Date(b.date)` at :3075 and :3207; season length computed from these strings at :8729.
- On a phone set to French (France) locale, `toLocaleDateString()` yields `19/09/2026`, which `new Date()` misreads or rejects → wrong sort order, wrong season length, wrong year-over-year. The roadmap explicitly targets **French market growth**; this bug is invisible on en-US devices and waiting there. (fr-CA happens to emit ISO-like dates, which is why Quebec testing wouldn't catch it either way — fr-FR devices will.)

### 7. MEDIUM — Update delivery depends on a human remembering to bump a string
- Evidence: `const CACHE = 'sweetrun-v13'` (app/sw.js:5); commits d6e5acd → ce0b994 → a9b7c1c bumped v11→v12→v13 manually within one day. `app/index.html`:589 documents the ritual ("To force all users to get the latest app: bump CACHE name").
- One forgotten bump after, say, the finding-2 fix leaves installed phones on the wrong math indefinitely. A build-time stamp (git hash into the cache name) removes the human from the loop.

### 8. MEDIUM — One 10,339-line file; the map runs on module-level mutable globals
- Evidence: wc -l = 10,339; 41 components; 1,540 inline style objects; Leaflet state in file-scope mutables `_lMap, _lMarkers, _lRouteLines, _lSpotMarkers, _lPropertyLayers…` (:4312–4326) reset by a unmount cleanup (:4929–4945).
- Cost today: every edit session loads/patches one giant file (this month's hand-patched-compiled-file incident is the symptom); no second contributor could work here. The internal banding is actually good — formulas, translations, icons, screens are clearly zoned — which makes an incremental split cheap when the tests from finding 1 exist. Order: formulas → storage → map → SugarSage KB data.

### 9. LOW — The app contradicts itself in copy
- Evidence: custom-pan boil rate computed as `area * 2.5` GPH (:2559, comment "~2.5 gal/hr per sq ft") while the caption two lines of UI later says "estimated X GPH **at 1.5 gal/ft²/hr**" (:2630). And SugarSage KB entry evap_01 claims "10–15 gal/hr per square foot" (:6808) — 4–5× the figures the app's own PAN_SIZES table implies (:723–733, ~2–3 gal/hr/ft²). Expert users notice this kind of thing first.

### 10. LOW — The licensing leg is built but unplugged, and enforcement is honor-system
- Evidence: `LICENSE_API = ''` (app.jsx:32) disables worker pings and key lookup; the worker (worker/src/index.js) correctly verifies Stripe webhook signatures and mints Ed25519 keys, but `wrangler.toml` still says `id = "REPLACE_WITH_KV_NAMESPACE_ID"` — it has plausibly never been deployed. In-browser verification silently accepts unsigned-but-well-formed keys on browsers without Ed25519 (:49), and the trial lock is a client-side flag. For a $49.99 hobbyist tool this is a reasonable posture — but **the purchase→key-delivery path has an untested leg**: success.html fetches the key from a worker that may not exist. One live test purchase would settle it.
- Positive security notes, for the record: no secrets tracked in git (`worker/.dev.vars` is gitignored and verified untracked), map popup inputs are HTML-escaped (`_sbEsc`, :4317), the data-on-device promise is honored, and error paths (storage quota, trial lock, offline) surface honest banners rather than failing silently.

### 11. LOW — Payload and third-party services: fine today, watch tomorrow
- app.js is 639 KB raw / **165 KB gzipped**, unminified (`--minified` is a free ~40% cut when the build is next touched). Five CDN libraries, all version-pinned and SW-cached after first visit. Two unpinned external *services* can die silently: api.qrserver.com (batch labels break) and web3forms (leads vanish; its access key is public in the client at :83 — by that service's design, but it invites spam).

---

## Bench scores (evidence in ARCH.md §4)
Boundaries 3 · State & data 3 · Error paths 6 · Testability 2 · Build & deploy 4 · Dependencies 6 · Performance 5 · Evolvability 3 · Security posture 6.

## Appendix — the 80 `sg_*` keys (grep, app.jsx)
sg_autocopy, sg_batches, sg_bev_fuel, sg_bev_hobby, sg_bev_lhrs, sg_bev_lrate, sg_bev_price, sg_bev_supply, sg_bev_taps, sg_bottlecost, sg_bp, sg_brix, sg_brixlog, sg_checks2, sg_cpoints, sg_custom2, sg_dbh, sg_ddlat, sg_ddloc, sg_ddlon, sg_ddstart, sg_dx_labor, sg_dx_price, sg_dx_robrix, sg_dx_vac, sg_dx_wood, sg_email_prompted, sg_equip2, sg_filtercost, sg_fresh_start, sg_fresh_status, sg_fuel, sg_fuelcost, sg_laborhrs, sg_laborrate, sg_lang, sg_last_tab, sg_license, sg_lines_pins, sg_lines_results (read-only, never written), sg_log_last_kind, sg_logs2, sg_mainlines, sg_mainsize, sg_map_beta_dismissed, sg_matprices, sg_notif_checked, sg_onboarded, sg_operator, sg_othercost, sg_panH, sg_panIdx, sg_panW, sg_property_geo, sg_pump_gpm, sg_pump_lift, sg_pump_line, sg_pump_setup, sg_pump_tank, sg_recap_burn, sg_recap_evap, sg_recap_preheat, sg_retailmargin, sg_rotation, sg_season, sg_sessions, sg_spoutcost, sg_spoutidx, sg_syrup_price, sg_treenotes, sg_trees, sg_trial_pinged, sg_trial_start, sg_units, sg_vacsystem, sg_vacuum, sg_wizard_data, sg_wizard_done, sg_wx_lat, sg_wx_lon, sg_wx_name.

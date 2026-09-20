# /debug report — SweetRun functional-defect scan (code audit)

**Scope:** `app/src/app.jsx` (10,339 lines), `app/app.js` (compiled), `app/sw.js`, `app/index.html`, root `sw.js`, public calculator pages.
**Method:** full read of app.jsx, cross-checked against the compiled bundle; every numeric claim below was recomputed (Node) — worked examples included.
**Focus:** functional correctness only (per brief). No code was modified.

**Verdict:** The core calculators (Rule of 86, boil time, RO concentration, finishing temp, DE, Baumé, tap counts) are mathematically sound and match the public calculator pages. The defects cluster in five areas: litre-mode unit handling, the Diagnose money math, comma/date parsing, the service worker's fake-200 offline responses, and the trial-lock UX.
**Critical 3 · High 7 · Medium 12 · Low 11**

**Top 3:**
1. Diagnose invents absurd dollar savings — `woodCost` applied twice and a 128 gal/cord constant — `app/src/app.jsx:9459-9468` (see also `:9487`, `:9518`)
2. `srParseNum("1,500")` → **1.5** — a US-style thousands separator silently divides a logged value by 1,000 — `app/src/app.jsx:836-843`
3. Litre mode is internally inconsistent: the same stored total renders 3.785× larger on Today/PDF than on Log/Recap — `app/src/app.jsx:9229,9296` vs `:3252`

---

## 🔴 Critical

**[C1] Diagnose RO math: dollars-squared and a wrong cords constant** — `app/src/app.jsx:9459-9468, 9487, 9500, 9518`
- What: In the "RO underutilized" finding, `potentialFuelSave = (evapGal - roGal) * 0.6 * (woodCost/128)` is labeled "cords saved," then the payback multiplies by `woodCost` **again**: `roi: potentialFuelSave * woodCost`. Worked example (evap 1,000 gal, RO 100 gal, wood $80/cord): **337.5 "cords saved," $27,000 payback**. Physically correct answer: ~0.5 cord, ~$43 (the app's own `FUELS` table says 1 cord boils ~1,000 gal of sap, `:739`). The "No RO usage" branch (`:9487`) and the RO-Brix ROI (`:9518`) repeat the 128 constant and/or the double-`woodCost`.
- Why it matters: Diagnose exists to give producers dollar-denominated purchase advice ("RO pays back in 1–3 seasons"). These numbers are off by 2–3 orders of magnitude and roll up into the "Total identified opportunity" banner (`:9862-9868`). Anyone acting on it is being materially misled. This alone blocks Diagnose from leaving beta.
- Fix: cords saved = `galNotROd * 0.6 / 1000` (reuse `FUELS[0].spu`); dollars = cords × `woodCost` once. Audit every `roi:` expression in `runDiagnostics` for dimensional consistency (`:9518` mixes `(woodCost/128)*woodCost` too).

**[C2] Comma input: "1,500" parses as 1.5** — `app/src/app.jsx:836-843` (used by every `NumInput` and the brix fields `:3141, :3600, :3609`)
- What: `srParseNum` replaces the first comma with a period to support French decimals ("2,5" → 2.5, correct). But a US user typing **1,500** gallons gets `"1.500"` → **1.5**. Verified by execution. The value saves silently; the log then shows 1.5 gal instead of 1,500, and every downstream total, ratio, score and PDF inherits it.
- Why it matters: silent 1000× data corruption in the app's primary data-entry path, triggered by the most natural way an anglophone writes a big number.
- Fix: treat `,ddd` (comma followed by exactly 3 digits at end, with digits before it and no other separator) as a thousands separator; or strip commas when the locale/lang is `en` and only map comma→period when `lang==='fr'`.

**[C3] Litre mode shows different numbers for the same data on different screens** — `app/src/app.jsx:3252-3254` (Log, raw) vs `:9229,9296-9297` (Today, ×3.78541) vs `:4188,4227` (PDF export, ×3.78541) vs RecapTab `:8706+` (raw)
- What: Log entries are typed into fields labeled "L" when `units==='L'`, so stored values *are* litres. LogTab and RecapTab display them raw (correct). TodayTab and `exportSeasonPDF` run the same stored totals through `conv = v => v*3.78541` — so a producer who logged 100 L sees "100 L" on the Log tab and "378.5 L" on Today and in the PDF report. Season-goal math is split the same way: `goal = trees × yieldMid` is in **gallons** but is compared to litre totals in LogTab's `pct` (`:3051`) while TodayTab converts the goal (`:9236-9237,9290`). Per-tap benchmark comparisons (`:3239-3240`, `:9270-9272`) compare litre per-tap against gal/tap ranges.
- Why it matters: every Canadian/metric user gets contradictory totals, a wrong goal %, and a wrong "above/below the range" verdict — the app's headline judgments.
- Fix: pick one canonical storage unit (gallons is least invasive: convert on save when `units==='L'`), then convert only at display. Add a one-time migration keyed off `sg_units`.

## 🟠 High

**[H1] Literal `°` / `—` text renders on the Weather tab** — source `app/src/app.jsx:6534-6535, 6555, 6568-6569, 6602, 6606`; compiled proof `app/app.js` contains `day.hiF,"\\u00b0"`
- What: `\uXXXX` escapes written in **JSX text** (not string literals) are preserved literally by Babel; the compiled bundle provably contains double-escaped `"\\u00b0"`. Users see `45°` in the 7-day score strip, `45°F` in the day detail, `Mon — Mar 3`, `✓` in the ideal-days line, and `ΔT` in the model-notes paragraph.
- Fix: replace with `{'°'}` expressions or the actual characters (°, —, ✓, Δ). 10 spots, all in `WeatherTab`.

**[H2] Service worker fakes a 200 response when offline — every API error path in the app is unreachable** — `app/sw.js:56-65`
- What: for open-meteo/geocoding/qrserver/nominatim, the SW catches fetch failure and returns **HTTP 200** with `{"error":"offline"}`. Callers' `catch` blocks (`Could not load weather… Check connection`, `Search failed.` etc., e.g. `app/src/app.jsx:1231, 1260, 6318, 6372`) can then never fire. Offline behavior becomes: geocoding shows **"Location not found."** (wrong — implies the place doesn't exist), WeatherTab renders an empty forecast with "No good run days this week" (wrong — implies a real forecast of no runs), FreezeThaw badge logic never gets data. Note `archive-api.open-meteo.com` (degree-days) is *not* in the list, so SeasonTab still errors correctly — inconsistent by accident.
- Fix: return `Response(status: 503)` or `Response.error()` and let each caller's existing catch/`d.error` path run; or check `d.error === 'offline'` at every call site (worse).

**[H3] Trial-expired lock turns routine UI writes into scary "entry not saved" alerts** — `app/src/app.jsx:5-7, 21, 10032, 10274-10283`
- What: when the trial expires, `SR_LOCKED` blocks every `ls.set` outside a 7-key allowlist. But the app persists *UI state* through the same path: `sg_last_tab` on every tab switch (`:10032`), `sg_panIdx/sg_panW/sg_laborhrs/...` on EvapTab mount (`:1545-1554`), `sg_checks2` on TasksTab mount, `sg_dx_*`, `sg_bev_*`, etc. Each write failure fires the red alert bar "That entry was not saved. Your Season Trial has ended…" — so an expired user gets a data-loss warning just for switching tabs, and their tab position / settings genuinely stop persisting even though "viewing always works" is the promise (`:9927`).
- Fix: only route *data* writes through the lock (whitelist UI-state keys, or invert: blocklist `sg_logs2`, `sg_batches`, `sg_treenotes`, `sg_rotation`, `sg_equip2`, `sg_lines_pins`, `sg_brixlog`…), and only show the banner for those.

**[H4] Tapping tab "Vacuum System?" selector does nothing** — `app/src/app.jsx:2359, 2388-2391, 2414-2417`
- What: the select's value (`Gravity / Buckets` / `Low Vacuum` / `High Vacuum`) is stored (`sg_vacuum`) but the sap estimate uses `yieldModelSaved()` — the *wizard's* answers — exclusively. Changing the dropdown changes no output on the screen it sits on.
- Fix: map the tab's own selection to `YIELD_MODELS` (buckets/gravity/natural/vacuum) and prefer it over the wizard default, or remove the control.

**[H5] Break-Even inputs lose keyboard focus after every keystroke** — `app/src/app.jsx:7462-7478` (`BevInput` declared inside `BreakevenCalculator`'s render)
- What: `BevInput` is a new component type on every render; typing a digit updates state → re-render → React unmounts/remounts the input → focus (and the `focused` border state) is lost. Entering "300" requires re-tapping the field per digit on mobile. Same pattern (lower impact, buttons only) in the wizard's `Opt` (`:947`) and `LogSection` (dead, see L-list).
- Fix: hoist `BevInput` to module scope and pass props; it takes ten minutes and fixes both Weather-tab and SugarSage-tab instances (`:6650`, `:8062`).

**[H6] SeasonIntelligence brix trend reads the wrong shape twice — permanently dead** — `app/src/app.jsx:7221-7222`
- What: `ls.get('sg_brixlog',{})[season]` — but `sg_brixlog` is a flat **array** (`:3902,:3911`), so `array[2026]` is `undefined` → `[]` always. And even if it weren't, it maps `e.val` while brix entries store `e.brix` (`:3971`). Result: the sparkline never renders, the `brixLog.length>2` "signal" never counts toward confidence.
- Fix: `const brixLog = ls.get('sg_brixlog', [])` and map `parseFloat(e.brix)`. (DiagnoseTab already does this correctly at `:9366`.)

**[H7] Mixed date formats corrupt sorting and shift ISO dates a day** — `app/src/app.jsx:3093, 3553 (locale strings)`, `:2750-2755 (PDF import M/D/YYYY)`, `:2796 ('Day N')`, `:3075, 3207, 9246 (sort via new Date)`, `:8725-8730, 8749 (string sort)`, `:4143 (split('/'))`
- What: three formats coexist in `entry.date`: `toLocaleDateString()` (device-locale dependent — `fr-FR` gives `19/09/2026`, which `new Date()` verifies as **Invalid Date**), ISO `2024-03-16` from CSV import (parsed as UTC → displays **Mar 15** in US timezones; verified), and `3/15/2024` from PDF import. Consequences: entry lists sort wrong or arbitrarily (NaN comparisons), Recap's season-length uses a lexicographic sort where `"10/1" < "9/1"`, `shortDate` shows imported entries one day early, and the trial's 3-sap-day counter counts duplicate dates as distinct when formats differ.
- Fix: store `date` as ISO `YYYY-MM-DD` everywhere (from local components, not `toISOString`), convert legacy values on read once, and format only at display. This kills the whole defect class (H7, parts of M-list).

## 🟡 Medium

**[M1] Diagnose line-grade check reads a key that is never written** — `app/src/app.jsx:9565`; `sg_lines_results` appears nowhere else in the codebase (verified by grep). `analyzeRoutes` keeps results in React state only (`:5194`). The check silently never runs — dead feature; also a beta-graduation blocker (Map→Diagnose integration doesn't exist).
- Fix: `ls.set('sg_lines_results', results.map(pickSerializableFields))` at the end of `analyzeRoutes`.

**[M2] Ed25519 verify fallback accepts forged license keys on browsers without WebCrypto Ed25519** — `app/src/app.jsx:45-49`. If `importKey/verify` throws (older Safari, most pre-2025 Chrome/Firefox), the signature check is skipped and any structurally valid `base64url({"e":…,"x":"2099-01-01"}).anything` activates a Season Pass. Combined with `LICENSE_API=''` (no server lookup, `:32`), there is no second check.
- Fix: gate the fallback on a capability probe done once (e.g. verify a known-good bundled token); if the probe fails *and* the platform is genuinely old, fall back — otherwise treat a throw as verification failure. Or ship a JS Ed25519 verifier (~1 KB, tweetnacl) as the fallback.

**[M3] CSV export omits Fuel and Hours entries and doesn't escape quotes** — `app/src/app.jsx:3054-3062`. Only 4 of the 6 logged kinds (`fuelUsed`, `boilHours` missing) are exported, so CSV backup is lossy vs what the Log tab records; a note containing `"` breaks the row (`` `"${c}"` `` with no doubling). PDF export has the same 4-kind limitation.
- Fix: iterate `KINDS`; escape with `c.replace(/"/g,'""')`.

**[M4] Import has no dedupe — re-importing the same file doubles the season** — `app/src/app.jsx:2831-2841`. `doImport` always appends. A user who imports the same SugarCalc PDF twice (easy: the preview looks identical) doubles sap/syrup totals with no warning and no undo. Also `:2783`: RO column detection `h.includes('ro')` matches any header containing "ro" ("from", "process", "brown") → phantom RO entries; and `:2792` splits on bare commas, breaking quoted CSV fields.
- Fix: warn when the target season already contains entries with note `Imported (…)`; match ro via `/^r\/?o\b|reverse/`; parse CSV with a quote-aware splitter.

**[M5] `exportSeasonPDF` hard-crashes if jsPDF never loaded** — `app/src/app.jsx:4185` destructures `window.jspdf` with no guard. Offline-first-run (CDN uncached) → `TypeError`, unhandled in the click handler; the PDF button silently does nothing (console error only).
- Fix: `if (!window.jspdf) { alert('PDF export needs one online visit first'); return; }`.

**[M6] Brix log is global, not per-season** — `app/src/app.jsx:3902 (write)`, `:8705 (Recap)`, `:9366 (Diagnose)`. Readings never carry a season; last year's readings pollute this year's Recap avg/min/max, Diagnose's "Brix declining" trend, and SeasonTab's buddy-sap warning (`:3981-3983` compares this spring's first reading to last year's peak → false "Possible Buddy Sap" on day one of a new season).
- Fix: key by season (`{[season]: [...]}`) with a read-time migration, or filter by entry year.

**[M7] Diagnose L-mode unit error in lost-syrup math** — `app/src/app.jsx:9387`: `potentialSyrup = gap*tapCount / (units==='GAL' ? 86/sapBrix : 86/sapBrix*3.785)`. The sap:syrup ratio is dimensionless; multiplying it by 3.785 in litre mode understates potential syrup (and the $ figure) by 3.785×.
- Fix: divide by `rule86(sapBrix)` unconditionally.

**[M8] SugarSage KB states evaporation rates ~5× too high** — `app/src/app.jsx:6808` (`evap_01`): "10–15 gal/hr per square foot… a 2×6 (12 sq ft) should produce 120–180 gal/hr". The app's own corrected `PAN_SIZES` comment (`:719-722`) says real flue rigs run 2–3 gal/hr/ft² (2×6 → 25 GPH). The KB card contradicts the calculator by ~5× and will confuse anyone who reads both.
- Fix: correct the card to 2–3 gal/hr/ft² (and re-check `evap` claims against `PAN_SIZES`).

**[M9] LogEntrySheet can save a comma-decimal brix as the wrong number** — `app/src/app.jsx:3546, 3557`: `parseFloat(brix)` on the raw string. Normal blur normalizes via `srParseNum`, but pressing Enter in the note field (`:3614`) saves while brix may still be `"2,5"` → `parseFloat` → **2**. Same in LogSection `:3097` (dead code).
- Fix: run `srParseNum` in `save()`.

**[M10] `updLog` uses render-closure state, not functional updates** — `app/src/app.jsx:3045-3048`. Two writes in one tick (e.g. import callback + a manual add, or rapid double-tap Save) can clobber each other; `saveEntry`'s auto-copy path was correctly converted to a functional update (`:3221-3229`) but the primary `updLog(kind, ...)` on the line before it (`:3215`) wasn't.
- Fix: make `updLog` functional (`setLogs(prev => …)`), write `ls` inside.

**[M11] Degree-day fetch uses the archive API up to "today"** — `app/src/app.jsx:3916-3919`. Open-Meteo's archive endpoint lags ~5 days; the most recent days come back null → `?? 0` (`:3960-3961`) treats them as hi=0/lo=0 which contributes 0 DD silently — cumulative DD undercounts the last week of the display without any indication.
- Fix: drop trailing null days (`temperature_2m_max[i] == null → skip`) or blend `forecast?past_days=5` for the recent window.

**[M12] Weather/geocode "Loading…"-state regexes and geo search count on 5 results but `searchZip` pages elsewhere use `count=1`** — minor inconsistency; the real issue: **BoilPt GPS fetch** (`app/src/app.jsx:2603`) requests a forecast solely to read `d.elevation` — if the SW fake-200 returns `{error:'offline'}` (H2), `d.elevation||0` → **0 ft** and `setWaterBP(212)` silently, telling an offline mountain producer to finish at 219.1 °F when their true BP may be 209. Data users act on; contingent on H2's fix.
- Fix: treat missing `d.elevation` as an error, not 0.

## ⚪ Low

**[L1]** Custom-pan hint text says "1.5 gal/ft²/hr" but code uses 2.5 — `app/src/app.jsx:1559` vs `:1630`.
**[L2]** `sg_wizard_done` is checked (`:10240`) but never written anywhere; with default `sg_trees`=50 the setup banner condition `trees===0` is also nearly unreachable. Dead logic.
**[L3]** Dead code carrying real bugs that would bite if revived: `FreezeThawWidget` (never rendered; would crash the whole app via ErrorBoundary on H2's fake-200 — `:1284`), `LogSection` (`:3069`, component-in-component with hooks), `_analyzeSegGrades`/`_drawRoutePaths` (`:4388,4444`).
**[L4]** Health-tag quick buttons use `key={t}` (the translation *function*) instead of `key={tag}` — duplicate React keys — `app/src/app.jsx:2486`.
**[L5]** `I.list` icon referenced but not defined (`:5924`) — CardIcon renders empty well.
**[L6]** Wizard firewood estimate uses `syrupMid/30` cords (`:929`) while `FUELS`/KB imply ~25 gal syrup per cord — mildly optimistic, inconsistent constants.
**[L7]** `URL.createObjectURL` never revoked (CSV `:3061`, backup `:9970`) — small memory leak per export.
**[L8]** Compare-slider adds `mousemove/mouseup/touchmove/touchend` listeners to `document` on every activation and never removes them — `app/src/app.jsx:4657-4662`.
**[L9]** Notification-enable prompt doesn't disappear after permission is granted until an unrelated re-render — `:10318-10326` (`requestPermission()` result unused).
**[L10]** Web3Forms access key shipped client-side (`:83`) — spammable lead inbox (accepted risk for this pattern, worth knowing).
**[L11]** Rotation side buttons: selected style mixes teal background with purple border (`:2545`) — likely a leftover from a palette change.

## Trial-date math — checked, sound
`trialStatus()` (`app/src/app.jsx:57-73`) was hand-verified: Oct 15 start → ends Feb 28 next year ✓; Jan start → this Feb 28 ✓; Feb–Apr with <3 distinct sap days → extended to May 1 ✓; leap-day (Feb 29) is unused but harmless (`new Date(y,1,28)` is always valid). Two soft edges: (1) the 3-sap-day count keys off `sg_season`, which the user can change in Settings — pointing at an empty past season re-extends the trial; (2) distinct-date counting inherits the H7 mixed-format issue.

## What blocks Map/Lines and Diagnose from graduating beta
- **Diagnose:** C1 (money math), M1 (route-grade check reads an unwritten key), M6/M7 (brix + unit handling), and the L-mode benchmark comparison. Its rule engine is otherwise reasonable.
- **Map/Lines:** route analysis requires live elevation APIs (Open-Topo-Data has a 100-calls/day/IP limit — a 40-tree analysis plus a tank-spot grid (49 pts batched, ok) can hit it); results aren't persisted (M1); offline tile save exists and works, but the compare-slider leaks listeners (L8) and the NAIP tile endpoint (`gis.apfo.usda.gov`, `:4635`) is a legacy USDA service that should be verified live before graduation. Pin data model and persistence are solid.

## Data-loss surface (summary)
Good news: destructive actions are guarded (`Clear all season data`, `Clear All pins`, mainline delete, backup restore, pin delete — all confirm; entry delete is two-tap armed). Real exposure: **C2** (silent value corruption), **H3** (writes silently dropped post-trial beyond the banner), **M4** (double-import), **M3** (lossy CSV backup — the JSON backup at `:9965-9996` is complete and round-trips faithfully, keep steering users there), and quota failures are handled (`_srFail('quota')` + banner ✓).

## Coverage
Ran: code-logic · data-correctness · error-paths/offline · data-risk · dead-ends/beta review.
Skipped: UX/UI/a11y visual review (assigned to the live-UI agent), performance (nothing egregious found in passing; 640 KB compiled bundle is the main note), security beyond licensing/lead-key (no server surface in this repo).

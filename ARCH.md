# SweetRun — Architecture Ledger
**Kept by Plumb. Read before structural work; update after.**
**STATUS: first full read complete — 2026-09-19. Every line of app/src/app.jsx (10,339 lines) was read, not scanned. Companion detail: audits/PLUMB-REPORT.md.**

---

## 1. The map (full read, 2026-09-19)

### The shape of the building
One single-file React 18 app, compiled by Babel (JSX transform only — no bundler, no minifier, no router, no state library) from `app/src/app.jsx` (10,339 lines) to `app/app.js` (639 KB raw, 165 KB gzipped), served as a PWA from Cloudflare Pages. Around it: a static marketing site at the repo root, four standalone free-calculator pages, and a small Cloudflare Worker for licensing (written but **not wired up** — `LICENSE_API = ''` at app.jsx:32).

### Inside app.jsx, top to bottom (the file has real internal bands)
| Lines (approx) | What lives there |
|---|---|
| 1–90 | localStorage helper `ls` (JSON get/set, quota + trial-lock failure events), license verify (Ed25519 in-browser), season-trial logic, lead pings |
| 93–605 | Formatters + the full EN/FR translation table (`TR`, ~350 keys per language, hand-kept in parallel) |
| 607–697 | SVG icon library (`I`, ~70 icons) |
| 699–830 | **The formula layer**: rule86, jones87, syrupY, boilTime, finTemp, denCorr, Brix↔Baumé, altToBP, presToBP, roConc, PAN_SIZES, FUELS, YIELD_MODELS, tapsPer — all pure, all testable without the UI, none tested |
| 832–1217 | Shared inputs (`NumInput` with comma-decimal parsing) + FirstSeasonWizard |
| 1219–2354 | FreezeThawWidget, SapTab, batch-label PNG generator (canvas + external QR service), EvapTab, ROTab, FinishTab (incl. DE calculator, canning, candy) |
| 2356–3004 | TappingTab, SapImportModal (CSV + SugarCalc-PDF import via CDN PDF.js) |
| 3006–3631 | LogTab (the record) + LogEntrySheet |
| 3633–3889 | EquipTab (incl. transfer-time calc), TasksTab |
| 3891–4308 | SeasonTab (degree days, brix trend), exportSeasonPDF (jsPDF) |
| 4310–6228 | **The Map** (LinesTab): Leaflet loaded on demand, module-level mutable globals (`_lMap`, `_lMarkers`…), pin system, elevation fetch (OpenTopoData→USGS EPQS fallback), route/grade analysis, tank-spot finder, materials estimator, KML/GPX/GeoJSON property import, offline tile cache |
| 6230–6284 | Error boundary + sap-run scoring model |
| 6286–6676 | WeatherTab (Open-Meteo 7-day scored forecast) |
| 6678–8145 | SugarSage: ~45-entry hardcoded knowledge base + keyword search, SeasonIntelligence, BreakevenCalculator, SapFreshnessTracker |
| 8147–8358 | TubingTab (mainline sizing, vacuum, pump) |
| 8360–9137 | RecapTab + SweetRunScore + YieldGapAnalyzer |
| 9139–9346 | SettingsSheet, TodayTab |
| 9348–9888 | DiagnoseTab (9 rule-based checks with ROI figures) |
| 9890–10027 | LicenseModal, BackupModal (export/restore every `sg_*` key as JSON, `format:1`) |
| 10029–10339 | App shell: 5 bottom destinations × 16 screens, header, banners, SW-adjacent boot |

41 top-level function components; 1,540 inline `style={{…}}` objects; 7 `window.confirm` dialogs; zero test files anywhere in the repo.

### State: localStorage is the database
**80 unique `sg_*` keys** (exact inventory in audits/PLUMB-REPORT.md §Appendix). Structured records: `sg_logs2` (seasons→4 entry arrays), `sg_batches`, `sg_lines_pins`, `sg_mainlines`, `sg_cpoints`, `sg_brixlog`, `sg_equip2`, `sg_checks2/custom2`, `sg_treenotes`, `sg_rotation`, `sg_property_geo`. Everything else is a scalar setting. No schema version key; the backup file has `format:1` but the live store does not. Entry IDs are `Date.now()` (with `+1` offsets when two are written together).

### External surfaces (all called from the browser)
- Open-Meteo: forecast, archive, geocoding, elevation (no key)
- Nominatim reverse-geocode; OpenTopoData + USGS EPQS elevation
- Esri/USDA/OSM tile servers (map imagery; cached in a never-purged SW tile cache)
- Esri World Hillshade (`services.arcgisonline.com/.../Elevation/World_Hillshade`) — terrain layer, Pass 4; USGS Topo (`basemap.nationalmap.gov/.../USGSTopo`) — topo base, Pass 4 (US coverage only; `USGSShadedReliefOnly` on the same host is the verified fallback for the hillshade, unwired)
- api.qrserver.com (batch-label QR), api.web3forms.com (lead capture — public access key hardcoded at app.jsx:83)
- Stripe payment link (buy URL hardcoded); Worker endpoints exist (`/webhook`, `/key`, `/event`, `/stats`) but the app's `LICENSE_API` is empty, so pings/lookup are off and leads go via Web3Forms.

### Build & deploy path
`npm run build` = `babel app/src/app.jsx -o app/app.js` (the whole build). Compiled `app.js` is **committed** to the repo. Cloudflare Pages auto-deploys from GitHub main. Cache control: `_headers` (HTML no-cache, SW never-cache, images 1yr) + `app/sw.js` cache name hand-bumped (`sweetrun-v13`) to push updates to installed PWAs. A root `sw.js` exists solely as a kill switch for the legacy `sugarcalc-*` cache.

---

## 2. Invariants (confirmed on full read)

1. **`app/app.js` is GENERATED — never hand-edit.** (Exception logged 2026-09-19; must not recur. Local `npm run build` reconciles.)
2. **All user data stays on-device under `sg_*` keys.** This is a marketed promise ("your data lives on this device only" — BackupModal copy), not just an implementation choice. The backup sweeps every `sg_*` key; any new feature that stores data outside that prefix silently escapes backup.
3. **SW cache bump (`sweetrun-vN`) is required for any app-shell change to reach installed users.** The tile cache (`sweetrun-tiles-v1`) is deliberately never purged.
4. **The formula layer at the top of app.jsx is the single source of truth for the money math** — the yield-model comment (app.jsx:787) records that five divergent copies were once consolidated. New screens must import from it, not restate it. (Currently violated by the 86-vs-86.4 divisor split and the four static calculator pages — see debt #1/#2.)
5. **`ls.set` is the only sanctioned localStorage writer** — it enforces the trial soft-lock and quota failure banner. Direct `localStorage.setItem` is reserved for the two boot-time exceptions (trial start, session count) and the backup restore.
6. **Dates in log entries are display strings** (`toLocaleDateString()`), re-parsed with `new Date()` for sorting. This is load-bearing and fragile (debt #6); do not add new code that stores locale-formatted dates.

---

## 3. Debt register (severity-ranked; evidence → cost of carry → sized fix)

| # | Sev | Debt | Evidence | Cost of carry | Sized fix |
|---|---|---|---|---|---|
| 1 | ~~RETIRED 09-20~~ | Zero automated tests (fixed: tests/formulas.test.mjs, 37 assertions), including the money math users act on | No test files in repo (`find` = 0); pure formula layer at app.jsx:699–830 is trivially testable | Every edit to a 10k-line file risks silently changing figures producers bet fuel and money on; debt #2 and #3 already happened unnoticed | ~half a day: a plain Node test file asserting ~20 known values (rule86, syrupY, boilTime, finTemp, denCorr, brixToBe, altToBP, yield models), run before every deploy |
| 2 | ~~RETIRED 09-20~~ | Two divisors (fixed: RULE_DIVISOR=86.4 everywhere) in one app | `rule86 = 86/b` (app.jsx:700) and RecapTab `86/sapBrix` (:8717) vs `86.4/brix` in 7 places (:2390, 7269, 7280, 8391, 8402, 8484, 9239); RecapTab renders both on the same screen | Same season shows two different "theoretical" ratios; user trust erodes when the numbers disagree with each other | ~1 hr: one `RULE_DIVISOR` constant (pick 86.4 per Jones), used everywhere, locked by the tests in #1 |
| 3 | ~~RETIRED 09-20~~ | `sg_brixlog` wrong-shape read (fixed) → SeasonIntelligence brix sparkline can never render | Written as flat array of `{brix}` (SeasonTab :3971); read as `ls.get('sg_brixlog',{})[season]` mapping `e.val` (SeasonIntelligence :7221–7222) → always `[]` | A shipped feature (SugarSage "Brix trend this season") is silently dead for every user | ~30 min fix + this is the exhibit A for #5 (shared accessors) |
| 4 | **HIGH** | Formula duplication across 4 static calculator pages + landing | draw-off-calculator.html:3–6 restates altToBP/presToBP/finTemp; sap-to-syrup:139–141 restates rule86/syrupY; tap-calculator:153 hardcodes ratio 43 | Fix-in-one-forget-the-others; already 3+ locations for boiling-point math the day after they shipped (decision logged, deliberate) | ~2 hrs: one `formulas.js` served statically, `<script src>` from every page and imported (or pasted by build step) into app.jsx |
| 5 | **MED** | 80-key localStorage store with no schema version and duplicate facts | 80 unique `sg_*` keys; syrup price lives in `sg_syrup_price`, `sg_dx_price`, `sg_bev_price`, and `sg_wizard_data.syrupPrice`; labor rate in `sg_laborrate`, `sg_bev_lrate`, `sg_dx_labor`; `sg_lines_results` is read (Diagnose :9565) but **never written** — that diagnostic can never fire | Shape changes can strand long-time seasons; cloud sync (roadmap) has no stable schema to sync; dead reads hide broken features | ~1 day: write `sg_schema_version`, a one-file key registry with typed get/set per key, and a migration function run at boot; delete or wire `sg_lines_results` |
| 6 | **MED** | Log dates stored as locale-formatted display strings | `date: new Date().toLocaleDateString()` (:3093, 3553); sorted by `new Date(b.date)` (:3075, 3207) | On a device set to fr-FR (roadmap: French market), `19/09/2026` misparses → wrong sort order, wrong "season length", wrong YoY; invisible on en-US devices | ~half a day: store ISO `yyyy-mm-dd` going forward + one boot migration converting old entries; format only at render |
| 7 | **MED** | Hand-bumped SW cache version | `sweetrun-v13` at app/sw.js:5; v11→v12→v13 all manual in one day (git log a9b7c1c, ce0b994, d6e5acd) | One forgotten bump = installed phones stuck on a stale app after a formula fix | ~1 hr: build step stamps a git hash/date into the cache name during `npm run build` |
| 8 | **MED** | Single 10,339-line file; map subsystem uses module-level mutable globals | wc = 10,339; `_lMap`, `_lMarkers`, `_lRouteLines` etc. (:4312–4326) shared across renders | Every change loads one giant file; the compiled-file hand-patch incident is a symptom; second person cannot work here without collisions | Strangle, don't demolish: extract in this order — (a) formulas.js (also fixes #4), (b) storage.js (registry from #5), (c) the map, (d) SugarSage KB data. Each step ships alone; Babel CLI accepts multiple files or simple concatenation |
| 9 | **LOW** | Contradictory numbers in UI copy and KB | Custom-pan code computes `area*2.5` GPH (:2559) but the caption says "at 1.5 gal/ft²/hr" (:2630); KB entry evap_01 claims "10–15 gal/hr per square foot" (:6808) vs the app's own 2–3 elsewhere | An expert user spots it and doubts everything else | ~1 hr copy pass on numeric claims |
| 10 | **LOW** | License worker written but unwired; enforcement is client-side only | `LICENSE_API=''` (:32); Ed25519 verify silently degrades to structure-only on old Safari (:49); trial lock is a JS flag | Purchases mint keys via Stripe webhook but key delivery depends on worker being deployed; a determined user bypasses the trial — acceptable for a $50 hobbyist tool, but the revenue path has an unverified leg | Deploy the worker, set `LICENSE_API`, do one live end-to-end purchase test |
| 11 | **LOW** | Sandbox cannot run Babel against mounted node_modules | cp/node deadlocks (Sept 19 session) | Cloud sessions can't compile → pressure to hand-patch app.js (invariant #1 exception) | Either vendor a tiny standalone JSX transform script, or drop the committed app.js and let Cloudflare build from source only |
| 12 | **LOW** | Unminified 639 KB app.js + 1,540 inline style objects | wc -c app/app.js; grep -c "style={{" | 165 KB gzip over the wire is acceptable for now; inline styles churn per render but the app is small; watch, don't act | Free win later: add `--minified` to the babel command (~40% smaller) when touching the build anyway |

---

## 4. Bench-mark scores (2026-09-19; evidence before number)

- **Boundaries** — one file holds 16 screens, the DB helper, the design tokens' consumers and a Leaflet subsystem on mutable globals; a change to shared state can touch anything: **3/10**
- **State & data** — 80 unversioned keys, one fact in up to four keys, one key read in a shape never written, one key never written at all: **3/10**
- **Error paths** — genuinely better than the rest of the structure: quota/lock write failures surface a red banner, offline map has a typed-elevation fallback, an error boundary plus an init-crash catch wrap the app, SW returns a JSON offline sentinel: **6/10**
- **Testability & tests** — the math is pure and sits in one band (excellent), and none of it is tested (zero test files) while divisor drift proves the cost: **2/10**
- **Build & deploy** — one honest command, but a committed generated artifact, a hand-bumped cache name, and a sandbox that can't build: **4/10**
- **Dependencies** — five CDN libraries, all version-pinned in URLs, cached by the SW after first visit; two unpinned external *services* (qrserver, web3forms) that can die silently: **6/10**
- **Performance** — 165 KB gzipped app + ~90 KB React over CDN, Leaflet lazy-loaded; unminified and unmeasured at runtime, but nothing observed pathological at this scale: **5/10**
- **Evolvability** (vs. roadmap: in-app free tier, cloud sync, mesh sensors, French market) — free-tier calculators already forked the formulas; sync has no schema/versioning/stable IDs to build on; sensors have no ingestion seam; French market walks straight into the locale-date bug and a hand-kept 350-key translation table: **3/10**
- **Security & privacy posture** — no secrets tracked in git (`worker/.dev.vars` gitignored, verified untracked), Stripe webhook signature verified, map popup input escaped (`_sbEsc`), data-on-device promise honored; client-only license enforcement and no CSP header are known, accepted trade-offs; deep audit → `security-review` skill if the worker goes live: **6/10**

---

## 5. Decision log

**2026-09-21 — License verify: decode before the try, narrow the fallback.**
`verifyLicense` decoded the signature *inside* the try that wrapped Ed25519
verification, so a malformed signature threw during decode and landed in the
"old Safari, accept on structure" catch — turning any un-decodable signature into
a valid pass on a fully modern browser. Fixed: decode the signature first and
reject if it fails or isn't 64 bytes; run verification; and fall through
unverified ONLY for a genuine `NotSupportedError`/`OperationError` (real
Ed25519-unsupported browsers), rejecting every other error including an undefined
`crypto.subtle` (insecure context). Proven in Node against the real function: the
malformed-sig forgery, a single-char sig, a wrong 64-byte sig, a wrong-length
sig, and a valid signature from the wrong key all reject; a correctly signed
license still verifies (active and expired-flag paths both intact). New
invariant: **the signature is validated before anything structural is trusted,
and structure-only acceptance is reachable only by a truly unsupported browser.**

**2026-09-21 — Dates are stored in ISO; reads tolerate every legacy format.** See
srToday/srDateParts/srDateMs/srDateshort. Entries were `toLocaleDateString` on
write and `new Date()` on read, which only round-trips en-US; en-CA/fr-CA stored
ISO (rendered a day early), fr-FR/en-GB/de-DE stored DD/MM (Invalid Date → sorts
collapsed, season length went negative). New writes are ISO; reads parse any
legacy locale string, disambiguating slash dates by the ">12 must be the day"
rule (new writes are unambiguous so this only carries old data forward).

**2026-09-21 — Gallons are canonical; the display unit lives only at the edges.**
Log values are stored in the sugarmaker's display unit, but every benchmark in the
app (gal/tap yield models, gal-per-cord fuel rates, break-even prices) is gallons.
Five screens destructured `seasonTotals()` into variables named `sapGal`/`syrupGal`
and compared them straight against those benchmarks. In litre mode the same
500-tap season scored 67/D in gallons and 100/A in litres, and Diagnose reported
"sap volume down 74%" between two *identical* seasons because this year was
normalized and last year wasn't. The naming is what hid it: destructuring `sapT`
into `sapGal` made the mistake invisible at every call site.

Fixed with `seasonTotalsGal(slog, units)` — the name carries the unit, so the
variable it lands in is true — plus `toGal`/`fromGal` as the single converter pair.
`SeasonIntelligence` never received `units` at all and now does. Display sites call
`fromGal` explicitly. New invariant: **totals are gallons the moment they leave
`seasonTotalsGal`; the display unit is applied only at render, never in a
comparison.** Locked by tests that log one season in both units and assert an
identical grade, and a smoke that round-trips the display value.

**2026-09-21 — Withholding is a pattern, not a patch (the clamp had three copies).**
Yesterday's `ratioSuspect` guard fixed `seasonScore` only. The identical
`Math.min(100, theoretical/actual)` clamp lived in `YieldGapAnalyzer` — rendering
*directly below* the new warning, so Recap showed "these numbers need a second
look" and "your operation is performing well" in one scroll — and in Diagnose,
whose `pctOff > 15` test was one-sided and so filed a 97%-off ratio under
severity `good`, titled "on target". All three now consult the same helper.
Lesson recorded: when a guard is added, grep the codebase for the *pattern* it
guards against before calling it done.

**2026-09-21 — Withheld-but-explained, never silently gone.** Three related fixes
share one rule. The `SweetRunScore` card stays mounted when scoring is withheld so
it can say why. `YieldGapAnalyzer` returns null instead — but only because the card
above it already explains, which is the sole condition under which disappearing is
acceptable. The Recap R/O section withholds when `roGal > sapGal` (impossible:
you cannot run more sap through the RO than you collected) rather than render
"30 hrs saved" on a 20-hour boil.

**2026-09-21 — Write, then reflect (`updLog`).** `updLog` called `setLogs` before
`ls.set` and ignored its return, so a trial-expired user watched entries appear in
the list, dismissed the lock banner, closed the app, and lost them — the UI
confirmed a save that never happened. It now writes first, returns the result, and
`saveEntry` suppresses both the celebration animation and the auto-copy rows when
the write is refused. BoilDay had this right already and was the model.

**2026-09-21 — Ratio sanity floor is absolute, not relative to recorded brix.**
Live verification found a season of 120 gal sap / 97.5 gal syrup (1.2:1, created
by a sap entry landing under Syrup) scoring 97/100 and an A. `seasonScore`
divided theoretical ratio by actual and capped at 100, so *more impossible* data
scored *better*. Fixed by withholding every score that divides by the syrup total
(yield, efficiency, fuel) plus the letter grade when the ratio falls below a
floor; data-completeness still counts, because logging is never the error.

The first cut set the floor at 80% of `86.4/brix`. Rejected during test-writing:
brix is the field most likely left at its default 2.0, so a relative floor
accuses a sugarmaker with genuinely sweet 3% sap (28.8:1) of bad data — a false
positive on a *correct* season, the worst error this feature can make. The
shipped floor is absolute: `RULE_DIVISOR / SR_MAX_PLAUSIBLE_BRIX` = 86.4/5 =
17.28:1, under which no season lands at any sweetness Cornell or UVM records. It
catches the 1.2:1 case with a factor of 14 to spare and cannot fire on a real
season. New invariant: **a score is withheld, never estimated, when its inputs
contradict each other** — and the card that would have shown it stays on screen
to explain itself rather than silently disappearing.

- **2026-09-19 — Hand-patch compiled app.js in sandbox.** Accepted as exception (Babel unrunnable in sandbox; identical string edits to source + compiled; local rebuild reconciles). Rejected: pushing source-only and trusting CF build, because repo app.js would drift from source. Follow-up owed: make sandbox builds possible or eliminate the compiled file from the repo.
- **2026-09-19 — Calculator pages duplicate formulas rather than share a module.** Chosen for zero-build static pages shipped same-day before competitor launch. Debt #4 opened deliberately. Revisit when touching formulas next.
- **2026-09-19 (Plumb, first full read) — Characterization tests before any restructuring.** The formula layer is pure and one file; tests cost half a day and are the precondition for fixing debts #2–#8 safely. Rejected: starting with the file split, because moving untested math is how the divisor drift happened in the first place.
- **2026-09-19 (Plumb) — Single-file app is a constraint to respect, not demolish.** No framework/bundler is a deliberate choice (offline PWA, one-person shop, CDN React). Any splitting must keep the no-bundler build (multiple Babel inputs or concatenation), and each extraction ships alone.

- **2026-09-20 — Pass 0+1 executed (truth fixes).** RULE_DIVISOR = 86.4 adopted as the single theoretical-ratio constant (app + all four calculator pages; KB prose already agreed; jones87 stays as its own labeled reference). Litre semantics codified: stored log values are in the user's display unit; benchmarks are gallons; convert the benchmark or normalize to gal for comparison — never convert stored data for display. Diagnose normalizes inputs to gal; wood math rebuilt on FUELS.spu (retires the /128 dollar-leak). srParseNum handles US thousands groups; French decimal wins ambiguity. sg_brixlog reader fixed to the writer's flat shape. SW returns 503 offline (error paths reachable); cache → sweetrun-v14. 72 literal \uXXXX JSX-text escapes converted to real characters. Test net: tests/formulas.test.mjs, 37 assertions, `npm test` — run before every deploy.
- **2026-09-20 — Pass 2 executed (one number, one voice).** Shared metrics added to the formula band and adopted everywhere: `seasonTotals`/`actualRatio` replace the five per-screen total reduces (Today, Log, Recap, SugarSage intelligence, Diagnose — Diagnose keeps its `_gal` wrap); `seasonScore` is the single scoring model (Recap's documented 30/40/20/10 weighting adopted; SugarSage's unweighted 3-way average retired — 46-vs-37 gone). Settings consolidated to canonical keys `sg_price_syrup`/`sg_cost_wood`/`sg_rate_labor` via `getSetting` (reads canonical, migrates the first legacy value forward via ls.set — `sg_syrup_price`, `sg_dx_price/wood/labor`, `sg_bev_price/lrate`, `sg_laborrate` keep working; Diagnose's price default now follows the wizard's stored price, never a bare $65). UI truth fixes: one selection color (teal) across the wizard incl. pan chips; Finish DE default follows its own recommendation and the RECOMMENDED badge sits on its own line (no more text-on-text); Diagnose finding titles get a full-width row with chips beneath (no one-word-per-line at 375px); `BevInput` hoisted to module scope (H5 focus loss). Trial lock refined (H3): preference/UI-state keys (allowlist + prefixes in the ls helper) write silently while locked, unchanged-value writes on data keys no-op silently, NEW values on data keys still lock + banner — lock not weakened for real data. Tests 37 → 49 (seasonTotals/actualRatio/seasonScore locked). SW cache → sweetrun-v15. Known deliberate non-change: Diagnose YoY prev-season totals stay un-normalized (pre-existing; commented in source, flagged in PASS2-REPORT).
- **2026-09-20 — Pass 3 executed (the look, elevated).** The six hand-cut brand marks live in app.jsx as `M.*` components (faithful transcriptions of brand/assets/marks; placed between the icon library and the Formulas banner so the test-extraction band stays pure JS) — `M` is the moment tier, `I` stays the control tier, and marks never render below 32px (BIBLE floor; the desktop nav therefore uses stroke icons at 20px). Desktop shell rebuilt: the media band moved 1100→1024px and a real `.side-nav` (all five destinations in DOM, active destination's sub-screens nested, persistent Log-a-run pinned at the foot) replaces the old current-destination-only sidebar; mobile <1024 is untouched (`.side-nav` is display:none there; the 1024–1099 slice deliberately trades tablet layout for the desktop shell). Sidebar Log-a-run uses a `sr-log-a-run` window event that LogTab listens for — the established window-event pattern (`sr-write-fail`), not new shared state. Empty states furnished to Tubing's standard (Today/Entries/Equip/Map-trees, amber #EB9A33 marks, teal chips through the existing `go`/`openSheet` mechanisms); grade '—' now renders a neutral "Too early to grade / Trop tôt pour évaluer" on both score surfaces (scoring model untouched). SugarSage Ask fixed structurally: one always-present submit button (Enter works), separate clear ×, results render under the chips and the dashboard/break-even step aside while an answer is showing. CSV export covers all six entry kinds with a Unit column + RFC-4180 quoting (M3); import gained `dedupeImport` in the formula band — kind+date+val exact match against the existing store, preview reports "N new · M duplicates will be skipped", all-duplicate imports disabled (M4). 9 new TR keys in both tables. Tests 49 → 53. SW cache → sweetrun-v16. Nothing visually verified in-sandbox (no browser access to files) — eyes-on checklist in audits/PASS3-REPORT.md.
- **2026-09-20 — Pass 3.5 executed (the Map, made thrilling).** Presentation-only pass on the map band (LinesTab + its module helpers; CSS in app/index.html). Tactical HUD: all floating map instruments are glass (rgba(13,21,33,0.72) + blur(12px), teal 1px borders, inset highlight tops, teal focus rings) plus a slim `map-hud` status strip (pins · GPS ±m · layer, 10px caps, tabular-nums mono; GPS accuracy shown only while live tracking reports one — never faked). Living mainlines: `_drawRouteLines` now layers a blurred same-color glow under each segment and, on segments the analysis grades ≥1% (whose from→to is downhill by construction — lines are built high→low), a white animated stroke-dashoffset flow dash; the core grade-colored stroke, its options and popups are byte-identical, extra layers are interactive:false and cleared through `_lRouteLines` as before. Markers: selected tree gets one CSS pulse ring element; `_dropPin` adds a 250ms scale-settle to the inner wrapper only (Leaflet owns the icon element's transform); #1 suggested Tank Spot marker gets a static amber glow. Analysis theater: one 1.2s conic-gradient radar sweep on Analyze (JS skips append under reduced-motion), results cards slide-fade staggered 60ms, spot #1 gets amber medal border + BEST chip, loading states use a scanline (no spinners). Depth: `.map-stage::after` inset vignette at z-650 (below popups/controls); flow-diagram + all map numeric readouts in ui-monospace tabular-nums (`_MONO` const) with same-color glows — connectors stay grade-colored, NOT teal (grade color is data; legibility beat the effect). Every animation is CSS transform/opacity (dashoffset per brief) and every one is disabled under prefers-reduced-motion. One deliberate legibility fix: the Analyzing… button state was near-black-on-near-black; now teal-on-dark. Functional deltas: zero, with two render-only notes (a `gpsAcc` state for the HUD, fed by the existing GPS watch with same-value bail; up to 3 polylines per segment instead of 1). Tests unchanged at 53; parse/compile/eval verified; SW cache → sweetrun-v17. Nothing visually verified in-sandbox — eyes-on list in audits/PASS35-REPORT.md.
- **2026-09-20 — Pass 4-Map executed (the flagship sugarbush map).** Two new external tile surfaces, both verified live in-browser before wiring (real 256×256 tiles over Maine, z13): Esri World Hillshade (ships as the terrain source; USGS ShadedReliefOnly verified as fallback, unwired) and USGS Topo (basemap.nationalmap.gov; US-only, coverage note in the panel). `mapType` widened to a 5-value enum (satellite / sat-terrain / terrain / topo / street) applied by `_sbApplyBase`; hillshade rides its own `sr-terrain` pane (z250) under CSS `mix-blend-mode: multiply` at 0.55 with a 0.2–0.9 slider — multiply chosen over overlay on visual comparison (satellite greens are near mid-gray, so overlay's brightening half cancels the relief; multiply keeps every shadow). Terrain-only re-uses the tiles tinted warm gray-green via CSS filter. The layers mfab now opens a glass Layers panel (44px tile thumbnails, the Sat+Terrain thumb stacks the live blend; base + seasonal sections both drive the same state as the untouched seasonal pill). Measure tool: `srHaversineM`/`srPolyAreaM2` (spherical shoelace) + acre/ha constants added to the FORMULA BAND on the same 6378137 m sphere `haversineFt` encodes — tests 53 → 59; armed ruler mfab routes map taps to an amber tape (vertex dots `bubblingMouseEvents:false` so closing the ring can't also lay a vertex), ft+m running distance, close-the-loop → acres+ha, Undo/Clear/Done, all ephemeral (zero storage writes; disarmed handler is the original `_dropPin` path). Offline: `basemap.nationalmap.gov` added to SW isTile; `_sbCacheTiles` caches the ACTIVE mode's sources (satellite math byte-identical; hillshade/topo fetched only to native z16); `_headers` has no CSP so nothing to extend; tile cache stays `sweetrun-tiles-v1`. Terrain modes raise route glow 0.3→0.5 and flow dash 0.55→0.75 (`_sbTuneRouteGlow`, restyles by className on base switch; core grade-colored stroke untouched). Sanctioned functional deltas only: layers mfab opens the panel instead of flipping sat↔street; map-add hides while measuring. Nothing new animates (reduced-motion needs no new rules). 31 new TR keys in both tables. SW cache → sweetrun-v19. Eyes-on list in audits/PASS4MAP-REPORT.md (notably: Esri place labels sit under the multiply pane and dim slightly in deep shadow — dedicated labels pane is the one-line fix if the field pass wants it).
- **2026-09-20 — Compiled-file hand-parity ABANDONED.** app/app.js was discovered to be a STALE build (contains code absent from current source, e.g. duplicate Diagnose totals, an old theorRatio form). All Pass-1 fixes are source-only. Production safety: Cloudflare Pages compiles fresh from app.jsx at deploy; Damian's local `npm run build` before commit reconciles the committed file. The Sept-19 hand-patch exception is hereby closed — never again; invariant #1 restored to absolute.
- **2026-09-20 — Pass 5 executed (visual quick wins).** Four presentation features, source + CSS only. (1) Log micro-delight: `LogTab.saveEntry` sets fire-and-forget render state after its writes (write path untouched); a ~700ms non-blocking overlay drops a teal sap drop into the M.bucket mark while the new row's value rolls 0→value over 400ms via `RollNum` (rAF, tabular-nums); reduced motion skips both, value appears. (2) Today's Season Goal progress bar replaced in place by `SeasonJar` — M.jug outline byte-for-byte, its own body path as clipPath, amber fill level inline (the static end-state), CSS animates the 600ms rise + one 2°→0° surface settle; the "% of N gal" text is byte-identical. (3) Yield heat (honest v1 — cpoints have totals but no geo, pins have geo but no yield): tank/pump pins gain a Collection-point picker in the pin sheet (`cpoint` field on `sg_lines_pins`, inside the backup sweep); a Layers-panel "Yield" toggle draws pixel-sized (20–60px, sqrt-scaled) amber radial halos + tabular "N gal/L" labels on assigned pins in a pointer-events:none pane at z450, totals computed through `seasonTotals` + the `e.point===id` filter LogTab uses (invariant 4 honored); unassigned or zero-sap draws nothing, no geo invented, toggle ephemeral. (4) Weather freeze/thaw ribbon above the scored strip: stretched-viewBox SVG with non-scaling strokes, Catmull-Rom-smoothed hi/lo band, dashed 32°F hairline, amber under-glow on run days computed with exactly the Freeze/Thaw list's `ideal` expression (hi≥40 && lo≤28), localized tabular day labels; pure render of already-fetched data, zero network, nothing animated. 16 TR keys EN+FR. Every new animation is transform/opacity (the one rAF number roll is brief-mandated) and dead under prefers-reduced-motion with correct static end-states. Tests 59 green throughout; compile+eval OK. SW cache → sweetrun-v21. Nothing visually verified in-sandbox — eyes-on list in audits/PASS5-REPORT.md.
- **2026-09-20 — Pass 6 executed (Boil Day, the sugarhouse instrument).** New screen `boilday` registered in the Numbers destination's tabs (bottom nav, sub-tab strip and desktop sidebar all read the one `DESTS` table — no shell changes needed) plus a Today shortcut chip that goes live (`● Ça bouille — h:mm`) while a session runs. The dial's state machine lives in the FORMULA BAND (`srBoilState`: warming → near at finTemp−2°F → draw at finTemp±0.3°F → over; `srGaugeFrac` for arc position; finTemp rounded to 0.1 so band edges compare cleanly against 0.1-stepped pan temps) — tests 59 → 69. `waterBP` is the same `sg_bp` state Boil Pt writes (passed as a prop; not forked); expected GPH reads EvapTab's own `sg_panIdx/panW/panH`; theory ratio is `RULE_DIVISOR/brix` (invariant 4 throughout). Session storage: **`sg_boil_session` { start: epoch-ms, sap, syrup, tempF }** — epoch per invariant 6, values in the display unit per the litre-semantics decision, inside the backup sweep, written only via `ls.set` (a locked trial can't bank a session, same as any new data). Temperature displays °C when units = L (Québec boils in Celsius), °F otherwise; stored °F at 0.01 so °C steps (±0.18°F) don't drift. "Log this boil" appends sapEvap + syrupMade + boilHours entries to `sg_logs2` in exactly LogTab's entry shape (incl. locale date — a deliberate match: a mixed-format store is worse than the pending debt-#6 wholesale migration) through one `ls.set`; a false return (locked/quota) keeps the session. Wake Lock is progressive enhancement (try/catch, re-acquired on visibilitychange, released on end/unmount); `navigator.vibrate` fires once on entering the band. The steam wisps + band pulse + needle transition are the screen's only motion, all transform/opacity, all dead under prefers-reduced-motion (JS also skips rendering wisps). Verification added: `/tmp/sr-check/boilsmoke.mjs` walk-renders the component in 6 configurations (idle/near/draw/over × EN-gal/FR-L°C + Today with live session) — the walker was negative-controlled (a planted ReferenceError was caught, then reverted). 27 TR keys EN+FR. SW cache → sweetrun-v22. Not visually verified in-sandbox — eyes-on list in audits/PASS6-BOIL-REPORT.md.
- **2026-09-20 — Pass 7 executed (season replay + share card).** Two producer-facing showpieces on Recap, source + CSS only. **Replay:** `srReplaySteps`/`srReplayMoments`/`srReplayStepMs` live in the FORMULA BAND (tests 69 → 88) — one step per logged DAY, sap entries prepared with byte-for-byte SapChart's map/filter/sort (its string-date comparator inherited deliberately, debt #6 unchanged), running totals as cumulative sums of the same parseFloat vals `seasonTotals` sums, moments derived only from data Recap already renders (max bar, first syrupMade day, max sg_brixlog value on a replay day). `ReplayStage` (module-scope) is a centered glass overlay: rAF advances the step index on the srReplayStepMs cadence (~10s sweep, 400–1600ms clamp); ALL inter-step motion is CSS transform/opacity (bars scaleY, timeline scaleX, captions opacity); totals tween prev→next via `RpNum` (300ms rAF, tabular mono). Reduced motion = no autoplay, Prev/Next step-through, transitions dead in CSS AND JS. Gate: ≥3 dated sap/syrup entries; zero storage writes; Esc/scrim close; scrim excluded from print. **Share card:** `M.tree`'s d strings hoisted to `M_TREE_CROWN_D`/`M_TREE_GROUND_D` (JSX component now references them — one geometry, two renderers) and `srDrawShareCard` draws the 1200×630 canvas fully programmatically: #0B1F14→#1E4A34 gradient, Path2D-stroked outline tree at ~400px amber (outline grammar; Amber Glass stays reserved), operation name (sg_operator else "My sugarbush"/«Mon érablière»), tracked season line, four stats passed as the SAME formatted strings Recap's Big-4 render, muted-amber sweetrun.app wordmark, radial vignette; NO location/map imagery. Export is canvas.toBlob → navigator.share files when canShare (AbortError = silent), else `<a download>` sweetrun-season-YYYY.png; local only, invariant 2 intact. Verification: `/tmp/sr-check/sharecard.mjs` (recording ctx stub + SVG-grammar-lexing Path2D stub, 11 assertions, negative-controlled ×2) and `/tmp/sr-check/replaysmoke.mjs` (walk-renders Recap+ReplayStage in 6 configs incl. reduced-motion FR and empty season, negative-controlled). 23 TR keys EN+FR. SW cache → sweetrun-v23. Pixel truth not verifiable in-sandbox — eyes-on list in audits/PASS7-REPLAY-REPORT.md.
- **2026-09-20 — Stale-precache field bug fixed.** Live verification caught /app/app.js being served from browser HTTP cache (651KB stale vs 668KB fresh) and the SW's `cache.addAll` precaching that stale copy into a brand-new cache version — meaning a SW bump could silently ship old code. Fix: `_headers` now must-revalidates /app/app.js, and the SW precaches same-origin shell files with `cache:'reload'`. SW → v20. The eyes-on-live rule paid for itself.

# SweetRun Level-10 Master Specification
**Audit → Debug → Design → Build. Ten levels. AI-executable.**
Version 1.0 · July 2026 · Author: strategy + audit sessions with Damian Brockway
Companion documents: `bl2-reports/` (business strategy, validated), `SWEETRUN-HANDOFF.md` (project reference), `sugarbush-mesh-context-prompt.md` + `sugarbush-mesh-HANDOFF.docx` (mesh project).

---

## How to use this document (read first, every session)

This spec is written so any capable AI agent (Claude Sonnet/Opus, etc.) can execute any level without inventing decisions. Rules of engagement:

1. **Execute one level at a time, in order within a level.** Levels are ordered by dependency; do not start Level N+1 tasks while Level N acceptance criteria fail, except where a level is marked `[PARALLEL-OK]`.
2. **Never use line numbers to locate code** — the file shifts. Every task gives a unique **search anchor** (a string to find). If an anchor is missing, STOP and report; do not guess.
3. **The verification block of each level is mandatory.** Run every command. A level is done only when all acceptance criteria pass.
4. **One git commit per task group**, message format: `L<level>.<task>: <imperative summary>`. Never commit `worker/.dev.vars` (private signing key) or any file containing secrets.
5. **The executing agent cannot deploy** (Cloudflare/Stripe actions run on Damian's machine). Anything requiring deployment gets written to code + a numbered checklist appended to `DEPLOY-QUEUE.md` (create at repo root if absent). Never block a level on deployment; stub with constants that no-op when empty (pattern already used: `LICENSE_API = ''`).

### Repo map & invariants

| Path | What | Rule |
|---|---|---|
| `app/src/app.jsx` | ~9,500-line single-file React 18 app. THE product. | Edit this, never `app/app.js` |
| `app/app.js` | Babel output | Regenerate with `npm run build`; commit alongside src |
| `app/sw.js` | App service worker | Bump `sweetrun-vN` once per deployed batch (not per commit) |
| `app/index.html` | App shell (505-line CSS, inline manifest) | |
| `index.html` | Marketing landing page | |
| `success.html`, `feedback.html`, `batch.html` | Post-purchase / feedback / QR provenance | `batch.html` params are XSS-escaped via `esc()` — keep it that way |
| `worker/` | Cloudflare Worker: license + events (`src/index.js`, `wrangler.toml`, `DEPLOY.md`) | `.dev.vars` is gitignored, contains ed25519 private key |
| `sw.js` (root) | Legacy kill-switch | Only deletes `sugarcalc-*` caches; do not widen |

**Build & verify commands (run from repo root):**
```bash
npm run build                 # babel app/src/app.jsx -o app/app.js
node --check app/app.js       # syntax gate — MUST pass before any commit touching the app
node --check worker/src/index.js
```

**Product invariants — violating any of these is a failed task, no exceptions:**
- **I1. Offline-first.** Every producer-facing feature must work with zero network, except features explicitly marked `[ONLINE]` which must degrade with a friendly message, never an error or spinner-forever.
- **I2. Data is never held hostage.** Viewing and exporting user data must work in every state: expired trial, no license, offline, storage-locked. The soft-lock (`SR_LOCKED` in app.jsx) blocks writes only.
- **I3. No accounts.** Identity = Season Pass token (ed25519, verified client-side). Nothing may require a login.
- **I4. localStorage keys are prefixed `sg_`** and go through the `ls` helper (search anchor: `const ls = {`). Adding raw `localStorage.` calls outside the helper is a defect (exceptions already in code: trial bootstrap writes — leave them).
- **I5. iOS Safari installed-PWA is the reference platform.** A feature that works on Chrome but not installed iOS Safari is not done. Known platform facts (verified July 2026): Web Push + Declarative Web Push work (iOS 18.4+), Wake Lock works in installed PWAs (18.4+), Badging works (16.4+), **no** Web Bluetooth, **no** Background Sync, **no** WebGPU ML inference (crashes — use WASM), no auto install prompt.
- **I6. Price/copy single source of truth:** "14 days free" trial → "Season Pass — $49.99/season". Every page shows identical pricing. Founding rate: $29.99 (see L9).
- **I7. The French toggle exists.** New user-facing strings in already-translated surfaces should use the `t(lang, key)` helper with entries added to both `TR.en` and `TR.fr` (search anchor: `const TR = {`). New surfaces may ship English-first but must route text through `t()` so L10 can complete FR.
- **I8. Do not split app.jsx into modules.** Single-file is a deliberate constraint (build simplicity). Exception: none at this time.

### Known-state summary (what's already true, July 2026)

Already shipped in this codebase: JSON backup/restore modal, `navigator.storage.persist()`, Season Trial (14d + Feb-28 floor + 3-sap-day rule; tested), license verify (ed25519 via WebCrypto with graceful fallback), license Worker (webhook → token → KV; events; leads; stats), success-page key delivery, XSS-hardened batch.html, scoped root SW, correct icons/og-image, consistent pricing, noindexed thin pages, form error handling. The BL2 strategy (validated, certified-with-conditions) governs business sequencing; this spec governs product execution and extends it.

---

# LEVEL 0 — Audit baseline & defect burn-down

**Objective:** a verified-clean foundation. Fix every known defect before building on top.
**Why:** the earlier audit found bugs that corrupt input, waste bandwidth, and embarrass the brand. Building levels 1–10 on top of them multiplies rework.

### Tasks

**L0.1 — Fix the `LogSection` remount defect.**
Anchor: `const LogSection` inside the `LogTab` component (search `function LogTab` then locate the inner component definition). A component with hooks is defined inside another component's render, so every parent render remounts it and discards in-progress input state. Move `LogSection` to module scope (immediately above `function LogTab`), passing everything it closes over as props. Acceptance: typing in a log input while a background re-render occurs (e.g., interval tick) no longer clears the field; `node --check` passes; no behavior change otherwise.

**L0.2 — Deduplicate `TR.en` keys.**
Anchors: duplicate keys `finishAt`, `numTrees`, `spoutType`, `estSapSeason`, `doNotTap` each appear twice inside `const TR = {` `en:` block. For each: keep the LAST occurrence (it wins at runtime today — zero behavior change), delete the earlier one. Check `fr:` for the same duplicates. Acceptance: `node -e "const s=require('fs').readFileSync('app/src/app.jsx','utf8'); /* extract en block keys, assert no dupes */"` — write a 10-line script that parses key names in the en object and exits nonzero on duplicates; commit it as `scripts/check-tr-dupes.js`.

**L0.3 — Unify stored locations.**
Anchors: `sg_ddlat` / `sg_ddlon` (degree-day + notifications), `sg_wx_lat` / `sg_wx_lon` (weather tab). Create ONE canonical pair `sg_loc` = `{lat, lon, label}` with a migration shim in the app bootstrap (before first render): if `sg_loc` absent but any legacy key present, populate `sg_loc` from `sg_ddlat/lon` first, else `sg_wx_lat/lon`; keep legacy keys updated on write (write-through both ways) so no tab breaks. All READS switch to `sg_loc`. Acceptance: setting location in any one tab is reflected in all tabs after reload; legacy keys still populated (backup compatibility).

**L0.4 — Remove `user-scalable=no`.**
Anchor: `user-scalable=no` in `index.html` (and check `app/index.html`, `feedback.html`, `success.html`, `batch.html`). Delete the attribute (keep `width=device-width, initial-scale=1`). Acceptance: pinch-zoom works on the landing page; no layout break at default zoom.

**L0.5 — Friendly crash screen.**
Anchor: `INIT CRASH` in app.jsx. Replace the raw stack dump with: maple-leaf glyph, "Something broke on our end — your data is safe on this device.", a "Reload" button, a "Copy error details" button (copies `String(_e) + stack` to clipboard), and a mailto link to hello@sweetrun.app pre-filled with the error. Keep the stack in a collapsed `<details>` element. Acceptance: temporarily throw at top of `App()` to view the screen, then remove the throw.

**L0.6 — Kill dead code and stale strings.**
(a) Anchor `.qr-section` in `index.html` CSS — delete the unused block. (b) Search all files for `SugarCalc` in user-visible strings (NOT the repo path or importer feature which legitimately references the old product name for imports) — rename stragglers to SweetRun. (c) Anchor `Knowledge Base + AI` in app.jsx — until L6 ships, change to `Knowledge Base` (no overclaim). Acceptance: `grep -rn "qr-section" index.html` returns nothing; grep for `+ AI` in app.jsx returns nothing.

**L0.7 — Contact email consistency.**
Decision (already made): `hello@sweetrun.app` is the public address everywhere. Anchors: `damian@sweetrun.app` in success.html; `damian.brockway@gmail.com` mailto fallback in feedback.html (line anchor: `mailto:damian.brockway`). Replace both with `hello@sweetrun.app`. Append to `DEPLOY-QUEUE.md`: "Cloudflare → Email Routing → verify hello@sweetrun.app forwards to damian.brockway@gmail.com; create if missing."

**L0.8 — Add `robots.txt`.**
Create `/robots.txt`: allow all, `Sitemap: https://sweetrun.app/sitemap.xml`. Acceptance: file exists, 3 lines max.

### Level 0 verification
```bash
npm run build && node --check app/app.js
node scripts/check-tr-dupes.js
grep -rn "user-scalable" *.html app/index.html   # → empty
grep -rn "damian@sweetrun\|mailto:damian.brockway" *.html  # → empty
```
Definition of done: all commands clean + manual smoke test of Log tab input persistence.

---

# LEVEL 1 — The field design system ("Sugarbush Day")

**Objective:** a light, snow-glare-readable, glove-operable design system, applied app-wide via CSS variables — with the existing dark theme retained as "Sugarhouse Night."
**Why (evidence):** outdoor/glove research: light theme beats dark in sunlight/snow-glare; 7:1 contrast for body text; ≥75px primary touch targets (MIL-STD gloved ops: zero errors at 20mm); bold ≥24px key numbers; no mandatory gestures. The app is currently dark-only with 1,724 hardcoded hex colors — migration must be scripted, not manual.

### Tasks

**L1.1 — Token audit script.** Write `scripts/theme-audit.js`: parses `app/src/app.jsx`, counts every hex literal + `rgba()` occurrence, outputs a frequency table to `scripts/theme-audit.json`. Acceptance: script runs; top-30 tokens cover ≥80% of occurrences (expected from prior probe: `#07090f` bg, `#0d1521` card, `#0f1720` input, `#131e2c` divider, `#1e2d3d` border, `#8a9ab5` body, `#5a6a7a` muted, `#3d5068` faint, `#e6edf3` bright, `#2dd4a7` accent, `#3fb950` success, `#f4a44a` warn, `#f47067` danger, `#58a6ff` info, plus rgba variants of accent/white/black).

**L1.2 — Define the palettes.** Add to `app/index.html` `<style>` (top):
```css
:root { /* Sugarbush Day — DEFAULT */
  --bg:#f7f5f0; --card:#ffffff; --card2:#efece4; --border:#d8d2c4; --divider:#e6e1d5;
  --text:#1b1b16; --body:#3d3d33; --muted:#6b6b5e; --faint:#8f8f80;
  --accent:#0f7a5c; --accent-contrast:#ffffff; --success:#1a7f37; --warn:#9a6700; --danger:#c93c37; --info:#0969da;
  --shadow:0 2px 10px rgba(27,27,22,0.08);
}
[data-theme="night"] { /* Sugarhouse Night — current palette, verbatim */
  --bg:#07090f; --card:#0d1521; --card2:#0f1720; --border:#1e2d3d; --divider:#131e2c;
  --text:#e6edf3; --body:#c9d1d9; --muted:#8a9ab5; --faint:#5a6a7a;
  --accent:#2dd4a7; --accent-contrast:#07090f; --success:#3fb950; --warn:#f4a44a; --danger:#f47067; --info:#58a6ff;
  --shadow:0 4px 20px rgba(0,0,0,0.5);
}
```
Every Day-palette text/background pair MUST meet 7:1 (body on bg/card) — verify with a contrast script (`scripts/contrast-check.js`, WCAG formula, exits nonzero under 7:1 for the pairs: text/bg, text/card, body/bg, body/card; 4.5:1 floor for muted).

**L1.3 — The codemod.** Write `scripts/theme-codemod.js` (Node, no deps): string-replaces each top-30 token in `app/src/app.jsx` with `var(--x)` per a mapping table embedded in the script (old hex → variable). Rules: (a) replace inside quotes only (`'#0d1521'` → `'var(--card)'`); (b) rgba variants of mapped colors map to dedicated vars added to both palettes (e.g., `rgba(45,212,167,0.1)` → `var(--accent-soft)`); (c) unmapped colors are LEFT ALONE and logged; (d) the script prints a diff summary and is idempotent. Run it. Acceptance: `npm run build && node --check app/app.js` passes; visual smoke of all 16 tabs in night theme shows zero regressions (night vars are verbatim old values, so the night render must be pixel-identical — this is the safety property of the whole migration).

**L1.4 — Theme switching.** In app.jsx: `sg_theme` (`'day'|'night'|'auto'`, default `'auto'`). `auto` = day between civil dawn and dusk (compute from `sg_loc` with the NOAA sunrise equation, ~20 lines, no dependency; fallback 7:00–18:00 if no location), night otherwise. Apply via `document.documentElement.dataset.theme`. Add a header toggle button (sun/moon icon, cycles day→night→auto, shows current mode in a toast-style label under it for 1.5s). Acceptance: toggle works; choice persists; auto flips by time.

**L1.5 — Glove-mode primitives.** Add CSS utility classes in `app/index.html`: `.btn-primary` (min-height 64px, full-width, font-weight 800, font-size 16), `.btn-field` (min 75×75px), `.chip` (min-height 48px, min-width 64px, 8px gaps). Add a `Num` display convention: key numbers ≥28px weight 700. These are used by L2/L3 (do not retrofit old tabs now). Acceptance: classes exist and render correctly in both themes.

**L1.6 — Per-tab QA pass.** Load each of the 16 tabs in BOTH themes; screenshot; fix any unmapped-color artifact found (add mapping, rerun codemod — idempotent). Record results as a checklist appended to this file's L1 section commit message. Acceptance: 16/16 tabs verified in both themes; `scripts/theme-audit.js` rerun shows Day-theme coverage of structural colors ≥95%.

### Level 1 verification
```bash
node scripts/theme-audit.js && node scripts/contrast-check.js
npm run build && node --check app/app.js
grep -c "var(--" app/src/app.jsx   # expect > 800
```
Guardrails: NEVER hand-edit hexes one by one (use the codemod); NEVER change the night palette values; if the codemod produces >5 visual regressions in L1.6, STOP, revert the commit, and re-run with a narrower mapping.

---

# LEVEL 2 — The Today dashboard & 4-zone navigation

**Objective:** the app opens to an answer, not a toolbox: *"Will sap run today? How's my season? What needs me?"* — with all 16 existing tools reachable in ≤2 taps.
**Why:** dashboard-vs-tool-drawer is the single biggest gap between Deere/FieldView-class ag apps and small ones; the current 16-tab bar is the anti-pattern. Bottom-half placement = one-handed glove reach.

### Tasks

**L2.1 — Bottom navigation, 4 zones.** Replace the horizontal 16-tab scroller as PRIMARY nav with a fixed bottom bar (installed-PWA safe-area aware: `padding-bottom: env(safe-area-inset-bottom)`), 4 zones × min 64px height:
- **Today** (new, L2.2) — `id:'today'`, default tab.
- **Log** — existing LogTab.
- **Map** — existing LinesTab (drop the β once L2.6 passes).
- **Tools** — a grid launcher (L2.5) for everything else: Sap, Evap, R/O, Finish, Tapping, Boil Pt, Season, Recap, Tubing, SugarSage, Equip, Tasks, Weather, Diagnose.
The old top tab-bar is REMOVED (header keeps brand, season pill, license pill, units/lang/theme, wizard, backup). Tab state key stays `tab` — legacy IDs still work (deep links from Tools grid set the same state).

**L2.2 — Today dashboard component.** New `TodayTab` module-scope component. Layout, top to bottom (each block a Day/Night-themed card, reusing existing logic — REUSE anchors given):
1. **Run Score hero** — today + next 2 days, 0–99, from the existing scoring fn (anchor: `_sapRunScore`). Score number ≥44px. Verdict line ("Prime run day — fire it up" / "Marginal" / "Save your wood" — thresholds 80/50 already in landing copy). `[ONLINE]` block with cached-last-fetch fallback + "as of <time>" stamp. Humility microcopy (from BL2): "A planning aid, not a promise — trust your trees first."
2. **Season at a glance** — this season's sap total, syrup total, vs same date last season (±%), from `sg_logs2` (shape: `sg_logs2[season].sapCollected[]` etc.). If no data: friendly empty state + "Log your first collection" button → Log.
3. **Needs attention** — rule list, each rule = `{check(state), message, cta, targetTab}`; ship with: brix trend drop >30% from peak (reuse buddy-sap logic anchor: `buddy`), no sap logged in 3+ days during Feb–Apr, spoilage heat-units warning (anchor: `CRITICAL_HU`), season goal behind pace (reuse SeasonTab math), trial expiring ≤3 days. Empty state: "Nothing needs you. Go check your lines anyway."
4. **Quick actions row** — `.btn-field` buttons: "+ Sap", "+ Boil", "Ask SugarSage", "Backup".
Acceptance: cold-start offline renders every block (hero shows cached/empty state); every block tap-navigates correctly; total taps to any legacy tool ≤2.

**L2.3 — First-run experience.** If no data and no wizard done: Today shows a 3-card welcome (Try demo season / Set up my sugarbush (wizard) / Just explore). "Try demo season" loads the demo dataset (L2.4) with a persistent amber "DEMO — clear anytime" banner. Acceptance: fresh profile → 3 cards; each works.

**L2.4 — Demo season dataset.** `const DEMO_SEASON` in app.jsx: a realistic 2026 season for a 120-tap Vermont-style operation — 14 sap collections Feb 20–Apr 2 (totals ≈ 1,400 gal sap, 34 gal syrup, ratio ≈ 41:1), 6 boils with grades golden→dark progression, brix log declining 2.4→1.7 with a buddy-sap tail, 8 map pins (sugarhouse, 2 tanks, 4 tap clusters, junction), 2 equipment items, tasks half-done. Load = write to the SAME `sg_*` keys (after snapshotting any existing keys to `sg_predemo_snapshot` for restore on clear). Acceptance: demo loads in <1s; every dashboard block and the Recap tab look impressive with it; clearing restores prior state exactly.

**L2.5 — Tools grid.** Simple grid (2 cols mobile, 3 wide), each tile = icon + name + one-line description, `.btn-field` sizing. Order by season phase: during Feb–Apr float Sap/Evap/Finish first; otherwise Tapping/Tubing/Tasks first (reuse date logic; simple month check is fine). Acceptance: all 14 non-zone tools launch; back returns to grid.

**L2.6 — Kill the β on Map** after: pins CRUD + offline tiles + import all smoke-pass in both themes. Otherwise keep β and log why in commit message.

### Level 2 verification
```bash
npm run build && node --check app/app.js
```
Manual: fresh-profile flow, demo flow, offline cold start (airplane mode), one-handed reach test (all primary actions in bottom 2/3 of a 6.1" viewport), both themes.
Guardrails: do NOT rewrite the 14 tool tabs' internals in this level; do NOT remove any existing capability; the wizard, backup modal, license modal all still reachable.

---

# LEVEL 3 — Frictionless capture (the 3-tap promise)

**Objective:** log a sap collection in ≤3 taps, ≤5 seconds, zero keyboard. Capture readings by camera. Never lose a half-entered form.
**Why:** the winning ag-app pattern is 1–2 giant one-tap primitives for the actions done 50×/day. Numb fingers can't type; presets beat dictation.

### Tasks

**L3.1 — Quick-log sheet.** From Today's "+ Sap": bottom sheet (thumb zone) with: (a) preset chips — last value, and smart presets = round numbers bracketing the season's median collection (e.g., median 38 gal → chips 20/30/40/50/"Full tank"); (b) stepper ±5; (c) collection-point chips from existing collection-point tags (anchor: `collectionPoint`) most-recent-first; (d) auto date=today, auto GPS if `sg_loc` set; (e) one giant Save (`.btn-primary`). Editing any value is possible but never required. Same pattern for "+ Boil" (gallons syrup + grade chips). Acceptance: stopwatch a real phone: repeat-last flow = 3 taps ≤5s; entry lands identically in `sg_logs2` as the classic form (byte-equal record shape).

**L3.2 — Draft persistence.** Any open quick-log/classic-log form writes its state to `sg_draft_<form>` on every change; restore on remount; clear on save/cancel. Acceptance: fill half a form, background the PWA 30s, reopen → values intact (this also finishes the L0.1 fix at the UX level).

**L3.3 — Camera reading capture `[ONLINE-none — fully offline]`.** New "📷 Read it" button on quick-log and Finish tab density check: opens camera (getUserMedia, works in installed iOS PWA), user aims at a DIGITAL display (thermometer/refractometer/scale), Tesseract.js v7 WASM with the seven-segment traineddata (`ssd.traineddata`, lazy-loaded once into the SW cache, ≤12 MB) OCRs the crop, shows the parsed number for one-tap confirm. Scope: digital displays ONLY (analog gauge CV has zero precedent — explicitly out of scope; do not attempt). Feature-flag `sg_flag_ocr` default ON; if OCR confidence <70%, show "couldn't read it — type it?" fallback. Acceptance: reads a 7-segment display photo test set (create `test-assets/ocr/` with 5 sample images) at ≥4/5; total added initial bundle ≤0 (lazy).

**L3.4 — Voice note fallback.** Mic button on log forms → MediaRecorder audio note attached to the entry (stored as base64 in the entry, capped 60s); playback in log list. No transcription (offline; iOS dictation already works in text fields — mention it in placeholder: "or use 🎤 on your keyboard"). Acceptance: record/playback works offline in installed PWA.

### Level 3 verification
Manual timed test (3 taps/5s), airplane-mode test, draft-restore test, OCR test set.
Guardrails: quick-log must WRITE THE SAME RECORD SHAPE as existing forms (Recap/Diagnose/CSV depend on it — verify by diffing a quick-log record against a classic one in DevTools). No new required fields, ever.

---

# LEVEL 4 — Trust & data layer (SweetRun Cloud)

**Objective:** a paying producer can lose their phone in March and be back in business in 5 minutes on a new one. Storage state is always visible and honest.
**Why:** BL2 red-team F6: one "SweetRun lost my season" post in a reputation-dense community cancels ten testimonials. Cloud backup is also the visible ongoing service that justifies recurring pricing. (The "data never leaves your device" copy was already removed site-wide — backup is opt-in.)

### Tasks

**L4.1 — Worker: backup endpoints.** In `worker/src/index.js` add:
- `POST /backup` — headers `X-SR-License: <token>`; body = the JSON-export blob (reuse BackupModal's payload shape `{app:'SweetRun',format:1,exportedAt,keys}`), max 2 MB. Verify token signature + expiry server-side (same ed25519 pubkey — embed it as a Worker var). Store KV `backup:<email>:<n>` keeping last 3 (rotate), value gzipped (`CompressionStream`).
- `GET /backup` — same auth; returns list `{n, exportedAt, bytes}`.
- `GET /backup/:n` — same auth; returns the blob.
Rate-limit: 10 writes/day/email (KV counter). Acceptance: `node --check` passes; a local test script (`worker/test/backup.test.js`, plain node, mocks KV with a Map, imports the handler) round-trips backup→list→restore and rejects a bad/expired token — run it in CI-style: `node worker/test/backup.test.js` exits 0.

**L4.2 — App: Cloud tab in BackupModal.** Extend the existing BackupModal (anchor: `function BackupModal`) with a Cloud section, visible when licensed (`lic.status==='licensed'`): "Back up to SweetRun Cloud" button, list of the 3 stored versions with restore buttons, "last cloud backup: <date>" line. Unlicensed users see the section with a lock note ("Included with your Season Pass"). `[ONLINE]` with honest offline message. Acceptance: full cycle against a mocked fetch (dev flag) — backup, list, restore replaces keys after the same confirm dialog as file-restore.

**L4.3 — Backup nudges.** (a) After each save that brings the season's entry count to a multiple of 10, show a one-line toast: "34 entries this season — backed up <relative time>." tapping opens BackupModal. (b) If licensed + online + last cloud backup >7 days old + app open >2 min → single non-blocking banner per session. Acceptance: nudges fire per rules; never more than one per session; dismissal respected.

**L4.4 — Storage honesty indicator.** In BackupModal header: persistent-storage state (already fetched) + estimated usage (`navigator.storage.estimate()`) + "Installed as app: yes/no" (`display-mode: standalone` media query). If NOT installed on iOS: show the illustrated 3-step install card (new component, reused by L5 and the /start page). Acceptance: states render correctly installed vs browser-tab.

### Level 4 verification
```bash
node worker/test/backup.test.js && node --check worker/src/index.js
npm run build && node --check app/app.js
```
Append to `DEPLOY-QUEUE.md`: redeploy Worker; add `LICENSE_PUBKEY` var to wrangler.toml (value from `worker/public-key.txt`).
Guardrails: backups are the user's own export blob — the Worker must never parse/modify key contents; restore always requires explicit confirm; file-based export/restore remains available to everyone forever (I2).

---

# LEVEL 5 — The alerts engine (the app that calls you to boil)

**Objective:** SweetRun watches the forecast and the producer's own data, and proactively tells them — by push — when to act. This is the retention feature and the "feels alive" feature.
**Why:** freeze-thaw drives everything in maple; exception-based push is what makes Deere-class apps valued; iOS 18.4+ finally makes push (incl. Declarative Web Push) + Badging + Wake Lock real in installed PWAs. No maple-specific forecast API exists — owning one is defensible.

### Tasks

**L5.1 — Server-side run-score cron.** New Worker (or extend existing; keep one Worker — add a `[triggers] crons = ["0 10 * * *"]` to wrangler.toml = 10:00 UTC ≈ 5–6am Eastern). For each push subscription (L5.2) with stored `{lat,lon}`: fetch Open-Meteo hourly (t2m, wind, cloud, precip, soil temp — soil temperature now available and relevant to late-season), compute the SAME score as the client (port `_sapRunScore` to the Worker — copy the function into `worker/src/score.js`, export for both… app can't import it; instead: copy with a header comment `// MIRROR of _sapRunScore in app.jsx — keep in sync, test asserts parity` and add `worker/test/score-parity.test.js` that runs both implementations on 5 fixture forecasts and asserts equal outputs; app-side export via a JSON fixture file `test-assets/score-fixtures.json`). Send push when: tomorrow's score ≥80 (message: "🍁 Prime run day tomorrow — high X°, low Y°. Score N."), or first freeze-thaw cycle after ≥5 non-freezing days ("Season may be starting"), max 1 push/day/subscriber.
**L5.2 — Push subscription plumbing.** Worker: `POST /push/subscribe` `{subscription, lat, lon}` → KV `push:<hash>`; `POST /push/unsubscribe`. Use VAPID via the `pushforge` (or `web-push-browser`) library — zero-dep, Workers-native (verified July 2026). Prefer **Declarative Web Push** payload format where supported (iOS 18.4+), classic Web Push otherwise. App: in Settings-area of Today (gear on Run Score card): "Run-day alerts" toggle → if not installed, show install card first (I5: push requires installed PWA); request permission on the toggle gesture; register subscription with `sg_loc`. Acceptance: `worker/test/push.test.js` validates subscribe/unsubscribe handlers and cron message selection on fixtures (mock fetch to Open-Meteo with canned JSON); parity test passes.
**L5.3 — Boil Mode (Wake Lock).** On Evap tab add "🔥 Boil Mode": requests Screen Wake Lock (works installed iOS 18.4+), shows a big-type live screen: elapsed time, target temp reminder (from Finish calc if set), quick log-a-draw button, dims to a dark ember theme after 30s idle (regardless of day theme — it's a sugarhouse-at-night feature). Release lock on exit/visibilitychange. Acceptance: lock acquired/released correctly (visible in a status line); screen stays awake ≥5 min in installed PWA.
**L5.4 — App badge.** When a needs-attention rule (L2.2.3) is critical (buddy-sap or spoilage), set `navigator.setAppBadge(1)`; clear on Today view. Silent no-op where unsupported. 

### Level 5 verification
```bash
node worker/test/push.test.js && node worker/test/score-parity.test.js
node --check worker/src/index.js && npm run build && node --check app/app.js
```
Append to DEPLOY-QUEUE.md: `npx wrangler secret put VAPID_PRIVATE_KEY` (+ public key constant in app), redeploy, add cron trigger, test a real push to Damian's phone.
Guardrails: NEVER push more than 1/day/subscriber; every push deep-links to Today; unsubscribing must be one tap from the same toggle; humility copy in every prediction push.

# LEVEL 6 — SugarSage AI (an expert that works in the bush) `[PARALLEL-OK with L4–L5]`

**Objective:** upgrade SugarSage from keyword search to a real expert: semantic search fully offline, cited generative answers when online — at ~$0/month.
**Why (verified July 2026):** on-device generative LLMs are NOT viable on iOS (WebGPU ML crashes; WebLLM/Prompt API unavailable) — but a 23 MB quantized MiniLM embeddings model in Transformers.js WASM IS viable, and Cloudflare's free tiers (Workers AI ~10k neurons/day, Vectorize 5M stored dims) cover the entire cloud RAG workload for a KB this size at $0.

### Tasks

**L6.1 — Structure the knowledge base.** Extract the ~100 SugarSage entries (anchor: the KB array in the SugarSage tab, entries with `q:`/`a:` fields) into `app/kb/sugarsage-kb.json`: `[{id, q, a, category, sources[]}]`. app.jsx imports it at build time (babel can't import JSON into a single file — instead: generate `app/kb/kb.js` (`const SUGARSAGE_KB = [...]`) via `scripts/build-kb.js` from the JSON, and load it via a `<script>` tag in `app/index.html` before app.js; add both to the SW pre-cache list). The JSON is the single source of truth; hand edits to entries happen there. Acceptance: SugarSage tab renders identically from the new source; `scripts/build-kb.js` is idempotent.

**L6.2 — Offline semantic search.** Precompute embeddings at build time: `scripts/embed-kb.js` uses `@xenova/transformers` (all-MiniLM-L6-v2, quantized) in Node to embed every `q + first 200 chars of a`, writes `app/kb/kb-vectors.bin` (Float32, 384 dims × N) + manifest. In-app: lazy-load Transformers.js WASM + the 23 MB quantized model ON FIRST SugarSage search (with a one-time "downloading the offline expert (23 MB) — once, then it works in the bush forever" progress note), cache in the SW tile-cache-style persistent cache; embed the query on-device; cosine-sim against the precomputed vectors; return top 5 with scores. Falls back to the existing keyword search if the model fails/isn't downloaded (flag `sg_flag_semsearch`). Acceptance: query "my lines froze and vacuum dropped" returns the vacuum-troubleshooting entry in top 3 (add `test-assets/semsearch-cases.json` with 10 query→expected-id cases; a Node test script using the same vectors must pass ≥8/10); airplane-mode search works after first download.

**L6.3 — Cloud answers (RAG) `[ONLINE]`.** Worker: `POST /sage` `{question, top_ids[]}` → fetch the matching KB entries (Worker bundles the same kb.json), build a prompt: system = "You are SugarSage, a maple production expert. Answer ONLY from the provided entries; cite entry ids like [7]; if the entries don't cover it, say so and suggest what to check in the field. Producer-friendly tone, units in US customary." Call Workers AI (`@cf/meta/llama-3.1-8b-instruct-fast` — free-tier ~385 q/day) via AI Gateway (caching on). Return `{answer, cited_ids}`. Rate-limit 20/day/IP. App: after offline results render, if online show "✨ Get a synthesized answer" button → streams/loads the cloud answer ABOVE the entry list, with citations linking to the entries, and the standing disclaimer "AI answer — verify against the cited entries." Acceptance: `worker/test/sage.test.js` mocks the AI binding and asserts prompt structure + citation passthrough; offline behavior unchanged when button unused.

**L6.4 — Season Intelligence v2.** The existing rule-based insights (anchor: `insights.push`) get a "Explain my season" button `[ONLINE]`: sends the season aggregates (totals, ratio, brix trend, per-point breakdown — numbers only, no free text) to `/sage` with a different system prompt ("diagnose this maple season's numbers; 3 concrete actions ranked by ROI; cite benchmarks: 0.25–0.3 gal/tap…"). Output renders as a card in Recap. Acceptance: prompt fixture test; graceful offline hide.

### Level 6 verification
```bash
node scripts/build-kb.js && node scripts/embed-kb.js && node test/semsearch.test.js
node worker/test/sage.test.js && node --check worker/src/index.js
npm run build && node --check app/app.js
```
Append to DEPLOY-QUEUE.md: enable Workers AI + AI Gateway on the account (dashboard, free), redeploy.
Guardrails: never send producer log data to any AI except the explicit aggregate numbers in L6.4 after tap; the offline path is the default path (I1); restore the "+ AI" label to the SugarSage header ONLY when L6.3 ships.

---

# LEVEL 7 — SweetRun Live (the mesh premium tier) `[PARALLEL-OK; hardware-gated]`

**Objective:** live vacuum / tank / temperature from Damian's Meshtastic sugarbush mesh, rendered as living pins on the SweetRun map — architected multi-tenant so any subscriber can bring their own hardware in 2027+. This is the booth showstopper and the +$50–100/season premium tier.
**Why:** no maple monitoring exists on Meshtastic (verified white space); commercial rigs are $1,000–3,500; the mesh handoff docs already lock the architecture. Constraint (verified): iOS PWA has NO Web Bluetooth — data path is cloud-only: mesh → gateway → MQTT → Worker → D1/DO → PWA.

### Tasks

**L7.1 — Ingest Worker route.** Extend `worker/src/index.js` (or new `worker-live/` if size demands — prefer one): `POST /ingest` — auth header `X-Sweetrun-Auth: <per-gateway shared secret>` (KV `gateway:<id>` holds secret + owner email). Body: managed-MQTT-broker webhook payload wrapping a Meshtastic message. **Decode protobuf ServiceEnvelope server-side** (verified: JSON MQTT is second-class in Meshtastic 2.7 — not available on nRF52, being deprecated; use `@meshtastic/protobufs` compiled subset or a minimal hand-rolled decoder for TELEMETRY_APP + TEXT_MESSAGE_APP ports; the sensor nodes send compact JSON in text packets per the mesh handoff: `{"v":18.4,"b":3.92}`). Parse → row in D1.
**L7.2 — D1 schema.** Create `worker/schema.sql` exactly per the mesh handoff doc: `users(id, stripe_customer_id, email, created_at)`, `gateways(id, user_id, mqtt_topic_root, shared_secret)`, `nodes(id, user_id, name, kind, lat, lng)`, `readings(id, node_id, ts, kind, value, battery)` + index on `(node_id, ts desc)`. Retention: cron purges readings >18 months.
**L7.3 — Live push to the app.** Durable Object `LiveHub`, one per user (email), WebSocket Hibernation API; `/ingest` forwards each reading to the owner's DO; DO fans out to connected app tabs. App: `GET /live/latest?since=` REST fallback for initial load + polling where WS fails.
**L7.4 — App: SensorPin + Live layer.** In LinesTab: new pin kind `sensor` (kinds: vacuum/tank/temp), rendered with live value + freshness dot (green <15 min, amber <2 h, red stale), tap = 24-h sparkline (reuse existing spark chart code, anchor: `spark`). "Live" layer toggle appears only when `lic` plan is `live` or `sg_flag_live_demo` is on. Today dashboard gains a compact Live strip (min/max vacuum, tank %, bush temp) when active.
**L7.5 — Demo mode for the booth.** `sg_flag_live_demo` loads a scripted 48-h replay of realistic sensor data (generate from the mesh handoff's expected ranges: vacuum 15–22 inHg with a leak event dropping to 9, tank filling 0→82%, temp swinging −8→+6 °C) driven by a timer — completely offline. This is the airplane-mode booth demo.
**L7.6 — Plan gating.** Token `plan` field: `season` (base) | `live` (premium). Worker webhook maps Stripe price → plan via `metadata.plan` (set when Damian creates the premium payment link). License modal shows plan. Live layer locked behind `live` (with demo mode as the teaser + "Get SweetRun Live" CTA).

### Level 7 verification
```bash
node worker/test/ingest.test.js   # fixture protobuf/text payloads → expected D1 rows (mock D1)
node --check worker/src/index.js && npm run build && node --check app/app.js
```
Append to DEPLOY-QUEUE.md: create D1 db + apply schema.sql; provision EMQX/HiveMQ free broker w/ webhook → /ingest; per-gateway secret for "Home Gateway"; flash vacuum node when hardware arrives (mesh build doc).
Guardrails: hardware is NEVER a launch dependency (BL2); demo mode must be indistinguishable in polish from live mode; per-user topic isolation (`sweetrun/<uid>/…`) enforced at the broker AND checked at ingest.

---

# LEVEL 8 — The self-marketing engine `[PARALLEL-OK with L4+]`

**Objective:** every artifact a producer creates markets SweetRun; the product generates its own SEO assets from real data; leads nurture themselves.
**Why:** small-site Google organic is down ~33–38% and scaled AI pages get penalized — but pages where REAL DATA dominates the template still win; per-record OG cards are free on Workers (workers-og); Cloudflare Email Service (beta, Apr 2026) / Resend free tier covers drip email. The QR provenance loop already exists and is unique.

### Tasks

**L8.1 — Share cards for everything.** Worker route `GET /og/*` using `workers-og` (Satori — flexbox-only CSS): templates for (a) batch provenance (grade color band, ratio, sugarbush name), (b) Season Recap (SweetRun Score, totals, YoY), (c) run-day forecast ("Score 91 tomorrow in Waldo County"). Cache in KV. batch.html + a new share flow in Recap set `og:image` to these URLs. App share buttons use `navigator.share` (native sheet) with the URL. Acceptance: `worker/test/og.test.js` renders each template with fixture data (assert 200 + image/png header via satori mock or snapshot of the HTML input); social-preview lint of batch/recap URLs.
**L8.2 — Provenance v2 (the viral loop).** batch.html gains: producer name/sugarbush field (already in QR params), a tasteful "Track your own sugarbush → sweetrun.app" footer (exists — keep), plus NEW: "🍁 See this season's story" — if the producer opted in (new checkbox in label generator), the QR carries a recap-summary param set rendering a mini season story. Label generator (anchor: the canvas label code, `qrserver`) switches to OFFLINE QR generation (bundle a ~4 KB QR lib into app.jsx — no more api.qrserver.com dependency) — this makes labels work in the bush AND removes the external dependency. Acceptance: generated label scans correctly (test 3 phones), offline generation verified airplane-mode.
**L8.3 — Live sap-run pages (programmatic SEO done right).** Static-generated pages `runs/<state>.html` (start: VT, NY, ME, NH, WI, PA, OH, MI, ON, QC) — each shows the CURRENT 7-day run score for 3–5 representative towns (Worker cron writes a small JSON to KV; a scheduled GitHub-independent Worker route `GET /runs/<state>` serves HTML server-side rendered from a template — keep it a Worker route, not repo files, so it's always fresh). >40% of each page = live data (scores, freeze-thaw table, soil temp) → passes the real-data test that survived the March 2026 core update. Each page: FAQ schema, front-loaded answer ("Will sap run in Vermont this week? Score: 84 — likely."), CTA to the app. Sitemap gains the 10 URLs. Acceptance: HTML validates; Lighthouse SEO ≥95; every number on the page traces to a live API value (no hallucinated content).
**L8.4 — Email nurture.** Worker cron (weekly, off-season monthly): reads `lead:*` KV, sends via Cloudflare Email Service (if GA/beta available on the account) else Resend free tier (3k/mo): (a) trial-day-10 nudge, (b) pre-season "your trial wakes up soon" (Nov), (c) run-season weekly digest ("this week in your area: 3 run days predicted"). All emails: one-click unsubscribe (KV flag), plain-text-first, from hello@sweetrun.app. Templates in `worker/emails/*.txt` with `{{placeholders}}`. Acceptance: `worker/test/email.test.js` — template rendering + unsubscribe honored + send-window logic on fixture dates.
**L8.5 — Referral loop.** Token gains optional `ref` code (producer's short code, shown in license modal: "Give a friend 20% off — you get a free month per signup"). Stripe promotion code created per-referrer is manual for now — v1 scope: the app shows the producer's code + share message; Worker `/stats` counts redemptions (Damian applies rewards manually). Acceptance: share sheet fires with prefilled message; code visible in modal.

### Level 8 verification
```bash
node worker/test/og.test.js && node worker/test/email.test.js
node --check worker/src/index.js && npm run build && node --check app/app.js
```
Guardrails: no AI-generated filler content on SEO pages (real data only — this is a penalty risk, verified); provenance opt-ins default OFF; every email has unsubscribe; never email trial users more than the 3 defined touchpoints.

---

# LEVEL 9 — Monetization completion

**Objective:** finish the commercial machinery the BL2 plan specifies: founding rate, guarantee, premium tier, association blocks, renewals.

### Tasks

**L9.1 — Pricing page truth.** Landing pricing card: "$49.99 / season" with "🍁 Founding Producer: $29.99/season for life — 43 of 50 left" (count from Worker `/stats` founding purchases, cached; hardcode "50 available" until API wired). Full-season money-back guarantee sentence: "Use it all season. If it didn't earn its keep by your last boil, email me for a full refund." Acceptance: copy identical on landing + license modal + success page.
**L9.2 — Stripe artifacts (DEPLOY-QUEUE items, code where applicable).** Founding price $29.99/yr with `metadata.plan=season` + `metadata.founding=true`; premium "SweetRun Live" price (+$50/yr, `metadata.plan=live`); Stripe Tax ON; webhook already maps metadata.plan → token plan (verify in worker code; extend if only default handled — acceptance: unit test maps all three products to correct plans).
**L9.3 — Association block licensing.** Worker: `POST /mint-block` (ADMIN_KEY-auth) `{count, plan, association, discountNote}` → generates N tokens, returns CSV (email,blank + token rows) for Damian to distribute; `/stats` shows per-association redemption (token gains optional `assoc` field; app pings `assoc` on activation event). One-page pitch doc `docs/associations.md`: block pricing 25 keys/$999 · 50/$1,799 · 100/$2,999, member-benefit framing, contact. Acceptance: mint-block test generates verifiable tokens; pitch doc exists.
**L9.4 — Renewal mechanics.** Token `x` (expiry) = purchase + 400 days (already). App: 30 days before expiry, license modal + a Today attention-rule show "Your Season Pass renews soon"; if Stripe subscription is active it just works (webhook re-mints on `invoice.paid` — ADD this event handling: on invoice.paid for a subscription, re-mint + KV-update the email's token; acceptance: unit test). December email (L8.4) references renewal. Lapsed = trial-expired behavior (I2 protects data).
**L9.5 — Terms + privacy pages.** Create `terms.html` + `privacy.html` (plain language, one-person-project voice): subscription/refund/guarantee terms; privacy: local-first storage, opt-in cloud backup (encrypted in transit, deletable on request), analytics = anonymous counts, emails = the 3 touchpoints + unsubscribe. Footer links from all pages. Acceptance: pages exist, linked, noindexed NOT (these should be indexable), copy contains the guarantee verbatim from L9.1.

### Level 9 verification
```bash
node worker/test/plans.test.js   # metadata→plan mapping, invoice.paid re-mint, mint-block
grep -rn "49.99" index.html success.html app/src/app.jsx | wc -l  # all consistent (manual read)
```
Guardrails: founders can never be undercut (no future price below $29.99 without grandfathering); guarantee wording identical everywhere; blocks only via ADMIN_KEY.

---

# LEVEL 10 — Performance, hardening & launch ops

**Objective:** fast on rural LTE, robust, accessible, bilingual, and ready for the January booth.

### Tasks

**L10.1 — Payload diet.** Current: ~428 KB app shell HTML + ~565 KB app.js re-fetched network-first each open ≈ 1 MB/launch on rural cell. Fix: (a) SW strategy for app.js + shell → stale-while-revalidate with cache-busting via `?v=<CACHE>` query tied to the SW version; (b) lazy-load heavy libs — jsPDF and Leaflet load on first use (dynamic `<script>` injection with cached SW responses), not at boot; (c) `_headers`: long-cache immutable for `/app/kb/*`, model files, icons. Target: repeat-open transfer <30 KB (verify via DevTools network, cold vs warm). Acceptance: warm-open transfer measured <30 KB; first meaningful render <2s on throttled Fast-3G profile.
**L10.2 — Error + analytics hygiene.** Global `window.onerror`/`unhandledrejection` → ring buffer of last 20 errors in `sg_errlog` + "Copy diagnostics" in BackupModal; NO remote error reporting (privacy stance). Verify Cloudflare Web Analytics beacon is on the landing page only (not in-app). Acceptance: thrown test error appears in diagnostics; grep app shell for beacon = absent.
**L10.3 — Accessibility pass.** All interactive elements: aria-labels; focus states visible in both themes; chips/steppers keyboard-operable; contrast check script (L1.2) extended to warn/danger/info-on-card pairs at ≥4.5:1. Acceptance: axe-core scan (run via a simple puppeteer-less checklist if tooling unavailable — manual keyboard walk of Today/Log/quick-log) documents zero blockers.
**L10.4 — Finish French.** Route all L2–L9 new strings through `t()`; complete `TR.fr` for: nav zones, Today blocks, quick-log, license modal, backup modal, alerts copy. Hardcoded-English tab labels (anchor: `'Tubing 🔧'` etc. in the tabs array) get TR entries. Acceptance: FR toggle shows zero English in primary surfaces (Tools-grid tool INTERNALS may remain partial — log remaining gaps in commit).
**L10.5 — /start page + FB escape hatch.** New `start.html`: detects in-app browsers (FB/Instagram UA) → full-screen "Tap ⋯ → Open in Safari/Chrome to install SweetRun" instructions; otherwise redirects to `/app/`. QR cards and FB posts always link `/start`. Acceptance: UA-spoofed test shows interstitial; normal browser redirects.
**L10.6 — Booth kit build.** `docs/booth/`: demo script (90-second walkthrough: Today score → demo season → quick log in 3 taps → map with live sensors (L7.5 demo) → provenance label scan), airplane-mode reset checklist, printable QR card PDF (links `/start?src=nys27`), founding-rate one-pager. Acceptance: docs complete; demo walkthrough executable start-to-finish offline on a phone in <3 min.
**L10.7 — End-to-end funnel test (from BL2 validation).** Scripted checklist `docs/funnel-test.md`: fresh device → landing → /start → install → trial → demo → quick log → (Stripe TEST purchase) → key on success page → activate → cloud backup → restore on second device. Every step has expected result + screenshot slot. Acceptance: Damian (or agent-guided session) completes with zero failures; failures become L10 punch-list items.

### Level 10 verification
All prior level verifications re-run green + funnel test executed + Lighthouse (mobile): Performance ≥85, SEO ≥95, A11y ≥90 on landing; app warm-open <30 KB.

---

## Deployment queue protocol

`DEPLOY-QUEUE.md` accumulates numbered human-only actions (wrangler, Stripe dashboard, broker signup, DNS). Each entry: prerequisite level, exact commands/clicks, verification step. The agent appends; Damian executes top-down and checks off. Current known queue seeds: license Worker deploy (see `worker/DEPLOY.md`), hello@ email routing check, Stripe founding/premium prices + Tax + redirect URL, Workers AI + AI Gateway enable, D1 + broker (L7), VAPID keys (L5), Email Service/Resend (L8).

## Success metrics (from validated BL2 plan — do not inflate)

Year one (through April 2027): base case 8–25 paying producers; goal 20+ with 5 testimonials and 60%+ renewal intent; trial→paid target ≥10% by Mar 15 else price tripwire fires ($39.99, founders untouched). Product metrics: warm open <30 KB, 3-tap log ≤5s, zero data-loss incidents, push opt-in ≥40% of licensed users.

## What is explicitly OUT of scope (do not build, even if tempting)

Native apps / Capacitor wrappers; Web Bluetooth anything; accounts/login; on-device generative LLMs; analog-gauge computer vision; multi-user sync/merge (backup-restore only); freemium tier; lifetime pricing beyond the founding cap; splitting app.jsx into modules; any feature that requires the network to log sap.

*End of specification. Version 1.0. Update this document as levels complete — mark tasks `✅ <date> <commit>`.*

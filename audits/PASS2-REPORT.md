# Pass 2 — One number, one voice
**Executed 2026-09-20. All edits in `app/src/app.jsx` (source only — invariant #1), plus `tests/formulas.test.mjs` and the `app/sw.js` cache bump. Line references are post-edit.**

**Verification used throughout:** `tests/formulas.test.mjs` after every batch (**49 passed, 0 failed** final — 37 original + 12 new); full-file syntax check with `@babel/parser` (JSX plugin) — PARSE OK; full compile with `@babel/core` + `@babel/preset-react` to a scratch file — built clean; compiled bundle evaluated end-to-end in Node with stubbed React/DOM — EVAL OK (all components define, boot path runs). The browser pane cannot reach the sandbox's localhost, so no click-through screenshot pass; noted per item below.

---

## 1. Shared season metrics — DONE
- Added to the formula-layer band (inside the test-extracted region): `seasonTotals(slog)` → `{sapT, syT, roT, evapT, fuelT, hoursT}` and `actualRatio(sapT, syT)` (app.jsx:856–875).
- Replaced the five local total computations:
  - TodayTab :9327 (was a local `tot()` reduce; `ratio` now `actualRatio(sapT, syT)` — same null semantics)
  - LogTab :3161 (local `tot()` reduce removed)
  - RecapTab :8809–8810 (local `sumLog` removed; local ratio renamed `ratioActual` = `actualRatio(...) || 0` so the module function isn't shadowed; renders at :8971, :9104–9127 updated to the new name — same `toFixed` rounding)
  - SeasonIntelligence :7326
  - DiagnoseTab :9468–9475 (shared totals, then Diagnose's own `_gal` normalization wraps the results, unchanged) and :9701–9703 (prev-season totals)
- Displayed rounding untouched everywhere (e.g. Today still renders `:1` at 0 dp, Recap at 1 dp — same values, per the instruction not to change rounding beyond identical-inputs-identical-numbers).
- Tests: 6 new assertions (sapT sums with `parseFloat||0`, missing-array → 0, hoursT, actualRatio value + null-before-syrup).

## 2. Score reconciliation — DONE
- New `seasonScore({sapT, syT, fuelT, taps, brix, yieldModel, fuelSpu})` in the formula layer (app.jsx:882–914), Recap's documented weighting adopted: Yield/Tap 30 · Evap Efficiency 40 · Fuel 20 · Data Complete 10; same graded/grade rule ("—" until ≥3 sub-scores and syrup logged).
- SweetRunScore (Recap) now calls it (:8479) and only adds display detail strings; SeasonIntelligence calls it (:7364–7367) for its sub-score bars, overall %, and letter. SugarSage previously averaged 3 unweighted sub-scores with no data-completeness — that was the 37 vs Recap's 46. Both screens now show the identical number and letter for the same season (both pull the same inputs: shared totals, `parseInt(trees)`, `parseFloat(sapBrix)||2`, `yieldModelSaved()`, `sg_fuel`'s spu). SI's insight prose is unchanged; its efficiency insight reads `effScore` from the shared model (same formula it previously duplicated).
- Tests: 6 new assertions (eff cap, yield cap, fuel sub-score, weighted overall 97, grade A, ungraded-before-syrup).

## 3. Single settings store — DONE
- `getSetting(key, legacyKeys, fallback)` (app.jsx:916–923): canonical first, then legacy keys (first found is migrated to canonical via `ls.set` — legacy data keeps working, nothing deleted), else fallback. Canonical accessors (:929–933): `getSyrupPrice()` → `sg_price_syrup` (legacy `sg_syrup_price` → `sg_dx_price` → `sg_bev_price`, then the wizard's stored `syrupPrice`, then 40); `getWoodCost()` → `sg_cost_wood` (legacy `sg_dx_wood`, 80); `getLaborRate()` → `sg_rate_labor` (legacy `sg_dx_labor` → `sg_laborrate` → `sg_bev_lrate`, 15). Legacy order puts change-only (deliberate) keys before mount-persisted defaults.
- Wired: DiagnoseTab (:9448–9450 reads; :9908/:9913/:9918 saves now write canonical keys) — its price default is now the wizard's stored price, never a bare $65; its labor default drops 20 → 15 (the value two of three screens used). BreakevenCalculator (:7555, :7558; persistence effects :7564, :7567 write canonical). Recap's YieldGapAnalyzer (:8579 read, :8708 write). EvapTab labor rate (:1647 read, :1659 write). `sg_dx_vac`/`sg_dx_robrix` untouched (not price/labor/wood).

## 4. Wizard selection color — DONE
- `Opt` (app.jsx:1055) now hardcodes the app accent `#2dd4a7` for selected border/background/label; the ten per-step `accent="#…"` props (blue/purple/green/amber) removed from call sites. Pan-size chips (:1136–1140) switched from amber to the same teal. Icon glyphs keep their tint behavior (teal when selected, gray otherwise). Recap's `Stat accent` props are data-palette stat cards, not selection states — untouched, per the plan's "data palette stays on data."

## 5. Finish RECOMMENDED badge collision — DONE
- Default `deMode` is now `'straight'` (:2077), matching `recMode` for the initial 10 gal (≤25 → Straight Mix); the card no longer defaults to Precharge while recommending Straight Mix.
- Badge no longer absolutely positioned over the title: it renders as its own line above the title (10px, 0.08em letterspacing, star icon) (:2221–2222); title `paddingRight` hack removed. No overlap possible at any width.

## 6. Diagnose chip wrap — DONE
- Finding-card header restructured (:9825–9840): title takes the full row (fontSize 15, weight 700, normal wrapping; only the 14px chevron beside it), ROI + severity chips move to their own flex row beneath (`gap:6`, `flexWrap:'wrap'`), summary below that. No more one-word-per-line at 375px.

## 7. Break-even focus loss (Debug H5) — DONE
- `BevInput` hoisted from `BreakevenCalculator`'s body to module scope (:7533–7551), byte-identical implementation. It was recreated as a new component type each render, so React remounted the input and dropped focus on every keystroke. One hoist fixes both instances (the calculator renders on Shed → Weather and SugarSage). Verified by reading: no other `const X = (…) => JSX` used as `<X/>` remains inside this component; the wizard's `Opt` has the same pattern but holds no focusable inputs (buttons only — pre-existing, out of scope).

## 8. Trial-expired false alerts (Debug H3) — DONE
- The lock in `ls.set` now distinguishes writes (app.jsx:5–45):
  - **Preference/UI-state keys** (allowlist `SR_PREF_KEYS` + prefixes `sg_last_screen/sg_pan/sg_dx_/sg_bev_/sg_recap_`, :14–22) silently succeed while locked — tab memory (`sg_last_tab`), calculator assumptions, settings (incl. the new canonical keys), weather location. This matches the "viewing always works" promise; none of these are season data.
  - **Unchanged-value writes** on locked data keys silently no-op returning true (:37–44) — mount-persist effects (e.g. TasksTab re-writing `sg_checks2` on open) no longer fire the banner just for opening a tab.
  - **Genuinely new values on data keys** (`sg_logs2`, `sg_batches`, `sg_lines_pins`, `sg_brixlog`, `sg_treenotes`, `sg_equip2`, `sg_cpoints`, `sg_mainlines`, `sg_rotation`, `sg_checks2`, `sg_custom2`, `sg_fresh_*`, `sg_wizard_data`…) still lock and surface the banner — the lock is not weakened for real data.

## Housekeeping
- `app/sw.js` cache bumped `sweetrun-v14` → `sweetrun-v15` (once, at the end).
- `app/app.js` NOT touched (stale generated file; owner rebuilds locally). No new dependencies, no build changes, no locale-formatted dates added, all data still under `sg_*`.

## Observed but deliberately NOT changed (pre-existing, flagged for a later pass)
1. **Diagnose YoY units:** current-season totals are `_gal`-normalized but prev-season totals are not (now commented at :9701) — for litre users the YoY % compares mixed units. Matches prior behavior exactly; fixing it changes displayed numbers, so it belongs in its own reviewed change.
2. **SugarSage context** (`hasRO` boolean, :8062-area) still does a local reduce — it's a >0 existence check, not a displayed number.
3. The wizard's progress bar still runs the teal→blue gradient (Cal noted it); it is not a selection state, so left for Pass 3's consistency strip.

# Pass 7 — Season Replay + Share Card
**Executed 2026-09-20. Edits in `app/src/app.jsx` and `app/index.html` (CSS) only, plus `app/sw.js` cache bump v22→v23 (once, at the end). `app/app.js` untouched. No new dependencies — canvas + SVG-path geometry + CSS. No new network calls; the share card is a local PNG (OS share sheet or download), nothing leaves the device.**

**Verification after every batch:** `cp app/src/app.jsx /tmp/app.jsx && SWEETRUN_SRC=/tmp/app.jsx node tests/formulas.test.mjs` → **88 passed, 0 failed** (69 + 19 new replay assertions); `/tmp/sr-check` compile (`COMPILE OK` 722,606 bytes) + stubbed eval (`RENDER CALLED` / `EVAL OK`); **new this pass:** `/tmp/sr-check/sharecard.mjs` (executes the extracted `srDrawShareCard` against a recording 2D-context stub + a Path2D stub that lexes the SVG path grammar — 11 assertions: name/season/stats/labels/wordmark drawn, two stroked paths, ground gradient + vignette, balanced save/restore, FR accents, em-dash placeholders) and `/tmp/sr-check/replaysmoke.mjs` (walk-renders RecapTab + ReplayStage in 6 configurations: EN/FR, autoplay/reduced-motion, single-day season, empty season — 713 elements walked). Both detectors were **negative-controlled**: a corrupted tree `d` string and a deleted wordmark each failed `sharecard.mjs` by name; a planted ReferenceError in ReplayStage failed the walker by name; all reverted. Nothing was **visually** verified in-sandbox — the eyes-on list below is the contract.

---

## 1. Season replay — DONE

**Entry point.** A two-button row at the top of Recap (`.rp-row`, `recap-no-print`): **Replay season** (stroke `I.play`, control tier) and **Share card** (`I.upload`). Replay enables at ≥3 dated sap/syrup entries (`srReplaySteps(...).entryCount >= 3`); while disabled, a one-line hint explains why ("Replay opens once 3 dated entries are logged" / «La rediffusion s'ouvre après 3 entrées datées»).

**The stage.** `ReplayStage` (module-scope — the Pass-2 BevInput lesson) opens over the card as a centered glass panel (`.scrim.rp-center` + `.rp-stage`: Pass-3.5 glass values — rgba(13,21,33,0.88), blur(12px), teal hairline, inset top highlight). Esc closes (window keydown, removed on unmount); scrim click closes; hidden from print (`.scrim` added to the print `display:none` set).

**Data (invariant 4).** All frames come from `srReplaySteps(slog)` in the tested FORMULA BAND: the sap entries get **exactly** SapChart's own map/filter/sort (including its string-comparator sort — debt-#6 dates inherited, not re-decided), grouped one step per logged DAY (sap or syrup date), with running totals as cumulative sums of the same `parseFloat(e.val)` `seasonTotals` sums. The replay's final frame is the Recap bar chart, bar for bar; `maxBar` is SapChart's `maxVal`. Captions come from `srReplayMoments`: best run = the chart's highlighted max bar, first boil = first `syrupMade` day, peak brix = max of the same `sg_brixlog` values the Brix stats card uses — surfaced only when its date is a replay day (no invented days). Zero storage writes, zero network.

**The sweep.** A rAF loop advances **one step per logged day** on the `srReplayStepMs` cadence (10s target, clamped 400–1600 ms/step, locked by tests); everything between steps is CSS transitions on transform/opacity only: bars reveal by `scaleY(0→1)` (origin bottom, 0.35 s), the amber timeline fills by `scaleX`, captions and the best-run label fade by opacity. Running totals are `RpNum` — a 300 ms rAF tween from the *previous* value (tabular-nums monospace, the map-HUD voice). Controls: Pause/Play while sweeping; at the end, **Replay** + amber **Share card**. Caption line is `aria-live="polite"`; the bars are `aria-hidden` (the numbers carry the meaning).

**Reduced motion.** No autoplay: the stage opens at day 1 with **Prev/Next** step buttons (44 px), same content, same captions; Share card always visible; every `.rp-*` transition killed in CSS (`transition:none`) and `RpNum`/the rAF loop both bail in JS (`srReducedMotion()`), so values and bars land at their end state instantly.

## 2. Share card — DONE

`srDrawShareCard(ctx, o)` draws the 1200×630 canvas **entirely programmatically** (module scope, extractable — that is how it's tested):
- Ground: linear gradient #0B1F14 → #1E4A34 (brand deep greens), then a radial **vignette** (transparent centre → rgba(0,0,0,0.34) edges).
- The **outline tree**: `M.tree`'s two `d` strings were hoisted to `M_TREE_CROWN_D`/`M_TREE_GROUND_D` (byte-identical; the JSX component now references them — one geometry, two renderers) and stroked via `Path2D` at 48-grid × 8.4 ≈ 400 px, amber #EB9A33, stroke 2.2/3.4, round joins — the outline grammar at large-art size; **Amber Glass stays reserved** for rendered material art per BIBLE.
- Text: operation name (Recap's `sg_operator` field, else "My sugarbush"/«Mon érablière»), "MAPLE SEASON 2026"/«SAISON DES SUCRES 2026» in tracked amber caps, amber hairline.
- Four big stats in 62 px **monospace** (ui-monospace stack — canvas has no `font-variant-numeric`, so the mono stack is how the digits stay tabular): syrup, sap, actual ratio, taps — the **same** `fmt(syrupGal,1)` / `fmt(sapGal,0)` / `ratioActual.toFixed(1)` / `trees` the Big-4 cards render, passed as formatted strings from RecapTab's own scope. Missing values render as — (never 0).
- "sweetrun.app" wordmark bottom-right in muted amber rgba(235,154,51,0.55).
- **NO location, NO map imagery** (privacy, by design).

**Export.** `canvas.toBlob` → if `navigator.canShare({files})` the OS share sheet gets the File (mobile path; an `AbortError` = user cancelled, no fallback nag); else an `<a download>` saves `sweetrun-season-YYYY.png`. Object URL revoked after 4 s. Reachable from the always-present Recap button **and** from the replay's end state. FR sessions get FR labels on the card itself.

## 3. Honest verification ledger
| Claim | How verified |
|---|---|
| Replay math (steps, totals, moments, cadence) | 19 band assertions in `tests/formulas.test.mjs` (fixture season: 4 sap days incl. a two-entry day, 2 syrup days, brix log; empty-season and off-day-brix edges) |
| Replay + Recap render without runtime errors (EN/FR, autoplay/reduced, 1-day, empty) | `replaysmoke.mjs` walker, negative-controlled |
| Card drawing executes; every string lands; tree paths are valid SVG grammar | `sharecard.mjs` recording stub, negative-controlled twice |
| Whole bundle still compiles + evals | `/tmp/sr-check` compile + evalrun |
| **Not verified (needs a browser):** pixel truth of the card (gradient feel, tree placement, long-name clamp at maxWidth 640), toBlob/share/download behavior, transition smoothness, real cadence feel | — |

## Reduced-motion table
| Element | Motion | Under `prefers-reduced-motion` |
|---|---|---|
| Autoplay sweep | rAF step advance | not started — Prev/Next buttons instead |
| Bars | scaleY 0.35 s | `transition:none` — appear at end state |
| Timeline fill | scaleX 0.4 s | `transition:none` |
| Captions / best-run label | opacity 0.3 s | `transition:none` |
| Running totals | 300 ms rAF tween (RpNum) | value renders immediately (JS bail) |
| Stage entrance | existing `.scrim/.sheet` keyframes | already killed by existing rule |
| Share card | none (static PNG) | unchanged |

## Needs eyes-on after deploy
1. **The card, full size:** open the downloaded PNG at 100% — tree placement vs the text column (crown left edge ≈ x 838; name maxWidth 640 must never touch it), long operation names squeezing legibly, mono digits aligned, vignette subtle not muddy, wordmark quiet. Try a 40-character FR name.
2. **Mobile share path (iPhone + Android):** the OS share sheet receives the PNG; cancelling doesn't trigger a download; desktop falls back to a clean download named `sweetrun-season-2026.png`.
3. **Replay cadence by feel:** a ~15-day season should read as one satisfying ~10 s sweep; captions legible at speed; the two-entry day showing two bars in one step.
4. **Replay at 390 px:** 25+ bars still ≥2 px wide with the 2 px gap; best-run label not clipped at the stage's top padding; FR button strings («Précédent»/«Carte de partage») fit the control row.
5. **Reduced-motion device pass:** stage opens on day 1, nothing animates, Prev/Next step correctly, totals jump.
6. **Replay → Share handoff:** end-of-sweep Share button produces the same card as the Recap button.
7. **Print:** with the replay open, window.print() must not show the scrim (`.scrim` added to the print hide list — confirm no other sheet relied on printing, none should).
8. **FR by a native eye:** «Rediffusion de la saison», «Sève à date», «meilleure coulée», «Brix max», «SAISON DES SUCRES».

*Margin note: the replay is the season the producer already logged, played back at the speed of pride; the card is the one screen of this app designed to be seen by someone who doesn't own it. Neither invents a number — that's why they can be shown around.*

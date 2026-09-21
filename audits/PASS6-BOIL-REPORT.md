# Pass 6 — Boil Day: the sugarhouse instrument
**Executed 2026-09-20 (Cal). Edits in `app/src/app.jsx` and `app/index.html` (CSS) only, plus `app/sw.js` cache bump v21→v22 (once, at the end). `app/app.js` untouched. No new dependencies.**

**Verification after every batch:** `cp app/src/app.jsx /tmp/app.jsx && SWEETRUN_SRC=/tmp/app.jsx node tests/formulas.test.mjs` → **69 passed, 0 failed** (59 + 10 new dial assertions); `/tmp/sr-check` compile (`COMPILE OK` 706,866 bytes) + stubbed eval (`RENDER CALLED` / `EVAL OK`); **new this pass:** `/tmp/sr-check/boilsmoke.mjs`, a walk-renderer that actually executes BoilDayTab in six configurations — idle EN/gal, idle FR/L(°C), active-near EN, active-draw FR/°C, active-over EN, and Today with a live session (463 elements walked, all OK). Per the "a detector that has never fired is untested" rule, the walker was negative-controlled: a ReferenceError planted in a scratch copy was caught by name, then reverted. The sandbox still cannot serve these files to any browser (top-level `data:` navigation is blocked in Chrome, so inlining the 707 KB bundle is not a route either) — **nothing was visually verified**; the eyes-on list at the bottom is the contract.

---

## 0. Committed direction (written before the screen was built — Law 1; also in the comment block atop `BoilDayTab`)

**Direction — "the instrument on the arch."** One screen that lives on the sugarhouse iPad for eight hours and reads from three metres. It is Boil Pt's amber result card — the app's earned signature moment — grown into a full instrument: **amber #EB9A33 owns the draw-off target, teal stays on controls, red appears only past the band.** Chrome recedes to 10–11px tracked caps in the map-HUD language; the data is 26–52px tabular monospace.

**Density — sparse-and-huge.** Pan temp 52px, counters 34px, instrument figures 26px; every control ≥48px for a gloved thumb (temp steppers 56px). One primary action per state: idle → *Start boil*; boiling → the temp steppers are the working control (*End boil* is a quiet outline at the foot); summary sheet → *Log this boil*.

**Component vocabulary.** Existing `.card` / `.scrim` / `.sheet` / `.btn-primary` / `.eyebrow` / `.data-row` / `NumInput`; new `bd-*` classes defined once in app/index.html (dial band, rim pointer, steppers, counter chips, HUD strip, steam wisps, Today chip). The dial is inline SVG. The band and the draw-state numeral are the only glowing things in the app outside the map — deliberate.

**Placement decision.** A sub-tab of Numbers (`boilday`, after Evap), labelled **Boil Day / Bouillée** — not first position, so the Numbers destination still lands on Sap for the eleven months a producer is not boiling; the Today chip is the boil-season fast path (one tap from the front door). A tab named just "Boil" beside "Boil Pt" would be two tabs sharing a noun — named it out. `DESTS` is the single registry: bottom nav, mobile sub-tab strip and the desktop sidebar all picked the screen up from the one table entry (verified in the shell code — `side-subs` iterates `d.tabs`).

**Temperature unit.** Display follows `sg_units`: GAL → °F primary, L → °C primary (Québec boils in Celsius); the other unit rides the small line under the numeral. Everything is **stored in °F** so `srBoilState`/`finTemp` never fork; storage at 0.01°F so a ±0.1°C step (±0.18°F) never drifts. Band = ±0.3°F ≡ ±0.17°C — the resolution of a good syrup thermometer, and the reason the state machine carries a one-decimal-rounded finTemp (212 + 7.1 is not exact in floats; the tests would have caught the boundary lie).

## 1. The dial — DONE
- **Where:** `BoilDayTab` (after `BoilPtTab`), state machine `srBoilState`/`srGaugeFrac` + `BD_BAND_F`/`BD_NEAR_F` in the FORMULA BAND; CSS `.bd-dial-wrap`/`.bd-band`/`.bd-needle`/`.bd-readout` etc.
- **Geometry (measured, in the code comments):** 240° arc, viewBox 300×230, centre (150,150), r 118 — the arc's lower endpoints land at y = 209, which is why the viewBox is 230 tall (the first draft's 200 clipped them; caught by computing the endpoints, loop 1). Track hairline `#131e2c`, temp fill arc in the state colour at 0.5 opacity, target band (finTemp ± 0.3°F) at r 118 stroke 14 in amber. Ticks: minor every 1°F / 0.5°C (r 92–104), labelled majors every 2°F / 1°C **outside the bezel at r 136** — inside at r 76 they sat 79 px from centre and the 52 px numeral's half-width is ~95 px (collision computed, loop 2). Pointer is a **rim stub** (r 82→106) rotated about the centre with a 0.5 s transform transition — a full needle would sweep through the numeral.
- **Range:** waterBP − 2 → finTemp + 4 (°F), per brief. `waterBP` is the same `sg_bp` state BoilPtTab writes — passed down as the existing prop, not forked; altitude set on Boil Pt moves this dial's whole scale (locked by the `srBoilState tracks altitude BP` test).
- **States:** warming (teal fill, calm) → near at fin−2°F (band pulses at 1.6 s, numeral amber) → **DRAW OFF** at fin±0.3°F (steady strong glow on band + numeral, `SOUTIREZ` in FR, one `navigator.vibrate([180,90,180])` on entry, guarded try/catch) → over (red numeral + fill, band dimmed, "Over target — draw now"). The state line is `aria-live="polite"`; the ticking HUD is deliberately **not** a live region (a per-second announcement is not accessibility).
- **No sensor exists and none is faked:** the needle moves only when the producer moves it — steppers −0.5 / −0.1 / [type] / +0.1 / +0.5 in the display unit (56 px targets), plus the standard `NumInput` (comma-decimal tolerant) as tap-to-type.

## 2. Session instruments — DONE
- **Elapsed** h:mm:ss in the HUD strip (glass pill, map-HUD caps), driven by a 1 s interval only while active; survives restarts because `sg_boil_session.start` is an **epoch timestamp** (invariant 6 — no locale strings in the new key).
- **Counters** as two full-width glass panels: Sap in (+1/+5/+10, 0 dp) and Syrup drawn (+0.5/+1/+5, 1 dp), 34 px tabular-mono values, 48 px teal chips, per-counter *Undo last (−n)* (component-state only). `BDCounter` is **module-scope** — defined inside the tab it would have remounted its DOM on every clock tick (the Pass-2 BevInput lesson, caught in loop 1).
- **Session ratio** sap/syrup vs `RULE_DIVISOR/brix` ("Theory: 43:1 · 2.0°Bx") and **boil rate** sap/hour vs the rig's expected GPH from EvapTab's own persisted pan (`sg_panIdx/panW/panH`; custom pans use the same area×2.5 EvapTab uses). Rate reads "—, shows after 15 min" before 0.25 h — 5 gal in two minutes is not a 150 gal/h rig, and this instrument does not print numbers it doesn't believe.
- Counter values are in the user's display unit, exactly as stored log values are (Pass-1 litre-semantics decision), so they flow into entries without conversion.

## 3. Placement + Today chip — DONE
- `DESTS` → Numbers tabs: `{ id:'boilday', Icon:I.flame, label:t('tabBoilDay') }` after Evap; render line beside the other tabs; desktop sidebar inherits automatically.
- Today: a quiet full-width row under the season card — idle: flame glyph + "Boiling? Open Boil Day / Ça bouille? Ouvrez la Bouillée"; active: amber border, pulsing amber dot (static under reduced motion), "Boiling — **2:14** elapsed" ticking on a 30 s interval (the chip shows h:mm; a 1 s tick would be theater).

## 4. Ambience — DONE
- Three steam wisps (3 px, blurred, transform/opacity rise, 4.2 s staggered 0/1.4/2.8 s) above the dial — **the screen's only looping animation**, rendered only during an active session, skipped in JS under reduced motion and `display:none` in CSS as belt-and-braces.
- Panels use the Pass-3.5 glass values (`rgba(13,21,33,·)`, teal hairlines, inset highlight). Contrast rides one stop above the app: 52 px readout, white + amber glow at draw. All new colours are brand amber/teal, the danger red, or existing greys; the data palette is untouched.

## 5. Keep-awake + end — DONE
- **Wake Lock** while a session is active: `navigator.wakeLock.request('screen')` in try/catch (progressive enhancement — an unsupported browser dims as it always did), re-acquired on `visibilitychange`→visible, released on end/unmount.
- **End boil** → summary sheet (existing scrim/sheet pattern, Esc closes it — this screen at least honours the audit): Duration, Sap in, Syrup drawn, Session ratio. **Log this boil** appends up to three entries — sapEvap, syrupMade, boilHours (0.1 h precision; zero-value entries skipped) — to `sg_logs2` in **exactly LogTab's entry shape** (`{id, date, val, note}`, note "Boil Day"/«Bouillée») via one `ls.set` (invariant 5; considered and rejected: routing three entries through the one-kind-at-a-time LogEntrySheet). A false return (trial-locked/quota) keeps the session and lets the global banner speak. **Discard** is two-tap armed (`sheet-delete.armed`), no `window.confirm`. Either path clears `sg_boil_session`; logging leaves a 6 s green "Boil logged to your season — N gal" on the idle screen.
- **Date-format note, on the record:** the three entries use `toLocaleDateString()` like every existing entry. Invariant 6 forbids *new* locale-date code, but a lone ISO island inside `sg_logs2` would corrupt sort/grouping semantics worse than matching does; the debt-#6 boot migration converts all entries at once. The session key itself is epoch-ms.

## Reduced-motion table
| Element | Motion | Under `prefers-reduced-motion` |
|---|---|---|
| Steam wisps | translate/opacity loop, 4.2 s ×3 | not rendered (JS) + `display:none` (CSS) |
| Target band, approaching | opacity pulse 1.6 s | none — band solid at full opacity (state still reads by colour + label) |
| Target band, draw-off | none (steady glow) | unchanged (static) |
| Rim pointer | transform transition 0.5 s | `transition:none` — jumps to position |
| HUD / Today-chip dot | opacity pulse | static dot |
| Sheet/scrim entrance | existing app keyframes | already killed by existing rules |
| State changes | — | colour + label only, per brief |

## State matrix (this screen's data surface is the session)
| State | Design |
|---|---|
| Idle / empty | Designed pre-flight: dial with target in the centre + band visible, Water-BP & evaporator card, "Adjust on Boil Pt" link, one primary Start boil. Not a void. |
| Active: warming / near / draw / over | The four dial states above; each changes fill colour, numeral colour, label, band treatment. |
| Error | Write failures (locked/quota) surface through the existing global `sr-write-fail` banner; log-failure keeps the session. Wake-lock/vibrate absence degrades silently. |
| Loading | n/a — no network anywhere on this screen (deliberate: it must work in an off-grid sugarhouse). |
| Post-log | 6 s confirmation row on the idle screen. |

## Numbers stated, methods named
- 69/69 tests (`node tests/formulas.test.mjs` output, this session). 10 new assertions listed in tests file under "Boil Day dial."
- Dial collision figures (y=209 endpoints; 79 px label offset vs ~95 px numeral half-width) computed from the arc parametrisation — in code comments.
- Contrast: #EB9A33 on #07090f ≈ 8.6:1, #f85149 on #07090f ≈ 5.4:1 (WCAG formula from hex, both used at ≥18 px bold) — pass AA large-text with room.
- Not measured (no browser): true rendered geometry, glow spread vs r-136 labels, wisp subtlety. Hence:

## Needs eyes-on after deploy
1. **The draw-off moment on the iPad from 3 m:** band glow strong but not blooming over the r-136 tick labels near the target; numeral glow legible against sugarhouse daylight; vibration fires once (phone) on entering the band and not again while hovering ±0.1° across the edge — if it re-triggers annoyingly, add a 30 s cooldown ref.
2. **Dial at 390 px and 1024 px:** outside labels clear the viewBox on both; readout optical centring (`.bd-readout` top 38% — nudge ±2% by eye); °C mode label density (8 labels vs °F's 7).
3. **Steppers with wet gloves:** 56 px targets honest in the field; NumInput mid-typing clamp (typing "2…" momentarily reads as min — app-wide NumInput behaviour; steppers are the primary control, confirm that's how it's actually used).
4. **Counters:** +10 taps land without looking; Undo label width in FR («Annuler le dernier (−10)») inside the column at 390 px — if it wraps, shorten to «Annuler (−10)».
5. **Eight-hour soak:** wake lock holds (screen never dims); elapsed at 8:00:00+ fits the HUD pill; battery/heat acceptable with the 1 s tick + wisps (wisps are 3 blurred divs — if the old shop iPad runs warm, they're the first thing to cut).
6. **Restart mid-boil:** kill and reopen the PWA — elapsed correct from the epoch start, temp and counters restored, Today chip live.
7. **Log this boil → Log screen:** three rows appear with the "Boil Day"/«Bouillée» note, season totals and Recap ratios move accordingly (they read `seasonTotals`, so they must); trial-expired path shows the red banner and keeps the session.
8. **Reduced-motion device pass:** nothing moves anywhere on the screen; states change by colour/label; chip dot static.
9. **FR pass by a native eye:** «Bouillée», «Temp. de la panne», «SOUTIREZ», «Ça bouille» — the Québécois terms were chosen deliberately (a boil session is *une bouillée*; the pan is *la panne*); confirm they land as fluent, not folkloric.

*Margin note: this is the first screen in the app whose primary control adjusts a number the app never computes. That is correct. The producer owns the thermometer; the app owns the arithmetic around it. Tolerance is a decision — theirs.*

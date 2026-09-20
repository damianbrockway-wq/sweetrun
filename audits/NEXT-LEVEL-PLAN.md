# SweetRun — Next-Level Plan
**September 19, 2026 · Merged from three audits: PLUMB-REPORT.md (structure), DEBUG-REPORT.md (function), CAL-REPORT.md (design)**

## The verdict in one paragraph

The app's taste, voice, and domain intelligence are real — Cal scores it 7.3/10 and calls the copy best-in-class for indie software. What's holding it below "next level" is trust arithmetic: the same app shows a producer two different Rule-of-86 ratios, three different labor costs, a $27,000 payback that should read $43, and quietly turns "1,500" into 1.5. In a numbers product, self-consistency IS the brand. The plan below fixes truth first, then consistency, then polish — in passes that each ship alone.

## The one root cause

Formulas and facts live in many places: the formula layer (app.jsx:699–830), seven+ inline restatements, four static calculator pages, and 80 unversioned localStorage keys holding duplicate facts. Every audit found a different symptom of this one disease. The cure threads through every pass.

---

## Pass 0 — The safety net (½ day) · DO FIRST
Characterization tests for the money math. A plain Node test file asserting ~20 known values across rule86/jones87, syrupY, boilTime, finTemp, denCorr, Brix↔Baumé, altToBP/presToBP, yield models, tapsPer, srParseNum, and the trial-date edges (Feb 28 / 3-sap-day / May 1 — verified sound, lock them in). Run before every deploy, forever. **Nothing else in this plan is safe without this, and everything after it is cheap with it.**

## Pass 1 — Truth (1 day) · The money-math criticals
1. **Diagnose payback off 100–1000×** — double `woodCost` multiply + bogus 128 gal/cord (app.jsx:9459–9468, 9487, 9518). Reuse `FUELS.spu`.
2. **`srParseNum("1,500") → 1.5`** — US thousands separator divides logged values by 1000 (:836–843).
3. **Litre mode self-contradictory** — Today/PDF multiply stored litres by 3.785, Log/Recap show raw. Store gallons canonically; convert at display only.
4. **One Rule-of-86 divisor** — `RULE_DIVISOR` constant, used in all 9 in-app sites AND the four calculator pages (they must never disagree with the app in public).
5. **SW fake-200 offline responses** (app/sw.js:56–65) → return 503 so every existing error path finally fires (fixes silent elevation-0 → wrong finish temp).
6. **Literal `°F` escapes on Weather** (~10 spots, :6534–6606).
7. **Dead features revived**: `sg_brixlog` shape mismatch (SugarSage brix trend never renders, :7221) and `sg_lines_results` read-never-written in Diagnose.
Ship: SW bump, tests green, deploy.

## Pass 2 — One number, one voice (1–2 days)
- **Single metrics module**: season totals, ratios, scores, benchmarks computed once, imported everywhere (kills 46-vs-37 score, 64:1-vs-63.6:1, 808-vs-810 gal, "32% below" vs "48% above").
- **Single settings store**: syrup price, labor rate, wood cost each live in ONE key (today: price in 4 keys, three values on screen; Diagnose defaults $65 against the wizard's stored $40).
- **Consistency strip**: one selection color (teal — wizard currently uses four), one label case, one decimal rule.
- Fix the two hard collisions: Finish "RECOMMENDED" badge printing over its title (+ default contradicting the recommendation); Diagnose chip-crushed one-word-per-line titles.
- Focus-loss bug on Break-Even inputs (component-defined-in-component, Debug H5) and trial-expired false "not saved" alerts on tab switch (H3).

## Pass 3 — The look, elevated (2–3 days)
- **Desktop shell**: at 1440px all five nav destinations currently compute to display:none — desktop users are stranded. Build the real sidebar: five destinations with the hand-cut marks (brand/assets/marks/) as icons, nested sub-nav, persistent Log-a-run.
- **Furnish first-run**: Today/Entries/Equip empty states to the Tubing tab's standard (the internal benchmark), using Sten's marks; replace the day-one "F" grade with "too early to grade."
- **Make SugarSage answer**: fix the Ask dead-end (button becomes clear-X, Enter does nothing), feed logged brix into its trend, reconcile its score with Recap's (Pass 2's module does the math part).
- CSV export completeness (add Fuel/Hours), import dedupe (re-import currently doubles a season).
- Preserve untouched: the voice, the data palette on data, Boil Pt's amber card (Cal: "the app's one earned signature moment").

## Pass 4 — The structure (ongoing, behind the scenes)
- **Extract the formula layer to a shared module** consumed by app.jsx AND the calculator pages (retires the six-file duplication permanently).
- **Schema version + shared accessors** for the 80-key localStorage database (prerequisite for cloud sync and the French market — locale-formatted date strings currently misparse on FR phones).
- **Auto-bump the SW cache version in the build** (three hand-bumps in one day this week; one forgotten bump strands installed phones).
- Ed25519 fallback accepting forged keys (Debug M2) — tighten or drop the fallback.
- Decide the license worker's fate: it's written but never deployed (`LICENSE_API=''`). Deploy it or delete it; undead code is debt.
- Incremental file split only as sections get touched — no big-bang. (Plumb: the single-file/no-bundler choice is a constraint to respect.)

## Sequencing rule
Each pass ships alone and leaves the app better. Tests from Pass 0 run before every deploy. Every app-shell change bumps the SW. Nothing in Pass 3 starts before Pass 1 ships — a beautiful app that miscalculates is worse than a plain one that's right.

## What's already next-level (don't touch)
The wizard→app data continuity, the benchmark-cited intelligence, the trial-date logic (verified sound), JSON backup fidelity, destructive-action guards, the copy, Boil Pt.

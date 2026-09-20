# SweetRun — Cal's Design Audit (IMPROVE mode, diagnosis only)

**Date:** 2026-09-19 · **Auditor:** Cal · **Surface:** https://sweetrun.app/app/ live, fresh profile
**Method:** world-class-app IMPROVE. Audited at 375×812 (mobile emulation, primary context — phones in the sugarbush), with 1440×900 spot checks. Walked the First Season wizard with plausible data (50 trees, 10–18", gravity + mainline, 2×6 wood-fired, $40/gal), logged 3 entries (42 gal sap @ 2.0°Bx, 1.1 gal syrup Amber Rich, 28 gal sap @ 1.8°Bx), then screenshot-judged every destination and sub-screen, the Settings sheet, and the Log-a-run sheet.
**Constraint honored:** the visual brand (deep green #07090f/#0d1521, amber #d4831a/#eb9a33, teal #2dd4a7, blue/purple/gold/red/green data palette) is committed per brand/BIBLE.md. This audit judges craft, hierarchy, density, consistency, states, and app-feel *within* that direction. No rebrand proposed.

Note on capture: screenshots were taken through the remote browser (inline only — could not be written to this container's disk), so observations are recorded in words with measurement methods named. Every number below states its source.

---

## Overall verdict

**Overall: 7.3 / 10.** This is a voiced, domain-fluent product — nobody mistakes it for template output. The copy is the best thing in it and the brand direction holds on almost every surface. What keeps it from 8+ is not taste; it's tolerance: the same fact rendered as two different numbers on two screens, four different "selected" colors in one wizard, two label-casing systems, a text-on-text collision, and a desktop breakpoint that deletes the primary navigation entirely. Tolerance is a decision, not an accident — and right now several decisions are being made twice, differently.

### Ten-dimension scores (app overall, mobile-primary weighting)

| # | Dimension | Score | Evidence (one line, method named) |
|---|---|---|---|
| 1 | First impression & distinctiveness | **8.0** | Near-black green + amber-syrup palette, "Log a run," "Bush," "Shed" — cover the logo and you still know it's a maple app; Boil Pt's amber gradient result card is a genuine signature moment (screenshot, Numbers > Boil Pt). |
| 2 | Typography | **7.0** | Scale and weights are deliberate and consistent within screens (screenshots, all destinations); but two label systems coexist — uppercase letterspaced eyebrows on screens vs sentence-case 13px labels in the Log-a-run sheet — and Diagnose finding titles wrap one word per line (screenshot, Diagnose results). |
| 3 | Color & contrast | **8.0** | Marginal pairs sampled from computed styles at 1440: muted #7f92a6 on #0d1a2b card = 5.47:1; #7f92a6 on #07090f = 6.22:1; blue #58a6ff on #0a1420 = 7.33:1; red #f85149 label over its 6% tint on #0d1a2b ≈ 4.9:1 (computed from rgb values) — all pass AA. Deduction: four different selection-state colors across the wizard alone (teal step 1, blue Gravity, purple Mainline, amber Firewood — screenshots, wizard steps 1–3). |
| 4 | Layout, space & rhythm | **7.0** | Card rhythm and stat-tile grids are solid (Recap, Season Plan); but first-run Today is one card plus ~400 device-px of empty black above the CTA (screenshot, Today first-run), and guide sections wrap every bullet in its own pill-card, which reads heavy (Tapping best practices, R/O guidelines). |
| 5 | Hierarchy & scannability | **7.5** | One unmistakable primary action on the core screens — the teal "Log a run" (Today, Log); screen titles say what each screen is. Recap runs ~6 screen-heights with no internal anchor; SugarSage stacks three competing zones (ask, dashboard, break-even) on one sub-tab. |
| 6 | Craft details | **6.5** | Visible collisions: "★ RECOMMENDED" badge overlaps the "Straight Mix" title (screenshot + zoom, Numbers > Finish DE calc); Shed Weather placeholder clips mid-word "…05401, Burlingtor" (screenshot); Bush beta banner truncates "routes need…" (screenshot); ratio renders as 64:1 on Today and 63.6:1 on Recap for the same value (screenshots of both). |
| 7 | Responsiveness | **6.0** | Mobile is *designed*, not merely unbroken — thumb-zone CTA, bottom tabs, sheets. Desktop is the failure: at 1440×900 all five primary-destination buttons are `display:none` with no visible replacement (measured: JS query, five buttons each 0×0; `nav` computed display "none"); the sidebar lists only the current tab's sub-destinations. A desktop user is stranded on whatever tab is active. |
| 8 | Accessibility | **7.0** | Real buttons/tabs in the a11y tree, ask input properly labeled ("Ask SugarSage a question…" — read_page), strong contrast throughout (see #3). Deductions: Esc does not close the Settings sheet (tested at desktop width, sheet persisted after Escape); imagery toggles on Bush are icon-only with low information scent; focus-visible ring not verified this pass (recorded as unverified, not failed). |
| 9 | Code quality | **n/s** | Not scored this pass — source audit exists separately (audits/PLUMB-REPORT.md, DEBUG-REPORT.md). Visible surface suggests a consistent component base with local drift. |
| 10 | Copy | **8.5** | Specific, human, domain-fluent: "Don't wait — early sap is your best," "Which year your log and recap show," "Download a copy, or restore one." Zero banned phrases found. Deductions: "LABOUR" (Evap tab) vs "Labor rate" (Diagnose) — read from screenshots of both; and the same metric described as "32% below theoretical" and "48% above theoretical" on one screen (Recap). |

**Average of scored dimensions: 7.28.** Ship gate (≥8.0, no dimension <7) is not met; dimensions 6 and 7 are below 7.

---

## Per-screen findings

### First Season wizard (5 steps) — 7.5
Evidence: composed sheet over dimmed app, clear step eyebrow + progress bar, disabled-until-valid Continue, live Revenue Snapshot on step 4, strong Season Plan summary on step 5.
Score basis: the flow is genuinely good onboarding — data entered here correctly pre-fills Tapping calc (50/14), Break-Even (300/40), Today benchmarks. Defects: selection color changes per step (teal → blue → purple → amber); progress bar runs a teal→blue gradient that belongs to no committed token pair; the pan-size grid's amber selected chip is a fifth control accent.

### Today — first-run 5.5 / populated 7.5
First-run: one season card, then ~400 device-px of void before "Log a run" (screenshot). The five-state rule says empty is the first impression; this one is unfurnished — no weather hook, no location prompt, no next action beyond the CTA. The hand-cut marks in brand/assets/marks/ are exactly the missing furniture.
Populated: season goal + syrup/sap/ratio + per-tap vs benchmark with an insight line ("Below the range for gravity tubing") — this is the right dashboard. Ratio shows "64:1" here vs "63.6:1" on Recap (same value, two renderings). Recent-run rows drop the brix chip that Entries rows carry — same object, two row treatments.
Observed once: after tapping Today's "Log a run," Log content rendered while the bottom nav still highlighted Today (screenshot); possibly a transition-timing artifact, worth a look in code.

### Log > Entries — 7.5
Good: summary strip (syrup/sap/R/O), tight entry rows (date · type · chip · right-aligned amount), quiet "More" disclosure. Empty state is a bare "No entries yet" line — no mark, no invitation (compare Tubing's designed empty state, which this screen should learn from).

### Log > Season — 6.5
Two setup cards (Degree Day Tracker, Sap Brix Trend). Defects: City/Zip and °Brix fields use placeholder-as-label (banned; the label vanishes on input); icon-only submit buttons are teal (search) and amber (check) side by side — two accents, one job; the Brix Trend says "No readings yet — log your first brix reading above" even though two brix values were logged via Log-a-run — brix lives in two unconnected places, a data-model smell the user will feel as "the app forgot my numbers."

### Log > Recap — 7.0
The richest screen: SweetRun Score, Yield Gap Analyzer with cost-of-gap, root-cause cards with severity borders, stat-tile grid, benchmark-sourced credibility. Defects, in order: (1) the same screen says the ratio is "32% below theoretical" (root cause card) and "48% above theoretical" (Conversion Efficiency card) — same fact, opposite directional language, both from screenshots; (2) grading a first-day trial user "46 out of 100 — F" is honest math and terrible onboarding — score needs a "too early to grade" state; (3) R/O Savings renders two identical bars (1.4 vs 1.4 hrs, 32 vs 32 lbs) in different colors when there's no R/O data — should collapse to its empty state; (4) "AVG BRIX 2° estimated" while actual readings (2.0, 1.8) exist; (5) Operation Name input floats mid-recap with placeholder-as-label.

### Log > Diagnose — 6.0
Inputs card + Run button + results. The worst mobile layout in the app: finding-card titles wrap one word per line ("Sap-to- / syrup / conversion / worse / than / expected" — screenshot) because title + ROI chip + status chip share one row at 375px; the title column measures roughly a quarter of card width (screenshot proportion). Also: Syrup price defaults to $65 here while the wizard stored $40 (screenshots of both) — same noun, two sources of truth; "Labor rate $/hr 20" here vs "$/hr 15" on Numbers > Evap vs the Hobby toggle on Shed > Weather — three labor-cost homes. The content itself (2 High Priority / $754 opportunity / named sources: UVM Proctor, Cornell, MPA, USDA NASS) is excellent.

### Bush > Map — 7.0
Full-bleed Esri satellite, floating zoom/layer/locate/save controls, "Tap Tree" pill, offline-save card, Map Tools/Trees/Mainlines/Property panel. Defects: the whole page scrolls, so the header and Map/Tapping/Tubing sub-tabs slide off-screen while panning context — on a map screen the chrome should pin; beta banner truncates mid-sentence ("routes need…"); first-run map centers on a default region (Sherbrooke QC area in test) with no "set your sugarbush location" prompt; the five imagery toggles are icon-only (leaf-on/leaf-off/compare read as mystery glyphs until tapped).

### Bush > Tapping — 7.5
Calculator pre-filled from wizard (50 trees, 14") — the continuity the rest of the app should envy. Result tiles green (taps) and amber (yield) with theory ratio context. Defects: estimates "810.0 gal" here vs the wizard plan's "808" (screenshots of both) — same model, two numbers; "Vacuum System?" label (with question mark) breaks label voice; guide bullets each get a full pill-card, heavy for reference content.

### Bush > Tubing — 7.5
Best empty state in the app: "Enter your system details above" + three preset chips (Small woodlot / Mid-size / Large operation) — designed, actionable. Uppercase labels with helper text under every field, inline unit suffixes (ft, % slope, in Hg). Defect: defaults to "Target vacuum 25 in Hg" for a user whose profile says gravity.

### Numbers (Sap / Evap / R/O / Finish / Boil Pt) — 7.0
The calculator suite is the product's muscle and mostly reads clean and dense-on-purpose. Per-tab:
- **Sap:** Rule of 86 + Syrup Yield + Quick Brix Reference; shared brix across tabs is smart. Clean.
- **Evap:** Pan Size renders "2×4 ft" despite the wizard selection (potential state bug — flagged, not proven; my wizard tap may not have registered, but the Season Plan's 9 sessions was computed from something); "LABOUR" spelling vs "Labor" elsewhere; "$150.00" line vs "$150" chips vs "$12.90" — decimal formatting drifts within one card (screenshot).
- **R/O:** concentrate/permeate in blue, multi-pass in purple — data palette used as intended. "@ $300/cord" default beside the wizard's $300 *season total* is a coincidence waiting to be read as a bug.
- **Finish:** the two hard defects — "★ RECOMMENDED" badge printed over the "Straight Mix" title (text-on-text, confirmed by zoom), and the app recommending Straight Mix while defaulting the selection to Precharge First (a default that contradicts its own advice). Density Check's "Too Dense" verdict band is good feedback design.
- **Boil Pt:** the amber gradient result card is the app's best single moment — big, syrup-colored, legible. Icon-only search is amber here, teal on Season — the two-accent split again.

### Shed (Weather / Tasks / Equip / SugarSage) — 6.5
- **Weather:** designed empty state (explains Open-Meteo scoring, ideal freeze/thaw chips) — good; placeholder clips mid-word ("Burlingtor"); Break-Even Calculator lives here *and* on SugarSage — an entire calculator duplicated on two sub-tabs of the same destination.
- **Tasks:** solid checklist with progress and custom-add; includes vacuum/R/O items for a gravity/no-R/O profile — personalization opportunity, minor.
- **Equip:** thinnest screen — collapsed calculator + outline button + one-line empty card; the wrench glyph appears three times in one viewport (tab icon, button, empty state); the empty state's action sits above the empty card rather than in it.
- **SugarSage:** ambitious and confused. Season Score here reads "F 37%" while Recap's SweetRun Score reads "46 out of 100 F" (screenshots of both) — same concept, two names, two numbers. **The Ask flow appears broken:** with text entered, the Ask button is replaced by a clear-X, and Enter produced no visible response in repeated attempts (screenshots) — verdict: broken or hidden; verify in code. Loading skeleton ("ANALYZING SEASON DATA…") is real skeleton work — credit where due. The knowledge cards at the bottom are good content in the data-palette category colors.

### Settings sheet — 8.0
The most finished small surface: Units/Language segmented toggles, season stepper, two clear drill-ins, microcopy a human wrote. Defect: Esc does not close it (tested; sheet persisted after Escape at desktop width). Grabber handle suggests drag-to-dismiss — untested on touch.

### Log-a-run sheet — 8.0
Segmented type selector, labels above inputs, "(optional)" marked correctly, unit suffix inside the field, Save with icon + quiet Cancel. Defects: label casing diverges from the rest of the app (sentence-case here, uppercase eyebrows everywhere else); the sheet remembers its last type silently, so a user who logged syrup and reopens to log sap can file into the wrong type (observed: my third entry initially failed to record as sap); no date field visible — everything files as today, which fails the "log yesterday's run from the couch" case.

---

## State matrix (verdicts per product-ui.md — seen / triggered / unreachable)

| State | Verdict | Where |
|---|---|---|
| Loading | **seen** | SugarSage dashboard skeleton ("Analyzing season data…"). Elsewhere renders too fast to catch; no skeletons observed on Log/Today. |
| Empty (first-run) | **seen** | Today (undesigned void), Entries (bare line), Equip (thin), Tubing (designed — the model to copy), Weather (designed). |
| Partial / filtered-empty | **unreachable** | No filters/search exist on Entries to trigger it. |
| Error | **not triggered** | No offline/failure simulation performed this pass; unverified, not failed. |
| Populated | **seen** | All destinations after 3 logged entries. |

Keyboard path: partially verified — Enter did not submit the Ask query; Esc did not close Settings; full tab-order walk not performed (recorded as unverified). Touch targets: bottom tabs and CTAs comfortably ≥44px by proportion; not pixel-probed.

---

## Ranked defect list

1. **Desktop primary navigation is missing.** Any screen at 1440px. All five destination buttons compute to `display:none` with no visible replacement; the sidebar lists only the current tab's sub-destinations. A desktop user cannot leave the tab they're on. (Measured: JS at 1440×900.)
2. **The app disagrees with itself on numbers.** Recap 46/100 vs SugarSage 37% for "the score"; "32% below" vs "48% above" theoretical on one Recap screen; 64:1 vs 63.6:1; 808 vs 810 gal; benchmark 0.25 vs 0.30–0.45 gal/tap; syrup price $40 (wizard/Recap) vs $65 (Diagnose); labor $0/$15/$20 in three homes. In a numbers product, self-consistency *is* the brand. Each drift is small; together they teach the user not to trust the math.
3. **Selection-state color is not a system.** Wizard alone uses teal, blue, purple, and amber for "selected"; icon-buttons are teal on one tab and amber on another for the same job. One selected-state treatment (teal is the app accent — use it), everywhere; data palette stays on data.
4. **Ask (SugarSage) flow broken or hidden.** Typed query + Enter → nothing; Ask affordance disappears once text exists. The marquee "intelligence" feature dead-ends.
5. **Diagnose finding cards collapse at 375px.** Titles wrap one word per line under chip pressure. Stack: title full-width, chips on their own row.
6. **First-run Today is a void.** ~400px of empty black on the app's front door. Wire the hand-cut marks + a 2–3 item "get ready" module (set location, season countdown, checklist snapshot).
7. **"RECOMMENDED" badge overlaps "Straight Mix" title** (Finish > DE calc) — and the default selection contradicts the recommendation.
8. **Placeholder-as-label** on Season tab (City/Zip, °Brix), Operation Name, DE gallons — banned pattern; labels vanish on input.
9. **Brix logged in Log-a-run doesn't feed the Brix Trend**, which still says "No readings yet." Two brix stores, user sees amnesia.
10. **Whole calculators and settings duplicated:** Break-Even on Weather *and* SugarSage; season setup facts re-asked (and re-defaulted differently) on Diagnose/Evap. Same part, same jig — one store, referenced everywhere.
11. **Bush map chrome scrolls away**; beta banner and Weather placeholder truncate mid-word; imagery toggles icon-only.
12. **Esc doesn't close sheets**; Enter doesn't submit the Ask field — keyboard path incomplete.
13. **Row treatment drift:** Today's recent runs drop the brix chip Entries rows carry; label casing splits (uppercase eyebrows vs sentence-case sheet labels); "LABOUR"/"Labor"; "$150.00"/"$150"/"$12.90" decimals within one card.
14. **Sheet remembers last entry type silently** (Log-a-run) and offers no date field for back-logging.
15. **Off-profile defaults:** vacuum 25 in Hg for a gravity user; vacuum/R/O tasks in a gravity/no-R/O checklist; "F" grade on day one of a trial.

## What's working (preserve these)

- **The voice.** UI copy is the app's soul — specific, calm, sugarmaker-fluent. Best-in-class for indie software.
- **Wizard → app data continuity** where it works (Tapping calc, Break-Even, Today benchmarks) — extend it, don't rebuild it.
- **The domain intelligence layer:** Recap's yield-gap math with named sources, Diagnose's ROI-ranked findings, benchmark lines under raw numbers. This is the moat; the fixes above are about making its numbers agree.
- **Designed empty states on Tubing and Weather** — the internal standard; propagate to Today/Entries/Equip.
- **The data palette on data** (break-even blues/purples/golds, severity tiles) — Damian likes it and it's earning its keep. Keep marks and controls off it.
- **Boil Pt's amber result card** — the signature moment. One per app is right.

## The 5 highest-leverage elevations

1. **Build the desktop shell.** A real left sidebar: five destinations with the hand-cut marks as icons, sub-destinations nested under the active one, Log-a-run as a persistent button. Today it's not a worse layout — it's an unusable one, and it's also where trial users will evaluate on a laptop.
2. **One-number pass.** Single derived-metrics module + single settings store (syrup price, labor, fuel, benchmarks) that every screen reads. Kill every duplicate calculator/input. Rename to one score with one value. This is invisible design work that raises trust on every screen at once.
3. **Consistency strip + fix.** Collect every selection state, icon button, label, chip, and money format side by side (the strip), then commit: teal = selected/interactive everywhere; one label case per context; one decimal rule; brix chip on every run row. Fix the two hard collisions (RECOMMENDED overlap, Diagnose card stack) in the same pass.
4. **Furnish the first-run.** Today empty state with the new marks + next actions; Entries/Equip empty states to Tubing's standard; "too early to grade" state replacing the day-one F. The trial's first five minutes currently show the app at its worst; this makes them show it at its best.
5. **Make SugarSage answer.** Fix Ask (button persists, Enter submits, answer renders in place); feed logged brix into the trend; reconcile its score with Recap's. The feature is named "Maple Intelligence" — it must never dead-end or disagree with the ledger.

---

*Screens not reached: none of the briefed list was unreachable. Unverified this pass: error states under network failure, focus-visible ring, drag-to-dismiss on sheets, true phone hardware rendering (audited via viewport emulation).*

# BL2 Report — Loop 2 (Sharpen): Make SweetRun irresistible, superior, and best-in-class

## Executive summary (the answer so far)

The four-layer hybrid survives sharpening, but with material corrections: the UX retheme is only feasible via a scripted codemod (1,695 hardcoded hex colors would sink a hand-edit); the Vermont conference is actually in **December 2026**, pulling the marketing deadline forward; push notifications are a retention feature, not a conversion feature, and get demoted; pricing sharpens to a single $49.99 Season Pass with a limited **founding-producer rate ($34.99, first 50)** instead of a permanent cheap tier; and honest funnel math says year one yields **15–40 paying producers ($750–$2,000)** — success must be measured in testimonials and retention, not revenue. Total build scope: ~150–200 hours against a ~200-hour realistic budget. Tight but feasible, with push and mesh-premium as the designated cut lines.

## How this loop surpasses Loop 1

Loop 1 chose the layers; Loop 2 priced them in hours and dollars, corrected two factual errors (VT conference timing, theming effort), killed the two-tier pricing idea before it anchored the product down, and produced the first honest revenue forecast. Every estimate below is now sized against the actual codebase (probed) or verified sources, not vibes.

## Goal, constraints & decision rubric

Unchanged: Conversion 35% · Feasibility 25% · Differentiation 20% · UX 10% · Retention 10%. Minimum bar: ship by Jan 15, 2027 (NYS conference is Jan 15–16 — launch must be live BEFORE the booth).

## The 7 sharpened components

1. **Theme codemod, not retheme.** Probe: 1,494 inline `style={{}}` objects, 1,695 hex literals, 147 distinct colors. Hand-editing = weeks + regression soup. Sharpened: script maps the ~30 structural tokens (backgrounds, cards, borders, text) to CSS variables with fallbacks; define light "Sugarbush Day" + existing dark palettes; default light with one-tap toggle. 20–30 hrs including per-tab QA.
2. **"Today" dashboard + 4-zone IA.** New home surface answering: run-day score now, season vs last year, needs-attention items. 16 tabs regroup under bottom tabs: **Today / Log / Map / Tools**. Existing weather-scoring and season-log code is reused — this is re-plumbing, not rebuilding. 40–50 hrs. Near-zero existing users means no migration pain — change now or never.
3. **3-tap logging.** Preset quantity chips, repeat-last button, auto-filled date/location, 75px primary targets, zero required keyboard. Also fixes the LogSection remount bug. 15–20 hrs.
4. **License + trial mechanics (no card, no account).** In-app 14-day trial from first open (localStorage timestamp, honesty-box). Expiry locks *editing*, never data export or existing-data viewing — never hold data hostage. Stripe Checkout → Worker webhook → ed25519 Season Pass token → paste-key screen. Demo mode ships a bundled realistic sample season. 25–35 hrs. Card-upfront Stripe trial link is retired (cuts signups 60–70% per research).
5. **Pricing: one tier + founding rate.** $49.99/season ("Season Pass"), full-season money-back guarantee, and a **founding-producer rate of $34.99 locked for life, capped at 50** — tests the lower price point, creates urgency, preserves list price. The permanent $29 tier from Loop 1 is killed (anchors down, complicates the token, Slopes consumables cannibalized 75% of volume).
6. **Channel calendar (corrected).** VT Maple Conference = **early Dec 2026** (vendor contact: allison@vermontmaple.org). NYS Jan Conference = **Jan 15–16, 2027**, 400+ attendees, ~50 tables, small vendors precedented; table cost unpublished — **email info@nysjanuarymapleconference.com in August**, booking window ~Sept–Nov. Maine Ag Trades Show booth $325–415 but priority deadline passed → waitlist only. Newsletter ads: no published rate cards; pursue contributed articles instead (higher trust, $0).
7. **Push demoted; mesh stays demo-only.** iOS push requires home-screen install, which almost no prospect does pre-purchase → retention feature, build in December if time allows (Worker + VAPID libs like `pushforge` are free-tier viable, verified). Mesh Phase A proceeds as hobby/booth demo — a live vacuum gauge on the booth map — but is NOT a launch dependency and its premium tier ships post-season.

## Research/analysis findings

- Channel facts verified with URLs (see agent fact sheet): NYS 2027 dates confirmed Jan 15–16; VT moved to December; Maine rates $325–415 (deadline passed); VMSMA industry-partner tier exists, price unpublished; OMSPA/MMPA have no ad rate cards — articles beat ads anyway.
- Web Push from Cloudflare Workers is solo-dev-feasible on free tiers (`web-push-browser`, `pushforge`; Cloudflare's own guide) — no paid push service needed.
- Codebase probe (numbers above) — the single-file architecture is fine at this scale; splitting files is NOT in scope (babel build already works; premature refactor is a time sink).

## Hour budget vs capacity (the feasibility ledger)

| Workstream | Hours |
|---|---|
| License/trial/demo mode | 25–35 |
| Theme codemod + QA | 20–30 |
| Today dashboard + IA | 40–50 |
| 3-tap logging + bug fixes | 15–20 |
| Legal pages, install card, polish | 8–12 |
| Marketing assets (booth kit, SEO pages, FB posts, association one-pager) | 30–40 |
| **Total** | **~150–190** |

Capacity: July 6 → Jan 15 ≈ 27 weeks × ~7 hrs/wk ≈ 190 hrs. **Feasible with zero slack.** Designated cut lines, in order: push notifications → mesh booth demo → second SEO page batch. The dashboard and licensing are never cut.

## Devil's advocate: flaws found and responses

- **Codemod misses rgba()/gradient strings** → theme will look half-done. Response: map structural tokens only; accents stay shared; budget explicit per-tab QA pass with screenshots; accept "98% themed" as shippable.
- **Honesty-box trial is resettable by clearing storage.** Response: accepted deliberately — clearing storage also deletes the user's own season data, which is its own deterrent; enforcement beyond this is wasted effort at this scale.
- **Guarantee invites refunds.** Evidence says ~3–12% refund rates and net conversion gain; community reputation-density suppresses abuse. Requires terms page (in scope, item 5).
- **Conference booth = 2 days + travel + unknown table fee.** Worst case ~$500 all-in for the single highest-intent audience of the year; still the cheapest CAC available. Response: email for pricing in August; VT December as backup.
- **The funnel math is small.** 400 attendees → ~50 conversations → ~20 trials; FB threads + SEO + newsletter articles → maybe 50–150 more trials across the season; at 17–30% trial conversion: **15–40 customers year one**. Response: reframe year-one success = 20+ paying producers, 5 testimonials, 60%+ renewal intent. The ledger records this so nobody is surprised in April.
- **Brainstorm-level blind spot check:** all seven components assume the product demos well on a phone in a noisy ballroom. Added to spec: a booth-mode demo (pre-loaded sample season, airplane-mode-proof — which is also the product's best offline proof point).

## Decision matrix (updated)

| Finalist | Conv 35% | Feas 25% | Diff 20% | UX 10% | Ret 10% | Total | Δ from L1 |
|---|---|---|---|---|---|---|---|
| C. Insurance positioning + guarantee + Season Pass | 5 | 5 | 3 | 1 | 3 | **4.00** | — |
| B. Field-first UX (codemod + dashboard + logging) | 4 | 4 | 4 | 5 | 4 | **4.10** | +0.25 (feasibility up via codemod) |
| A. License gating + trial + demo mode | 4 | 5 | 2 | 2 | 4 | **3.65** | — |
| D. Conference/association GTM (Dec+Jan corrected) | 5 | 4 | 2 | 1 | 3 | **3.55** | — |
| E. Mesh (booth demo now, premium later) | 2 | 3 | 5 | 2 | 5 | 3.30 | demoted from launch |

B edges ahead of C on paper, but they're not competitors — the sequence stands: **A (mechanics) → C (message) → B (product) → D (channel)**, E as demo garnish.

## Full step-by-step spec v2 (calendar-anchored)

**July:** 1. License Worker + webhook + token + paste-key screen (ship dark, pre-theme). 2. Trial state + demo mode. 3. Terms/privacy pages. 4. Retire card-upfront Stripe link from landing CTA → "Start free in the app."
**August:** 5. Theme codemod + light default + QA. 6. Email NYS conference for table; email VMSMA (industry partner + Dec tradeshow). 7. Landing page repositioning: grade-insurance headline, guarantee, founding rate, real screenshots.
**Sept–Oct:** 8. Today dashboard + 4-zone IA. 9. 3-tap logging + LogSection fix. 10. Two SEO tool pages (DE calculator, sap-run forecast) linking into app.
**Nov:** 11. Install card + storage UX polish. 12. Association article pitches (OMSPA/MMPA/VMSMA newsletters). 13. First FB soft-launch thread ("built this for my own bush — free trial, founding rate").
**Dec:** 14. VT conference (attend or vendor). 15. Push alerts IF on schedule. 16. Booth kit: banner, QR cards, demo device with sample season, airplane-mode demo script.
**Jan:** 17. NYS Cobleskill booth Jan 15–16 — launch moment. 18. Second FB thread + newsletter pieces timed to season start.
**Feb–Apr:** 19. In-season support, testimonial collection, renewal-intent survey at season end.

## Assumptions & evidence ledger (updated)

| Assumption | Status | Change |
|---|---|---|
| $49.99 holds with positioning + guarantee | AT RISK — load-bearing | Founding rate $34.99×50 added as live price test |
| Solo dev ships by Jan 15 | Plausible — load-bearing | Sized: ~150–190 hrs vs ~190 capacity; cut lines named |
| Codemod theming works on inline styles | New — testable in 2 hrs | Spike scheduled first week of August |
| Conference tables obtainable | Likely | NYS contact verified; email in August; VT backup |
| Year-one revenue is hobby-scale | ACCEPTED | 15–40 customers; success = testimonials + renewal intent |
| Dark theme fine | REFUTED (L1) | Light default via codemod |
| Push drives conversion | REFUTED | Demoted to December stretch |

## Validation results

Checked: hour estimates against actual code metrics (probed, not guessed); channel dates/costs against primary sources; funnel math against research benchmarks (trial 17–30%, guarantee +20%). Uncertain: NYS table cost (email pending), VMSMA dues (email pending), whether Damian's real capacity is 7 hrs/wk (single biggest schedule risk), codemod viability (2-hr spike will settle it).

## What this loop taught me

The plan is no longer a strategy question — it's a scheduling question. The remaining risks are execution risks (hours, deadlines, one technical spike) plus one market risk (price). Loop 3 must red-team exactly those: what breaks the calendar, what breaks the price, what breaks the booth.

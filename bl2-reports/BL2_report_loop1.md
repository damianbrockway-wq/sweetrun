# BL2 Report — Loop 1 (Explore): Make SweetRun irresistible, superior, and best-in-class

## Executive summary (the answer so far)

The problem is not that SweetRun lacks features — it has more than any pure-software competitor. The problem is that it's priced at 2× the observed maple-software ceiling ($24.99/yr) with nothing gated, positioned as a toolbox instead of an outcome, themed wrong for its actual use environment, and invisible in the channels where producers actually buy. The emerging answer is a sequenced hybrid: (1) gate the product with an offline-friendly license and reframe $49.99 as a "Season Pass" with a full-season money-back guarantee, (2) reposition around grade/yield insurance ("pays for itself if it saves one gallon"), (3) rebuild the field experience — light theme, dashboard-first home screen, 3-tap logging — to *feel* worth 2× the competition, and (4) show up physically at January maple conferences and in association newsletters. The Meshtastic mesh becomes a premium tier and conference demo magnet, not a giveaway.

## Goal, constraints & decision rubric

**Goal:** First paying producers by the Feb 2027 season; product functionally and experientially superior to Smartrek/SapSpy/CDL companion apps and every pure-software competitor.
**Constraints:** Solo dev (~10 hrs/wk assumed), <$25/mo infra, existing React 18 PWA (9,300-line single file), build window July–mid-January.
**Rubric:** Conversion impact 35% · Solo-dev feasibility before Feb 2027 25% · Durable differentiation 20% · UX uplift 10% · Retention/revenue durability 10%.
**Minimum bar:** Shippable by Jan 15, 2027.

## The 8 approaches explored

| # | Approach | Core bet |
|---|---|---|
| 1 | Sensor moat (Meshtastic mesh as flagship) | Hardware+software at hobbyist price is an unserved category |
| 2 | Freemium flip (free core, paid pro) | Free tools create trust and traffic |
| 3 | Grade-insurance positioning | Producers buy protection against a $200 mistake, not apps |
| 4 | Cloud accounts + sync + gating | Data safety and real licensing are prerequisites to charging |
| 5 | Association/dealer channel | Producers buy what associations and dealers recommend |
| 6 | Field-first UX overhaul | Producers buy what feels made for cold hands at 6am |
| 7 | Community/network flywheel | Regional shared data creates an uncopyable moat |
| 8 | Season report kit (physical+digital, contrarian) | Producers who won't buy software buy tangible things |

## Research findings (4 parallel agents; key facts)

**Competitive:** No established pure-software app exists above $29.99/yr; SapTapApps anchors at $1.99/yr; documented producer pushback at $20/yr ("would have paid one-time… certainly not 20 bucks a year"). SapSpy's $50/season is accepted only because it's attached to a $1,045+ hardware hub with visible cellular costs. Hardware telemetry (Smartrek ~$200/sensor, CDL $3,500 starter kits) is mature and crowded; the unserved wedge is the 100–1,000-tap sideliner on software. Producers pay for provable gallons (UVM: ~0.6 gal/tap per inch Hg), not organized data. "SapTrac" and "Tapp" don't meaningfully exist — the software shelf is fragmented hobbyist apps with near-zero ratings.

**Channels:** January state maple conferences (NYS Jan 9–10 at SUNY Cobleskill, VT Maple Conference, Maine annual meeting) sell vendor tables to tiny tech vendors — Farmblox and "Maple Tech Tools" are on the 2026 NYS list. Facebook groups (esp. "Backyard Maple Syrup Maker") have hosted successful app-launch threads. Association newsletters (VMSMA industry-partner tier, OMSPA Maple Mainline, Maine quarterly) accept industry content. Extension (Cornell Nov–Dec webinar series, UVM/Proctor) is the trust apex. Dealers do NOT carry software. Selling windows: January (planning) and Feb–Apr (felt pain). Summer is dead.

**Field UX:** Gloved-ops standard is ~75px primary targets (MIL-STD-1472: zero errors at 20mm), zero mandatory gestures, everything actionable in the bottom half of screen. **Light theme wins outdoors — dark mode washes out in snow glare** (SweetRun is currently dark-only). 7:1 contrast, bold 24–32px key numbers. Home screen must answer "will sap run today and what needs me now?" — not present 16 tabs (the classic tool-drawer anti-pattern that separates Deere/FieldView-class apps from small farm apps). Core logging loop: ≤3 taps, ≤5 seconds, zero keyboard (preset chips, repeat-last, auto-fill). iOS PWA in 2026: Web Push works on installed PWAs (16.4+), installed PWAs are exempt from 7-day eviction, no background sync (flush queue on open), no auto install prompt (need an illustrated install card).

**Monetization:** Freemium converts 2–5% — fatal with hundreds of prospects. Niche trials convert 17–30%; money-back guarantees add ~20% on top (evidence: 90-day→1-year guarantee doubled conversions, +3% refunds). Indie-standard offline licensing: Stripe webhook → Cloudflare Worker signs ed25519 token {email, plan, expires} → app verifies locally with embedded public key; ~1–2 days of work, $0/mo. Slopes (ski app, $1M ARR) proves seasonal subscriptions work when framed as "Season Pass" and renewed pre-season (Dec–Jan), never mid-summer. Association block licensing (25–100 keys at 15–20% off) is unclaimed white space with beekeeping precedent. Never give software away with BYO hardware — mesh features belong in a premium tier (+$50–100/yr); the $250-radio buyer is the least price-sensitive customer.

## Devil's advocate: flaws found and responses

- **#2 Freemium — KILLED.** Research is unambiguous: freemium math fails in a tiny niche. Salvage: free *standalone* web tools (DE calculator page) as SEO bait, outside the app.
- **#8 Physical kit — KILLED.** Fulfillment burden for a solo dev; low leverage. Salvage: "Season Pass" language and the printable season recap.
- **#1 Sensor moat — DEMOTED to premium tier + demo asset.** Vacuum node hardware isn't ordered; DIY Meshtastic exceeds most producers' tolerance; betting the off-season on hardware risks shipping neither. But a *live vacuum gauge on a real map* at a January conference booth is the best demo in the room.
- **#7 Community flywheel — DEFERRED.** SapTapApps already crowd-sources sap-flow maps at $1.99/yr, and network effects need users SweetRun doesn't have. Keep QR provenance as the viral seed.
- **#4 Cloud accounts — NARROWED.** Full account system is scope creep. License token (no accounts) + optional license-keyed encrypted backup to R2 gets 90% of the value at 20% of the cost.
- **Shared blind spot found:** every approach silently assumed $49.99 holds. It sits at 2× the software ceiling — it can only hold with production-tool positioning, guarantee, Season Pass framing, and a visibly premium experience. Price experimentation must be an explicit decision gate.
- **Second blind spot:** nothing addressed the first-10-minutes experience. A prospect must be able to *touch* the product (demo mode with a realistic sample season) before trial, or the trial converts nobody.

## Decision matrix (rubric-weighted, 1–5 per cell)

| Finalist | Conv 35% | Feas 25% | Diff 20% | UX 10% | Ret 10% | Total |
|---|---|---|---|---|---|---|
| C. Grade-insurance positioning + guarantee | 5 | 5 | 3 | 1 | 3 | **4.00** |
| B. Field-first UX overhaul (scoped) | 4 | 3 | 4 | 5 | 4 | **3.85** |
| A. License gating + Season Pass reframe | 4 | 5 | 2 | 2 | 4 | **3.65** |
| D. Conference/association GTM | 5 | 4 | 2 | 1 | 3 | **3.55** |
| E. Mesh premium tier | 3 | 2 | 5 | 2 | 5 | **3.25** |
| F. Community flywheel | 2 | 2 | 4 | 2 | 5 | 2.70 |

**Chosen path: sequenced hybrid A→C→B→D with E as premium capstone.** No single approach wins; the top four are complementary layers (mechanics → message → product → channel) and the scores cluster tightly. Sequence by dependency: gating enables trials; positioning gives the trial a reason; UX makes the trial convert; channel fills the funnel; mesh justifies premium and powers the booth demo.

## Full step-by-step spec (Loop 1 draft — will be refined in later loops)

**Phase 1 — Mechanics (July–Aug):** 1. Cloudflare Worker: Stripe webhook → ed25519-signed Season Pass token, KV resend lookup. 2. In-app license screen + 14-day trial state + demo mode with sample season data. 3. Reframe pricing page: "Season Pass — $49.99/season · 14 days free · full-season money-back guarantee."
**Phase 2 — Product (Aug–Nov):** 4. Light "Sugarbush" theme as default with one-tap dark toggle; 7:1 contrast; 75px primary targets. 5. New home dashboard: run-day score, season-vs-last-year, needs-attention list; 16 tabs → 4 bottom-tab zones (Today / Log / Map / More). 6. 3-tap logging with preset chips + repeat-last. 7. Install-to-home-screen illustrated card + Web Push run alerts (installed iOS). 8. Fix LogSection remount bug and location unification (from earlier code review).
**Phase 3 — Channel (Oct–Jan):** 9. Book NYS January Maple Conference vendor table (+VT if budget allows). 10. Association outreach: VMSMA industry partner, OMSPA/Maine newsletter piece on record-keeping, association block-license one-pager. 11. Free DE-calculator + sap-run-forecast standalone pages for SEO. 12. Facebook launch threads in Backyard Maple Syrup Maker + regional groups (Nov and Feb). 13. Cornell/UVM extension educators offered free educator keys.
**Phase 4 — Premium (parallel, hardware-gated):** 14. Mesh Phase A (vacuum → map pin) as "SweetRun Live" premium tier +$50/yr; booth demo rig for January.

## Assumptions & evidence ledger

| Assumption | Status | Evidence |
|---|---|---|
| Producers will pay $49.99/yr for software alone | **AT RISK — load-bearing** | Ceiling observed at $24.99–29.99; needs positioning + guarantee + premium feel to hold; price gate at Loop 3 |
| The audience can be reached cheaply | Supported | Conference tables, FB groups, newsletters all precedented |
| Offline-first PWA is an advantage | Supported (with work) | iOS 2026: push + storage OK when installed; install friction is real |
| Solo dev can ship Phases 1–3 by Jan 15 | Untested — load-bearing | Scope deliberately narrowed; Loop 2 must size it honestly |
| Dark theme is fine | **REFUTED** | Outdoor/glove research: light theme, 7:1 contrast |
| Mesh hardware can ship by January | At risk | Vacuum node not ordered; treat as demo asset, not launch dependency |
| 16 tabs of features = product strength | Refuted as-is | Tool-drawer anti-pattern; features must be re-packaged around outcomes |

## Validation results

Checked: pricing claims against multiple sources (SapTapApps subscribe page, Maple Syrup Time pricing page, SapSpy site); channel facts against conference/association pages; UX numbers against three independent standards (WCAG, MIL-STD, construction guidance). Uncertain: actual Facebook group sizes (need logged-in check); whether $49.99 holds even with perfect positioning (no direct evidence either way — the guarantee is the hedge); Damian's real weekly hours.

## What this loop taught me

The three user goals (irresistible to buy / works better / best UX) are one goal: *make the product feel like a $500 production tool sold at $49.99/season, then put it where producers buy in January.* Loop 2 must sharpen: exact scope of the UX overhaul a solo dev can actually ship, the price question (hold $49.99 vs $29–39 entry + premium), and hour-by-hour feasibility.

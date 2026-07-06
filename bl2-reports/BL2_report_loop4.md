# BL2 Report — Loop 4 (Synthesize): The SweetRun Master Plan

> **⚠ AMENDED after independent validation** — read `BL2_report_validate.md` alongside this. Key amendments: Season Trial (never expires before Feb 28 for Nov–Jan activations); email capture + analytics ping added (the tripwire was unmeasurable without them); data promise rewritten before cloud backup ships; budget re-baselined at 4 hrs/wk with the shrunk dashboard ("Today tab added, 16-tab nav stays") as the DEFAULT; cloud backup added to the MLL floor; realistic year-one base case 8–25 customers.

## Executive summary — the answer

Make SweetRun irresistible by selling **grade-and-yield insurance, not software**: a $49.99 "Season Pass" (founding rate $29.99, first 50, locked for life) with a full-season money-back guarantee, gated by an offline-friendly license, delivered through a field-first product experience — light high-glare theme, a Today dashboard that answers "will sap run and what needs me," 3-tap gloved logging, and license-keyed cloud backup so no producer ever loses a season — and launched physically at the January 2027 NYS Maple Conference with association newsletters and Facebook groups as the surround. The Meshtastic mesh is the booth's showstopper demo and the 2027 premium tier, not a launch dependency. Success in year one = 20+ paying producers, 5 testimonials, 60%+ renewal intent — not revenue.

## How this loop surpasses Loop 3

Loops 1–3 generated, priced, and hardened the layers. This loop welds them into one spine with a single narrative (trust → irresistibility → presence), locks the seven components, and reduces everything to a dated, gated, hour-budgeted execution plan a competent person could run without further strategy work.

## Goal, constraints & decision rubric (final)

First paying producers by Feb 2027; product superior in experience and trust to every alternative. Solo dev ~7 hrs/wk (measured from August), <$25/mo infra, ship by Jan 15, 2027. Rubric held all four loops: Conversion 35 / Feasibility 25 / Differentiation 20 / UX 10 / Retention 10.

## The 7 components the master plan must nail

### 1. The offer (message layer)
- Positioning: **"Don't lose a batch of Golden to buddy sap. Don't lose a season to a dead phone."** Insurance framing, ROI in gallons: pays for itself if it saves one gallon ($40–70 retail).
- **Season Pass — $49.99/season · 14 days free, no card · full-season money-back guarantee.**
- **Founding Producer rate: $29.99/season locked for life, first 50** — urgency + live price test at the category ceiling.
- Guarantee redemption budgeted at 5–10%; refund fast, ask one learning question.

### 2. The license machine (mechanics layer) — July
- Cloudflare Worker: Stripe Checkout webhook → ed25519-signed token `{email, plan, season_expires}` → emailed + shown; KV lookup for resend; public key embedded in app; validates offline forever.
- In-app: 14-day trial from first open (no card, no account); expiry locks *editing only* — viewing and export never lock.
- **Demo mode**: bundled realistic sample season (a believable 2026 Vermont-style run), one tap from first launch — the prospect touches the real product in 10 seconds.

### 3. Trust infrastructure (retention layer) — Sept–Oct
- **SweetRun Cloud backup**: license-keyed encrypted JSON blob to R2, last 3 versions, weekly reminder. Capped at 15 hrs; backup/restore only, no sync. This is the visible ongoing service that justifies recurring pricing and kills the catastrophic March-data-loss scenario.
- Manual JSON export (shipped), `storage.persist()` (shipped), install-to-home-screen illustrated card.
- Humility copy on all predictions; user-tunable alert thresholds; in-season accuracy log.

### 4. The field-first product (irresistibility layer) — Aug–Oct
- **Theme codemod** (spike in July): ~30 structural tokens → CSS variables; light "Sugarbush Day" default, one-tap dark. Fallbacks pre-agreed: Field-Mode-only theming, or Glare Mode toggle.
- **Today dashboard**: run-day score front and center, season-vs-last-year, needs-attention list (tank full? taps unchecked? brix trend?). 16 tabs → bottom zones **Today / Log / Map / Tools**.
- **3-tap logging**: preset chips, repeat-last, 75px targets, zero keyboard, auto-filled date/GPS; LogSection remount bug dies here.

### 5. The channel (presence layer) — Aug emails, Dec–Jan execution
- **NYS January Maple Conference, Jan 15–16, 2027, SUNY Cobleskill** — the launch event. Email info@nysjanuarymapleconference.com first week of August. 400+ attendees, small-vendor precedent verified.
- VT Maple Conference (early Dec 2026) as warm-up/backup; Maine ATS waitlist; association newsletter *articles* (not ads); two FB launch threads (Nov soft, Feb in-season); comparison page published early to own the framing.
- Booth kit: banner, QR cards, demo device in airplane mode (the offline proof IS the demo), founding-rate cards.

### 6. The premium future (differentiation layer) — parallel hobby time only
- Mesh Phase A (vacuum → map pin) continues as hobby + booth demo. Ships as "SweetRun Live" premium tier (+$50–100/season) post-launch, 2027–28. Never a launch dependency; never free with hardware.

### 7. The control system (survival layer)
- **Gates:** **Aug 31** license live + codemod verdict, else cut push/mesh-demo. **Oct 31** dashboard shipped, else it waits for 2028. **Dec 1** feature freeze; December = QA + booth + end-to-end funnel test (fresh device → trial → purchase → key → restore).
- Monthly hour log; any month <20 hrs trips the next gate early.
- **Minimum Lovable Launch floor:** license + demo mode + repositioned landing + booth kit on current UI — sellable, never desirable to stop there.
- **Mar 15 price tripwire:** trial→paid <10% (≥30 trials) → list drops to $39.99 at renewal; founders untouched at $29.99.

## Decision matrix (final, held from Loop 2/3)

Sequenced hybrid confirmed across all loops: **mechanics → message → product → channel**, premium in parallel. No loop produced a challenger to the sequence; scores stable within ±0.25 across re-scoring.

## The calendar (single page)

| When | Build | Business |
|---|---|---|
| **July** | License Worker + token + key screen; trial + demo mode; codemod spike; terms/privacy | Set founding rate in Stripe; retire card-upfront link |
| **Aug** | Theme codemod + QA (or fallback); landing repositioning w/ real screenshots | **Email NYS + VMSMA wk 1**; comparison page |
| **Sept–Oct** | Today dashboard; 4-zone IA; 3-tap logging; cloud backup | Association article pitches; **Gate Oct 31** |
| **Nov** | Install card; polish; (push if ahead) | FB soft-launch thread; booth kit start |
| **Dec** | **Freeze Dec 1**; QA; funnel test | VT conference; booth kit done |
| **Jan** | Hotfixes only | **NYS booth Jan 15–16 = launch** |
| **Feb–Apr** | In-season support | Testimonials; accuracy log; renewal survey; **Mar 15 tripwire** |

## Confidence level & load-bearing assumptions

**Confidence: MODERATE-HIGH (≈70%) that this plan produces 20+ paying producers and a defensible product position by April 2027** — conditional on the two load-bearing assumptions:
1. **Capacity** (~7 hrs/wk real). Highest-variance input. Mitigated by gates + MLL floor; measurable by September 1.
2. **Price** ($29.99–49.99 band viable with insurance positioning + guarantee). No direct market evidence exists either way at $49.99; the founding rate is the live test; the Mar 15 tripwire is the escape.
Secondary: codemod viability (settled by a 2-hr July spike), conference access (three fallbacks), forecast accuracy (humility copy + measurement).

## First concrete actions (this week)

1. Run the theme codemod spike (2 hrs) — it de-risks the biggest build item and settles August's plan.
2. Draft + send the NYS conference vendor email and the VMSMA industry-partner email.
3. Create the $29.99 Founding Producer price in Stripe; write the guarantee sentence onto the pricing card.
4. Start the license Worker (wrangler is already installed).
5. Begin the monthly hour log — the September 1 capacity reading drives every gate after it.

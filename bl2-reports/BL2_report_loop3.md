# BL2 Report — Loop 3 (Red-team): Make SweetRun irresistible, superior, and best-in-class

## Executive summary (the answer so far)

The plan survives red-teaming but takes four hardening changes: the **founding rate drops to $29.99** (so no future price fallback can betray early buyers), **license-keyed cloud backup enters launch scope** (a paying customer losing a March season in a reputation-dense community is the single worst failure available), the schedule gains **three hard descope gates** (Aug 31, Oct 31, Dec 1) with a pre-defined "minimum lovable launch," and the forecast/alert features get **humility copy and a no-questions guarantee** so a weird season produces refunds instead of reputation damage. The most dangerous scenario is not competition or price — it's capacity: a solo dev at 4 real hours/week instead of 7 ships nothing sellable by January without the gates.

## How this loop surpasses Loop 2

Loop 2 produced a feasible calendar; Loop 3 assumed the calendar meets reality and broke it seven ways, then rebuilt it with contingencies, tripwires, and fallback branches. Two scope changes (founding price, cloud backup) and one reframing (guarantee expectations) came out of failures the earlier loops didn't price in.

## The 7 most dangerous failure scenarios

### F1 — Capacity collapse (probability: HIGH, damage: fatal)
Real solo-dev availability is 3–4 hrs/wk, not 7; by November the dashboard is half-built, nothing ships, the booth demos a buggy app.
**Hardening:** Define the **minimum lovable launch (MLL)** now: license + trial + demo mode + repositioned landing + booth kit *on the current UI*. The MLL is sellable — the current app already out-features every $25 competitor; the UX overhaul makes it irresistible but its absence doesn't make it unsellable.
**Gates (pre-agreed descope, no deliberation in the moment):**
- **Aug 31:** License system live + codemod spike verdict. If license isn't done → cut push AND mesh demo now, license becomes the only September priority.
- **Oct 31:** Dashboard shipped? If not → ship 3-tap logging only, dashboard becomes "new for 2028," keep 16-tab IA.
- **Dec 1:** Feature freeze regardless of state. December = QA, booth kit, marketing only.
**Early warning:** any month with <20 logged hours trips the next gate early.

### F2 — Codemod spike fails (probability: MEDIUM, damage: contained)
Inline styles prove too irregular; light theme looks half-baked; regressions everywhere.
**Hardening:** 2-hour spike scheduled first (already in plan). **Fallback A:** light theme scoped to Today dashboard + Log flow only, marketed as "Field Mode." **Fallback B:** keep dark, add a "Glare Mode" toggle (bump contrast to 7:1, key numbers to 32px, weight 600+) — 6 hours, delivers 60% of the outdoor benefit. Neither fallback blocks launch.

### F3 — No conference table (probability: MEDIUM, damage: high)
NYS sells out, doesn't reply, or costs several times the estimate; VT December slot missed.
**Hardening:** Email NYS **first week of August** (not September); simultaneous email to VMSMA for December. **Fallback A:** attend NYS as a regular attendee — hallway demos + QR cards (precedented: Bascom's conference already produced traffic). **Fallback B:** Maine Ag Trades Show waitlist ($325–415, verified). **Fallback C:** co-exhibit — ask a small friendly vendor (Farmblox-scale) to share table space for a fee.
**Tripwire:** no NYS reply by Sept 15 → phone call; none by Oct 1 → lock Fallback A and redirect table budget to association newsletter presence.

### F4 — Price rejected even at founding rate (probability: MEDIUM-HIGH, damage: high, load-bearing assumption fails)
Booth conversations show reflex sticker shock; trials stall below 10% conversion.
**Hardening (applied now):** **Founding rate changes $34.99 → $29.99** (locked for life, capped 50). Rationale: if a future fallback drops list price to $29.99–39.99, founders at $34.99 would be burned; at $29.99 they can never be undercut, and $29.99 sits exactly at the proven ceiling of the category — it's the correct price *test*, while $49.99 list preserves the anchor.
**Tripwire:** trial→paid <10% by Mar 15 with ≥30 trials → drop list to $39.99 for the renewal cycle; founders untouched. If <5% → the market says $25-category; regroup post-season on premium tier (mesh) to carry the difference.

### F5 — Competitor moves during the window (probability: LOW-MEDIUM, damage: medium)
Maple Syrup Time adds mapping; SapTapApps modernizes; Smartrek ships a free iOS logging app.
**Hardening:** SweetRun's compound moat — offline-first + sugarbush map + expert system + provenance QR + (later) BYO mesh — can't be assembled quickly by a hobby-app shop, and hardware players have no incentive to build hobbyist software. Speed matters more than secrecy: first-mover on testimonials in a trust-dense community is durable. **Action:** publish the comparison page early (SweetRun vs notebook vs $25 apps vs $3,500 hardware) and own the framing before anyone else writes it.

### F6 — A paying customer loses their season data (probability: MEDIUM without action, damage: catastrophic to reputation)
A producer's phone dies in March, or Safari evicts an un-installed browser session. The refund is trivial; the Facebook post ("SweetRun lost my whole season") is not — in a community where everyone knows everyone, one loss story cancels ten testimonials.
**Hardening (scope change):** **License-keyed cloud backup enters launch scope** (~10–15 hrs): "Back up to SweetRun Cloud" button + weekly auto-reminder; encrypted JSON blob to R2, license token as auth, last-3 versions retained. This simultaneously: kills the catastrophic scenario, gives the subscription a visible ongoing service (the #1 sustainable justification for recurring pricing per Loop 1 research), and makes renewal rational ("your season archive"). Manual JSON export (already shipped) remains as belt-and-suspenders.
**Priority:** this outranks push notifications and the mesh booth demo in every gate.

### F7 — The season itself embarrasses the product (probability: MEDIUM, damage: medium)
2027 runs weird — early, short, or erratic. Forecast scores miss days, buddy-sap alert fires wrong (or doesn't), guarantee refunds spike, and word-of-mouth sours.
**Hardening:** (a) Humility copy on every predictive surface: "Run Score is a planning aid, not a promise — trust your trees first." (b) Alert thresholds user-tunable with a conservative default. (c) The guarantee is reframed internally as a *marketing cost with an expected 5–10% redemption* — budgeted, not feared; refund fast and gracefully, every refund email asks one question ("what would have made it worth keeping?"). (d) In-season accuracy log (score vs actual run reported) becomes both a product-improvement dataset and — if the score performs — next year's marketing claim.

## Devil's advocate on the red-team itself

- Is the MLL actually sellable? Devil says the current 16-tab UI at $49.99 undercuts the "premium justifies 2× price" thesis. Response: partially conceded — the MLL leans on positioning + guarantee + founding price to carry conversion, accepts lower conversion, and exists only as a floor. The gates make hitting MLL-only unlikely before December.
- Did the 7 scenarios share a blind spot? Yes, one found: all assume the *landing page → trial* funnel works technically. Added to spec: end-to-end funnel test (fresh device, real Stripe test purchase, key delivery, restore) as a December QA item with a named checklist.
- Is cloud backup scope creep dressed as hardening? Devil says yes; response: it's the only item that converts a catastrophic scenario into a feature, and it reuses the license Worker's auth. It stays, but capped at 15 hours (no sync, no multi-device merge — backup/restore only).

## Decision matrix (unchanged weights; plan-level, post-hardening)

The sequenced hybrid A→C→B→D remains optimal; no scenario overturned the sequence. Hardening reallocated ~15 hrs from push/mesh-demo to cloud backup and funnel QA. New hour total: ~160–200 vs ~190 capacity — the gates absorb the overrun risk.

## Full step-by-step spec v3 (deltas from v2 only)

- **July additions:** codemod spike moved to July (first task after license Worker); founding rate set at $29.99.
- **August additions:** NYS + VMSMA emails week 1; comparison page drafted.
- **Sept–Oct additions:** cloud backup (Worker route + R2 + in-app button) built alongside dashboard; monthly hour log kept.
- **Dec additions:** end-to-end funnel test checklist (fresh device → landing → trial → purchase → key → restore backup); guarantee/refund macro written; accuracy-log instrumentation on run scores.
- **Gates:** Aug 31 / Oct 31 / Dec 1 as defined in F1.

## Assumptions & evidence ledger (updated)

| Assumption | Status | Change this loop |
|---|---|---|
| $49.99 list holds | AT RISK — load-bearing | Founding $29.99 = live test; Mar 15 tripwire + $39.99 fallback defined |
| Solo capacity ≈ 7 hrs/wk | AT RISK — load-bearing | MLL floor + 3 descope gates + hour logging |
| Codemod viable | Testable | Spike pulled forward to July |
| Conference access | Likely | Tripwires Sept 15 / Oct 1; 3 fallbacks |
| Data loss preventable | NEW — now addressed | Cloud backup in launch scope (capped 15 hrs) |
| Guarantee redemption stays <12% | Supported by research | Budgeted 5–10%; refund-fast policy |
| Forecast accuracy sufficient | UNKNOWN — monitored | Humility copy + in-season accuracy log |

## Validation results

Each scenario traced end-to-end against the calendar; every contingency has an owner (Damian), a tripwire date, and a pre-decided action. Remaining uncertainty: NYS table cost/availability (email pending), real weekly capacity (measurable from August), forecast accuracy (measurable only in-season).

## What this loop taught me

The plan's fragility is concentrated in two places: hours and trust. Everything else has cheap fallbacks. Loop 4's synthesis must therefore put the gates and the trust features (backup, guarantee, humility copy) at the spine of the master plan, not as appendices — and keep the irresistibility story (dashboard, light theme, 3-tap logging, booth demo) mounted on that spine.

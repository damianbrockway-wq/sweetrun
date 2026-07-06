# BL2 Report — Validate: The SweetRun Master Plan

## Verdict: **Certified with conditions** — confidence 75%

Independent reviewer (did not build the plan; re-derived numbers from the actual codebase, git history, and primary web sources). The strategic skeleton — license → insurance positioning → field UX → conference launch — is sound and the sequence is right. But the audit found the hour budget understated ~30–50%, the capacity assumption already refuted by git history, and three structural flaws no loop caught. Conditions were applied (below) before certification.

## What was independently checked

- **Codebase re-measured:** 9,386 lines; 1,533 inline styles; 1,724 hex literals; 164 distinct colors **plus 181 rgba() and 33 gradients** the codemod must handle (worse than planned). Weather-scoring reuse claim verified fair. Shipped items (JSON backup, storage.persist, Stripe link) confirmed.
- **Git history:** 45 commits — 30 in April, 10 in May, 2 in June, 3 in July. Velocity collapsed 90% since April. The plan's "measure capacity by Sept 1" was scheduled to discover something the data already showed.
- **Conference facts:** NYS Jan 15–16, 2027 at SUNY Cobleskill confirmed on the official site (one third-party source says Jan 8–9 — re-confirm when booking). VT Dec 8–12 confirmed but its 2026 format may have no physical tradeshow to vend at.
- **Unverifiable during audit:** SapTapApps $1.99, the $24.99 ceiling, trial benchmarks (search intermittently down) — remain plan-asserted. **SapMaster** exhibited at NYS 2026 and may be a software competitor; site was down; must check before publishing the comparison page.

## Flaws found (severity-ranked) → fixes applied

**CRITICAL — all three fixed in the amended master plan:**

1. **Trial/season mismatch.** A 14-day trial started at the Jan 15–16 booth dies ~Jan 30; sap starts mid-Feb–March. The value prop (grade/yield insurance) is undemonstrable without sap. → **Fix: "Season Trial" — 14 days or until you've logged your 3rd real sap day, whichever is later; trials activated Nov 1–Jan 31 never expire before Feb 28.** This also strengthens the Season Pass story.
2. **The price tripwire was uncomputable** (anonymous localStorage trials, no analytics, no re-engagement channel). → **Fix: optional/skippable email capture at trial start (wired to the existing waitlist), Cloudflare Web Analytics on landing, and one anonymous Worker ping on trial-start and purchase.** Privacy page updated in the same commit.
3. **Data-promise contradiction.** Landing page says "Your data never leaves your device. Ever." — while launch scope includes cloud backup to R2. → **Fix: rewrite before backup ships: "Yours by default — on your device; encrypted cloud backup only if you turn it on."** Reconcile landing, pricing card, privacy, terms.

**HIGH — fixed:**

4. **Hour budget understated.** Re-derived: license 30–45 (token *email delivery* was a missing subsystem), codemod 30–45, dashboard+IA 60–80. Realistic 200–280 hrs vs ~150 buildable before the Dec 1 freeze. → **Fix: the shrunk plan is now the default** — "Today tab added, 16-tab nav stays" — with the full 4-zone IA as the upside case only if September logs ≥28 hrs. Budget re-baselined at 4 hrs/wk (the git-history reading), August must *prove better*.
5. **Aug 31 gate had no teeth** (its cuts freed ~0 hrs). → **Fix: new remedy — license not live by Aug 31 → codemod dies (Glare Mode fallback, 6 hrs) and dashboard pre-shrinks.** Additional early rule: **July+Aug combined <50 logged hours → drop to MLL track immediately.**
6. **MLL floor contained the catastrophic scenario** (no backup while charging money). → **Fix: cloud backup added to the MLL floor.**

**MEDIUM — fixed or noted:**

7. Funnel math re-based: anonymous no-card trials convert 8–15%, not 17–30%; realistic year one **8–25 customers (~$600–900)**; 20+ is the goal, not the base case.
8. Facebook in-app browser breaks PWA install/localStorage → **Fix: in-app-browser detection + "Open in Safari" interstitial; QR cards point to a /start install page.**
9. Renewal mechanics defined: 12-month Stripe sub, season framing, December "your pass renews before the season" email; token carries `season_expires`. Stripe Tax enabled.
10. Sept–Nov is Damian's own tubing/tapping prep season — capacity dips exactly when the dashboard was scheduled; the shrunk-default plan absorbs this.
11. Comparison-page copy must reconcile "Import from SapTrac" (landing) with "SapTrac doesn't meaningfully exist" (research) — and cover SapMaster once checked.

## Residual risks & conditions

- **Certification is conditional on critical fixes 1–3 landing before September 1.** They're cheap (~4–6 hrs total) and compound: without them the launch converts poorly AND the failure is invisible.
- Price band remains a genuine unknown; the founding-rate test + (now measurable) Mar 15 tripwire is the correct treatment.
- Year one is a credibility year, not an income year (~$600–1,500). Said plainly so April brings no disappointment.
- The MLL at $49.99 on the current dark UI is a weak seller carried by guarantee + founding rate — acceptable only as a floor.
- Forecast accuracy in a weird season: unhedgeable beyond humility copy + in-season accuracy log; accepted.

## Final go/no-go and immediate next actions

**Conditional GO.** Execute the AMENDED plan (Loop 4 + these fixes), not Loop 4 as originally written.

**This week:**
1. Email NYS for a trade-show table (confirm 2027 dates in the same email) + email VMSMA asking what the December tradeshow physically is. It's already July — booking favors the early.
2. Build the one coherent small change first (~4–6 hrs): season-aware trial + skippable email capture + Worker ping + Cloudflare Web Analytics. This replaces the codemod spike as task #1; the spike is week 2.
3. Create the $29.99 Founding Producer price in Stripe; enable Stripe Tax; put the guarantee sentence on the pricing card.
4. Check sapmaster.net before drafting the comparison page.
5. Start the hour log today with the pre-committed rule: July+Aug <50 hrs → MLL track, no deliberation.

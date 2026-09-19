# Sap Spy Competitive Teardown & Battle Plan
**Date: September 19, 2026 · For: Damian Brockway / SweetRun**

---

## Bottom Line

**Yes, you can compete — but not by matching them feature-for-feature against free.** Sap Spy is a hardware company; their free app is a lead-generation funnel for $900+ sensor systems. Your winning ground is everything the app-as-brochure model doesn't cover: the offline-first production system, the economics, the season intelligence. Their software is functional but utilitarian, built by one engineer with no design or QA staff, and their new mobile app is unproven code on a rushed timeline.

---

## 1. Who You're Actually Up Against

- **One person.** Jeff Skarda, an electrical engineer and sugarmaker in Wisconsin. Legal entity: Maple IoT Solutions LLC d.b.a. SapSpy. Founded ~2019, storefront live Oct 2020. He is listed as "Founder, Principal Engineer" — no other named employees anywhere.
- **Bootstrapped, not funded.** Shopify store, Mailchimp newsletters, blog dormant since January 2022. No press about funding or hiring. This is a solo side business that grew — the same species of operation as SweetRun.
- **Hardware is the business.** Sensor Hub $905–1,145 + $75/season; Gateway $795 + $250/season; nodes $330. Hardware side is actively developed (Gateway V2 shipped Oct 2025).
- **Real credibility.** UVM Proctor (Dr. Tim Perkins) tested SapSpy and publicly said they ended up using it as their *primary* monitoring method. That endorsement is their biggest asset. (Note: your email to Proctor landed in SapSpy-friendly territory.)

**Implication:** You're not fighting a company. You're fighting one busy engineer who now has to run a hardware business, a monitoring platform, AND ship a brand-new mobile app across iOS + Android in ~6 weeks. That's thin ice for him and an opening for you.

## 2. The Sap Spy App — What We Know

From the Facebook post (the ONLY public trace — zero mentions anywhere else online, no app store listing, no BMF Index hits, nothing on mapletrader):

| Their feature | SweetRun already has it? |
|---|---|
| Maple calculators (Rule of 86, taps, mainline sizing, draw-off temp by elevation/pressure) | ✅ All of it, deeper (Jones Rule, DE calc, density, candy temps, R/O, retail pricing) |
| Tubing layouts / map (onX, LiDAR terrain, 5-ft contours, BOM) | ✅ Map with gravity-flow route analysis, tank-spot ranking, materials estimator + KML/GPX/onX import. ❌ No LiDAR contours |
| Knowledge base | ✅ SugarSage — 56 cited entries, context-aware search |
| Sap & syrup log | ✅ Much deeper (grades, brix, collection points, freshness tracker) |
| Barrel/batch labels | ✅ Batch provenance labels with QR verification |
| BMF Index (bulk syrup price) | ❌ Novel. But you have USDA benchmark prices in the pricing calc |
| Sugarbush monitoring | ❌ Requires their hardware — this is the whole point of the app |
| Native App Store / Google Play | ❌ You're a PWA |

**Rollout:** Beta wave 1 now (existing customers), wave 2 Sun 9/20 (40 testers), wave 3 the week after (40 more), public "first week of October." Three beta waves compressed into 3 weeks before public launch = a rushed schedule. First public versions will have bugs.

## 3. Software Quality Assessment (firsthand, from their live demo)

I drove their public web app demo (sapspyapp.com) today:

**Weaknesses (your opening):**
- Sites view shows bare unlabeled numbers ("65.6 · 0.1 · 0.0") — no units, no context; "Updating…" indicator that never resolves; expand controls unresponsive
- Stock Bootstrap + Highcharts, desktop-first; cramped and generic on small screens — and mobile is where producers actually are
- Marketing site still contains an unedited Shopify placeholder ("Add customer reviews and testimonials to showcase your store's happy customers / Author's name") and typos ("positivly") — no design/QA function exists
- Requires connectivity and an account. **Nothing works offline.** In a sugarbush.

**Strengths (don't underestimate):**
- The vacuum heatmap analytics (per-mainline hourly heatmap, best-to-worst mainline rankings, freeze filtering) are genuinely good and backed by real sensor data — a moat you cannot cross without hardware
- The platform works. It's not broken, it's just unpolished.

**Verdict:** "Not well made" is half right. It's *engineer-made*: functional, unstyled, desktop-centric, online-only. His new mobile app is a from-scratch codebase on a 6-week runway. Quality is exactly where you can catch him — but the catch is craft + offline + depth, not "his stuff is broken."

## 4. The "They Stole My Ideas" Question — Honest Assessment

You emailed your app to them/Proctor, and months later their app announces a calculator set, knowledge base, log, and batch labels that mirror SweetRun. That's understandably infuriating. The honest picture:

- **The overlap is real but not provable as theft.** Draw-off by elevation/pressure, Rule of 86, tap counts, mainline sizing, logs — this is standard sugaring math that Cornell and UVM publish openly. Any maple app converges on this list. Their onX/mapping work predates your email (it's been on their site for years).
- **Ideas and features have no legal protection.** Copyright covers your actual code and visual design, not the concept of a draw-off calculator. Without an NDA, sharing your app by email created no obligation. (I'm not a lawyer — if you want a real opinion, a one-hour IP consult is cheap peace of mind.)
- **What you should do anyway, today:** your git history is timestamped proof of what SweetRun shipped and when. Keep the sent email. If their app ever copies your actual *wording, layouts, or label design*, that's a different conversation — document it with screenshots.
- **What not to do:** accuse them publicly. In a community of a few thousand producers, that fight damages the accuser. Beat them in the market instead.

## 5. Where SweetRun Wins — The Positioning

Their app is **a brochure with calculators**: tools that get you to the store. SweetRun is **a production system**: the thing you run your season on.

Own these, loudly:

1. **Works with zero bars.** 100% offline — log a run standing in the woods with no signal. Their app is online-only, tied to cellular hardware. This is the single sharpest differentiator and it's structural: they *can't* go offline-first, their business model requires the cloud.
2. **No account. Your data stays yours.** They require sign-in; every producer who's suspicious of big-ag data grabs is your customer.
3. **The money layer.** True cost per gallon, break-even, retail pricing, RO savings, yield gap in dollars, Diagnose with ROI estimates. Nothing in their announced app touches economics — it doesn't sell sensors.
4. **Season intelligence.** Sap run forecast scoring, freshness/spoilage tracker, degree days, recap + SweetRun Score, year-over-year. Their log is a notebook; yours thinks.
5. **Français.** Full Québécois translation. Quebec is 70%+ of world production and their app shows no sign of French.
6. **You already import their CSV.** SweetRun literally has a "SapSpy CSV" importer. Frame it: *SweetRun works alongside any monitoring hardware — including Sap Spy's.* Don't fight the hardware; absorb it as a data source.

## 6. Battle Plan (revised, replaces prior traffic plan Phases 2–4)

**Phase A — Before their launch (now → Oct 1):**
1. **Ship free public calculator pages on sweetrun.app** (no login, no trial): draw-off/boiling point by location, Rule of 86 + yield, tap count, DE calculator. Each page: "Part of SweetRun — the offline season system." This was the SEO plan; it's now also the moat against "free." Get them into the sitemap and indexed *before* their October launch claims those searches.
2. **Reposition the landing page** around the system, not calculators: "Calculators are free everywhere. Your season isn't. Offline logs, real economics, no account."
3. **Join their beta** (comment iPhone/Android on the post — you're allowed to be a customer). Read every beta comment; it's free market research on what producers want and where their app hurts.

**Phase B — At/after their launch (Oct):**
4. Full hands-on teardown of their shipped app; update this document with real gaps
5. Publish honest comparison content ("SweetRun vs. free calculator apps — what you actually need for boil day") — factual, never trash-talk
6. Decide on formal free tier inside the app (recommendation: **all Numbers calculators free forever; logging/recap/diagnose/map = Season Pass**) so app-store-style "free" seekers still enter your funnel

**Phase C — Season ramp (Nov → Feb):**
7. Association outreach (unchanged) — pitch the *free calculators* as the resource-page link, which is an easier yes than a paid app
8. Consider Google Play presence via TWA (PWA wrapper) so "maple syrup app" store searches don't belong 100% to them — evaluate effort in Phase B
9. Email your notify list pre-season with the free tools

**Standing:** document your git-history timeline once (one evening), keep receipts, never mention Sap Spy in marketing by name.

---

*Research sources: sapspy.com (About, FAQs, News), sapspyapp.com live demo (driven 9/19/26), mapletrader.com t=36326, UVM Proctor Maple News article, App Store/Google Play listings for Maple Syrup Time, LuckySap, Backyard Sap, saptapapps.com. Full market table in research notes.*

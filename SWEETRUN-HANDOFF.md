# SweetRun — Complete Project Handoff
**Generated: May 28, 2026**
Paste this entire document into any new chat to resume work immediately.

---

## What SweetRun Is

A maple syrup production platform for serious sugarmakers. Offline-first PWA (Progressive Web App) — no backend, no database, no cloud sync. Everything runs in the browser and works offline. One-person project by Damian Brockway.

- **Live site:** https://sweetrun.app
- **The app:** https://sweetrun.app/app/
- **Pricing:** $49.99/year subscription, 14-day free trial
- **Target market:** North American maple producers, hobbyists to large operations
- **Owner email:** damian.brockway@gmail.com

---

## Current State (as of May 28, 2026)

### What's Working
- Landing page live at sweetrun.app with 14-day free trial CTA
- App live at sweetrun.app/app/ — fully functional offline PWA
- Stripe subscription payment link with 14-day free trial active
- Web3Forms email notifications working and tested (switched from broken Formspree)
- Sticky notification bar at top of landing page for off-season email capture
- Email capture form in body of landing page
- Feedback form at sweetrun.app/feedback.html
- Google Search Console connected with sitemap submitted
- Cloudflare Web Analytics active
- GitHub auto-deploys to Cloudflare Pages on every push to main

### Real Traffic Situation (IMPORTANT)
- Cloudflare HTTP traffic shows ~1,350 visits/30 days — **this is mostly bot traffic**
- Real human visits (bots excluded via Web Analytics): **~30 visits in 21 days (~1.5/day)**
- Almost all real visitors are from the United States ✅
- Top visited page is sweetrun.app/app/ — real visitors are actually using the app
- Zero Stripe trial signups to date
- Zero real producer form submissions (all test submissions from Damian + wife)

### What Still Needs to Happen
- [ ] Get first real producer trial signup
- [ ] Get real producer feedback
- [ ] Build SEO content pages targeting specific maple producer search terms
- [ ] Reach out to maple producer associations for newsletter mentions
- [ ] Check Google Search Console keyword data (connected ~May 9, should have data)
- [ ] Add testimonials once real producers engage
- [ ] Archive old Stripe one-time payment link (Apr 24, unused)
- [ ] Fix feedback.html footer — still says "$49/season" (should be $49.99/year)
- [ ] Consider mesh vacuum sensor feature + backend in future version

---

## All Files — Where Everything Lives

### GitHub Repository
- **Path on Damian's Mac:** `~/Documents/GitHub/SugarCalc`
- **Branch:** main
- **Auto-deploys to:** Cloudflare Pages on every push

### File Map
```
SugarCalc/
├── index.html              ← Marketing landing page (sweetrun.app/)
├── feedback.html           ← Feedback form (sweetrun.app/feedback.html)
├── success.html            ← Post-purchase success page
├── batch.html              ← (internal tool)
├── sitemap.xml             ← Submitted to Google Search Console
├── manifest.json           ← PWA manifest
├── sw.js                   ← Service worker (NOT the app's sw — see app/sw.js)
├── _headers                ← Cloudflare headers config
├── package.json            ← Build config: "build": "babel app/src/app.jsx -o app/app.js"
├── babel.config.json       ← {"presets": ["@babel/preset-react"]}
├── SWEETRUN-REFERENCE.md   ← Master reference document (keep updated)
├── SWEETRUN-HANDOFF.md     ← This file
├── SweetRun-Reference.docx ← Printable Word version of reference doc
└── app/
    ├── index.html          ← App shell (sweetrun.app/app/)
    ├── app.js              ← Compiled React output — DO NOT EDIT DIRECTLY
    ├── sw.js               ← Service worker, current cache: sweetrun-v3
    ├── icon-512.png        ← App icon
    └── src/
        └── app.jsx         ← React source — EDIT THIS FILE
```

### Build Process
**App changes** (requires compile):
```bash
cd ~/Documents/GitHub/SugarCalc
npm run build
git add app/app.js app/src/app.jsx
git commit -m "your message"
git push
```

**Landing page / feedback changes** (no compile):
```bash
cd ~/Documents/GitHub/SugarCalc
git add index.html feedback.html
git commit -m "your message"
git push
```

**If you get a git lock error:**
```bash
rm ~/Documents/GitHub/SugarCalc/.git/HEAD.lock
```

---

## All Services & Accounts

All accounts are under: **damian.brockway@gmail.com**

---

### Hosting — Cloudflare Pages
- **Dashboard:** https://dash.cloudflare.com → Pages → SugarCalc
- **Account ID:** 0fe397151a1f828e183cf65c980ffbff
- **Domain:** sweetrun.app (DNS managed in Cloudflare)
- **Build command:** `npm run build`
- **Build output:** `/` (root)
- **Auto-deploy:** Yes, on every push to GitHub main
- **Analytics:** Cloudflare Web Analytics enabled (bots excluded view available)

---

### Payments — Stripe
- **Dashboard:** https://dashboard.stripe.com
- **Account:** damian.brockway@gmail.com

**✅ ACTIVE payment link (USE THIS ONE):**
- URL: https://buy.stripe.com/dRm3cw9YsdYI7HkbGY14401
- Type: Recurring subscription, $49.99/year, 14-day free trial
- Created: May 9, 2026
- This is the link in the "Try SweetRun Free — 14 Days" CTA button on the landing page

**❌ OLD payment link (ignore/archive):**
- Type: One-time $49.99 (not a subscription)
- Created: Apr 24, 2026
- Not linked anywhere, can be archived

---

### Forms — Web3Forms ✅ CURRENT
- **Service:** https://web3forms.com
- **Account:** damian.brockway@gmail.com
- **Access Key:** `d91810ec-94aa-49ed-9731-6ba2cd42e106`
- **Form name:** SweetRun
- **All emails go to:** damian.brockway@gmail.com
- **Switched to Web3Forms:** May 28, 2026 (replaced broken Formspree)

**Forms using this key:**
1. Sticky notify bar at top of index.html — "Season's over — be first in line for 2027"
2. Email capture section in body of index.html
3. Feedback form in feedback.html

---

### Forms — Formspree ❌ OLD (no longer used)
- **Dashboard:** https://formspree.io
- **Account:** damian.brockway@gmail.com
- Old feedback form ID: `mgodpobz`
- Old notify form ID: `xojrpvyr`
- **Problem:** Free plan captured submissions to dashboard but email forwarding was unreliable
- **Note:** Historical submissions (May 9, testing by Damian + wife) still visible in Formspree dashboard
- **Switched away:** May 28, 2026

---

### Google Search Console
- **Dashboard:** https://search.google.com/search-console
- **Property:** sweetrun.app
- **Sitemap:** https://sweetrun.app/sitemap.xml (submitted ~May 9, 2026)
- **Status:** Connected and active — check for keyword data

---

### Service Worker / Cache
- **File:** app/sw.js
- **Current cache name:** `sweetrun-v3`
- To force users to get a fresh version after updates, increment to `sweetrun-v4`, commit and push

---

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18 |
| JSX compilation | Babel CLI (@babel/preset-react) |
| App type | PWA, offline-first, no backend |
| Hosting | Cloudflare Pages (free) |
| Domain/DNS | Cloudflare |
| Analytics | Cloudflare Web Analytics |
| Payments | Stripe (annual subscription) |
| Form handling | Web3Forms |
| Version control | Git → GitHub |
| Build | npm (npm run build) |

---

## Landing Page (index.html) — Key Elements

- **Hero CTA:** "Try SweetRun Free — 14 Days" → https://buy.stripe.com/dRm3cw9YsdYI7HkbGY14401
- **Sticky bar at top:** "Season's over — be first in line for 2027" + email field (Web3Forms)
- **Pricing section:** "Try free. Pay when you're hooked." — $49.99/year, 14-day free trial
- **Email capture section:** Near bottom, off-season messaging for 2027 season
- **Convention QR section:** REMOVED (was stale, removed in earlier session)
- **Footer:** sweetrun.app · $49/season (minor inconsistency — should say $49.99/year)

---

## Feedback Page (feedback.html) — Key Elements

- Dark-themed standalone page
- Fields: tap count (radio), biggest headache, feature request, name, email
- Submits via Web3Forms (access key: d91810ec-94aa-49ed-9731-6ba2cd42e106)
- Fallback: mailto: to damian.brockway@gmail.com if Web3Forms fails
- Thank-you screen shown on success
- Link in footer: "Back to sweetrun.app →"

---

## Traffic & Analytics Summary (May 28, 2026)

### Real Human Traffic (Web Analytics, bots excluded)
- Last 21 days: ~30 visits, ~40 page views
- Daily average: ~1.5 real humans/day
- Top country: United States
- Top page: sweetrun.app/app/ (people who visit actually use the app)

### HTTP Traffic (includes bots)
- Shows ~60 requests/day, ~1,350/month — mostly bots
- Top bot sources: Netherlands, Bulgaria
- Cache rate: 0.36% (very low — Cloudflare free plan limitation)
- 4xx errors: 242 (up 214%) — bots hitting invalid URLs
- 5xx errors: 55 (up 2,650%) — likely from recent deployments

### What Drove Traffic Spikes
- May 1: Conference at Bascom's in NH — business cards distributed
- May 9: Facebook posts in maple producer groups — traffic spike visible in data

---

## History of Key Changes (Chronological)

### Earlier sessions (before May 28)
1. **Babel/JSX fix** — Removed Babel CDN from app, pre-compiled JSX via @babel/cli
   - app.jsx created as source file, app.js as compiled output
   - Build command: `npm run build` set in Cloudflare Pages
2. **Landing page overhaul** — Fixed misleading pricing, added free trial messaging
   - Removed "no recurring charge" language
   - Removed stale conference QR section
   - Added off-season email capture section
3. **Stripe setup** — Created new subscription product ($49.99/year, 14-day free trial)
   - New payment link: https://buy.stripe.com/dRm3cw9YsdYI7HkbGY14401
   - Old one-time link still exists but unused
4. **Formspree** — Set up forms, switched feedback.html from formsubmit.co to Formspree
   - Email forwarding never worked reliably on free plan
5. **Google Search Console** — Connected sweetrun.app, submitted sitemap
6. **Service worker** — Bumped to sweetrun-v3, added app.js to pre-cache

### This session (May 28, 2026)
7. **Diagnosed real traffic** — Discovered 60/day was bots; real humans = ~1.5/day
8. **Switched forms to Web3Forms** — Both index.html and feedback.html
   - Access key: d91810ec-94aa-49ed-9731-6ba2cd42e106
   - Email delivery confirmed working with test submission
9. **Added sticky notify bar** — Top of index.html, dismissable, remembers dismissal
   - "Season's over — be first in line for 2027" + email field
10. **Created reference documents** — SWEETRUN-REFERENCE.md and SweetRun-Reference.docx
11. **Cloudflare analytics deep-dive** — Full analysis of real vs bot traffic

---

## Traffic Strategy (Discussed but Not Yet Implemented)

In order of likely impact:
1. **Google Search Console** — Check what keywords are already sending people. Build from there.
2. **SEO content pages** — Target specific searches: "sap to syrup ratio calculator," "when to stop tapping maple," "maple brix chart," "maple syrup production log"
3. **Facebook group presence** — Answer questions helpfully, mention SweetRun naturally. Don't just post promotions.
4. **Maple association outreach** — State/provincial maple producer newsletters reach exactly the right audience. Vermont Maple Sugar Makers' Association, Quebec Maple Syrup Producers, etc.
5. **Bascom's relationship** — Already have a connection from the conference. A mention in their newsletter or orders would reach thousands of serious producers.

---

## Seasonal Context

- Active maple season: roughly February–April
- Off-season now (May–January)
- Landing page messaging: "Season's over — be first in line for 2027"
- **Annual maintenance:** Update "2027" → "2028" in index.html before each season
- Off-season is actually ideal for outreach — producers have time to explore new tools

---

## Prompt for Resuming in a New Chat

> I'm working on SweetRun, a maple syrup production app at sweetrun.app. It's a one-person project by me, Damian Brockway (damian.brockway@gmail.com). The full project reference is in ~/Documents/GitHub/SugarCalc/SWEETRUN-HANDOFF.md — please read that file first before we start. The repo is at ~/Documents/GitHub/SugarCalc on my Mac. The site is hosted on Cloudflare Pages and auto-deploys from GitHub main. We use Web3Forms for email notifications (key: d91810ec-94aa-49ed-9731-6ba2cd42e106), Stripe for payments (14-day free trial, $49.99/year subscription link: https://buy.stripe.com/dRm3cw9YsdYI7HkbGY14401). Real human traffic is only ~1.5 visitors/day — traffic growth is the main priority right now. The next steps are: (1) check Google Search Console keyword data, (2) create SEO content pages for maple-specific search terms, (3) outreach to maple producer associations.

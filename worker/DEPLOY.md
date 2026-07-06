# Deploying the SweetRun License Worker

One-time setup, ~15 minutes, all from `~/Documents/GitHub/SugarCalc/worker`.

## 1. Create the KV namespace

```bash
cd ~/Documents/GitHub/SugarCalc/worker
npx wrangler kv namespace create DATA
```

Copy the `id` it prints into `wrangler.toml` (replace `REPLACE_WITH_KV_NAMESPACE_ID`).

## 2. Set the secrets

```bash
npx wrangler secret put LICENSE_SIGNING_KEY   # paste the value from worker/.dev.vars (after the =)
npx wrangler secret put ADMIN_KEY             # invent any long random string; save it
npx wrangler secret put STRIPE_WEBHOOK_SECRET # see step 4 — you can set a placeholder now and re-run later
```

⚠️ `worker/.dev.vars` holds the private signing key. It's gitignored — never commit it, and keep a copy somewhere safe (password manager). If it's ever lost, all future keys need a new keypair (existing customer keys keep working until expiry).

## 3. Deploy

```bash
npx wrangler deploy
```

Note the URL it prints, e.g. `https://sweetrun-license.<your-subdomain>.workers.dev`.

## 4. Wire up Stripe

1. Stripe Dashboard → Developers → Webhooks → Add endpoint.
   - URL: `https://sweetrun-license.<your-subdomain>.workers.dev/webhook`
   - Event: `checkout.session.completed`
2. Copy the signing secret (`whsec_...`) → `npx wrangler secret put STRIPE_WEBHOOK_SECRET` again with the real value.
3. Edit your payment link (Payment Links → your Season Pass link → ⋯ → Edit):
   - After payment → redirect to: `https://sweetrun.app/success?session_id={CHECKOUT_SESSION_ID}`
4. (From the strategy plan) Create the **$29.99 Founding Producer** price + payment link with the same redirect; also enable **Stripe Tax**.

## 5. Point the site at the Worker

Two constants are waiting for the URL from step 3:

- `app/src/app.jsx` → `const LICENSE_API = ''` (near the top)
- `success.html` → `const LICENSE_API = ''` (in the script at the bottom)

Fill both in, then:

```bash
cd ~/Documents/GitHub/SugarCalc
npm run build
git add -A && git commit -m "Point app at license Worker" && git push
```

## 6. Test the loop

1. Stripe → your payment link → pay with test card `4242 4242 4242 4242` (use test mode + a test-mode webhook/payment link first if you want to be careful).
2. Success page should show the Season Pass key within ~10 seconds.
3. Open the app → tap the **Trial** pill → paste key → Activate → pill turns to **✓ Pass**.
4. You should get a purchase notification email (via Web3Forms).
5. Event stats: `https://sweetrun-license.<subdomain>.workers.dev/stats?admin=YOUR_ADMIN_KEY`

## What ships in the app (already built)

- **Season Trial**: 14 days, but never ends before Feb 28 for Oct–Jan starts, and during Feb–Apr stays alive until 3 real sap days are logged (hard cap May 1).
- Trial pill in the header → Season Pass modal (buy link, key entry, optional email capture).
- Expired = soft lock: viewing and export always work; new entries aren't saved; clear banner explains it.
- Keys verify offline (ed25519, public key embedded) — no server call at runtime, works in the bush.
- Trial-start pings + email leads go to the Worker (or to Web3Forms until the Worker URL is set).

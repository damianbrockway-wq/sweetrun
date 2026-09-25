# Turning the Buy button on — step by step

**Why this matters:** the Stripe link is live and will happily charge someone $49.99 today. Nothing downstream exists yet, so they'd get no key, no email, and you wouldn't hear about it except in the Stripe dashboard. About 20 minutes of setup fixes that.

Everything runs from `~/Documents/GitHub/SugarCalc/worker`. Do the steps in order — each one produces a value the next one needs.

**Before you start:** do the whole thing in Stripe **Test mode** first (toggle top-right of the dashboard). Test mode has its own payment links and its own webhook secret, so you can run a fake purchase end to end with card `4242 4242 4242 4242` without touching real money. Then repeat steps 4–6 in Live mode. It's the same clicks twice, and it means the first real customer isn't your test case.

---

## Step 1 — Create the KV namespace

```
cd ~/Documents/GitHub/SugarCalc/worker
npx wrangler kv namespace create DATA
```

First run will open a browser to log into Cloudflare. It prints something like:

```
{ binding = "DATA", id = "a1b2c3d4e5f6..." }
```

Copy that `id`. Open `worker/wrangler.toml`, find `id = "REPLACE_WITH_KV_NAMESPACE_ID"` on line 9, and paste it in place of the placeholder — keep the quotes.

**Check:** `npx wrangler kv namespace list` shows a namespace named `sweetrun-license-DATA`.

---

## Step 2 — Set the three secrets

Run these one at a time. Each prompts you to paste a value, and the value won't echo to the screen.

```
npx wrangler secret put LICENSE_SIGNING_KEY
```
Paste the value from `worker/.dev.vars` — the part *after* the `=` sign. Open that file to copy it.

> **This is the private key that signs every license.** It's gitignored and should stay that way. Put a copy in your password manager now, before you do anything else. If it's lost, every future key needs a new keypair — keys already issued keep working until they expire, but you can't make more that match.

```
npx wrangler secret put ADMIN_KEY
```
Invent a long random string. Save it in your password manager too — it's what lets you read your own sales stats later.

```
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```
You don't have this yet. Type any placeholder for now; step 4 replaces it with the real one.

---

## Step 3 — Deploy the worker

```
npx wrangler deploy
```

It prints a URL like `https://sweetrun-license.YOURNAME.workers.dev`. **Write it down — steps 4 and 5 both need it.**

**Check:** open `https://sweetrun-license.YOURNAME.workers.dev/key?session_id=nope` in a browser. An error or "not found" is the correct answer — it means the worker is alive and responding. A Cloudflare 1016/DNS error means it isn't.

---

## Step 4 — Connect Stripe to the worker

In the Stripe dashboard (**Test mode first**):

**4a. Add the webhook.** Developers → Webhooks → Add endpoint.
- Endpoint URL: `https://sweetrun-license.YOURNAME.workers.dev/webhook`
- Events to send: `checkout.session.completed` (just that one)
- Click Add endpoint.

**4b. Get the signing secret.** On the endpoint you just made, click **Reveal** under "Signing secret". It starts with `whsec_`. Copy it, then:

```
cd ~/Documents/GitHub/SugarCalc/worker
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```
Paste the real `whsec_...` value. This overwrites the placeholder from step 2.

**4c. Set the redirect — this one is easy to miss.** Payment Links → your Season Pass link → ⋯ → Edit → "After payment" → **Redirect customers to your website**:

```
https://sweetrun.app/success?session_id={CHECKOUT_SESSION_ID}
```

Type `{CHECKOUT_SESSION_ID}` literally, braces and all — Stripe substitutes the real value. **Without this, the success page has no session to look up and can't show a key, even with everything else wired correctly.**

---

## Step 5 — Point the app at the worker

Two constants are waiting for the URL from step 3. Tell me the URL and I'll fill both in and run the build — or do it yourself:

- `app/src/app.jsx` line 55: `const LICENSE_API = '';`
- `success.html` line 196: `const LICENSE_API = '';`

Put the worker URL inside the quotes in both, with no trailing slash. Then:

```
cd ~/Documents/GitHub/SugarCalc
npm run build
git add -A && git commit -m "Point app at license worker" && git push
```

---

## Step 6 — Buy your own app

Still in Test mode. Open your payment link, pay with `4242 4242 4242 4242`, any future expiry, any CVC.

Four things should happen:

1. The success page shows a Season Pass key within ~10 seconds
2. A purchase notification lands in `damian.brockway@gmail.com`
3. Pasting that key into the app (Trial pill → paste → Activate) flips the pill to **✓ Pass**
4. `https://sweetrun-license.YOURNAME.workers.dev/stats?admin=YOUR_ADMIN_KEY` shows the sale

**If the key doesn't appear:** check the webhook first. Stripe → Developers → Webhooks → your endpoint → "Events" tab shows every delivery and its response. A 400 there usually means the signing secret in step 4b didn't match. A 404 means the URL is wrong. Nothing listed at all means the redirect in 4c is the problem, not the webhook.

---

## Step 7 — Do it again in Live mode

Toggle Stripe out of Test mode and repeat **4a, 4b, and 4c** with the live payment link. Live mode has a separate webhook and a separate signing secret, so this genuinely has to be done twice.

Steps 1–3 and 5 don't need repeating — one worker serves both modes.

---

## Also worth doing while you're in there

- **Enable Stripe Tax** (Settings → Tax). US sales tax on digital goods varies by state and this handles it automatically.
- **The $29.99 Founding Producer price** from the strategy plan — create it as a second payment link with the same redirect from 4c. Worth having ready before the competitor's free app lands.

---

## One thing I'd change regardless

Right now a customer whose key doesn't arrive sees a success page that never mentions a key at all — the "email hello@sweetrun.app" line is in the HTML but sits behind a check that returns before reaching it. Whatever happens with the worker, that message should show whenever someone lands on the page after paying. It's a two-line fix and it's the difference between a patient customer and a chargeback. Say the word and I'll do it.

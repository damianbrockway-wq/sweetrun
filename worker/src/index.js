// SweetRun License & Events Worker
// Endpoints:
//   POST /webhook            — Stripe checkout.session.completed → mint Season Pass key
//   GET  /key?session_id=    — retrieve key after purchase (used by success.html)
//   POST /event              — anonymous pings: {t:"trial_start"|..., email?:string}
//   GET  /stats?admin=       — event counts + leads (admin only)
//
// Secrets (wrangler secret put ...): LICENSE_SIGNING_KEY, STRIPE_WEBHOOK_SECRET, ADMIN_KEY
// Vars (wrangler.toml): WEB3FORMS_KEY, NOTIFY_EMAIL
// KV binding: DATA

const ALLOWED_ORIGINS = ['https://sweetrun.app', 'http://localhost:8788'];

function cors(req) {
  const origin = req.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...extra } });

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// ── Token minting ────────────────────────────────────────────────────────────
async function mintToken(env, email, plan) {
  const now = new Date();
  const expires = new Date(now.getTime() + 400 * 86400 * 1000); // ~13 months, covers a full season cycle
  const payload = { e: email.toLowerCase().trim(), p: plan, i: now.toISOString().slice(0, 10), x: expires.toISOString().slice(0, 10) };
  const payloadB64 = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const keyBytes = Uint8Array.from(atob(env.LICENSE_SIGNING_KEY), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', keyBytes, { name: 'Ed25519' }, false, ['sign']);
  const sig = await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(payloadB64));
  return payloadB64 + '.' + b64url(sig);
}

// ── Stripe signature verification ───────────────────────────────────────────
async function verifyStripeSig(payload, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(',').map((p) => p.split('=')));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 600) return false; // 10 min tolerance
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  // constant-time-ish compare
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

// ── IP rate limiter (fixed window, KV-backed) ────────────────────────────────
// /event is public and unauthenticated. Without a cap, anyone with the Worker URL
// can loop it to run up KV writes and — because a lead used to email the owner on
// every request — flood the inbox and exhaust the Web3Forms quota that purchase
// notifications share. This bounds each caller to `limit` requests per `windowSec`.
// It fails OPEN: if KV is unavailable we allow the request rather than break the
// app for real users — abuse prevention must not become its own outage.
async function rateLimited(env, ip, bucket, limit, windowSec) {
  if (!ip) return false;
  const window = Math.floor(Date.now() / 1000 / windowSec);
  const key = `rl:${bucket}:${ip}:${window}`;
  try {
    const n = Number(await env.DATA.get(key)) || 0;
    if (n >= limit) return true;
    // TTL a little past the window so the counter can't outlive its usefulness.
    await env.DATA.put(key, String(n + 1), { expirationTtl: windowSec + 60 });
    return false;
  } catch (_) {
    return false; // fail open
  }
}

async function notifyOwner(env, subject, body) {
  if (!env.WEB3FORMS_KEY) return;
  try {
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_key: env.WEB3FORMS_KEY, subject, from_name: 'SweetRun Worker', message: body }),
    });
  } catch (_) {}
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const c = cors(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: c });

    // ── Stripe webhook ──
    if (url.pathname === '/webhook' && req.method === 'POST') {
      const raw = await req.text();
      const ok = await verifyStripeSig(raw, req.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET);
      if (!ok) return json({ error: 'bad signature' }, 400);
      const event = JSON.parse(raw);
      // Idempotency: Stripe retries a webhook until it gets a 2xx, and re-sends on
      // its own schedule. Without this, each retry re-mints and re-emails. Record
      // the event id the first time and no-op every repeat.
      if (event.id) {
        const seen = await env.DATA.get(`evt:seen:${event.id}`);
        if (seen) return json({ received: true, deduped: true });
        await env.DATA.put(`evt:seen:${event.id}`, '1', { expirationTtl: 60 * 60 * 24 });
      }
      if (event.type === 'checkout.session.completed') {
        const s = event.data.object;
        // checkout.session.completed also fires for delayed/async payment methods
        // BEFORE the money settles. Only mint once the payment is actually paid;
        // async methods settle later via checkout.session.async_payment_succeeded.
        if (s.payment_status && s.payment_status !== 'paid') return json({ received: true, pending: true });
        const email = s.customer_details?.email || s.customer_email;
        if (email) {
          const plan = s.metadata?.plan || 'season';
          const token = await mintToken(env, email, plan);
          await env.DATA.put(`key:email:${email.toLowerCase().trim()}`, token);
          await env.DATA.put(`key:session:${s.id}`, token, { expirationTtl: 60 * 60 * 24 * 30 });
          await env.DATA.put(`evt:purchase:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`, JSON.stringify({ email, plan, amt: s.amount_total }));
          await notifyOwner(env, `SweetRun — New ${plan} purchase 🎉`, `${email} bought a Season Pass ($${(s.amount_total / 100).toFixed(2)}).\n\nTheir key (for manual resend if needed):\n${token}`);
        }
      }
      return json({ received: true });
    }

    // ── Key retrieval for success page ──
    if (url.pathname === '/key' && req.method === 'GET') {
      const sid = url.searchParams.get('session_id') || '';
      if (!/^cs_/.test(sid)) return json({ error: 'bad session' }, 400, c);
      const token = await env.DATA.get(`key:session:${sid}`);
      if (!token) return json({ error: 'not found yet — try again in a few seconds' }, 404, c);
      return json({ key: token }, 200, c);
    }

    // ── Anonymous event ping / email capture ──
    if (url.pathname === '/event' && req.method === 'POST') {
      // Cap each IP well above what a real client sends (one trial ping, maybe a
      // couple more) but far below flood range. Shared NAT (a sugarhouse's wifi)
      // stays comfortably under 30/hour.
      const ip = req.headers.get('CF-Connecting-IP') || '';
      if (await rateLimited(env, ip, 'event', 30, 3600)) {
        return json({ error: 'rate limited' }, 429, { ...c, 'Retry-After': '3600' });
      }
      let body;
      try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, c); }
      // req.json() accepts bare `null`/`123`/`"str"` as valid JSON; guard so the
      // property reads below can't throw an unhandled 500.
      if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'bad json' }, 400, c);
      const t = String(body.t || '').slice(0, 32).replace(/[^a-z_]/g, '');
      if (!t) return json({ error: 'missing type' }, 400, c);
      await env.DATA.put(`evt:${t}:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`, JSON.stringify({ ua: req.headers.get('User-Agent')?.slice(0, 80) }), { expirationTtl: 60 * 60 * 24 * 400 });
      const email = String(body.email || '').trim().toLowerCase();
      if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.length < 120) {
        // Only email the owner the FIRST time an address is seen. A repeated
        // address (a retry, or someone replaying the request) updates the lead
        // record silently instead of firing another notification — this is the
        // second half of neutralizing the inbox-flood vector, alongside the IP cap.
        const known = await env.DATA.get(`lead:${email}`);
        await env.DATA.put(`lead:${email}`, JSON.stringify({ src: t, at: new Date().toISOString() }));
        if (!known) await notifyOwner(env, 'SweetRun — Trial signup lead', `${email} started a trial (source: ${t}).`);
      }
      return json({ ok: true }, 200, c);
    }

    // ── Admin stats ──
    if (url.pathname === '/stats' && req.method === 'GET') {
      if (url.searchParams.get('admin') !== env.ADMIN_KEY) return json({ error: 'nope' }, 403);
      const counts = {};
      let cursor;
      do {
        const page = await env.DATA.list({ prefix: 'evt:', cursor, limit: 1000 });
        for (const k of page.keys) {
          const type = k.name.split(':')[1];
          counts[type] = (counts[type] || 0) + 1;
        }
        cursor = page.list_complete ? null : page.cursor;
      } while (cursor);
      const leads = [];
      cursor = undefined;
      do {
        const page = await env.DATA.list({ prefix: 'lead:', cursor, limit: 1000 });
        for (const k of page.keys) leads.push(k.name.slice(5));
        cursor = page.list_complete ? null : page.cursor;
      } while (cursor);
      return json({ events: counts, leads });
    }

    return json({ error: 'not found' }, 404);
  },
};

// ─── License & Season Trial ──────────────────────────────────────────────────
const LICENSE_API = ''; // set to the deployed Worker URL, e.g. 'https://sweetrun-license.<subdomain>.workers.dev' — empty disables pings/lookup
const LICENSE_PUBKEY = 'GfNHBIKm8enIoOW3yVfFuk7kz34xA3eYKUaWWzNVCzA=';
const STRIPE_BUY_URL = 'https://buy.stripe.com/dRm3cw9YsdYI7HkbGY14401';

const b64uDec = s => Uint8Array.from(atob(String(s).replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));

// Returns payload {e,p,i,x} if structurally valid; payload.expired=true if past expiry; null if invalid.
async function verifyLicense(token) {
  try {
    const [p, sig] = String(token).trim().split('.');
    if (!p || !sig) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64uDec(p)));
    if (!payload.e || !payload.x) return null;

    // Decode the signature BEFORE the verify try-block. The old code decoded it
    // as an argument inside the try, so a malformed signature threw during decode
    // and landed in the "unsupported browser" catch — which accepts the license.
    // That turned any bad signature into a valid pass on a modern browser. A
    // signature that won't decode, or isn't 64 bytes, is simply invalid, full stop.
    let sigBytes;
    try { sigBytes = b64uDec(sig); } catch { return null; }
    if (sigBytes.length !== 64) return null;

    let verified = false, unsupported = false;
    try {
      const key = await crypto.subtle.importKey('raw', b64uDec(LICENSE_PUBKEY), { name: 'Ed25519' }, false, ['verify']);
      verified = await crypto.subtle.verify('Ed25519', key, sigBytes, new TextEncoder().encode(p));
    } catch (e) {
      // The ONLY reason to fall through unverified is a browser that genuinely
      // can't do Ed25519 (Safari < 17). Any other error is a real failure and
      // must reject — we do not accept on structure alone for a routine error.
      unsupported = !!(e && (e.name === 'NotSupportedError' || e.name === 'OperationError'));
      if (!unsupported) return null;
    }
    if (!verified && !unsupported) return null;

    if (new Date(payload.x + 'T23:59:59') < new Date()) return { ...payload, expired: true };
    return payload;
  } catch { return null; }
}

// Season Trial: 14 days — but never ends before Feb 28 for Oct–Jan activations,
// and during Feb–Apr stays alive until you've logged 3 real sap days (hard cap May 1).
function trialStatus() {
  let start = ls.get('sg_trial_start', null);
  if (!start) { start = new Date().toISOString().slice(0, 10); try { localStorage.setItem('sg_trial_start', JSON.stringify(start)); } catch {} }
  const s = new Date(start + 'T00:00:00');
  const now = new Date();
  let end = s.getTime() + 14 * 86400000;
  const m = s.getMonth();
  if (m >= 9)      end = Math.max(end, new Date(s.getFullYear() + 1, 1, 28).getTime()); // Oct–Dec → next Feb 28
  else if (m === 0) end = Math.max(end, new Date(s.getFullYear(), 1, 28).getTime());     // Jan → this Feb 28
  if (now.getTime() > end && now.getMonth() >= 1 && now.getMonth() <= 3) {
    const season = ls.get('sg_season', now.getFullYear());
    const sapDays = new Set((((ls.get('sg_logs2', {}))[season] || {}).sapCollected || []).map(e => e.date)).size;
    if (sapDays < 3) end = new Date(now.getFullYear(), 4, 1).getTime(); // alive until May 1
  }
  const daysLeft = Math.ceil((end - now.getTime()) / 86400000);
  return { start, daysLeft, expired: daysLeft <= 0 };
}

function pingEvent(type, email) {
  const send = async () => {
    if (LICENSE_API) {
      const r = await fetch(LICENSE_API + '/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: type, email }) });
      if (!r.ok) throw new Error('ping failed');
    } else if (email) {
      // Worker not deployed yet — capture leads via Web3Forms so nothing is lost
      const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ access_key: 'd91810ec-94aa-49ed-9731-6ba2cd42e106', subject: 'SweetRun — Trial signup lead', from_name: 'SweetRun App', message: `${email} started a trial (source: ${type}).` }) });
      if (!r.ok) throw new Error('ping failed');
    }
  };
  return send();
}

// ─── Feature Flags ───────────────────────────────────────────────────────────
const BETA_FEATURES = true; // Set to false to hide experimental features


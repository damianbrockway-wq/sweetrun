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

    // Fix pass 1 (item 21) closed the hole where a browser without Ed25519 accepted any key.
    // Fix pass 2 restores genuine keys there: when WebCrypto's Ed25519 import or verify THROWS
    // (Safari before 17, iPads on iOS 16), the same check runs in the vendored pure-JS verifier
    // (@noble/ed25519 2.3.0, strict RFC 8032, in the bundle so it works offline). A forged key
    // fails either way. Only if that also throws (no SHA-512 at all, e.g. a non-HTTPS page) does
    // the app ask the Worker, and with no Worker the key is refused as unverifiable.
    const msg = new TextEncoder().encode(p);
    let verified = false, threw = false;
    try {
      const key = await crypto.subtle.importKey('raw', b64uDec(LICENSE_PUBKEY), { name: 'Ed25519' }, false, ['verify']);
      verified = await crypto.subtle.verify('Ed25519', key, sigBytes, msg);
    } catch { threw = true; }
    if (threw) {
      let localOk = null;
      try { localOk = await SR_NOBLE.verifyAsync(sigBytes, msg, b64uDec(LICENSE_PUBKEY), { zip215: false }); } catch { localOk = null; }
      if (localOk !== null) verified = localOk === true;
      else {
        if (!LICENSE_API) return { unverifiable: true };
        try {
          const r = await fetch(LICENSE_API + '/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: String(token).trim() }) });
          const j = r.ok ? await r.json() : null;
          verified = !!(j && j.ok === true);
        } catch { return { unverifiable: true, offline: true }; }
      }
    }
    if (!verified) return null;
    if (new Date(payload.x + 'T23:59:59') < new Date()) return { ...payload, expired: true };
    return payload;
  } catch { return null; }
}

// Season Trial: 14 days, but never ends before Feb 28 for Oct to Jan activations,
// and during Feb to Apr stays alive until you've logged 3 real sap days (hard cap May 1).
// The rule itself is srTrialOf (28-rs-truth2, tested). Fix pass 2: a sap day is a whole
// calendar day, the status says which limit applies, and it is checked at every write.
//   logsOverride: a sg_logs2 value about to be written (the write-time check)
function trialStatus(logsOverride) {
  let start = ls.get('sg_trial_start', null);
  if (!start) { start = srToday(); try { localStorage.setItem('sg_trial_start', JSON.stringify(start)); } catch {} }
  const today = srToday();
  const logs = logsOverride || ls.get('sg_logs2', {}) || {};
  const season = srSeasonOf(today) || ls.get('sg_season', new Date().getFullYear());
  return srTrialOf({ start, now: Date.now(), todayIso: today, sapDates: srSapDatesOf(logs[season]) });
}
// The write-time gate ls.set asks while a trial runs (set by the core once the trial is known).
//   -> null (write it) | 'expired' (the trial is over now) | 'refuse' (this write would end it)
function srTrialGate(k, v) {
  if (trialStatus().expired) return 'expired';
  if (k === 'sg_logs2' && v && typeof v === 'object' && trialStatus(v).expired) return 'refuse';
  return null;
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


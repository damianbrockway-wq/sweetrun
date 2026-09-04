#!/usr/bin/env node
// SweetRun — mint a Season Pass key locally.
//
// Uses the same ed25519 signing key and the same token format as the Cloudflare
// Worker, so a key minted here is indistinguishable from a purchased one and
// verifies offline in the app.
//
//   node worker/mint-key.mjs                                  → owner key for damian.brockway@gmail.com, expires 2099-12-31
//   node worker/mint-key.mjs someone@example.com              → comp key, 400 days (same as a purchase)
//   node worker/mint-key.mjs someone@example.com 2027-06-30   → comp key with a set expiry
//   node worker/mint-key.mjs someone@example.com 400 founding → plan label on the payload
//
// The private key never leaves this machine. Do not commit worker/.dev.vars.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto as crypto } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const OWNER = 'damian.brockway@gmail.com';
const PUBKEY = 'GfNHBIKm8enIoOW3yVfFuk7kz34xA3eYKUaWWzNVCzA=';   // must match LICENSE_PUBKEY in app/src/app.jsx

const b64url = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlDec = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function readSigningKey() {
  let text;
  const path = join(HERE, '.dev.vars');
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    console.error(`Could not read ${path}\nThat file holds the private signing key. If it is missing, restore it from your password manager.`);
    process.exit(1);
  }
  const m = text.match(/^\s*LICENSE_SIGNING_KEY\s*=\s*"?([A-Za-z0-9+/=]+)"?\s*$/m);
  if (!m) { console.error('No LICENSE_SIGNING_KEY line found in worker/.dev.vars'); process.exit(1); }
  return m[1];
}

function parseArgs() {
  const [emailArg, expiryArg, planArg] = process.argv.slice(2);
  const email = (emailArg || OWNER).toLowerCase().trim();
  const isOwner = email === OWNER;
  let x;
  if (!expiryArg) {
    x = isOwner ? '2099-12-31' : new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(expiryArg)) {
    x = expiryArg;
  } else if (/^\d+$/.test(expiryArg)) {
    x = new Date(Date.now() + Number(expiryArg) * 86400000).toISOString().slice(0, 10);
  } else {
    console.error('Expiry must be YYYY-MM-DD or a number of days.');
    process.exit(1);
  }
  const plan = planArg || (isOwner ? 'owner' : 'season');
  return { email, x, plan };
}

const { email, x, plan } = parseArgs();

const keyBytes = Buffer.from(readSigningKey(), 'base64');
let signKey;
try {
  signKey = await crypto.subtle.importKey('pkcs8', keyBytes, { name: 'Ed25519' }, false, ['sign']);
} catch (e) {
  console.error('Could not import the signing key as ed25519 PKCS8.\n' + e.message);
  process.exit(1);
}

const payload = { e: email, p: plan, i: new Date().toISOString().slice(0, 10), x };
const payloadB64 = b64url(new TextEncoder().encode(JSON.stringify(payload)));
const sig = await crypto.subtle.sign('Ed25519', signKey, new TextEncoder().encode(payloadB64));
const token = payloadB64 + '.' + b64url(sig);

// Verify against the public key the app actually ships, so a bad key fails here
// rather than on your phone.
const verifyKey = await crypto.subtle.importKey('raw', b64urlDec(PUBKEY), { name: 'Ed25519' }, false, ['verify']);
const good = await crypto.subtle.verify('Ed25519', verifyKey, b64urlDec(token.split('.')[1]), new TextEncoder().encode(payloadB64));
if (!good) {
  console.error('\nThe minted key does NOT verify against the public key in the app.\nThe signing key in worker/.dev.vars does not match LICENSE_PUBKEY in app/src/app.jsx.\nNothing was output.');
  process.exit(1);
}

console.log(`
Season Pass key for ${email}
plan: ${plan}    issued: ${payload.i}    expires: ${x}
verified against the public key shipped in the app

${token}

To use it: open sweetrun.app/app/, tap the Trial pill in the header,
paste this into "Have a pass key?", tap Activate.
`);

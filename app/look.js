// SweetRun look flag: which shell to show, "new" (Run Sheet) or "classic".
//
// Loaded synchronously in <head> so the choice is on <html data-look> before
// first paint (no flash of the wrong ground colour), and so the Run Sheet home
// screen icon and manifest are swapped in before anyone can "Add to Home Screen".
//
// Rules, first match wins:
//   1. ?look=new | ?look=classic in the URL: use it and remember it on this device
//      (localStorage sg_look). ?look=auto forgets the override.
//   2. A remembered override in sg_look.
//   3. Hostname default: classic on sweetrun.app and www.sweetrun.app (paying
//      customers see no change until cutover), new everywhere else (Pages
//      previews such as redesign.<project>.pages.dev, localhost).
//
// sg_look is a preference key (SR_PREF_KEYS), stored JSON-encoded like every
// other sg_* value so backup and restore treat it the same way. Every storage
// access is wrapped: private mode or blocked storage must never stop the app.
// Pure logic lives in srLookDecide so tests/runsheet.test.mjs can pin it.
(function (w) {
  var KEY = 'sg_look';
  var PROD_HOSTS = ['sweetrun.app', 'www.sweetrun.app'];

  function srLookDecide(hostname, search, stored) {
    var m = /[?&]look=(new|classic|auto)(?:[&#]|$)/i.exec(String(search || ''));
    if (m) {
      var q = m[1].toLowerCase();
      if (q === 'auto') return { look: srLookDefault(hostname), write: null, clear: true };
      return { look: q, write: q, clear: false };
    }
    if (stored === 'new' || stored === 'classic') return { look: stored, write: null, clear: false };
    return { look: srLookDefault(hostname), write: null, clear: false };
  }

  function srLookDefault(hostname) {
    var h = String(hostname || '').toLowerCase().replace(/\.$/, '');
    return PROD_HOSTS.indexOf(h) >= 0 ? 'classic' : 'new';
  }

  var api = { KEY: KEY, decide: srLookDecide, byHost: srLookDefault, current: 'classic' };
  w.srLook = api;
  if (!w.document || !w.location) return;   // test harness: logic only

  var stored = null;
  try { var raw = w.localStorage.getItem(KEY); stored = raw ? JSON.parse(raw) : null; } catch (e) { stored = null; }
  var d = srLookDecide(w.location.hostname, w.location.search, stored);
  try {
    if (d.write) w.localStorage.setItem(KEY, JSON.stringify(d.write));
    if (d.clear) w.localStorage.removeItem(KEY);
  } catch (e) { /* storage blocked: the choice still applies to this page load */ }
  api.current = d.look;

  var root = w.document.documentElement;
  root.setAttribute('data-look', d.look);

  if (d.look === 'new') {
    // Run Sheet chrome: Ember ground in the status bar, option D home screen icon.
    // Classic keeps its tags untouched (the data-URI manifest and icon-512).
    var q = function (sel) { return w.document.querySelector(sel); };
    var tc = q('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', '#0C0B0A');
    var mf = q('link[rel="manifest"]'); if (mf) mf.setAttribute('href', '/app/manifest.webmanifest');
    var at = q('link[rel="apple-touch-icon"]');
    if (at) { at.setAttribute('href', '/app/icons/apple-touch-icon-d-180.png'); at.setAttribute('sizes', '180x180'); }
    var head = w.document.head;
    if (head && !q('link[rel="icon"]')) {
      var f1 = w.document.createElement('link'); f1.rel = 'icon'; f1.type = 'image/svg+xml'; f1.href = '/app/icons/favicon-d.svg'; head.appendChild(f1);
      var f2 = w.document.createElement('link'); f2.rel = 'icon'; f2.type = 'image/png'; f2.sizes = '32x32'; f2.href = '/app/icons/favicon-d-32.png'; head.appendChild(f2);
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);

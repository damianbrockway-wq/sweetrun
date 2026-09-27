// SweetRun Service Worker
// Cache name: bump this string on every deploy to force all clients to update cleanly.
// localStorage data is NEVER touched by this file — it is purely cache management.

const CACHE      = 'sweetrun-v36';
const TILE_CACHE = 'sweetrun-tiles-v1';   // kept separately — never auto-purged on app update

// Everything SweetRun needs to run fully offline. v36 is the cutover build: the
// Run Sheet UI is the only UI, so its header photos are precached too (they were
// cached on first view while the classic UI was still the default). Activating
// v36 deletes every older sweetrun-* cache, which drops the classic files
// (the look flag script, the option D icons, the old Amber Glass mark) from installed phones.
const ASSETS = [
  '/app/',
  '/app/index.html',
  '/app/app.js',
  '/app/tokens.css',
  '/app/runsheet.css',
  '/app/manifest.webmanifest',
  // Home screen and tab icons: option E (Damian's own)
  '/app/icons/icon-e-192.png',
  '/app/icons/icon-e-512.png',
  '/app/icons/icon-e-512-maskable.png',
  '/app/icons/apple-touch-icon-e-180.png',
  '/app/icons/favicon-e-32.png',
  '/app/icons/favicon-e-16.png',
  // In-app brand mark (side nav, greeting, Watch header) at exact sizes
  '/app/icons/mark-e-30@1x.png', '/app/icons/mark-e-30@2x.png', '/app/icons/mark-e-30@3x.png',
  // Self-hosted Barlow: without these the app falls back to system type offline
  '/app/fonts/barlow-latin-500-normal.woff2',
  '/app/fonts/barlow-latin-600-normal.woff2',
  '/app/fonts/barlow-latin-700-normal.woff2',
  '/app/fonts/barlow-latin-800-normal.woff2',
  '/app/fonts/barlow-semi-condensed-latin-700-normal.woff2',
  // Header photos (one per stage, the greeting set, pumps, watch)
  '/app/photos/bush-aerial.webp',
  '/app/photos/evaporator-steam.webp',
  '/app/photos/frost-morning.webp',
  '/app/photos/hillside-panorama.webp',
  '/app/photos/pumphouse.webp',
  '/app/photos/sap-tank.webp',
  '/app/photos/sugarhouse-dawn.webp',
  '/app/photos/syrup-bottles.webp',
  '/app/photos/tap-spout.webp',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];

// ── Install: cache the app shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // Same-origin shell files fetch with cache:'reload' so a stale HTTP cache can never
      // be precached into a fresh SW version (field bug, 2026-09-20: v19 precached a stale
      // app.js straight out of the browser's HTTP cache). CDN URLs are version-pinned.
      .then(cache => Promise.all(ASSETS.map(url => {
        const req = url.startsWith('/') ? new Request(url, { cache: 'reload' }) : url;
        return fetch(req).then(res => {
          if (!res.ok && res.type !== 'opaque') throw new Error('precache failed: ' + url);
          return cache.put(url, res);
        });
      })))
      .then(() => self.skipWaiting())   // activate immediately, don't wait for old SW to die
  );
});

// ── Activate: delete any old SweetRun or SugarCalc caches ────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE && k !== TILE_CACHE)   // keep app cache AND tile cache
          .map(k => {
            console.log('[SweetRun SW] Clearing old cache:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())  // take control of open tabs immediately
  );
});

// ── Fetch: network-first for API calls, cache-first for app shell ─────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always hit the network for weather/geo APIs — these need live data
  const isApi = url.hostname === 'api.open-meteo.com'
             || url.hostname === 'geocoding-api.open-meteo.com'
             || url.hostname === 'api.qrserver.com'
             || url.hostname === 'nominatim.openstreetmap.org';

  if (isApi) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503, statusText: 'Offline',
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Map tiles — cache-first so the sugarbush map works offline after a save
  const isTile = url.hostname === 'server.arcgisonline.com'
              || url.hostname === 'services.arcgisonline.com'   // Esri World Hillshade (terrain layer)
              || url.hostname === 'basemap.nationalmap.gov'      // USGS Topo (+ shaded-relief fallback)
              || url.hostname === 'clarity.maptiles.arcgis.com'
              || url.hostname === 'gis.apfo.usda.gov'
              || url.hostname.endsWith('openstreetmap.org');

  if (isTile) {
    event.respondWith(
      caches.open(TILE_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request)
            .then(response => {
              if (response && response.status === 200) {
                cache.put(event.request, response.clone());
              }
              return response;
            })
            .catch(() => new Response('', { status: 503, statusText: 'Tile offline' }));
        })
      )
    );
    return;
  }

  // For CDN assets (React, Leaflet, Babel) — cache-first, fall back to network
  const isCdn = url.hostname === 'cdnjs.cloudflare.com'
             || url.hostname === 'unpkg.com';

  if (isCdn) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Static assets (fonts, header photos, icons): cache-first. All are precached;
  // this branch also catches any added later. Replacing a photo in place means a
  // new file name or a CACHE bump.
  const isStatic = url.origin === self.location.origin
                && /^\/app\/(fonts|photos|icons)\//.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // For the app shell (app/index.html) — network-first so updates propagate immediately,
  // fall back to cache so it still works offline.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache a fresh copy on every successful network fetch
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))  // offline fallback
  );
});

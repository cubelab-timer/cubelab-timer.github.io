/* CubeLab Timer service worker: keeps a copy of the site so the timer opens without a connection.
   Pages and files of this site: network first (so updates show up at once), the saved copy when offline or slow.
   Fixed-version libraries (3x3 scramble) and fonts: the saved copy first.
   Bump VERSION only to force a clean cache; normal updates of the pages need no change here. */
'use strict';
const VERSION = 'v1';
const CACHE = 'cubelab-' + VERSION;
const CORE = [
  './', 'guide.html', 'events.html', 'about.html', 'privacy.html',
  'en/', 'en/guide.html', 'en/events.html', 'en/about.html', 'en/privacy.html',
  'config.js', 'site.js', 'footer.css', 'content.css', 'favicon.svg',
  'manifest.webmanifest', 'en/manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'
];
const CDN = [
  'https://cdn.jsdelivr.net/npm/cubejs@1.3.2/lib/cube.js',
  'https://cdn.jsdelivr.net/npm/cubejs@1.3.2/lib/solve.js'
];
// other hosts whose files are worth keeping (fonts, fixed-version libraries)
const KEEP_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const WAIT_MS = 3500; // how long to wait for the network before using the saved copy

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // one missing file must not stop the rest from being saved
    await Promise.all([...CORE, ...CDN].map(async u => {
      try { const r = await fetch(u, {cache: 'reload'}); if (r.ok) await c.put(u, r); } catch (err) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('cubelab-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

function keyOf(req) {
  // /index.html and / are the same page; ignore ?query on pages
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    u.search = ''; u.hash = '';
    if (u.pathname.endsWith('/index.html')) u.pathname = u.pathname.slice(0, -'index.html'.length);
  }
  return u.href;
}

async function networkFirst(e) {
  const req = e.request, key = keyOf(req), cache = caches.open(CACHE);
  const net = fetch(req);
  // keep the fresh copy (the worker is kept alive until it is saved)
  e.waitUntil(net.then(async r => {
    if (!r.ok || r.type !== 'basic') return;
    const copy = r.clone(); // before the page reads the body
    await (await cache).put(key, copy);
  }).catch(() => {}));
  const r = await Promise.race([net.catch(() => null), new Promise(ok => setTimeout(ok, WAIT_MS, null))]);
  if (r) return r;
  const hit = await (await cache).match(key);
  if (hit) return hit;
  try { return await net; } catch (err) {}
  if (req.mode === 'navigate') {
    const home = await (await cache).match(new URL(/\/en\//.test(new URL(req.url).pathname) ? 'en/' : './', self.registration.scope).href);
    if (home) return home;
  }
  return Response.error();
}

async function cacheFirst(e) {
  const req = e.request, cache = caches.open(CACHE);
  const hit = await (await cache).match(req.url);
  const load = async () => {
    const r = await fetch(req);
    if (r.ok || r.type === 'opaque') { const copy = r.clone(); await (await cache).put(req.url, copy); }
    return r;
  };
  if (hit) {
    // the fonts' CSS may change: refresh it in the background; versioned files never change
    if (new URL(req.url).hostname === 'fonts.googleapis.com') load().catch(() => {});
    return hit;
  }
  return load();
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) e.respondWith(networkFirst(e));
  else if (KEEP_HOSTS.includes(u.hostname)) e.respondWith(cacheFirst(e));
  // anything else (WCA data, ads, analytics) goes to the network as usual
});

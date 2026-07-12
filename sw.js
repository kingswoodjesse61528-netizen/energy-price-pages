/* Energy price PWA service worker.
   Static shell is cache-first. data.json is network-first with cached fallback. */
const VER = 'energy-price-v13';
// SHELL 只放同域本地资源；被墙的海外 CDN（cdnjs/jsdelivr/unpkg）一律不进预取清单，
// 页面侧已有本地 vendor 打底 + ECHARTS_URLS 回退，不依赖它们。
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './manifest.webmanifest?v=20260702',
  './icons/apple-touch-icon-v2.png',
  './icons/energy-price-v2-192.png',
  './icons/energy-price-v2-512.png',
  './icons/energy-price-v2-maskable-512.png',
  './vendor/chart.umd.js',
  './vendor/echarts.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  // 逐个预取壳资源；任一资源失败不影响其余（绝不用原子 addAll，避免被单个不可达资源整批拖垮）。
  event.waitUntil(caches.open(VER).then(cache => Promise.all(SHELL.map(async asset => {
    try {
      const resp = await fetch(asset);
      if (resp.ok) await cache.put(asset, resp);
    } catch (_) {}
  }))));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== VER).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(VER).then(cache => cache.put('./index.html', copy));
        return response;
      }).catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }

  if (url.pathname.endsWith('/data.json')) {
    event.respondWith(
      fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(VER).then(cache => cache.put('./data.json', copy));
        return response;
      }).catch(() => caches.match('./data.json'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
      if (response.ok && (url.origin === location.origin || url.host.includes('cdnjs') || url.host.includes('jsdelivr') || url.host.includes('unpkg'))) {
        const copy = response.clone();
        caches.open(VER).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => hit))
  );
});

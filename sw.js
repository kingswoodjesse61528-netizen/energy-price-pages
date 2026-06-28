/* Energy price PWA service worker.
   Static shell is cache-first. data.json is network-first with cached fallback. */
const VER = 'energy-price-v7';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/energy-price-192.png',
  './icons/energy-price-512.png',
  './icons/energy-price-maskable-512.png',
  './vendor/chart.umd.js',
  './vendor/echarts.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js',
  'https://unpkg.com/echarts@5.5.1/dist/echarts.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(VER).then(cache => cache.addAll(SHELL).catch(() => {})));
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

const CACHE_NAME = 'hptu-attendance-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/student-dashboard.html',
  '/student-styles.css',
  '/student-dashboard.js',
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/dist/face-api.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// ====================================================================
// Service Worker - يجعل البرنامج يعمل بدون إنترنت كبرنامج مثبَّت حقيقي
// ====================================================================
const CACHE_NAME = 'inspection-system-v1';
const FILES_TO_CACHE = [
  './استمارة_الفرعي.html',
  './لوحة_المركزي.html',
  './firebase-config.js',
  './manifest-branch.json',
  './manifest-central.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE.map(url => new Request(url, {cache: 'reload'})));
    }).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// استراتيجية: شبكة أولاً، وإن فشلت نستخدم النسخة المخزنة (Offline fallback)
self.addEventListener('fetch', (event) => {
  // لا نتدخل في طلبات Firebase حتى تعمل المزامنة بشكل طبيعي
  if (event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('firebaseapp.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, responseClone);
      });
      return response;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});

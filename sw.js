/* Offline shell only: never cache third-party resources or form submissions. */
const CACHE = 'teacherbuddy-v2-37c3a821da24';
const SHELL = ['./', './index.html', './TeacherBuddy.html', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  // Wait for old tabs to close to avoid a mid-form update.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('teacherbuddy-') && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if(request.method !== 'GET' || url.origin !== self.location.origin) return;
  const shellUrls = SHELL.map(path => new URL(path, self.registration.scope).href);
  if(!shellUrls.includes(url.href) && request.mode !== 'navigate') return;
  // Build-generated cache version refreshes the full shell on deployment.
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(request);
    if(cached) return cached;
    try { return await fetch(request); }
    catch(error) {
      if(request.mode === 'navigate') {
        const fallback = await cache.match(new URL('./index.html', self.registration.scope).href);
        if(fallback) return fallback;
      }
      return Response.error();
    }
  }));
});

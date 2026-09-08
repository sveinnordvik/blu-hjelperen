self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    self.registration.unregister().then(() => {
      return self.clients.claim();
    })
  );
});

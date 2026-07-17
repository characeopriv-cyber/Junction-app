const CACHE = "junction-static-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never touch API calls or non-GET requests — these are dynamic,
  // user-specific, and auth-sensitive. Always hit the network.
  if (url.pathname.startsWith("/api/") || event.request.method !== "GET") {
    return;
  }

  // Page navigations: always try the network first so index.html (and the
  // hashed bundle it points to) is never stale after a new deploy. Only
  // fall back to a cached shell if the network is genuinely unavailable.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Static assets (hashed JS/CSS/icons): cache-first. Vite gives each
  // build's files new hashed names, so this can never serve stale code.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        });
      })
    );
  }
});

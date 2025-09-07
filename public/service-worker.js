const CACHE = "gamjaring-v1";
const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)))
      )
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.mode === "navigate") {
    // SPA 라우팅: 네트워크 우선, 실패 시 fallback
    e.respondWith(fetch(req).catch(() => caches.match("/")));
  } else {
    e.respondWith(caches.match(req).then((c) => c || fetch(req)));
  }
});

// public/service-worker.js
const CACHE = "gamjaring-v2"; // ← 반드시 버전 올리기(v1 → v2)
const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting(); // 새 SW 즉시 활성화 대기 건너뛰기
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)))
      )
  );
  self.clients.claim(); // 기존 클라이언트 즉시 제어
});

self.addEventListener("fetch", (e) => {
  const req = e.request;

  // manifest는 항상 네트워크 우선으로 받아오고, 실패 시 캐시
  if (new URL(req.url).pathname === "/manifest.webmanifest") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/")));
  } else {
    e.respondWith(caches.match(req).then((c) => c || fetch(req)));
  }
});

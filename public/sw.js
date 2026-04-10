const CACHE_NAME = "grubx-shell-v4";
const ASSET_CACHE = "grubx-assets-v4";
const APP_SHELL = ["/site.webmanifest", "/512x512.png", "/64x64.png", "/opengraph.jpg"];

const isCacheableResponse = (request, response) => {
  if (!response || !response.ok || response.redirected) {
    return false;
  }

  const responseUrl = new URL(response.url);
  if (responseUrl.origin !== self.location.origin || responseUrl.pathname.startsWith("/cdn-cgi/")) {
    return false;
  }

  const cacheControl = response.headers.get("cache-control") || "";
  if (/no-store|private/i.test(cacheControl)) {
    return false;
  }

  if (request.mode === "navigate") {
    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("text/html");
  }

  return true;
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin && url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheableResponse(request, response)) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/"))),
    );
    return;
  }

  if (!isSameOrigin && url.hostname !== "image.tmdb.org" && url.hostname !== "streamed.pk") {
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (isCacheableResponse(request, response)) {
            const cloned = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, cloned));
          }
          return response;
        }),
    ),
  );
});

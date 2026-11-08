// Bump when files under /images keep their path but change content (e.g. re-encoded photos):
// images are cached by URL, so returning visitors would otherwise keep the old copies.
const CACHE_NAME = "legalfinder-static-v3";
const OFFLINE_SHELL = ["/", "/auth"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match("/")) ?? Response.error();
      }),
    );
    return;
  }

  // Cache only immutable static assets. Never persist application pages, API
  // responses, or other potentially user-specific content on a device.
  const isStaticAsset =
    url.pathname.startsWith("/assets/") ||
    ["script", "style", "image", "font"].includes(request.destination);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request)
          .then((response) => {
            if (!response.ok) return response;
            const copy = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, copy))
              .catch(() => undefined);
            return response;
          })
          .catch(() => cached ?? Response.error()),
    ),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "LegalFinder", body: event.data ? event.data.text() : "New activity" };
  }

  const title = payload.title || "LegalFinder";
  const options = {
    body: payload.body || "You have a new update.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: payload.url || "/dashboard", kind: payload.kind || "info" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url.includes(targetUrl)) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});

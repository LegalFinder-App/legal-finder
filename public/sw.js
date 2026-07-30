self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("legalfinder-shell-v1").then((cache) =>
      cache.addAll([
        "/",
        "/auth",
        "/dashboard",
        "/messages",
        "/assistant",
        "/practice",
        "/bench",
        "/precinct",
      ]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open("legalfinder-shell-v1");
        return (await cache.match("/")) ?? Response.error();
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
      const copy = response.clone();
      caches.open("legalfinder-shell-v1").then((cache) => cache.put(request, copy)).catch(() => undefined);
      return response;
    }).catch(() => cached ?? Response.error())),
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

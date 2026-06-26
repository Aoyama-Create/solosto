// solosto service worker
// Phase 5a: Push 受信 → 通知表示（＋payload に件数があれば App バッジ）、通知クリックでアプリを開く。
// 件数の源（COM-043）と全消滅時のバッジクリアは Phase 5b で実装。

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push 受信。payload 例: { title, body, url, badgeCount }
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "solosto", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "solosto";
  const options = {
    body: payload.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      if (typeof payload.badgeCount === "number" && self.navigator.setAppBadge) {
        try {
          await self.navigator.setAppBadge(payload.badgeCount);
        } catch {
          // バッジ非対応環境は無視。
        }
      }
    })(),
  );
});

// 通知クリック → 既存タブにフォーカス、無ければ開く。
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientsList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })(),
  );
});

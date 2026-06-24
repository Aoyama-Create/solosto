// solosto service worker（最小スケルトン）
// Phase 5 で Push 受信 → setAppBadge(pending件数) → 通知表示、失効検知を実装する。
// 現状は登録時に即時有効化するだけ（オフライン/キャッシュ戦略は今後）。

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// TODO(Phase 5): push / notificationclick / setAppBadge を実装

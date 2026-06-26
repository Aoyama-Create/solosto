// COM-042/043 の純粋ロジック。送信結果の分類とペイロード整形（副作用なし＝Vitest 可能）。
// 実送信は lib/push/send.ts（server-only）。

// 失効＝購読が無効。Web Push の 404(Not Found)/410(Gone) は購読消滅 → 行を削除すべき。
// それ以外（401/429/5xx 等）は一時障害の可能性があり削除しない。
export function isExpiredStatus(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

export type NotificationPayload = {
  title: string;
  body: string;
  url: string;
  badgeCount?: number;
};

// SW(public/sw.js)の push ハンドラが読む形へ整形。url 既定は "/"、badgeCount は数値のときのみ載せる。
export function buildNotificationPayload(input: {
  title: string;
  body?: string;
  url?: string;
  badgeCount?: number;
}): NotificationPayload {
  const payload: NotificationPayload = {
    title: input.title,
    body: input.body ?? "",
    url: input.url && input.url.length > 0 ? input.url : "/",
  };
  if (typeof input.badgeCount === "number") payload.badgeCount = input.badgeCount;
  return payload;
}

import "server-only";

import webpush, { WebPushError, type PushSubscription } from "web-push";
import { isExpiredStatus, type NotificationPayload } from "@/lib/push/delivery";

// VAPID は一度だけ設定。秘密鍵はサーバ専用（server-only でクライアント取込を禁止）。
let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new Error(
      "VAPID 環境変数が未設定です（VAPID_SUBJECT / *_PUBLIC_KEY / VAPID_PRIVATE_KEY）",
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type SendResult = { endpoint: string; ok: boolean; expired: boolean };

// COM-040 送信。各購読へ Web Push を送り、結果を分類して返す（COM-042: 410/404=失効）。
// 行の削除は呼び出し側（push アクション）が expired=true の endpoint に対して行う。
export async function sendToSubscriptions(
  subs: { endpoint: string; subscription: PushSubscription }[],
  payload: NotificationPayload,
): Promise<SendResult[]> {
  if (subs.length === 0) return [];
  ensureConfigured();
  const body = JSON.stringify(payload);

  return Promise.all(
    subs.map(async ({ endpoint, subscription }) => {
      try {
        await webpush.sendNotification(subscription, body);
        return { endpoint, ok: true, expired: false };
      } catch (e) {
        const status = e instanceof WebPushError ? e.statusCode : undefined;
        return { endpoint, ok: false, expired: isExpiredStatus(status) };
      }
    }),
  );
}

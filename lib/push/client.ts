// COM-003 のブラウザ側（副作用あり）。SW 登録・購読・解除・状態取得の薄いラッパ。
// 判定ロジック本体は lib/push/state.ts（純粋）。ここはクライアントでのみ呼ぶ。

import type { PushPermission } from "@/lib/push/state";

// VAPID 公開鍵（base64url）→ applicationServerKey 用 ArrayBuffer（BufferSource）。
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

export function isPushSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function currentPermission(): PushPermission {
  if (typeof Notification === "undefined") return "default";
  return Notification.permission as PushPermission;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  // SWRegister が登録済み。ready を待って確実に取得する。
  return navigator.serviceWorker.ready;
}

// このデバイスの既存購読（無ければ null）。
export async function getLocalSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await getRegistration();
  return reg.pushManager.getSubscription();
}

// 許可要求 → このデバイスを購読。purchaseManager.subscribe の結果(JSON)を返す。
// 許可されなかった/未対応なら null。
export async function subscribeHere(vapidPublicKey: string): Promise<PushSubscriptionJSON | null> {
  if (!isPushSupported()) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const reg = await getRegistration();
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBuffer(vapidPublicKey),
    }));
  return sub.toJSON();
}

// このデバイスの購読を解除。解除した endpoint を返す（サーバ側削除に使う）。無ければ null。
export async function unsubscribeHere(): Promise<string | null> {
  const sub = await getLocalSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}

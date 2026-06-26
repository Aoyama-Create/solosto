// COM-003 購読状態判定（デバイス単位）の純粋ロジック。
// ブラウザ API（Notification.permission / PushManager）から集めた事実を受け取り、UI 表示用の状態へ写像する。
// 副作用なし＝Vitest で全分岐を検証できる。実際の API アクセスは lib/push/client.ts。

export type PushPermission = "default" | "granted" | "denied";

// UI で出し分ける購読状態。
// - unsupported: SW/Push 非対応（iOS で未ホーム追加など）
// - denied: ブラウザでブロック済み（再許可はユーザー操作が必要）
// - default: 未許可（「通知をオンにする」導線を出す）
// - on: このデバイスは購読済み
// - off: 許可はあるが未購読（再度オンにできる）
export type PushState = "unsupported" | "denied" | "default" | "on" | "off";

export function derivePushState(input: {
  supported: boolean;
  permission: PushPermission;
  subscribedHere: boolean;
}): PushState {
  if (!input.supported) return "unsupported";
  if (input.permission === "denied") return "denied";
  if (input.permission === "default") return "default";
  // permission === "granted"
  return input.subscribedHere ? "on" : "off";
}

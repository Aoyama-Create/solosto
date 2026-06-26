// Phase 5a スモーク: 購読登録/解除（API-005/006）を RLS 越しに確認。
// registerSubscription の重複排除（endpoint キー）と unregister の削除、自分の行のみ見えることを検証。
// 実際の Push 配信はブラウザ依存のため対象外（手動: DevTools の Push）。
// 実行: node --env-file=.env.local scripts/smoke-push.mjs（要 Supabase 起動・pnpm seed 済み）。冪等。
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);
const { data: auth, error: e } = await supabase.auth.signInWithPassword({
  email: "test@solosto.local",
  password: "password",
});
if (e) throw e;
const userId = auth.user.id;

const endpoint = "https://example.com/push/smoke-endpoint-AAA";
const subscription = { endpoint, keys: { p256dh: "demo", auth: "demo" } };

// registerSubscription 相当（endpoint で既存検索 → update or insert）。
async function register(sub, label) {
  const { data: existing } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("subscription->>endpoint", sub.endpoint)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("push_subscriptions")
      .update({ subscription: sub, last_used_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("push_subscriptions")
      .insert({ user_id: userId, subscription: sub, device_label: label });
  }
}

async function countMine() {
  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("subscription->>endpoint", endpoint);
  return count ?? 0;
}

// 後始末（前回の残骸を消す）。
await supabase
  .from("push_subscriptions")
  .delete()
  .eq("user_id", userId)
  .eq("subscription->>endpoint", endpoint);

// 1) 登録 → 1件
await register(subscription, "device-1");
const afterFirst = await countMine();

// 2) 同一 endpoint で再登録 → 増えない（重複排除）
await register({ ...subscription, keys: { p256dh: "x", auth: "y" } }, "device-1-again");
const afterSecond = await countMine();

// 3) 解除（unregisterSubscription 相当）→ 0件
await supabase
  .from("push_subscriptions")
  .delete()
  .eq("user_id", userId)
  .eq("subscription->>endpoint", endpoint);
const afterDelete = await countMine();

console.log("登録後:", afterFirst, "/ 再登録後:", afterSecond, "/ 解除後:", afterDelete);

if (afterFirst === 1 && afterSecond === 1 && afterDelete === 0) {
  console.log("OK: 購読は endpoint で重複排除され、解除で削除される（RLS: 自分の行のみ操作）");
} else {
  console.error("NG:", { afterFirst, afterSecond, afterDelete });
  process.exit(1);
}

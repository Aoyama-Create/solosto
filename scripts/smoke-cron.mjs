// Phase 6b スモーク: 通知対象抽出（COM-050）の発火式＋scope分岐を確認。
// 送信は伴わず、route.ts と同じ抽出ロジックを再現して「発火対象を拾う/除外則」を検証する。
// タイミング判定(userFiresNow)・生成(COM-041)は Vitest（notify.test.ts）で検証済み。
// テストユーザーでサインインし、その group 内だけを操作（RLS 経路・冪等。後始末で戻す）。
// 実行: node --env-file=.env.local scripts/smoke-cron.mjs（要 Supabase 起動・pnpm seed 済み）。
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

const { data: profile } = await supabase
  .from("profiles")
  .select("group_id")
  .eq("id", auth.user.id)
  .single();
const groupId = profile.group_id;

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const past = "2026-01-01";

// route.ts と同じ抽出（COM-050）。
function selectFiringNames(products, categories) {
  const scopeById = new Map(categories.map((c) => [c.id, c.tracking_scope]));
  const fires = (enabled, snooze, next) =>
    enabled && !(snooze && !(today > snooze)) && next != null && next <= today;
  const names = [];
  for (const c of categories) {
    if (c.tracking_scope !== "category") continue;
    if (fires(c.is_notify_enabled, c.notify_snoozed_until, c.next_order_date)) names.push(c.name);
  }
  for (const p of products) {
    if (p.type !== "recurring") continue;
    if (scopeById.get(p.category_id) === "category") continue;
    if (fires(p.is_notify_enabled, p.notify_snoozed_until, p.next_order_date)) names.push(p.name);
  }
  return names;
}

async function load() {
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("name, type, is_notify_enabled, notify_snoozed_until, next_order_date, category_id")
      .eq("group_id", groupId)
      .is("deleted_at", null),
    supabase
      .from("categories")
      .select("id, name, tracking_scope, is_notify_enabled, notify_snoozed_until, next_order_date")
      .eq("group_id", groupId)
      .is("deleted_at", null),
  ]);
  return { products: products ?? [], categories: categories ?? [] };
}

// 発火セットアップ: 化粧水(product-scope) と 赤ワインカテゴリ(category-scope) を期日到来に。
await supabase
  .from("products")
  .update({ next_order_date: past, is_notify_enabled: true })
  .eq("group_id", groupId)
  .eq("name", "化粧水（しっとり）");
await supabase
  .from("categories")
  .update({ next_order_date: past, is_notify_enabled: true })
  .eq("group_id", groupId)
  .eq("name", "赤ワイン");

const { products, categories } = await load();
const names = selectFiringNames(products, categories);
console.log("発火対象:", names.join(", ") || "なし");

const hasCosme = names.includes("化粧水（しっとり）");
const hasWineCat = names.includes("赤ワイン");
const hasWineProduct = names.includes("赤ワイン（銘柄随時）"); // category-scope 配下 → 除外されるべき

// 後始末（next_order_date を null に戻す）。
await supabase
  .from("products")
  .update({ next_order_date: null })
  .eq("group_id", groupId)
  .eq("name", "化粧水（しっとり）");
await supabase
  .from("categories")
  .update({ next_order_date: null })
  .eq("group_id", groupId)
  .eq("name", "赤ワイン");

if (hasCosme && hasWineCat && !hasWineProduct) {
  console.log("OK: 発火式で product/category subject を抽出・category-scope 配下商品は除外");
} else {
  console.error("NG:", { hasCosme, hasWineCat, hasWineProduct });
  process.exit(1);
}

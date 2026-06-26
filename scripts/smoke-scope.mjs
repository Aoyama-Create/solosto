// Phase 2b スモーク: 認証ユーザーが RLS 越しに tracking_scope を切り替えられ、
// scope切替で配下商品の pending が idle にリセットされる、という API-019 のデータ挙動を確認する。
// 実行: node --env-file=.env.local scripts/smoke-scope.mjs（要 Supabase 起動・pnpm seed 済み）。
// 冪等: 最後に元の scope へ戻す。
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const { error: signInErr } = await supabase.auth.signInWithPassword({
  email: "test@solosto.local",
  password: "password",
});
if (signInErr) throw signInErr;

// 赤ワイン（category-scope）を取得。
const { data: wine } = await supabase
  .from("categories")
  .select("id, name, tracking_scope")
  .eq("name", "赤ワイン")
  .single();
console.log(`対象カテゴリ: ${wine.name} (現在 scope=${wine.tracking_scope})`);

// 配下商品を1件 pending にして「買い物リストに乗っている」状態を作る。
const { data: prod } = await supabase
  .from("products")
  .select("id, name")
  .eq("category_id", wine.id)
  .limit(1)
  .single();
await supabase.from("products").update({ status: "pending" }).eq("id", prod.id);
const before = await supabase.from("products").select("status").eq("id", prod.id).single();
console.log(`  配下商品 ${prod.name} を pending に: status=${before.data.status}`);

// API-019 と同じリセット処理を RLS 越しに実行: scope を反転 → pending を idle に。
const flipped = wine.tracking_scope === "category" ? "product" : "category";
const { error: scopeErr } = await supabase
  .from("categories")
  .update({ tracking_scope: flipped, status: null })
  .eq("id", wine.id);
if (scopeErr) throw scopeErr;
const { error: resetErr } = await supabase
  .from("products")
  .update({ status: "idle" })
  .eq("category_id", wine.id)
  .eq("status", "pending");
if (resetErr) throw resetErr;

const after = await supabase.from("products").select("status").eq("id", prod.id).single();
console.log(
  `  scope を ${flipped} に切替 → 配下商品 status=${after.data.status}（pending→idle 期待）`,
);

// 後始末: 元の scope に戻す。
await supabase.from("categories").update({ tracking_scope: wine.tracking_scope }).eq("id", wine.id);

if (after.data.status === "idle") {
  console.log("OK: RLS 越しの scope切替＋pendingリセットが機能");
} else {
  console.error("NG: pending が idle に戻っていない");
  process.exit(1);
}

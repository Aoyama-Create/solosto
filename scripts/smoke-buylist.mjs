// Phase 4a スモーク: 買い物リスト集計（pending ∪ next_order_date<=今日、商品/カテゴリ統合、
// category-scope 配下商品の除外）を RLS 越しに確認。getBuyList の絞り込みロジックを再現して検証する。
// メーター/緊急度の算出は Vitest（stock-meter.test.ts）で検証済み。
// 実行: node --env-file=.env.local scripts/smoke-buylist.mjs（要 Supabase 起動・pnpm seed 済み）。冪等。
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);
const { error: e } = await supabase.auth.signInWithPassword({
  email: "test@solosto.local",
  password: "password",
});
if (e) throw e;

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

// 期限到来をセットアップ: 化粧水(product/コスメ=product-scope) と 赤ワイン(category-scope) を due に。
const { data: cosme } = await supabase
  .from("products")
  .select("id")
  .eq("name", "化粧水（しっとり）")
  .single();
await supabase.from("products").update({ next_order_date: yesterday }).eq("id", cosme.id);
const { data: wine } = await supabase
  .from("categories")
  .select("id")
  .eq("name", "赤ワイン")
  .single();
await supabase.from("categories").update({ next_order_date: yesterday }).eq("id", wine.id);

// --- getBuyList の絞り込み再現 ---
const { data: products } = await supabase
  .from("products")
  .select(
    "id, name, type, status, next_order_date, category_id, categories(tracking_scope, deleted_at)",
  )
  .is("deleted_at", null);
const productSubjects = products.filter((p) => {
  const cat = p.categories;
  if (cat && !cat.deleted_at && cat.tracking_scope === "category") return false; // category-scope配下は除外
  const due = p.type === "recurring" && p.next_order_date && p.next_order_date <= today;
  return p.status === "pending" || due;
});
const { data: cats } = await supabase
  .from("categories")
  .select("id, name, status, next_order_date")
  .eq("tracking_scope", "category")
  .is("deleted_at", null);
const categorySubjects = cats.filter(
  (c) => c.status === "pending" || (c.next_order_date && c.next_order_date <= today),
);

console.log(
  "買い物リスト（商品 subject）:",
  productSubjects.map((p) => p.name).join(", ") || "なし",
);
console.log(
  "買い物リスト（カテゴリ subject）:",
  categorySubjects.map((c) => c.name).join(", ") || "なし",
);

const hasCosme = productSubjects.some((p) => p.name === "化粧水（しっとり）");
const hasWineCat = categorySubjects.some((c) => c.name === "赤ワイン");
const hasWineProduct = productSubjects.some((p) => p.name === "赤ワイン（銘柄随時）");
const hasTP = productSubjects.some((p) => p.name === "トイレットペーパー"); // spot/idle/未due → 出ない想定

// 後始末
await supabase.from("products").update({ next_order_date: null }).eq("id", cosme.id);
await supabase.from("categories").update({ next_order_date: null }).eq("id", wine.id);

if (hasCosme && hasWineCat && !hasWineProduct && !hasTP) {
  console.log(
    "OK: 期限到来の商品/カテゴリが統合表示・category-scope配下商品は除外・未dueのspotは非表示",
  );
} else {
  console.error("NG:", { hasCosme, hasWineCat, hasWineProduct, hasTP });
  process.exit(1);
}

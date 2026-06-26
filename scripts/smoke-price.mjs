// Phase 3b スモーク: category-scope の銘柄横断集計の入力データを RLS 越しに確認する。
// 「赤ワイン」(category scope) 配下の全銘柄ログ（MAPU/OSCO）を集約し、底値=MIN(unit_price)・平均・購入間隔を確認。
// 価格/サイクルの算出ロジック自体は Vitest（price-stats.test.ts / cycle.test.ts）で検証済み。
// 実行: node --env-file=.env.local scripts/smoke-price.mjs（要 Supabase 起動・pnpm seed 済み）。
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

const { data: cat } = await supabase
  .from("categories")
  .select("id, name, tracking_scope")
  .eq("name", "赤ワイン")
  .single();
console.log(`カテゴリ: ${cat.name} (scope=${cat.tracking_scope})`);

// 配下商品 → 銘柄横断ログ。
const { data: prods } = await supabase.from("products").select("id").eq("category_id", cat.id);
const ids = prods.map((p) => p.id);
const { data: logs } = await supabase
  .from("purchase_logs")
  .select("brand, unit_price, purchased_at")
  .in("product_id", ids)
  .order("purchased_at", { ascending: true });

console.log(
  `  銘柄横断ログ ${logs.length}件: ${logs.map((l) => `${l.brand}(¥${l.unit_price})`).join(", ")}`,
);

const prices = logs.map((l) => Number(l.unit_price));
const lowest = Math.min(...prices);
const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
console.log(`  底値=¥${lowest} / 平均=¥${avg.toFixed(1)}`);

const brands = new Set(logs.map((l) => l.brand));
const intervalDays =
  logs.length >= 2
    ? Math.round((new Date(logs.at(-1).purchased_at) - new Date(logs[0].purchased_at)) / 86400000)
    : null;
console.log(
  `  銘柄数=${brands.size}（${[...brands].join("/")}） / 直近2件の間隔=${intervalDays}日`,
);

if (logs.length >= 2 && brands.size >= 2 && intervalDays > 0) {
  console.log("OK: 銘柄が異なっても category 単位でログが集約され、サイクル/底値の入力が成立");
} else {
  console.error("NG: 銘柄横断の集約データが不足");
  process.exit(1);
}

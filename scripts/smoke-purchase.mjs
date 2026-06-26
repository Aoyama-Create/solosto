// Phase 3a スモーク: 認証ユーザーが purchase_logs を RLS 越しに INSERT/SELECT/DELETE できるか確認。
// purchase_logs の RLS は「親 product が自グループ」のサブクエリ方式で最も複雑なため、ここを実機確認する。
// 算出ロジック自体は Vitest（lib/domain/cycle.test.ts）で検証済み。
// 実行: node --env-file=.env.local scripts/smoke-purchase.mjs（要 Supabase 起動・pnpm seed 済み）。冪等。
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

const { data: product } = await supabase
  .from("products")
  .select("id, name")
  .eq("name", "化粧水（しっとり）")
  .single();
console.log(`対象商品: ${product.name}`);

// INSERT（total_units/unit_price は呼び出し側が算出する設計＝ここでも明示）。
const { data: inserted, error: insErr } = await supabase
  .from("purchase_logs")
  .insert({
    product_id: product.id,
    price: 1480,
    pack_quantity: 1,
    units_per_pack: 1,
    total_units: 1,
    unit_price: 1480,
    brand: "テスト銘柄",
    platform: "amazon",
    purchased_at: new Date().toISOString(),
  })
  .select("id")
  .single();
if (insErr) {
  console.error("INSERT 失敗（RLS/grants?）:", insErr.message);
  process.exit(1);
}
console.log("  INSERT OK:", inserted.id);

// SELECT
const { data: logs, error: selErr } = await supabase
  .from("purchase_logs")
  .select("id, brand, unit_price")
  .eq("product_id", product.id);
if (selErr) throw selErr;
console.log(`  SELECT OK: ${logs.length}件（直近 brand=${logs.at(-1)?.brand}）`);

// 後始末: 入れたログを削除（DELETE も RLS 越し）。
const { error: delErr } = await supabase.from("purchase_logs").delete().eq("id", inserted.id);
if (delErr) {
  console.error("DELETE 失敗:", delErr.message);
  process.exit(1);
}
console.log("  DELETE OK（冪等）");
console.log("OK: purchase_logs の RLS(INSERT/SELECT/DELETE) が認証ユーザーで機能");

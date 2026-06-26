// Phase 4b スモーク: 商品検索（API-031）の絞り込みを RLS 越しに確認。
// searchProducts の2段ロジック（platform/期間→product_id 先引き→products 絞り込み）を再現して検証する。
// 正規化（COM-030）は Vitest（search-query.test.ts）で検証済み。
// 実行: node --env-file=.env.local scripts/smoke-search.mjs（要 Supabase 起動・pnpm seed 済み）。冪等（読み取りのみ）。
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

// 共通: products を name/category/id で絞り込む。
async function products({ keyword, categoryIds, ids }) {
  let q = supabase.from("products").select("id, name, category_id").is("deleted_at", null);
  if (keyword) q = q.ilike("name", `%${keyword}%`);
  if (categoryIds?.length) q = q.in("category_id", categoryIds);
  if (ids) q = q.in("id", ids);
  const { data, error } = await q.order("name");
  if (error) throw error;
  return data ?? [];
}

// platform/期間で purchase_logs から product_id を先引き。
async function logProductIds({ platforms, from, to }) {
  let q = supabase
    .from("purchase_logs")
    .select("product_id, products!inner(deleted_at)")
    .is("products.deleted_at", null);
  if (platforms?.length) q = q.in("platform", platforms);
  if (from) q = q.gte("purchased_at", `${from}T00:00:00Z`);
  if (to) {
    const end = new Date(`${to}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    q = q.lt("purchased_at", end.toISOString());
  }
  const { data, error } = await q;
  if (error) throw error;
  return [...new Set((data ?? []).map((l) => l.product_id))];
}

const { data: cats } = await supabase.from("categories").select("id, name");
const cosmeId = cats.find((c) => c.name === "コスメ").id;

const ymd = (offsetDays) => new Date(Date.now() - offsetDays * 86400000).toISOString().slice(0, 10);

// 1) キーワード「ワイン」
const byKeyword = await products({ keyword: "ワイン" });
const kwOk =
  byKeyword.some((p) => p.name === "赤ワイン（銘柄随時）") &&
  !byKeyword.some((p) => p.name === "化粧水（しっとり）");

// 2) カテゴリ「コスメ」
const byCat = await products({ categoryIds: [cosmeId] });
const catOk = byCat.length === 1 && byCat[0].name === "化粧水（しっとり）";

// 3) プラットフォーム「amazon」（赤ワインの MAPU ログが amazon）
const amazonIds = await logProductIds({ platforms: ["amazon"] });
const byPlatform = await products({ ids: amazonIds });
const platOk =
  byPlatform.some((p) => p.name === "赤ワイン（銘柄随時）") &&
  !byPlatform.some((p) => p.name === "化粧水（しっとり）");

// 4) 期間: 35〜25日前（MAPU=30日前 が範囲内、cosme=40日前 と OSCO=本日 は範囲外）
const periodIds = await logProductIds({ from: ymd(35), to: ymd(25) });
const byPeriod = await products({ ids: periodIds });
const periodOk =
  byPeriod.some((p) => p.name === "赤ワイン（銘柄随時）") &&
  !byPeriod.some((p) => p.name === "化粧水（しっとり）");

console.log("keyword「ワイン」:", byKeyword.map((p) => p.name).join(", ") || "なし");
console.log("category「コスメ」:", byCat.map((p) => p.name).join(", ") || "なし");
console.log("platform「amazon」:", byPlatform.map((p) => p.name).join(", ") || "なし");
console.log("period 35-25日前:", byPeriod.map((p) => p.name).join(", ") || "なし");

if (kwOk && catOk && platOk && periodOk) {
  console.log("OK: 商品名/カテゴリ/プラットフォーム/期間 の各フィルタが期待通り絞り込む");
} else {
  console.error("NG:", { kwOk, catOk, platOk, periodOk });
  process.exit(1);
}

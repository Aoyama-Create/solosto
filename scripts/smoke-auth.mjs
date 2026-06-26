// 認証ユーザー視点のスモーク: テストユーザーでサインインし、RLS 越しに自分のデータを読めるか確認。
// 実行: node --env-file=.env.local scripts/smoke-auth.mjs（要 Supabase 起動・pnpm seed 済み）。
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, anon, { auth: { persistSession: false } });

const { error: signInErr } = await supabase.auth.signInWithPassword({
  email: "test@solosto.local",
  password: "password",
});
if (signInErr) {
  console.error("サインイン失敗:", signInErr.message);
  process.exit(1);
}

const { data: cats, error: catErr } = await supabase
  .from("categories")
  .select("name, tracking_scope")
  .is("deleted_at", null);
const { data: prods, error: prodErr } = await supabase
  .from("products")
  .select("name, type, status")
  .is("deleted_at", null);

if (catErr || prodErr) {
  console.error("読み取り失敗:", (catErr ?? prodErr).message);
  process.exit(1);
}

console.log("認証ユーザーが RLS 越しに読めたデータ:");
console.log("  categories:", cats.map((c) => `${c.name}(${c.tracking_scope})`).join(", "));
console.log("  products:", prods.map((p) => `${p.name}[${p.type}/${p.status}]`).join(", "));

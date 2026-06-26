// 開発用シード。service_role でテストユーザー＋グループ＋カテゴリ/商品/購入ログを投入する。
// 実行: pnpm seed（= node --env-file=.env.local scripts/seed-dev.mjs）。Supabase ローカル起動が前提。
// 冪等: 同 email の既存ユーザーを削除してから作り直す。
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です（.env.local）");
  process.exit(1);
}

const TEST_EMAIL = "test@solosto.local";
const TEST_PASSWORD = "password";

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function unitPrice(price, packQuantity, unitsPerPack) {
  const totalUnits = packQuantity * unitsPerPack;
  return { totalUnits, unitPrice: price / totalUnits };
}

async function main() {
  // 1) 冪等化: 既存テストユーザーを削除（トリガーで作られた group/profile も FK cascade で消える）。
  const { data: list, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email === TEST_EMAIL);
  if (existing) {
    await admin.auth.admin.deleteUser(existing.id);
    console.log("既存テストユーザーを削除:", existing.id);
  }

  // 2) テストユーザー作成 → トリガーが group + profile を自動生成。
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: "テスト" },
  });
  if (createErr) throw createErr;
  const userId = created.user.id;

  // 3) group_id を取得。
  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("group_id")
    .eq("id", userId)
    .single();
  if (profErr) throw profErr;
  const groupId = profile.group_id;

  // 4) カテゴリ（product / category 両 scope）。
  const { data: cats, error: catErr } = await admin
    .from("categories")
    .insert([
      { group_id: groupId, name: "コスメ", tracking_scope: "product" },
      { group_id: groupId, name: "赤ワイン", tracking_scope: "category" },
      { group_id: groupId, name: "日用品", tracking_scope: "product" },
    ])
    .select("id, name");
  if (catErr) throw catErr;
  const catId = (name) => cats.find((c) => c.name === name).id;

  // 5) 商品。
  const { data: products, error: prodErr } = await admin
    .from("products")
    .insert([
      {
        group_id: groupId,
        category_id: catId("コスメ"),
        name: "化粧水（しっとり）",
        type: "recurring",
        base_unit: "本",
        default_units_per_pack: 1,
        status: "idle",
      },
      {
        group_id: groupId,
        category_id: catId("赤ワイン"),
        name: "赤ワイン（銘柄随時）",
        type: "recurring",
        base_unit: "本",
        default_units_per_pack: 1,
        status: "idle",
      },
      {
        group_id: groupId,
        category_id: catId("日用品"),
        name: "トイレットペーパー",
        type: "spot",
        base_unit: "ロール",
        default_units_per_pack: 12,
        status: "idle",
      },
    ])
    .select("id, name");
  if (prodErr) throw prodErr;
  const prodId = (name) => products.find((p) => p.name === name).id;

  // 6) 購入ログ。赤ワインは銘柄違い（MAPU→OSCO）で2件＝カテゴリ単位サイクル確認用。
  const wine = prodId("赤ワイン（銘柄随時）");
  const w1 = unitPrice(1280, 1, 1);
  const w2 = unitPrice(1180, 1, 1);
  const cosme = prodId("化粧水（しっとり）");
  const c1 = unitPrice(1480, 1, 1);

  const { error: logErr } = await admin.from("purchase_logs").insert([
    {
      product_id: wine,
      price: 1280,
      pack_quantity: 1,
      units_per_pack: 1,
      total_units: w1.totalUnits,
      unit_price: w1.unitPrice,
      brand: "MAPU",
      platform: "amazon",
      purchased_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      product_id: wine,
      price: 1180,
      pack_quantity: 1,
      units_per_pack: 1,
      total_units: w2.totalUnits,
      unit_price: w2.unitPrice,
      brand: "OSCO",
      platform: "official",
      purchased_at: new Date().toISOString(),
    },
    {
      product_id: cosme,
      price: 1480,
      pack_quantity: 1,
      units_per_pack: 1,
      total_units: c1.totalUnits,
      unit_price: c1.unitPrice,
      brand: "化粧水（しっとり）",
      platform: "official",
      purchased_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    },
  ]);
  if (logErr) throw logErr;

  console.log("シード完了");
  console.log("  ログイン:", TEST_EMAIL, "/", TEST_PASSWORD);
  console.log("  group:", groupId, "/ categories:", cats.length, "/ products:", products.length);
}

main().catch((e) => {
  console.error("シード失敗:", e.message ?? e);
  process.exit(1);
});

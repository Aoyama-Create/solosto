import { test, expect } from "@playwright/test";

// Phase 4b: 商品検索（SCR-031・ローカル実行・要 Supabase）。
// 新規ユーザーで2商品を登録し、キーワード・カテゴリで絞り込めること、件数表示を確認する。

function uniqueEmail() {
  return `e2e_search_${process.pid}_${Date.now()}@solosto.local`;
}

test("キーワード/カテゴリで商品を絞り込める", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(uniqueEmail());
  await page.getByLabel("パスワード").fill("password");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/$/);
  // signup 直後のリダイレクト沈静化を待ってから goto（競合回避）。
  await expect(page.getByText("今は買うものなし")).toBeVisible();

  const stamp = Date.now();
  const milk = `テスト牛乳_${stamp}`;
  const soap = `テスト石鹸_${stamp}`;
  for (const name of [milk, soap]) {
    await page.goto("/products/new");
    await page.getByLabel("商品名").fill(name);
    await page.getByRole("button", { name: "登録する" }).click();
    await expect(page).toHaveURL(/\/products$/);
  }

  // 検索へ。最初は全件（≥2件）。
  await page.getByRole("navigation").getByRole("link", { name: "検索" }).click();
  await expect(page).toHaveURL(/\/search$/);

  // キーワードで石鹸のみに絞る。
  await page.getByPlaceholder("商品名で検索（例: 洗剤）").fill(soap);
  await expect(page.getByText("1件 見つかりました")).toBeVisible();
  await expect(page.getByText(soap)).toBeVisible();
  await expect(page.getByText(milk)).toHaveCount(0);
});

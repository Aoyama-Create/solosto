import { test, expect } from "@playwright/test";

// Phase 3b: 価格比較ビュー（SCR-022）の基本（ローカル実行・要 Supabase）。
// 商品登録 → 2回購入（異なる単価）→ 価格ビューで底値/平均/直近が出る。

function uniqueEmail() {
  return `e2e_price_${process.pid}_${Date.now()}@solosto.local`;
}

test("2回購入で価格比較に底値/平均が出る", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(uniqueEmail());
  await page.getByLabel("パスワード").fill("password");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/products/new");
  const name = `テスト価格_${Date.now()}`;
  await page.getByLabel("商品名").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/products$/);

  const row = page
    .getByText(name)
    .locator("xpath=ancestor::*[contains(@class,'mantine-Card-root')]");

  // 2回購入（単価が異なるように）
  for (const price of ["400", "360"]) {
    await row.getByRole("button", { name: "買った" }).click();
    await page.getByLabel("購入金額").fill(price);
    await page.getByRole("button", { name: "記録して完了" }).click();
    await expect(page.getByRole("button", { name: "記録して完了" })).toHaveCount(0);
  }

  // 価格ビューへ（編集 → 価格）
  await row.getByRole("link", { name: "編集" }).click();
  await page.getByRole("link", { name: "価格" }).click();
  await expect(page.getByText("底値 / 個")).toBeVisible();
  await expect(page.getByText("平均 / 個")).toBeVisible();
});

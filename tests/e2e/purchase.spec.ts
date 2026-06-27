import { test, expect } from "@playwright/test";

// Phase 3a: 購入登録→サイクル確定の核ループ（ローカル実行・要 Supabase）。
// 商品登録 → 1回目「買った」(idle) → 2回目「買った」(tracking・next_order_date) → 履歴2件。

function uniqueEmail() {
  return `e2e_buy_${process.pid}_${Date.now()}@solosto.local`;
}

test("2回購入でサイクルが確定し履歴に残る", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(uniqueEmail());
  await page.getByLabel("パスワード").fill("password");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/$/);

  // 商品登録（定期）。signup 直後の goto は遷移と競合するため UI 導線で移動。
  await page.getByRole("navigation").getByRole("link", { name: "商品" }).click();
  await expect(page).toHaveURL(/\/products$/);
  await page.getByRole("link", { name: /追加/ }).click();
  await expect(page).toHaveURL(/\/products\/new$/);
  const name = `テスト定期_${Date.now()}`;
  await page.getByLabel("商品名").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/products$/);

  const row = page
    .getByText(name)
    .locator("xpath=ancestor::*[contains(@class,'mantine-Card-root')]");

  // 1回目の購入（モーダル）
  await row.getByRole("button", { name: "買った" }).click();
  await page.getByLabel("購入金額").fill("400");
  await page.getByRole("button", { name: "記録して完了" }).click();

  // 2回目の購入
  await expect(page.getByRole("button", { name: "記録して完了" })).toHaveCount(0);
  await row.getByRole("button", { name: "買った" }).click();
  await page.getByLabel("購入金額").fill("420");
  await page.getByRole("button", { name: "記録して完了" }).click();

  // 履歴に2件
  await row.getByRole("link", { name: "履歴" }).click();
  await expect(page.getByText(/の購入履歴$/)).toBeVisible();
  await expect(page.locator(".mantine-Card-root")).toHaveCount(2);
});

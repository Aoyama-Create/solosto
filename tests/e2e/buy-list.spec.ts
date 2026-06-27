import { test, expect } from "@playwright/test";

// Phase 4a: トップ買い物リスト（ローカル実行・要 Supabase）。
// 新規ユーザー → 空状態 → 商品登録（status=pending で買うものに乗る）→ トップに出る → 買った で消える。

function uniqueEmail() {
  return `e2e_top_${process.pid}_${Date.now()}@solosto.local`;
}

test("商品登録→トップに出る→買ったで消える", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(uniqueEmail());
  await page.getByLabel("パスワード").fill("password");
  await page.getByRole("button", { name: "登録する" }).click();

  // 初期は空状態
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("今は買うものなし")).toBeVisible();

  // 商品登録（新規は pending → 買うものに乗る）。signup 直後の goto は遷移と競合するため UI 導線で移動。
  await page.getByRole("navigation").getByRole("link", { name: "商品" }).click();
  await expect(page).toHaveURL(/\/products$/);
  await page.getByRole("link", { name: /追加/ }).click();
  await expect(page).toHaveURL(/\/products\/new$/);
  const name = `テスト買うもの_${Date.now()}`;
  await page.getByLabel("商品名").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/products$/);

  // トップに出る
  await page.getByRole("navigation").getByRole("link", { name: "ホーム" }).click();
  await expect(page).toHaveURL(/\/$/);
  const card = page
    .getByText(name)
    .locator("xpath=ancestor::*[contains(@class,'mantine-Card-root')]");
  await expect(card).toBeVisible();

  // 買った → リストから消える
  page.on("dialog", (d) => d.accept());
  await card.getByRole("button", { name: "買った" }).click();
  await page.getByLabel("購入金額").fill("300");
  await page.getByRole("button", { name: "記録して完了" }).click();
  await expect(page.getByText(name)).toHaveCount(0);
});

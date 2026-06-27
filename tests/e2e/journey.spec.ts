import { test, expect } from "@playwright/test";

// Phase 7b: 主要フローの「通し」E2E（ローカル実行・要 Supabase）。
// 横断の継続性を1本で保証する（各機能の単体 spec とは役割分担）:
// 登録 → トップに pending → 買った(idle化, リストから消える) → 2回目でサイクル確定(tracking) → 履歴2件 → 価格に底値。

function uniqueEmail() {
  return `e2e_journey_${process.pid}_${Date.now()}@solosto.local`;
}

test("登録→購入→サイクル確定→トップから消える→価格に底値（通し）", async ({ page }) => {
  // 1) サインアップ → トップ（空）
  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(uniqueEmail());
  await page.getByLabel("パスワード").fill("password");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("今は買うものなし")).toBeVisible();

  // 2) 商品登録（定期）。signup 直後の goto は遷移と競合するため UI 導線で移動。
  await page.getByRole("navigation").getByRole("link", { name: "商品" }).click();
  await expect(page).toHaveURL(/\/products$/);
  await page.getByRole("link", { name: /追加/ }).click();
  await expect(page).toHaveURL(/\/products\/new$/);
  const name = `通しテスト_${Date.now()}`;
  await page.getByLabel("商品名").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/products$/);

  // 3) トップに pending で出る
  await page.getByRole("navigation").getByRole("link", { name: "ホーム" }).click();
  await expect(page).toHaveURL(/\/$/);
  const homeCard = page
    .getByText(name)
    .locator("xpath=ancestor::*[contains(@class,'mantine-Card-root')]");
  await expect(homeCard).toBeVisible();

  // 4) トップで「買った」(1回目) → リストから消える（idle 着地）
  await homeCard.getByRole("button", { name: "買った" }).click();
  await page.getByLabel("購入金額").fill("400");
  await page.getByRole("button", { name: "記録して完了" }).click();
  await expect(page.getByText(name)).toHaveCount(0);

  // 5) 商品一覧から2回目「買った」→ tracking 化
  await page.getByRole("navigation").getByRole("link", { name: "商品" }).click();
  const listCard = page
    .getByText(name)
    .locator("xpath=ancestor::*[contains(@class,'mantine-Card-root')]");
  await listCard.getByRole("button", { name: "買った" }).click();
  await page.getByLabel("購入金額").fill("360");
  await page.getByRole("button", { name: "記録して完了" }).click();
  await expect(listCard.getByText("サイクル稼働")).toBeVisible();

  // 6) 履歴2件
  await listCard.getByRole("link", { name: "履歴" }).click();
  await expect(page.getByText(/の購入履歴$/)).toBeVisible();
  await expect(page.locator(".mantine-Card-root")).toHaveCount(2);

  // 7) 価格ビューに底値（判定ラベルは出さない）。価格導線は商品編集から。
  await page.goto("/products");
  const card2 = page
    .getByText(name)
    .locator("xpath=ancestor::*[contains(@class,'mantine-Card-root')]");
  await card2.getByRole("link", { name: "編集" }).click();
  await page.getByRole("link", { name: "価格" }).click();
  // 価格ビューはチャート同梱で dev 初回コンパイルが重いため余裕を持たせる。
  await expect(page.getByText("底値 / 個")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("買い時")).toHaveCount(0);
});

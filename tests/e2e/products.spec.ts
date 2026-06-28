import { test, expect } from "@playwright/test";

// 商品 CRUD の基本フロー（ローカル実行。要 Supabase 起動）。
// 一意な email でサインアップ → 商品登録（名前だけ）→ 一覧表示 → 編集で種別変更 → 削除。

function uniqueEmail() {
  return `e2e_prod_${process.pid}_${Date.now()}@solosto.local`;
}

test("商品の登録→一覧→編集→削除", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(uniqueEmail());
  await page.getByLabel("パスワード").fill("password");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/$/);

  // 商品タブ → 追加 → 名前だけで登録
  await page.getByRole("navigation").getByRole("link", { name: "商品" }).click();
  await page.getByRole("link", { name: "＋ 追加" }).click();
  const name = `テスト商品_${Date.now()}`;
  await page.getByLabel("商品名").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();

  // 一覧に出る
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByText(name)).toBeVisible();

  // 編集 → 単発に変更 → 保存
  await page
    .getByText(name)
    .locator("xpath=ancestor::*[contains(@class,'mantine-Card-root')]")
    .getByRole("link", { name: "編集" })
    .click();
  // Mantine SegmentedControl は input が画面外のため、可視ラベルをクリックする。
  await page.getByText("単発", { exact: true }).click();
  await page.getByRole("button", { name: "保存" }).first().click();
  await expect(page.getByText("商品を編集")).toBeVisible();

  // 削除（confirm を受理）。保存の transition 完了（ボタン再有効化）を待ってからクリック。
  page.on("dialog", (d) => d.accept());
  const del = page.getByRole("button", { name: "削除" });
  await expect(del).toBeEnabled();
  await del.click();
  await expect(page).toHaveURL(/\/products$/, { timeout: 15000 });
  await expect(page.getByText(name)).toHaveCount(0);
});

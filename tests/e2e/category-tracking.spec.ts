import { test, expect } from "@playwright/test";

// Phase 2b: カテゴリ追跡設定（SCR-015）の基本フロー（ローカル実行・要 Supabase）。
// サインアップ → カテゴリ作成 → 追跡設定で category 単位へ切替 → 通知設定が表示される。

function uniqueEmail() {
  return `e2e_scope_${process.pid}_${Date.now()}@solosto.local`;
}

test("カテゴリを category 単位に切替 → 通知設定が出る", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(uniqueEmail());
  await page.getByLabel("パスワード").fill("password");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/$/);
  // signup 直後のリダイレクト沈静化を待ってから goto（競合回避）。
  await expect(page.getByText("今は買うものなし")).toBeVisible();

  // カテゴリ管理 → 追加
  await page.goto("/categories");
  const cat = `ワイン_${Date.now()}`;
  await page.getByPlaceholder("新しいカテゴリ名").fill(cat);
  await page.getByRole("button", { name: "追加" }).click();
  await expect(page.getByText(cat)).toBeVisible();

  // 追跡設定へ
  await page
    .getByText(cat)
    .locator("xpath=ancestor::*[contains(@class,'mantine-Card-root')]")
    .getByRole("link", { name: "追跡設定" })
    .click();
  await expect(page.getByText(`${cat} の追跡設定`)).toBeVisible();

  // confirm を受理して category 単位へ
  page.on("dialog", (d) => d.accept());
  await page.getByText("カテゴリ単位（銘柄横断）").click();

  // category-scope の通知設定が表示される
  await expect(page.getByText("このカテゴリの通知")).toBeVisible();
});

import { test, expect } from "@playwright/test";

// Phase 0 のスモーク: トップが開き、ボトムタブ5が見えること。
test("トップが開きボトムタブ5が表示される", async ({ page }) => {
  await page.goto("/");

  const nav = page.getByRole("navigation", { name: "メインナビゲーション" });
  await expect(nav).toBeVisible();

  for (const label of ["ホーム", "商品", "検索", "通知", "設定"]) {
    await expect(nav.getByRole("link", { name: label })).toBeVisible();
  }
});

test("商品タブに遷移できる", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "商品" }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole("heading", { name: "商品" })).toBeVisible();
});

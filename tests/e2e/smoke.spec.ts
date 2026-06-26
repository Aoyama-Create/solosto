import { test, expect } from "@playwright/test";

// Phase 1 以降、未ログインで保護パスを開くと /signin にリダイレクトされる（COM-001）。
test("未ログインで / を開くと /signin にリダイレクト", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
});

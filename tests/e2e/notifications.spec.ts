import { test, expect } from "@playwright/test";

// Phase 5a: 設定画面の通知セクション（SCR-003）が表示されることの最小確認。
// 実際の Push 許可・購読・配信はブラウザ/プッシュサービス依存のため対象外（手動検証）。

function uniqueEmail() {
  return `e2e_notif_${process.pid}_${Date.now()}@solosto.local`;
}

test("設定に通知セクションが表示される", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(uniqueEmail());
  await page.getByLabel("パスワード").fill("password");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("navigation").getByRole("link", { name: "設定" }).click();
  await expect(page).toHaveURL(/\/settings$/);

  // 通知セクションの見出しと説明が出る。
  await expect(page.getByRole("heading", { name: "通知" })).toBeVisible();
  await expect(page.getByText("そろそろ切れそう", { exact: false })).toBeVisible();
});

import { test, expect } from "@playwright/test";

// Phase 6a: 通知センター（SCR-040・ローカル実行・要 Supabase）。
// 新規ユーザーは通知ゼロ → 空状態。自動で通知を作るのは 6b バッチなので、ここは描画と空状態の最小確認。

function uniqueEmail() {
  return `e2e_notifc_${process.pid}_${Date.now()}@solosto.local`;
}

test("通知センターが空状態を表示する", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(uniqueEmail());
  await page.getByLabel("パスワード").fill("password");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("navigation").getByRole("link", { name: "通知" }).click();
  await expect(page).toHaveURL(/\/notifications$/);

  await expect(page.getByRole("heading", { name: "通知" })).toBeVisible();
  await expect(page.getByText("通知はまだありません。")).toBeVisible();
});

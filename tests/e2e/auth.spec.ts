import { test, expect } from "@playwright/test";

// 認証フロー（ローカル実行。要 Supabase 起動）。
// 一意な email で毎回サインアップ → トップ（ボトムタブ）→ ログアウト → /signin。

function uniqueEmail() {
  // テスト間で衝突しないよう日時＋乱数（プロセス pid）で一意化。
  return `e2e_${process.pid}_${Date.now()}@solosto.local`;
}

test("サインアップ → トップ表示 → ログアウト", async ({ page }) => {
  await page.goto("/signup");

  await page.getByLabel("メールアドレス").fill(uniqueEmail());
  await page.getByLabel("パスワード").fill("password");
  await page.getByRole("button", { name: "登録する" }).click();

  // トップへ遷移し、ボトムタブが見える。
  await expect(page).toHaveURL(/\/$/);
  const nav = page.getByRole("navigation", { name: "メインナビゲーション" });
  await expect(nav).toBeVisible();
  for (const label of ["ホーム", "商品", "検索", "通知", "設定"]) {
    await expect(nav.getByRole("link", { name: label })).toBeVisible();
  }

  // 設定 → ログアウト。
  await nav.getByRole("link", { name: "設定" }).click();
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page).toHaveURL(/\/signin$/);
});

test("ログイン済みで /signin を開くと / に弾かれる", async ({ page }) => {
  // 先にサインアップしてセッションを作る。
  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(uniqueEmail());
  await page.getByLabel("パスワード").fill("password");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/signin");
  await expect(page).toHaveURL(/\/$/);
});

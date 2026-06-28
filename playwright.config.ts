import { defineConfig, devices } from "@playwright/test";

// E2E はローカル実行（初回は `pnpm exec playwright install`）。CI には当面載せない。
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  // E2E は本番ビルドに対して実行する。dev のルート単位コンパイル/ハイドレーション遅延で
  // 「ハイドレーション前クリック→送信が無反応」になる不安定さを避けるため（ローカル実行）。
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

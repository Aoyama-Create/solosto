---
created: 2026-06-22
tags: [principle/local-setup, onboarding]
source:
confidence: low   # low | medium | high（scaffold前のため暫定。確定したら上げる）
---

# ローカル環境構築・テストデータ準備（新規参画者はまずここ）

> **状態: scaffold前の暫定版。** まだアプリの実コードが無いため、確定しているのは前提と方針のみ。
> 具体コマンド・接続情報は `[要確認]` で列挙し、別プランの scaffold 完了時に実値へ置き換える。
> ここは「暗黙知の集約点」。詰まって解決したことは必ずこのファイルに追記する。

## 0. 前提（確定）
- パッケージマネージャ: **pnpm**
- 言語/FW: TypeScript / Next.js 15（App Router）/ Mantine v7
- バックエンド: Supabase（Auth / DB / Storage）+ Next.js Server Actions
- テスト: Vitest（ロジック）/ Playwright（E2E）
- 通知: web-push（Node.js Runtime）+ Vercel Cron

## 1. 必要なツール
- Node.js（バージョンは `[要確認]` — scaffold時に `.nvmrc` / `engines` で固定）
- pnpm（`npm i -g pnpm` 等）
- Supabase CLI（ローカルDB起動・マイグレーション用）
- Docker（Supabaseローカルが内部で使用）

## 2. セットアップ手順
1. 依存インストール: `pnpm install`
2. 環境変数: `.env.local` を用意（下記「環境変数」参照）
3. Supabaseローカル起動: `[要確認]`（例 `pnpm supabase start`。出力される anon key / service_role key / DB URL を `.env.local` へ）
4. マイグレーション適用: `[要確認]`（例 `pnpm supabase db reset` または `pnpm supabase migration up`）
5. 型生成: `[要確認]`（例 `pnpm supabase gen types typescript --local > lib/supabase/database.types.ts`）
6. VAPID鍵生成（初回のみ・以後固定）: `npx web-push generate-vapid-keys` → 公開鍵/秘密鍵を `.env.local` へ
7. 開発サーバ: `[要確認]`（例 `pnpm dev`）

## 3. 環境変数（.env.local）
| キー | 用途 | 備考 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 接続 | ローカルは start 出力値 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | クライアント側 | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | バッチ/サーバ側 | 秘匿。クライアントへ出さない |
| `VAPID_PUBLIC_KEY` | Push購読登録 | フロントへ公開可 |
| `VAPID_PRIVATE_KEY` | Push送信署名 | 秘匿。本番はVercel環境変数 |
| `CRON_SECRET` | Cronエンドポイント保護 | 秘匿 |

> VAPID鍵は一度生成したら固定（変更すると全購読が無効化される）。詳細は [[decisions/2026-06-22-pull-first-notification-reliability]]。

## 4. テストデータ準備（シーダー）
- `[要確認]` シーダーの仕組み（`supabase/seed.sql` か スクリプトか）は scaffold時に決定。
- 最低限ほしい初期データ: 1ユーザー + 自動生成グループ、カテゴリ数件、recurring/spot 各数件、purchase_logs を2件以上持つ商品（サイクル確定の確認用）。
- ★v2.1: `tracking_scope=category` のカテゴリ（例「赤ワイン」）＋ **異なる brand を持つ purchase_logs を2件以上**（例 MAPU→OSCO）。銘柄横断でカテゴリ単位サイクルが確定することの確認用。`tracking_scope=product` のカテゴリ（例「コスメ」）も両系統テスト用に用意。

## 5. 品質ゲート（lint / 型 / format）
- **`pnpm check`** = `prettier --check .` + `eslint .` + `tsc --noEmit`（コード変更タスクの完了前に必ず通す。非破壊）。
- 修正: 整形 `pnpm format` / lint `pnpm lint --fix` / 型は手修正。
- 二段構え: ①ローカルは Claude Code の Stop フック（`scripts/claude-stop-check.sh`）が自動実行、②CI（`.github/workflows/ci.yml`）が push/PR で再検証。詳細は `code-check` スキル。
- scaffold前は package.json 未整備のためフックは no-op。Phase 0 で `check` script を入れると自動有効化。

## 6. テスト実行
- ユニット（Vitest）: `[要確認]`（例 `pnpm test`）
- E2E（Playwright）: `[要確認]`（例 `pnpm test:e2e`。初回 `pnpm playwright install`）

## 7. つまずきメモ（随時追記）
- （まだなし。scaffold以降、ハマった点と解決をここに足していく）

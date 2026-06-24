---
created: 2026-06-22
tags: [principle/local-setup, onboarding]
source:
confidence: medium # Phase 0 scaffold 済みで実値化。auth連携シードのみ Phase 1 待ち
---

# ローカル環境構築・テストデータ準備（新規参画者はまずここ）

> Phase 0（基盤）完了済み。これだけ読めば起動できる。詰まって解決したことは必ず「つまずきメモ」に追記する。

## 0. 前提（確定）

- パッケージマネージャ: **pnpm**（corepack 経由。`corepack enable pnpm`）
- 言語/FW: TypeScript / Next.js 15（App Router）/ React 18.3（Mantine v7 互換のためピン）/ Mantine v7
- バックエンド: Supabase（ローカル CLI+Docker）+ Next.js Server Actions
- テスト: Vitest（ロジック）/ Playwright（E2E）
- 通知: web-push（Node.js Runtime）+ Vercel Cron（Phase 5/6）

## 1. 必要なツール

- Node.js **20**（`.nvmrc` / `engines` で固定。`nvm use`）
- pnpm（`corepack enable pnpm`）
- Docker（Supabase ローカルが内部で使用。起動しておく）
- Supabase CLI は devDependency 同梱（`pnpm supabase ...` で実行。別途インストール不要）

## 2. セットアップ手順

```bash
pnpm install
pnpm supabase start                 # Docker。初回はイメージ取得で数分
pnpm supabase status -o env         # 出力の ANON_KEY / SERVICE_ROLE_KEY / API_URL を .env.local へ
# .env.local を用意（下記「環境変数」。VAPID は `npx web-push generate-vapid-keys` で一度だけ生成）
pnpm supabase db reset              # マイグレーション(+seed)適用
pnpm supabase gen types typescript --local > lib/supabase/database.types.ts
pnpm dev                            # http://localhost:3000
```

## 3. 環境変数（.env.local）

`.env.example` をコピーして作る。`.env.local` は gitignore 済み。

| キー                            | 用途             | 備考                                |
| ------------------------------- | ---------------- | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase 接続    | ローカルは `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | クライアント側   | `supabase status -o env` の ANON_KEY |
| `SUPABASE_SERVICE_ROLE_KEY`     | バッチ/サーバ側  | 秘匿。クライアントへ出さない        |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`  | Push購読登録     | フロントへ公開可                    |
| `VAPID_PRIVATE_KEY`             | Push送信署名     | 秘匿。本番は Vercel 環境変数         |
| `CRON_SECRET`                   | Cron保護         | 秘匿                                |

> VAPID鍵は一度生成したら固定（変更すると全購読が無効化）。詳細は [[decisions/2026-06-22-pull-first-notification-reliability]]。

## 4. テストデータ準備（シーダー）

- 仕組み: `supabase/seed.sql`（`pnpm supabase db reset` 時に流れる）。現状は**骨子のみ**。
- `[要確認]` **auth ユーザー紐付け（profiles 連携）は Phase 1 で実装**（profiles は auth.users への FK のため、サインアップ/グループ自動生成 COM-002 と一緒に投入する）。
- 投入したい確認データ（Phase 1 で有効化）: コスメ（tracking_scope=product）と赤ワイン（tracking_scope=category）、recurring/spot 各数件、purchase_logs を2件以上。★v2.1: 赤ワインは銘柄違い（brand: MAPU→OSCO）でカテゴリ単位サイクル確定を確認。

## 5. 品質ゲート（lint / 型 / format）

- **`pnpm check`** = `prettier --check .` + `eslint .` + `tsc --noEmit`（コード変更タスクの完了前に必ず通す。非破壊）。
- 修正: 整形 `pnpm format` / lint `pnpm lint --fix` / 型は手修正。
- 二段構え: ①ローカルは Claude Code の Stop フック（`scripts/claude-stop-check.sh`）が自動実行、②CI（`.github/workflows/ci.yml`）が push/PR で再検証。詳細は `code-check` スキル。

## 6. テスト実行

- ユニット（Vitest）: `pnpm test`（`pnpm test:watch` でウォッチ）
- E2E（Playwright）: 初回 `pnpm exec playwright install`、以降 `pnpm test:e2e`（dev サーバは自動起動）

## 7. つまずきメモ（随時追記）

- **supabase-js のバージョンピン**: `@supabase/supabase-js` は **2.45.4 に固定**。2.108 系は新しい typed-query エンジンが生成型に `__InternalSupabase` プロパティを要求し、Supabase CLI 2.107 が出力する型と噛み合わず、`.select()` が `never` に化ける。CLI が新フォーマットを出すようになったら supabase-js を上げて再生成する。
- pnpm が無い場合は `corepack enable pnpm`（Node 20 同梱の corepack でシムが入る）。

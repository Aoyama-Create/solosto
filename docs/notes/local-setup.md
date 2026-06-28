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
- 通知: web-push（Node.js Runtime）+ 毎時 `/api/cron`（本番トリガは GitHub Actions or Vercel Cron。[deploy.md](deploy.md)）（Phase 5/6）

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
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`  | Push購読登録(5a) | フロントへ公開可。subscribe で使用  |
| `VAPID_PRIVATE_KEY`             | Push送信署名(5b) | 秘匿。本番は Vercel 環境変数         |
| `VAPID_SUBJECT`                 | Push送信(5b)     | `mailto:あなた@example.com`         |
| `CRON_SECRET`                   | Cron保護         | 秘匿                                |

> VAPID鍵は一度生成したら固定（変更すると全購読が無効化）。詳細は [[decisions/2026-06-22-pull-first-notification-reliability]]。
> **生成（一度だけ）**: `npx web-push generate-vapid-keys` → 出力の Public/Private を上記へ。`VAPID_SUBJECT` は連絡先 mailto。
> Phase 5a は **公開鍵のみ**使用（購読登録）。秘密鍵/Subject は 5b の送信で使う。
> Push の手動確認（5a）: PWA を localhost で開き設定→通知ON→ DevTools `Application > Service Workers` の **Push** に `{"title":"テスト","body":"届いた","badgeCount":3}` を送ると通知＋App バッジが出る。
> Push 送信の手動確認（5b・要 VAPID 3鍵）: 通知ON端末で設定→「**テスト通知を送る**」→ サーバから実際に届き、バッジに買うべき件数が出る。DevTools で購読解除してから送ると失効行が掃除されデバイス数が減る（COM-042）。
> 通知バッチの手動実行（6b・Cron）: `pnpm dev` 起動後、`curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron`（`--env-file=.env.local` の値を使う）。秘密無し/不一致は 401。発火対象がいれば notifications に積まれサマリ JSON を返す。本番は GitHub Actions（Hobby）or Vercel Cron（Pro）が毎時叩く（[deploy.md](deploy.md) §5.5）。`notify_time` を現在時刻(JST)の時に合わせると発火する。
> 失効告知の手動確認（7a）: 通知ON後、DB で当該 push_subscriptions 行を削除→設定を開くと「通知が止まっています」＋再開ボタン。設定にデバイス一覧（ラベル/最終受信/このデバイス）が出る。
> PWA オンボの手動確認（7a）: iOS Safari で非standalone（ブラウザタブ）だと「ホーム画面に追加」バナー表示→「閉じる」で消え再表示なし（localStorage）。ホーム追加後（standalone）や非iOS では出ない。

## 4. テストデータ準備（シーダー）

- **`pnpm seed`**（= `node --env-file=.env.local scripts/seed-dev.mjs`）。service_role でテストユーザーを作成し（→ トリガーが group+profile 自動生成）、カテゴリ/商品/購入ログを投入。**冪等**（同 email を削除して作り直す）。要 Supabase 起動。
  - ログイン: `test@solosto.local` / `password`。
  - データ: コスメ（tracking_scope=product）と赤ワイン（tracking_scope=category）と日用品、recurring/spot、purchase_logs。★v2.1: 赤ワインは銘柄違い（brand: MAPU→OSCO）でカテゴリ単位サイクル確定を確認。
- `supabase/seed.sql`（`db reset` 時に流れる）は骨子コメントのみ。実データは `pnpm seed` を使う（auth admin が必要なため SQL シードでは作らない）。

## 5. 品質ゲート（lint / 型 / format）

- **`pnpm check`** = `prettier --check .` + `eslint .` + `tsc --noEmit`（コード変更タスクの完了前に必ず通す。非破壊）。
- 修正: 整形 `pnpm format` / lint `pnpm lint --fix` / 型は手修正。
- 二段構え: ①ローカルは Claude Code の Stop フック（`scripts/claude-stop-check.sh`）が自動実行、②CI（`.github/workflows/ci.yml`）が push/PR で再検証。詳細は `code-check` スキル。

## 6. テスト実行

- ユニット（Vitest）: `pnpm test`（`pnpm test:watch` でウォッチ）。include は `lib/**` と `components/**` の `*.test.ts(x)`。
- E2E（Playwright）: 初回 `pnpm exec playwright install`（WebKit 必須）。以降 `pnpm test:e2e`。
  - **本番ビルドに対して実行**（webServer=`pnpm build && pnpm start`）。理由: `pnpm dev` のルート単位コンパイルでハイドレーションが遅れ、「ハイドレーション前に送信ボタンを押す→無反応で /signup に留まる」不安定が出るため。本番ビルドなら高速・安定（並列5 workers で全12本 ~30s）。
  - 全12本を短時間で繰り返すと signup 回数が増える → `supabase/config.toml` の `[auth.rate_limit] sign_in_sign_ups` を緩和済み（ローカルのみ）。変更後は `pnpm supabase stop && start` で反映。

## 7. つまずきメモ（随時追記）

- **supabase-js のバージョンピン**: `@supabase/supabase-js` は **2.45.4 に固定**。2.108 系は新しい typed-query エンジンが生成型に `__InternalSupabase` プロパティを要求し、Supabase CLI 2.107 が出力する型と噛み合わず、`.select()` が `never` に化ける。CLI が新フォーマットを出すようになったら supabase-js を上げて再生成する。
- pnpm が無い場合は `corepack enable pnpm`（Node 20 同梱の corepack でシムが入る）。
- **RLS の手前に GRANT が要る**: 生 SQL マイグレーションで作ったテーブルは、API ロール（authenticated/service_role）に DML 権限が**自動付与されない**。`pnpm seed` や認証ユーザーのクエリが `permission denied for table ...` で落ちる。→ `supabase/migrations/*_grants.sql` で `grant select,insert,update,delete ... to authenticated, service_role`（+ `alter default privileges`）を付与する。RLS は行レベルの可視範囲を引き続き支配（[[decisions/2026-06-25-group-bootstrap-via-trigger]] 補足）。
- **Next.js が workspace root を誤検出**: ホームに `~/package-lock.json` があると dev 起動時に警告が出る（動作はする）。気になれば `next.config.ts` の `outputFileTracingRoot` を設定。
- **コマンド自動承認（`.claude/settings.json`）**: `permissions.allow` のルールにマッチすると承認なしで実行される。ただし **パイプ/連結したコマンドは全サブコマンドが allow に載っていないと承認プロンプトが出る**（例 `pnpm ... | tail` は `tail` も必要）。そのため `tail/head/awk/sed/wc/echo/printf/docker/psql/curl/…` 等の補助コマンドを allow に追加済み。`deny`（`git push`・`rm -rf`・リモート Supabase・`.env` 読取）は維持。設定変更が効かない場合は `/config` を一度開くか再起動でリロード。

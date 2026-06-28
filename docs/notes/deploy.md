# 本番デプロイ手順（Vercel ＋ Supabase Cloud）

solosto を本番公開するための runbook。**コマンド／開くページ／入力項目**まで具体的に書く。
対象構成は **Vercel（Next.js ホスティング）＋ Supabase Cloud（Postgres/Auth/RLS）＋ 毎時バッチtrigger（Hobby=GitHub Actions / Pro=Vercel Cron）**。

> ⚠️ **Neon 等の「DBだけ」サービスは不可**。本アプリは Supabase の Auth・RLS・supabase-js に依存（`@supabase/ssr` / `supabase.auth.*` / `current_group_id()` RLS / `service_role`）。バックエンドは Supabase を使う。

---

## 0. 事前準備（アカウント）
- GitHub アカウント（リポジトリを push 済みであること）。
- [Supabase](https://supabase.com) アカウント。
- [Vercel](https://vercel.com) アカウント。
- ローカルに Supabase CLI（`pnpm supabase` 経由で可）、Node 20 / pnpm。

> ⚠️ **通知バッチ（毎時）の動かし方**: 本アプリは「毎時 Cron＋ユーザーごとの `notify_time` 一致」で通知する。**日1回では成立しない**（特定時刻のユーザーにしか飛ばない）。
> - **採用＝Vercel Hobby（無料）＋ 外部スケジューラ**: Vercel の Cron は使わず（Hobby は毎時不可）、GitHub Actions（`.github/workflows/notify-cron.yml`）から毎時 `GET /api/cron` を叩く。→ 手順 5.5 を参照。
> - 代替＝**Vercel Pro**: `vercel.json` に `crons` を戻せば Vercel 内で毎時実行できる（有料）。下記「Pro の場合」参照。

---

## 1. Supabase Cloud プロジェクト作成
1. https://supabase.com/dashboard → **New project**。
2. 入力: **Name**=`solosto`、**Database Password**（強固なものを生成しメモ）、**Region**=`Northeast Asia (Tokyo)` 推奨。
3. **Create new project**（数分待つ）。
4. 作成後、**Project Settings → General** の **Project ID**（＝ Reference ID / project-ref。`abcd...`）を控える。

## 2. キー類を取得
> ⚠️ ダッシュボードの構成は変わる。下記いずれかで取得（**Connect ボタンが最短**）。

> 🔑 **キーは「Legacy（JWT）キー」を使う**。本アプリは `@supabase/supabase-js@2.45.4` / `@supabase/ssr@0.5.2` に固定で、env 名も `*_ANON_KEY` / `*_SERVICE_ROLE_KEY`。
> 新方式キー（`sb_publishable_...` / `sb_secret_...`）は未検証なので避け、**`eyJ...` で始まる JWT** を使うこと。

**(A) URL**: Connect ボタンの **Frameworks** タブ、または **Settings → Data API → Project URL**、または `https://<Project ID>.supabase.co`。
- → `NEXT_PUBLIC_SUPABASE_URL`

**(B) キー（Legacy / JWT）**: **Settings（歯車）→ API Keys → 「Legacy API keys」**
- **`anon` `public`**（`eyJ...`）→ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **`service_role` `secret`**（`eyJ...`）→ `SUPABASE_SERVICE_ROLE_KEY`（**秘匿**）
- ※ Frameworks タブに出る `sb_publishable_...` は**使わない**（新方式キー）。「Legacy API keys」が折りたたみ/無効なら展開・有効化する。

## 3. マイグレーション（スキーマ/RLS/トリガー）を本番へ適用
ローカルのリポジトリで実行（`supabase/migrations/` の3本＝init_schema・auth_bootstrap・grants を本番に流す）:
```bash
pnpm supabase login                       # ブラウザでトークン認証
pnpm supabase link --project-ref <Project ID>   # 手順1で控えた値（=Reference ID）。DBパスワードを聞かれる
pnpm supabase db push                     # migrations を本番DBへ適用
```
適用確認（Supabase ダッシュボード）:
- **Table Editor**: `groups/profiles/categories/products/purchase_logs/push_subscriptions/notifications` がある。
- **Database → Roles/Policies**（または Authentication → Policies）: 各テーブルに RLS ポリシーが有効。
- **Database → Functions**: `current_group_id` / `handle_new_user` がある（新規ユーザーで group+profile 自動生成のトリガー）。

> シーダー（`pnpm seed`）は**ローカル専用**。本番は実ユーザーのサインアップで自動的に group/profile が作られる（トリガー）。

## 4. VAPID 鍵と CRON_SECRET を生成（一度だけ）
```bash
npx web-push generate-vapid-keys          # Public Key / Private Key が出力される
```
- 出力の **Public Key** → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- 出力の **Private Key** → `VAPID_PRIVATE_KEY`（秘匿）
- `VAPID_SUBJECT` → `mailto:あなたの連絡先@example.com`
- `CRON_SECRET` → ランダム文字列を生成（例 `openssl rand -hex 32`）。Cron 認証用（秘匿）。

> ⚠️ **VAPID 鍵は固定**。後で変えると既存の全 Push 購読が無効化される（[[pull-first-notification-reliability]]）。

## 5. Vercel プロジェクト作成 & 環境変数
1. https://vercel.com/new → **Import Git Repository** で solosto のリポジトリを選択 → **Import**。
2. **Framework Preset**=Next.js（自動）。**Build/Output 設定は既定のまま**（`next build`）。
3. **Environment Variables** に以下を**すべて**追加（Environment は **Production**＋必要なら Preview）:

| Key | 値 | 由来 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | 手順2 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public | 手順2 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret | 手順2（秘匿） |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID Public | 手順4 |
| `VAPID_PRIVATE_KEY` | VAPID Private | 手順4（秘匿） |
| `VAPID_SUBJECT` | `mailto:...` | 手順4 |
| `CRON_SECRET` | ランダム文字列 | 手順4（秘匿） |

4. **Deploy** を押す。ビルド完了で本番 URL（`https://solosto-xxx.vercel.app`）が発行される。

> Hobby（無料）では `vercel.json` に毎時 `crons` があるとデプロイがブロックされる（毎時は Pro 限定）。本リポジトリは **`vercel.json` を置かず**、通知の毎時実行は次の手順 5.5（GitHub Actions）で行う。

## 5.5 通知バッチの毎時実行（Hobby＝GitHub Actions 外部スケジューラ）
本リポジトリには `.github/workflows/notify-cron.yml`（毎時 `GET /api/cron` を Bearer 付きで叩く）を同梱済み。**GitHub の Repository secrets を2つ登録**するだけで有効になる。
1. GitHub のリポジトリ → **Settings → Secrets and variables → Actions → New repository secret**。
2. 追加:
   - **`APP_URL`** = 本番URL（例 `https://solosto-xxx.vercel.app`、末尾スラッシュ無し）。
   - **`CRON_SECRET`** = 手順4で生成した値（Vercel env と**同じ文字列**）。
3. **Actions** タブ → `notify-cron` → **Run workflow**（手動）で疎通確認。緑ならOK（`curl -f` なので 401/500 は赤）。以降は毎時自動実行。

> GitHub の `schedule` は数分遅延・まれにスキップあり。本アプリは「時」粒度で `notify_time` を判定するため、同じ時内に発火すれば問題ない。より厳密にしたいなら [cron-job.org](https://cron-job.org) 等から同じ URL/ヘッダで毎時叩く運用でも可。

### Pro の場合（任意・代替）
Vercel Pro なら外部スケジューラ不要。リポジトリ直下に `vercel.json` を作成して再デプロイ:
```json
{ "crons": [{ "path": "/api/cron", "schedule": "0 * * * *" }] }
```
Vercel が毎時 `Authorization: Bearer $CRON_SECRET` 付きで自動実行する（GitHub Actions 側は無効化してよい）。

## 6. Supabase の本番 URL 許可（Auth リダイレクト）
Supabase ダッシュボード **Authentication → URL Configuration**:
- **Site URL** に本番 URL（`https://solosto-xxx.vercel.app`）を設定。
- メール確認を使う場合は **Redirect URLs** にも追加（本アプリはメール/パスワードのみ。確認メールを使わない設定なら不要）。

## 7. 本番スモーク（手動確認）
1. 本番 URL を **iPhone Safari** で開く → **共有 → ホーム画面に追加**（PWA 化。InstallGuide バナーも出る）。
2. サインアップ → ログイン → 商品を1つ登録 → トップ（買うもの）に出る。
3. **設定 → 通知をオンにする**（許可）→ **テスト通知を送る** → 端末に通知が届き、App バッジが付く。
4. Cron 動作確認（手動トリガー）:
   ```bash
   curl -i -H "Authorization: Bearer <CRON_SECRET>" https://<本番URL>/api/cron
   # 秘密無し/誤りは 401、正しければ 200 + サマリ JSON（candidates/notified/sent/expired/cleaned）
   ```
   `notify_time` を現在時刻(各ユーザーTZ)に合わせ、期日到来の商品があると通知が積まれる。

## 8. 更新フロー（2回目以降）
- **コード変更**: `git push` → Vercel が自動で再ビルド/再デプロイ。
- **スキーマ変更**: `supabase/migrations/` に追加 → `pnpm supabase db push`（本番DBへ）→ 必要なら `pnpm supabase gen types ...` で型更新。
- 環境変数を変えたら Vercel で **Redeploy**（env はビルド時に焼き込まれる `NEXT_PUBLIC_*` があるため）。

## 9. 注意点 / ハマりどころ
- **`@supabase/supabase-js` は `2.45.4` 固定**。安易な更新で型生成（`.select()`）が壊れた経緯あり（[local-setup.md](local-setup.md) つまずきメモ参照）。Supabase CLI も不用意に上げない。
- **service_role / VAPID Private / CRON_SECRET はコミットしない**（Vercel の env のみ）。`.env.local` は gitignore 済み。
- **Supabase 無料枠の7日休眠**: 毎時 Cron＋クリーンアップが定期的に DB を触るため自然と回避（[システム定義書 §367](../references/v2.1/システム定義書_v2.md)）。Cron を外部運用にする場合も毎時叩けば同様。
- **RLS の二重防御**は本番でも前提。アプリ層ガード（COM-001/102）＋ RLS の両方が効いていること。
- 関連: [local-setup.md](local-setup.md)（ローカル開発）/ [[single-source-of-truth]]。

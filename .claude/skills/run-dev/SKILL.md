---
name: run-dev
description: solosto をローカルで起動する手順（Supabaseローカル + pnpm dev + 環境変数確認）。動作確認や画面の確認をするときに使う。
---

# ローカル起動

> 詳細・環境変数は [docs/notes/local-setup.md](../../../docs/notes/local-setup.md)。Docker を起動しておくこと。

## 手順
```bash
pnpm install
pnpm supabase start          # ローカルDB起動（出力の anon/service_role key, DB URL を .env.local へ）
pnpm supabase db reset       # マイグレーション + seed 適用
pnpm dev                     # 開発サーバ http://localhost:3000
```

## 環境変数（.env.local）が揃っているか確認
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（秘匿）
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`（初回 `npx web-push generate-vapid-keys` で生成し固定）
- `CRON_SECRET`

## メモ
- PWA / Push は iPhone Safari が本番想定。ローカルの Push 挙動は限定的。
- つまずいたら解決を [docs/notes/local-setup.md](../../../docs/notes/local-setup.md) の「つまずきメモ」に追記する。

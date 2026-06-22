---
name: db-migrate
description: Supabaseのマイグレーション作成・適用・型生成・リセットの運用手順。スキーマ変更やRLS追加を行うときに使う。
---

# Supabase マイグレーション運用

> ⚠️ scaffold前のため一部コマンドは暫定。`supabase/` 構成が確定したら実値に更新する。

## 新規マイグレーション作成
```bash
pnpm supabase migration new <kebab_name>
# supabase/migrations/<timestamp>_<kebab_name>.sql が生成される。ここにSQLを書く。
```

## ローカル適用 / リセット
```bash
pnpm supabase start          # ローカルSupabase起動（要Docker）
pnpm supabase db reset       # 全マイグレーション + seed を再適用（ローカルのみ）
```

## 型生成（スキーマ変更後は必須）
```bash
pnpm supabase gen types typescript --local > lib/supabase/database.types.ts
```

## 守ること
- RLS を必ず有効化し、group_id 単位の自分のデータのみアクセス可にする（[supabase-schema] エージェント参照）。
- **派生値（底値・平均・参考サイクル）の専用カラムを作らない**（都度集計）。
- `supabase db push`（リモート反映）/ `--linked reset` は settings で deny。本番反映は人間が明示的に行う。
- スキーマに設計判断が伴ったら `docs/decisions/` に ADR を追加（CLAUDE.md 知識層ルール）。

## 参照
- [docs/システム定義書_v2.md 3章](../../../docs/references/v2.1/システム定義書_v2.md)

---
created: 2026-06-23
status: accepted   # proposed | accepted | superseded
tags: [decision, data-model, schema]
supersedes:
superseded_by:
---

# products.current_cycle_days（旧来の参考値）は持たない

## ステータス
accepted

## コンテキスト / 背景
v2.1 システム定義書 3章の products 定義には `current_cycle_days (INT) ← 旧来の参考値（per_unit換算で再計算）` が
残っている。一方、同設計の核となる方針は「真実の源は購入記録／派生・参考の自動サイクル値は専用カラムを持たず
purchase_logs から都度集計」（[[decisions/2026-06-22-derived-values-aggregate-on-read]] / [[single-source-of-truth]]）。
Phase 0 の初回マイグレーションで、このレガシー列を作るか判断が必要になった。

## 決定
**`current_cycle_days` 列は作らない**。
- 判定・通知に使う確定値は `per_unit_cycle_days`（manual時は固定、auto時は購入毎に再計算）と `next_order_date` に一本化。
- 参考用の自動サイクル値（「約45日」等の表示）は purchase_logs から都度集計して算出する（専用カラムを持たない）。

## 却下した代替案
- **仕様表に合わせて current_cycle_days 列を追加** → 却下。spec 自身が「旧来の参考値（per_unit換算で再計算）」と注記する派生値であり、専用カラム化は「派生値を持たない」不変条件・supabase-schema エージェントの方針に反する。二重持ちの不整合源になる。

## トレードオフ / 結果
- 得たもの: スキーマが不変条件と一致。参考サイクルは常に最新の購入記録から導出され、ズレない。
- 失ったもの: 仕様表の列挙との 1:1 一致（ただし spec は legacy と明示しており、実質的な乖離はない）。表示用の参考値は集計コストがかかるが個人用規模では誤差。

## 蒸留した原則
- [[single-source-of-truth]]（既存原則の再適用。新規ノートは作らない）

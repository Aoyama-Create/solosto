---
created: 2026-06-26
status: accepted   # proposed | accepted | superseded
tags: [decision, domain-logic, cycle, tracking-scope]
supersedes:
superseded_by:
---

# category-scope のサイクルはログから auto 集計し、category の手動サイクルは持たない

## ステータス
accepted

## コンテキスト / 背景
Phase 3b で category-scope（銘柄横断）のサイクルを実装。category 追跡では、配下の全銘柄ログから
カテゴリ単位の next_order_date を算出する。しかし `categories` テーブルには
`per_unit_cycle_days` 列が無い（Phase 0 設計＝「サイクルは専用カラムを持たず集計導出」）。
`categories.cycle_mode`（auto/manual）は列としてあるが、manual 時に固定する per_unit の保存先が無い。

## 決定
**category-scope のサイクルは常にログから auto セマンティクスで算出**し、`categories.next_order_date` と
`categories.status` に保存する（next_order_date は判定/表示用のキャッシュ。per_unit は保存しない）。
- `recomputeCategoryCycle` は `computeCycleOnPurchase({ type:'recurring', cycleMode:'auto', ... })` を使う。
- `categories.cycle_mode='manual'` は 3b では**サイクル算出に反映しない**（保存先が無いため）。SCR-015 のサイクル UI は当面 auto 前提。

## 却下した代替案
- **categories に per_unit_cycle_days 列を追加して manual を持つ** → 却下（今は）。「サイクルは専用カラムを持たず集計導出」の不変条件・既存設計を崩す。category の手動サイクルは需要が薄く、必要になってからマイグレーションで追加する。
- **category も product と同じ manual ロジック** → 却下。保存先が無いまま実装すると next が null になり通知が破綻する。

## トレードオフ / 結果
- 得たもの: 銘柄横断サイクルが履歴から常に正しく導出され、専用カラムの不整合が無い（[[single-source-of-truth]]）。主用途（赤ワイン等の auto）を満たす。
- 失ったもの: category 単位の「手動サイクル固定」は未対応（将来 per_unit 列＋RPC で対応余地）。SCR-015 の manual トグルは product scope ほど効かない。

## 関連
- [[decisions/2026-06-22-tracking-scope-category-cycle]] / [[decisions/2026-06-26-next-order-date-uses-purchase-date]] / [[single-source-of-truth]]。

---
created: 2026-06-22
tags: [principle/data-model, portable]
source: "[[decisions/2026-06-22-derived-values-aggregate-on-read]] / [[decisions/2026-06-22-per-unit-cycle-calculation]] / [[decisions/2026-06-22-tracking-scope-category-cycle]]"
confidence: high   # low | medium | high（複数経験で裏付くほど上げる。3 ADRで裏付け）
---

# 派生値は保持せず、単一の真実源からクエリで導く

## 主張
一般に、ある事実から計算で求まる値（合計・最小・平均・最新比など）は、それ自身をカラムやキャッシュとして
二重に保持しない。**真実の源を1つに定め、派生値はその源から読むたびに導く**。書き込み箇所が増えるほど
「更新し忘れ」による静かな不整合の確率が上がるため、書き込み箇所をひとつに絞ることが整合性を守る最短路になる。

## 根拠となった経験
- [[decisions/2026-06-22-derived-values-aggregate-on-read]] で、底値・平均・参考サイクルを `purchase_logs` から都度集計に統一。キャッシュカラムだとログ削除時に再計算を忘れて不整合が残る罠を回避した。
- [[decisions/2026-06-22-per-unit-cycle-calculation]] でも「マスタ参照ではなく記録時点の値を固定保存」とし、真実の源を購入記録に寄せている（同じ引力）。
- [[decisions/2026-06-22-tracking-scope-category-cycle]]（v2.1）でも、商品⇄カテゴリの追跡切替を専用カラムなしの集計（GROUP BY変更）で実現。3つ目の裏付けで、この原則が solosto の背骨だと確認できた。

## 反例 / 例外
- [要確認] 集計コストが実測で問題になる規模では、派生値をマテリアライズドビューや明示キャッシュに持つ判断がありうる。その場合も「源は1つ・派生は再生成可能」を崩さず、再生成の責務を明示する。
- 判定の「入力」になる確定値（solosto の `next_order_date` や manual の `per_unit_cycle_days`）は派生ではなく状態。これはカラムに持ってよい。

## 関連
- [[normalize-units-before-time-series]]
- [[resilient-by-recompute-on-open]]

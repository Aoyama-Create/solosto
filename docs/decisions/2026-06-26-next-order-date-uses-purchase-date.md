---
created: 2026-06-26
status: accepted   # proposed | accepted | superseded
tags: [decision, domain-logic, cycle]
supersedes:
superseded_by:
---

# next_order_date は「今回購入日」を基準にする（ドキュメント矛盾の解消）

## ステータス
accepted

## コンテキスト / 背景
購入サイクル算出の `next_order_date` の式が、ドキュメント間で食い違っていた。
- 仕様書 2.4 / CLAUDE.md / domain-rules: `next_order_date = 前回購入日 + (per_unit_cycle_days × 今回 total_units)`
- 仕様書 5.1（運用ロジック詳細）: `next_order_date = 今回購入日 + (per_unit_cycle_days × 今回 total_units)`

Phase 3a の COM-021/010 実装にあたり、どちらを正とするか決める必要があった。

## 決定
**「今回購入日」基準（仕様書 5.1）を正とする。**
- `next_order_date = 今回購入日 + round(per_unit_cycle_days × 今回 total_units)`。
- `per_unit_cycle_days = 購入間隔(前回→今回) ÷ 前回 total_units`（これは不変）。
- CLAUDE.md 不変条件3 と `domain-rules` スキルの式を「今回購入日」へ修正した。

## 却下した代替案
- **「前回購入日」基準（2.4 / 旧 CLAUDE.md）** → 却下。論理破綻する。
  - 反証: ロットが毎回同量（今回 total_units = 前回 total_units）なら、`per_unit × 今回total = 購入間隔` となり、`next = 前回購入日 + 購入間隔 = 今回購入日`。つまり「買った瞬間に次回目安日が今日」になり、即リスト復帰してしまう。
  - 直感: いま新しいロットを買った→その消費が終わる頃が次回。起点は消費を始める「今回購入日」が自然。

## トレードオフ / 結果
- 得たもの: 式が運用ロジック（5.1）と一致し、論理的に正しい次回目安日。実装・テストの基準が一意。
- 失ったもの: なし（2.4/旧表記は誤りだったため修正は純粋な是正）。仕様書 2.4 自体は references（凍結）なので本 ADR と CLAUDE.md/skill 側で正を示す。

## 関連
- [[decisions/2026-06-22-per-unit-cycle-calculation]]（per_unit_cycle_days の定義）。
- [[normalize-units-before-time-series]]。

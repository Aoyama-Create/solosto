---
created: 2026-06-22
status: accepted   # proposed | accepted | superseded
tags: [decision, domain-logic, cycle]
supersedes:
superseded_by:
---

# 購入サイクルは個数ベース（1個あたり消費日数）で算出しロット差を吸収する

<!-- ファイル名は YYYY-MM-DD-kebab-title.md。同日複数は末尾に -2 等 -->

## ステータス
accepted

## コンテキスト / 背景
次回購入目安日を購入履歴から自動算出したい。しかし同じ商品でも購入時の入数（ロット）が違う
（3個入りを買う回もあれば12個入りを買う回もある）。購入「回数の間隔」をそのまま使うと、
大きいロットを買った直後は早く切れる予測になり、目安日がロットに振り回される。
参照: システム定義書_v2.md 2.4 / 5.1。

## 決定
**1個あたり消費日数（`per_unit_cycle_days`）を基準量とし、購入時の総個数で次回日をスケールする**。
- `per_unit_cycle_days = 購入間隔（前回→今回の日数） ÷ 前回 total_units`
- `next_order_date = 前回購入日 + (per_unit_cycle_days × 今回 total_units)`
- `total_units = pack_quantity × units_per_pack`。`units_per_pack` は記録時点の値を `purchase_logs` にコピー保存（後でマスタを変えても過去計算が狂わない）。
- 初回購入は間隔不明 → tracking に入れず idle。2回目で初めてサイクル確定。
- recurring かつ cycle_mode=auto のときのみ再計算（spot や manual では走らせない）。

## 却下した代替案
- **購入間隔（回→回の日数）をそのまま次回サイクルにする** → 却下。ロット差を吸収できず、入数が変わるたび予測が暴れる。
- **マスタの標準入数を常に参照して単価・消費を計算** → 却下。マスタ変更が過去ログの計算結果を遡って変えてしまう。記録時点の入数を固定保存すべき。

## トレードオフ / 結果
- 得たもの: ロット違いに頑健な目安日。入力は「総個数だけ」でも動く（パック分解は任意）。
- 失ったもの: 「最低2回の購入実績がないとサイクルが立たない」立ち上がりの遅さ。これは仕様として受容（初回は idle 着地）。

## 蒸留した原則
- [[normalize-units-before-time-series]]
- [[single-source-of-truth]]

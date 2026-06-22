---
created: 2026-06-22
status: accepted   # proposed | accepted | superseded
tags: [decision, domain-logic, cycle, notification]
supersedes:
superseded_by:
---

# 追跡単位（tracking_scope）でカテゴリ単位サイクルに対応する

<!-- ファイル名は YYYY-MM-DD-kebab-title.md。同日複数は末尾に -2 等 -->

## ステータス
accepted

## コンテキスト / 背景
商品単位サイクル（[[decisions/2026-06-22-per-unit-cycle-calculation]]）は「同一商品の2回目購入」で確定する。
しかし**銘柄が毎回変わる消費（赤ワインを前々回 MAPU・前回 OSCO で購入）では、消費の実体は1つ「赤ワイン」なのに
商品単位では永遠に2回目が来ず、サイクルが確定せず通知が飛ばない**。
一方コスメ（SK-II_001 / VT_001）は商品単位で繰り返し買うので商品単位が正しい。
両者が共存し、切り替えても壊れない設計が要る。v2 で「MVP対象外」としていた target_type を置き換える。
参照: システム定義書 2.10（references/v2.1）。

## 決定
**categories に `tracking_scope`（product / category, default product）を持たせ、追跡の集計粒度を選ばせる**。
- `product`: カテゴリ内を商品単位で追跡。`category`: カテゴリ全体で1つ追跡（銘柄横断）。
- **サイクル・状態(tracking/idle)は専用カラムを持たず purchase_logs から都度集計**。scope切替は「集計の GROUP BY を商品にするかカテゴリにするか」の違いだけ。購入履歴は無傷ゆえ行き来しても不整合が起きない。
- category scope では categories が商品同等の追跡属性（is_notify_enabled / notify_snoozed_until / next_order_date / cycle_mode / status）を持つ。is_notify_enabled は商品・カテゴリ両方が持ち scope で見る側が切り替わる（巻き込まない）。
- 銘柄は purchase_logs に `brand` / `purchase_url` で記録（商品名と実物のズレを起こさない。URLは履歴側が正）。買い足し時は履歴から銘柄一覧を集計提示。
- カテゴリはフラット1階層。

## 却下した代替案
- **v2 の target_type（カテゴリ→商品展開）を拡張** → 却下。通知のたびにカテゴリを商品へ展開する解決ロジックが要り、サイクル確定問題の本質（集計粒度）を解かない。
- **商品ごとの scope 上書き機構** → 却下。特殊な子は別カテゴリに分ければ足り、上書きは複雑さに見合わない。
- **階層カテゴリ** → 却下。フラット1階層（＝追跡グループ）で十分。
- **scope切替時に pending を引き継ぐ** → 却下。切替は稀イベント。引き継ぎロジックは不整合の温床。**pending はリセット**して「入れ直してください」と案内する割り切りで不整合をゼロにする。

## トレードオフ / 結果
- 得たもの: 銘柄が変わる消費でも通知が飛ぶ。product/category を集計粒度の切替だけで両立し、履歴を壊さず行き来できる。
- 失ったもの: scope切替時に pending が消える（稀イベントとして受容）。category scope時の total_units/unit_price の銘柄横断正規化（入数・単位が銘柄で異なる場合）は実装時に詰める論点として残る（[要確認]）。

## 蒸留した原則
- [[choose-aggregation-grain-late]]
- [[single-source-of-truth]]

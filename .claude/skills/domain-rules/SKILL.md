---
name: domain-rules
description: solosto のドメイン不変条件の早見表（3軸フラグ・サイクル/単価/底値の式・状態遷移表・通知発火式）。実装中に式や遷移を確認したいとき必ず参照する。
---

# ドメインルール早見表

真実は [docs/システム定義書_v2.md](../../../docs/references/v2.1/システム定義書_v2.md)。ここは実装中の即参照用。

## 3軸フラグ（独立）
| フラグ | 値 | 意味 |
|---|---|---|
| `type` | `recurring` / `spot` | 性質。**default recurring** |
| `status` | `pending` / `tracking` / `idle` | フェーズ |
| `is_notify_enabled` | true / false | 恒久ミュート |

- `notify_snoozed_until`(DATE) は一時スヌーズ。is_notify_enabled とは別物。
- **種別変更で is_notify_enabled / status を書き換えない**（横移動）。

## 計算式
```
total_units         = pack_quantity × units_per_pack        # units_per_pack は記録時点コピー
unit_price          = price ÷ total_units                   # pack_quantity で割らない
per_unit_cycle_days = 購入間隔 ÷ 前回 total_units            # recurring & cycle_mode=auto のみ
next_order_date     = 今回購入日 + (per_unit_cycle_days × 今回 total_units)   # ★今回購入日が起点（ADR 2026-06-26）
底値                = MIN(unit_price)   平均 = AVG(unit_price)   # purchase_logs から都度集計
```
- 初回購入（実績0）→ サイクル未確定 → idle。2回目で tracking 確定。
- manual: per_unit_cycle_days を手動固定。参考自動値は持たず都度集計（表示のみ）。

## 追跡単位（tracking_scope）★v2.1
| scope | 集計粒度 | 例 |
|---|---|---|
| `product`（default） | 商品ごと | コスメ（SK-II_001 と VT_001 は別サイクル） |
| `category` | カテゴリ全体（銘柄横断） | トイレ紙・赤ワイン |

- `categories.tracking_scope` が集計の GROUP BY を決める。**切替＝GROUP BY 変更だけ。専用カラム持たず purchase_logs から都度集計**（サイクル・tracking/idle）。履歴無傷で不整合ゼロ。
- category scope では categories が商品同等の追跡属性（is_notify_enabled / notify_snoozed_until / next_order_date / cycle_mode / status）を持つ。`is_notify_enabled` は商品・カテゴリ両方が持ち scope で見る側が切替（巻き込まない）。
- カテゴリはフラット1階層。銘柄は `purchase_logs.brand` / `purchase_url` に記録（URLは履歴側が正）。
- **scope切替時は pending をリセット**（引き継がない）。
- COM-016（scope分岐解決）が集計単位を出し分け、COM-021/022/050 が利用。

## 通知発火式（scope拡張版 ★v2.1）
```
[product scope] 商品ごとに:
  type = recurring
    AND 商品.is_notify_enabled = true
    AND (商品.notify_snoozed_until IS NULL OR 今日 > それ)
    AND 商品.next_order_date <= 今日
[category scope] カテゴリごとに（銘柄横断で集計）:
  カテゴリ.is_notify_enabled = true
    AND (カテゴリ.notify_snoozed_until IS NULL OR 今日 > それ)
    AND カテゴリ.next_order_date <= 今日
```
- 毎時Cron × notify_time 一致で発火。1日1通にまとめる。timezone(default Asia/Tokyo) で変換。
- COM-050 が COM-016 経由で scope を出し分けて対象抽出。

## 状態遷移（type × status）
| type | status | 意味 | 通知 |
|---|---|---|---|
| recurring | pending | リスト表示中（未購入） | 対象 |
| recurring | tracking | サイクル稼働（実績2回以上） | 対象 |
| recurring | idle | 在庫十分。next_order_date 待ち | しない |
| spot | pending | 単発をリスト投入（未購入） | しない |
| spot | idle | 買い終えて眠る（手動復帰可） | しない |
| spot | tracking | **ありえない** | — |

> ★v2.1: 上表は product scope（商品単位）の状態。category scope では**カテゴリが同型の派生状態（pending/tracking/idle）**を purchase_logs の銘柄横断集計で持つ（tracking/idle は集計導出、pending のみ明示保持）。

主な遷移:
- recurring/pending →（買った・初回）→ idle ／（買った・2回目）→ tracking
- recurring/idle →（2回目購入）→ tracking ／（next_order_date<=今日 or 手動追加）→ pending
- recurring/tracking →（買った→再計算）→ idle ／（next_order_date<=今日）→ pending
- spot/pending →（買った/引っ込める）→ idle ／（削除）→ 論理削除
- spot/idle →（手動追加）→ pending
- recurring/tracking を単発化 → 一旦 idle 着地（定期に戻せば即 tracking 復帰）
- 全状態 →（deleted_at）→ 論理削除

## 削除・リスト運用
- 削除は**論理削除（deleted_at）に統一**。spot/pending の「やめる」は「削除」か「idleに引っ込める（履歴なし）」の2択。
- recurring/pending はリストから外す操作を持たない（買うまで居座る。止めたいならスヌーズ+恒久ミュート）。

## 価格表示
- 底値+購入日 / 平均 / 直近比% を出す。**「買い時！」等の判定ラベルは出さない**（相場の物差しを渡すに留める）。

## 関連知識
- [[decisions/2026-06-22-derived-values-aggregate-on-read]] / [[decisions/2026-06-22-per-unit-cycle-calculation]] / [[decisions/2026-06-22-pull-first-notification-reliability]]
- ★v2.1: [[decisions/2026-06-22-tracking-scope-category-cycle]] / [[choose-aggregation-grain-late]]

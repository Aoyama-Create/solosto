---
created: 2026-06-22
tags: [moc]
---

# データモデルと信頼性 MOC

solosto の設計の背骨。「真実の源をひとつに保ち、不確実なものに依存しない」という一貫した引力でつながっている。

## 原則（notes/）
- [[single-source-of-truth]] — 派生値は持たず購入記録から都度導く（3 ADRで裏付け／confidence high）
- [[normalize-units-before-time-series]] — ロット差は単位正規化で吸収してから周期を測る
- [[resilient-by-recompute-on-open]] — 配信に依存せず開けば再計算
- [[choose-aggregation-grain-late]] — 生イベントは粒度非依存で記録し、集計の粒度は読み出し時に選ぶ（★v2.1）

## 関連する決定（decisions/）
- [[decisions/2026-06-22-derived-values-aggregate-on-read]] — 価格・底値・参考サイクルは都度集計
- [[decisions/2026-06-22-per-unit-cycle-calculation]] — 個数ベースのサイクル算出
- [[decisions/2026-06-22-pull-first-notification-reliability]] — プル型主・信頼性3層
- [[decisions/2026-06-22-tracking-scope-category-cycle]] — 追跡単位(tracking_scope)でカテゴリ単位サイクル（★v2.1）

## 開発ワークフロー / 品質
- [[shift-checks-left-ci-authoritative]] — チェックは手元へ速く寄せ、CIを最終権威に
- [[decisions/2026-06-22-quality-gate-two-tier]] — 品質ゲートは Stop フック＋CI の二段構え

## UI / デザイン
- [[design-system]] — 外観の真実（トークン・画面別要点。モック準拠）
- [[surface-urgency-by-consumption]] — 緊急度は消費の進捗で見せ、緊急度で並べる
- [[decisions/2026-06-22-top-screen-stock-meter]] — トップは案C「在庫メーター型」を採用

## まだ言語化できていない問い
- [要確認] 商品3軸フラグ（type / status / is_notify_enabled）の独立設計は、どの一般原則に蒸留できるか（「直交する関心は別フラグに分ける」候補）。次に種ADR化するならここ。
- [要確認] 論理削除統一（deleted_at）も原則ノート化の候補。履歴有無で物理/論理を分岐しない判断の一般化。

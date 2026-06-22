---
name: server-action
description: app/actions/ の Next.js Server Actions（API-xxx）実装の専門。データ取得/更新APIや購入登録（サイクル更新トリガー）を実装するときに使う。
tools: Read, Edit, Write, Bash, Grep, Glob
---

# 役割: Server Actions（API-xxx）担当

`app/actions/` に Server Actions として API を実装する。独立 REST は作らない。
画面×API の対応は [docs/マトリクス_v2.md](../../docs/references/v2.1/マトリクス_v2.md)。

## 全 API 共通の定型（例外なし）
- **認証ガード（COM-001）** + **group_id 権限（COM-102）** を**読み取り系も含め必ず通す**。「RLS があるから」で省かない（二重防御）。
- エラーは統一形（COM-103）へ変換して返す。数値入力は COM-104 でガード。
- DB アクセスは `lib/supabase/` のクライアント経由。ドメイン計算は `lib/domain/`（domain-logic）を呼ぶ（Action内に式を直書きしない）。

## 注意が必要な API
- **API-019 カテゴリ追跡設定更新（★v2.1）**: `tracking_scope` / カテゴリの is_notify_enabled / cycle_mode 更新。**scope 切替時は pending をリセット**（引き継がない）。旧 API-015 の置き換え。
- **API-023 銘柄一覧取得（★v2.1）**: category の purchase_logs を `brand` でグルーピング（銘柄名＋purchase_url＋最終購入日＋価格）。買い足しUI（SCR-023）用。
- **API-021 購入登録**: purchase_logs を INSERT し、**サイクル更新を駆動**する。★v2.1 `brand` / `purchase_url` も保存。category scope時はカテゴリ単位でサイクル再計算（COM-016）。
  total_units/unit_price 算出 → (recurring & auto なら) per_unit_cycle_days 再計算 → next_order_date 更新 → status 遷移（初回=idle / 2回目以降=tracking、買い終わりで idle）。
- **API-012 商品更新**: 種別変更時 `is_notify_enabled` を**書き換えない**。tracking 中の単発化は一旦 idle 着地。
- **API-014 カテゴリCRUD**: ★v2.1 `tracking_scope` 更新を含む（scope切替でpendingリセットは API-019 に委譲 or 同等処理）。
- **API-016 手動投入/引っ込め**: pending へ（リスト追加）/ spot を買わずに idle へ（purchase_logs を作らない）。★v2.1 対象は scope準拠（商品 or カテゴリ）。
- **API-017 スヌーズ**: `notify_snoozed_until` 更新（恒久ミュートとは別物）。★v2.1 商品/カテゴリ両対応。
- **API-018 サイクル設定**: cycle_mode 切替・manual時 per_unit_cycle_days 更新。参考自動値は持たず都度集計。
- **API-030 買うべき商品取得**: 一覧 + **件数**を返す（バッジ COM-043 に流用）。★v2.1 商品単位・カテゴリ単位の対象を**統合して返す**。
- **API-013 削除**: 論理削除（deleted_at）で統一。

## 参照
- [docs/機能一覧_v2.md](../../docs/references/v2.1/機能一覧_v2.md) / [docs/マトリクス_v2.md](../../docs/references/v2.1/マトリクス_v2.md)
- `domain-rules` スキル。MVP対象外 API（API-007〜009A）は実装しない。★v2.1 旧 API-015 は廃止し API-019 に置換（実装する）。

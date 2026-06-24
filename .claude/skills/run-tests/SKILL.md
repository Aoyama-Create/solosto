---
name: run-tests
description: Vitest（ユニット）と Playwright（E2E）の実行・更新手順。ロジック検証やフローのE2E確認をするときに使う。
---

# テスト実行

> ユニットは `pnpm test`（Vitest）、E2E は `pnpm test:e2e`（Playwright）。品質ゲートは `code-check` スキル。

## ユニット（Vitest）— ドメインロジック中心
```bash
pnpm test            # 全ユニットテスト
pnpm test <path>     # 特定ファイル
pnpm test --watch    # ウォッチ
```
- 重点対象: `lib/domain/` のサイクル算出・単価・底値集計・状態遷移・通知発火式（COM-010/015/020〜023/050/101）。
- **間違えても例外が出ず黙って誤動作する**ロジック（サイクル/状態遷移/発火式）は境界値まで網羅する。
  - 例: 初回購入(実績0)→idle、2回目→tracking、スヌーズ境界（今日==snoozed_until）、0除算ガード。

## E2E（Playwright）
```bash
pnpm playwright install   # 初回のみ
pnpm test:e2e
```
- 重点フロー: サインイン → 商品登録 → 購入登録（サイクル確定）→ トップで「買った」チェック → リストから消える。

## 参照
- `domain-rules` スキル（検証すべき式の早見表）

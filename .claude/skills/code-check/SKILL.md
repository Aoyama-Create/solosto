---
name: code-check
description: コード変更時の品質ゲート（format/lint/型チェック）の実行フロー。コードを編集したら完了前に必ず参照・実行する。
---

# 品質ゲート（lint / 型 / format）

> ⚠️ scaffold前はスクリプト名が暫定。Phase 0 で package.json に scripts を定義すると Stop フックが自動有効化される。

## 何を走らせるか
**`pnpm check`** = `prettier --check .` ＋ `eslint .` ＋ `tsc --noEmit`（**非破壊**。テストは含めない）。

| script | 中身 | いつ |
|---|---|---|
| `pnpm check` | format:check + lint + typecheck | **コード変更タスクの完了前に必ず**（＝品質ゲート） |
| `pnpm format` | `prettier --write .` | 整形の修正 |
| `pnpm lint --fix` | eslint 自動修正 | lint の修正 |
| `pnpm test` / `pnpm test:e2e` | Vitest / Playwright | テスト（ゲートとは別。`run-tests` スキル） |

## 二段構え（毎回走る）
1. **ローカル: Claude Code の Stop フック**（`scripts/claude-stop-check.sh`）
   - edit タスクの最後に自動で `pnpm check`。失敗すると exit 2 で完了をブロック → その場で直す。
   - 会話のみ/ドキュメントのみの turn、scaffold前はスキップ（自己ガード）。
2. **リモート: CI（GitHub Actions `.github/workflows/ci.yml`）**
   - push/PR で `pnpm check` → `pnpm test` → `pnpm build`。最終権威。

## 失敗したら
1. 整形エラー → `pnpm format`
2. lint エラー → `pnpm lint --fix`（残りは手修正）
3. 型エラー → `tsc` の指摘を手修正
4. 再度 `pnpm check` が緑になってから完了する。

## やらないこと
- ゲートにテスト/ビルドを入れない（遅いので CI 側）。`pnpm check` は CI と同一判定にするため**非破壊**に保つ（修正は `pnpm format` で分離）。
- pre-commit（husky）/ format-on-save は使わない（二段構えで十分）。

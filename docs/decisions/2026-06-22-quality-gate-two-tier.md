---
created: 2026-06-22
status: accepted   # proposed | accepted | superseded
tags: [decision, tooling, ci, workflow, portable]
supersedes:
superseded_by:
---

# 品質ゲート（lint/型/format）は Stop フック＋CI の二段構えにする

<!-- ファイル名は YYYY-MM-DD-kebab-title.md。同日複数は末尾に -2 等 -->

## ステータス
accepted

## コンテキスト / 背景
lint / 型チェック / prettier を「毎回」走らせる実行フローが無く、整形漏れ・型エラー・lint 違反が
検出されずに混入しうる状態だった。AI（Claude Code）主体で半自動に開発するため、人手の手順に頼らず
**自動で毎回走り、かつ最終的に確定検証される**仕組みが要る。

## 決定
**二段構え**にする。
1. **ローカル: Claude Code の Stop フック**（`scripts/claude-stop-check.sh`）— edit タスクの完了時に `pnpm check` を自動実行。失敗なら exit 2 で完了をブロックし、その場で直させる。会話のみ/ドキュメントのみ/scaffold前はスキップ（自己ガード）。
2. **リモート: CI（GitHub Actions）** — push/PR で `pnpm check` → `pnpm test` → `pnpm build` を最終権威として再検証。
- `pnpm check` = `prettier --check` + `eslint` + `tsc --noEmit`（**非破壊**。テスト/ビルドは含めない）。
- 修正は別コマンド（`pnpm format` / `pnpm lint --fix`）に分離し、ローカルと CI の判定を一致させる。

## 却下した代替案
- **pre-commit（husky + lint-staged）** → 却下。コミットのたびに摩擦が出る。AI と人の両方がコミットする運用で重複し、Stop フック＋CI と守備範囲が被る。
- **format-on-save（PostToolUse で毎編集 prettier --write）** → 却下。編集ごとは過剰で、タスク単位のゲートで足りる。
- **ゲートにテスト/ビルドを同梱** → 却下。遅くなり手元の反復を阻害する。重い検証は CI 側に置く。

## トレードオフ / 結果
- 得たもの: 手元で速い即時フィードバック（左シフト）＋ CI の確定検証。AI が自分で直してから完了する閉ループ。
- 失ったもの: コミット時点の強制力は持たない（push 前に直っている前提）。CI が最終の砦として担保する。
- 前提: scaffold 前は tooling 不在のためフックは no-op。Phase 0 で `check` script を入れた瞬間に自動有効化。

## 蒸留した原則
- [[shift-checks-left-ci-authoritative]]

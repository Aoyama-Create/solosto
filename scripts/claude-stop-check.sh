#!/usr/bin/env bash
# Claude Code Stop フック — edit タスクの最後に品質ゲート（pnpm check）を走らせる。
# 二段構えのローカル側（リモート側は CI / .github/workflows/ci.yml）。
#
# 挙動:
#   - stop_hook_active=true（フック起因の再開）なら何もしない（無限ループ防止）。
#   - scaffold 前（package.json か "check" script が無い）なら何もしない（自己ガード）。
#   - lint 対象（*.ts/*.tsx/*.js/*.jsx/*.css/*.scss）の変更が無ければ何もしない
#     （会話のみ/ドキュメントのみの turn はスキップ＝「edit タスクの最後」だけ走る）。
#   - 上記を通過したら `pnpm check`（format:check + lint + typecheck）。
#     失敗時は exit 2 ＋ stderr。Claude がエラーを受け取り、`pnpm format` 等で直して再完了する。
#
# 注意: 重い処理（テスト/ビルド）はここに入れない（CI 側）。check は非破壊（--check）で CI と同一判定。

set -u
cd "$(dirname "$0")/.." || exit 0

input="$(cat 2>/dev/null || true)"

# 1) ループ防止
case "$input" in
  *'"stop_hook_active":true'* | *'"stop_hook_active": true'*) exit 0 ;;
esac

# 2) 自己ガード: tooling 未整備なら no-op
[ -f package.json ] || exit 0
grep -q '"check"[[:space:]]*:' package.json || exit 0

# 3) lint 対象の変更が無ければスキップ
changed="$(git status --porcelain 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|css|scss)$' || true)"
[ -n "$changed" ] || exit 0

# 4) 品質ゲート実行
if ! out="$(pnpm check 2>&1)"; then
  echo "品質ゲート失敗（pnpm check）。修正してから完了してください: 整形=pnpm format / lint=pnpm lint --fix / 型は手修正。" >&2
  echo "$out" >&2
  exit 2
fi
exit 0

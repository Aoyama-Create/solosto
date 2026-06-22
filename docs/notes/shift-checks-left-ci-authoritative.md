---
created: 2026-06-22
tags: [principle/workflow]
source: "[[decisions/2026-06-22-quality-gate-two-tier]]"
confidence: medium   # low | medium | high（複数経験で裏付くほど上げる）
---

# チェックは手元へ速く寄せ、CI を最終権威にする

## 主張
一般に、品質チェック（整形・lint・型・テスト）は**手元で速く回せる軽いものを左（編集の直後）に寄せ**、
**確定判定はCI（リモート）を唯一の権威にする**。手元のゲートは即時フィードバックで反復を速くするためのもので、
重い検証（テスト・ビルド）まで詰め込むと反復が止まる。両者は同じ判定基準（同一コマンド・非破壊）にして
「手元で緑＝CIで緑」を保ち、修正系は判定系と分離して結果がブレないようにする。

## 根拠となった経験
- [[decisions/2026-06-22-quality-gate-two-tier]] で、ローカルは Stop フックの `pnpm check`（format:check+lint+typecheck、非破壊）、リモートは CI が `check`→test→build。重い処理は CI 側に置き、手元は軽く速く保った。

## 反例 / 例外
- [要確認] チーム規模・コミット頻度によっては pre-commit の強制力が必要になる場合がある（履歴に入る前に止めたいとき）。
- 手元と CI で環境差（OS・依存バージョン）があると「手元で緑＝CIで緑」が崩れる。lockfile 固定等で環境を揃える前提。

## 関連
- [[resilient-by-recompute-on-open]] — 最終権威を一箇所（CI / サーバ）に置く発想の親戚

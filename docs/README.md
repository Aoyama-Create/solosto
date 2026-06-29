# docs — このリポジトリの第二の脳

コードと同じ履歴で管理する知識層。AI（Claude Code / Cursor）はここを文脈に読む。

## 三層の役割
| 層 | 中身 | 性質 |
|---|---|---|
| decisions/ | いつ・何を・なぜ決めたか（ADR） | 凍結（覆すなら新ADR） |
| notes/ | ADRから抜いた普遍原則 | 育つ・リンクで繋がる |
| maps/ | 原則と決定の地図（MOC） | 随時更新 |

## 回し方
1. 設計判断 → decisions/ にADRを足す
2. そのADRから再利用可能な原則を notes/ に1枚蒸留する
3. 既存ノートと [[wikilink]] で繋ぐ
4. テーマが育ったら maps/ にMOCを作る

## 入り口
- まず全体像 → リポジトリ直下の [README.md](../README.md)（概要・クイックスタート・コードマップ）
- これから参加する人 → notes/local-setup.md
- 本番公開する → notes/deploy.md（Vercel ＋ Supabase Cloud の手順書）
- 設計の「なぜ」 → decisions/ を検索
- 再利用できる学び → notes/
- 他プロジェクトへ流用 → [portable-playbooks.md](portable-playbooks.md)（`portable` タグの原則を束ねた汎用集）
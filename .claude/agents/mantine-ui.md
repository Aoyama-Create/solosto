---
name: mantine-ui
description: 画面（SCR-xxx）を Mantine v7 で実装する専門。トップ/商品/購入/通知センター等のUIを作るときに使う。
tools: Read, Edit, Write, Bash, Grep, Glob
---

# 役割: 画面（SCR-xxx）UI 担当（Mantine v7）

`app/` に App Router で画面を実装する。各画面が呼ぶ Server Action は
[docs/マトリクス_v2.md](../../docs/references/v2.1/マトリクス_v2.md) の「画面×API」対応に従う。

## デザイン（最優先・モック準拠）
- **外観はモックと一致させる**。トークンの正は [docs/design-system.md](../../docs/design-system.md)、即参照は `design-system` スキル。ビジュアルはモックHTML（`docs/references/v2.1/solosto デザインモック (standalone) (1).html`）。
- **まず Mantine テーマ（theme.ts）でトークンを一元化してから画面を作る**。`primaryColor`=オレンジ(#F0883E基点・**デフォルト青禁止**)、フォント=見出しZen Maru Gothic/本文M PLUS Rounded 1c、ピル999px・カード角丸・温茶の影/オレンジグロー、色 success#5BA672/alert#E0654E/surface#FBF7F1/ink#3B342C。
- **モバイルファースト PWA**：ボトムタブ5（ホーム/商品/検索/通知/設定）＋ safe-area。**PC版は後続（ロードマップ Phase 8）**。
- **トップ(SCR-030)は案C「在庫メーター型」**（消費残量バー＋緊急度ソート）。案A/Bは作らない。

## 主な画面と勘所
- **SCR-030 トップ（買うべきもの）**: `pending` + `next_order_date<=今日` を**同じリストに統合表示**。**チェックリスト運用**（却下や期限の概念なし。買うまで居座り、「買った」でチェックして消える）。recurring/pending はリストから外す操作を持たない。★v2.1 **商品単位とカテゴリ単位の対象が混在表示**（API-030 が統合して返す）。**デザインは案C「在庫メーター型」**＝消費残量メーターバー＋緊急度ソート、「そろそろ切れるもの N件」、空状態「今は買うものなし」（design-system.md 7章）。
- **SCR-021 購入登録モーダル**: 価格/パック数/入数/日時を入力。「買った」チェックの起点。total_units/単価は自動算出表示。★v2.1 category scope時は**銘柄(brand)・URL も記録**。
- **SCR-015 カテゴリ追跡設定（★v2.1）**: `tracking_scope`(product/category) 切替、category scope時の通知ON/OFF・スヌーズ・cycle_mode 設定。**scope切替時は pending がリセットされる旨を案内**（旧 SCR-014 の置き換え）。
- **SCR-023 銘柄選択・買い足しUI（★v2.1）**: category scope時、履歴の銘柄一覧（銘柄名＋URL＋最終購入日＋価格、API-023）から選んでディープリンク。「前回OSCO/前々回MAPU、今回はMAPUに戻す」も選べる。
- **SCR-013 カテゴリ管理**: ★v2.1 tracking_scope 切替UI を含む。
- **SCR-022 価格比較ビュー**: 底値+購入日 / 平均 / 直近比%。**判定ラベル（買い時！等）は出さない**。
- **SCR-012 商品編集**: 種別変更・スヌーズ・**cycle_mode 切替UI**。手動切替時は自動算出値を初期値に入れ、手動固定中は最新実績の参考値を併記（計算には使わない）。
- **SCR-003 通知許可/購読設定**: 二段構え（自前案内→OKした人だけブラウザ許可ダイアログ）。状態表示は**デバイス単位**（COM-003）。
- **SCR-040 通知センター**: 直近1週間の履歴、既読/未読。
- **SCR-006 通知設定**: notify_time（1時間刻み）/ timezone。

## 必ず守る方針
- ディープリンク（COM-012/014）で EC アプリへ遷移 → 戻って「買った」。フォールバック付き。
- PWA 前提（iPhone Safari）。バッジ（COM-043）はアプリ起動時にサーバ問い合わせで再設定。
- MVP対象外画面（SCR-004/005）は作らない。★v2.1 旧 SCR-014 は廃止し SCR-015 に置換（作る）。

## 参照
- [docs/機能一覧_v2.md](../../docs/references/v2.1/機能一覧_v2.md) / [docs/マトリクス_v2.md](../../docs/references/v2.1/マトリクス_v2.md)
- [docs/design-system.md](../../docs/design-system.md) — 外観の真実・画面別レイアウト要点
- `domain-rules` スキル / `design-system` スキル

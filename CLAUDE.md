# solosto

「そろそろ在庫が切れる」を防ぐ**個人用の在庫管理 PWA**。日用品・消耗品の在庫を管理し、「買い忘れ」と「無駄買い」を防ぐ。価格は**自分の過去の買値の中での相対評価**で判断する（リアルタイムEC価格は扱わない）。

- 対象: **iPhone（Safari PWA, ホーム画面追加）が主**、PC（Web）が従。将来 iOSネイティブ移行を想定。
- 利用形態: **個人利用 MVP**。家族共有などのマルチユーザーは作らない。ただし将来拡張のため DB には `group_id` 層だけ残す（1ユーザー1グループ自動生成）。

---

## ドメイン不変条件（最重要・実装全体で死守）

> ここを破ると**例外が出ずに静かに誤動作する**。各ルールは「規則 ← なぜ。正しい書き方」で覚える。
> 完全な早見表（状態遷移の全体表など）は `domain-rules` スキルと [docs/references/v2.1/システム定義書_v2.md](docs/references/v2.1/システム定義書_v2.md) を参照。

### 1. 商品は3つの独立したフラグで状態を表す
`type`・`status`・`is_notify_enabled` は**直交（独立）**。互いに巻き込まない。
- `type`: `recurring`（定期）/ `spot`（単発）。**デフォルト = recurring**。
- `status`: `pending`（買うべきリスト表示中）/ `tracking`（サイクル稼働中）/ `idle`（在庫十分）。
- `is_notify_enabled`: 恒久ミュート（true/false）。

### 2. 真実の源は購入記録（派生値に専用カラムを持たない）
底値・平均・直近比・参考自動サイクルは **products に持たず `purchase_logs` から都度集計** ← 集計カラムはログ削除時に不整合を生むため。
- 底値 = `MIN(unit_price)`、平均 = `AVG(unit_price)`。
- 判断は**全体底値のみ**（プラットフォーム別底値比較はしない。platform は検索フィルタ用に保持）。
- 参照: [[decisions/2026-06-22-derived-values-aggregate-on-read]] / [[single-source-of-truth]]。

### 3. 購入サイクルは個数ベース（ロット差を吸収）
```
per_unit_cycle_days = 購入間隔（前回→今回の日数） ÷ 前回 total_units
next_order_date     = 今回購入日 + (per_unit_cycle_days × 今回 total_units)  ← 今回購入日が起点（[[decisions/2026-06-26-next-order-date-uses-purchase-date]]）
total_units         = pack_quantity × units_per_pack
```
- `type=recurring` かつ `cycle_mode=auto` のときのみ再計算（spot / manual では走らせない）。
- 初回購入は間隔不明 → tracking に入れず `idle`。**2回目の購入で初めてサイクル確定**。
- 参照: [[decisions/2026-06-22-per-unit-cycle-calculation]] / [[normalize-units-before-time-series]]。

### 4. 単価
`unit_price = price ÷ total_units`（**`pack_quantity` ではない**）。

### 5. 通知発火式（scope拡張版 ★v2.1）
発火判定は `tracking_scope` に従って**主体（商品 or カテゴリ）を切り替える**。
```
[product scope] 商品ごとに:
  type=recurring かつ 商品.is_notify_enabled
    かつ (商品.notify_snoozed_until が null または 今日 > それ)
    かつ 商品.next_order_date <= 今日
[category scope] カテゴリごとに（銘柄横断で集計）:
  カテゴリ.is_notify_enabled
    かつ (カテゴリ.notify_snoozed_until が null または 今日 > それ)
    かつ カテゴリ.next_order_date <= 今日
```
COM-016（scope分岐解決）で集計単位を出し分け、COM-050 がこの式で対象抽出する。

### 6. ありえない状態
**`spot × tracking` は存在しない**。状態を生成・遷移させるときのガード基準にする。

### 7. 論理削除に統一
削除は `deleted_at` のみ ← 履歴有無で物理/論理を分岐しない。spot/pending の「削除」もこれ。

### 8. 追跡単位（tracking_scope）★v2.1
`categories.tracking_scope`（`product` / `category`、default `product`）が**集計の粒度**を決める。
- `product`: カテゴリ内を**商品単位**で追跡（コスメ。SK-II_001 と VT_001 は別サイクル）。
- `category`: カテゴリ**全体で1つ**を追跡（トイレ紙・赤ワイン。**銘柄横断**）。「銘柄が毎回変わるとサイクルが永遠に確定しない」問題を解く。
- **scope を切り替えてもサイクル・状態は壊れない** ← 専用カラムを持たず purchase_logs を GROUP BY（商品⇄カテゴリ）で集計するだけ。履歴は無傷（[[single-source-of-truth]] の徹底）。
- category scope では **categories が商品同等の追跡属性**を持つ（`is_notify_enabled` / `notify_snoozed_until` / `next_order_date` / `cycle_mode` / `status`）。`is_notify_enabled` は商品・カテゴリ両方が持ち、scope で見る側が切り替わる（切替で巻き込まない）。
- カテゴリは**フラット1階層**（階層・商品ごと上書きは持たない）。
- **銘柄は `purchase_logs.brand` / `purchase_url` に記録** ← 商品名と実物のズレを起こさない。URL は履歴側が正（後から書き換わらない）。買い足し時は履歴から銘柄一覧を集計して提示。
- 旧 target_type（カテゴリ→商品展開）は廃止し、本設計で置き換え。詳細: [[decisions/2026-06-22-tracking-scope-category-cycle]] / [[choose-aggregation-grain-late]]。

### ❌/✅ solosto固有の罠（具体例で潰す）
| やりがちな誤り ❌ | 正しい実装 ✅ |
|---|---|
| 種別変更 `recurring→spot` で `is_notify_enabled` を一緒にリセット | 独立フラグなので**書き換えない**。戻したとき通知状態が保たれる（status は保持して横移動） |
| 単価を `price ÷ pack_quantity`（パック数）で計算 | `price ÷ total_units` |
| `units_per_pack` を商品マスタ参照にし、過去ログの単価が後から変動 | 記録時点の値を `purchase_logs.units_per_pack` に**コピー保存** |
| tracking 中に単発化して履歴を失う | 一旦 `idle` に着地させてから種別変更（履歴は残り、定期に戻せば即 tracking 復帰） |
| scope 切替時に pending を引き継ぐ ★v2.1 | **pending はリセット**し「追跡方法を変えたのでリストから外しました。必要なら入れ直してください」と案内（切替は稀イベント。引き継ぎロジックを持たず不整合ゼロ） |
| category scope のサイクル/底値を専用カラムにキャッシュ ★v2.1 | purchase_logs を**銘柄横断で都度集計**（product scope と同じ「真実の源は購入記録」） |

---

## 技術スタック
- **Frontend**: Next.js 15（App Router）+ Mantine v7
- **Backend**: Next.js Server Actions + Supabase（Auth / DB(PostgreSQL) / Storage）
- **Deploy**: Vercel
- **バッチ**: `/api/cron`（**毎時** + `notify_time` 一致判定、**Node.js Runtime**、`CRON_SECRET` 保護）。BAT-001（通知）と BAT-002（クリーンアップ）を**1つのエンドポイントに統合**。トリガは**ホストから分離**: 本番(Vercel Hobby)は GitHub Actions（`.github/workflows/notify-cron.yml`）から毎時叩く／Vercel Pro なら `vercel.json` の `crons` に戻して Vercel Cron でも可。詳細 [docs/notes/deploy.md](docs/notes/deploy.md)・[[decisions/2026-06-28-cron-via-external-scheduler-on-hobby]]。
- **Push**: web-push（Node.js）。VAPID 鍵は一度だけ生成し固定（変更で全購読失効）。公開鍵はフロント、**秘密鍵は Vercel 環境変数**。
- **パッケージマネージャ**: pnpm / **言語**: TypeScript / **テスト**: Vitest（ロジック）+ Playwright（E2E）。

## デザイン（外観の真実）★必読
実装は**デザインモックと同じ見た目**にする。外観の真実は2つで一組:
- ビジュアル = モックHTML `docs/references/v2.1/solosto デザインモック (standalone) (1).html`（ブラウザで確認）
- 文字に起こした正 = [docs/design-system.md](docs/design-system.md)（即参照は `design-system` スキル）

守ること:
- **Mantine テーマにトークンを一元写像**して全画面で一貫させる。**Mantine デフォルトの青・フォントは使わない**。
  - 色（モックの名前付き）: `primary #F0883E` / `success(底値) #5BA672` / `alert(切れそう) #E0654E` / `surface #FBF7F1` / `ink #3B342C`。
  - フォント: 見出し **Zen Maru Gothic** / 本文・UI **M PLUS Rounded 1c**（Google Fonts）。
  - 形: ピル `999px`（ボタン/チップ/タブ）・カード `20〜28px`・温茶の影／primaryのオレンジグロー。
- **モバイルファースト PWA**（iPhone Safari）。**ボトムタブ5**（ホーム/商品/検索/通知/設定）＋ `env(safe-area-inset-*)`。**PC版は後続**（ロードマップ Phase 8）。
- **トップ（SCR-030）は案C「在庫メーター型」を採用**（消費残量バー＋緊急度ソート）。案A/Bは不採用。→ [[decisions/2026-06-22-top-screen-stock-meter]] / [[surface-urgency-by-consumption]]。
- 価格は「買い時！」等の判定ラベルを出さない（色＋データで示す。底値=緑/切れそう=赤橙）。

## ディレクトリ構成
- `app/(app)/` 画面（SCR-xxx。ボトムタブのルートグループ）/ `app/actions/` Server Actions（API-xxx。Phase 1+）
- `app/layout.tsx`（Mantine/フォント/テーマ）/ `app/manifest.ts` / `app/globals.css`
- `components/` 共有UI（`BottomNav` 等）
- `lib/theme.ts` デザインテーマ / `lib/supabase/{server,client,middleware}.ts`・`database.types.ts`
- `lib/common/` 共通基盤（COM-100〜104: date/number/errors/soft-delete/authz）/ `lib/domain/` ドメイン純粋ロジック（Phase 3+）
- `supabase/migrations/` スキーマ・RLS / `supabase/seed.sql`
- `public/sw.js` service worker（Phase 5）/ `tests/e2e/` Playwright / `middleware.ts` セッション更新

## 開発コマンド
`pnpm dev` / `pnpm build` / `pnpm test`（Vitest）/ `pnpm test:e2e`（Playwright）/ `pnpm check`（品質ゲート）/ `pnpm format` / `pnpm supabase start|db reset|gen types ...`
詳細・接続情報は [docs/notes/local-setup.md](docs/notes/local-setup.md)。Node 20 / pnpm（corepack）。

## 品質ゲート（必須）★
コード変更を伴うタスクは、**完了前に必ず `pnpm check`（= `prettier --check` + `eslint` + `tsc --noEmit`）を通す**。整形は `pnpm format`、lint は `pnpm lint --fix`。詳細は `code-check` スキル。
- 二段構え: ①**ローカル** Claude Code の Stop フック（`scripts/claude-stop-check.sh`）が edit タスク完了時に自動実行し、失敗なら完了をブロック。②**CI**（`.github/workflows/ci.yml`）が push/PR で `pnpm check`→`pnpm test`→`pnpm build` を再検証。
- ゲートにテスト/ビルドは入れない（遅いので CI 側）。`pnpm check` は非破壊で CI と同一判定。テストは `pnpm test`。
- 判断記録: [[decisions/2026-06-22-quality-gate-two-tier]] / [[shift-checks-left-ci-authoritative]]。

## プラン自己レビュー（必須）★
プランを書いたら、**ExitPlanMode を呼ぶ前に必ず `plan-review` スキルの5観点で自己レビュー**し、見つけた Issues を潰した改善版にプランを直してから提示する。「問題なし」になるまで提示しない。
- 観点: ①要件適合性 ②技術的妥当性 ③影響範囲 ④不足事項 ⑤実行可能性。出力: Review Result / Issues / Improved Plan。
- 特に**スコープ境界（このフェーズで作る/作らない）**の明記漏れを必ず確認する。詳細は `plan-review` スキル。

---

## コーディング規約
- **API は Server Actions で完結**。独立 REST エンドポイントは作らない。
- **すべての API（読み取り系も例外なく）** 認証ガード（COM-001）+ group_id 権限（COM-102）を通す。「RLS があるから」で省かない（RLS とアプリ層の二重防御）。
- RLS は group_id 単位。エラーは統一形（COM-103）へ。数値は 0除算/負値ガード（COM-104）。
- 購入登録（API-021）は **サイクル更新を駆動**する点に注意（total_units/unit_price 算出 → サイクル再計算 → status 遷移）。
- 機能 ID（SCR/API/COM/BAT）は [機能一覧](docs/references/v2.1/機能一覧_v2.md) と [マトリクス](docs/references/v2.1/マトリクス_v2.md) が真実。実装は ID をコミット/PR に紐付ける。

## MVP 対象外（作らない）
招待・ユーザーメンテ（SCR-004/005、API-007〜009A）。`group_id` の箱だけ DB に残す。詳細: [機能一覧 末尾](docs/references/v2.1/機能一覧_v2.md)。
- ★v2.1: 旧「カテゴリ通知 target_type（SCR-014/API-015/COM-013）」は**対象外ではなく廃止して tracking_scope（SCR-015/API-019/COM-016）に置換**＝**in-scope** になった。

---

## docs/ 知識層（第二の脳）の運用ルール ★必読
コードと同じ履歴で管理する知識層が `docs/` にある。**AI（Claude Code / Cursor）はここを文脈に読み、自分で更新し続ける**。
（同一ルールを [.cursor/rules/docs.mdc](.cursor/rules/docs.mdc) にも記載。両者は常に同じ内容に保つ。）

1. **コードを読むときは `docs/` も必ず文脈に入れる**（特に `decisions/` と `notes/`）。
2. 設計に影響する判断をしたら **`docs/decisions/` に ADR を1枚追加**（採用案・却下案・理由・トレードオフ）。ファイル名 `YYYY-MM-DD-kebab-title.md`（同日複数は末尾 `-2`）。ADR は**凍結・追記のみ。書き換えない**（覆すときは新 ADR で `supersedes`）。
3. ADR を追加したら、再利用可能な原則を **`docs/notes/` に1枚蒸留**（主語を一般化し、`source` で元 ADR に紐付け。**1ノート1概念**）。
4. 新規ノートは**既存 `notes/` を検索**し、関連を **`[[wikilink]]`** で必ず繋ぐ。
5. **同じ原則が複数 ADR から出たら `confidence` を上げる**。
6. 断定できない箇所は **`[要確認]`** を付す。
7. ローカル環境構築・シーダー手順は **`docs/notes/local-setup.md` に集約**し、暗黙知が出たら必ず追記。
- 雛形: `docs/templates/`（adr.md / note.md / mock.md）。歩き方: [docs/README.md](docs/README.md)。

## 参照ドキュメント
- [docs/README.md](docs/README.md) — 知識層の歩き方
- [docs/references/v2.1/システム定義書_v2.md](docs/references/v2.1/システム定義書_v2.md) — 要件・仕様・DB設計・運用ロジックの真実
- [docs/references/v2.1/機能一覧_v2.md](docs/references/v2.1/機能一覧_v2.md) / [docs/references/v2.1/マトリクス_v2.md](docs/references/v2.1/マトリクス_v2.md) — 機能 ID と画面×API対応
- [docs/state_diagram.mermaid](docs/state_diagram.mermaid) — 状態遷移図
- [docs/実装ロードマップ.md](docs/実装ロードマップ.md) — フェーズ別チェックリスト
- [docs/design-system.md](docs/design-system.md) — 外観の真実（デザイントークン・画面別要点）
- [docs/maps/data-model-and-reliability.md](docs/maps/data-model-and-reliability.md) — 設計の背骨 MOC

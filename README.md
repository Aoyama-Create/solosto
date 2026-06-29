# solosto

「そろそろ在庫が切れる」を防ぐ、**個人用の在庫管理 PWA**。日用品・消耗品の在庫を管理し、「買い忘れ」と「無駄買い」を防ぐ。価格は **自分の過去の買値の中での相対評価**（底値比）で判断する（リアルタイム EC 価格は扱わない）。

- 対象: **iPhone（Safari PWA・ホーム画面追加）が主**、PC は従。
- 利用形態: **個人利用 MVP**（家族共有などのマルチユーザーは作らない。将来拡張のため DB に `group_id` 層だけ残す）。

## 主要機能
- **在庫メーター型トップ**: 消費残量バー＋緊急度ソートで「そろそろ切れるもの」を一覧。
- **買い物リスト**: チェックリスト運用（買うまで居座る）。商品単位／カテゴリ単位（銘柄横断）両対応。
- **購入サイクル学習**: 2回目の購入から個数ベースで次回購入日を自動算出。
- **価格比較**: 底値/平均/直近を「単価/個」で表示（判定ラベルは出さない）。
- **Push 通知**: 毎時バッチで notify_time 一致ユーザーへ1通。届かなくてもアプリを開けば最新（プル型）＋ App バッジ。
- **検索**: 商品名/カテゴリ/プラットフォーム/期間。

## 技術スタック
Next.js 15（App Router）/ Mantine v7 / Supabase（Auth・PostgreSQL・RLS・Storage）/ Vercel / web-push / TypeScript / Vitest（ロジック）＋ Playwright（E2E）。pnpm。

## クイックスタート（ローカル）
```bash
pnpm install
pnpm supabase start         # ローカル Supabase（Docker）
pnpm seed                   # テストユーザー・サンプルデータ投入（test@solosto.local / password）
pnpm dev                    # http://localhost:3000
```
詳細・環境変数・つまずきメモは **[docs/notes/local-setup.md](docs/notes/local-setup.md)**。

## コードマップ（どこを直す？）
| やりたいこと | 触る場所 | 参照 |
|---|---|---|
| 画面の見た目・文言を変える | `app/(app)/**` ＋ `components/**` | `design-system` skill / [docs/design-system.md](docs/design-system.md) |
| API（取得/更新）を足す・直す | `app/actions/**`（Server Actions） | [CLAUDE.md](CLAUDE.md) コーディング規約（認証ガード＋RLS） |
| DB スキーマ・RLS を変える | `supabase/migrations/**` | `db-migrate` skill |
| ドメインのルール（サイクル/単価/底値/状態/通知発火） | `lib/domain/**` | `domain-rules` skill / [CLAUDE.md](CLAUDE.md) 不変条件 |
| 通知（購読/送信/バッチ） | `lib/push/**` ・ `app/api/cron/route.ts` ・ `app/actions/{push,notifications}.ts` | [docs/notes/deploy.md](docs/notes/deploy.md) §5.5 |
| 共通基盤（認証/エラー/日付/数値） | `lib/common/**` | — |
| 品質ゲートを通す | `pnpm check` / `pnpm test` | `code-check` skill |

> 機能 ID（SCR/API/COM/BAT）は [docs/references/v2.1/機能一覧_v2.md](docs/references/v2.1/機能一覧_v2.md) と [マトリクス](docs/references/v2.1/マトリクス_v2.md) が真実。

## ディレクトリ早見
```
app/(app)/      画面（ボトムタブのルートグループ）
app/actions/    Server Actions（API-xxx）
app/api/cron/   通知バッチ（BAT-001/002 を統合）
components/     共有UI（BottomNav / SideNav / 各画面コンポーネント）
lib/domain/     ドメイン純粋ロジック（サイクル/単価/底値/状態/通知抽出）＋ Vitest
lib/push/       Push（購読状態・送信・配信判定）
lib/common/     共通基盤（authz/errors/date/number）
lib/supabase/   server/client/middleware/admin・database.types
supabase/migrations/  スキーマ・RLS・grants・トリガー
tests/e2e/      Playwright（本番ビルドに対して実行）
docs/           知識層（第二の脳）— 下記
```

## テスト & 品質ゲート
```bash
pnpm check      # prettier --check + eslint + tsc（コード変更の完了前に必ず）
pnpm test       # Vitest（ロジック）
pnpm test:e2e   # Playwright（要 Supabase。本番ビルドに対して実行）
```

## デプロイ（本番）
Vercel ＋ Supabase Cloud。env 設定・マイグレーション適用・Auth 設定・毎時バッチ（Hobby は GitHub Actions / Pro は Vercel Cron）まで、手順は **[docs/notes/deploy.md](docs/notes/deploy.md)**。

## ドキュメント地図
- **[CLAUDE.md](CLAUDE.md)** — ドメイン不変条件・コーディング規約・運用ルール（AI/人間共通の憲法）。
- **[docs/README.md](docs/README.md)** — 知識層（第二の脳）の歩き方。
- **[docs/maps/data-model-and-reliability.md](docs/maps/data-model-and-reliability.md)** — 設計の背骨 MOC。
- **[docs/decisions/](docs/decisions/)** — 設計判断の記録（ADR・凍結追記）。**[docs/notes/](docs/notes/)** — 蒸留した普遍原則。
- **[docs/references/v2.1/](docs/references/v2.1/)** — 要件・仕様・DB設計・機能ID（真実）。
- **[docs/実装ロードマップ.md](docs/実装ロードマップ.md)** — フェーズ別チェックリスト。
- **[docs/portable-playbooks.md](docs/portable-playbooks.md)** — 他プロジェクトに流用できる汎用プレイブック集。

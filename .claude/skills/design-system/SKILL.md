---
name: design-system
description: solosto の見た目トークン早見表（色・フォント・角丸・影・ボトムタブ・Top採用案）。画面実装で外観を合わせるとき必ず参照する。
---

# デザイン早見表

真実は [docs/design-system.md](../../../docs/design-system.md) とモックHTML（`docs/references/v2.1/solosto デザインモック (standalone) (1).html`）。ここは即参照用。
性格: **温かい・丸い・親しみやすい**（クリーム地＋オレンジ＋丸ゴシック）。

## 色（モックの名前付きトークン）
| 名前 | 値 | 用途 |
|---|---|---|
| primary | `#F0883E` | ブランドオレンジ・主要操作（hover/グラデ終端 `#E2752B`） |
| success(底値) | `#5BA672` | 底値・良好（緑）／tint `#E8F2EA` |
| alert(切れそう) | `#E0654E` | 緊急・切れそう（赤橙）／tint `#FBE7E2` |
| surface | `#FBF7F1` | 基本の面（クリーム）。他面 `#FFF`/`#FDFBF8`/`#F3ECE2`/`#EEE5D7` |
| ink | `#3B342C` | 本文。階調 `#5C5347`/`#8C8377`/`#A89E90`/`#B6ADA1`/`#C9C0B4` |

- primaryグラデ `linear-gradient(135deg,#F0883E,#E2752B)`。error `#b00020`（控えめ）。
- 影は黒でなく温茶 `rgba(60,52,44,*)`。

## フォント（Google Fonts）
- 見出し: **Zen Maru Gothic** / 本文・UI: **M PLUS Rounded 1c**

## シェイプ・影
- 角丸: ピル `999px`（ボタン/チップ/タブ）、カード `20〜28px`
- カード影 `0 18px 50px rgba(60,52,44,.18)`／微 `0 2px 8px rgba(60,52,44,.06)`／primaryグロー `0 4px 12px rgba(240,136,62,.3)`

## レイアウト
- モバイルファースト PWA（iPhone Safari）。`env(safe-area-inset-*)`。
- **ボトムタブ5**: ホーム / 商品 / 検索 / 通知 / 設定（アクティブ=primary）。
- PC版は後回し（ロードマップ Phase 8）。

## Mantine 写像（必須）
- `primaryColor`=独自オレンジ10段（#F0883E基点）。**デフォルト青を使わない**。
- `fontFamily='M PLUS Rounded 1c'` / `headings.fontFamily='Zen Maru Gothic'`。
- `theme.colors` に success/alert。`theme.other` に surface/ink階調・影・グラデ。Card/Button の default props で既定化。

## Top（SCR-030）採用案
- **★ 案C「在庫メーター型」を採用**: 消費残量メーターバー・緊急度ソート・「そろそろ切れるもの N件」・空状態「今は買うものなし」。
- 案A（チェックリスト）/ 案B（カード）は**不採用＝参考**。
- 判断: [[decisions/2026-06-22-top-screen-stock-meter]] / 原則 [[surface-urgency-by-consumption]]

## ドメインとの整合
- 価格は「買い時！」等の**判定ラベルを出さない**（色とデータで示す）。底値=緑・切れそう=赤橙の意味付けを守る。

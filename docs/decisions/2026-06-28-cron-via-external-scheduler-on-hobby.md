---
created: 2026-06-28
status: accepted
tags: [decision, portable]
supersedes:
superseded_by:
---

# 通知バッチの毎時実行は外部スケジューラ（GitHub Actions）で叩く

## ステータス
accepted

## コンテキスト / 背景
通知バッチ（BAT-001＋BAT-002 を統合した `/api/cron`）は「**毎時**実行し、各ユーザーの `notify_time` と現在時刻(TZ変換)を一致判定」する設計（[システム定義書 §2.8/§5.3](../references/v2.1/システム定義書_v2.md)）。
当初は `vercel.json` の `crons`（`0 * * * *`）で Vercel Cron に登録する想定だった。
しかし **Vercel Hobby（無料）は Cron が 1日1回までで毎時は不可**（毎時 crons を置くとデプロイがブロックされる）。日1回では「時」粒度の notify_time 判定が成立しない（特定時刻のユーザーにしか飛ばない）。MVP は無料枠で運用したい。

## 決定
`vercel.json` を置かず、**GitHub Actions（`.github/workflows/notify-cron.yml`）の `schedule` から毎時 `GET /api/cron` を `Authorization: Bearer $CRON_SECRET` 付きで叩く**。アプリ側のコード（route/認証/ロジック）は不変。

## 却下した代替案
- **Vercel Cron をそのまま使う** → Hobby は毎時不可。採用するには Vercel Pro（有料）が必要。
- **Vercel Cron を日1回に落とす** → notify_time の時粒度判定が壊れる（大半のユーザーに飛ばない）。不可。
- **アプリ常駐の自前スケジューラ** → サーバーレス（Vercel）と相性が悪く運用が重い。

## トレードオフ / 結果
- 得るもの: **無料で毎時実行**。トリガをホストから分離したため、Pro 化や別ホストへ移っても route は不変（`vercel.json` に `crons` を戻せば Vercel Cron へ即移行可）。
- 失うもの: GitHub `schedule` は数分の遅延・まれにスキップがある。→ 本アプリは「**時**」粒度判定のため、同じ時内に発火すれば許容。厳密性が要るなら cron-job.org 等の併用で吸収。
- セキュリティ: 公開エンドポイントだが `CRON_SECRET`（Bearer）で保護。秘密は GitHub/Vercel の secret に保管しコミットしない。
- 手順は [notes/deploy.md](../notes/deploy.md) §5.5 に記載。

## 蒸留した原則
- [[decouple-schedule-from-host]]

---
created: 2026-06-28
tags: [principle/ops, portable]
source: "[[decisions/2026-06-28-cron-via-external-scheduler-on-hobby]]"
confidence: medium
---

# 定期実行は「叩かれる認証付きエンドポイント」にして、トリガ（誰がいつ叩くか）はホストから分離する

## 主張
一般に、バッチ/cron は **冪等で認証付きの HTTP エンドポイント**として実装し、起動タイミングは外部スケジューラに委ねるのがよい。
ロジックをホスト固有の cron 機構（プラン制限・専用設定）に結びつけないことで、無料枠の制約を外部トリガで回避でき、プラン変更・別ホスト移行・スケジューラ差し替えがコード非依存になる。
スケジュールの粒度（時/日）と判定ロジックの粒度を一致させておけば、トリガの分単位の遅延は吸収できる。

## 根拠となった経験
- [[decisions/2026-06-28-cron-via-external-scheduler-on-hobby]] で Vercel Hobby が毎時 Cron 不可だったが、`/api/cron`（CRON_SECRET 保護・冪等）を GitHub Actions から毎時叩くことで、コード変更ゼロ・無料のまま実現。`vercel.json` に `crons` を戻せば Vercel Cron へも即移行できる。

## 反例 / 例外
- 秒〜分の高頻度・低レイテンシが要る処理は外部トリガの遅延/スキップが許容できない（専用ワーカーやキューを使う）。
- 巨大ジョブで実行時間がサーバーレスのタイムアウトを超える場合は分割やワーカー化が必要。

## 関連
- [[resilient-by-recompute-on-open]]（届かない前提で開けば直す＝プル型と同じ「外部依存を最小化」思想）
- [[shift-checks-left-ci-authoritative]]

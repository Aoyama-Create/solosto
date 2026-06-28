---
created: 2026-06-28
tags: [principle/ops]
source: "[[notes/deploy]]"
confidence: medium
---

# マネージドサービスの設定はマイグレーションに含まれない — 環境ごとに別管理する

## 主張
一般に、**SQL マイグレーション（スキーマ/RLS/関数）に乗らない「プラットフォーム設定」**がある。
認証ポリシー・メール確認・SMTP・レート上限・リダイレクトURL・環境変数などはマネージド側の設定で、`db push` 等では同期されない。
そのため **ローカルの設定ファイルと本番が暗黙に食い違う（config drift）**。本番化のチェックリストに「設定項目を環境ごとに手当てする」を必ず含め、**ローカルで自明に効いている挙動ほど本番で抜けていないか疑う**。

## 根拠となった経験
- solosto を Supabase Cloud へ。`supabase db push` はテーブル/RLS/トリガーを適用したが、**Auth 設定は反映されない**。ローカル `config.toml` は `enable_confirmations = false`（確認メール無し＝autoconfirm）なのに、**Cloud は既定で「メール確認 ON」**。
  - 症状: サインアップで `email rate limit exceeded`（内蔵メールの送信上限）＋**即セッションが張られず `/` に遷移しない**（本アプリは確認メール導線を持たない設計）。
  - 対処: ダッシュボードで **Email の「Confirm email」を OFF**（ローカルと一致させる）。詳細 [[notes/deploy]] 手順6。
- 同種: `sign_in_sign_ups` レート上限・Site URL・環境変数（VAPID/CRON_SECRET）も Cloud/Vercel 側で個別設定が要る。

## 反例 / 例外
- `supabase config push`（CLI が対応していれば）で一部の Auth 設定をコード管理できる場合がある。[要確認] 対応範囲はバージョン依存。可能ならこちらで drift を減らす。

## 関連
- [[decouple-schedule-from-host]]（同じく「ホスト/プラットフォーム依存をどう御すか」の話）
- [[shift-checks-left-ci-authoritative]]

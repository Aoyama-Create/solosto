---
created: 2026-06-25
status: accepted   # proposed | accepted | superseded
tags: [decision, auth, schema]
supersedes:
superseded_by:
---

# COM-002 グループ自動生成は auth.users トリガーで行う

## ステータス
accepted

## コンテキスト / 背景
個人用MVPは「1ユーザー1グループ」。RLS は `current_group_id()`（profiles 経由で auth.uid()→group_id）に依存するため、
**サインアップ直後に group と profile が存在していないと、その後のあらゆるクエリが RLS で弾かれる**。
グループ生成を「いつ・どこで」行うかを決める必要があった（Phase 1 認証）。

## 決定
**`auth.users` への AFTER INSERT トリガー `on_auth_user_created` → `handle_new_user()`（SECURITY DEFINER）** で、
ユーザー作成と同一トランザクション内に group と profile を自動生成する。
- profile に `timezone='Asia/Tokyo'`、`notify_time='08:00:00'`（既定）をセット → Phase 6 通知バッチが破綻しない。
- group name は仮の既定値（'マイグループ'）。
- 経路（アプリのサインアップ / シードの admin API / 将来の SSO）に依存せず確実にブートストラップされる。

## 却下した代替案
- **アプリの signUp アクション内で group→profile を2回 INSERT** → 却下。サインアップ経路ごとに実装が必要（シード・管理API・将来のSSO で漏れる）。失敗時に group だけ残る中途半端状態が起きうる。RLS の都合で anon 権限の穴も生まれやすい。
- **初回アクセス時に遅延生成** → 却下。判定が各所に散らばり、競合（同時2リクエスト）で二重生成のリスク。

## トレードオフ / 結果
- 得たもの: どの経路でも确実に group+profile が揃い、RLS が即機能。トランザクション保証で中途半端状態なし。
- 失ったもの: ロジックが DB（トリガー）に入るためアプリのコードを読むだけでは見えにくい（→ 本 ADR と migration コメントで補う）。

## 関連
- [[single-source-of-truth]]（RLS の真実源を profiles に一本化）。
- 補足: RLS の手前に**テーブルへの GRANT**が必要（生 SQL マイグレーションのテーブルは DML 権限が自動付与されない）。authenticated/service_role に付与（anon は付与しない）。詳細は migration `*_grants.sql` と local-setup つまずきメモ。

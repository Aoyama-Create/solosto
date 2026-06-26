-- API ロールへのテーブル権限付与。
-- RLS は「どの行か」を制御するが、その前段で「テーブルにアクセスできるか」の GRANT が必要。
-- 生 SQL マイグレーションで作ったテーブルには DML 権限が自動付与されないため、明示的に付ける。
-- 行レベルの可視範囲は RLS ポリシー（group_id 単位）が引き続き支配する。
-- anon は付与しない（本アプリは認証必須。全ポリシーが to authenticated）。

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- 今後 public に作るテーブル/シーケンスにも同じ権限を既定で付与。
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;

-- COM-002 グループ自動生成。
-- auth.users が作られた瞬間に group + profile を自動生成し、RLS の current_group_id() を即機能させる。
-- signup の経路（アプリ/シード/管理API）に依存せず確実にブートストラップする（DBトリガー方式）。

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group_id uuid;
begin
  -- 1ユーザー1グループを自動生成（name は仮の既定値）。
  insert into public.groups (name)
  values ('マイグループ')
  returning id into new_group_id;

  -- プロファイル作成。display_name はサインアップ時メタデータから、無ければ null。
  -- notify_time の既定 08:00 を入れておくと Phase 6 の通知バッチが破綻しない。
  insert into public.profiles (id, group_id, display_name, timezone, notify_time)
  values (
    new.id,
    new_group_id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    'Asia/Tokyo',
    '08:00:00'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

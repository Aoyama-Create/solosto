-- solosto 初回スキーマ（v2.1 システム定義書 3章）
-- 方針: 派生値（底値・平均・参考自動サイクル）の専用カラムは作らない＝purchase_logs から都度集計。
-- 削除は論理削除（deleted_at）に統一。ただし purchase_logs は「真実の源」なので物理削除（deleted_at なし）。
-- 列挙は CHECK 制約で表現。

create extension if not exists pgcrypto;

-- ── groups（内部的に1ユーザー1グループ。招待は MVP 対象外）──────────────
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ── profiles（auth.users と 1:1）────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  display_name text,
  notify_time time,                       -- 通知時刻（1時間刻み）
  timezone text not null default 'Asia/Tokyo',
  created_at timestamptz not null default now()
);
create index profiles_group_id_idx on public.profiles (group_id);

-- ── push_subscriptions（複数デバイス。1ユーザー複数行）──────────────────
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription jsonb not null,
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

-- ── categories（v2.1: tracking_scope と category scope 用追跡属性）────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null,
  tracking_scope text not null default 'product'
    check (tracking_scope in ('product', 'category')),
  is_notify_enabled boolean not null default true,           -- category scope 時に参照
  notify_snoozed_until date,
  next_order_date date,                                       -- 表示/判定用（基本は集計導出）
  cycle_mode text check (cycle_mode in ('auto', 'manual')),
  status text check (status in ('pending', 'tracking', 'idle')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index categories_group_id_idx on public.categories (group_id);

-- ── products（3軸フラグ＋個数/サイクル設計）─────────────────────────────
-- ※ current_cycle_days（旧来の参考値）は持たない。参考自動サイクルは purchase_logs から都度集計
--    （docs/decisions/2026-06-23-no-legacy-cycle-column.md）。
create table public.products (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  purchase_url text,
  type text not null default 'recurring' check (type in ('recurring', 'spot')),
  status text not null default 'pending' check (status in ('pending', 'tracking', 'idle')),
  is_notify_enabled boolean not null default true,            -- 恒久ミュート（独立フラグ）
  notify_snoozed_until date,                                  -- 一時スヌーズ
  base_unit text,                                             -- 個/ml/セット等
  default_units_per_pack numeric,                             -- 標準入数
  cycle_mode text not null default 'auto' check (cycle_mode in ('auto', 'manual')),
  per_unit_cycle_days numeric,                                -- 1個あたり消費日数（manual時は固定値）
  next_order_date date,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index products_group_id_idx on public.products (group_id);
create index products_category_id_idx on public.products (category_id);

-- ── purchase_logs（真実の源。物理削除。底値/平均/サイクルはここから都度集計）──
create table public.purchase_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  price numeric not null,
  pack_quantity numeric not null default 1,
  units_per_pack numeric not null default 1,                  -- 記録時点の入数（コピー保存）
  total_units numeric not null,                               -- pack_quantity × units_per_pack
  unit_price numeric not null,                                -- price ÷ total_units
  brand text,                                                 -- v2.1: 銘柄（category scope）
  purchase_url text,                                          -- v2.1: その購入のURL（履歴側が正）
  platform text,                                              -- 検索フィルタ用
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index purchase_logs_product_id_idx on public.purchase_logs (product_id);
create index purchase_logs_purchased_at_idx on public.purchase_logs (purchased_at);

-- ── notifications（直近1週間。7日超はバッチで物理削除）──────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null,
  message text,
  is_read boolean not null default false,
  delivery_status text check (delivery_status in ('sent', 'failed', 'expired')),
  created_at timestamptz not null default now()
);
create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────
-- 現在ユーザーの group_id を解決するヘルパ（profiles 経由）。
create or replace function public.current_group_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select group_id from public.profiles where id = auth.uid();
$$;

alter table public.groups enable row level security;
alter table public.profiles enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.purchase_logs enable row level security;
alter table public.notifications enable row level security;

-- groups: 自分のグループのみ
create policy groups_all on public.groups
  for all to authenticated
  using (id = public.current_group_id())
  with check (id = public.current_group_id());

-- profiles: 自分の行のみ
create policy profiles_all on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- push_subscriptions: 自分の行のみ
create policy push_subscriptions_all on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- categories / products / notifications: 自グループのみ
create policy categories_all on public.categories
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

create policy products_all on public.products
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

create policy notifications_all on public.notifications
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- purchase_logs: 親 product が自グループ
create policy purchase_logs_all on public.purchase_logs
  for all to authenticated
  using (
    product_id in (
      select id from public.products where group_id = public.current_group_id()
    )
  )
  with check (
    product_id in (
      select id from public.products where group_id = public.current_group_id()
    )
  );

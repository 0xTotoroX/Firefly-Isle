-- [INPUT]: 依赖 Supabase auth.users、PostgreSQL RLS 与 supabase/migrations 既有 owner RLS / updated_at trigger 模式。
-- [OUTPUT]: 对外提供 profiles 表、locale 约束、updated_at trigger、所有者 RLS policy 与新用户自动建档 security definer 触发器。
-- [POS]: supabase/migrations 的账户档案迁移，为 SaaS 账户设置提供 display_name / locale 偏好的数据库事实。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'zh',
  theme text not null default 'dark',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_locale_check check (locale in ('zh', 'en')),
  constraint profiles_theme_check check (theme in ('dark', 'light')),
  constraint profiles_display_name_length_check check (display_name is null or char_length(display_name) <= 60)
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (user_id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

-- 为每个新注册用户自动建立档案行；security definer 绕过 RLS 写入，且不暴露任何密钥。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

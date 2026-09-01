-- [INPUT]: 依赖 Supabase auth.users、PostgreSQL RLS 与 security definer RPC 能力。
-- [OUTPUT]: 对外提供 usage_events 用量台账、kind 索引、owner 只读 RLS 与 record_usage security definer RPC。
-- [POS]: supabase/migrations 的配额体系迁移，为跨 isolate 持久限流与后续 Dashboard 用量展示提供数据库事实。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  meta jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint usage_events_kind_check check (kind in ('llm_chat', 'ocr_document', 'record_share', 'export_account'))
);

create index if not exists usage_events_user_kind_created_idx
  on public.usage_events (user_id, kind, created_at desc);

alter table public.usage_events enable row level security;

drop policy if exists usage_events_select_own on public.usage_events;
create policy usage_events_select_own
  on public.usage_events
  for select
  using (user_id = auth.uid());

-- 台账只允许通过 RPC 写入：definer 权限以 auth.uid() 归属行，杜绝伪造他人 user_id 的直插。
create or replace function public.record_usage(event_kind text, event_meta jsonb default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into public.usage_events (user_id, kind, meta)
  values (auth.uid(), event_kind, event_meta);
end;
$$;

revoke all on function public.record_usage(text, jsonb) from public;
revoke all on function public.record_usage(text, jsonb) from anon;
grant execute on function public.record_usage(text, jsonb) to authenticated;

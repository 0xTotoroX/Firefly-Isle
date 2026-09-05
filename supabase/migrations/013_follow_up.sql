-- [INPUT]: 依赖 public.patients / auth.users、PostgreSQL RLS 与既有 owner CRUD 模式。
-- [OUTPUT]: 对外提供 follow_up_visits 随访就诊记录表（地点/医生/结论/下次安排）与 patients.follow_up_status 随访状态枚举列。
-- [POS]: supabase/migrations 的随访模块迁移，承载复查计划倒计时、随访记录与显式随访状态三个能力的数据事实。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

create table if not exists public.follow_up_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  visited_on date not null,
  location text,
  doctor text,
  conclusion text,
  next_plan text,
  next_visit_on date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint follow_up_visits_text_length_check check (
    char_length(coalesce(location, '')) <= 120
    and char_length(coalesce(doctor, '')) <= 120
    and char_length(coalesce(conclusion, '')) <= 2000
    and char_length(coalesce(next_plan, '')) <= 2000
  )
);

create index if not exists follow_up_visits_patient_date_idx
  on public.follow_up_visits (patient_id, visited_on desc);

alter table public.follow_up_visits enable row level security;

drop policy if exists follow_up_visits_select_own on public.follow_up_visits;
create policy follow_up_visits_select_own
  on public.follow_up_visits
  for select
  using (user_id = auth.uid());

drop policy if exists follow_up_visits_insert_own on public.follow_up_visits;
create policy follow_up_visits_insert_own
  on public.follow_up_visits
  for insert
  with check (user_id = auth.uid());

drop policy if exists follow_up_visits_update_own on public.follow_up_visits;
create policy follow_up_visits_update_own
  on public.follow_up_visits
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists follow_up_visits_delete_own on public.follow_up_visits;
create policy follow_up_visits_delete_own
  on public.follow_up_visits
  for delete
  using (user_id = auth.uid());

create or replace function public.set_follow_up_visits_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists follow_up_visits_set_updated_at on public.follow_up_visits;
create trigger follow_up_visits_set_updated_at
  before update on public.follow_up_visits
  for each row execute function public.set_follow_up_visits_updated_at();

alter table public.patients add column if not exists follow_up_status text;
alter table public.patients drop constraint if exists patients_follow_up_status_check;
alter table public.patients
  add constraint patients_follow_up_status_check
  check (follow_up_status in ('treating', 'paused', 'completed', 'lost'));

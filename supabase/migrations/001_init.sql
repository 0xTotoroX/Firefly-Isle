-- [INPUT]: 依赖 Supabase auth.users、pgcrypto extension 与 PostgreSQL RLS / trigger 能力。
-- [OUTPUT]: 对外提供 patients、treatment_lines 表、索引、RLS policy 与 updated_at trigger。
-- [POS]: supabase/migrations 的初始 schema 迁移，是 PatientRecord 持久化与用户隔离的数据库真相源。
-- [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
-- 建立 patients、treatment_lines、RLS 与 updated_at trigger 的 MVP 初始数据库边界。

create extension if not exists pgcrypto;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  basic_info jsonb not null default '{}'::jsonb,
  initial_onset jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.treatment_lines (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  line_number integer not null,
  start_date text,
  end_date text,
  regimen text,
  biopsy text,
  immunohistochemistry text,
  genetic_test text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (patient_id, line_number)
);

create index if not exists patients_user_id_idx on public.patients (user_id);
create index if not exists treatment_lines_patient_id_idx on public.treatment_lines (patient_id);

alter table public.patients enable row level security;
alter table public.treatment_lines enable row level security;

drop policy if exists patients_select_own on public.patients;
create policy patients_select_own
  on public.patients
  for select
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists patients_insert_own on public.patients;
create policy patients_insert_own
  on public.patients
  for insert
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists patients_update_own on public.patients;
create policy patients_update_own
  on public.patients
  for update
  using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists patients_delete_own on public.patients;
create policy patients_delete_own
  on public.patients
  for delete
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists treatment_lines_select_own on public.treatment_lines;
create policy treatment_lines_select_own
  on public.treatment_lines
  for select
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = treatment_lines.patient_id
        and public.patients.user_id = auth.uid()
    )
  );

drop policy if exists treatment_lines_insert_own on public.treatment_lines;
create policy treatment_lines_insert_own
  on public.treatment_lines
  for insert
  with check (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = treatment_lines.patient_id
        and public.patients.user_id = auth.uid()
    )
  );

drop policy if exists treatment_lines_update_own on public.treatment_lines;
create policy treatment_lines_update_own
  on public.treatment_lines
  for update
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = treatment_lines.patient_id
        and public.patients.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = treatment_lines.patient_id
        and public.patients.user_id = auth.uid()
    )
  );

drop policy if exists treatment_lines_delete_own on public.treatment_lines;
create policy treatment_lines_delete_own
  on public.treatment_lines
  for delete
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = treatment_lines.patient_id
        and public.patients.user_id = auth.uid()
    )
  );

create or replace function public.set_patients_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at
before update on public.patients
for each row
execute function public.set_patients_updated_at();

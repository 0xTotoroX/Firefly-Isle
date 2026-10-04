-- [INPUT]: 依赖 public.patients 所有权边界、PostgreSQL RLS 与 numeric/text 基础类型。
-- [OUTPUT]: 对外提供 lab_results 表、趋势查询索引、级联删除与基于 patients.user_id 的 RLS policy。
-- [POS]: supabase/migrations 的实验室指标扩展迁移，让 PatientRecord 的 labResults 拥有独立数据库事实。
-- [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
-- 建立实验室指标读数的独立存储与所有者隔离边界。

create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  test_date text,
  category text not null,
  item_code text not null,
  item_name text not null,
  value numeric not null,
  unit text,
  reference_low numeric,
  reference_high numeric,
  source text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists lab_results_patient_id_idx on public.lab_results (patient_id);
create index if not exists lab_results_patient_item_date_idx on public.lab_results (patient_id, item_code, test_date);

alter table public.lab_results enable row level security;

drop policy if exists lab_results_select_own on public.lab_results;
create policy lab_results_select_own
  on public.lab_results
  for select
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = lab_results.patient_id
        and public.patients.user_id = auth.uid()
    )
  );

drop policy if exists lab_results_insert_own on public.lab_results;
create policy lab_results_insert_own
  on public.lab_results
  for insert
  with check (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = lab_results.patient_id
        and public.patients.user_id = auth.uid()
    )
  );

drop policy if exists lab_results_update_own on public.lab_results;
create policy lab_results_update_own
  on public.lab_results
  for update
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = lab_results.patient_id
        and public.patients.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = lab_results.patient_id
        and public.patients.user_id = auth.uid()
    )
  );

drop policy if exists lab_results_delete_own on public.lab_results;
create policy lab_results_delete_own
  on public.lab_results
  for delete
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = lab_results.patient_id
        and public.patients.user_id = auth.uid()
    )
  );

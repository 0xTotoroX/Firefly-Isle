-- [INPUT]: 依赖 public.patients 所有权边界、public.lab_results 读数表、PostgreSQL RLS 与 updated_at trigger 能力。
-- [OUTPUT]: 对外提供 lab_report_batches 表，并为 lab_results 增加 batch_id、is_derived、derivation_method 扩展列与索引。
-- [POS]: supabase/migrations 的网页端实验室报告批次迁移，让一次上传/复核事实与多条实验室读数保持可审计关联。
-- [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
-- 将网页端实验室报告摄入拆成批次事实和读数事实，避免把报告级信息复制到每条指标里。

create table if not exists public.lab_report_batches (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  category text not null,
  test_date text,
  source_file_name text,
  source_mime_type text,
  source_storage_path text,
  ocr_text text,
  review_status text not null default 'confirmed',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists lab_report_batches_patient_id_idx on public.lab_report_batches (patient_id);
create index if not exists lab_report_batches_patient_category_date_idx on public.lab_report_batches (patient_id, category, test_date);

alter table public.lab_results
  add column if not exists batch_id uuid references public.lab_report_batches (id) on delete set null,
  add column if not exists is_derived boolean not null default false,
  add column if not exists derivation_method text;

create index if not exists lab_results_batch_id_idx on public.lab_results (batch_id);
create index if not exists lab_results_patient_category_date_idx on public.lab_results (patient_id, category, test_date);

alter table public.lab_report_batches enable row level security;

drop policy if exists lab_report_batches_select_own on public.lab_report_batches;
create policy lab_report_batches_select_own
  on public.lab_report_batches
  for select
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = lab_report_batches.patient_id
        and public.patients.user_id = auth.uid()
    )
  );

drop policy if exists lab_report_batches_insert_own on public.lab_report_batches;
create policy lab_report_batches_insert_own
  on public.lab_report_batches
  for insert
  with check (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = lab_report_batches.patient_id
        and public.patients.user_id = auth.uid()
    )
  );

drop policy if exists lab_report_batches_update_own on public.lab_report_batches;
create policy lab_report_batches_update_own
  on public.lab_report_batches
  for update
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = lab_report_batches.patient_id
        and public.patients.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = lab_report_batches.patient_id
        and public.patients.user_id = auth.uid()
    )
  );

drop policy if exists lab_report_batches_delete_own on public.lab_report_batches;
create policy lab_report_batches_delete_own
  on public.lab_report_batches
  for delete
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.patients
      where public.patients.id = lab_report_batches.patient_id
        and public.patients.user_id = auth.uid()
    )
  );

create or replace function public.set_lab_report_batches_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists lab_report_batches_set_updated_at on public.lab_report_batches;
create trigger lab_report_batches_set_updated_at
before update on public.lab_report_batches
for each row
execute function public.set_lab_report_batches_updated_at();

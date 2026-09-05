-- [INPUT]: 依赖 public.patients / public.treatment_lines、auth.users、PostgreSQL RLS 与既有 owner CRUD 模式。
-- [OUTPUT]: 对外提供 side_effects 患者副作用记录表：按病历/治疗线归因、严重程度枚举、日期顺序约束、owner 全权 RLS 与 updated_at trigger。
-- [POS]: supabase/migrations 的症状日志迁移，让患者能把治疗过程中的不适反应用结构化字段留存，作为病历的辅助证据。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

create table if not exists public.side_effects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  line_id uuid references public.treatment_lines (id) on delete set null,
  occurred_on date not null,
  resolved_on date,
  symptom text not null,
  severity text not null default 'mild',
  medication text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint side_effects_severity_check check (severity in ('mild', 'moderate', 'severe')),
  constraint side_effects_resolved_order_check check (resolved_on is null or resolved_on >= occurred_on),
  constraint side_effects_symptom_length_check check (char_length(symptom) <= 120),
  constraint side_effects_notes_length_check check (notes is null or char_length(notes) <= 2000)
);

create index if not exists side_effects_patient_date_idx
  on public.side_effects (patient_id, occurred_on desc);

alter table public.side_effects enable row level security;

drop policy if exists side_effects_select_own on public.side_effects;
create policy side_effects_select_own
  on public.side_effects
  for select
  using (user_id = auth.uid());

drop policy if exists side_effects_insert_own on public.side_effects;
create policy side_effects_insert_own
  on public.side_effects
  for insert
  with check (user_id = auth.uid());

drop policy if exists side_effects_update_own on public.side_effects;
create policy side_effects_update_own
  on public.side_effects
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists side_effects_delete_own on public.side_effects;
create policy side_effects_delete_own
  on public.side_effects
  for delete
  using (user_id = auth.uid());

create or replace function public.set_side_effects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists side_effects_set_updated_at on public.side_effects;
create trigger side_effects_set_updated_at
  before update on public.side_effects
  for each row execute function public.set_side_effects_updated_at();

-- [INPUT]: 依赖 public.patients、public.treatment_lines、public.lab_results、Supabase anon/authenticated roles、PostgreSQL RLS 与 security definer RPC 能力。
-- [OUTPUT]: 对外提供 record_shares 表、授权码 hash 查询函数、只读分享 RLS policy 与所有者管理 policy。
-- [POS]: supabase/migrations 的病历分享迁移，让单份 PatientRecord 能通过可撤销、可过期的授权码只读共享。
-- [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
-- 分享只保存授权码 hash；公开访问只拿到经函数验证后的 patient_id，病历数据仍由 RLS 限定为 active share。

create table if not exists public.record_shares (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists record_shares_patient_id_idx on public.record_shares (patient_id);
create index if not exists record_shares_owner_user_id_idx on public.record_shares (owner_user_id);
create index if not exists record_shares_active_patient_idx
  on public.record_shares (patient_id, expires_at)
  where revoked_at is null;

alter table public.record_shares enable row level security;

drop policy if exists record_shares_select_own on public.record_shares;
create policy record_shares_select_own
  on public.record_shares
  for select
  using (auth.uid() is not null and owner_user_id = auth.uid());

drop policy if exists record_shares_insert_own_patient on public.record_shares;
create policy record_shares_insert_own_patient
  on public.record_shares
  for insert
  with check (
    auth.uid() is not null
    and owner_user_id = auth.uid()
    and exists (
      select 1
      from public.patients
      where public.patients.id = record_shares.patient_id
        and public.patients.user_id = auth.uid()
    )
  );

drop policy if exists record_shares_update_own on public.record_shares;
create policy record_shares_update_own
  on public.record_shares
  for update
  using (auth.uid() is not null and owner_user_id = auth.uid())
  with check (auth.uid() is not null and owner_user_id = auth.uid());

drop policy if exists patients_select_shared on public.patients;
create policy patients_select_shared
  on public.patients
  for select
  using (
    exists (
      select 1
      from public.record_shares
      where public.record_shares.patient_id = patients.id
        and public.record_shares.revoked_at is null
        and public.record_shares.expires_at > now()
    )
  );

drop policy if exists treatment_lines_select_shared on public.treatment_lines;
create policy treatment_lines_select_shared
  on public.treatment_lines
  for select
  using (
    exists (
      select 1
      from public.record_shares
      where public.record_shares.patient_id = treatment_lines.patient_id
        and public.record_shares.revoked_at is null
        and public.record_shares.expires_at > now()
    )
  );

drop policy if exists lab_results_select_shared on public.lab_results;
create policy lab_results_select_shared
  on public.lab_results
  for select
  using (
    exists (
      select 1
      from public.record_shares
      where public.record_shares.patient_id = lab_results.patient_id
        and public.record_shares.revoked_at is null
        and public.record_shares.expires_at > now()
    )
  );

create or replace function public.get_record_share_access(share_code_hash text)
returns table(status text, patient_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  share_row record;
begin
  if share_code_hash is null or share_code_hash !~ '^[a-f0-9]{64}$' then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  select record_shares.patient_id, record_shares.expires_at, record_shares.revoked_at
  into share_row
  from public.record_shares
  where record_shares.code_hash = share_code_hash
  limit 1;

  if not found then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  if share_row.revoked_at is not null then
    return query select 'revoked'::text, null::uuid;
    return;
  end if;

  if share_row.expires_at <= now() then
    return query select 'expired'::text, null::uuid;
    return;
  end if;

  return query select 'active'::text, share_row.patient_id::uuid;
end;
$$;

revoke all on function public.get_record_share_access(text) from public;
grant execute on function public.get_record_share_access(text) to anon, authenticated;

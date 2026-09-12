-- [INPUT]: 依赖 patients、treatment_lines、lab_results、side_effects、follow_up_visits 与 auth.uid()。
-- [OUTPUT]: 症状/随访 owner 默认值及患者归属 RLS、写入校验、最新指标/随访 invoker RPC。
-- [POS]: 追加迁移，保护既有有效数据；NOT VALID 约束不重写历史数据，但约束后续写入。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

alter table public.side_effects alter column user_id set default auth.uid();
alter table public.follow_up_visits alter column user_id set default auth.uid();

alter table public.side_effects drop constraint if exists side_effects_symptom_nonempty_check;
alter table public.side_effects add constraint side_effects_symptom_nonempty_check
  check (char_length(btrim(symptom)) > 0) not valid;
alter table public.follow_up_visits drop constraint if exists follow_up_visits_date_order_check;
alter table public.follow_up_visits add constraint follow_up_visits_date_order_check
  check (next_visit_on is null or next_visit_on >= visited_on) not valid;

drop policy if exists side_effects_select_own on public.side_effects;
create policy side_effects_select_own on public.side_effects for select to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.patients p where p.id = side_effects.patient_id and p.user_id = (select auth.uid())
  ));
drop policy if exists side_effects_insert_own on public.side_effects;
create policy side_effects_insert_own on public.side_effects for insert to authenticated
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.patients p where p.id = side_effects.patient_id and p.user_id = (select auth.uid())
    ) and (line_id is null or exists (
      select 1 from public.treatment_lines t where t.id = side_effects.line_id and t.patient_id = side_effects.patient_id
    ))
  );
drop policy if exists side_effects_update_own on public.side_effects;
create policy side_effects_update_own on public.side_effects for update to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.patients p where p.id = side_effects.patient_id and p.user_id = (select auth.uid())
  ))
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.patients p where p.id = side_effects.patient_id and p.user_id = (select auth.uid())
    ) and (line_id is null or exists (
      select 1 from public.treatment_lines t where t.id = side_effects.line_id and t.patient_id = side_effects.patient_id
    ))
  );
drop policy if exists side_effects_delete_own on public.side_effects;
create policy side_effects_delete_own on public.side_effects for delete to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.patients p where p.id = side_effects.patient_id and p.user_id = (select auth.uid())
  ));

drop policy if exists follow_up_visits_select_own on public.follow_up_visits;
create policy follow_up_visits_select_own on public.follow_up_visits for select to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.patients p where p.id = follow_up_visits.patient_id and p.user_id = (select auth.uid())
  ));
drop policy if exists follow_up_visits_insert_own on public.follow_up_visits;
create policy follow_up_visits_insert_own on public.follow_up_visits for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.patients p where p.id = follow_up_visits.patient_id and p.user_id = (select auth.uid())
  ));
drop policy if exists follow_up_visits_update_own on public.follow_up_visits;
create policy follow_up_visits_update_own on public.follow_up_visits for update to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.patients p where p.id = follow_up_visits.patient_id and p.user_id = (select auth.uid())
  ))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.patients p where p.id = follow_up_visits.patient_id and p.user_id = (select auth.uid())
  ));
drop policy if exists follow_up_visits_delete_own on public.follow_up_visits;
create policy follow_up_visits_delete_own on public.follow_up_visits for delete to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.patients p where p.id = follow_up_visits.patient_id and p.user_id = (select auth.uid())
  ));

grant select, insert, update, delete on public.side_effects, public.follow_up_visits to authenticated;

create index if not exists lab_results_latest_indicator_idx
  on public.lab_results (patient_id, category, item_code, (nullif(test_date, '')) desc nulls last, created_at desc, id desc);

create or replace function public.dashboard_recent_abnormal_readings()
returns table (
  id uuid, patient_id uuid, item_name text, value numeric, unit text,
  reference_low numeric, reference_high numeric, test_date text, created_at timestamptz
)
language sql stable security invoker set search_path = ''
as $$
  with latest as (
    select distinct on (l.patient_id, l.category, l.item_code)
      l.id, l.patient_id, l.item_name, l.value, l.unit,
      l.reference_low, l.reference_high, l.test_date, l.created_at
    from public.lab_results l
    join public.patients p on p.id = l.patient_id
    where p.user_id = (select auth.uid())
    order by l.patient_id, l.category, l.item_code, nullif(l.test_date, '') desc nulls last, l.created_at desc, l.id desc
  )
  select * from latest
  where (reference_high is not null and value > reference_high)
     or (reference_low is not null and value < reference_low)
  order by nullif(test_date, '') desc nulls last, created_at desc, id desc
  limit 4;
$$;

create or replace function public.dashboard_next_follow_up()
returns table (patient_id uuid, next_visit_on date)
language sql stable security invoker set search_path = ''
as $$
  with latest as (
    select distinct on (v.patient_id) v.patient_id, v.next_visit_on
    from public.follow_up_visits v
    join public.patients p on p.id = v.patient_id
    where p.user_id = (select auth.uid())
      and coalesce(p.follow_up_status, 'treating') not in ('completed', 'lost')
    order by v.patient_id, v.visited_on desc, v.created_at desc, v.id desc
  )
  select * from latest where next_visit_on is not null
  order by next_visit_on, patient_id limit 1;
$$;

revoke all on function public.dashboard_recent_abnormal_readings() from public, anon;
revoke all on function public.dashboard_next_follow_up() from public, anon;
grant execute on function public.dashboard_recent_abnormal_readings() to authenticated;
grant execute on function public.dashboard_next_follow_up() to authenticated;

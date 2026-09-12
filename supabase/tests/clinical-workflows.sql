-- [INPUT]: 隔离 PostgreSQL 中的真实迁移、两个合成账号和三份合成病历。
-- [OUTPUT]: owner CRUD、跨患者拒绝、日期约束、最新指标和随访 RPC 的行为断言。
-- [POS]: scripts/check-clinical-workflows.sh 专用数据库回归；全部测试在事务中回滚。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
begin;
insert into auth.users (id) values ('10000000-0000-4000-8000-000000000001'), ('10000000-0000-4000-8000-000000000002');
insert into public.patients (id, user_id) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002');
insert into public.treatment_lines (id, patient_id, line_number) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

-- Default owner and editable-fields-only updates work with the actual constraints.
insert into public.follow_up_visits (id, patient_id, visited_on, next_visit_on) values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '2026-09-01', '2026-09-10');
update public.follow_up_visits set conclusion = 'Updated synthetic note' where id = '40000000-0000-4000-8000-000000000001';
insert into public.side_effects (id, patient_id, line_id, occurred_on, symptom) values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '2026-09-01', 'Synthetic symptom');

do $$
begin
  if not exists (select 1 from public.follow_up_visits where conclusion = 'Updated synthetic note'
    and patient_id = '20000000-0000-4000-8000-000000000001' and user_id = auth.uid()) then
    raise exception 'Owner create/edit/read contract failed';
  end if;
  begin
    insert into public.follow_up_visits (patient_id, visited_on) values ('20000000-0000-4000-8000-000000000003', '2026-09-01');
    raise exception 'Cross-owner patient accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.follow_up_visits (user_id, patient_id, visited_on) values
      ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '2026-09-01');
    raise exception 'Spoofed owner accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.side_effects set line_id = '30000000-0000-4000-8000-000000000002'
      where id = '50000000-0000-4000-8000-000000000001';
    raise exception 'Unrelated treatment line accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.follow_up_visits set next_visit_on = '2026-08-31' where id = '40000000-0000-4000-8000-000000000001';
    raise exception 'Reversed visit dates accepted';
  exception when check_violation then null; end;
  begin
    update public.side_effects set symptom = '   ' where id = '50000000-0000-4000-8000-000000000001';
    raise exception 'Blank symptom accepted';
  exception when check_violation then null; end;
end;
$$;

-- Older imports cannot resurrect a normalized indicator, and separate patients keep their own latest reading.
insert into public.lab_results (patient_id, category, item_code, item_name, value, reference_high, test_date, created_at) values
  ('20000000-0000-4000-8000-000000000001', 'biochemistry', 'ALT', 'ALT', 20, 40, '2026-09-10', '2026-09-10'),
  ('20000000-0000-4000-8000-000000000001', 'biochemistry', 'ALT', 'ALT', 80, 40, '2026-08-01', '2026-09-12'),
  ('20000000-0000-4000-8000-000000000001', 'blood_routine', 'WBC', 'White cells', 12, 10, '2026-09-11', '2026-09-11'),
  ('20000000-0000-4000-8000-000000000002', 'blood_routine', 'WBC', 'White cells', 15, 10, '2026-09-11', '2026-09-11');

do $$
begin
  if (select count(*) from public.dashboard_recent_abnormal_readings()) <> 2 then
    raise exception 'Latest-per-patient abnormal aggregation failed';
  end if;
  if exists (select 1 from public.dashboard_recent_abnormal_readings() where item_name = 'ALT') then
    raise exception 'Older imported abnormal result resurfaced';
  end if;
  if not exists (select 1 from public.dashboard_next_follow_up() where next_visit_on = '2026-09-10') then
    raise exception 'Overdue follow-up was hidden';
  end if;
end;
$$;

insert into public.follow_up_visits (patient_id, visited_on, next_visit_on) values
  ('20000000-0000-4000-8000-000000000001', '2026-09-11', null),
  ('20000000-0000-4000-8000-000000000002', '2026-09-12', '2026-09-25');
do $$
begin
  if not exists (select 1 from public.dashboard_next_follow_up() where next_visit_on = '2026-09-25') then
    raise exception 'A newer visit did not supersede the old plan';
  end if;
end;
$$;
update public.patients set follow_up_status = 'completed' where id = '20000000-0000-4000-8000-000000000002';
do $$
begin
  if exists (select 1 from public.dashboard_next_follow_up()) then raise exception 'Completed follow-up still reminded'; end if;
end;
$$;

-- A second authenticated user sees no first-owner records or RPC results.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
do $$
declare changed integer;
begin
  if exists (select 1 from public.follow_up_visits) or exists (select 1 from public.side_effects)
    or exists (select 1 from public.dashboard_recent_abnormal_readings())
    or exists (select 1 from public.dashboard_next_follow_up()) then raise exception 'Owner isolation failed'; end if;
  update public.follow_up_visits set conclusion = 'Forbidden' where id = '40000000-0000-4000-8000-000000000001';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Cross-owner write succeeded'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
delete from public.side_effects where id = '50000000-0000-4000-8000-000000000001';
do $$
begin
  if exists (select 1 from public.side_effects) then raise exception 'Owner delete failed'; end if;
end;
$$;
rollback;
select 'Clinical workflow database checks passed' as result;

-- Run immediately after migrations, before the test runner broadens table grants.
-- This checks real privileges and usable application writes, not migration text.
begin;
do $$
declare entry record; action text; expected boolean; callable boolean;
begin
  if not has_schema_privilege('anon', 'public', 'USAGE')
    or not has_schema_privilege('authenticated', 'public', 'USAGE') then
    raise exception 'Data API schema usage missing';
  end if;
  for entry in select * from (values
    ('patients', true, true, true), ('treatment_lines', true, true, true),
    ('lab_results', true, true, true), ('lab_report_batches', true, true, true),
    ('llm_provider_settings', true, true, true), ('side_effects', true, true, true),
    ('follow_up_visits', true, true, true), ('profiles', true, true, false),
    ('record_shares', true, false, false), ('usage_events', false, false, false),
    ('plans', false, false, false), ('subscriptions', false, false, false),
    ('donations', false, false, false)
  ) as permissions(table_name, can_insert, can_update, can_delete) loop
    foreach action in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      expected := case action when 'SELECT' then true when 'INSERT' then entry.can_insert
        when 'UPDATE' then entry.can_update when 'DELETE' then entry.can_delete else false end;
      if has_table_privilege('authenticated', 'public.' || entry.table_name, action) is distinct from expected then
        raise exception 'Incorrect authenticated % grant on %', action, entry.table_name;
      end if;
      if has_table_privilege('anon', 'public.' || entry.table_name, action) then
        raise exception 'Anonymous table access granted: % %', action, entry.table_name;
      end if;
    end loop;
  end loop;
  for entry in select attname from pg_attribute
    where attrelid = 'public.record_shares'::regclass and attnum > 0 and not attisdropped loop
    if has_column_privilege('authenticated', 'public.record_shares', entry.attname, 'UPDATE')
      is distinct from (entry.attname = 'revoked_at') then
      raise exception 'Incorrect share column UPDATE grant: %', entry.attname;
    end if;
  end loop;
  for entry in select * from (values
    ('patient_record_document(uuid)', true, false),
    ('persist_patient_record(uuid,jsonb,uuid)', true, false),
    ('save_lab_report_batch(jsonb,jsonb,boolean)', true, false),
    ('dashboard_recent_abnormal_readings()', true, false),
    ('dashboard_next_follow_up()', true, false), ('consume_usage(text)', true, false),
    ('delete_own_account()', true, false), ('get_shared_patient_record(text)', true, true),
    ('record_usage(text,jsonb)', false, false),
    ('record_donation_payment(text,text,uuid,integer,text,text)', false, false),
    ('set_patients_updated_at()', false, false), ('set_lab_report_batches_updated_at()', false, false),
    ('set_llm_provider_settings_updated_at()', false, false), ('set_profiles_updated_at()', false, false),
    ('handle_new_user()', false, false), ('set_side_effects_updated_at()', false, false),
    ('set_follow_up_visits_updated_at()', false, false)
  ) as functions(signature, authenticated_execute, anon_execute) loop
    callable := has_function_privilege('authenticated', 'public.' || entry.signature, 'EXECUTE');
    if callable is distinct from entry.authenticated_execute
      or has_function_privilege('anon', 'public.' || entry.signature, 'EXECUTE') is distinct from entry.anon_execute then
      raise exception 'Incorrect function execute grant: %', entry.signature;
    end if;
  end loop;
  if not has_function_privilege('service_role',
    'public.record_donation_payment(text,text,uuid,integer,text,text)', 'EXECUTE') then
    raise exception 'Webhook RPC grant missing';
  end if;
end $$;

insert into auth.users(id) values ('b0000000-0000-4000-8000-000000000001');
set local role authenticated;
set local request.jwt.claim.sub = 'b0000000-0000-4000-8000-000000000001';
-- UUID defaults, triggers and real conflict updates must work without sequence or
-- trigger-function EXECUTE grants. These match the application persistence paths.
insert into public.profiles(user_id, display_name) values(auth.uid(), 'Synthetic name')
  on conflict(user_id) do update set display_name = excluded.display_name;
select public.persist_patient_record(auth.uid(), '{"basicInfo":{"name":"Synthetic patient"},"treatmentLines":[{"lineNumber":1,"regimen":"Synthetic"}]}',
  'b0000000-0000-4000-8000-000000000011');
select public.save_lab_report_batch('{"patient_id":"b0000000-0000-4000-8000-000000000011","category":"blood_routine","test_date":"2026-10-02"}',
  '[{"item_code":"wbc","item_name":"WBC","value":5}]');
insert into public.llm_provider_settings(user_id, provider, model, api_key_ciphertext, api_key_iv)
  values(auth.uid(), 'deepseek', 'synthetic', 'synthetic', 'synthetic');
update public.llm_provider_settings set model = 'changed' where user_id = auth.uid();
delete from public.llm_provider_settings where user_id = auth.uid();
insert into public.record_shares(patient_id, owner_user_id, code_hash, expires_at)
  values('b0000000-0000-4000-8000-000000000011', auth.uid(), repeat('e',64), now()+interval '1 day');
insert into public.side_effects(patient_id, symptom, occurred_on)
  values('b0000000-0000-4000-8000-000000000011', 'Synthetic symptom', '2026-10-02');
insert into public.follow_up_visits(patient_id, visited_on)
  values('b0000000-0000-4000-8000-000000000011', '2026-10-02');
select * from public.dashboard_recent_abnormal_readings();
select * from public.dashboard_next_follow_up();
select public.consume_usage('llm_chat');
do $$ declare table_name text; begin
  foreach table_name in array array['profiles','patients','treatment_lines','lab_results','lab_report_batches',
    'llm_provider_settings','record_shares','side_effects','follow_up_visits','usage_events','plans','subscriptions','donations'] loop
    execute format('select * from public.%I limit 1', table_name);
  end loop;
end $$;

set local role anon;
set local request.jwt.claim.sub = '';
do $$ begin
  if public.get_shared_patient_record(repeat('e',64))->>'status' <> 'active' then
    raise exception 'Share RPC failed without anonymous table grants';
  end if;
  begin
    perform 1 from public.patients;
    raise exception 'Anonymous direct table read succeeded';
  exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
set local request.jwt.claim.sub = 'b0000000-0000-4000-8000-000000000001';
update public.record_shares set revoked_at = now() where code_hash = repeat('e',64);
select public.delete_own_account();
reset role;
do $$ begin
  if exists(select 1 from public.patients where id = 'b0000000-0000-4000-8000-000000000011') then
    raise exception 'Deletion failed under explicit grants';
  end if;
end $$;
rollback;
select 'Data API minimum permission checks passed' as result;

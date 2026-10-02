-- [INPUT]: 空库中的全部业务迁移、最小 auth 替身与三个合成账号。
-- [OUTPUT]: 全表 RLS、自动建档、匿名账号隔离及注销数据去向的真实 SQL 行为断言。
-- [POS]: 隔离数据库检查入口；只验证应用数据库，不代替 GoTrue/邮件/会话的端到端验收。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
begin;

-- Use the owner UUID as each fixture's primary key to check every table directly,
-- including child rows after their parent has been deleted.
insert into auth.users (id, is_anonymous) values
  ('a0000000-0000-4000-8000-000000000001', false),
  ('a0000000-0000-4000-8000-000000000002', false),
  ('a0000000-0000-4000-8000-000000000003', true);

do $$ begin
  if (select count(*) from public.profiles where locale = 'zh' and theme = 'dark') <> 3 then
    raise exception 'new regular/anonymous users did not receive default profiles';
  end if;
end $$;

insert into public.patients (id, user_id, basic_info)
select id, id, jsonb_build_object('name', 'Synthetic patient') from auth.users;
insert into public.treatment_lines (id, patient_id, line_number, regimen)
select id, id, 1, 'Synthetic regimen' from auth.users;
insert into public.lab_report_batches (id, patient_id, category, test_date)
select id, id, 'blood_routine', '2026-10-01' from auth.users;
insert into public.lab_results (id, patient_id, batch_id, category, item_code, item_name, value)
select id, id, id, 'blood_routine', 'WBC', 'White cells', 5 from auth.users;
insert into public.llm_provider_settings (id, user_id, provider, model, api_key_ciphertext, api_key_iv)
select id, id, 'deepseek', 'synthetic-model', 'synthetic-ciphertext', 'synthetic-iv' from auth.users;
insert into public.record_shares (id, patient_id, owner_user_id, code_hash, expires_at)
select id, id, id, encode(digest(id::text, 'sha256'), 'hex'), now() + interval '1 day' from auth.users;
insert into public.usage_events (id, user_id, kind)
select id, id, 'llm_chat' from auth.users;
insert into public.subscriptions (id, user_id, plan_id, status, current_period_end)
select id, id, 'pro', 'active', now() + interval '1 day' from auth.users;
insert into public.donations (id, user_id, amount_cents, status, stripe_checkout_session_id)
select id, id, 1500, 'paid', 'synthetic_' || id::text from auth.users;
insert into public.side_effects (id, user_id, patient_id, line_id, occurred_on, symptom)
select id, id, id, id, '2026-10-01', 'Synthetic symptom' from auth.users;
insert into public.follow_up_visits (id, user_id, patient_id, visited_on, next_visit_on)
select id, id, id, '2026-10-01', '2026-10-15' from auth.users;

-- Capture synthetic rows before assuming API roles, so cross-owner INSERT tests
-- can use a valid row without depending on the SELECT policy they are testing.
create temporary table account_fixtures (
  relation_name text primary key,
  primary_column text not null,
  mutable_column text not null,
  owner_column text not null,
  other_row jsonb not null
);
do $$
declare entry record; row_data jsonb;
begin
  for entry in select * from (values
    ('patients', 'id', 'basic_info', 'user_id'),
    ('treatment_lines', 'id', 'regimen', 'patient_id'),
    ('lab_results', 'id', 'value', 'patient_id'),
    ('lab_report_batches', 'id', 'review_status', 'patient_id'),
    ('llm_provider_settings', 'id', 'model', 'user_id'),
    ('record_shares', 'id', 'revoked_at', 'owner_user_id'),
    ('profiles', 'user_id', 'display_name', 'user_id'),
    ('usage_events', 'id', 'meta', 'user_id'),
    ('subscriptions', 'id', 'status', 'user_id'),
    ('donations', 'id', 'status', 'user_id'),
    ('side_effects', 'id', 'symptom', 'patient_id'),
    ('follow_up_visits', 'id', 'conclusion', 'patient_id')
  ) as tables(relation_name, primary_column, mutable_column, owner_column) loop
    if not (select relrowsecurity from pg_class
      where oid = format('public.%I', entry.relation_name)::regclass) then
      raise exception 'RLS not enabled on %', entry.relation_name;
    end if;
    execute format('select to_jsonb(t) from public.%I t where %I = $1', entry.relation_name, entry.primary_column)
      into row_data using 'a0000000-0000-4000-8000-000000000002'::uuid;
    insert into account_fixtures values (entry.relation_name, entry.primary_column, entry.mutable_column, entry.owner_column, row_data);
  end loop;
  if not (select relrowsecurity from pg_class where oid = 'public.plans'::regclass) then
    raise exception 'RLS not enabled on plans';
  end if;
end $$;
grant select on account_fixtures to authenticated, anon;

create function pg_temp.assert_visible_account(expected_owner uuid)
returns void language plpgsql as $$
declare entry record; visible_count integer; expected_count integer;
begin
  for entry in select * from account_fixtures loop
    execute format('select count(*), count(*) filter (where %I = $1) from public.%I', entry.primary_column, entry.relation_name)
      into visible_count, expected_count using expected_owner;
    if visible_count <> (case when expected_owner is null then 0 else 1 end)
      or expected_count <> visible_count then
      raise exception 'unexpected visible rows on % for %: total %, owner %', entry.relation_name, expected_owner, visible_count, expected_count;
    end if;
  end loop;
end $$;

set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select pg_temp.assert_visible_account(auth.uid());

-- Every table rejects inserting another user's row and hides their rows from
-- UPDATE/DELETE, even though both API roles have the underlying table grants.
do $$
declare entry record; changed integer; forged_row jsonb;
begin
  for entry in select * from account_fixtures loop
    forged_row := entry.other_row;
    if entry.primary_column = 'id' then
      forged_row := jsonb_set(forged_row, '{id}', to_jsonb(gen_random_uuid()::text));
    end if;
    begin
      execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', entry.relation_name, entry.relation_name)
        using forged_row;
      raise exception 'cross-owner INSERT accepted on %', entry.relation_name;
    exception when insufficient_privilege then null; end;
    execute format('update public.%I set %I = %I where %I = $1', entry.relation_name, entry.mutable_column, entry.mutable_column, entry.primary_column)
      using 'a0000000-0000-4000-8000-000000000002'::uuid;
    get diagnostics changed = row_count;
    if changed <> 0 then raise exception 'cross-owner UPDATE accepted on %', entry.relation_name; end if;
    execute format('delete from public.%I where %I = $1', entry.relation_name, entry.primary_column)
      using 'a0000000-0000-4000-8000-000000000002'::uuid;
    get diagnostics changed = row_count;
    if changed <> 0 then raise exception 'cross-owner DELETE accepted on %', entry.relation_name; end if;
  end loop;

  -- Ownership cannot be reassigned to another account/patient via an owned row.
  for entry in select * from account_fixtures where relation_name not in ('usage_events', 'subscriptions', 'donations') loop
    begin
      execute format('update public.%I set %I = $1 where %I = $2', entry.relation_name, entry.owner_column, entry.primary_column)
        using 'a0000000-0000-4000-8000-000000000002'::uuid, auth.uid();
      raise exception 'ownership reassignment accepted on %', entry.relation_name;
    exception when insufficient_privilege then null; end;
  end loop;

  -- These tables are owner-readable but only server-controlled writes are valid.
  for entry in select * from account_fixtures where relation_name in ('usage_events', 'subscriptions', 'donations') loop
    forged_row := entry.other_row || jsonb_build_object('id', gen_random_uuid(), 'user_id', auth.uid());
    begin
      execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', entry.relation_name, entry.relation_name)
        using forged_row;
      raise exception 'client INSERT accepted on read-only %', entry.relation_name;
    exception when insufficient_privilege then null; end;
    execute format('update public.%I set %I = %I where id = $1', entry.relation_name, entry.mutable_column, entry.mutable_column) using auth.uid();
    get diagnostics changed = row_count;
    if changed <> 0 then raise exception 'client UPDATE accepted on read-only %', entry.relation_name; end if;
    execute format('delete from public.%I where id = $1', entry.relation_name) using auth.uid();
    get diagnostics changed = row_count;
    if changed <> 0 then raise exception 'client DELETE accepted on read-only %', entry.relation_name; end if;
  end loop;
  begin
    insert into public.plans values ('forged', 'Forged', 99999, 99999, 0, 'usd');
    raise exception 'client created a plan';
  exception when insufficient_privilege then null; end;
  begin
    update public.plans set ai_chat_quota = 99999 where id = 'free';
    raise exception 'client changed a plan';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.plans where id = 'donation';
    raise exception 'client deleted a plan';
  exception when insufficient_privilege then null; end;
end $$;

-- Positive controls for the previously omitted provider/profile migrations.
update public.profiles set display_name = 'Synthetic owner', locale = 'en', theme = 'light' where user_id = auth.uid();
update public.llm_provider_settings set model = 'synthetic-updated' where user_id = auth.uid();
do $$ begin
  if not exists (select 1 from public.profiles where user_id = auth.uid()
    and display_name = 'Synthetic owner' and locale = 'en' and theme = 'light') then
    raise exception 'owner profile update failed';
  end if;
  if not exists (select 1 from public.llm_provider_settings where user_id = auth.uid() and model = 'synthetic-updated') then
    raise exception 'owner provider settings update failed';
  end if;
end $$;
delete from public.llm_provider_settings where user_id = auth.uid();
do $$ begin
  if exists (select 1 from public.llm_provider_settings) then raise exception 'owner provider settings delete failed'; end if;
end $$;
insert into public.llm_provider_settings (id, user_id, provider, model, api_key_ciphertext, api_key_iv)
values (auth.uid(), auth.uid(), 'deepseek', 'synthetic-model', 'synthetic-ciphertext', 'synthetic-iv');
select pg_temp.assert_visible_account(auth.uid());

set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';
select pg_temp.assert_visible_account(auth.uid());
-- Anonymous sign-in uses authenticated, with an actual isolated user id.
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000003';
select pg_temp.assert_visible_account(auth.uid());
set local request.jwt.claim.sub = '';
select pg_temp.assert_visible_account(null);
do $$ begin
  begin
    perform public.delete_own_account();
    raise exception 'missing identity deleted an account';
  exception when raise_exception then
    if sqlerrm <> 'AUTH_REQUIRED' then raise; end if;
  end;
end $$;
set local role anon;
select pg_temp.assert_visible_account(null);
do $$ begin
  begin
    perform public.delete_own_account();
    raise exception 'unauthenticated role deleted an account';
  exception when insufficient_privilege then null; end;
  if public.get_shared_patient_record(encode(digest('a0000000-0000-4000-8000-000000000001', 'sha256'), 'hex'))->>'status' <> 'active' then
    raise exception 'valid share positive control failed';
  end if;
end $$;

set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select public.delete_own_account();
select pg_temp.assert_visible_account(null);
reset role;
do $$
declare entry record; remaining integer;
begin
  if exists (select 1 from auth.users where id = 'a0000000-0000-4000-8000-000000000001') then
    raise exception 'account row survived deletion';
  end if;
  if (select count(*) from auth.users) <> 2 then raise exception 'another account was deleted'; end if;
  for entry in select * from account_fixtures where relation_name <> 'donations' loop
    execute format('select count(*) from public.%I where %I = $1', entry.relation_name, entry.primary_column)
      into remaining using 'a0000000-0000-4000-8000-000000000001'::uuid;
    if remaining <> 0 then raise exception 'deleted account data survived in %', entry.relation_name; end if;
  end loop;
  if not exists (select 1 from public.donations where id = 'a0000000-0000-4000-8000-000000000001'
    and user_id is null and amount_cents = 1500 and status = 'paid'
    and stripe_checkout_session_id = 'synthetic_a0000000-0000-4000-8000-000000000001') then
    raise exception 'donation was not retained with the account link removed';
  end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';
select pg_temp.assert_visible_account(auth.uid());
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000003';
select pg_temp.assert_visible_account(auth.uid());
set local role anon;
set local request.jwt.claim.sub = '';
do $$ begin
  if public.get_shared_patient_record(encode(digest('a0000000-0000-4000-8000-000000000001', 'sha256'), 'hex'))
    <> '{"status":"unavailable","record":null}'::jsonb then
    raise exception 'deleted account remained accessible through its share';
  end if;
end $$;
rollback;
select 'Account isolation and deletion database checks passed' as result;

-- Real PostgreSQL behavior checks; fixtures never leave this transaction.
begin;
create function pg_temp.assert_quota(actual jsonb, expected_allowed boolean, expected_reason text)
returns void language plpgsql as $$
begin
  if actual is distinct from jsonb_build_object('allowed', expected_allowed, 'reason', expected_reason) then
    raise exception 'unexpected usage decision: %', actual;
  end if;
end;
$$;

insert into auth.users (id, is_anonymous)
select ('90000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, n = 3
from generate_series(1, 10) n;
insert into public.subscriptions (user_id, plan_id, status, current_period_end)
select ('90000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, 'pro',
  case when n = 5 then 'canceled' when n = 6 then 'trialing' else 'active' end,
  case when n = 4 then now() - interval '1 day' when n = 10 then null else now() + interval '1 day' end
from unnest(array[2,4,5,6,7,8,10]) n;
insert into public.usage_events (user_id, kind, created_at)
select ('90000000-0000-0000-0000-' || lpad(f.user_no::text, 12, '0'))::uuid, f.kind, now() - f.age
from (values
  (1, 'llm_chat', 49, interval '2 minutes'), (1, 'ocr_document', 19, interval '2 minutes'),
  (2, 'llm_chat', 60, interval '0 minutes'), (3, 'llm_chat', 10, interval '0 minutes'),
  (4, 'llm_chat', 50, interval '2 minutes'), (5, 'llm_chat', 50, interval '2 minutes'),
  (6, 'llm_chat', 50, interval '2 minutes'), (7, 'llm_chat', 1000, interval '2 minutes'),
  (7, 'ocr_document', 200, interval '2 minutes'), (8, 'ocr_document', 20, interval '0 minutes'),
  (9, 'llm_chat', 50, interval '31 days'), (10, 'llm_chat', 50, interval '2 minutes')
) as f(user_no, kind, event_count, age)
cross join lateral generate_series(1, f.event_count);

set local role authenticated;
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000001';
select pg_temp.assert_quota(public.consume_usage('llm_chat'), true, null);
select pg_temp.assert_quota(public.consume_usage('llm_chat'), false, 'quota');
select pg_temp.assert_quota(public.consume_usage('ocr_document'), true, null);
select pg_temp.assert_quota(public.consume_usage('ocr_document'), false, 'quota');
do $$ begin
  if (select count(*) from public.usage_events where kind = 'llm_chat') <> 50 then
    raise exception 'rejected request added usage or owner RLS leaked another user';
  end if;
  begin
    update public.plans set ai_chat_quota = 99999 where id = 'free';
    raise exception 'client changed quota';
  exception when insufficient_privilege then null; end;
  begin
    perform public.record_usage('llm_chat');
    raise exception 'old unchecked ledger RPC is callable';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.usage_events (user_id, kind) values (auth.uid(), 'llm_chat');
    raise exception 'client bypassed quota RPC';
  exception when insufficient_privilege then null; end;
  begin
    perform public.consume_usage('export_account');
    raise exception 'unsupported kind accepted';
  exception when invalid_parameter_value then null; end;
end $$;
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000002';
select pg_temp.assert_quota(public.consume_usage('llm_chat'), false, 'window');
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000003';
select pg_temp.assert_quota(public.consume_usage('llm_chat'), false, 'window');
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000004';
select pg_temp.assert_quota(public.consume_usage('llm_chat'), false, 'quota');
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000005';
select pg_temp.assert_quota(public.consume_usage('llm_chat'), false, 'quota');
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000006';
select pg_temp.assert_quota(public.consume_usage('llm_chat'), true, null);
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000007';
select pg_temp.assert_quota(public.consume_usage('llm_chat'), false, 'quota');
select pg_temp.assert_quota(public.consume_usage('ocr_document'), false, 'quota');
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000008';
select pg_temp.assert_quota(public.consume_usage('ocr_document'), false, 'window');
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000009';
select pg_temp.assert_quota(public.consume_usage('llm_chat'), true, null);
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000010';
select pg_temp.assert_quota(public.consume_usage('llm_chat'), false, 'quota');
set local request.jwt.claim.sub = '';
do $$ begin
  begin
    perform public.consume_usage('llm_chat');
    raise exception 'missing identity accepted';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin
    perform public.consume_usage('llm_chat');
    raise exception 'unauthenticated role can consume';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

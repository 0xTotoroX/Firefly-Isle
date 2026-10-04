#!/usr/bin/env bash
# [INPUT]: Docker 和已缓存的 postgres:18-alpine；仅在无网络临时容器内运行。
# [OUTPUT]: 全部迁移与最小 API 授权、账户隔离/注销、临床数据、分享及创建/配额/捐赠并发回归结果。
# [POS]: 可重复的隔离数据库测试入口，不读取 Supabase 配置或远端凭据。
# [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
set -euo pipefail
task_root=$(cd "$(dirname "$0")/.." && pwd)
task_container="firefly-db-test-$$"
trap 'docker rm -f "$task_container" >/dev/null 2>&1 || true' EXIT
docker run --detach --rm --pull never --name "$task_container" --network none \
  --env POSTGRES_HOST_AUTH_METHOD=trust --tmpfs /var/lib/postgresql postgres:18-alpine >/dev/null
for task_attempt in {1..30}; do
  if docker exec "$task_container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$task_container" pg_isready -h 127.0.0.1 -U postgres >/dev/null
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres <<'SQL'
create role authenticated;
create role anon;
create role service_role;
create schema auth;
create table auth.users (id uuid primary key, is_anonymous boolean not null default false);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
-- Match new Supabase projects: business objects need explicit role grants.
alter default privileges in schema public revoke execute on functions from public;
SQL
task_migration_count=0
for task_migration in "$task_root"/supabase/migrations/*.sql; do
  printf 'Applying %s\n' "${task_migration##*/}"
  docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres < "$task_migration"
  task_migration_count=$((task_migration_count + 1))
done
printf 'Applied all %s repository SQL migrations to an empty database.\n' "$task_migration_count"
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres < "$task_root/supabase/tests/data-api-permissions.sql"
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres < "$task_root/supabase/tests/record-create-idempotency.sql"

# Only after the migrated grants have passed: broaden table permissions so the
# following adversarial tests also prove RLS, independently of permission denial.
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres <<'SQL'
grant select, insert, update, delete on public.patients, public.treatment_lines,
  public.lab_results, public.lab_report_batches, public.llm_provider_settings,
  public.profiles, public.record_shares, public.side_effects, public.follow_up_visits,
  public.usage_events, public.subscriptions, public.donations to authenticated, anon;
-- Share retargeting is prevented by the column grant as well as ownership RLS.
revoke update on public.record_shares from authenticated;
grant update(revoked_at) on public.record_shares to authenticated;
SQL
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres < "$task_root/supabase/tests/account-isolation.sql"
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres < "$task_root/supabase/tests/clinical-workflows.sql"
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres < "$task_root/supabase/tests/record-integrity.sql"
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres < "$task_root/supabase/tests/usage-quota.sql"
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres < "$task_root/supabase/tests/donation-payments.sql"

# Two independent connections contend for the final free-plan allowance.
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres <<'SQL'
insert into auth.users (id) values ('90000000-0000-0000-0000-000000000011');
insert into public.usage_events (user_id, kind, created_at)
select '90000000-0000-0000-0000-000000000011', 'llm_chat', now() - interval '2 minutes'
from generate_series(1, 49);
SQL
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres <<'SQL' &
begin;
set local role authenticated;
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000011';
select public.consume_usage('llm_chat');
-- Hold the transaction lock until the second connection has tried to consume.
\! touch /tmp/quota-first-consumed
select pg_sleep(2);
commit;
SQL
task_first_pid=$!
for task_attempt in {1..100}; do
  if docker exec "$task_container" test -f /tmp/quota-first-consumed; then break; fi
  sleep 0.05
done
docker exec "$task_container" test -f /tmp/quota-first-consumed
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres <<'SQL' &
begin;
set local role authenticated;
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000011';
do $$ begin
  if public.consume_usage('llm_chat') <> '{"allowed":false,"reason":"quota"}'::jsonb then
    raise exception 'concurrent request exceeded last allowance';
  end if;
end $$;
commit;
SQL
task_second_pid=$!
wait "$task_first_pid"
wait "$task_second_pid"
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres <<'SQL'
do $$ begin
  if (select count(*) from public.usage_events where user_id = '90000000-0000-0000-0000-000000000011') <> 50 then
    raise exception 'concurrent consumption did not record exactly one event';
  end if;
end $$;
SQL

# A delayed completion contends with the transaction recording payment success.
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres <<'SQL' &
begin;
set local role service_role;
select public.record_donation_payment('cs_concurrent', 'pi_concurrent', null, 1500, 'usd', 'paid');
\! touch /tmp/donation-first-recorded
select pg_sleep(2);
commit;
SQL
task_payment_first_pid=$!
for task_attempt in {1..100}; do
  if docker exec "$task_container" test -f /tmp/donation-first-recorded; then break; fi
  sleep 0.05
done
docker exec "$task_container" test -f /tmp/donation-first-recorded
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres <<'SQL' &
begin;
set local role service_role;
select public.record_donation_payment('cs_concurrent', 'pi_concurrent', null, 1500, 'usd', 'pending');
commit;
SQL
task_payment_second_pid=$!
wait "$task_payment_first_pid"
wait "$task_payment_second_pid"
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres <<'SQL'
do $$ begin
  if (select count(*) from public.donations where stripe_checkout_session_id = 'cs_concurrent') <> 1
    or not exists (select 1 from public.donations where stripe_checkout_session_id = 'cs_concurrent' and status = 'paid') then
    raise exception 'concurrent events duplicated or regressed the payment';
  end if;
end $$;
select 'Concurrent donation payment checks passed' as result;
SQL

# Two no-ID saves from the same draft must return one complete record. The first
# holds its transaction open so the second really contends on the patient UUID.
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres <<'SQL' &
begin;
set local role authenticated;
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000011';
select public.persist_patient_record(auth.uid(), '{"basicInfo":{"name":"Concurrent draft"},"treatmentLines":[{"lineNumber":1,"regimen":"First committed"}]}',
  'c0000000-0000-4000-8000-000000000021');
\! touch /tmp/record-first-created
select pg_sleep(2);
commit;
SQL
task_record_first_pid=$!
for task_attempt in {1..100}; do
  if docker exec "$task_container" test -f /tmp/record-first-created; then break; fi
  sleep 0.05
done
docker exec "$task_container" test -f /tmp/record-first-created
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres <<'SQL' &
begin;
set local role authenticated;
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000011';
do $$ declare result jsonb; begin
  result := public.persist_patient_record(auth.uid(), '{"basicInfo":{"name":"Late draft"},"treatmentLines":[]}',
    'c0000000-0000-4000-8000-000000000021');
  if result->>'id' <> 'c0000000-0000-4000-8000-000000000021'
    or result#>>'{treatmentLines,0,regimen}' <> 'First committed' then
    raise exception 'Concurrent creation lost the committed record';
  end if;
end $$;
commit;
SQL
task_record_second_pid=$!
wait "$task_record_first_pid"
wait "$task_record_second_pid"
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres <<'SQL'
do $$ begin
  if (select count(*) from public.patients where user_id = '90000000-0000-0000-0000-000000000011') <> 1
    or (select count(*) from public.treatment_lines where patient_id = 'c0000000-0000-4000-8000-000000000021') <> 1 then
    raise exception 'Concurrent creation duplicated rows';
  end if;
end $$;
select 'Concurrent record creation checks passed' as result;
SQL

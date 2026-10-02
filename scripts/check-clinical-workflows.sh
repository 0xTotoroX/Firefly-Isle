#!/usr/bin/env bash
# [INPUT]: Docker 和已缓存的 postgres:18-alpine；仅在无网络临时容器内运行。
# [OUTPUT]: 真实 PostgreSQL 的临床数据、分享与双窗口配额回归验证结果。
# [POS]: 可重复的隔离数据库测试入口，不读取 Supabase 配置或远端凭据。
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
create schema auth;
create table auth.users (id uuid primary key, is_anonymous boolean not null default false);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
SQL
for task_migration in 001_init.sql 002_lab_results.sql 004_patient_clinical_notes.sql 005_lab_report_batches.sql 006_record_shares.sql 009_usage_ledger.sql 010_billing.sql 012_side_effects.sql 013_follow_up.sql 20260912051552_clinical_workflow_integrity.sql 20261002105552_record_integrity_and_sharing.sql 20261002111617_atomic_usage_quota.sql; do
  docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres < "$task_root/supabase/migrations/$task_migration"
done
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres < "$task_root/supabase/tests/clinical-workflows.sql"
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres < "$task_root/supabase/tests/record-integrity.sql"
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres < "$task_root/supabase/tests/usage-quota.sql"

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

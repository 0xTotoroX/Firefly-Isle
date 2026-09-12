#!/usr/bin/env bash
# [INPUT]: Docker 和已缓存的 postgres:18-alpine；仅在无网络临时容器内运行。
# [OUTPUT]: 真实 PostgreSQL 的症状/随访/最新状态回归验证结果。
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
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
SQL
for task_migration in 001_init.sql 002_lab_results.sql 012_side_effects.sql 013_follow_up.sql 20260912051552_clinical_workflow_integrity.sql; do
  docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres < "$task_root/supabase/migrations/$task_migration"
done
docker exec -i "$task_container" psql -X -v ON_ERROR_STOP=1 -U postgres < "$task_root/supabase/tests/clinical-workflows.sql"

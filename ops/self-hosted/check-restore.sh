#!/usr/bin/env bash
# [INPUT]: 备份 archive 参数、自托管 PostgreSQL 容器和 pg_restore。
# [OUTPUT]: 一次性测试库的 auth/public/storage 恢复、计数核验与清理。
# [POS]: 自托管恢复验证脚本；只删除本次成功创建的测试库，不能当作生产回滚命令。
# [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
# Restore one archive into a disposable database, validate counts, then remove only that test database.
set -euo pipefail
archive_path="${1:?Usage: check-restore.sh /var/backups/firefly/<timestamp>/database.dump}"
test_db="firefly_restore_check_$(date -u +%Y%m%d%H%M%S)_$$"
cleanup() { docker exec firefly-db dropdb -U supabase_admin --if-exists "$test_db" >/dev/null; }
docker exec firefly-db createdb -U supabase_admin -T template0 "$test_db"
# Never remove a database unless this invocation successfully created it.
trap cleanup EXIT
docker exec firefly-db psql -U supabase_admin -d "$test_db" -v ON_ERROR_STOP=1 -c 'CREATE SCHEMA IF NOT EXISTS public; CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions; CREATE EXTENSION "uuid-ossp" WITH SCHEMA extensions;'
for section in pre-data data post-data; do
  flags=()
  if [ "$section" = data ]; then flags+=(--disable-triggers); fi
  docker exec -i firefly-db pg_restore -U supabase_admin -d "$test_db" --exit-on-error --no-owner --section="$section" --schema=auth --schema=public --schema=storage "${flags[@]}" < "$archive_path"
done
docker exec firefly-db psql -U supabase_admin -d "$test_db" -At -c "SELECT 'users=' || (SELECT count(*) FROM auth.users) || ', patients=' || (SELECT count(*) FROM public.patients) || ', treatment_lines=' || (SELECT count(*) FROM public.treatment_lines);"
printf 'Auth/public/storage archive restored successfully in disposable database.\n'

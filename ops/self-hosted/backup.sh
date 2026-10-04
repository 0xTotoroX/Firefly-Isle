#!/usr/bin/env bash
# [INPUT]: 自托管 Docker/PostgreSQL、/opt/firefly-supabase 运行文件及 root 文件/锁权限。
# [OUTPUT]: 受限权限的数据库/角色/运行文件备份及 SHA256SUMS，按完成标记清理过期备份。
# [POS]: 自托管备份操作脚本；备份含敏感数据，不入 Git，运行条件见自托管手册。
# [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
# Root-only database + runtime backup. SQL dumps contain private data and must never be committed.
set -euo pipefail
umask 077
install -d -m 700 /var/backups/firefly
exec 9>/run/lock/firefly-backup.lock
flock -n 9 || exit 0
backup_dir="/var/backups/firefly/$(date -u +%Y%m%dT%H%M%SZ)"
install -d -m 700 "$backup_dir"
trap 'rm -f "$backup_dir/database.dump.partial"' EXIT
docker exec firefly-db pg_dump -U supabase_admin -d postgres --format=custom --no-owner > "$backup_dir/database.dump.partial"
docker exec -i firefly-db pg_restore --list < "$backup_dir/database.dump.partial" > "$backup_dir/contents.txt"
mv "$backup_dir/database.dump.partial" "$backup_dir/database.dump"
docker exec firefly-db pg_dumpall -U supabase_admin --roles-only > "$backup_dir/roles.sql"
tar -C /opt/firefly-supabase --exclude=volumes/db/data --exclude=source-db.env --exclude=migration -czf "$backup_dir/runtime.tar.gz" .
(cd "$backup_dir" && sha256sum database.dump roles.sql runtime.tar.gz > SHA256SUMS)
# Remove only completed backup sets after 14 days.
find /var/backups/firefly -mindepth 2 -maxdepth 2 -name SHA256SUMS -mtime +14 -printf '%h\0' | xargs -0 -r rm -rf --
printf 'Backup complete: %s\n' "$backup_dir"

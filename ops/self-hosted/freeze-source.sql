-- [INPUT]: 已获批切换窗口中的旧 PostgreSQL 数据库及 public/auth/storage 表。
-- [OUTPUT]: firefly_cutover 拒绝写入函数及语句级触发器，恢复方式为删除该专用 schema。
-- [POS]: 自托管切换前旧库停写步骤，见 docs/operations/supabase-self-hosted.md；文件检查不授权执行。
-- [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
-- Run only at the approved cutover window, on the OLD cloud database as postgres.
-- Export after this transaction commits. Recovery: DROP SCHEMA firefly_cutover CASCADE;
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE SCHEMA firefly_cutover;
CREATE FUNCTION firefly_cutover.reject_write() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Firefly migration in progress. Reload the application after the cutover.'
    USING ERRCODE = '55000';
END;
$$;
DO $$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT table_schema, table_name FROM information_schema.tables
    WHERE table_schema IN ('public', 'auth', 'storage')
      AND table_type = 'BASE TABLE'
      AND NOT (table_schema = 'auth' AND table_name = 'schema_migrations')
      AND NOT (table_schema = 'storage' AND table_name = 'migrations')
  LOOP
    EXECUTE format(
      'CREATE TRIGGER firefly_migration_read_only BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON %I.%I FOR EACH STATEMENT EXECUTE FUNCTION firefly_cutover.reject_write()',
      target.table_schema, target.table_name
    );
  END LOOP;
END;
$$;
COMMIT;

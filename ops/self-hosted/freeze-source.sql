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

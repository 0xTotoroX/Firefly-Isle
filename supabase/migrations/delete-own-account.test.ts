/**
 * [INPUT]: 依赖 node:fs 读取 Supabase migration SQL。
 * [OUTPUT]: 对外提供 delete_own_account RPC 的安全合同测试。
 * [POS]: supabase/migrations 的隐私合规 contract 测试，约束自删账户 RPC 必须校验 auth.uid、级联依赖外键 cascade，且只授权 authenticated。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./008_delete_own_account.sql', import.meta.url), 'utf8')
const profilesMigration = readFileSync(new URL('./007_profiles.sql', import.meta.url), 'utf8')
const recordSharesMigration = readFileSync(new URL('./006_record_shares.sql', import.meta.url), 'utf8')
const providerSettingsMigration = readFileSync(new URL('./003_llm_provider_settings.sql', import.meta.url), 'utf8')
const initMigration = readFileSync(new URL('./001_init.sql', import.meta.url), 'utf8')

describe('delete_own_account migration', () => {
  it('creates a security definer RPC that verifies the caller identity before deleting', () => {
    expect(migration).toContain('create or replace function public.delete_own_account()')
    expect(migration).toContain('security definer')
    expect(migration).toContain('if auth.uid() is null then')
    expect(migration).toContain('raise exception')
    expect(migration).toContain('delete from auth.users')
  })

  it('grants execution only to authenticated users', () => {
    expect(migration).toContain('revoke all on function public.delete_own_account() from public')
    expect(migration).toContain('revoke all on function public.delete_own_account() from anon')
    expect(migration).toContain('grant execute on function public.delete_own_account() to authenticated')
    expect(migration).not.toContain('service_role')
  })

  it('relies on cascading foreign keys so every user table is wiped with the account', () => {
    for (const [name, source] of [
      ['patients', initMigration],
      ['llm_provider_settings', providerSettingsMigration],
      ['record_shares', recordSharesMigration],
      ['profiles', profilesMigration],
    ] as const) {
      expect(source.includes('references auth.users (id) on delete cascade'), `${name} must cascade from auth.users`).toBe(true)
    }
  })
})

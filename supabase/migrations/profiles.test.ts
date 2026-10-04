/**
 * [INPUT]: 依赖 node:fs 读取 Supabase migration SQL。
 * [OUTPUT]: 对外提供 profiles 迁移、locale 约束、RLS 与自动建档触发器的合同测试。
 * [POS]: supabase/migrations 的 schema contract 测试，防止 profiles 越权 policy、locale 枚举或自动建档触发器漂移。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./007_profiles.sql', import.meta.url), 'utf8')

describe('profiles migration', () => {
  it('creates the profile table with locale and theme constraints and cascading identity', () => {
    expect(migration).toContain('create table if not exists public.profiles')
    expect(migration).toContain('references auth.users (id) on delete cascade')
    expect(migration).toContain("constraint profiles_locale_check check (locale in ('zh', 'en'))")
    expect(migration).toContain("constraint profiles_theme_check check (theme in ('dark', 'light'))")
    expect(migration).toContain('char_length(display_name) <= 60')
  })

  it('enables owner-scoped RLS without delete policy or service bypass', () => {
    expect(migration).toContain('alter table public.profiles enable row level security')

    for (const policy of ['profiles_select_own', 'profiles_insert_own', 'profiles_update_own']) {
      expect(migration).toContain(policy)
    }

    expect(migration.match(/user_id = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(4)
    expect(migration).not.toContain('service_role')
  })

  it('auto-provisions a profile row for every new auth user', () => {
    expect(migration).toContain('security definer')
    expect(migration).toContain('on conflict (user_id) do nothing')
    expect(migration).toContain('create trigger on_auth_user_created')
    expect(migration).toContain('after insert on auth.users')
  })
})

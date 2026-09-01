/**
 * [INPUT]: 依赖 node:fs 读取 Supabase migration SQL。
 * [OUTPUT]: 对外提供 billing schema（plans/subscriptions）的合同测试。
 * [POS]: supabase/migrations 的计费 contract 测试，约束每用户唯一订阅、状态枚举、owner 只读 RLS 与种子价格档存在。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./010_billing.sql', import.meta.url), 'utf8')

describe('billing schema migration', () => {
  it('creates plans with quota columns and seeds free/pro tiers', () => {
    expect(migration).toContain('create table if not exists public.plans')
    expect(migration).toContain("'free', 'Free', 50, 20, 0, 'usd'")
    expect(migration).toContain("'pro', 'Pro', 1000, 200, 1500, 'usd'")
    expect(migration).toContain('on conflict (id) do nothing')
  })

  it('creates a one-subscription-per-user table with status constraint and cascade', () => {
    expect(migration).toContain('create table if not exists public.subscriptions')
    expect(migration).toContain('references auth.users (id) on delete cascade')
    expect(migration).toContain('unique (user_id)')
    expect(migration).toContain("status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')")
  })

  it('keeps subscriptions owner read-only with no user-facing write path', () => {
    expect(migration).toContain('alter table public.subscriptions enable row level security')
    expect(migration).toContain('subscriptions_select_own')
    expect(migration.match(/create policy/g)?.length).toBe(1)
  })
})

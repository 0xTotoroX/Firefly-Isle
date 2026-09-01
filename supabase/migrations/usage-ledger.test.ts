/**
 * [INPUT]: 依赖 node:fs 读取 Supabase migration SQL。
 * [OUTPUT]: 对外提供 usage_events 用量台账迁移的合同测试。
 * [POS]: supabase/migrations 的配额 contract 测试，约束 kind 枚举、owner 只读 RLS 与 record_usage RPC 的鉴权边界。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./009_usage_ledger.sql', import.meta.url), 'utf8')

describe('usage_events migration', () => {
  it('creates the usage ledger with kind constraint and window index', () => {
    expect(migration).toContain('create table if not exists public.usage_events')
    expect(migration).toContain("kind in ('llm_chat', 'ocr_document', 'record_share', 'export_account')")
    expect(migration).toContain('references auth.users (id) on delete cascade')
    expect(migration).toContain('on public.usage_events (user_id, kind, created_at desc)')
  })

  it('keeps the ledger owner read-only with no direct insert or delete path', () => {
    expect(migration).toContain('alter table public.usage_events enable row level security')
    expect(migration).toContain('usage_events_select_own')
    expect(migration.match(/create policy/g)?.length).toBe(1)
    expect(migration).not.toContain('service_role')
  })

  it('records usage only through an authenticated security definer RPC', () => {
    expect(migration).toContain('create or replace function public.record_usage(event_kind text, event_meta jsonb')
    expect(migration).toContain('security definer')
    expect(migration).toContain('if auth.uid() is null then')
    expect(migration).toContain('values (auth.uid(), event_kind, event_meta)')
    expect(migration).toContain('grant execute on function public.record_usage(text, jsonb) to authenticated')
    expect(migration).not.toContain('to anon;')
  })
})

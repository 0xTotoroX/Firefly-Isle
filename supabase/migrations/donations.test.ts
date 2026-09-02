/**
 * [INPUT]: 依赖 node:fs 读取 011_donations.sql。
 * [OUTPUT]: 对外提供一次性捐赠表合同测试。
 * [POS]: supabase/migrations 的捐赠 contract 测试，约束正金额、状态枚举、owner 只读与 donation plan 种子行。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./011_donations.sql', import.meta.url), 'utf8')

describe('donations migration', () => {
  it('creates a one-time donation table with owner read-only RLS', () => {
    expect(migration).toContain('create table if not exists public.donations')
    expect(migration).toContain('constraint donations_amount_positive check (amount_cents > 0)')
    expect(migration).toContain("status in ('pending', 'paid', 'failed', 'refunded')")
    expect(migration).toContain('donations_select_own')
    expect(migration).toContain("'donation', 'Donation'")
  })
})

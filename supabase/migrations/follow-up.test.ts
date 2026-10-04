/**
 * [INPUT]: 依赖 node:fs 读取 013_follow_up.sql。
 * [OUTPUT]: 对外提供随访模块 schema 合同测试。
 * [POS]: supabase/migrations 的随访 contract 测试，约束随访记录 owner 四权 RLS、文本长度护栏、患者状态枚举与列的可重复应用。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./013_follow_up.sql', import.meta.url), 'utf8')

describe('follow_up migration', () => {
  it('creates visit records with text guards and descending date index', () => {
    expect(migration).toContain('create table if not exists public.follow_up_visits')
    expect(migration).toContain('references public.patients (id) on delete cascade')
    expect(migration).toContain('char_length(coalesce(conclusion, \'\')) <= 2000')
    expect(migration).toContain('on public.follow_up_visits (patient_id, visited_on desc)')
  })

  it('grants the owner full CRUD on visits', () => {
    expect(migration).toContain('alter table public.follow_up_visits enable row level security')

    for (const policy of ['follow_up_visits_select_own', 'follow_up_visits_insert_own', 'follow_up_visits_update_own', 'follow_up_visits_delete_own']) {
      expect(migration).toContain(policy)
    }

    expect(migration.match(/user_id = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(5)
  })

  it('adds a repeatable follow-up status enum column to patients', () => {
    expect(migration).toContain('add column if not exists follow_up_status text')
    expect(migration).toContain("check (follow_up_status in ('treating', 'paused', 'completed', 'lost'))")
  })
})

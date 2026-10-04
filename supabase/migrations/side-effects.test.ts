/**
 * [INPUT]: 依赖 node:fs 读取 012_side_effects.sql。
 * [OUTPUT]: 对外提供副作用记录表 schema 合同测试。
 * [POS]: supabase/migrations 的症状日志 contract 测试，约束严重程度枚举、日期顺序、owner 四权 RLS 与级联归因。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./012_side_effects.sql', import.meta.url), 'utf8')

describe('side_effects migration', () => {
  it('creates the log with severity enum, date order and length guards', () => {
    expect(migration).toContain('create table if not exists public.side_effects')
    expect(migration).toContain("severity in ('mild', 'moderate', 'severe')")
    expect(migration).toContain('resolved_on is null or resolved_on >= occurred_on')
    expect(migration).toContain('char_length(symptom) <= 120')
    expect(migration).toContain('char_length(notes) <= 2000')
  })

  it('attributes entries to a patient with optional line attribution that survives line deletion', () => {
    expect(migration).toContain('references public.patients (id) on delete cascade')
    expect(migration).toContain('references public.treatment_lines (id) on delete set null')
  })

  it('grants the owner full CRUD and nothing to anon', () => {
    expect(migration).toContain('alter table public.side_effects enable row level security')

    for (const policy of ['side_effects_select_own', 'side_effects_insert_own', 'side_effects_update_own', 'side_effects_delete_own']) {
      expect(migration).toContain(policy)
    }

    expect(migration.match(/user_id = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(5)
  })
})

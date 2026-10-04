/**
 * [INPUT]: 当前症状/随访客户端与模拟 Supabase 请求边界。
 * [OUTPUT]: 必填 owner、编辑关联保持、零行写入与日期校验回归。
 * [POS]: 记录存储的可观察请求契约，数据库行为另由 test:database 验证。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUser = vi.fn()
const insert = vi.fn()
const update = vi.fn()
const from = vi.fn()
let response: { data: unknown; error: { code?: string; message: string } | null }

vi.mock('@/lib/supabase', () => ({ hasSupabaseEnv: true, getSupabaseClient: () => ({ auth: { getUser }, from }) }))

import { createFollowUpVisit, deleteFollowUpVisit, loadFollowUpVisits, setFollowUpStatus, updateFollowUpVisit } from './follow-up-storage'
import { createSideEffect, deleteSideEffect, loadSideEffects, updateSideEffect } from './side-effect-storage'

beforeEach(() => {
  vi.clearAllMocks()
  getUser.mockResolvedValue({ data: { user: { id: 'owner-1' } }, error: null })
  response = { data: { id: 'entry-1', patient_id: 'patient-1', visited_on: '2026-09-12', occurred_on: '2026-09-12' }, error: null }
  const builder = {
    delete: () => builder, eq: () => builder, order: () => builder, select: () => builder,
    insert: (payload: unknown) => { insert(payload); return builder },
    update: (payload: unknown) => { update(payload); return builder },
    single: () => Promise.resolve(response), maybeSingle: () => Promise.resolve(response), returns: () => Promise.resolve(response),
  }
  from.mockReturnValue(builder)
})

const visit = { visitedOn: '2026-09-12', conclusion: ' Updated ' }
const symptom = { occurredOn: '2026-09-12', severity: 'mild' as const, symptom: ' Fatigue ' }

describe('auxiliary record writes', () => {
  it('creates visits and symptoms with the authenticated owner and selected patient', async () => {
    await createFollowUpVisit('patient-1', visit)
    await createSideEffect('patient-1', symptom)
    expect(insert).toHaveBeenNthCalledWith(1, expect.objectContaining({ patient_id: 'patient-1', user_id: 'owner-1', conclusion: 'Updated' }))
    expect(insert).toHaveBeenNthCalledWith(2, expect.objectContaining({ patient_id: 'patient-1', user_id: 'owner-1', symptom: 'Fatigue' }))
  })
  it('edits mutable fields without rewriting owner or patient identity', async () => {
    await updateFollowUpVisit('entry-1', visit)
    await updateSideEffect('entry-1', symptom)
    for (const [payload] of update.mock.calls) {
      expect(payload).not.toHaveProperty('patient_id')
      expect(payload).not.toHaveProperty('user_id')
    }
  })
  it('does not claim success when update, status change or deletion affects no row', async () => {
    response = { data: null, error: null }
    await expect(updateFollowUpVisit('gone', visit)).rejects.toThrow('no longer available')
    await expect(updateSideEffect('gone', symptom)).rejects.toThrow('no longer available')
    await expect(deleteFollowUpVisit('gone')).rejects.toThrow('no longer available')
    await expect(deleteSideEffect('gone')).rejects.toThrow('no longer available')
    await expect(setFollowUpStatus('gone', 'paused')).rejects.toThrow('no longer available')
  })
  it('rejects unauthenticated creates and invalid calendar ranges before writing', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(createFollowUpVisit('patient-1', visit)).rejects.toThrow('Authentication required')
    await expect(createSideEffect('patient-1', symptom)).rejects.toThrow('Authentication required')
    await expect(updateFollowUpVisit('entry-1', { ...visit, nextVisitOn: '2026-09-01' })).rejects.toThrow('Invalid')
    await expect(updateSideEffect('entry-1', { ...symptom, resolvedOn: '2026-02-30' })).rejects.toThrow('Invalid')
    await expect(updateSideEffect('entry-1', { ...symptom, symptom: '  ' })).rejects.toThrow('Invalid')
    expect(insert).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
  it('surfaces unavailable tables rather than pretending the history is empty', async () => {
    response = { data: null, error: { code: 'PGRST205', message: 'Table unavailable' } }
    await expect(loadFollowUpVisits('patient-1')).rejects.toThrow('Table unavailable')
    await expect(loadSideEffects('patient-1')).rejects.toThrow('Table unavailable')
  })
})

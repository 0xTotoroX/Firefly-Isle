/**
 * [INPUT]: saveLabReportBatch、LabResult 及注入的 Supabase RPC mock。
 * [OUTPUT]: 重复批次信息、单 RPC 身份读回和事务失败传播的协议回归。
 * [POS]: 化验原子保存客户端测试；真实事务由数据库检查验证。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LabResult } from '@/types/patient'
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ getSupabaseClient: () => mocks }))
import { saveLabReportBatch } from './lab-report-storage'
const batch = { category: 'tumor-marker' as const, patientId: 'patient-1', testDate: '2026-10-01' }
const batchRow = { id: 'batch-1', patient_id: 'patient-1', category: 'tumor-marker', test_date: '2026-10-01', review_status: 'confirmed' }
const readings: LabResult[] = [{ category: 'tumor-marker', itemCode: 'cea', itemName: 'CEA', value: 6 }]
beforeEach(() => vi.clearAllMocks())

describe('atomic batch client', () => {
  it('returns duplicate information from the transaction without deleting data', async () => {
    mocks.rpc.mockResolvedValue({ data: { status: 'duplicate', batch: batchRow }, error: null })
    await expect(saveLabReportBatch({ batch, readings })).resolves.toMatchObject({ status: 'duplicate', existingBatch: { id: 'batch-1' } })
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.rpc).toHaveBeenCalledWith('save_lab_report_batch', expect.objectContaining({ replace_existing: false }))
  })
  it('returns saved batch and reading identities from a single RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: { status: 'saved', batch: batchRow, readings: [{ id: 'reading-1', batch_id: 'batch-1', category: 'tumor-marker', item_code: 'cea', item_name: 'CEA', value: 6 }] }, error: null })
    await expect(saveLabReportBatch({ batch, readings, replaceExisting: true })).resolves.toMatchObject({ status: 'saved', batch: { id: 'batch-1' }, readings: [{ id: 'reading-1', batchId: 'batch-1' }] })
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it('propagates transaction failures without attempting partial writes', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('Invalid reading') })
    await expect(saveLabReportBatch({ batch, readings, replaceExisting: true })).rejects.toThrow('Invalid reading')
    expect(mocks.from).not.toHaveBeenCalled()
  })
})

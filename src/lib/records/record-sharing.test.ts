/**
 * [INPUT]: 依赖 node:fs 读取 Supabase 迁移，依赖 vitest mock Supabase 与 patient-record-storage，依赖 ./record-sharing 的授权码/share 边界。
 * [OUTPUT]: 对外提供 record_shares 迁移/RLS/RPC 合同、授权码 hash、所有权校验、创建/撤销/读取分享状态回归测试。
 * [POS]: lib/records 的分享边界测试，证明授权码不明文入库、非 owner 不创建分享、撤销/过期/错误码不返回记录且 active share 只加载单份 PatientRecord。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseMocks = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: supabaseMocks.getSupabaseClient,
}))

import {
  createRecordShare,
  generateShareCode,
  hashShareCode,
  loadSharedPatientRecordByCode,
  RecordSharePermissionError,
  revokeRecordShare,
} from './record-sharing'

const migrationSql = readFileSync(resolve(process.cwd(), 'supabase/migrations/006_record_shares.sql'), 'utf8')

function createPatientBuilder(data: { id: string } | null) {
  const builder = {
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
    select: vi.fn(() => builder),
  }

  return builder
}

function createShareInsertBuilder(row = { created_at: '2026-05-13T00:00:00Z', expires_at: '2026-05-20T00:00:00Z', id: 'share-1', patient_id: 'patient-1', revoked_at: null }) {
  const builder = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn(async () => ({ data: row, error: null })),
  }

  return builder
}

beforeEach(() => {
  supabaseMocks.getSupabaseClient.mockReset()
})

describe('record share schema contract', () => {
  it('stores only authorization code hashes and owner-scoped management facts', () => {
    expect(migrationSql).toContain('create table if not exists public.record_shares')
    expect(migrationSql).toContain('code_hash text not null unique')
    expect(migrationSql).toContain('owner_user_id uuid not null references auth.users')
    expect(migrationSql).toContain('create policy record_shares_insert_own_patient')
    expect(migrationSql).toContain('public.patients.user_id = auth.uid()')
  })

})

describe('record share code utilities', () => {
  it('generates URL-safe high entropy codes from bytes', () => {
    expect(generateShareCode(new Uint8Array([0, 1, 2, 253, 254, 255]))).toBe('AAEC_f7_')
  })

  it('hashes the code before persistence', async () => {
    await expect(hashShareCode('abc')).resolves.toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

describe('record share CRUD boundary', () => {
  it('creates a share only after the patient is confirmed to belong to the current user', async () => {
    const patientBuilder = createPatientBuilder({ id: 'patient-1' })
    const shareBuilder = createShareInsertBuilder()
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: vi.fn((table: string) => (table === 'patients' ? patientBuilder : shareBuilder)),
    }

    supabaseMocks.getSupabaseClient.mockReturnValue(supabase)

    const created = await createRecordShare('patient-1', '2026-05-20T00:00:00Z')

    expect(patientBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(shareBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
      code_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      owner_user_id: 'user-1',
      patient_id: 'patient-1',
    }))
    expect(created.code).not.toMatch(/^[a-f0-9]{64}$/)
    expect(created.share.id).toBe('share-1')
  })

  it('rejects share creation for non-owner records before insert', async () => {
    const patientBuilder = createPatientBuilder(null)
    const shareBuilder = createShareInsertBuilder()
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-2' } }, error: null })),
      },
      from: vi.fn((table: string) => (table === 'patients' ? patientBuilder : shareBuilder)),
    }

    supabaseMocks.getSupabaseClient.mockReturnValue(supabase)

    await expect(createRecordShare('patient-1')).rejects.toBeInstanceOf(RecordSharePermissionError)
    expect(shareBuilder.insert).not.toHaveBeenCalled()
  })

  it('revokes by writing revoked_at instead of deleting the share row', async () => {
    const builder = {
      eq: vi.fn(() => builder),
      select: vi.fn(() => builder),
      single: vi.fn(async () => ({
        data: { created_at: null, expires_at: '2026-05-20T00:00:00Z', id: 'share-1', patient_id: 'patient-1', revoked_at: '2026-05-13T00:00:00Z' },
        error: null,
      })),
      update: vi.fn(() => builder),
    }

    supabaseMocks.getSupabaseClient.mockReturnValue({ from: vi.fn(() => builder) })

    await expect(revokeRecordShare('share-1', '2026-05-13T00:00:00Z')).resolves.toMatchObject({ revokedAt: '2026-05-13T00:00:00Z' })
    expect(builder.update).toHaveBeenCalledWith({ revoked_at: '2026-05-13T00:00:00Z' })
  })
})

describe('shared record loading', () => {
  it('uses only the code-scoped RPC result, without querying patient tables', async () => {
    const record = { id: 'patient-1', treatmentLines: [] }
    const rpc = vi.fn().mockResolvedValue({ data: { record, status: 'active' }, error: null })
    const from = vi.fn()
    supabaseMocks.getSupabaseClient.mockReturnValue({ rpc, from })
    await expect(loadSharedPatientRecordByCode('valid_share_code_123456')).resolves.toEqual({ record, status: 'active' })
    expect(rpc).toHaveBeenCalledWith('get_shared_patient_record', { share_code_hash: await hashShareCode('valid_share_code_123456') })
    expect(from).not.toHaveBeenCalled()
  })

  it.each(['expired', 'revoked', 'unavailable'] as const)('does not return patient data for %s', async (status) => {
    supabaseMocks.getSupabaseClient.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: { status, record: null }, error: null }) })
    await expect(loadSharedPatientRecordByCode('valid_share_code_123456')).resolves.toEqual({ record: null, status })
  })

  it('rejects malformed codes without contacting the database', async () => {
    await expect(loadSharedPatientRecordByCode('bad-code')).resolves.toEqual({ record: null, status: 'unavailable' })
    expect(supabaseMocks.getSupabaseClient).not.toHaveBeenCalled()
  })
})

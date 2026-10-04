/**
 * [INPUT]: 依赖 node:fs 读取 Supabase 迁移，依赖 vitest 断言，依赖 ./patient-record-storage 的 PatientRecord 持久化映射工具。
 * [OUTPUT]: 对外提供病历摘要分页、lab_results/lab_report_batches 迁移/RLS 合同、row 映射、字段保存、旧 schema 降级与创建 UUID 重试测试。
 * [POS]: lib 的数据边界测试，约束患者记录读取/落库、持久化 id 所有权校验、可选 clinical_notes/lab_results 迁移缺口降级、字段级编辑 payload 与实验室指标 RLS 不分叉。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseMocks = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: supabaseMocks.getSupabaseClient,
}))

import {
  loadPatientRecordById,
  loadPatientRecordSummaries,
  mapLabReportBatchRow,
  mapLabResultRow,
  persistPatientRecord,
  toLabReportBatchPayload,
  toLabResultPayload,
} from './patient-record-storage'

type SummaryFixture = { id: string; user_id: string; name: string; tumor_type: string; created_at: string; updated_at: string }

function summarySource(serverLimit = 10) {
  const owner = 'a0000000-0000-4000-8000-000000000001'
  const source = {
    owner,
    currentOwner: owner,
    rows: Array.from({ length: 23 }, (_, index): SummaryFixture => ({
      id: `b0000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      user_id: owner,
      name: `患者 ${index}`,
      tumor_type: '乳腺癌',
      created_at: `2026-10-${String(Math.floor(index / 5) + 1).padStart(2, '0')}T00:00:00+00:00`,
      updated_at: '2026-10-03T00:00:00+00:00',
    })),
    requests: [] as URLSearchParams[],
    failed: false,
  }
  const client = createClient('https://records.example.test', 'synthetic-key', {
    accessToken: async () => 'synthetic-token',
    global: { fetch: async (input: RequestInfo | URL) => {
      const query = new URL(input instanceof Request ? input.url : String(input)).searchParams
      source.requests.push(query)
      if (source.failed) return new Response(JSON.stringify({ message: 'records unavailable' }), { status: 500 })
      let rows = source.rows.filter((row) => row.user_id === source.currentOwner && query.get('user_id') === `eq.${row.user_id}`)
      const cursor = query.get('or')?.match(/^\(created_at\.lt\.(.+),and\(created_at\.eq\.(.+),id\.lt\.([^)]+)\)\)$/)
      if (query.has('or') && !cursor) throw new Error('Invalid PostgREST cursor')
      if (cursor) rows = rows.filter((row) => row.created_at < cursor[1] || (row.created_at === cursor[2] && row.id < cursor[3]))
      if (query.get('order') === 'created_at.desc,id.desc') rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
      const count = rows.length
      rows = rows.slice(0, Math.min(serverLimit, Number(query.get('limit') ?? 1000)))
      return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json', 'Content-Range': `0-${Math.max(rows.length - 1, 0)}/${count}` } })
    } },
  })
  supabaseMocks.getSupabaseClient.mockReturnValue({
    auth: { getUser: async () => ({ data: { user: { id: source.currentOwner } }, error: null }) },
    from: client.from.bind(client),
  })
  return source
}

describe('patient record summary pagination', () => {
  it('loads all owned summaries with equal timestamps and a server cap smaller than a page', async () => {
    const source = summarySource(3)
    source.rows.push({ ...source.rows[0], id: 'other-record', user_id: 'other-owner' })
    const records = []
    let cursor = null
    do {
      const page = await loadPatientRecordSummaries(source.owner, cursor)
      records.push(...page.records)
      cursor = page.nextCursor
    } while (cursor)
    expect(records.map((record) => record.id)).toEqual(source.rows.filter((row) => row.user_id === source.owner).map((row) => row.id).reverse())
    expect(new Set(records.map((record) => record.id)).size).toBe(23)
    expect(records[0]).toEqual({ id: source.rows[22].id, name: '患者 22', tumorType: '乳腺癌', updatedAt: source.rows[22].updated_at })
    expect(source.requests.every((query) => query.get('select') === 'id,name:basic_info->>name,tumor_type:basic_info->>tumorType,created_at,updated_at')).toBe(true)
  })

  it('keeps later pages reachable when an earlier row is deleted and a later row is edited', async () => {
    const source = summarySource(3)
    const first = await loadPatientRecordSummaries(source.owner)
    source.rows = source.rows.filter((row) => row.id !== first.records[0].id)
    source.rows[19].updated_at = '2026-10-10T00:00:00+00:00'
    const second = await loadPatientRecordSummaries(source.owner, first.nextCursor)
    expect(second.records.map((record) => record.name)).toEqual(['患者 19', '患者 18', '患者 17'])
  })

  it('rejects a changed account before issuing a data request', async () => {
    const source = summarySource()
    source.currentOwner = 'other-owner'
    await expect(loadPatientRecordSummaries(source.owner)).rejects.toThrow('Account changed')
    expect(source.requests).toHaveLength(0)
  })

  it('distinguishes empty ownership from a failed page', async () => {
    const source = summarySource()
    source.rows = []
    await expect(loadPatientRecordSummaries(source.owner)).resolves.toEqual({ records: [], nextCursor: null })
    source.failed = true
    await expect(loadPatientRecordSummaries(source.owner)).rejects.toMatchObject({ message: 'records unavailable' })
  })
})

const labMigrationSql = readFileSync(resolve(process.cwd(), 'supabase/migrations/002_lab_results.sql'), 'utf8')
const clinicalNotesMigrationSql = readFileSync(resolve(process.cwd(), 'supabase/migrations/004_patient_clinical_notes.sql'), 'utf8')
const labBatchMigrationSql = readFileSync(resolve(process.cwd(), 'supabase/migrations/005_lab_report_batches.sql'), 'utf8')

beforeEach(() => {
  supabaseMocks.getSupabaseClient.mockReset()
})

describe('patient-record-storage lab result mapping', () => {
  it('maps database lab rows into PatientRecord labResults', () => {
    expect(
      mapLabResultRow({
        batch_id: 'batch-1',
        category: 'tumor-marker',
        derivation_method: null,
        item_code: 'cea',
        item_name: 'CEA',
        is_derived: false,
        reference_high: 5,
        reference_low: null,
        source: 'ocr',
        test_date: '2024-02-01',
        unit: 'ng/mL',
        value: 8.2,
      }),
    ).toEqual({
      batchId: 'batch-1',
      category: 'tumor-marker',
      itemCode: 'cea',
      itemName: 'CEA',
      isDerived: false,
      referenceHigh: 5,
      referenceLow: undefined,
      source: 'ocr',
      testDate: '2024-02-01',
      unit: 'ng/mL',
      value: 8.2,
    })
  })

  it('keeps legacy lab rows readable when batch metadata columns are absent', () => {
    expect(
      mapLabResultRow({
        category: 'blood-routine',
        item_code: 'wbc',
        item_name: '白细胞',
        reference_high: null,
        reference_low: null,
        source: 'manual',
        test_date: null,
        unit: null,
        value: 6.2,
      }),
    ).toMatchObject({
      batchId: undefined,
      category: 'blood-routine',
      derivationMethod: undefined,
      isDerived: undefined,
      itemCode: 'wbc',
    })
  })

  it('serializes OCR and manual lab readings into the same database payload shape', () => {
    expect(
      toLabResultPayload(
        { batchId: 'batch-2', category: 'blood-biochemistry', itemCode: 'alt', itemName: 'ALT', source: 'manual', value: 66 },
        'patient-42',
      ),
    ).toMatchObject({
      batch_id: 'batch-2',
      category: 'blood-biochemistry',
      item_code: 'alt',
      item_name: 'ALT',
      is_derived: false,
      patient_id: 'patient-42',
      source: 'manual',
      value: 66,
    })
  })

  it('serializes derived lab readings with derivation metadata', () => {
    expect(
      toLabResultPayload(
        {
          category: 'blood-routine',
          derivationMethod: 'neutrophil_abs / lymphocyte_abs',
          isDerived: true,
          itemCode: 'nlr',
          itemName: 'NLR',
          value: 1.8,
        },
        'patient-42',
      ),
    ).toMatchObject({
      derivation_method: 'neutrophil_abs / lymphocyte_abs',
      is_derived: true,
      source: 'derived',
    })
  })

  it('maps lab report batch rows and payloads without duplicating reading data', () => {
    expect(
      mapLabReportBatchRow({
        category: 'tumor-marker',
        created_at: '2026-05-12T00:00:00Z',
        id: 'batch-1',
        ocr_text: 'CEA 12.4',
        patient_id: 'patient-42',
        review_status: 'confirmed',
        source_file_name: 'marker.png',
        source_mime_type: 'image/png',
        source_storage_path: null,
        test_date: '2026-05-10',
        updated_at: '2026-05-12T00:00:00Z',
      }),
    ).toMatchObject({
      category: 'tumor-marker',
      id: 'batch-1',
      ocrText: 'CEA 12.4',
      sourceFileName: 'marker.png',
      testDate: '2026-05-10',
    })

    expect(
      toLabReportBatchPayload(
        {
          category: 'tumor-marker',
          ocrText: 'CEA 12.4',
          sourceFileName: 'marker.png',
          sourceMimeType: 'image/png',
          testDate: '2026-05-10',
        },
        'patient-42',
      ),
    ).toMatchObject({
      category: 'tumor-marker',
      ocr_text: 'CEA 12.4',
      patient_id: 'patient-42',
      review_status: 'confirmed',
      source_file_name: 'marker.png',
      source_mime_type: 'image/png',
      test_date: '2026-05-10',
    })
  })
})

describe('patient-record-storage patient identity', () => {
  it('loads a saved patient and treatment lines when the optional lab_results table is not deployed yet', async () => {
    const patientBuilder = {
      eq: vi.fn(() => patientBuilder),
      maybeSingle: vi.fn(async () => ({
        data: {
          basic_info: { tumorType: '乳腺癌' },
          clinical_notes: '其他信息：患者自述乏力。',
          id: '54122ae9-269b-4294-9756-141cf40ffd0c',
          initial_onset: null,
        },
        error: null,
      })),
      select: vi.fn(() => patientBuilder),
    }
    const lineBuilder = {
      eq: vi.fn(() => lineBuilder),
      order: vi.fn(() => lineBuilder),
      returns: vi.fn(async () => ({
        data: [
          {
            biopsy: null,
            end_date: '2023-05',
            genetic_test: null,
            immunohistochemistry: null,
            line_number: 1,
            regimen: '阿贝西利+氟维司群+亮丙瑞林+地舒单抗',
            start_date: '2022-10',
          },
        ],
        error: null,
      })),
      select: vi.fn(() => lineBuilder),
    }
    const labBuilder = {
      eq: vi.fn(() => labBuilder),
      order: vi.fn(() => labBuilder),
      returns: vi.fn(async () => ({
        data: null,
        error: {
          code: 'PGRST205',
          message: "Could not find the table 'public.lab_results' in the schema cache",
        },
      })),
      select: vi.fn(() => labBuilder),
    }
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: vi.fn((table: string) => {
        if (table === 'patients') {
          return patientBuilder
        }

        return table === 'treatment_lines' ? lineBuilder : labBuilder
      }),
    }

    supabaseMocks.getSupabaseClient.mockReturnValue(supabase)

    await expect(loadPatientRecordById('54122ae9-269b-4294-9756-141cf40ffd0c')).resolves.toMatchObject({
      id: '54122ae9-269b-4294-9756-141cf40ffd0c',
      clinicalNotes: '其他信息：患者自述乏力。',
      labResults: undefined,
      treatmentLines: [
        {
          lineNumber: 1,
          regimen: '阿贝西利+氟维司群+亮丙瑞林+地舒单抗',
        },
      ],
    })
    expect(labBuilder.returns).toHaveBeenCalled()
  })

  it('loads a saved patient when the clinical_notes column is not deployed yet', async () => {
    let selectedPatientColumns = ''
    const patientBuilder = {
      eq: vi.fn(() => patientBuilder),
      maybeSingle: vi.fn(async () =>
        selectedPatientColumns.includes('clinical_notes')
          ? {
              data: null,
              error: {
                code: '42703',
                message: 'column patients.clinical_notes does not exist',
              },
            }
          : {
              data: {
                basic_info: { tumorType: '乳腺癌' },
                id: '54122ae9-269b-4294-9756-141cf40ffd0c',
                initial_onset: null,
              },
              error: null,
            },
      ),
      select: vi.fn((columns: string) => {
        selectedPatientColumns = columns
        return patientBuilder
      }),
    }
    const lineBuilder = {
      eq: vi.fn(() => lineBuilder),
      order: vi.fn(() => lineBuilder),
      returns: vi.fn(async () => ({ data: [], error: null })),
      select: vi.fn(() => lineBuilder),
    }
    const labBuilder = {
      eq: vi.fn(() => labBuilder),
      order: vi.fn(() => labBuilder),
      returns: vi.fn(async () => ({
        data: null,
        error: {
          code: 'PGRST205',
          message: "Could not find the table 'public.lab_results' in the schema cache",
        },
      })),
      select: vi.fn(() => labBuilder),
    }
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: vi.fn((table: string) => {
        if (table === 'patients') return patientBuilder
        return table === 'treatment_lines' ? lineBuilder : labBuilder
      }),
    }

    supabaseMocks.getSupabaseClient.mockReturnValue(supabase)

    await expect(loadPatientRecordById('54122ae9-269b-4294-9756-141cf40ffd0c')).resolves.toMatchObject({
      basicInfo: { tumorType: '乳腺癌' },
      clinicalNotes: undefined,
      id: '54122ae9-269b-4294-9756-141cf40ffd0c',
    })
    expect(patientBuilder.select).toHaveBeenCalledWith('id, basic_info, clinical_notes, follow_up_status, initial_onset')
    expect(patientBuilder.select).toHaveBeenCalledWith('id, basic_info, initial_onset')
  })

  it('saves through one transaction and returns stable database identities', async () => {
    const record = { id: 'patient-1', treatmentLines: [{ id: 'line-1', lineNumber: 1, regimen: 'A' }] }
    const rpc = vi.fn().mockResolvedValue({ data: record, error: null })
    const from = vi.fn()
    supabaseMocks.getSupabaseClient.mockReturnValue({ rpc, from })
    await expect(persistPatientRecord(record, 'owner-a')).resolves.toEqual(record)
    expect(rpc).toHaveBeenCalledWith('persist_patient_record', { record, expected_owner_id: 'owner-a' })
    expect(from).not.toHaveBeenCalled()
  })

  it('does not fall back to partial table writes if the migration is missing', async () => {
    const error = { code: 'PGRST202', message: 'RPC missing' }
    const from = vi.fn()
    supabaseMocks.getSupabaseClient.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error }), from })
    await expect(persistPatientRecord({ treatmentLines: [] }, 'owner-a')).rejects.toEqual(error)
    expect(from).not.toHaveBeenCalled()
  })

  it('keeps the caller creation UUID across a lost response and a retry', async () => {
    const draft = { treatmentLines: [{ lineNumber: 1, regimen: 'A' }] }
    const requestId = 'c0000000-0000-4000-8000-000000000011'
    const saved = { ...draft, id: requestId }
    const rpc = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ data: saved, error: null })
    supabaseMocks.getSupabaseClient.mockReturnValue({ rpc })
    await expect(persistPatientRecord(draft, 'owner-a', requestId)).rejects.toThrow('Failed to fetch')
    await expect(persistPatientRecord(draft, 'owner-a', requestId)).resolves.toEqual(saved)
    expect(rpc.mock.calls).toEqual(Array.from({ length: 2 }, () => ['persist_patient_record', {
      record: draft, expected_owner_id: 'owner-a', create_request_id: requestId,
    }]))
  })

  it('uses each new draft UUID separately and omits it on existing-record edits', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'saved-id', treatmentLines: [] }, error: null })
    supabaseMocks.getSupabaseClient.mockReturnValue({ rpc })
    const firstId = 'c0000000-0000-4000-8000-000000000011'
    const nextId = 'c0000000-0000-4000-8000-000000000012'
    await persistPatientRecord({ treatmentLines: [] }, 'owner-a', firstId)
    await persistPatientRecord({ treatmentLines: [] }, 'owner-a', nextId)
    await persistPatientRecord({ id: firstId, treatmentLines: [] }, 'owner-a', nextId)
    expect(rpc.mock.calls.map((call) => call[1].create_request_id)).toEqual([firstId, nextId, undefined])
    expect(rpc.mock.calls[2][1].record.id).toBe(firstId)
  })
})

describe('002_lab_results migration', () => {
  it('creates lab_results with patient ownership and useful trend indexes', () => {
    expect(labMigrationSql).toContain('create table if not exists public.lab_results')
    expect(labMigrationSql).toContain('patient_id uuid not null references public.patients (id) on delete cascade')
    expect(labMigrationSql).toContain('item_code text not null')
    expect(labMigrationSql).toContain('reference_high numeric')
    expect(labMigrationSql).toContain('create index if not exists lab_results_patient_item_date_idx')
  })

  it('enforces RLS through owning patients and rejects unauthorized access', () => {
    expect(labMigrationSql).toContain('alter table public.lab_results enable row level security')
    expect(labMigrationSql.match(/auth\.uid\(\) is not null/g)?.length).toBeGreaterThanOrEqual(4)
    expect(labMigrationSql.match(/public\.patients\.user_id = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(4)
    expect(labMigrationSql).toContain('create policy lab_results_insert_own')
    expect(labMigrationSql).toContain('create policy lab_results_update_own')
    expect(labMigrationSql).toContain('create policy lab_results_delete_own')
  })

  it('adds a clinical_notes column to the owning patient row', () => {
    expect(clinicalNotesMigrationSql).toContain('alter table public.patients')
    expect(clinicalNotesMigrationSql).toContain('add column if not exists clinical_notes text')
  })
})

describe('005_lab_report_batches migration', () => {
  it('creates lab_report_batches with ownership, source metadata and review status', () => {
    expect(labBatchMigrationSql).toContain('create table if not exists public.lab_report_batches')
    expect(labBatchMigrationSql).toContain('patient_id uuid not null references public.patients (id) on delete cascade')
    expect(labBatchMigrationSql).toContain('source_file_name text')
    expect(labBatchMigrationSql).toContain("review_status text not null default 'confirmed'")
    expect(labBatchMigrationSql).toContain('create index if not exists lab_report_batches_patient_category_date_idx')
  })

  it('extends lab_results with batch and derived-reading metadata', () => {
    expect(labBatchMigrationSql).toContain('add column if not exists batch_id uuid references public.lab_report_batches (id) on delete set null')
    expect(labBatchMigrationSql).toContain('add column if not exists is_derived boolean not null default false')
    expect(labBatchMigrationSql).toContain('add column if not exists derivation_method text')
    expect(labBatchMigrationSql).toContain('create index if not exists lab_results_batch_id_idx')
  })

  it('enforces lab_report_batches RLS through owning patients', () => {
    expect(labBatchMigrationSql).toContain('alter table public.lab_report_batches enable row level security')
    expect(labBatchMigrationSql.match(/public\.patients\.user_id = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(4)
    expect(labBatchMigrationSql).toContain('create policy lab_report_batches_insert_own')
    expect(labBatchMigrationSql).toContain('create policy lab_report_batches_update_own')
    expect(labBatchMigrationSql).toContain('create policy lab_report_batches_delete_own')
  })
})

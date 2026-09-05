/**
 * [INPUT]: 依赖 node:fs 读取 Supabase 迁移，依赖 vitest 断言，依赖 ./patient-record-storage 的 PatientRecord 持久化映射工具。
 * [OUTPUT]: 对外提供 lab_results/lab_report_batches 迁移/RLS 合同、患者记录 labResults/batch row 映射、record-page 字段编辑落库、clinical_notes 缺列降级、缺表读取降级与假 id 落库防线测试。
 * [POS]: lib 的数据边界测试，约束患者记录读取/落库、持久化 id 所有权校验、可选 clinical_notes/lab_results 迁移缺口降级、字段级编辑 payload 与实验室指标 RLS 不分叉。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
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
  loadPatientRecordById,
  mapLabReportBatchRow,
  mapLabResultRow,
  persistPatientRecord,
  toLabReportBatchPayload,
  toLabResultPayload,
} from './patient-record-storage'

const labMigrationSql = readFileSync(resolve(process.cwd(), 'supabase/migrations/002_lab_results.sql'), 'utf8')
const clinicalNotesMigrationSql = readFileSync(resolve(process.cwd(), 'supabase/migrations/004_patient_clinical_notes.sql'), 'utf8')
const labBatchMigrationSql = readFileSync(resolve(process.cwd(), 'supabase/migrations/005_lab_report_batches.sql'), 'utf8')

function createPatientBuilder() {
  const builder = {
    eq: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    select: vi.fn(() => builder),
    single: vi.fn(async () => ({ data: { id: 'patient-real' }, error: null })),
    update: vi.fn(() => builder),
  }

  return builder
}

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

  it('creates a new patient row when the incoming record id is not owned or persisted', async () => {
    const patientBuilders: ReturnType<typeof createPatientBuilder>[] = []
    const childBuilder = {
      delete: vi.fn(() => childBuilder),
      eq: vi.fn(async () => ({ error: null })),
      insert: vi.fn(async () => ({ error: null })),
      upsert: vi.fn(async () => ({ error: null })),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'patients') {
          return childBuilder
        }

        const builder = createPatientBuilder()
        patientBuilders.push(builder)
        return builder
      }),
    }

    supabaseMocks.getSupabaseClient.mockReturnValue(supabase)

    await expect(
      persistPatientRecord(
        {
          basicInfo: { tumorType: '乳腺癌' },
          id: '627b6ba7-74b1-4e10-b79b-ad509bb88687',
          treatmentLines: [],
        },
        'user-1',
      ),
    ).resolves.toMatchObject({
      id: 'patient-real',
    })
    expect(patientBuilders[0].maybeSingle).toHaveBeenCalled()
    expect(patientBuilders[1].insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1' }))
    expect(childBuilder.delete).toHaveBeenCalledTimes(1)
    expect(childBuilder.insert).not.toHaveBeenCalled()
  })

  it('replaces treatment lines from the current record instead of leaving stale line numbers', async () => {
    let updatingPatient = false
    const insertedLines: Array<Record<string, unknown>> = []
    const deletedPatientIds: unknown[] = []
    const patientBuilder = {
      eq: vi.fn(() => {
        if (updatingPatient) {
          updatingPatient = false
          return Promise.resolve({ error: null })
        }

        return patientBuilder
      }),
      maybeSingle: vi.fn(async () => ({ data: { id: '54122ae9-269b-4294-9756-141cf40ffd0c' }, error: null })),
      select: vi.fn(() => patientBuilder),
      update: vi.fn(() => {
        updatingPatient = true
        return patientBuilder
      }),
    }
    const treatmentBuilder = {
      delete: vi.fn(() => treatmentBuilder),
      eq: vi.fn(async (_column: string, value: unknown) => {
        deletedPatientIds.push(value)
        return { error: null }
      }),
      insert: vi.fn(async (payload: Array<Record<string, unknown>>) => {
        insertedLines.push(...payload)
        return { error: null }
      }),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'patients') {
          return patientBuilder
        }

        return treatmentBuilder
      }),
    }

    supabaseMocks.getSupabaseClient.mockReturnValue(supabase)

    await expect(
      persistPatientRecord(
        {
          basicInfo: { tumorType: '乳腺癌' },
          id: '54122ae9-269b-4294-9756-141cf40ffd0c',
          treatmentLines: [
            {
              lineNumber: 2,
              regimen: '阿贝西利+氟维司群',
            },
          ],
        },
        'user-1',
      ),
    ).resolves.toMatchObject({
      id: '54122ae9-269b-4294-9756-141cf40ffd0c',
    })

    expect(treatmentBuilder.delete).toHaveBeenCalledTimes(1)
    expect(deletedPatientIds).toEqual(['54122ae9-269b-4294-9756-141cf40ffd0c'])
    expect(treatmentBuilder.insert).toHaveBeenCalledTimes(1)
    expect(insertedLines).toEqual([
      expect.objectContaining({
        line_number: 2,
        patient_id: '54122ae9-269b-4294-9756-141cf40ffd0c',
        regimen: '阿贝西利+氟维司群',
      }),
    ])
  })

  it('persists record-page field edits into the owning patient row and treatment lines', async () => {
    const patientId = '54122ae9-269b-4294-9756-141cf40ffd0c'
    const patientEqCalls: Array<[string, unknown]> = []
    const patientUpdatePayloads: Array<Record<string, unknown>> = []
    const deletedTreatmentPatientIds: unknown[] = []
    const insertedTreatmentLines: Array<Record<string, unknown>> = []
    let updatingPatient = false
    const patientBuilder = {
      eq: vi.fn((column: string, value: unknown) => {
        patientEqCalls.push([column, value])

        if (updatingPatient) {
          updatingPatient = false
          return Promise.resolve({ error: null })
        }

        return patientBuilder
      }),
      maybeSingle: vi.fn(async () => ({ data: { id: patientId }, error: null })),
      select: vi.fn(() => patientBuilder),
      update: vi.fn((payload: Record<string, unknown>) => {
        patientUpdatePayloads.push(payload)
        updatingPatient = true
        return patientBuilder
      }),
    }
    const treatmentBuilder = {
      delete: vi.fn(() => treatmentBuilder),
      eq: vi.fn(async (_column: string, value: unknown) => {
        deletedTreatmentPatientIds.push(value)
        return { error: null }
      }),
      insert: vi.fn(async (payload: Array<Record<string, unknown>>) => {
        insertedTreatmentLines.push(...payload)
        return { error: null }
      }),
    }
    const supabase = {
      from: vi.fn((table: string) => (table === 'patients' ? patientBuilder : treatmentBuilder)),
    }

    supabaseMocks.getSupabaseClient.mockReturnValue(supabase)

    await expect(
      persistPatientRecord(
        {
          basicInfo: {
            age: 51,
            diagnosisDate: '2021.07',
            gender: '女',
            height: 162.5,
            name: '张某某',
            stage: 'IV',
            tumorType: '乳腺癌修正',
            weight: 58.3,
          },
          clinicalNotes: '用户编辑后的备注。',
          id: patientId,
          initialOnset: {
            geneticTest: '初发 NGS 更新',
            immunohistochemistry: '初发 IHC 更新',
            treatment: 'AC 方案更新',
            triggerDate: '2021.07',
          },
          treatmentLines: [
            {
              biopsy: '2022.10 骨转复核',
              endDate: '2023.05',
              geneticTest: '一线 NGS 更新',
              immunohistochemistry: '一线 IHC 更新',
              lineNumber: 1,
              regimen: '阿贝西利 + 氟维司群（编辑后）',
              startDate: '2022.10',
            },
            {
              lineNumber: 2,
              regimen: '氟唑帕利 + 哌柏西利（当前线）',
              startDate: '2025.10.01',
            },
          ],
        },
        'user-1',
      ),
    ).resolves.toMatchObject({ id: patientId })

    expect(patientBuilder.select).toHaveBeenCalledWith('id')
    expect(patientEqCalls).toEqual(expect.arrayContaining([
      ['id', patientId],
      ['user_id', 'user-1'],
    ]))
    expect(patientUpdatePayloads).toEqual([
      {
        basic_info: {
          age: 51,
          diagnosisDate: '2021.07',
          gender: '女',
          height: 162.5,
          name: '张某某',
          stage: 'IV',
          tumorType: '乳腺癌修正',
          weight: 58.3,
        },
        clinical_notes: '用户编辑后的备注。',
        initial_onset: {
          geneticTest: '初发 NGS 更新',
          immunohistochemistry: '初发 IHC 更新',
          treatment: 'AC 方案更新',
          triggerDate: '2021.07',
        },
      },
    ])
    expect(deletedTreatmentPatientIds).toEqual([patientId])
    expect(insertedTreatmentLines).toEqual([
      {
        biopsy: '2022.10 骨转复核',
        end_date: '2023.05',
        genetic_test: '一线 NGS 更新',
        immunohistochemistry: '一线 IHC 更新',
        line_number: 1,
        patient_id: patientId,
        regimen: '阿贝西利 + 氟维司群（编辑后）',
        start_date: '2022.10',
      },
      {
        biopsy: null,
        end_date: null,
        genetic_test: null,
        immunohistochemistry: null,
        line_number: 2,
        patient_id: patientId,
        regimen: '氟唑帕利 + 哌柏西利（当前线）',
        start_date: '2025.10.01',
      },
    ])
  })

  it('persists the main patient row when the clinical_notes column is not deployed yet', async () => {
    const insertPayloads: Array<Record<string, unknown>> = []
    const updatePayloads: Array<Record<string, unknown>> = []
    const patientBuilder = {
      eq: vi.fn(async () => {
        if (updatePayloads.length === 1) {
          return {
            error: {
              code: '42703',
              message: 'column patients.clinical_notes does not exist',
            },
          }
        }

        return { error: null }
      }),
      insert: vi.fn((payload: Record<string, unknown>) => {
        insertPayloads.push(payload)
        return patientBuilder
      }),
      select: vi.fn(() => patientBuilder),
      single: vi.fn(async () => {
        if (insertPayloads.length === 1) {
          return {
            data: null,
            error: {
              code: '42703',
              message: 'column patients.clinical_notes does not exist',
            },
          }
        }

        return { data: { id: 'patient-real' }, error: null }
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        updatePayloads.push(payload)
        return patientBuilder
      }),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'patients') {
          return patientBuilder
        }

        const childBuilder = {
          delete: vi.fn(() => childBuilder),
          eq: vi.fn(async () => ({ error: null })),
          insert: vi.fn(async () => ({ error: null })),
          upsert: vi.fn(async () => ({ error: null })),
        }

        return childBuilder
      }),
    }

    supabaseMocks.getSupabaseClient.mockReturnValue(supabase)

    await expect(
      persistPatientRecord(
        {
          basicInfo: { tumorType: '乳腺癌' },
          clinicalNotes: '其他信息：需要复核。',
          treatmentLines: [],
        },
        'user-1',
      ),
    ).resolves.toMatchObject({
      id: 'patient-real',
    })
    expect(insertPayloads[0]).toHaveProperty('clinical_notes')
    expect(insertPayloads[1]).not.toHaveProperty('clinical_notes')
    expect(updatePayloads[0]).toHaveProperty('clinical_notes')
    expect(updatePayloads[1]).not.toHaveProperty('clinical_notes')
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

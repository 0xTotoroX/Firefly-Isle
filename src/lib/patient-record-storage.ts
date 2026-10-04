/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端入口与 @/types/patient 的 PatientRecord/TreatmentLine/LabReportBatch/LabResult 数据模型。
 * [OUTPUT]: 对外提供病历摘要分页、单份/最新病历读取、persistPatientRecord 与 lab row/payload 映射工具；旧 schema 仅在读取时降级，写入必须使用新 RPC。
 * [POS]: lib 的患者记录持久化边界，单事务 RPC 核对发起账号、保留子记录身份；新草稿由调用方保持创建 UUID，重试复用。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { getSupabaseClient } from '@/lib/supabase'
import { ensureBrowserOnline } from '@/lib/network-status'
import type { LabReportBatch, LabResult, PatientRecord, TreatmentLine } from '@/types/patient'

type PatientRow = {
  basic_info: PatientRecord['basicInfo'] | null
  clinical_notes?: string | null
  follow_up_status: PatientRecord['followUpStatus'] | null
  id: string
  initial_onset: PatientRecord['initialOnset'] | null
}

type TreatmentLineRow = {
  biopsy: string | null
  end_date: string | null
  genetic_test: string | null
  id: string | null
  immunohistochemistry: string | null
  line_number: number
  regimen: string | null
  start_date: string | null
}

type SupabaseQueryError = {
  code?: string
  message?: string
}

type PatientSingleResult = {
  data: PatientRow | null
  error: SupabaseQueryError | null
}

export type LabResultRow = {
  batch_id?: string | null
  category: LabResult['category']
  derivation_method?: string | null
  id?: string
  is_derived?: boolean | null
  item_code: string
  item_name: string
  patient_id?: string
  reference_high: number | null
  reference_low: number | null
  source: NonNullable<LabResult['source']>
  test_date: string | null
  unit: string | null
  value: number
}

export type LabReportBatchRow = {
  category: LabReportBatch['category']
  created_at?: string | null
  id?: string
  ocr_text: string | null
  patient_id?: string
  review_status: NonNullable<LabReportBatch['reviewStatus']>
  source_file_name: string | null
  source_mime_type: string | null
  source_storage_path: string | null
  test_date: string | null
  updated_at?: string | null
}

const PATIENT_COLUMNS_WITH_NOTES = 'id, basic_info, clinical_notes, follow_up_status, initial_onset'
const PATIENT_COLUMNS_WITH_NOTES_ONLY = 'id, basic_info, clinical_notes, initial_onset'
const PATIENT_COLUMNS_WITHOUT_NOTES = 'id, basic_info, initial_onset'
const LAB_RESULT_COLUMNS_WITH_METADATA =
  'id, patient_id, batch_id, test_date, category, item_code, item_name, value, unit, reference_low, reference_high, source, is_derived, derivation_method'
const LAB_RESULT_COLUMNS_LEGACY =
  'id, patient_id, test_date, category, item_code, item_name, value, unit, reference_low, reference_high, source'

export function toLabResultPayload(reading: LabResult, patientId: string) {
  return {
    batch_id: reading.batchId ?? null,
    category: reading.category,
    derivation_method: reading.derivationMethod ?? null,
    item_code: reading.itemCode,
    item_name: reading.itemName,
    patient_id: patientId,
    reference_high: reading.referenceHigh ?? null,
    reference_low: reading.referenceLow ?? null,
    is_derived: reading.isDerived ?? false,
    source: reading.source ?? (reading.isDerived ? 'derived' : 'manual'),
    test_date: reading.testDate ?? null,
    unit: reading.unit ?? null,
    value: reading.value,
  }
}

export function toLabReportBatchPayload(batch: LabReportBatch, patientId: string) {
  return {
    category: batch.category,
    ocr_text: batch.ocrText ?? null,
    patient_id: patientId,
    review_status: batch.reviewStatus ?? 'confirmed',
    source_file_name: batch.sourceFileName ?? null,
    source_mime_type: batch.sourceMimeType ?? null,
    source_storage_path: batch.sourceStoragePath ?? null,
    test_date: batch.testDate ?? null,
  }
}

function mapTreatmentLineRow(row: TreatmentLineRow): TreatmentLine {
  return {
    biopsy: row.biopsy ?? undefined,
    endDate: row.end_date ?? undefined,
    geneticTest: row.genetic_test ?? undefined,
    id: row.id ?? undefined,
    immunohistochemistry: row.immunohistochemistry ?? undefined,
    lineNumber: row.line_number,
    regimen: row.regimen ?? undefined,
    startDate: row.start_date ?? undefined,
  }
}

export function mapLabResultRow(row: LabResultRow): LabResult {
  return {
    batchId: row.batch_id ?? undefined,
    category: row.category,
    derivationMethod: row.derivation_method ?? undefined,
    id: row.id,
    isDerived: row.is_derived ?? undefined,
    itemCode: row.item_code,
    itemName: row.item_name,
    patientId: row.patient_id,
    referenceHigh: row.reference_high ?? undefined,
    referenceLow: row.reference_low ?? undefined,
    source: row.source,
    testDate: row.test_date ?? undefined,
    unit: row.unit ?? undefined,
    value: row.value,
  }
}

export function mapLabReportBatchRow(row: LabReportBatchRow): LabReportBatch {
  return {
    category: row.category,
    createdAt: row.created_at ?? undefined,
    id: row.id,
    ocrText: row.ocr_text ?? undefined,
    patientId: row.patient_id,
    reviewStatus: row.review_status,
    sourceFileName: row.source_file_name ?? undefined,
    sourceMimeType: row.source_mime_type ?? undefined,
    sourceStoragePath: row.source_storage_path ?? undefined,
    testDate: row.test_date ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  }
}

function isMissingLabResultsTableError(error: SupabaseQueryError) {
  return error.code === 'PGRST205' && /lab_results/i.test(error.message ?? '')
}

function isMissingClinicalNotesColumnError(error: SupabaseQueryError) {
  return error.code === '42703' && /clinical_notes/i.test(error.message ?? '')
}

function isMissingFollowUpStatusColumnError(error: SupabaseQueryError) {
  return error.code === '42703' && /follow_up_status/i.test(error.message ?? '')
}

function isMissingLabResultMetadataColumnError(error: SupabaseQueryError) {
  return error.code === '42703' && /(batch_id|is_derived|derivation_method)/i.test(error.message ?? '')
}

async function loadPatientRowWithFallback(query: (columns: string) => PromiseLike<PatientSingleResult>) {
  const result = await query(PATIENT_COLUMNS_WITH_NOTES)

  if (!result.error) {
    return result.data
  }

  if (isMissingFollowUpStatusColumnError(result.error)) {
    const withoutStatus = await query(PATIENT_COLUMNS_WITH_NOTES_ONLY)

    if (!withoutStatus.error) {
      return withoutStatus.data
    }

    if (!isMissingClinicalNotesColumnError(withoutStatus.error)) {
      throw withoutStatus.error
    }
  } else if (!isMissingClinicalNotesColumnError(result.error)) {
    throw result.error
  }

  const fallback = await query(PATIENT_COLUMNS_WITHOUT_NOTES)

  if (fallback.error) {
    throw fallback.error
  }

  return fallback.data
}

function mapPatientRow(patient: PatientRow, lines: TreatmentLineRow[], labRows: LabResultRow[]): PatientRecord {
  const labResults = labRows.map(mapLabResultRow)

  return {
    basicInfo: patient.basic_info ?? undefined,
    clinicalNotes: patient.clinical_notes ?? undefined,
    followUpStatus: patient.follow_up_status ?? undefined,
    id: patient.id,
    initialOnset: patient.initial_onset ?? undefined,
    labResults: labResults.length > 0 ? labResults : undefined,
    treatmentLines: lines.map(mapTreatmentLineRow).sort((left, right) => left.lineNumber - right.lineNumber),
  }
}

async function loadPatientChildren(patient: PatientRow) {
  const supabase = getSupabaseClient()
  const { data: lines, error: linesError } = await supabase
    .from('treatment_lines')
    .select('id, line_number, start_date, end_date, regimen, biopsy, immunohistochemistry, genetic_test')
    .eq('patient_id', patient.id)
    .order('line_number', { ascending: true })
    .returns<TreatmentLineRow[]>()

  if (linesError) {
    throw linesError
  }

  const loadLabRows = (columns: string) =>
    supabase
      .from('lab_results')
      .select(columns)
      .eq('patient_id', patient.id)
      .order('test_date', { ascending: true })
      .returns<LabResultRow[]>()
  let { data: labRows, error: labError } = await loadLabRows(LAB_RESULT_COLUMNS_WITH_METADATA)

  if (labError && isMissingLabResultMetadataColumnError(labError)) {
    ;({ data: labRows, error: labError } = await loadLabRows(LAB_RESULT_COLUMNS_LEGACY))
  }

  if (labError) {
    if (isMissingLabResultsTableError(labError)) {
      return mapPatientRow(patient, lines ?? [], [])
    }

    throw labError
  }

  return mapPatientRow(patient, lines ?? [], labRows ?? [])
}

export async function loadPatientRecordById(recordId: string): Promise<PatientRecord | null> {
  ensureBrowserOnline()

  const supabase = getSupabaseClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    throw authError ?? new Error('Missing authenticated user.')
  }

  const patient = await loadPatientRowWithFallback((columns) =>
    supabase
      .from('patients')
      .select(columns)
      .eq('id', recordId)
      .eq('user_id', authData.user.id)
      .maybeSingle<PatientRow>(),
  )

  return patient ? loadPatientChildren(patient) : null
}

export async function loadLatestPatientRecord(userId: string) {
  ensureBrowserOnline()

  const supabase = getSupabaseClient()
  const patient = await loadPatientRowWithFallback((columns) =>
    supabase
      .from('patients')
      .select(columns)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle<PatientRow>(),
  )

  return patient ? loadPatientChildren(patient) : null
}

export type PatientRecordSummary = {
  id: string
  name: string | null
  tumorType: string | null
  updatedAt: string
}

export type PatientRecordCursor = { createdAt: string; id: string }
export type PatientRecordSummaryPage = { records: PatientRecordSummary[]; nextCursor: PatientRecordCursor | null }

type PatientSummaryRow = { id: string; name: string | null; tumor_type: string | null; created_at: string; updated_at: string }

export async function loadPatientRecordSummaries(expectedOwnerId: string, cursor: PatientRecordCursor | null = null): Promise<PatientRecordSummaryPage> {
  ensureBrowserOnline()
  const supabase = getSupabaseClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || authData.user?.id !== expectedOwnerId) throw authError ?? new Error('Account changed while loading records.')
  // Creation order is stable while clinical edits update updated_at. The ID is
  // the tie breaker, so identical timestamps and deletions do not skip records.
  let query = supabase.from('patients')
    .select('id, name:basic_info->>name, tumor_type:basic_info->>tumorType, created_at, updated_at', { count: 'exact' })
    .eq('user_id', expectedOwnerId)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(10)
  if (cursor) query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
  const { data, count, error } = await query
  if (error) throw error
  const rows = (data ?? []) as unknown as PatientSummaryRow[]
  const last = rows.at(-1)
  return {
    records: rows.map((row) => ({ id: row.id, name: row.name, tumorType: row.tumor_type, updatedAt: row.updated_at })),
    // Count the remaining filtered rows, including when the server caps below 10.
    nextCursor: last && (count === null || count > rows.length) ? { createdAt: last.created_at, id: last.id } : null,
  }
}

export async function persistPatientRecord(record: PatientRecord, expectedOwnerId: string, createRequestId?: string): Promise<PatientRecord> {
  ensureBrowserOnline()
  const { data, error } = await getSupabaseClient().rpc('persist_patient_record', {
    record,
    expected_owner_id: expectedOwnerId,
    ...(!record.id && createRequestId ? { create_request_id: createRequestId } : {}),
  })
  if (error) throw error
  if (!data?.id) throw new Error('Patient record was not saved.')
  return data as PatientRecord
}

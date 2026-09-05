/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端入口与 @/types/patient 的 PatientRecord/TreatmentLine/LabReportBatch/LabResult 数据模型。
 * [OUTPUT]: 对外提供 loadPatientRecordById、loadSharedPatientRecordById、loadLatestPatientRecord、persistPatientRecord 与 lab batch/result row/payload 映射工具，并校验传入 patient id 的归属；远端未部署 clinical_notes / lab_results 时降级不中断主病历。
 * [POS]: lib 的患者记录持久化边界，统一 routes、workspace 与只读分享对 patients、clinical_notes、treatment_lines、可选 lab_results 的读写，让数据库身份只来自已归属行、新建行或 RLS 授权的 active share。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

function getPatientPayload(record: PatientRecord, includeClinicalNotes = true) {
  const payload: {
    basic_info: PatientRecord['basicInfo']
    clinical_notes?: string | null
    initial_onset: PatientRecord['initialOnset'] | null
  } = {
    basic_info: record.basicInfo ?? {},
    initial_onset: record.initialOnset ? record.initialOnset : null,
  }

  if (includeClinicalNotes) {
    payload.clinical_notes = record.clinicalNotes ?? null
  }

  return payload
}

function getTreatmentLinePayload(line: TreatmentLine, patientId: string) {
  return {
    biopsy: line.biopsy ?? null,
    end_date: line.endDate ?? null,
    genetic_test: line.geneticTest ?? null,
    immunohistochemistry: line.immunohistochemistry ?? null,
    line_number: line.lineNumber,
    patient_id: patientId,
    regimen: line.regimen ?? null,
    start_date: line.startDate ?? null,
  }
}

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

export function toLegacyLabResultPayload(reading: LabResult, patientId: string) {
  return {
    category: reading.category,
    item_code: reading.itemCode,
    item_name: reading.itemName,
    patient_id: patientId,
    reference_high: reading.referenceHigh ?? null,
    reference_low: reading.referenceLow ?? null,
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

export async function loadSharedPatientRecordById(recordId: string): Promise<PatientRecord | null> {
  ensureBrowserOnline()

  const supabase = getSupabaseClient()
  const patient = await loadPatientRowWithFallback((columns) =>
    supabase
      .from('patients')
      .select(columns)
      .eq('id', recordId)
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

async function ensurePatientRecordExists(record: PatientRecord, userId: string) {
  if (record.id) {
    const existingId = await findOwnedPatientId(record.id, userId)

    if (existingId) {
      return existingId
    }
  }

  return insertPatientRecord(record, userId)
}

async function findOwnedPatientId(recordId: string, userId: string) {
  if (!UUID_PATTERN.test(recordId)) {
    return null
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('patients')
    .select('id')
    .eq('id', recordId)
    .eq('user_id', userId)
    .maybeSingle<Pick<PatientRow, 'id'>>()

  if (error) {
    throw error
  }

  return data?.id ?? null
}

async function insertPatientRecord(record: PatientRecord, userId: string) {
  const supabase = getSupabaseClient()
  const insert = (includeClinicalNotes: boolean) =>
    supabase
      .from('patients')
      .insert({
        ...getPatientPayload(record, includeClinicalNotes),
        user_id: userId,
      })
      .select('id')
      .single()
  let { data, error } = await insert(true)

  if (error && isMissingClinicalNotesColumnError(error)) {
    ;({ data, error } = await insert(false))
  }

  if (error || !data) {
    throw error
  }

  return data.id
}

async function updatePatientRecord(patientId: string, record: PatientRecord) {
  const supabase = getSupabaseClient()
  const update = (includeClinicalNotes: boolean) =>
    supabase.from('patients').update(getPatientPayload(record, includeClinicalNotes)).eq('id', patientId)
  let { error } = await update(true)

  if (error && isMissingClinicalNotesColumnError(error)) {
    ;({ error } = await update(false))
  }

  if (error) {
    throw error
  }
}

async function syncTreatmentLines(patientId: string, treatmentLines: TreatmentLine[]) {
  const supabase = getSupabaseClient()
  const { error: deleteError } = await supabase.from('treatment_lines').delete().eq('patient_id', patientId)

  if (deleteError) {
    throw deleteError
  }

  if (treatmentLines.length === 0) {
    return
  }

  const { error: insertError } = await supabase
    .from('treatment_lines')
    .insert(treatmentLines.map((line) => getTreatmentLinePayload(line, patientId)))

  if (insertError) {
    throw insertError
  }
}

export async function persistPatientRecord(record: PatientRecord, userId: string) {
  ensureBrowserOnline()

  const patientId = await ensurePatientRecordExists(record, userId)
  const persistedRecord = record.id === patientId ? record : { ...record, id: patientId }
  const supabase = getSupabaseClient()

  await updatePatientRecord(patientId, persistedRecord)
  await syncTreatmentLines(patientId, persistedRecord.treatmentLines)

  if (persistedRecord.labResults) {
    const { error: deleteError } = await supabase.from('lab_results').delete().eq('patient_id', patientId)

    if (deleteError) {
      throw deleteError
    }

    if (persistedRecord.labResults.length > 0) {
      const insertLabResults = (includeMetadata: boolean) =>
        supabase
          .from('lab_results')
          .insert(
            persistedRecord.labResults!.map((reading) =>
              includeMetadata ? toLabResultPayload(reading, patientId) : toLegacyLabResultPayload(reading, patientId),
            ),
          )
      let { error: labError } = await insertLabResults(true)

      if (labError && isMissingLabResultMetadataColumnError(labError)) {
        ;({ error: labError } = await insertLabResults(false))
      }

      if (labError) {
        throw labError
      }
    }
  }

  return persistedRecord
}

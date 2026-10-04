/**
 * [INPUT]: 依赖 @/lib/llm 的 chat 边界、@/types/patient 的 PatientRecord 与 PatientFieldTarget。
 * [OUTPUT]: 对外提供 RecordEditParseError、buildRecordEditPrompt、parsePatientRecordEditResponse、extractPatientRecordEdits、applyPatientRecordEdit 与 applyPatientRecordEdits。
 * [POS]: lib/records 的自然语言病历编辑边界，把 LLM 输出限制为字段级 patch，并复用逐格编辑的字段归一化语义，允许姓名、临床备注、身高体重等字段共用同一编辑路径。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { chat } from '@/lib/llm'
import type { Message } from '@/lib/llm/types'
import type { BasicInfo, InitialOnset, PatientFieldTarget, PatientRecord, TreatmentLine } from '@/types/patient'

const BASIC_INFO_FIELDS = new Set<keyof BasicInfo>(['name', 'gender', 'age', 'height', 'weight', 'tumorType', 'diagnosisDate', 'stage'])
const BASIC_INFO_NUMERIC_FIELDS = new Set<keyof BasicInfo>(['age', 'height', 'weight'])
const INITIAL_ONSET_FIELDS = new Set<keyof InitialOnset>(['triggerDate', 'treatment', 'immunohistochemistry', 'geneticTest'])
const TREATMENT_LINE_FIELDS = new Set<Exclude<keyof TreatmentLine, 'lineNumber'>>([
  'startDate',
  'endDate',
  'regimen',
  'biopsy',
  'immunohistochemistry',
  'geneticTest',
])
const RECORD_FIELDS = new Set(['clinicalNotes'])

type RawEdit = {
  target?: {
    field?: unknown
    lineNumber?: unknown
    section?: unknown
  }
  value?: unknown
}

export type PatientRecordEdit = {
  target: PatientFieldTarget
  value: string
}

export class RecordEditParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecordEditParseError'
  }
}

function stripMarkdownFences(input: string) {
  const trimmed = input.trim()

  if (!trimmed.startsWith('```')) {
    return trimmed
  }

  return trimmed
    .replace(/^```[a-zA-Z]*\n?/, '')
    .replace(/```$/, '')
    .trim()
}

function parseNumericField(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  const normalized = Number(trimmed.match(/^-?\d+(?:\.\d+)?/)?.[0])
  return Number.isFinite(normalized) ? normalized : undefined
}

function parseTextField(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function isNumericBasicInfoField(field: keyof BasicInfo): field is 'age' | 'height' | 'weight' {
  return BASIC_INFO_NUMERIC_FIELDS.has(field)
}

function ensurePatientShell(record: PatientRecord): PatientRecord {
  return {
    ...record,
    basicInfo: record.basicInfo ?? {},
    initialOnset: record.initialOnset,
    treatmentLines: record.treatmentLines,
  }
}

function normalizeEditValue(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

function validateTarget(edit: RawEdit, record: PatientRecord): PatientFieldTarget {
  const section = edit.target?.section
  const field = edit.target?.field

  if (section === 'record' && typeof field === 'string' && RECORD_FIELDS.has(field)) {
    return { section, field: 'clinicalNotes' }
  }

  if (section === 'basicInfo' && typeof field === 'string' && BASIC_INFO_FIELDS.has(field as keyof BasicInfo)) {
    return { section, field: field as keyof BasicInfo }
  }

  if (section === 'initialOnset' && typeof field === 'string' && INITIAL_ONSET_FIELDS.has(field as keyof InitialOnset)) {
    return { section, field: field as keyof InitialOnset }
  }

  if (section !== 'treatmentLine') {
    throw new RecordEditParseError('Invalid edit target.')
  }

  if (typeof field !== 'string' || !TREATMENT_LINE_FIELDS.has(field as Exclude<keyof TreatmentLine, 'lineNumber'>)) {
    throw new RecordEditParseError('Invalid edit target.')
  }

  const lineNumber = typeof edit.target?.lineNumber === 'number' ? edit.target.lineNumber : Number(edit.target?.lineNumber)

  if (!Number.isInteger(lineNumber) || !record.treatmentLines.some((line) => line.lineNumber === lineNumber)) {
    throw new RecordEditParseError('Invalid treatment line.')
  }

  return {
    field: field as Exclude<keyof TreatmentLine, 'lineNumber'>,
    lineNumber,
    section,
  }
}

export function parsePatientRecordEditResponse(response: string, record: PatientRecord): PatientRecordEdit[] {
  let parsed: { edits?: RawEdit[] }

  try {
    parsed = JSON.parse(stripMarkdownFences(response)) as { edits?: RawEdit[] }
  } catch {
    throw new RecordEditParseError('Failed to parse record edit JSON.')
  }

  if (!Array.isArray(parsed.edits) || parsed.edits.length === 0) {
    throw new RecordEditParseError('No valid edits.')
  }

  return parsed.edits.map((edit) => ({
    target: validateTarget(edit, record),
    value: normalizeEditValue(edit.value),
  }))
}

export function applyPatientRecordEdit(record: PatientRecord, edit: PatientRecordEdit): PatientRecord {
  const baseRecord = ensurePatientShell(record)
  const target = edit.target

  if (target.section === 'basicInfo') {
    const basicInfo = { ...baseRecord.basicInfo }
    if (isNumericBasicInfoField(target.field)) {
      basicInfo[target.field] = parseNumericField(edit.value)
    } else {
      basicInfo[target.field] = parseTextField(edit.value)
    }

    return {
      ...baseRecord,
      basicInfo,
    }
  }

  const value = parseTextField(edit.value)

  if (target.section === 'record') {
    return {
      ...baseRecord,
      [target.field]: value,
    }
  }

  if (target.section === 'initialOnset') {
    return {
      ...baseRecord,
      initialOnset: {
        ...baseRecord.initialOnset,
        [target.field]: value,
      },
    }
  }

  return {
    ...baseRecord,
    treatmentLines: baseRecord.treatmentLines.map((line) =>
      line.lineNumber === target.lineNumber
        ? {
            ...line,
            [target.field]: value,
          }
        : line,
    ),
  }
}

export function applyPatientRecordEdits(record: PatientRecord, edits: PatientRecordEdit[]): PatientRecord {
  return edits.reduce((current, edit) => applyPatientRecordEdit(current, edit), record)
}

export function buildRecordEditPrompt(command: string, record: PatientRecord) {
  return [
    'You parse Chinese or English clinical record edit commands into field-level edit intents.',
    'Return JSON only. Do not return markdown. Do not return a full PatientRecord replacement.',
    'Writable target schema:',
    "type PatientFieldTarget = { section: 'record'; field: 'clinicalNotes' } | { section: 'basicInfo'; field: 'name' | 'gender' | 'age' | 'height' | 'weight' | 'tumorType' | 'diagnosisDate' | 'stage' } | { section: 'initialOnset'; field: 'triggerDate' | 'treatment' | 'immunohistochemistry' | 'geneticTest' } | { section: 'treatmentLine'; lineNumber: number; field: 'startDate' | 'endDate' | 'regimen' | 'biopsy' | 'immunohistochemistry' | 'geneticTest' }",
    'Output schema: { "edits": [{ "target": PatientFieldTarget, "value": string | number | null }] }',
    'Use null or empty string only when the user explicitly asks to delete, clear, remove, or erase a field.',
    'Only include fields explicitly mentioned by the user. Omitted fields must remain unchanged.',
    '',
    'Current PatientRecord:',
    JSON.stringify(record, null, 2),
    '',
    'Edit command:',
    command.trim(),
  ].join('\n')
}

export async function extractPatientRecordEdits(command: string, record: PatientRecord): Promise<PatientRecordEdit[]> {
  const messages: Message[] = [
    {
      role: 'system',
      content: 'Return only JSON field-level edit intents for the existing PatientRecord.',
    },
    {
      role: 'user',
      content: buildRecordEditPrompt(command, record),
    },
  ]

  const response = await chat(messages, { responseFormat: 'json_object' })
  return parsePatientRecordEditResponse(response, record)
}

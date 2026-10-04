/**
 * [INPUT]: 不依赖运行时框架，仅承载患者领域模型、编辑目标与判定逻辑。
 * [OUTPUT]: 对外提供 PatientRecord、TreatmentLine、InitialOnset、BasicInfo、LabReportBatch、LabResult、PatientArchetype、PatientFieldTarget、PatientRangeTarget 与 getPatientArchetype，包含姓名、临床备注与实验室批次字段。
 * [POS]: types 的核心领域模型文件，为提取、渲染、编辑与持久化共享同一份患者结构真相源。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
export interface BasicInfo {
  name?: string
  gender?: string
  age?: number
  height?: number
  weight?: number
  tumorType?: string
  diagnosisDate?: string
  stage?: string
}

export interface InitialOnset {
  triggerDate?: string
  treatment?: string
  immunohistochemistry?: string
  geneticTest?: string
}

export interface TreatmentLine {
  id?: string
  lineNumber: number
  startDate?: string
  endDate?: string
  regimen?: string
  biopsy?: string
  immunohistochemistry?: string
  geneticTest?: string
}

export type LabResultCategory = 'blood-routine' | 'blood-biochemistry' | 'tumor-marker'

export type LabResultSource = 'ocr' | 'manual' | 'test' | 'derived'

export type LabReportReviewStatus = 'draft' | 'needs-review' | 'confirmed'

export interface LabReportBatch {
  id?: string
  patientId?: string
  category: LabResultCategory
  testDate?: string
  sourceFileName?: string
  sourceMimeType?: string
  sourceStoragePath?: string
  ocrText?: string
  reviewStatus?: LabReportReviewStatus
  createdAt?: string
  updatedAt?: string
}

export interface LabResult {
  batchId?: string
  derivationMethod?: string
  id?: string
  isDerived?: boolean
  patientId?: string
  testDate?: string
  category: LabResultCategory
  itemCode: string
  itemName: string
  value: number
  unit?: string
  referenceLow?: number
  referenceHigh?: number
  source?: LabResultSource
}

export type FollowUpStatus = 'treating' | 'paused' | 'completed' | 'lost'

export interface PatientRecord {
  id?: string
  basicInfo?: BasicInfo
  clinicalNotes?: string
  followUpStatus?: FollowUpStatus
  initialOnset?: InitialOnset
  labResults?: LabResult[]
  treatmentLines: TreatmentLine[]
}

export type PatientFieldTarget =
  | { section: 'record'; field: 'clinicalNotes' }
  | { section: 'basicInfo'; field: keyof BasicInfo }
  | { section: 'initialOnset'; field: keyof InitialOnset }
  | { section: 'treatmentLine'; field: Exclude<keyof TreatmentLine, 'lineNumber'>; lineNumber: number }

export type PatientRangeTarget = {
  end?: PatientFieldTarget
  start: PatientFieldTarget
}

export type PatientArchetype =
  | 'non-advanced'
  | 'de-novo-advanced'
  | 'relapsed-advanced'

export function getPatientArchetype(record: PatientRecord): PatientArchetype {
  const hasInitialOnset = record.initialOnset !== undefined
  const hasTreatmentLines = record.treatmentLines.length > 0

  if (hasTreatmentLines) {
    return hasInitialOnset ? 'relapsed-advanced' : 'de-novo-advanced'
  }

  return 'non-advanced'
}

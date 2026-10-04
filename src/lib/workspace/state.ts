/**
 * [INPUT]: 提取/OCR 错误映射、PatientRecord 与本地化文案。
 * [OUTPUT]: 工作台状态类型、初始状态和失败回滚/输入归一纯函数。
 * [POS]: workspace 的状态合同；不读取会话、不发送请求。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部，并同步本目录 AGENTS.md。
 */
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { copy, getCopy } from '@/lib/copy'
import { buildFollowUpQuestion, getMissingCriticalFields, MAX_FOLLOW_UP_ROUNDS } from '@/lib/extraction'
import { getMedicalDocumentOcrMessage } from '@/lib/medical-document-ocr'
import type { DemoSession } from '@/lib/demo-session'
import type { createRecordEditQueue } from '@/lib/records/record-edit-queue'
import type { PatientFieldTarget, PatientRecord } from '@/types/patient'

export type ExtractionState = {
  currentQuestion: string | null
  editFeedback: string | null
  error: string | null
  extractionInput: string
  followUpAnswers: string[]
  isExtracting: boolean
  isSaving: boolean
  ocr: OcrState
  record: PatientRecord | null
  remainingMissing: string[]
  retryAnswer: string | null
  retryMode: 'initial' | 'follow-up' | 'edit' | 'save' | null
}

type OcrState = {
  error: string | null
  isProcessing: boolean
  text: string | null
}

/** Shared request ownership; synchronous refs prevent two actions starting in the same render. */
export type WorkspaceActionContext = {
  state: ExtractionState
  setState: Dispatch<SetStateAction<ExtractionState>>
  locale: 'zh' | 'en'
  demoSession: DemoSession | undefined
  editQueueRef: MutableRefObject<ReturnType<typeof createRecordEditQueue> | null>
  operationRef: MutableRefObject<symbol | null>
  generationRef: MutableRefObject<number>
  createRequestIdRef: MutableRefObject<string | undefined>
  labImportActiveRef: MutableRefObject<boolean>
  persistField: (record: PatientRecord) => Promise<PatientRecord>
}

export function getSaveErrorMessage(target: PatientFieldTarget, locale: 'zh' | 'en') {
  return target.section === 'treatmentLine'
    ? getCopy(copy.workspace.errors.saveTreatmentLine, locale)
    : getCopy(copy.workspace.errors.savePatient, locale)
}

export function getNextQuestion(missingFields: string[], followUpCount: number) {
  if (missingFields.length === 0 || followUpCount >= MAX_FOLLOW_UP_ROUNDS) {
    return null
  }

  return buildFollowUpQuestion(missingFields)
}

export function getFollowUpPersistenceFailurePatch(previousRecord: PatientRecord, answer: string, followUpCount: number, locale: 'zh' | 'en') {
  const remainingMissing = getMissingCriticalFields(previousRecord)

  return {
    currentQuestion: getNextQuestion(remainingMissing, followUpCount),
    editFeedback: null,
    error: getCopy(copy.workspace.errors.savePatient, locale),
    isExtracting: false,
    record: previousRecord,
    remainingMissing,
    retryAnswer: answer,
    retryMode: 'follow-up' as const,
  }
}

export function getFailedOcrImportPatch(
  current: Pick<ExtractionState, 'record' | 'remainingMissing'>,
  error: unknown,
  locale: 'zh' | 'en',
) {
  return {
    error: null,
    ocr: {
      error: getMedicalDocumentOcrMessage(error, locale),
      isProcessing: false,
      text: null,
    },
    record: current.record,
    remainingMissing: current.remainingMissing,
  }
}

export function getConfirmedOcrText(text: string | null | undefined) {
  const confirmedText = text?.trim()
  return confirmedText || null
}

export function getWorkspaceComposerMode(record: PatientRecord | null) {
  return record ? 'edit' : 'extract'
}

export function createInitialExtractionState(): ExtractionState {
  return {
    currentQuestion: null,
    editFeedback: null,
    error: null,
    extractionInput: '',
    followUpAnswers: [],
    isExtracting: false,
    isSaving: false,
    ocr: {
      error: null,
      isProcessing: false,
      text: null,
    },
    record: null,
    remainingMissing: [],
    retryAnswer: null,
    retryMode: null,
  }
}

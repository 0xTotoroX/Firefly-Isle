/**
 * [INPUT]: 当前账号/Demo 会话、患者读写服务及 workspace 的提取/编辑/OCR 动作。
 * [OUTPUT]: useWorkspaceController，供页面组合状态与交互。
 * [POS]: workspace 的身份、初次恢复与化验读回编排；主题/语言变更保留草稿和队列。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部，并同步本目录 AGENTS.md。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useOptionalAuth } from '@/lib/auth'
import { useDemoSession } from '@/lib/demo-session'
import { copy, getCopy } from '@/lib/copy'
import { getMissingCriticalFields } from '@/lib/extraction'
import { useLocale } from '@/lib/locale'
import { getOnlineRequiredMessage, isOnlineRequiredError } from '@/lib/network-status'
import { loadLatestPatientRecord, loadPatientRecordById, persistPatientRecord } from '@/lib/records/patient-record-storage'
import type { createRecordEditQueue } from '@/lib/records/record-edit-queue'
import type { PatientFieldTarget, PatientRecord } from '@/types/patient'
import { createInitialExtractionState, getNextQuestion, type WorkspaceActionContext } from './state'
import * as extractionActions from './extraction-actions'
import * as editingActions from './editing-actions'
import * as ocrActions from './ocr-actions'

export function useWorkspaceController(patientId: string | null) {
  const editQueueRef = useRef<ReturnType<typeof createRecordEditQueue> | null>(null)
  const user = useOptionalAuth()?.user
  const demoSession = useDemoSession()?.session
  const { locale } = useLocale()
  const userId = demoSession ? 'demo-session' : user?.id
  const localeRef = useRef(locale)
  const operationRef = useRef<symbol | null>(null)
  const generationRef = useRef(0)
  const createRequestIdRef = useRef<string | undefined>(undefined)
  const labImportActiveRef = useRef(false)
  const [labImportActive, setLabImportActive] = useState(false)
  const onLabActiveChange = useCallback((active: boolean) => {
    labImportActiveRef.current = active
    setLabImportActive(active)
  }, [])
  useEffect(() => { localeRef.current = locale }, [locale])
  const [state, setState] = useState(createInitialExtractionState)
  const [scope, setScope] = useState({ userId, patientId, demoSession })
  if (scope.userId !== userId || scope.patientId !== patientId || scope.demoSession !== demoSession) {
    setScope({ userId, patientId, demoSession })
    setState(createInitialExtractionState())
    setLabImportActive(false)
  }

  useEffect(() => {
    editQueueRef.current = null
    operationRef.current = null
    createRequestIdRef.current = undefined
    generationRef.current += 1
    labImportActiveRef.current = false
    const generation = generationRef.current
    if (!userId) return

    let active = true

    void (demoSession ? (patientId ? demoSession.loadRecord(patientId) : Promise.resolve(null)) : patientId ? loadPatientRecordById(patientId) : loadLatestPatientRecord(userId))
      .then((record) => {
        if (!active || generationRef.current !== generation) {
          return
        }
        if (!record) {
          if (patientId) setState((current) => ({ ...current, error: localeRef.current === 'zh' ? '未找到这位患者的病历，请返回病历页面重试。' : 'Patient record not found. Return to the record page and retry.' }))
          return
        }

        const missingFields = getMissingCriticalFields(record)
        setState((current) => ({
          ...current,
          currentQuestion: getNextQuestion(missingFields, current.followUpAnswers.length),
          error: null,
          record,
          remainingMissing: missingFields,
          retryAnswer: null,
          retryMode: null,
        }))
      })
      .catch((error: unknown) => {
        if (!active || generationRef.current !== generation) {
          return
        }

        setState((current) => ({
          ...current,
          error: current.record ? current.error : isOnlineRequiredError(error) ? getOnlineRequiredMessage(localeRef.current) : getCopy(copy.workspace.errors.loadLatest, localeRef.current),
        }))
      })

    return () => {
      active = false
      editQueueRef.current = null
      operationRef.current = null
      generationRef.current += 1
    }
  }, [userId, patientId, onLabActiveChange, demoSession])

  async function persistField(record: PatientRecord) {
    if (demoSession) return demoSession.saveRecord(record)
    if (!user) {
      throw new Error('Missing authenticated user.')
    }

    return persistPatientRecord(record, user.id, record.id ? undefined : createRequestIdRef.current)
  }

  const context: WorkspaceActionContext = {
    state, setState, locale, demoSession, editQueueRef, operationRef, generationRef,
    createRequestIdRef, labImportActiveRef, persistField,
  }
  function runInitialExtraction(inputOverride?: string) {
    return extractionActions.runInitialExtraction(context, inputOverride)
  }

  function runFollowUpExtraction(answer: string) {
    return extractionActions.runFollowUpExtraction(context, answer)
  }

  function runConversationalEdit(inputOverride?: string) {
    return editingActions.runConversationalEdit(context, runInitialExtraction, inputOverride)
  }

  async function retryLastAction() {
    if (state.retryMode === 'save') return extractionActions.retryPendingSave(context)
    if (state.retryMode === 'edit' && state.retryAnswer && state.record) {
      return runConversationalEdit(state.retryAnswer)
    }
    if (state.retryMode === 'follow-up' && state.retryAnswer) {
      return runFollowUpExtraction(state.retryAnswer)
    }
    return runInitialExtraction()
  }

  async function submitComposerInput() {
    if (state.record) {
      await runConversationalEdit()
      return
    }

    await runInitialExtraction()
  }

  function setExtractionInput(extractionInput: string) {
    setState((current) => ({ ...current, extractionInput }))
  }

  async function reloadAfterLabSave(id: string) {
    const generation = generationRef.current
    const record = await (demoSession ? demoSession.loadRecord(id) : loadPatientRecordById(id))
    if (generation !== generationRef.current) return
    if (!record) throw new Error('Saved patient record could not be reloaded.')
    editQueueRef.current = null
    const remainingMissing = getMissingCriticalFields(record)
    setState((current) => ({ ...current, record, remainingMissing, error: null, currentQuestion: getNextQuestion(remainingMissing, current.followUpAnswers.length) }))
  }

  return {
    ...state,
    importMedicalDocument: (file: File) => ocrActions.importMedicalDocument(context, file),
    confirmOcrText: () => ocrActions.confirmOcrText(context, runInitialExtraction),
    discardOcrText: () => ocrActions.discardOcrText(context),
    handleFieldCommit: (target: PatientFieldTarget, value: string) => editingActions.handleFieldCommit(context, target, value),
    retryLastAction,
    runFollowUpExtraction,
    runInitialExtraction,
    submitComposerInput,
    setExtractionInput,
    labImportActive,
    onLabActiveChange,
    reloadAfterLabSave,
    userId,
  }
}

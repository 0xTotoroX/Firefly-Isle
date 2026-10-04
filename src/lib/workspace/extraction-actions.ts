/**
 * [INPUT]: 提取服务、持久化接口和工作台动作上下文。
 * [OUTPUT]: 新病历提取、最多三轮追问和仅重试持久化动作。
 * [POS]: workspace 的提取流程；稳定创建 ID、保留失败草稿并隔离失效请求。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部，并同步本目录 AGENTS.md。
 */
import { createDemoExtraction } from '@/lib/demo-fixtures'
import { copy, getCopy } from '@/lib/copy'
import { extractPatientRecord, getExtractionFailureMessage, getMissingCriticalFields } from '@/lib/extraction'
import { getOnlineRequiredMessage, isOnlineRequiredError } from '@/lib/network-status'
import { getFollowUpPersistenceFailurePatch, getNextQuestion, type WorkspaceActionContext } from './state'

export async function runInitialExtraction(context: WorkspaceActionContext, inputOverride?: string) {
  const { state, setState, locale, demoSession, editQueueRef, operationRef, generationRef, createRequestIdRef, labImportActiveRef, persistField } = context
  if (editQueueRef.current?.pending || operationRef.current || labImportActiveRef.current) return
  editQueueRef.current = null
  const extractionText = inputOverride ?? state.extractionInput

  if (!extractionText.trim()) {
    setState((current) => ({
      ...current,
      error: getCopy(copy.workspace.errors.missingInput, locale),
      retryMode: null,
    }))
    return
  }

  const operation = Symbol()
  operationRef.current = operation
  createRequestIdRef.current = crypto.randomUUID()
  generationRef.current += 1
  setState((current) => ({
    ...current,
    currentQuestion: null,
    editFeedback: null,
    error: null,
    followUpAnswers: [],
    isExtracting: true,
    ocr: {
      error: null,
      isProcessing: false,
      text: null,
    },
    record: null,
    remainingMissing: [],
    retryAnswer: null,
    retryMode: null,
  }))

  try {
    const record = demoSession ? createDemoExtraction() : await extractPatientRecord(extractionText)
    if (operationRef.current !== operation) return
    const missingFields = getMissingCriticalFields(record)
    let persistedRecord = record
    let persistenceError: string | null = null

    try {
      persistedRecord = await persistField(record)
      if (operationRef.current !== operation) return
    } catch (error) {
      if (operationRef.current !== operation) return
      persistenceError = isOnlineRequiredError(error) ? getOnlineRequiredMessage(locale) : getCopy(copy.workspace.errors.savePatient, locale)
    }

    setState((current) => ({
      ...current,
      currentQuestion: persistenceError ? null : getNextQuestion(missingFields, 0),
      editFeedback: null,
      error: persistenceError,
      followUpAnswers: [],
      isExtracting: false,
      record: persistedRecord,
      remainingMissing: missingFields,
      retryAnswer: null,
      retryMode: persistenceError ? 'save' : null,
    }))
  } catch (error) {
    if (operationRef.current !== operation) return
    setState((current) => ({
      ...current,
      error: getExtractionFailureMessage(error, locale, 'initial'),
      isExtracting: false,
      retryAnswer: null,
      retryMode: 'initial',
    }))
  } finally {
    if (operationRef.current === operation) operationRef.current = null
  }
}


export async function runFollowUpExtraction(context: WorkspaceActionContext, answer: string) {
  const { state, setState, locale, demoSession, editQueueRef, operationRef, generationRef, labImportActiveRef, persistField } = context
  if (editQueueRef.current?.pending || operationRef.current || labImportActiveRef.current || state.retryMode === 'save') return
  editQueueRef.current = null
  if (!answer.trim() || !state.record) {
    return
  }

  const previousRecord = state.record

  const operation = Symbol()
  operationRef.current = operation
  generationRef.current += 1
  setState((current) => ({
    ...current,
    error: null,
    editFeedback: null,
    isExtracting: true,
    retryAnswer: null,
    retryMode: null,
  }))

  try {
    const nextRecord = demoSession ? { ...previousRecord, basicInfo: { ...previousRecord.basicInfo, stage: 'II 期（固定示例）' } } : await extractPatientRecord(answer, previousRecord)
    if (operationRef.current !== operation) return

    try {
      const persistedRecord = await persistField(nextRecord)
      if (operationRef.current !== operation) return
      const nextMissing = getMissingCriticalFields(persistedRecord)

      setState((current) => {
        const followUpAnswers = [...current.followUpAnswers, answer]

        return {
          ...current,
          currentQuestion: getNextQuestion(nextMissing, followUpAnswers.length),
          editFeedback: null,
          error: null,
          followUpAnswers,
          isExtracting: false,
          record: persistedRecord,
          remainingMissing: nextMissing,
          retryAnswer: null,
          retryMode: null,
        }
      })
    } catch (error) {
      if (operationRef.current !== operation) return
      setState((current) => ({
        ...current,
        ...(isOnlineRequiredError(error)
          ? {
              currentQuestion: getNextQuestion(getMissingCriticalFields(previousRecord), current.followUpAnswers.length),
              editFeedback: null,
              error: getOnlineRequiredMessage(locale),
              isExtracting: false,
              record: previousRecord,
              remainingMissing: getMissingCriticalFields(previousRecord),
              retryAnswer: answer,
              retryMode: 'follow-up' as const,
            }
          : getFollowUpPersistenceFailurePatch(previousRecord, answer, current.followUpAnswers.length, locale)),
      }))
    }
  } catch (error) {
    if (operationRef.current !== operation) return
    setState((current) => ({
      ...current,
      editFeedback: null,
      error: getExtractionFailureMessage(error, locale, 'follow-up'),
      isExtracting: false,
      retryAnswer: answer,
      retryMode: 'follow-up',
    }))
  } finally {
    if (operationRef.current === operation) operationRef.current = null
  }
}


export async function retryPendingSave(context: WorkspaceActionContext) {
  const { state, setState, locale, editQueueRef, operationRef, labImportActiveRef, persistField } = context
  if (!state.record) return
  if (operationRef.current || labImportActiveRef.current) return
  const operation = Symbol()
  operationRef.current = operation
  setState((current) => ({ ...current, isSaving: true, error: null }))
  try {
    const record = await persistField(state.record)
    if (operationRef.current !== operation) return
    const missing = getMissingCriticalFields(record)
    editQueueRef.current = null
    setState((current) => ({ ...current, record, isSaving: false, retryMode: null, remainingMissing: missing, currentQuestion: getNextQuestion(missing, current.followUpAnswers.length) }))
  } catch (error) {
    if (operationRef.current !== operation) return
    setState((current) => ({ ...current, isSaving: false, error: isOnlineRequiredError(error) ? getOnlineRequiredMessage(locale) : getCopy(copy.workspace.errors.savePatient, locale) }))
  } finally {
    if (operationRef.current === operation) operationRef.current = null
  }
}

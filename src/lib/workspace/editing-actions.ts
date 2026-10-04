/**
 * [INPUT]: 自然语言字段补丁、串行字段队列及工作台动作上下文。
 * [OUTPUT]: 口述修改与逐字段保存动作。
 * [POS]: workspace 的编辑边界；以最后成功病历为基础排队，失败保留原记录。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部，并同步本目录 AGENTS.md。
 */
import { copy, getCopy } from '@/lib/copy'
import { getMissingCriticalFields } from '@/lib/extraction'
import { getOnlineRequiredMessage, isOnlineRequiredError } from '@/lib/network-status'
import { createRecordEditQueue } from '@/lib/records/record-edit-queue'
import { RecordEditParseError, applyPatientRecordEdits, extractPatientRecordEdits } from '@/lib/records/record-editing'
import type { PatientFieldTarget, PatientRecord } from '@/types/patient'
import { getNextQuestion, getSaveErrorMessage, type WorkspaceActionContext } from './state'

export async function runConversationalEdit(context: WorkspaceActionContext, runInitialExtraction: (inputOverride?: string) => Promise<void>, inputOverride?: string) {
  const { state, setState, locale, demoSession, editQueueRef, operationRef, generationRef, labImportActiveRef, persistField } = context
  if (editQueueRef.current?.pending || operationRef.current || labImportActiveRef.current || state.retryMode === 'save') return
  editQueueRef.current = null
  const editCommand = inputOverride ?? state.extractionInput
  const previousRecord = state.record

  if (!previousRecord) {
    await runInitialExtraction(inputOverride)
    return
  }

  if (!editCommand.trim()) {
    setState((current) => ({
      ...current,
      editFeedback: null,
      error: getCopy(copy.workspace.errors.missingInput, locale),
      retryMode: null,
    }))
    return
  }

  const operation = Symbol()
  operationRef.current = operation
  generationRef.current += 1
  setState((current) => ({
    ...current,
    editFeedback: null,
    error: null,
    isExtracting: true,
    retryAnswer: null,
    retryMode: null,
  }))

  let nextRecord: PatientRecord

  try {
    nextRecord = demoSession ? { ...previousRecord, clinicalNotes: '固定修改示例：已整理本次复诊资料。未调用模型或分析输入内容。' } : applyPatientRecordEdits(previousRecord, await extractPatientRecordEdits(editCommand, previousRecord))
    if (operationRef.current !== operation) return
  } catch (error) {
    if (operationRef.current !== operation) return
    setState((current) => ({
      ...current,
      editFeedback: null,
      error: getCopy(error instanceof RecordEditParseError ? copy.workspace.errors.editParse : copy.workspace.errors.editRequest, locale),
      isExtracting: false,
      record: previousRecord,
      retryAnswer: editCommand,
      retryMode: 'edit',
    }))
    operationRef.current = null
    return
  }

  try {
    const persistedRecord = await persistField(nextRecord)
    if (operationRef.current !== operation) return
    const nextMissing = getMissingCriticalFields(persistedRecord)

    setState((current) => ({
      ...current,
      currentQuestion: getNextQuestion(nextMissing, current.followUpAnswers.length),
      editFeedback: getCopy(copy.workspace.composer.editSaved, locale),
      error: null,
      extractionInput: '',
      isExtracting: false,
      record: persistedRecord,
      remainingMissing: nextMissing,
      retryAnswer: null,
      retryMode: null,
    }))
  } catch (error) {
    if (operationRef.current !== operation) return
    setState((current) => ({
      ...current,
      editFeedback: null,
      error: isOnlineRequiredError(error) ? getOnlineRequiredMessage(locale) : getCopy(copy.workspace.errors.editSave, locale),
      isExtracting: false,
      record: previousRecord,
      retryAnswer: editCommand,
      retryMode: 'edit',
    }))
  } finally {
    if (operationRef.current === operation) operationRef.current = null
  }
}


export async function handleFieldCommit(context: WorkspaceActionContext, target: PatientFieldTarget, value: string) {
  const { state, setState, locale, editQueueRef, operationRef, labImportActiveRef, persistField } = context
  if (!state.record || operationRef.current || labImportActiveRef.current || state.retryMode === 'save') return
  const queue = editQueueRef.current ?? createRecordEditQueue(state.record, persistField)
  editQueueRef.current = queue
  setState((current) => ({ ...current, error: null, editFeedback: null, isSaving: true }))
  try {
    const record = await queue.enqueue([{ target, value }])
    if (editQueueRef.current !== queue) return
    const remainingMissing = getMissingCriticalFields(record)
    setState((current) => ({
      ...current, record, remainingMissing, isSaving: queue.pending > 0,
      currentQuestion: getNextQuestion(remainingMissing, current.followUpAnswers.length),
    }))
  } catch (error) {
    if (editQueueRef.current !== queue) return
    setState((current) => ({
      ...current, isSaving: queue.pending > 0,
      error: isOnlineRequiredError(error) ? getOnlineRequiredMessage(locale) : getSaveErrorMessage(target, locale),
    }))
  }
}

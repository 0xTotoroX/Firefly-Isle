/**
 * [INPUT]: 医学文档 OCR client、虚构示例及工作台动作上下文。
 * [OUTPUT]: OCR 导入、确认文字后提取及取消待确认文字动作。
 * [POS]: workspace 的 OCR 边界；识别期间与提取/编辑互斥，账号切换丢弃迟到文字。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部，并同步本目录 AGENTS.md。
 */
import { DEMO_INTAKE_TEXT } from '@/lib/demo-fixtures'
import { recognizeMedicalDocument } from '@/lib/medical-document-ocr'
import { getConfirmedOcrText, getFailedOcrImportPatch, type WorkspaceActionContext } from './state'

export async function importMedicalDocument(context: WorkspaceActionContext, file: File) {
  const { state, setState, locale, demoSession, editQueueRef, operationRef, generationRef, labImportActiveRef } = context
  if (editQueueRef.current?.pending || operationRef.current || labImportActiveRef.current || state.retryMode === 'save') return
  const operation = Symbol()
  operationRef.current = operation
  const generation = ++generationRef.current
  setState((current) => ({
    ...current,
    error: null,
    ocr: {
      error: null,
      isProcessing: true,
      text: null,
    },
  }))

  try {
    const result = demoSession ? { text: DEMO_INTAKE_TEXT } : await recognizeMedicalDocument(file)
    if (generationRef.current !== generation) return

    setState((current) => ({
      ...current,
      ocr: {
        error: null,
        isProcessing: false,
        text: result.text,
      },
    }))
  } catch (error) {
    if (generationRef.current !== generation) return
    setState((current) => ({
      ...current,
      ...getFailedOcrImportPatch(current, error, locale),
    }))
  } finally {
    if (operationRef.current === operation) operationRef.current = null
  }
}


export async function confirmOcrText(context: WorkspaceActionContext, runInitialExtraction: (inputOverride?: string) => Promise<void>) {
  const { state, setState } = context
  const ocrText = getConfirmedOcrText(state.ocr.text)

  if (!ocrText) {
    return
  }

  setState((current) => ({
    ...current,
    extractionInput: ocrText,
    ocr: {
      error: null,
      isProcessing: false,
      text: null,
    },
  }))

  await runInitialExtraction(ocrText)
}


export function discardOcrText(context: WorkspaceActionContext) {
  const { setState } = context
  setState((current) => ({
    ...current,
    ocr: {
      error: null,
      isProcessing: false,
      text: null,
    },
  }))
}

/**
 * [INPUT]: 依赖 @/components/app-shell 的设计复刻壳层，依赖 @/components/workspace 的输入区、追问区与报告预览 feature 组件，依赖 @/lib/auth 的当前会话身份标签，依赖 @/lib/extraction 的提取主链路，依赖 @/lib/record-editing 的自然语言编辑边界，依赖 @/lib/medical-document-ocr 的医学文档 OCR client，依赖 @/lib/patient-record-storage 的落库与最近记录恢复入口，依赖 @/lib/theme 的 useTheme 与 record-edit-queue 的串行字段保存。
 * [OUTPUT]: 对外提供 WorkspacePage 与状态补丁；/app?patient=<id> 选择患者，化验保存后重读，初次提取持久化失败可独立重试保存。
 * [POS]: routes 的临床工作区 orchestration 层，保留真实用户空白输入态、无病历时禁用病历/统计导航并提示先提取、文本/OCR 文件输入、追问、解析错误恢复、显式新病历提取分流与 inline edit 持久化，保持主题/语言切换前状态，互斥模型修改并丢弃旧账号结果；编排统一 system shell 与 workspace feature 组件。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useDemoSession, useProductPath } from '@/lib/demo-session'
import { createDemoExtraction, DEMO_INTAKE_TEXT } from '@/lib/demo-fixtures'
import { DemoModeBanner } from '@/components/system/demo-mode-banner'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArchiveSideNav, ClinicalTopBar } from '@/components/app-shell'
import { getCopy, copy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import { ExtractionComposer } from '@/components/workspace/extraction-composer'
import { FollowUpPanel } from '@/components/workspace/follow-up-panel'
import { LabReportImport } from '@/components/workspace/lab-report-import'
import { ReportPreviewFrame } from '@/components/workspace/report-preview-frame'
import { MainShell, SectionSurface } from '@/components/system/surfaces'
import { useOptionalAuth } from '@/lib/auth'
import {
  buildFollowUpQuestion,
  extractPatientRecord,
  getExtractionFailureMessage,
  getMissingCriticalFields,
  MAX_FOLLOW_UP_ROUNDS,
} from '@/lib/extraction'
import { getMedicalDocumentOcrMessage, recognizeMedicalDocument } from '@/lib/medical-document-ocr'
import { getOnlineRequiredMessage, isOnlineRequiredError } from '@/lib/network-status'
import { createRecordEditQueue } from '@/lib/record-edit-queue'
import { loadLatestPatientRecord, loadPatientRecordById, persistPatientRecord } from '@/lib/patient-record-storage'
import { RecordEditParseError, applyPatientRecordEdits, extractPatientRecordEdits } from '@/lib/record-editing'
import { useTheme } from '@/lib/theme'
import { shellContentWidthClass, sidebarOffsetClass, topBarOffsetClass } from '@/lib/theme/tokens'
import type { PatientFieldTarget, PatientRecord } from '@/types/patient'

type WorkspacePageProps = {
  isSigningOut?: boolean
  onSignOut?: () => void
  userIsAnonymous?: boolean
  userLabel?: string
}

type ExtractionState = {
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

const EMPTY_RECORD: PatientRecord = {
  treatmentLines: [],
}

function getSaveErrorMessage(target: PatientFieldTarget, locale: 'zh' | 'en') {
  return target.section === 'treatmentLine'
    ? getCopy(copy.workspace.errors.saveTreatmentLine, locale)
    : getCopy(copy.workspace.errors.savePatient, locale)
}

function getNextQuestion(missingFields: string[], followUpCount: number) {
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

function createInitialExtractionState(): ExtractionState {
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

function useExtractionState(patientId: string | null) {
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

  useEffect(() => {
    editQueueRef.current = null
    operationRef.current = null
    createRequestIdRef.current = undefined
    generationRef.current += 1
    onLabActiveChange(false)
    const generation = generationRef.current
    setState(createInitialExtractionState())
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
        if (!active) {
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

  async function runInitialExtraction(inputOverride?: string) {
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

  async function runFollowUpExtraction(answer: string) {
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

  async function retryLastAction() {
    if (state.retryMode === 'save' && state.record) {
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
      return
    }
    if (state.retryMode === 'edit' && state.retryAnswer && state.record) {
      await runConversationalEdit(state.retryAnswer)
      return
    }

    if (state.retryMode === 'follow-up' && state.retryAnswer) {
      await runFollowUpExtraction(state.retryAnswer)
      return
    }

    await runInitialExtraction()
  }

  async function runConversationalEdit(inputOverride?: string) {
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

  async function submitComposerInput() {
    if (state.record) {
      await runConversationalEdit()
      return
    }

    await runInitialExtraction()
  }

  async function importMedicalDocument(file: File) {
    if (editQueueRef.current?.pending || operationRef.current || labImportActiveRef.current || state.retryMode === 'save') return
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
    }
  }

  async function confirmOcrText() {
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

  function discardOcrText() {
    setState((current) => ({
      ...current,
      ocr: {
        error: null,
        isProcessing: false,
        text: null,
      },
    }))
  }

  async function persistField(record: PatientRecord) {
    if (demoSession) return demoSession.saveRecord(record)
    if (!user) {
      throw new Error('Missing authenticated user.')
    }

    return persistPatientRecord(record, user.id, record.id ? undefined : createRequestIdRef.current)
  }

  async function handleFieldCommit(target: PatientFieldTarget, value: string) {
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
    handleFieldCommit,
    confirmOcrText,
    discardOcrText,
    importMedicalDocument,
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

export function WorkspacePage({ isSigningOut, onSignOut, userIsAnonymous, userLabel }: WorkspacePageProps) {
  const [searchParams] = useSearchParams()
  const demo = useDemoSession()
  const productPath = useProductPath()
  const patientId = searchParams.get('patient')
  const { locale } = useLocale()
  const { theme } = useTheme()
  const {
    currentQuestion,
    editFeedback,
    error,
    extractionInput,
    confirmOcrText,
    discardOcrText,
    followUpAnswers,
    handleFieldCommit,
    importMedicalDocument,
    isExtracting,
    isSaving,
    ocr,
    record,
    remainingMissing,
    retryLastAction,
    retryMode,
    runFollowUpExtraction,
    runInitialExtraction,
    submitComposerInput,
    setExtractionInput,
    labImportActive,
    onLabActiveChange,
    reloadAfterLabSave,
    userId,
  } = useExtractionState(patientId)
  const displayRecord = record ?? EMPTY_RECORD

  return (
    <div className={`${theme === 'light' ? 'ff-light-workspace-bg' : 'bg-[var(--ff-surface-base)] font-[var(--ff-font-ui)]'} min-h-screen text-[var(--ff-text-primary)]`}>
      <ClinicalTopBar theme={theme} title={locale === 'zh' ? '病程整理台' : 'Clinical Course Organizer'} withRail />
      <ArchiveSideNav
        analyticsHref={record?.id ? `/analytics/${record.id}` : null}
        dark={theme === 'dark'}
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
        recordHref={record?.id ? `/record/${record.id}` : null}
        userIsAnonymous={userIsAnonymous}
        userLabel={userLabel}
      />

      <MainShell className={`${topBarOffsetClass} ${sidebarOffsetClass} min-h-screen`} theme={theme}>
        <SectionSurface className="border-0 px-4 pb-2 pt-4 md:px-8 md:pb-3 md:pt-4" theme={theme} tone="base">
          <div className={`${shellContentWidthClass} t-route-reveal space-y-6`}>
            {demo ? <><DemoModeBanner /><div className="flex flex-wrap items-center gap-3 text-sm"><button className="min-h-[44px] rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 font-semibold" onClick={() => setExtractionInput(DEMO_INTAKE_TEXT)} type="button">{locale === 'zh' ? '填入虚构示例' : 'Use fictional example'}</button><span>{locale === 'zh' ? '提取、追问与口述修改均返回固定示例，可直接编辑字段。' : 'Extraction and conversational edits return fixed examples. Fields remain editable.'}</span></div></> : null}
            <ExtractionComposer
              composerMode={getWorkspaceComposerMode(record)}
              error={error}
              feedback={editFeedback}
              extractionInput={extractionInput}
              isExtracting={isExtracting}
              isSaving={isSaving}
              isLocked={labImportActive}
              ocrState={ocr}
              onConfirmOcrText={() => void confirmOcrText()}
              onDiscardOcrText={discardOcrText}
              onExtract={() => void submitComposerInput()}
              onExtractAsNew={record ? () => void runInitialExtraction() : undefined}
              onImportFile={(file) => void importMedicalDocument(file)}
              onInputChange={setExtractionInput}
              onRetry={() => void retryLastAction()}
              remainingMissingCount={remainingMissing.length}
              retryMode={retryMode}
              theme={theme}
            />

            {currentQuestion ? (
              <FollowUpPanel busy={isExtracting || isSaving || labImportActive} currentQuestion={currentQuestion} onSubmit={(value) => void runFollowUpExtraction(value)} theme={theme} />
            ) : null}
            <LabReportImport
              disabled={isExtracting || isSaving || ocr.isProcessing || Boolean(ocr.text) || retryMode === 'save'}
              key={`${userId}:${patientId}:${record?.id}`}
              onActiveChange={onLabActiveChange}
              onSaved={reloadAfterLabSave}
              record={record}
              theme={theme}
            />
          </div>
        </SectionSurface>

        <SectionSurface className="border-0 px-4 pb-8 pt-2 md:px-8 md:pb-8 md:pt-3" theme={theme} tone="base">
          <div className={`${shellContentWidthClass} t-stagger`} style={{ '--t-order': 1 } as CSSProperties}>
            <ReportPreviewFrame
              followUpCount={Math.min(MAX_FOLLOW_UP_ROUNDS, followUpAnswers.length)}
              isExtracting={isExtracting}
              isSaving={isSaving}
              isLocked={labImportActive || retryMode === 'save'}
              onCommitField={handleFieldCommit}
              record={displayRecord}
              recordDetailsHref={record?.id ? productPath(`/record/${record.id}`) : undefined}
              remainingMissing={remainingMissing}
              setReportRef={() => undefined}
              theme={theme}
            />
          </div>
        </SectionSurface>
      </MainShell>
    </div>
  )
}

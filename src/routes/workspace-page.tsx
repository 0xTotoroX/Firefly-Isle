/**
 * [INPUT]: 依赖 @/components/app-shell 的设计复刻壳层，依赖 @/components/workspace 的输入区、追问区与报告预览 feature 组件，依赖 @/lib/auth 的当前会话身份标签，依赖 @/lib/extraction 的提取主链路，依赖 @/lib/record-editing 的自然语言编辑边界，依赖 @/lib/medical-document-ocr 的医学文档 OCR client，依赖 @/lib/patient-record-storage 的落库与最近记录恢复入口，依赖 @/lib/theme 的 useTheme 与 record-edit-queue 的串行字段保存。
 * [OUTPUT]: 对外提供 WorkspacePage 组件与工作区状态补丁 helpers，对应 /app。
 * [POS]: routes 的临床工作区 orchestration 层，保留真实用户空白输入态、无病历时禁用病历/统计导航并提示先提取、文本/OCR 文件输入、追问、解析错误恢复、显式新病历提取分流与 inline edit 持久化，保持主题/语言切换前状态，互斥模型修改并丢弃旧账号结果；编排统一 system shell 与 workspace feature 组件。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArchiveSideNav, ClinicalTopBar } from '@/components/app-shell'
import { getCopy, copy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import { ExtractionComposer } from '@/components/workspace/extraction-composer'
import { FollowUpPanel } from '@/components/workspace/follow-up-panel'
import { ReportPreviewFrame } from '@/components/workspace/report-preview-frame'
import { MainShell, SectionSurface } from '@/components/system/surfaces'
import { useAuth } from '@/lib/auth'
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
import { loadLatestPatientRecord, persistPatientRecord } from '@/lib/patient-record-storage'
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
  retryMode: 'initial' | 'follow-up' | 'edit' | null
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

function useExtractionState() {
  const editQueueRef = useRef<ReturnType<typeof createRecordEditQueue> | null>(null)
  const { user } = useAuth()
  const { locale } = useLocale()
  const userId = user?.id
  const localeRef = useRef(locale)
  const operationRef = useRef<symbol | null>(null)
  const generationRef = useRef(0)
  useEffect(() => { localeRef.current = locale }, [locale])
  const [state, setState] = useState(createInitialExtractionState)

  useEffect(() => {
    editQueueRef.current = null
    operationRef.current = null
    generationRef.current += 1
    const generation = generationRef.current
    setState(createInitialExtractionState())
    if (!userId) return

    let active = true

    void loadLatestPatientRecord(userId)
      .then((record) => {
        if (!active || !record || generationRef.current !== generation) {
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
  }, [userId])

  async function runInitialExtraction(inputOverride?: string) {
    if (editQueueRef.current?.pending || operationRef.current) return
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
      const record = await extractPatientRecord(extractionText)
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
        currentQuestion: getNextQuestion(missingFields, 0),
        editFeedback: null,
        error: persistenceError,
        followUpAnswers: [],
        isExtracting: false,
        record: persistedRecord,
        remainingMissing: missingFields,
        retryAnswer: null,
        retryMode: null,
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
    if (editQueueRef.current?.pending || operationRef.current) return
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
      const nextRecord = await extractPatientRecord(answer, previousRecord)
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
    if (editQueueRef.current?.pending || operationRef.current) return
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
      nextRecord = applyPatientRecordEdits(previousRecord, await extractPatientRecordEdits(editCommand, previousRecord))
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
      const result = await recognizeMedicalDocument(file)
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
    if (!user) {
      throw new Error('Missing authenticated user.')
    }

    return persistPatientRecord(record, user.id)
  }

  async function handleFieldCommit(target: PatientFieldTarget, value: string) {
    if (!state.record || operationRef.current) return
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
  }
}

export function WorkspacePage({ isSigningOut, onSignOut, userIsAnonymous, userLabel }: WorkspacePageProps) {
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
  } = useExtractionState()
  const displayRecord = record ?? EMPTY_RECORD

  return (
    <div className={`${theme === 'light' ? 'ff-light-workspace-bg' : 'bg-[var(--ff-surface-base)] font-[var(--ff-font-ui)]'} min-h-screen text-[var(--ff-text-primary)]`}>
      <ClinicalTopBar theme={theme} title={locale === 'zh' ? '病程整理台' : 'Clinical Course Organizer'} withRail />
      <ArchiveSideNav
        analyticsHref={record?.id ? `/analytics/${record.id}` : undefined}
        dark={theme === 'dark'}
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
        recordHref={record?.id ? `/record/${record.id}` : undefined}
        userIsAnonymous={userIsAnonymous}
        userLabel={userLabel}
      />

      <MainShell className={`${topBarOffsetClass} ${sidebarOffsetClass} min-h-screen`} theme={theme}>
        <SectionSurface className="border-0 px-4 pb-2 pt-4 md:px-8 md:pb-3 md:pt-4" theme={theme} tone="base">
          <div className={`${shellContentWidthClass} t-route-reveal space-y-6`}>
            <ExtractionComposer
              composerMode={getWorkspaceComposerMode(record)}
              error={error}
              feedback={editFeedback}
              extractionInput={extractionInput}
              isExtracting={isExtracting}
              isSaving={isSaving}
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
              <FollowUpPanel busy={isExtracting || isSaving} currentQuestion={currentQuestion} onSubmit={(value) => void runFollowUpExtraction(value)} theme={theme} />
            ) : null}
          </div>
        </SectionSurface>

        <SectionSurface className="border-0 px-4 pb-8 pt-2 md:px-8 md:pb-8 md:pt-3" theme={theme} tone="base">
          <div className={`${shellContentWidthClass} t-stagger`} style={{ '--t-order': 1 } as CSSProperties}>
            <ReportPreviewFrame
              followUpCount={Math.min(MAX_FOLLOW_UP_ROUNDS, followUpAnswers.length)}
              isExtracting={isExtracting}
              isSaving={isSaving}
              onCommitField={handleFieldCommit}
              record={displayRecord}
              recordDetailsHref={record?.id ? `/record/${record.id}` : undefined}
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

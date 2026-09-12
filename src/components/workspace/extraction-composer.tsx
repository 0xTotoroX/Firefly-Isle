/**
 * [INPUT]: 依赖 react 的 Effect、ref 与本地文字切换状态，依赖 @/components/system/surfaces 的 ActionSurface 与 PanelSurface，依赖 react-router-dom 的 Link 指向 /models，依赖 @/lib/copy 的工作区文案真相源与外部传入的工作区提取/OCR/编辑模式状态，依赖 transitions-dev.css 的 .t-icon-swap、.t-text-swap、.t-control-press 与 .t-popover 动效合同。
 * [OUTPUT]: 对外提供 ExtractionComposer 组件，渲染同构文本输入、OCR 文件输入、LLM provider 设置、语音工具、OCR 确认、编辑反馈、错误提示、重试入口、已有病历编辑主动作与新病历提取分流动作。
 * [POS]: components/workspace 的输入与主操作区块，被 workspace-page 组合，负责把 /app 收敛为病史输入、病历/检验报告文件上传、模型设置、医学文档 OCR 与结构化提取工作台。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react'

import { getCopy, copy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'

import { ActionSurface, PanelSurface } from '@/components/system/surfaces'
import { Link } from 'react-router-dom'

type ExtractionComposerProps = {
  composerMode?: 'extract' | 'edit'
  error: string | null
  extractionInput: string
  feedback?: string | null
  isExtracting: boolean
  isSaving: boolean
  ocrState?: OcrState
  onConfirmOcrText?: () => void
  onDiscardOcrText?: () => void
  onExtract: () => void
  onExtractAsNew?: () => void
  onImportFile?: (file: File) => void
  onInputChange: (value: string) => void
  onRetry: () => void
  remainingMissingCount: number
  retryMode: 'initial' | 'follow-up' | 'edit' | null
  theme: 'dark' | 'light'
}

type OcrState = {
  error: string | null
  isProcessing: boolean
  text: string | null
}

const MAX_EXTRACTION_INPUT_LENGTH = 8000

function getUnavailableTitle(feature: string, locale: 'zh' | 'en') {
  return locale === 'zh' ? `${feature}暂未开放` : `${feature} is not available yet`
}

function getUploadTitle(locale: 'zh' | 'en') {
  return locale === 'zh' ? '上传病历图片、检验报告或 PDF' : 'Upload record image, lab report, or PDF'
}

export function ExtractionComposer({
  composerMode = 'extract',
  error,
  extractionInput,
  feedback = null,
  isExtracting,
  isSaving,
  ocrState = { error: null, isProcessing: false, text: null },
  onConfirmOcrText,
  onDiscardOcrText,
  onExtract,
  onExtractAsNew,
  onImportFile,
  onInputChange,
  onRetry,
  remainingMissingCount,
  retryMode,
  theme,
}: ExtractionComposerProps) {
  const { locale } = useLocale()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const disabled = isExtracting || isSaving || ocrState.isProcessing
  const isEditMode = composerMode === 'edit'
  const statusLabel = isExtracting
    ? getCopy(copy.workspace.composer.analyzing, locale)
    : remainingMissingCount > 0
      ? `${locale === 'zh' ? '待补充' : 'Missing'} ${remainingMissingCount}`
      : getCopy(copy.workspace.composer.ready, locale)
  const extractLabel = isExtracting
    ? getCopy(isEditMode ? copy.workspace.composer.editing : copy.workspace.composer.extracting, locale)
    : getCopy(isEditMode ? copy.workspace.composer.applyEdit : copy.workspace.composer.extract, locale)
  const [visibleExtractLabel, setVisibleExtractLabel] = useState(extractLabel)
  const [textSwapState, setTextSwapState] = useState('')
  const [toolMessage, setToolMessage] = useState<string | null>(null)
  const inputTooLong = extractionInput.length > MAX_EXTRACTION_INPUT_LENGTH
  const voiceUnavailableTitle = getUnavailableTitle(getCopy(copy.workspace.composer.voiceInput, locale), locale)
  const uploadTitle = getUploadTitle(locale)

  useEffect(() => {
    if (extractLabel === visibleExtractLabel) {
      return undefined
    }

    let exitFrame: number | null = null
    let timer: number | null = null

    exitFrame = window.requestAnimationFrame(() => {
      setTextSwapState('is-exit')
      timer = window.setTimeout(() => {
        setVisibleExtractLabel(extractLabel)
        setTextSwapState('')
      }, 200)
    })

    return () => {
      if (exitFrame !== null) {
        window.cancelAnimationFrame(exitFrame)
      }
      if (timer !== null) {
        window.clearTimeout(timer)
      }
    }
  }, [extractLabel, visibleExtractLabel])

  return (
    <PanelSurface className="p-4 sm:p-6" theme={theme} tone="panel">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[28px] text-[var(--ff-text-primary)]">clinical_notes</span>
          <label className="font-[var(--ff-font-display)] text-2xl font-black leading-tight tracking-normal text-[var(--ff-text-primary)]" htmlFor="patient-history-input">
            {getCopy(copy.workspace.composer.inputLabel, locale)}
          </label>
        </div>
        <span className="sr-only">{statusLabel}</span>
      </div>

      <div className="relative">
        <textarea
          className="h-44 w-full resize-none rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] p-4 pb-16 text-base leading-7 text-[var(--ff-text-primary)] outline-none placeholder:text-[var(--ff-text-muted)] transition-[border-color,box-shadow] focus:border-[var(--ff-accent-primary)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--ff-accent-primary)_18%,transparent)] sm:h-48"
          id="patient-history-input"
          maxLength={MAX_EXTRACTION_INPUT_LENGTH}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={getCopy(copy.workspace.composer.inputPlaceholder, locale)}
          value={extractionInput}
        />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
          <label
            aria-label={getCopy(copy.workspace.composer.importRecordFile, locale)}
            className="t-control-press pointer-events-auto inline-flex h-10 items-center justify-center gap-2 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] px-3 font-[var(--ff-font-ui)] text-xs font-semibold text-[var(--ff-text-secondary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-text)] disabled:cursor-not-allowed disabled:opacity-50"
            data-input-tool="import-record-file"
            title={uploadTitle}
          >
            <input
              accept="image/*,application/pdf"
              className="sr-only"
              disabled={disabled}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]

                if (file) {
                  onImportFile?.(file)
                }

                event.currentTarget.value = ''
              }}
              ref={fileInputRef}
              type="file"
            />
            <span className="material-symbols-outlined text-lg">upload_file</span>
            {getCopy(copy.workspace.composer.importRecordFile, locale)}
          </label>
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              aria-label={getCopy(copy.workspace.composer.voiceInput, locale)}
              className="t-control-press flex h-10 w-10 items-center justify-center rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] text-[var(--ff-text-secondary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-text)] disabled:cursor-not-allowed disabled:opacity-50"
              data-input-tool="voice-input"
              disabled={disabled}
              onClick={() => setToolMessage(voiceUnavailableTitle)}
              title={voiceUnavailableTitle}
              type="button"
            >
              <span className="material-symbols-outlined text-xl">mic</span>
            </button>
            <span className={`font-[var(--ff-font-mono)] text-[11px] ${inputTooLong ? 'text-[var(--ff-accent-warning)]' : 'text-[var(--ff-text-muted)]'}`}>
              {extractionInput.length} / {MAX_EXTRACTION_INPUT_LENGTH}
            </span>
          </div>
        </div>
      </div>

      {toolMessage ? (
        <div className="t-popover mt-3 text-sm font-semibold text-[var(--ff-text-secondary)]" role="status">
          {toolMessage}
        </div>
      ) : null}

      {feedback ? (
        <div className="t-popover mt-3 text-sm font-semibold text-[var(--ff-accent-success)]" role="status">
          {feedback}
        </div>
      ) : null}

      <Link
        className="t-control-press mt-3 inline-flex min-h-[38px] items-center gap-2 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-3 text-sm font-semibold text-[var(--ff-text-secondary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-text)]"
        data-testid="composer-model-settings-link"
        to="/models"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">tune</span>
        {locale === 'zh' ? '模型设置' : 'Model settings'}
      </Link>

      {ocrState.isProcessing || ocrState.error || ocrState.text ? (
        <ActionSurface className="t-popover mt-4 px-4 py-4 text-sm" theme={theme} tone={ocrState.error ? 'warning' : 'panel'}>
          {ocrState.isProcessing ? (
            <div className="font-semibold text-[var(--ff-text-secondary)]">{locale === 'zh' ? 'OCR 识别中...' : 'Recognizing document...'}</div>
          ) : null}
          {ocrState.error ? (
            <div className="font-semibold text-[var(--ff-accent-warning)]">{ocrState.error}</div>
          ) : null}
          {ocrState.text ? (
            <div>
              <h3 className="font-[var(--ff-font-display)] text-lg font-bold tracking-normal text-[var(--ff-text-primary)]">
                {locale === 'zh' ? 'OCR 文本确认' : 'OCR Text Confirmation'}
              </h3>
              <div className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] p-3 leading-7 text-[var(--ff-text-secondary)]">
                {ocrState.text}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="t-control-press inline-flex h-10 items-center justify-center rounded-[var(--ff-radius-md)] bg-[var(--ff-accent-primary)] px-4 font-[var(--ff-font-ui)] text-sm font-bold text-[var(--ff-accent-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={disabled}
                  onClick={onConfirmOcrText}
                  type="button"
                >
                  {locale === 'zh' ? '确认并提取' : 'Confirm and Extract'}
                </button>
                <button
                  className="t-control-press inline-flex h-10 items-center justify-center rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 font-[var(--ff-font-ui)] text-sm font-semibold text-[var(--ff-text-secondary)]"
                  onClick={onDiscardOcrText}
                  type="button"
                >
                  {locale === 'zh' ? '丢弃' : 'Discard'}
                </button>
              </div>
            </div>
          ) : null}
        </ActionSurface>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {retryMode ? (
            <button
              className="t-control-press inline-flex h-12 items-center justify-center rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-5 font-[var(--ff-font-ui)] text-sm font-semibold text-[var(--ff-text-secondary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-text)]"
              onClick={onRetry}
              type="button"
            >
              {retryMode === 'follow-up'
                ? getCopy(copy.workspace.composer.retryFollowUp, locale)
                : retryMode === 'edit'
                  ? getCopy(copy.workspace.composer.retryEdit, locale)
                  : getCopy(copy.workspace.composer.retryInitial, locale)}
            </button>
          ) : null}
          {isEditMode && onExtractAsNew ? (
            <button
              className="t-control-press inline-flex h-12 items-center justify-center rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-5 font-[var(--ff-font-ui)] text-sm font-semibold text-[var(--ff-text-secondary)] transition-colors hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-text)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled || inputTooLong}
              onClick={onExtractAsNew}
              type="button"
            >
              {getCopy(copy.workspace.composer.extractAsNew, locale)}
            </button>
          ) : null}
        </div>
        <button
          className="t-control-press inline-flex h-12 items-center justify-center gap-3 rounded-[var(--ff-radius-md)] bg-[var(--ff-accent-primary)] px-6 font-[var(--ff-font-ui)] text-sm font-bold text-[var(--ff-accent-foreground)] transition-colors hover:bg-[var(--ff-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || inputTooLong}
          onClick={onExtract}
          type="button"
        >
          <span className={`t-icon-swap ${isExtracting ? 'animate-spin' : ''}`} data-state={isExtracting ? 'b' : 'a'}>
            <span className="material-symbols-outlined t-icon text-xl" data-icon="a">my_location</span>
            <span className="material-symbols-outlined t-icon text-xl" data-icon="b">progress_activity</span>
          </span>
          <span className={`t-text-swap ${textSwapState}`}>{visibleExtractLabel}</span>
        </button>
      </div>

      {error || isSaving ? (
        <div className="mt-4 grid gap-3">
          {error ? (
            <ActionSurface className="t-popover px-4 py-3 text-sm text-[var(--ff-accent-warning)]" theme={theme} tone="warning">
              {error}
            </ActionSurface>
          ) : null}
          {isSaving ? (
            <div className="t-popover font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--ff-accent-text)]">
              {getCopy(copy.workspace.composer.saving, locale)}
            </div>
          ) : null}
        </div>
      ) : null}
    </PanelSurface>
  )
}

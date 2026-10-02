/**
 * [INPUT]: 依赖 react 的 RefObject，依赖 @/components/record 的 dossier/AI 分析/分享展示、demo-record 的默认病例、record-copy 的 labels、@/components/timeline 的 TimelineTable/TreatmentGanttView、PatientRecord 字段编辑目标、./record-page.logic 的 RecordLoadState 与 transitions-dev.css 的 tab/record view 动效合同。
 * [OUTPUT]: 对外提供 RecordPageContent、RecordViewMode、RecordExportState 与 RecordSaveState，并统一档案/极简表格/Gantt 文字标签切换、轻量编辑入口、次级分享 disclosure、AI 分析入口和字段保存状态展示。
 * [POS]: routes 的档案详情内容组合层，隔离 dossier/table/gantt 视图切换、分享面板、AI 分析面板、轻量编辑工具条、字段提交入口与 crossfade 入场，让 record-page.tsx 保持路由、副作用和 Supabase 持久化编排。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { RefObject } from 'react'
import { ClinicalRecordNav } from '@/components/record/clinical-record-nav'

import type { ClinicalAnalysisPanelState } from '@/components/record/ClinicalAnalysisPanel'
import { labels } from '@/components/record/record-copy'
import { RecordSharePanel, type RecordSharePanelState } from '@/components/record/RecordSharePanel'
import { RecordDossier, RecordUnavailableDossier } from '@/components/record/record-dossier'
import type { ExportFormat } from '@/components/record/types'
import { TimelineTable } from '@/components/timeline/TimelineTable'
import { TreatmentGanttView } from '@/components/timeline/TreatmentGanttView'
import type { Locale } from '@/lib/locale'
import type { Theme } from '@/lib/theme'
import type { PatientFieldTarget, PatientRangeTarget, PatientRecord } from '@/types/patient'

import type { RecordLoadState } from './record-page.logic'

export type RecordViewMode = 'dossier' | 'table' | 'gantt'

export type RecordExportState = {
  error: string | null
  format: ExportFormat | null
  isExporting: boolean
}

export type RecordSaveState = {
  error: string | null
  status: 'idle' | 'saving' | 'saved' | 'error'
}

type RecordPageContentProps = {
  activeRecordLoadState: RecordLoadState
  clinicalAnalysisState?: ClinicalAnalysisPanelState
  demoRecord: PatientRecord
  demoRoute: boolean
  exportState: RecordExportState
  isChartEditing: boolean
  locale: Locale
  onChartEditingChange: (isEditing: boolean) => void
  onClinicalAnalyze?: () => void
  onCopyShareUrl?: () => void
  onCommitField: (target: PatientFieldTarget, value: string) => Promise<void> | void
  onCommitRange: (target: PatientRangeTarget, value: string) => Promise<void> | void
  onCreateShare?: () => void
  onExport: (format: ExportFormat) => void
  onRevokeShare?: (shareId: string) => void
  onViewModeChange: (viewMode: RecordViewMode) => void
  recordRef: RefObject<HTMLDivElement>
  saveState: RecordSaveState
  sharePreviewNotice?: string
  shareState?: RecordSharePanelState
  theme: Theme
  viewMode: RecordViewMode
}

const switchCopy = {
  en: {
    dossier: 'Dossier view',
    table: 'Timeline table',
    gantt: 'Gantt view',
  },
  zh: {
    dossier: '档案视图',
    table: '极简表格',
    gantt: '甘特图视图',
  },
} satisfies Record<Locale, Record<RecordViewMode, string>>

const emptyClinicalAnalysisState: ClinicalAnalysisPanelState = {
  error: null,
  isLoading: false,
  result: null,
}

function getGanttRecord(demoRoute: boolean, activeRecordLoadState: RecordLoadState, demoRecord: PatientRecord): PatientRecord | null {
  return demoRoute ? demoRecord : activeRecordLoadState.record
}

function RecordEditToolbar({
  isChartEditing,
  locale,
  onChartEditingChange,
  saveState,
}: {
  isChartEditing: boolean
  locale: Locale
  onChartEditingChange: (isEditing: boolean) => void
  saveState: RecordSaveState
}) {
  const activeLabel = locale === 'zh' ? '完成编辑' : 'Finish editing'
  const inactiveLabel = locale === 'zh' ? '编辑病历' : 'Edit record'
  const statusText = {
    error: saveState.error ?? (locale === 'zh' ? '保存失败' : 'Save failed'),
    idle: '',
    saved: locale === 'zh' ? '已保存' : 'Saved',
    saving: locale === 'zh' ? '保存中...' : 'Saving...',
  }[saveState.status]

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm font-semibold text-[var(--ff-text-secondary)]">
      {statusText ? (
        <span className={saveState.status === 'error' ? 'text-[var(--ff-accent-text)]' : 'text-[var(--ff-text-muted)]'} role={saveState.status === 'error' ? 'alert' : 'status'}>
          {statusText}
        </span>
      ) : null}
      <button
        aria-label={isChartEditing ? activeLabel : inactiveLabel}
        aria-pressed={isChartEditing}
        className={[
          't-control-press border-b pb-0.5 text-sm font-semibold',
          isChartEditing
            ? 'border-[var(--ff-accent-primary)] text-[var(--ff-accent-text)]'
            : 'border-[var(--ff-border-default)] text-[var(--ff-text-secondary)] hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-text-primary)]',
        ].join(' ')}
        onClick={() => onChartEditingChange(!isChartEditing)}
        type="button"
      >
        {isChartEditing ? activeLabel : inactiveLabel}
      </button>
    </div>
  )
}

function RecordViewSwitch({
  locale,
  onViewModeChange,
  viewMode,
}: {
  locale: Locale
  onViewModeChange: (viewMode: RecordViewMode) => void
  viewMode: RecordViewMode
}) {
  const text = switchCopy[locale]
  const modes: RecordViewMode[] = ['dossier', 'table', 'gantt']

  return (
    <div
      aria-label={locale === 'zh' ? '病历详情视图切换' : 'Record detail view switch'}
      className="t-tab-switch flex w-full border-b border-[var(--ff-border-default)] sm:w-auto"
      data-active-page={viewMode}
      data-testid="record-view-switch"
      role="tablist"
    >
      {modes.map((mode) => {
        const active = viewMode === mode

        return (
          <button
            aria-selected={active}
            className={[
              't-control-press -mb-px border-b-2 px-3 py-2.5 text-sm font-semibold tracking-normal first:pl-0',
              active
                ? 'border-[var(--ff-accent-primary)] text-[var(--ff-text-primary)]'
                : 'border-transparent text-[var(--ff-text-muted)] hover:text-[var(--ff-text-secondary)]',
            ].join(' ')}
            key={mode}
            onClick={() => onViewModeChange(mode)}
            onKeyDown={(event) => {
              const index = modes.indexOf(mode)
              const next = { ArrowRight: (index + 1) % modes.length, ArrowLeft: (index + modes.length - 1) % modes.length, Home: 0, End: modes.length - 1 }[event.key]
              if (next === undefined) return
              event.preventDefault()
              onViewModeChange(modes[next])
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
            }}
            role="tab"
            tabIndex={active ? 0 : -1}
            type="button"
          >
            {text[mode]}
          </button>
        )
      })}
    </div>
  )
}

export function RecordPageContent({
  activeRecordLoadState,
  clinicalAnalysisState = emptyClinicalAnalysisState,
  demoRecord,
  demoRoute,
  exportState,
  isChartEditing,
  locale,
  onChartEditingChange,
  onClinicalAnalyze,
  onCopyShareUrl,
  onCommitField,
  onCommitRange,
  onCreateShare,
  onExport,
  onRevokeShare,
  onViewModeChange,
  recordRef,
  saveState,
  sharePreviewNotice,
  shareState,
  theme,
  viewMode,
}: RecordPageContentProps) {
  const ganttRecord = getGanttRecord(demoRoute, activeRecordLoadState, demoRecord)
  const switchNode = ganttRecord ? <RecordViewSwitch locale={locale} onViewModeChange={onViewModeChange} viewMode={viewMode} /> : null
  const toolbarNode = ganttRecord ? (
    <RecordEditToolbar
      isChartEditing={isChartEditing}
      locale={locale}
      onChartEditingChange={onChartEditingChange}
      saveState={saveState}
    />
  ) : null
  const controlsNode = ganttRecord ? (
    <>
    {ganttRecord.id ? <ClinicalRecordNav active="record" locale={locale} patientId={ganttRecord.id} /> : null}
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      {switchNode}
      <div className="flex items-center gap-3">

        {toolbarNode}
      </div>
    </div>
    </>
  ) : null

  if (ganttRecord && viewMode === 'gantt') {
    return (
      <>
        {controlsNode}
        <div className="t-record-view" data-active-page="gantt">
          <TreatmentGanttView
            isEditable={isChartEditing}
            locale={locale}
            onCommitField={onCommitField}
            onCommitRange={onCommitRange}
            record={ganttRecord}
          />
        </div>
      </>
    )
  }

  if (ganttRecord && viewMode === 'table') {
    return (
      <>
        {controlsNode}
        <div className="t-record-view" data-active-page="table">
          <TimelineTable
            disabled={!isChartEditing}
            onCommitField={onCommitField}
            record={ganttRecord}
            theme={theme}
          />
        </div>
      </>
    )
  }

  if (demoRoute) {
    return (
      <>
        {controlsNode}
        {shareState && onCreateShare && onCopyShareUrl && onRevokeShare ? (
          <RecordSharePanel
            locale={locale}
            onCopyCreatedUrl={onCopyShareUrl}
            onCreateShare={onCreateShare}
            onRevokeShare={onRevokeShare}
            previewNotice={sharePreviewNotice}
            state={shareState}
          />
        ) : null}
        <div className="t-record-view" data-active-page="dossier">
          <RecordDossier
            clinicalAnalysisState={clinicalAnalysisState}
            exportError={exportState.error}
            exportFormat={exportState.format}
            isEditable={isChartEditing}
            isExportDisabled={false}
            isExporting={exportState.isExporting}
            locale={locale}
            onCommitField={onCommitField}
            onCommitRange={onCommitRange}
            onClinicalAnalyze={undefined}
            onExport={onExport}
            record={demoRecord}
            recordRef={recordRef}
          />
        </div>
      </>
    )
  }

  if (activeRecordLoadState.record) {
    return (
      <>
        {controlsNode}
        {shareState && onCreateShare && onCopyShareUrl && onRevokeShare ? (
          <RecordSharePanel
            locale={locale}
            onCopyCreatedUrl={onCopyShareUrl}
            onCreateShare={onCreateShare}
            onRevokeShare={onRevokeShare}
            previewNotice={sharePreviewNotice}
            state={shareState}
          />
        ) : null}
        <div className="t-record-view" data-active-page="dossier">
          <RecordDossier
            clinicalAnalysisState={clinicalAnalysisState}
            exportError={exportState.error}
            exportFormat={exportState.format}
            isEditable={isChartEditing}
            isExportDisabled={false}
            isExporting={exportState.isExporting}
            locale={locale}
            onCommitField={onCommitField}
            onCommitRange={onCommitRange}
            onClinicalAnalyze={onClinicalAnalyze}
            onExport={onExport}
            record={activeRecordLoadState.record}
            recordRef={recordRef}
          />
        </div>
      </>
    )
  }

  return (
    <div className="t-record-view" data-active-page="dossier">
      <RecordUnavailableDossier
        exportError={exportState.error}
        exportFormat={exportState.format}
        isExporting={exportState.isExporting}
        locale={locale}
        message={activeRecordLoadState.isLoading ? labels[locale].loadingRecord : activeRecordLoadState.error ?? labels[locale].missingRecord}
        onExport={onExport}
      />
    </div>
  )
}

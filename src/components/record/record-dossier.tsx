/**
 * [INPUT]: 依赖 react 的 CSSProperties/RefObject/useId 和 record-dossier-sections 的字段/分区组件、react-router-dom 的 Link、PatientRecord、ClinicalAnalysisPanel、LabTrendsTable、record-copy、record-derived、record 展示类型与 motion.css 的 stagger/control/timeline rail 动效合同。
 * [OUTPUT]: 对外提供 RecordDossier 与 RecordUnavailableDossier 两个病例详情展示组件，以平面文档层级渲染概要证据、实验室趋势、AI 辅助分析、治疗时间线、临床备注、导出和编辑能力，返回录入时保留当前患者。
 * [POS]: components/record 的主阅读层，组合平面病历正文、吸顶章节导航、治疗阶段定位与导出边界；不再用装饰性卡片、系统认证或固定更新时间制造层级。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useProductPath } from '@/lib/demo-session'
import { useId, type CSSProperties, type RefObject } from 'react'
import { Link } from 'react-router-dom'

import type { Locale } from '@/lib/locale'
import type { PatientFieldTarget, PatientRangeTarget, PatientRecord } from '@/types/patient'

import { ClinicalAnalysisPanel, type ClinicalAnalysisPanelState } from './ClinicalAnalysisPanel'
import { getRecordSummaryMetrics, getRecordTimelineEntries } from './record-derived'
import { LabTrendsTable } from './LabTrendsTable'
import { getTimelineEntries, labels, summaryMetrics } from './record-copy'
import type { ExportFormat } from './types'
import { EditableTextValue, SummaryGrid, TimelineNode, TimelineRailMarker } from './record-dossier-sections'

export function RecordDossier({
  clinicalAnalysisState,
  exportError,
  exportFormat,
  isEditable,
  isExportDisabled,
  isExporting,
  locale,
  onCommitField,
  onCommitRange,
  onClinicalAnalyze,
  onExport,
  record,
  recordRef,
}: {
  clinicalAnalysisState: ClinicalAnalysisPanelState
  exportError: string | null
  exportFormat: ExportFormat | null
  isEditable: boolean
  isExportDisabled: boolean
  isExporting: boolean
  locale: Locale
  onCommitField?: (target: PatientFieldTarget, value: string) => Promise<void> | void
  onCommitRange?: (target: PatientRangeTarget, value: string) => Promise<void> | void
  onClinicalAnalyze?: () => void
  onExport: (format: ExportFormat) => void
  record?: PatientRecord
  recordRef: RefObject<HTMLDivElement>
}) {
  const productPath = useProductPath()
  const text = labels[locale]
  const sectionPrefix = useId()
  const sectionId = (section: string) => `${sectionPrefix}-${section}`
  const anchorClass = 'scroll-mt-[calc(var(--ff-topbar-height)+5rem)]'
  const entries = record ? getRecordTimelineEntries(record, locale) : getTimelineEntries(locale)
  const metrics = record ? getRecordSummaryMetrics(record, locale) : summaryMetrics[locale]
  const labTrendRecord = (record?.labResults?.length ?? 0) > 0 ? record : undefined
  const clinicalNotes =
    record?.clinicalNotes ??
    (locale === 'zh'
      ? '病历按诊断与治疗阶段整理。请结合原始报告和临床记录复核重要信息。'
      : 'The record is organized by diagnosis and treatment stage. Review important details against the original reports and clinical notes.')
  const patientSummary = [
    record?.basicInfo?.name,
    record?.basicInfo?.tumorType,
    record?.basicInfo?.stage,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ')

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] pb-8 [overflow-wrap:anywhere]" ref={recordRef}>
      <header className="mb-8 border-b border-[var(--ff-border-default)] pb-7">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="mb-3 text-sm text-[var(--ff-text-muted)]">{text.access}</p>
            <h1 className="text-3xl font-semibold leading-tight tracking-normal md:text-4xl">{text.pageTitle}</h1>
            {patientSummary ? (
              <p className="mt-3 text-base leading-7 text-[var(--ff-text-secondary)]">{patientSummary}</p>
            ) : null}
          </div>
          <div className="shrink-0" data-html2canvas-ignore>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <button
                className="t-control-press inline-flex min-h-11 items-center rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isExportDisabled || isExporting}
                onClick={() => onExport('pdf')}
                type="button"
              >
                {isExporting && exportFormat === 'pdf' ? text.exportPdfLoading : text.exportPdf}
              </button>
              <button
                className="t-control-press inline-flex min-h-11 items-center rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isExportDisabled || isExporting}
                onClick={() => onExport('png')}
                type="button"
              >
                {isExporting && exportFormat === 'png' ? text.exportPngLoading : text.exportPng}
              </button>
              <Link
                className="t-control-press inline-flex min-h-11 items-center border-b border-[var(--ff-border-default)] px-1 text-sm font-semibold text-[var(--ff-text-secondary)] hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-text-primary)]"
                to={productPath(record?.id ? `/app?patient=${encodeURIComponent(record.id)}` : '/app')}
              >
                {text.back}
              </Link>
            </div>
            {exportError ? (
              <div className="mt-3 border-l-2 border-[var(--ff-accent-primary)] py-1 pl-3 text-sm font-semibold text-[var(--ff-accent-text)]">
                {exportError}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <nav aria-label={locale === 'zh' ? '病历章节' : 'Record sections'} className="sticky top-[var(--ff-topbar-height)] z-20 mb-6 flex gap-5 overflow-x-auto border-b border-[var(--ff-border-default)] bg-[var(--ff-surface-base)] py-1" data-html2canvas-ignore>
        {[
          ['summary', locale === 'zh' ? '概要' : 'Overview'],
          ['timeline', text.timeline],
          ...(labTrendRecord ? [['labs', locale === 'zh' ? '化验指标' : 'Lab results']] : []),
          ['analysis', locale === 'zh' ? '辅助分析' : 'Analysis'],
          ['notes', text.clinicalNotes],
        ].map(([section, title]) => <a className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-[var(--ff-text-secondary)] hover:text-[var(--ff-accent-text)]" href={`#${sectionId(section)}`} key={section}>{title}</a>)}
      </nav>
      <section aria-label={locale === 'zh' ? '病历概要' : 'Record overview'} className={anchorClass} id={sectionId('summary')}>
        <SummaryGrid isEditable={isEditable} metrics={metrics} onCommitField={onCommitField} />
      </section>

      <section className={`${anchorClass} mt-10 border-t border-[var(--ff-border-default)] pt-7`} id={sectionId('timeline')}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">{text.timeline}</h2>
          {entries.length > 1 ? <label className="flex min-w-0 flex-wrap items-center gap-2 text-sm" data-html2canvas-ignore>
            {locale === 'zh' ? '跳至阶段' : 'Jump to stage'}
            <select aria-label={locale === 'zh' ? '跳至治疗阶段' : 'Jump to treatment stage'} className="min-h-11 max-w-full rounded border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] px-3" defaultValue="" onChange={(event) => {
              document.getElementById(event.currentTarget.value)?.scrollIntoView({ block: 'start' })
              event.currentTarget.value = ''
            }}>
              <option disabled value="">{locale === 'zh' ? '选择治疗阶段' : 'Choose a stage'}</option>
              {entries.map((entry, index) => <option key={entry.index} value={sectionId(`stage-${index}`)}>{entry.index} · {entry.railDate ?? entry.timeframe}</option>)}
            </select>
          </label> : null}
        </div>

        <div className="relative">
          <div className="t-timeline-rail absolute bottom-0 left-5 top-0 hidden w-px bg-[var(--ff-border-default)] md:block" />
          {entries.map((entry, index) => (
            <div
              className={`${anchorClass} relative grid min-w-0 gap-3 md:grid-cols-[32px_10rem_minmax(0,1fr)] md:gap-4 xl:grid-cols-[40px_12rem_minmax(0,1fr)]`}
              id={sectionId(`stage-${index}`)}
              data-export-block
              data-export-timeline
              key={entry.index}
            >
              <TimelineRailMarker entry={entry} isEditable={isEditable} onCommitRange={onCommitRange} />
              <TimelineNode entry={entry} isEditable={isEditable} onCommitField={onCommitField} onCommitRange={onCommitRange} order={index + 3} />
            </div>
          ))}
        </div>
      </section>

      {labTrendRecord ? (
        <div className={`${anchorClass} t-stagger`} id={sectionId('labs')} style={{ '--t-order': 2 } as CSSProperties}>
          <LabTrendsTable locale={locale} record={labTrendRecord} />
        </div>
      ) : null}

      <div className={anchorClass} id={sectionId('analysis')}>
      <ClinicalAnalysisPanel
        disabled={!record}
        locale={locale}
        onAnalyze={record ? onClinicalAnalyze : undefined}
        state={clinicalAnalysisState}
      />
      </div>

      <section className={`${anchorClass} mt-10 border-t border-[var(--ff-border-default)] pt-7`} id={sectionId('notes')}>
        <h3 className="font-semibold">{text.clinicalNotes}</h3>
        <p className="mt-3 max-w-4xl text-base leading-7 text-[var(--ff-text-secondary)]">
          <EditableTextValue
            ariaLabel={locale === 'zh' ? '编辑临床备注' : 'Edit clinical notes'}
            isEditable={isEditable}
            onCommitField={onCommitField}
            target={record ? { field: 'clinicalNotes', section: 'record' } : undefined}
          >
            {clinicalNotes}
          </EditableTextValue>
        </p>
      </section>
    </div>
  )
}

export function RecordUnavailableDossier({
  exportError,
  exportFormat,
  isExporting,
  locale,
  message,
  onExport,
}: {
  exportError: string | null
  exportFormat: ExportFormat | null
  isExporting: boolean
  locale: Locale
  message: string
  onExport: (format: ExportFormat) => void
}) {
  const productPath = useProductPath()
  const text = labels[locale]

  return (
    <div className="mx-auto w-full max-w-[1180px] pb-8">
      <header className="mb-8 border-b border-[var(--ff-border-default)] pb-7">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-sm text-[var(--ff-text-muted)]">{text.access}</p>
            <h1 className="text-3xl font-semibold leading-tight tracking-normal md:text-4xl">{text.pageTitle}</h1>
            <p className="mt-3 text-base text-[var(--ff-text-secondary)]">
              {message}
            </p>
          </div>
          <div className="shrink-0">
            <div className="flex flex-wrap gap-2 md:justify-end">
              <button
                className="t-control-press inline-flex min-h-11 items-center rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                disabled
                onClick={() => onExport('pdf')}
                type="button"
              >
                {isExporting && exportFormat === 'pdf' ? text.exportPdfLoading : text.exportPdf}
              </button>
              <button
                className="t-control-press inline-flex min-h-11 items-center rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                disabled
                onClick={() => onExport('png')}
                type="button"
              >
                {isExporting && exportFormat === 'png' ? text.exportPngLoading : text.exportPng}
              </button>
              <Link
                className="t-control-press inline-flex min-h-11 items-center border-b border-[var(--ff-border-default)] px-1 text-sm font-semibold text-[var(--ff-text-secondary)]"
                to={productPath('/app')}
              >
                {text.back}
              </Link>
            </div>
            {exportError ? (
              <div className="mt-3 border-l-2 border-[var(--ff-accent-primary)] py-1 pl-3 text-sm font-semibold text-[var(--ff-accent-text)]">
                {exportError}
              </div>
            ) : null}
          </div>
        </div>
      </header>

    </div>
  )
}

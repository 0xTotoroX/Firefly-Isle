/**
 * [INPUT]: 依赖 react 的 CSSProperties/RefObject/useRef、react-router-dom 的 Link、PatientRecord、ClinicalAnalysisPanel、LabTrendsTable、record-copy、record-derived、record 展示类型与 transitions-dev.css 的 stagger/control/timeline rail 动效合同。
 * [OUTPUT]: 对外提供 RecordDossier 与 RecordUnavailableDossier 两个病例详情展示组件，以平面文档层级渲染概要证据、实验室趋势、AI 辅助分析、治疗时间线、临床备注、导出和编辑能力，返回录入时保留当前患者。
 * [POS]: components/record 的主阅读层，承载宽幅病历正文、definition-grid 概要、左侧时间段 rail、移动卡内 PFS、必要警示与交互边界；不再用装饰性卡片、系统认证或固定更新时间制造层级。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useProductPath } from '@/lib/demo-session'
import { useRef, type CSSProperties, type RefObject } from 'react'
import { Link } from 'react-router-dom'

import type { Locale } from '@/lib/locale'
import type { PatientFieldTarget, PatientRangeTarget, PatientRecord } from '@/types/patient'

import { ClinicalAnalysisPanel, type ClinicalAnalysisPanelState } from './ClinicalAnalysisPanel'
import { getRecordSummaryMetrics, getRecordTimelineEntries } from './record-derived'
import { LabTrendsTable } from './LabTrendsTable'
import { getTimelineEntries, labels, summaryMetrics } from './record-copy'
import type { EvidenceCard, ExportFormat, Metric, TimelineEntry } from './types'

function EditableTextValue({
  ariaLabel,
  children,
  className = '',
  isEditable,
  onCommitField,
  onCommitRange,
  rangeTarget,
  target,
}: {
  ariaLabel: string
  children: string
  className?: string
  isEditable: boolean
  onCommitField?: (target: PatientFieldTarget, value: string) => Promise<void> | void
  onCommitRange?: (target: PatientRangeTarget, value: string) => Promise<void> | void
  rangeTarget?: PatientRangeTarget
  target?: PatientFieldTarget
}) {
  const skipCommitRef = useRef(false)
  const canEdit = isEditable && ((target && onCommitField) || (rangeTarget && onCommitRange))

  if (!canEdit) {
    return <span className={className}>{children}</span>
  }

  function commit(value: string) {
    const normalized = value.trim()

    if (normalized === children.trim()) {
      return
    }

    if (target && onCommitField) {
      void onCommitField(target, normalized)
      return
    }

    if (rangeTarget && onCommitRange) {
      void onCommitRange(rangeTarget, normalized)
    }
  }

  return (
    <span
      aria-label={ariaLabel}
      className={[
        className,
        'inline-block min-w-[3rem] rounded-[var(--ff-radius-sm)] border border-[color-mix(in_srgb,var(--ff-accent-primary)_45%,var(--ff-border-default))] bg-[var(--ff-surface-inset)] px-1.5 outline-none focus:border-[var(--ff-accent-primary)]',
      ].filter(Boolean).join(' ')}
      contentEditable
      onBlur={(event) => {
        if (skipCommitRef.current) {
          skipCommitRef.current = false
          return
        }

        commit(event.currentTarget.textContent ?? '')
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          skipCommitRef.current = true
          event.currentTarget.textContent = children
          event.currentTarget.blur()
          return
        }

        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
      role="textbox"
      suppressContentEditableWarning
    >
      {children}
    </span>
  )
}

function SummaryGrid({
  isEditable,
  metrics,
  onCommitField,
}: {
  isEditable: boolean
  metrics: Metric[]
  onCommitField?: (target: PatientFieldTarget, value: string) => Promise<void> | void
}) {
  return (
    <div
      className="t-stagger grid border-t border-[var(--ff-border-default)] sm:grid-cols-2 lg:grid-cols-3"
      data-export-summary
      style={{ '--t-order': 1 } as CSSProperties}
    >
      {metrics.map((metric) => {
        const hasEvidenceLines = metric.value.includes('\n')
        const valueClass = hasEvidenceLines
          ? 'whitespace-pre-line text-base font-semibold leading-7 tracking-normal text-[var(--ff-text-primary)]'
          : 'text-xl font-semibold tracking-normal'

        return (
          <div
            className="min-h-[96px] border-b border-[var(--ff-border-muted)] py-5 pr-5 sm:even:pl-5"
            data-export-block
            key={metric.label}
          >
            <div className="text-sm text-[var(--ff-text-muted)]">{metric.label}</div>
            <div className="mt-3">
              <EditableTextValue ariaLabel={`编辑${metric.label}`} className={valueClass} isEditable={isEditable} onCommitField={onCommitField} target={metric.target}>{metric.value}</EditableTextValue>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EvidenceCardView({
  card,
  isEditable,
  onCommitField,
  order,
}: {
  card: EvidenceCard
  isEditable: boolean
  onCommitField?: (target: PatientFieldTarget, value: string) => Promise<void> | void
  order: number
}) {
  return (
    <article
      className="t-stagger border-t border-[var(--ff-border-muted)] pt-4"
      style={{ '--t-order': order } as CSSProperties}
    >
      <h4 className="mb-4 font-bold text-[var(--ff-accent-text)]">{card.title}</h4>
      <div className="space-y-3">
        {card.items.map((item) => (
          <div className="flex justify-between gap-6 border-b border-[var(--ff-border-muted)] pb-2 text-sm" key={`${item.label}:${item.value}`}>
            {item.label ? <span className="text-[var(--ff-text-secondary)]">{item.label}</span> : null}
            <EditableTextValue
              ariaLabel={`编辑${item.label || card.title}`}
              className={`${item.label ? 'text-right' : ''} font-medium text-[var(--ff-text-primary)]`}
              isEditable={isEditable}
              onCommitField={onCommitField}
              target={item.target}
            >
              {item.value}
            </EditableTextValue>
          </div>
        ))}
      </div>
    </article>
  )
}

function TimelineNode({
  entry,
  isEditable,
  onCommitField,
  onCommitRange,
  order,
}: {
  entry: TimelineEntry
  isEditable: boolean
  onCommitField?: (target: PatientFieldTarget, value: string) => Promise<void> | void
  onCommitRange?: (target: PatientRangeTarget, value: string) => Promise<void> | void
  order: number
}) {
  const hasCards = entry.cards.length > 0
  const detailColumnClass = entry.badge ? 'min-w-0' : 'min-w-0 md:hidden'
  const timeframeClass = [
    'mt-3 max-w-full whitespace-nowrap font-[var(--ff-font-mono)] text-sm text-[var(--ff-text-secondary)]',
    entry.railDate ? 'md:hidden' : '',
  ].join(' ')

  return (
    <article
      className={[
        't-stagger relative grid gap-7 border-b border-[var(--ff-border-default)] py-8',
        hasCards
          ? 'lg:grid-cols-[minmax(0,1fr)_minmax(260px,32%)] xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]'
          : '',
      ].join(' ')}
      style={{ '--t-order': order } as CSSProperties}
    >
      <div>
        <div className="mb-5 flex flex-wrap items-end gap-4">
          <EditableTextValue ariaLabel={`编辑${entry.index}编号`} className="font-[var(--ff-font-mono)] text-3xl font-semibold text-[var(--ff-accent-text)]" isEditable={false}>{entry.index}</EditableTextValue>
          <div className={detailColumnClass}>
            <div className="flex flex-wrap items-center gap-3">
              {entry.badge ? (
                <span className="rounded-[var(--ff-radius-full)] border border-[color:color-mix(in_srgb,var(--ff-accent-success)_42%,var(--ff-border-default))] bg-[color:color-mix(in_srgb,var(--ff-accent-success)_10%,var(--ff-surface-panel))] px-3 py-1 text-sm text-[var(--ff-accent-success)]">
                  {entry.badge}
                </span>
              ) : null}
            </div>
            <div className={timeframeClass}>
              <EditableTextValue ariaLabel={`编辑${entry.index}时间`} isEditable={isEditable} onCommitRange={onCommitRange} rangeTarget={entry.timeframeTarget}>{entry.timeframe}</EditableTextValue>
            </div>
            {entry.railMeta ? (
              <div className="mt-2 md:hidden" data-timeline-mobile-pfs={entry.railMeta}>
                <span className="inline-flex max-w-full items-center whitespace-nowrap rounded-[var(--ff-radius-full)] border border-[color-mix(in_srgb,var(--ff-accent-primary)_38%,var(--ff-border-default))] bg-[var(--ff-surface-accent)] px-2 py-0.5 font-[var(--ff-font-mono)] text-[11px] font-bold leading-5 text-[var(--ff-accent-text)]">
                  <EditableTextValue ariaLabel={`编辑${entry.index}PFS`} isEditable={false}>{entry.railMeta}</EditableTextValue>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <h4 className="mb-4 text-2xl font-semibold">
          <EditableTextValue ariaLabel={`编辑${entry.index}治疗方案`} isEditable={isEditable} onCommitField={onCommitField} target={entry.treatmentTarget}>{entry.treatment}</EditableTextValue>
        </h4>
        {entry.body.length > 0 ? (
          <div className="space-y-2 text-base leading-8 text-[var(--ff-text-secondary)]">
            {entry.body.map((paragraph) => (
              <p key={paragraph}>
                <EditableTextValue ariaLabel={`编辑${entry.index}说明`} isEditable={false}>{paragraph}</EditableTextValue>
              </p>
            ))}
          </div>
        ) : null}

        {entry.meta.length > 0 ? (
          <div className="mt-10 grid border-t border-[var(--ff-border-default)] pt-5 sm:grid-cols-2 xl:grid-cols-4">
            {entry.meta.map((item, index) => (
              <div
                className={[
                  'border-[var(--ff-border-default)] pr-4',
                  index < entry.meta.length - 1 ? 'border-b pb-4' : '',
                  index < entry.meta.length - 2 ? 'sm:border-b sm:pb-4' : 'sm:border-b-0 sm:pb-0',
                  'xl:border-b-0 xl:pb-0',
                  index % 2 === 0 ? 'sm:border-r' : 'sm:border-r-0',
                  index % 4 !== 3 ? 'xl:border-r' : 'xl:border-r-0',
                ].join(' ')}
                key={item.label}
              >
                <div className="text-xs text-[var(--ff-text-muted)]">{item.label}</div>
                <div className="mt-2 text-sm font-medium">
                  <EditableTextValue ariaLabel={`编辑${item.label}`} isEditable={isEditable} onCommitField={onCommitField} target={item.target}>{item.value}</EditableTextValue>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {entry.highlight ? (
          <div className="mt-6 rounded-[var(--ff-radius-md)] border border-[var(--ff-accent-primary)] bg-[var(--ff-surface-warning)] p-5">
            <h5 className="font-bold text-[var(--ff-accent-text)]">{entry.highlight.title}</h5>
            <p className="mt-2 text-sm leading-7 text-[var(--ff-text-secondary)]">
              <EditableTextValue ariaLabel={`编辑${entry.highlight.title}`} isEditable={false}>{entry.highlight.body}</EditableTextValue>
            </p>
          </div>
        ) : null}

        {entry.footMetrics ? (
          <div className="mt-6 grid border-y border-[var(--ff-border-default)] sm:grid-cols-2">
            {entry.footMetrics.map((metric, index) => (
              <div className={index === 0 ? 'border-b border-[var(--ff-border-default)] p-5 sm:border-b-0 sm:border-r' : 'p-5'} key={metric.label}>
                <div className="text-sm text-[var(--ff-text-muted)]">{metric.label}</div>
                <div className={`mt-2 text-2xl font-semibold ${index === 1 ? 'text-[var(--ff-accent-text)]' : ''}`}>
                  <EditableTextValue ariaLabel={`编辑${metric.label}`} isEditable={isEditable} onCommitField={onCommitField} target={metric.target}>{metric.value}</EditableTextValue>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {hasCards ? (
        <div className="space-y-6 border-[var(--ff-border-default)] md:border-l md:pl-7">
          {entry.cards.map((card, cardIndex) => (
            <EvidenceCardView card={card} isEditable={isEditable} key={card.title} onCommitField={onCommitField} order={order + cardIndex + 1} />
          ))}
        </div>
      ) : null}
    </article>
  )
}

function TimelineRailMarker({
  entry,
  isEditable,
  onCommitRange,
}: {
  entry: TimelineEntry
  isEditable: boolean
  onCommitRange?: (target: PatientRangeTarget, value: string) => Promise<void> | void
}) {
  const railDate = entry.railDate ?? entry.timeframe

  return (
    <>
      <div className="relative hidden md:block" aria-hidden="true">
        <span className="absolute left-[20px] top-8 h-4 w-4 rounded-[var(--ff-radius-full)] border-4 border-[var(--ff-surface-panel)] bg-[var(--ff-line)]" />
      </div>
      <div
        className="hidden min-w-0 pr-2 pt-7 md:block"
        data-timeline-rail-date={railDate}
      >
        <time className="block whitespace-nowrap font-[var(--ff-font-mono)] text-[13px] font-black leading-tight tracking-normal text-[var(--ff-text-muted)] xl:text-sm 2xl:text-base">
          <EditableTextValue ariaLabel={`编辑${entry.index}轴日期`} isEditable={isEditable} onCommitRange={onCommitRange} rangeTarget={entry.timeframeTarget}>{railDate}</EditableTextValue>
        </time>
        {entry.railMeta ? (
          <span className="mt-2 inline-flex max-w-full items-center whitespace-nowrap rounded-[var(--ff-radius-full)] border border-[color-mix(in_srgb,var(--ff-accent-primary)_38%,var(--ff-border-default))] bg-[var(--ff-surface-accent)] px-2 py-0.5 font-[var(--ff-font-mono)] text-[11px] font-bold leading-5 text-[var(--ff-accent-text)]">
            <EditableTextValue ariaLabel={`编辑${entry.index}轴PFS`} isEditable={false}>{entry.railMeta}</EditableTextValue>
          </span>
        ) : null}
      </div>
    </>
  )
}

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
    <div className="mx-auto w-full max-w-[1180px] pb-8" ref={recordRef}>
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
                className="t-control-press inline-flex h-9 items-center rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isExportDisabled || isExporting}
                onClick={() => onExport('pdf')}
                type="button"
              >
                {isExporting && exportFormat === 'pdf' ? text.exportPdfLoading : text.exportPdf}
              </button>
              <button
                className="t-control-press inline-flex h-9 items-center rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isExportDisabled || isExporting}
                onClick={() => onExport('png')}
                type="button"
              >
                {isExporting && exportFormat === 'png' ? text.exportPngLoading : text.exportPng}
              </button>
              <Link
                className="t-control-press inline-flex h-9 items-center border-b border-[var(--ff-border-default)] px-1 text-sm font-semibold text-[var(--ff-text-secondary)] hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-text-primary)]"
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

      <SummaryGrid isEditable={isEditable} metrics={metrics} onCommitField={onCommitField} />

      <section className="mt-10 border-t border-[var(--ff-border-default)] pt-7">
        <h2 className="mb-6 text-2xl font-semibold">{text.timeline}</h2>

        <div className="relative">
          <div className="t-timeline-rail absolute bottom-0 left-7 top-0 hidden w-px bg-[var(--ff-border-default)] md:block" />
          {entries.map((entry, index) => (
            <div
              className="relative grid gap-3 md:grid-cols-[56px_12rem_minmax(0,1fr)] md:gap-5 xl:grid-cols-[56px_14rem_minmax(0,1fr)]"
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
        <div className="t-stagger" style={{ '--t-order': 2 } as CSSProperties}>
          <LabTrendsTable locale={locale} record={labTrendRecord} />
        </div>
      ) : null}

      <ClinicalAnalysisPanel
        disabled={!record}
        locale={locale}
        onAnalyze={record ? onClinicalAnalyze : undefined}
        state={clinicalAnalysisState}
      />

      <section className="mt-10 border-t border-[var(--ff-border-default)] pt-7">
        <h3 className="font-semibold">{text.clinicalNotes}</h3>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--ff-text-secondary)]">
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
              {locale === 'zh' ? '真实病历载入中' : 'Loading saved medical record'}
            </p>
          </div>
          <div className="shrink-0">
            <div className="flex flex-wrap gap-2 md:justify-end">
              <button
                className="t-control-press inline-flex h-9 items-center rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                disabled
                onClick={() => onExport('pdf')}
                type="button"
              >
                {isExporting && exportFormat === 'pdf' ? text.exportPdfLoading : text.exportPdf}
              </button>
              <button
                className="t-control-press inline-flex h-9 items-center rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                disabled
                onClick={() => onExport('png')}
                type="button"
              >
                {isExporting && exportFormat === 'png' ? text.exportPngLoading : text.exportPng}
              </button>
              <Link
                className="t-control-press inline-flex h-9 items-center border-b border-[var(--ff-border-default)] px-1 text-sm font-semibold text-[var(--ff-text-secondary)]"
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

      <div className="border-l-2 border-[var(--ff-border-default)] py-2 pl-4 text-base font-semibold text-[var(--ff-text-secondary)]">
        {message}
      </div>
    </div>
  )
}

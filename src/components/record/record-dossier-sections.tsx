/**
 * [INPUT]: React、病历字段与时间范围目标、record 展示派生类型。
 * [OUTPUT]: EditableTextValue、SummaryGrid、TimelineNode、TimelineRailMarker。
 * [POS]: 病历正文的可编辑字段、概要和治疗分区；保留字段提交与导出块，不持有路由或服务状态。
 * [PROTOCOL]: 职责或接口变化时更新本头部与所属 AGENTS.md。
 */
import { useRef, type CSSProperties } from 'react'
import type { PatientFieldTarget, PatientRangeTarget } from '@/types/patient'
import type { EvidenceCard, Metric, TimelineEntry } from './types'

export function EditableTextValue({
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
    return <span className={`min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] ${className}`}>{children}</span>
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
        'inline-block max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] min-w-[3rem] rounded-[var(--ff-radius-sm)] border border-[color-mix(in_srgb,var(--ff-accent-primary)_45%,var(--ff-border-default))] bg-[var(--ff-surface-inset)] px-1.5 outline-none focus:border-[var(--ff-accent-primary)]',
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

export function SummaryGrid({
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
            className="min-w-0 min-h-[96px] border-b border-[var(--ff-border-muted)] py-5 pr-5 sm:even:pl-5"
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
          <div className="flex min-w-0 flex-wrap justify-between gap-3 border-b border-[var(--ff-border-muted)] pb-2 text-sm" key={`${item.label}:${item.value}`}>
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

export function TimelineNode({
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
          <EditableTextValue ariaLabel={`编辑${entry.index}编号`} className="font-[var(--ff-font-mono)] text-base font-semibold text-[var(--ff-accent-text)]" isEditable={false}>{entry.index}</EditableTextValue>
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
                <span className="inline-flex max-w-full items-center whitespace-nowrap rounded-[var(--ff-radius-full)] border border-[color-mix(in_srgb,var(--ff-accent-primary)_38%,var(--ff-border-default))] bg-[var(--ff-surface-accent)] px-2 py-0.5 font-[var(--ff-font-mono)] text-sm font-bold leading-5 text-[var(--ff-accent-text)]">
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
                <div className="text-sm text-[var(--ff-text-muted)]">{item.label}</div>
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

export function TimelineRailMarker({
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
          <span className="mt-2 inline-flex max-w-full items-center whitespace-nowrap rounded-[var(--ff-radius-full)] border border-[color-mix(in_srgb,var(--ff-accent-primary)_38%,var(--ff-border-default))] bg-[var(--ff-surface-accent)] px-2 py-0.5 font-[var(--ff-font-mono)] text-sm font-bold leading-5 text-[var(--ff-accent-text)]">
            <EditableTextValue ariaLabel={`编辑${entry.index}轴PFS`} isEditable={false}>{entry.railMeta}</EditableTextValue>
          </span>
        ) : null}
      </div>
    </>
  )
}

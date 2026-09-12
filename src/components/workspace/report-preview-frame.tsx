/**
 * [INPUT]: 依赖 react-router-dom 的 Link，依赖 @/components/system/surfaces 的 PanelSurface，依赖 @/lib/copy、locale 与 patient-metrics 文案/指标工具，依赖 PatientRecord 与 PatientFieldTarget 维持 inline edit / export 边界，依赖 transitions-dev.css 的 .t-digit-group、.t-missing-pulse 与 .t-edit-flip 动效合同。
 * [OUTPUT]: 对外提供 ReportPreviewFrame 组件，渲染 Dense Clinical Ledger 风格工作区病历预览、身高体重、诊断日期前置、治疗方案与最新基因/免疫组化摘要、含干净等待空态的横向病程轨、正式档案入口、按需追问进度提示、可编辑临床备注、既往检测历史与验证状态带。
 * [POS]: components/workspace 的报告预览区块，被 workspace-page 组合，是 /app 中病史输入之后的 V3 主表面，把 PatientRecord basicInfo 与 treatmentLines 投影为低噪声临床台账，同时保留 setReportRef 导出捕获点。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { PanelSurface } from '@/components/system/surfaces'
import { getCopy, copy } from '@/lib/copy'
import { useLocale, type Locale } from '@/lib/locale'
import { formatHeight, formatWeight } from '@/lib/patient-metrics'
import type { PatientFieldTarget, PatientRecord } from '@/types/patient'

type ReportPreviewFrameProps = {
  followUpCount?: number
  isExtracting: boolean
  isSaving: boolean
  onCommitField: (target: PatientFieldTarget, value: string) => void
  record: PatientRecord
  recordDetailsHref?: string
  remainingMissing: string[]
  setReportRef: (node: HTMLDivElement | null) => void
  theme: 'dark' | 'light'
}

type EditableCellProps = {
  critical?: boolean
  disabled: boolean
  editValue?: string
  fieldId?: string
  hideLabel?: boolean
  label: string
  multiline?: boolean
  onCommitField: (target: PatientFieldTarget, value: string) => void
  placeholder?: string
  target?: PatientFieldTarget
  value: string
}

type PreviewTimelineItem = {
  detail?: string
  label: string
  marker?: string
  period?: string
  tone: 'empty' | 'initial' | 'line' | 'stable'
}

type AuditItemProps = {
  icon: string
  label: string
  value: string
}

type EvidenceField = 'geneticTest' | 'immunohistochemistry'

type EvidenceEntry = {
  field: EvidenceField
  sourceLabel: string
  target: PatientFieldTarget
  value: string
}

const placeholderMissing = {
  en: ['Tumor Type', 'Stage', 'Regimen'],
  zh: ['肿瘤类型', '分期', '治疗方案'],
} satisfies Record<Locale, string[]>

const previewSectionTitleClass = 'font-[var(--ff-font-display)] text-base font-semibold tracking-normal text-[var(--ff-text-primary)]'
const ledgerSurfaceClass = 'overflow-hidden rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[color:color-mix(in_srgb,var(--ff-surface-inset)_92%,transparent)]'

function hasRecordData(record: PatientRecord) {
  return Boolean(record.basicInfo || record.initialOnset || record.treatmentLines.length > 0)
}

function hasText(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null
}

function display(value: unknown, fallback = '--') {
  if (!hasText(value)) {
    return fallback
  }

  return typeof value === 'string' ? value.trim() : String(value)
}

function displayAge(value: number | undefined, locale: Locale) {
  if (!Number.isFinite(value)) {
    return '--'
  }

  return locale === 'zh' ? `${value} 岁` : `${value} years`
}

function displayPeriod(startDate: string | undefined, endDate: string | undefined, locale: Locale) {
  if (startDate && endDate) {
    return `${startDate} → ${endDate}`
  }

  if (startDate) {
    return locale === 'zh' ? `${startDate} 起` : `From ${startDate}`
  }

  if (endDate) {
    return locale === 'zh' ? `至 ${endDate}` : `Until ${endDate}`
  }

  return locale === 'zh' ? '时间待补充' : 'Date pending'
}

function AnimatedNumber({ value }: { value: number }) {
  const digits = String(value).split('')

  return (
    <span aria-label={String(value)} className="t-digit-group is-animating inline-flex min-w-[1ch] justify-center">
      {digits.map((digit, index) => (
        <span className="t-digit" data-stagger={index === 0 ? undefined : index === 1 ? '1' : '2'} key={`${digit}-${index}`}>
          {digit}
        </span>
      ))}
    </span>
  )
}

function firstTreatmentLine(record: PatientRecord) {
  return record.treatmentLines.find((line) => line.lineNumber === 1) ?? record.treatmentLines[0]
}

function latestTreatmentLine(record: PatientRecord) {
  return [...record.treatmentLines].sort((left, right) => right.lineNumber - left.lineNumber)[0]
}

function getRegimenTarget(record: PatientRecord): PatientFieldTarget | undefined {
  const line = firstTreatmentLine(record)

  if (line) {
    return { field: 'regimen', lineNumber: line.lineNumber, section: 'treatmentLine' }
  }

  if (record.initialOnset) {
    return { field: 'treatment', section: 'initialOnset' }
  }

  return undefined
}

function getRegimenEditTarget(record: PatientRecord): PatientFieldTarget {
  return getRegimenTarget(record) ?? { field: 'treatment', section: 'initialOnset' }
}

function getFallbackEvidenceTarget(record: PatientRecord, field: EvidenceField): PatientFieldTarget {
  const line = latestTreatmentLine(record)

  if (line) {
    return { field, lineNumber: line.lineNumber, section: 'treatmentLine' }
  }

  return { field, section: 'initialOnset' }
}

function getEvidenceLabel(field: EvidenceField, locale: Locale) {
  return field === 'geneticTest' ? getCopy(copy.timeline.genetic, locale) : getCopy(copy.timeline.immunohistochemistry, locale)
}

function getLatestEvidenceLabel(field: EvidenceField, locale: Locale) {
  return locale === 'zh' ? `${getEvidenceLabel(field, locale)}（最新）` : `${getEvidenceLabel(field, locale)} (Latest)`
}

function collectEvidenceEntries(record: PatientRecord, field: EvidenceField, locale: Locale): EvidenceEntry[] {
  const entries: EvidenceEntry[] = []

  if (record.initialOnset && hasText(record.initialOnset[field])) {
    entries.push({
      field,
      sourceLabel: locale === 'zh' ? '初发' : 'Initial onset',
      target: { field, section: 'initialOnset' },
      value: display(record.initialOnset[field]),
    })
  }

  for (const line of [...record.treatmentLines].sort((left, right) => left.lineNumber - right.lineNumber)) {
    if (!hasText(line[field])) {
      continue
    }

    entries.push({
      field,
      sourceLabel: locale === 'zh' ? `${line.lineNumber}L 治疗线` : `Line ${line.lineNumber}`,
      target: { field, lineNumber: line.lineNumber, section: 'treatmentLine' },
      value: display(line[field]),
    })
  }

  return entries
}

function getLatestEvidence(entries: EvidenceEntry[]) {
  return entries[entries.length - 1]
}

function getEvidenceHistory(entries: EvidenceEntry[]) {
  return entries.slice(0, -1)
}

function getEvidenceTarget(record: PatientRecord, entries: EvidenceEntry[], field: EvidenceField) {
  return getLatestEvidence(entries)?.target ?? getFallbackEvidenceTarget(record, field)
}

function getEditableFieldId(target: PatientFieldTarget | undefined) {
  if (!target) {
    return undefined
  }

  if (target.section === 'record') {
    return `record.${target.field}`
  }

  if (target.section === 'treatmentLine') {
    return `treatmentLine.${target.lineNumber}.${target.field}`
  }

  return `${target.section}.${target.field}`
}

function EditableCell({
  critical = false,
  disabled,
  editValue,
  fieldId,
  hideLabel = false,
  label,
  multiline = false,
  onCommitField,
  placeholder,
  target,
  value,
}: EditableCellProps) {
  const getDraftValue = () => editValue ?? (value === '--' ? '' : value)
  const [draft, setDraft] = useState(getDraftValue)
  const [editing, setEditing] = useState(false)
  const isMissing = value === '--'
  const editableFieldId = fieldId ?? getEditableFieldId(target)

  if (!editing || !target) {
    return (
      <button
        aria-label={hideLabel ? label : undefined}
        className={[
          'group t-edit-flip t-control-press relative flex min-h-[58px] w-full items-center justify-between overflow-hidden border-b border-r border-[var(--ff-border-default)] bg-transparent px-4 py-2.5 text-left transition-colors',
          critical && isMissing
            ? 'bg-[color:color-mix(in_srgb,var(--ff-accent-primary)_9%,transparent)] text-[var(--ff-accent-text)]'
            : 'text-[var(--ff-text-primary)]',
          target && !disabled ? 'hover:bg-[var(--ff-surface-panel)]' : 'cursor-default',
        ].join(' ')}
        data-editable-field={editableFieldId}
        disabled={!target || disabled}
        onClick={() => {
          setDraft(getDraftValue())
          setEditing(true)
        }}
        type="button"
      >
        {critical && isMissing ? <span aria-hidden="true" className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-[var(--ff-radius-full)] bg-[var(--ff-accent-primary)]" data-ledger-missing-bar="true" /> : null}
        <span>
          {!hideLabel ? <span className="block text-xs text-[var(--ff-text-muted)]">{label}</span> : null}
          <span className={`${hideLabel ? '' : 'mt-1 '}block font-[var(--ff-font-ui)] text-base font-semibold leading-tight tracking-normal`}>
            {value}
          </span>
        </span>
        {critical && isMissing ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--ff-radius-full)] bg-[var(--ff-accent-primary)] text-[11px] font-bold text-[var(--ff-accent-foreground)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--ff-accent-primary)_16%,transparent)]">
            !
          </span>
        ) : target ? (
          <span className="material-symbols-outlined text-lg text-[var(--ff-text-muted)] opacity-0 transition-opacity group-hover:opacity-100">
            edit
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <form
      className="t-edit-flip rounded-[var(--ff-radius-md)] border border-[var(--ff-accent-primary)] bg-[var(--ff-surface-panel)] p-3"
      data-editable-field={editableFieldId}
      onSubmit={(event) => {
        event.preventDefault()
        onCommitField(target, draft)
        setEditing(false)
      }}
    >
      {!hideLabel ? <label className="mb-2 block text-xs text-[var(--ff-text-muted)]">{label}</label> : null}
      <div className="flex items-center gap-2">
        {multiline ? (
          <textarea
            aria-label={hideLabel ? label : undefined}
            autoFocus
            className="min-h-20 min-w-0 flex-1 resize-y rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] px-3 py-2 text-sm text-[var(--ff-text-primary)] outline-none focus:border-[var(--ff-accent-primary)]"
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            value={draft}
          />
        ) : (
          <input
            aria-label={hideLabel ? label : undefined}
            autoFocus
            className="min-w-0 flex-1 rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] px-3 py-2 text-sm text-[var(--ff-text-primary)] outline-none focus:border-[var(--ff-accent-primary)]"
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            value={draft}
          />
        )}
        <button
          className="t-control-press flex h-9 w-9 items-center justify-center rounded-[var(--ff-radius-sm)] bg-[var(--ff-accent-primary)] text-[var(--ff-accent-foreground)]"
          type="submit"
        >
          <span className="material-symbols-outlined text-lg">check</span>
        </button>
        <button
          className="t-control-press flex h-9 w-9 items-center justify-center rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] text-[var(--ff-text-secondary)]"
          onClick={() => setEditing(false)}
          type="button"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </form>
  )
}

function TimelineNode({ detail, label, period, tone }: PreviewTimelineItem) {
  const toneClass =
    tone === 'empty'
      ? 'text-[var(--ff-text-secondary)]'
      : tone === 'stable'
      ? 'text-[var(--ff-accent-success)]'
      : tone === 'line'
        ? 'text-[var(--ff-line)]'
        : 'text-[var(--ff-text-primary)]'

  return (
    <article className="min-w-0 py-1">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <span className={`min-w-0 font-[var(--ff-font-display)] text-sm font-bold tracking-normal ${toneClass}`}>
          {label}
        </span>
        {period ? (
          <span className="max-w-full rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] px-2 py-1 text-xs font-semibold text-[var(--ff-text-muted)]">
            {period}
          </span>
        ) : null}
      </div>
      {detail ? (
        <span className="mt-1 block line-clamp-2 whitespace-normal break-words text-sm font-semibold leading-snug text-[var(--ff-text-secondary)]">
          {detail}
        </span>
      ) : null}
    </article>
  )
}

function getPreviewTimelineItems(record: PatientRecord, locale: Locale): PreviewTimelineItem[] {
  const items: PreviewTimelineItem[] = []

  if (record.initialOnset) {
    items.push({
      detail: display(record.initialOnset.treatment),
      label: locale === 'zh' ? '初发治疗' : 'Initial Treatment',
      period: record.initialOnset.triggerDate,
      tone: 'initial',
    })
  }

  for (const line of [...record.treatmentLines].sort((left, right) => left.lineNumber - right.lineNumber)) {
    items.push({
      detail: display(line.regimen),
      label: `${line.lineNumber}L ${locale === 'zh' ? '治疗线' : 'Treatment Line'}`,
      period: displayPeriod(line.startDate, line.endDate, locale),
      tone: line.endDate ? 'line' : 'stable',
    })
  }

  return items.length > 0
    ? items
    : [
        {
          detail: locale === 'zh' ? '提取后按时间展示关键治疗节点、方案与换线顺序。' : 'Extract a record to show key treatment events, regimen, and line order.',
          label: locale === 'zh' ? '等待病程节点' : 'Awaiting Course Events',
          marker: locale === 'zh' ? '待' : '...',
          tone: 'empty',
        },
      ]
}

function TimelineTrack({ items }: { items: PreviewTimelineItem[] }) {
  return (
    <div
      className="mt-2 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[color:color-mix(in_srgb,var(--ff-surface-inset)_92%,transparent)] px-4 py-3"
      data-preview-timeline="clinical-course"
    >
      <ol className="relative space-y-3">
        {items.map((item, index) => (
          <li className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3" key={`${item.label}-${index}`}>
            {item.tone === 'empty' ? null : (
              <span className="absolute left-[2rem] right-12 top-[0.85rem] h-px border-t border-dotted border-[var(--ff-border-default)]" />
            )}
            {index < items.length - 1 ? (
              <span className="absolute left-[0.95rem] top-7 h-[calc(100%+0.75rem)] w-px bg-[var(--ff-line)]" />
            ) : null}
            <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-[var(--ff-radius-full)] border border-[var(--ff-line)] bg-[var(--ff-surface-panel)] text-xs font-bold text-[var(--ff-text-secondary)] md:h-7 md:w-7">
              {item.marker ?? index + 1}
            </div>
            <TimelineNode {...item} />
          </li>
        ))}
      </ol>
    </div>
  )
}

function AuditItem({ icon, label, value }: AuditItemProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="material-symbols-outlined text-[24px] text-[var(--ff-text-primary)]">{icon}</span>
      <div className="min-w-0">
        <span className="block font-[var(--ff-font-display)] text-base font-bold tracking-normal">{label}</span>
        <span className="mt-1 inline-flex rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-soft)] px-3 py-1.5 text-sm text-[var(--ff-text-secondary)]">
          {value}
        </span>
      </div>
    </div>
  )
}

function EvidenceHistoryList({ entries, locale }: { entries: EvidenceEntry[]; locale: Locale }) {
  if (entries.length === 0) {
    return null
  }

  return (
    <div className="mt-3 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] p-4">
      <h4 className="font-[var(--ff-font-display)] text-sm font-bold tracking-normal text-[var(--ff-text-primary)]">
        {locale === 'zh' ? '既往检测历史' : 'Previous Test History'}
      </h4>
      <div className="mt-3 space-y-2">
        {entries.map((entry, index) => (
          <div className="rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] px-3 py-2" key={`${entry.field}-${entry.sourceLabel}-${index}`}>
            <div className="text-xs font-semibold text-[var(--ff-text-muted)]">
              {getEvidenceLabel(entry.field, locale)} · {entry.sourceLabel}
            </div>
            <div className="mt-1 text-sm font-semibold leading-relaxed text-[var(--ff-text-secondary)]">{entry.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReportPreviewFrame({
  followUpCount = 0,
  isExtracting,
  isSaving,
  onCommitField,
  record,
  recordDetailsHref,
  remainingMissing,
  setReportRef,
  theme,
}: ReportPreviewFrameProps) {
  const { locale } = useLocale()
  const disabled = isExtracting || isSaving
  const recordHasData = hasRecordData(record)
  const basicInfo = record.basicInfo
  const lineOne = firstTreatmentLine(record)
  const missingLabels =
    recordHasData && remainingMissing.length > 0 ? remainingMissing : recordHasData ? [] : placeholderMissing[locale]
  const missingCount = missingLabels.length
  const shouldShowFollowUpStatus = missingCount > 0 || followUpCount > 0
  const timelineItems = getPreviewTimelineItems(record, locale)
  const geneticEntries = collectEvidenceEntries(record, 'geneticTest', locale)
  const ihcEntries = collectEvidenceEntries(record, 'immunohistochemistry', locale)
  const latestGenetic = getLatestEvidence(geneticEntries)
  const latestIhc = getLatestEvidence(ihcEntries)
  const evidenceHistory = [...getEvidenceHistory(geneticEntries), ...getEvidenceHistory(ihcEntries)]
  const notePlaceholder =
    locale === 'zh' ? '可在此记录关键临床备注或补充说明...' : 'Record key clinical notes or supplemental comments...'

  return (
    <PanelSurface className="p-4 sm:p-5" theme={theme} tone="panel">
      <div ref={setReportRef}>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px]">calendar_month</span>
            <h2 className="font-[var(--ff-font-display)] text-2xl font-black leading-tight tracking-normal">
              {getCopy(copy.timeline.tableTitle, locale)}
            </h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {shouldShowFollowUpStatus ? (
              <div className="t-missing-pulse inline-flex min-h-9 items-center gap-2 rounded-[var(--ff-radius-sm)] border border-[var(--ff-accent-primary)] bg-[color:color-mix(in_srgb,var(--ff-accent-primary)_8%,transparent)] px-3 py-1.5 text-sm font-semibold text-[var(--ff-accent-text)]">
                <span className="material-symbols-outlined text-xl">chat_bubble</span>
                <span>
                  {locale === 'zh' ? (
                    <>
                      待补充 <AnimatedNumber value={missingCount} /> 项 · 第 <AnimatedNumber value={followUpCount} />/3 轮追问
                    </>
                  ) : (
                    <>
                      <AnimatedNumber value={missingCount} /> missing · round <AnimatedNumber value={followUpCount} />/3
                    </>
                  )}
                </span>
              </div>
            ) : null}
            {recordDetailsHref ? (
              <Link
                className="t-control-press inline-flex min-h-9 items-center justify-center gap-2 rounded-[var(--ff-radius-sm)] bg-[var(--ff-accent-primary)] px-3 py-1.5 text-sm font-bold text-[var(--ff-accent-foreground)] transition-colors hover:bg-[var(--ff-accent-strong)]"
                to={recordDetailsHref}
              >
                <span className="material-symbols-outlined text-xl">open_in_new</span>
                {locale === 'zh' ? '打开病历详情' : 'Open record detail'}
              </Link>
            ) : null}
          </div>
        </div>

        <h3 className={`mb-2 ${previewSectionTitleClass}`}>{getCopy(copy.timeline.basicInfoTitle, locale)}</h3>
        <div className="space-y-2">
          <div className={`${ledgerSurfaceClass} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5`}>
            <EditableCell
              disabled={disabled}
              label={locale === 'zh' ? '姓名' : 'Name'}
              onCommitField={onCommitField}
              target={{ field: 'name', section: 'basicInfo' }}
              value={display(basicInfo?.name)}
            />
            <EditableCell
              disabled={disabled}
              label={getCopy(copy.timeline.gender, locale)}
              onCommitField={onCommitField}
              target={{ field: 'gender', section: 'basicInfo' }}
              value={display(basicInfo?.gender)}
            />
            <EditableCell
              disabled={disabled}
              label={getCopy(copy.timeline.age, locale)}
              onCommitField={onCommitField}
              target={{ field: 'age', section: 'basicInfo' }}
              value={displayAge(basicInfo?.age, locale)}
            />
            <EditableCell
              disabled={disabled}
              label={getCopy(copy.timeline.height, locale)}
              onCommitField={onCommitField}
              target={{ field: 'height', section: 'basicInfo' }}
              value={formatHeight(basicInfo?.height)}
            />
            <EditableCell
              disabled={disabled}
              label={getCopy(copy.timeline.weight, locale)}
              onCommitField={onCommitField}
              target={{ field: 'weight', section: 'basicInfo' }}
              value={formatWeight(basicInfo?.weight)}
            />
          </div>
          <div className={`${ledgerSurfaceClass} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`}>
            <EditableCell
              critical
              disabled={disabled}
              label={getCopy(copy.timeline.tumorType, locale)}
              onCommitField={onCommitField}
              target={{ field: 'tumorType', section: 'basicInfo' }}
              value={display(basicInfo?.tumorType)}
            />
            <EditableCell
              critical
              disabled={disabled}
              label={getCopy(copy.timeline.stage, locale)}
              onCommitField={onCommitField}
              target={{ field: 'stage', section: 'basicInfo' }}
              value={display(basicInfo?.stage)}
            />
            <EditableCell
              disabled={disabled}
              label={getCopy(copy.timeline.diagnosisDate, locale)}
              onCommitField={onCommitField}
              target={{ field: 'diagnosisDate', section: 'basicInfo' }}
              value={display(basicInfo?.diagnosisDate)}
            />
          </div>
          <div className={`${ledgerSurfaceClass} grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr]`}>
            <EditableCell
              critical
              disabled={disabled}
              label={getCopy(copy.timeline.regimen, locale)}
              onCommitField={onCommitField}
              target={getRegimenEditTarget(record)}
              value={display(lineOne?.regimen ?? record.initialOnset?.treatment)}
            />
            <EditableCell
              disabled={disabled}
              label={getLatestEvidenceLabel('geneticTest', locale)}
              onCommitField={onCommitField}
              target={getEvidenceTarget(record, geneticEntries, 'geneticTest')}
              value={latestGenetic?.value ?? '--'}
            />
            <EditableCell
              disabled={disabled}
              label={getLatestEvidenceLabel('immunohistochemistry', locale)}
              onCommitField={onCommitField}
              target={getEvidenceTarget(record, ihcEntries, 'immunohistochemistry')}
              value={latestIhc?.value ?? '--'}
            />
          </div>
        </div>

        <h3 className={`mt-4 ${previewSectionTitleClass}`}>{locale === 'zh' ? '治疗时间线' : 'Treatment Timeline'}</h3>
        <TimelineTrack items={timelineItems} />

        <h3 className={`mt-4 ${previewSectionTitleClass}`}>{getCopy(copy.workspace.report.clinicalNotes, locale)}</h3>
        <div className="mt-2 overflow-hidden rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[color:color-mix(in_srgb,var(--ff-surface-inset)_92%,transparent)]">
          <EditableCell
            disabled={disabled}
            editValue={record.clinicalNotes ?? ''}
            hideLabel
            label={locale === 'zh' ? '备注内容' : 'Notes Body'}
            multiline
            onCommitField={onCommitField}
            placeholder={notePlaceholder}
            target={{ field: 'clinicalNotes', section: 'record' }}
            value={display(record.clinicalNotes, notePlaceholder)}
          />
          <EvidenceHistoryList entries={evidenceHistory} locale={locale} />
        </div>

        <div className="mt-4 flex flex-col gap-4 rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[color:color-mix(in_srgb,var(--ff-surface-inset)_88%,var(--ff-surface-panel))] p-3 md:flex-row md:items-center">
          <AuditItem
            icon="health_and_safety"
            label={locale === 'zh' ? 'AI 验证状态' : 'AI Verification Status'}
            value={locale === 'zh' ? '未开始验证' : getCopy(copy.workspace.report.verifiedBy, locale)}
          />
          <div className="hidden h-14 w-px bg-[var(--ff-border-default)] md:block" />
          <AuditItem
            icon="database"
            label={locale === 'zh' ? '数据完整性' : 'Data Completeness'}
            value={remainingMissing.length > 0 || !recordHasData ? '--' : getCopy(copy.workspace.report.completed, locale)}
          />
        </div>
      </div>
    </PanelSurface>
  )
}

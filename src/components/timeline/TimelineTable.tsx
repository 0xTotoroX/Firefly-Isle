/**
 * [INPUT]: 依赖 react 的 useRef/useState，依赖 @/lib/theme 的 Theme，依赖 @/types/patient 的 PatientRecord、PatientFieldTarget、各区块类型与 getPatientArchetype。
 * [OUTPUT]: 对外提供 TimelineTable、BasicInfoBlock、InitialOnsetBlock、TreatmentLineBlock 与 blur 取消提交 helpers，不对用户展示晚期/非晚期分类标签。
 * [POS]: components/timeline 的正式时间线表格渲染器，内部按记录结构组织区块，负责关键缺失字段高亮与行内编辑入口。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useRef, useState } from 'react'

import { getCopy, copy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import type { Theme } from '@/lib/theme'
import {
  getPatientArchetype,
  type BasicInfo,
  type InitialOnset,
  type PatientFieldTarget,
  type PatientRecord,
  type TreatmentLine,
} from '@/types/patient'

type EditorState = {
  id: string
  value: string
}

type BlurCommitGuard = {
  current: boolean
}

type TimelineTableProps = {
  disabled?: boolean
  onCommitField?: (target: PatientFieldTarget, value: string) => Promise<void> | void
  record: PatientRecord
  theme: Theme
}

type SharedBlockProps = {
  disabled: boolean
  editor: EditorState | null
  onBeginEdit: (cellId: string, value: string) => void
  onCancelEdit: () => void
  onCommitField?: (target: PatientFieldTarget, value: string) => Promise<void> | void
  onUpdateEditorValue: (value: string) => void
  theme: Theme
}

type BasicInfoBlockProps = SharedBlockProps & {
  basicInfo?: BasicInfo
}

type InitialOnsetBlockProps = SharedBlockProps & {
  initialOnset: InitialOnset
  order: number
}

type TreatmentLineBlockProps = SharedBlockProps & {
  line: TreatmentLine
  order: number
}

type SectionHeaderProps = {
  badge?: string
  order: number
  subtitle: string
  title: string
  theme: Theme
}

type CellProps = {
  cellId: string
  critical?: boolean
  disabled: boolean
  editValue: string
  editor: EditorState | null
  label: string
  onBeginEdit: (cellId: string, value: string) => void
  onCancelEdit: () => void
  onCommitField?: (target: PatientFieldTarget, value: string) => Promise<void> | void
  onUpdateEditorValue: (value: string) => void
  target: PatientFieldTarget
  theme: Theme
  value?: string
}

function padOrder(order: number) {
  return String(order).padStart(2, '0')
}

function getInitialOnsetSubtitle(locale: 'zh' | 'en') {
  return `${getCopy(copy.timeline.initialOnsetSubtitle, locale)} / INITIAL_ONSET`
}

function getTreatmentLineSubtitle(lineNumber: number, locale: 'zh' | 'en') {
  return `${getCopy(copy.timeline.treatmentLineSubtitle, locale)} ${lineNumber} / LINE_${padOrder(lineNumber)}`
}

function hasValue(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }

  return typeof value === 'string' && value.trim().length > 0
}

function display(value: unknown) {
  if (!hasValue(value)) {
    return undefined
  }

  return typeof value === 'string' ? value.trim() : String(value)
}

function formatMetric(value: number | undefined, unit: string, locale: 'zh' | 'en') {
  if (value === undefined) {
    return undefined
  }

  if (unit === '岁') {
    return locale === 'zh' ? `${value} 岁` : `${value} years`
  }

  return `${value} ${unit}`
}

function formatPeriod(startDate?: string, endDate?: string, locale?: 'zh' | 'en') {
  if (!startDate && !endDate) {
    return undefined
  }

  if (!startDate) {
    return endDate
  }

  if (!endDate) {
    return `${startDate} — ${locale === 'zh' ? '至今' : 'Present'}`
  }

  return `${startDate} — ${endDate}`
}

function getShellClass() {
  return 'rounded-[var(--ff-radius-md)] border border-[var(--ff-timeline-shell-border)] bg-[var(--ff-timeline-shell-bg)] text-[var(--ff-timeline-shell-text)]'
}

function getSectionClass() {
  return 'rounded-[var(--ff-radius-md)] border border-[var(--ff-timeline-section-border)] bg-[var(--ff-timeline-section-bg)] p-6 sm:p-8'
}

function getLabelClass() {
  return "font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.24em] text-[var(--ff-timeline-label)]"
}

function getValueClass(theme: Theme, filled: boolean, prominent: boolean) {
  if (theme === 'dark') {
    return prominent
      ? `font-[var(--ff-font-display)] text-2xl font-black tracking-tight ${filled ? 'text-[var(--ff-timeline-text-strong)]' : 'text-[var(--ff-timeline-text-muted)]'}`
      : `whitespace-pre-wrap text-sm leading-7 ${filled ? 'text-[var(--ff-timeline-text-body)]' : 'text-[var(--ff-timeline-text-muted)]'}`
  }

  return prominent
    ? `font-[var(--ff-font-display)] text-[28px] font-bold tracking-tight ${filled ? 'text-[var(--ff-timeline-text-strong)]' : 'text-[var(--ff-timeline-text-muted)]'}`
    : `whitespace-pre-wrap text-sm leading-7 ${filled ? 'text-[var(--ff-timeline-text-body)]' : 'text-[var(--ff-timeline-text-muted)]'}`
}

function getCellClass(critical: boolean, filled: boolean) {
  if (critical && !filled) {
    return 'rounded-[var(--ff-radius-md)] border border-[var(--ff-timeline-cell-critical-border)] bg-[var(--ff-timeline-cell-critical-bg)]'
  }

  return 'rounded-[var(--ff-radius-md)] border border-[var(--ff-timeline-cell-border)] bg-[var(--ff-timeline-cell-bg)]'
}

function getEditValue(value: unknown) {
  return value === undefined || value === null ? '' : String(value)
}

export function markNextBlurAsCanceled(guard: BlurCommitGuard) {
  guard.current = true
}

export function consumeCanceledBlur(guard: BlurCommitGuard) {
  if (!guard.current) {
    return false
  }

  guard.current = false
  return true
}

function SectionHeader({ badge, order, subtitle, title, theme }: SectionHeaderProps) {
  if (theme === 'dark') {
    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-baseline gap-4">
          <span className="font-[var(--ff-font-mono)] text-4xl font-black text-[var(--ff-timeline-order)]">{padOrder(order)}</span>
          <div>
            <h3 className="font-[var(--ff-font-display)] text-3xl font-black tracking-tight text-[var(--ff-timeline-text-strong)] sm:text-4xl">
              {title}
            </h3>
            <p className="mt-2 font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.28em] text-[var(--ff-timeline-label)]">
              {subtitle}
            </p>
          </div>
        </div>
        <span className="min-w-[160px] self-start border border-[var(--ff-timeline-badge-border)] bg-[var(--ff-timeline-badge-bg)] px-3 py-2 text-right font-[var(--ff-font-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--ff-timeline-badge-text)] sm:self-auto">
          {badge ?? ' '}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-baseline gap-4">
        <span className="font-[var(--ff-font-display)] text-5xl font-bold text-[var(--ff-timeline-order)] sm:text-6xl">
          {padOrder(order)}
        </span>
        <div>
          <h3 className="border-b border-[var(--ff-timeline-section-border)] pb-2 font-[var(--ff-font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h3>
          <p className="mt-2 font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.28em] text-[var(--ff-timeline-label)]">
            {subtitle}
          </p>
        </div>
      </div>
      <span className="min-w-[160px] self-start bg-[var(--ff-timeline-badge-bg)] px-3 py-2 text-right font-[var(--ff-font-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--ff-timeline-badge-text)] sm:self-auto">
        {badge ?? ' '}
      </span>
    </div>
  )
}

function DataCell({
  cellId,
  critical = false,
  disabled,
  editValue,
  editor,
  label,
  onBeginEdit,
  onCancelEdit,
  onCommitField,
  onUpdateEditorValue,
  target,
  theme,
  value,
}: CellProps) {
  const skipCommitOnBlurRef = useRef(false)
  const filled = hasValue(value)
  const isEditing = editor?.id === cellId
  const rendered = display(value)

  return (
    <div className={`${getCellClass(critical, filled)} p-4`}>
      <div className={getLabelClass()}>{label}</div>
      {isEditing ? (
        <input
          autoFocus
          className="mt-3 w-full bg-transparent text-sm outline-none"
          disabled={disabled}
          onBlur={(event) => {
            if (consumeCanceledBlur(skipCommitOnBlurRef)) {
              return
            }

            void onCommitField?.(target, event.currentTarget.value)
          }}
          onChange={(event) => onUpdateEditorValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              markNextBlurAsCanceled(skipCommitOnBlurRef)
              onCancelEdit()
            }
          }}
          value={editor?.value ?? ''}
        />
      ) : (
        <button
          className="mt-3 w-full text-left"
          disabled={disabled || !onCommitField}
          onClick={() => onBeginEdit(cellId, editValue)}
          type="button"
        >
          <div className={getValueClass(theme, filled, false)}>{rendered ?? ' '}</div>
        </button>
      )}
    </div>
  )
}

function NarrativeCell(props: CellProps) {
  return <DataCell {...props} />
}

export function BasicInfoBlock({
  basicInfo,
  disabled,
  editor,
  onBeginEdit,
  onCancelEdit,
  onCommitField,
  onUpdateEditorValue,
  theme,
}: BasicInfoBlockProps) {
  const { locale } = useLocale()
  const fields = [
    {
      cellId: 'basicInfo.gender',
      editValue: getEditValue(basicInfo?.gender),
      label: getCopy(copy.timeline.gender, locale),
      target: { field: 'gender', section: 'basicInfo' } as const,
      value: display(basicInfo?.gender),
    },
    {
      cellId: 'basicInfo.age',
      editValue: getEditValue(basicInfo?.age),
      label: getCopy(copy.timeline.age, locale),
      target: { field: 'age', section: 'basicInfo' } as const,
      value: formatMetric(basicInfo?.age, '岁', locale),
    },
    {
      cellId: 'basicInfo.height',
      editValue: getEditValue(basicInfo?.height),
      label: getCopy(copy.timeline.height, locale),
      target: { field: 'height', section: 'basicInfo' } as const,
      value: formatMetric(basicInfo?.height, 'cm', locale),
    },
    {
      cellId: 'basicInfo.weight',
      editValue: getEditValue(basicInfo?.weight),
      label: getCopy(copy.timeline.weight, locale),
      target: { field: 'weight', section: 'basicInfo' } as const,
      value: formatMetric(basicInfo?.weight, 'kg', locale),
    },
    {
      cellId: 'basicInfo.tumorType',
      critical: true,
      editValue: getEditValue(basicInfo?.tumorType),
      label: getCopy(copy.timeline.tumorType, locale),
      target: { field: 'tumorType', section: 'basicInfo' } as const,
      value: display(basicInfo?.tumorType),
    },
    {
      cellId: 'basicInfo.diagnosisDate',
      editValue: getEditValue(basicInfo?.diagnosisDate),
      label: getCopy(copy.timeline.diagnosisDate, locale),
      target: { field: 'diagnosisDate', section: 'basicInfo' } as const,
      value: display(basicInfo?.diagnosisDate),
    },
    {
      cellId: 'basicInfo.stage',
      critical: true,
      editValue: getEditValue(basicInfo?.stage),
      label: getCopy(copy.timeline.stage, locale),
      target: { field: 'stage', section: 'basicInfo' } as const,
      value: display(basicInfo?.stage),
    },
  ]

  return (
    <section className={getSectionClass()}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-[var(--ff-font-display)] text-3xl font-bold tracking-tight text-[var(--ff-timeline-text-strong)] sm:text-4xl">
            {getCopy(copy.timeline.basicInfoTitle, locale)}
          </h2>
          <p className={`mt-2 ${getLabelClass()}`}>{getCopy(copy.timeline.basicInfoSubtitle, locale)}</p>
        </div>
        <span className="font-[var(--ff-font-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--ff-timeline-accent)]">
          {getCopy(copy.timeline.criticalFields, locale)}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {fields.map((field) => (
          <DataCell
            cellId={field.cellId}
            critical={field.critical}
            disabled={disabled}
            editValue={field.editValue}
            editor={editor}
            key={field.label}
            label={field.label}
            onBeginEdit={onBeginEdit}
            onCancelEdit={onCancelEdit}
            onCommitField={onCommitField}
            onUpdateEditorValue={onUpdateEditorValue}
            target={field.target}
            theme={theme}
            value={field.value}
          />
        ))}
      </div>
    </section>
  )
}

export function InitialOnsetBlock({
  disabled,
  editor,
  initialOnset,
  onBeginEdit,
  onCancelEdit,
  onCommitField,
  onUpdateEditorValue,
  order,
  theme,
}: InitialOnsetBlockProps) {
  const { locale } = useLocale()

  return (
    <article className="space-y-6">
      <SectionHeader
        badge={display(initialOnset.triggerDate)}
        order={order}
        subtitle={getInitialOnsetSubtitle(locale)}
        title={getCopy(copy.timeline.initialOnsetTitle, locale)}
        theme={theme}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <NarrativeCell
          cellId="initialOnset.treatment"
          critical
          disabled={disabled}
          editValue={getEditValue(initialOnset.treatment)}
          editor={editor}
          label={getCopy(copy.timeline.regimen, locale)}
          onBeginEdit={onBeginEdit}
          onCancelEdit={onCancelEdit}
          onCommitField={onCommitField}
          onUpdateEditorValue={onUpdateEditorValue}
          target={{ field: 'treatment', section: 'initialOnset' }}
          theme={theme}
          value={initialOnset.treatment}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <DataCell
            cellId="initialOnset.triggerDate"
            disabled={disabled}
            editValue={getEditValue(initialOnset.triggerDate)}
            editor={editor}
            label={getCopy(copy.timeline.triggerDate, locale)}
            onBeginEdit={onBeginEdit}
            onCancelEdit={onCancelEdit}
            onCommitField={onCommitField}
            onUpdateEditorValue={onUpdateEditorValue}
            target={{ field: 'triggerDate', section: 'initialOnset' }}
            theme={theme}
            value={display(initialOnset.triggerDate)}
          />
          <NarrativeCell
            cellId="initialOnset.immunohistochemistry"
            disabled={disabled}
            editValue={getEditValue(initialOnset.immunohistochemistry)}
            editor={editor}
            label={getCopy(copy.timeline.immunohistochemistry, locale)}
            onBeginEdit={onBeginEdit}
            onCancelEdit={onCancelEdit}
            onCommitField={onCommitField}
            onUpdateEditorValue={onUpdateEditorValue}
            target={{ field: 'immunohistochemistry', section: 'initialOnset' }}
            theme={theme}
            value={initialOnset.immunohistochemistry}
          />
          <NarrativeCell
            cellId="initialOnset.geneticTest"
            disabled={disabled}
            editValue={getEditValue(initialOnset.geneticTest)}
            editor={editor}
            label={getCopy(copy.timeline.genetic, locale)}
            onBeginEdit={onBeginEdit}
            onCancelEdit={onCancelEdit}
            onCommitField={onCommitField}
            onUpdateEditorValue={onUpdateEditorValue}
            target={{ field: 'geneticTest', section: 'initialOnset' }}
            theme={theme}
            value={initialOnset.geneticTest}
          />
        </div>
      </div>
    </article>
  )
}

export function TreatmentLineBlock({
  disabled,
  editor,
  line,
  onBeginEdit,
  onCancelEdit,
  onCommitField,
  onUpdateEditorValue,
  order,
  theme,
}: TreatmentLineBlockProps) {
  const { locale } = useLocale()

  return (
    <article className="space-y-6">
      <SectionHeader
        badge={formatPeriod(line.startDate, line.endDate, locale)}
        order={order}
        subtitle={getTreatmentLineSubtitle(line.lineNumber, locale)}
        title={`${getCopy(copy.timeline.treatmentLine, locale)} ${line.lineNumber}`}
        theme={theme}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="grid gap-4">
          <NarrativeCell
            cellId={`treatmentLine.${line.lineNumber}.regimen`}
            critical
            disabled={disabled}
            editValue={getEditValue(line.regimen)}
            editor={editor}
            label={getCopy(copy.timeline.regimen, locale)}
            onBeginEdit={onBeginEdit}
            onCancelEdit={onCancelEdit}
            onCommitField={onCommitField}
            onUpdateEditorValue={onUpdateEditorValue}
            target={{ field: 'regimen', lineNumber: line.lineNumber, section: 'treatmentLine' }}
            theme={theme}
            value={line.regimen}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <DataCell
              cellId={`treatmentLine.${line.lineNumber}.startDate`}
              disabled={disabled}
              editValue={getEditValue(line.startDate)}
              editor={editor}
              label={getCopy(copy.timeline.startDate, locale)}
              onBeginEdit={onBeginEdit}
              onCancelEdit={onCancelEdit}
              onCommitField={onCommitField}
              onUpdateEditorValue={onUpdateEditorValue}
              target={{ field: 'startDate', lineNumber: line.lineNumber, section: 'treatmentLine' }}
              theme={theme}
              value={display(line.startDate)}
            />
            <DataCell
              cellId={`treatmentLine.${line.lineNumber}.endDate`}
              disabled={disabled}
              editValue={getEditValue(line.endDate)}
              editor={editor}
              label={getCopy(copy.timeline.endDate, locale)}
              onBeginEdit={onBeginEdit}
              onCancelEdit={onCancelEdit}
              onCommitField={onCommitField}
              onUpdateEditorValue={onUpdateEditorValue}
              target={{ field: 'endDate', lineNumber: line.lineNumber, section: 'treatmentLine' }}
              theme={theme}
              value={display(line.endDate)}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <NarrativeCell
            cellId={`treatmentLine.${line.lineNumber}.biopsy`}
            disabled={disabled}
            editValue={getEditValue(line.biopsy)}
            editor={editor}
            label={getCopy(copy.timeline.biopsy, locale)}
            onBeginEdit={onBeginEdit}
            onCancelEdit={onCancelEdit}
            onCommitField={onCommitField}
            onUpdateEditorValue={onUpdateEditorValue}
            target={{ field: 'biopsy', lineNumber: line.lineNumber, section: 'treatmentLine' }}
            theme={theme}
            value={line.biopsy}
          />
          <NarrativeCell
            cellId={`treatmentLine.${line.lineNumber}.immunohistochemistry`}
            disabled={disabled}
            editValue={getEditValue(line.immunohistochemistry)}
            editor={editor}
            label={getCopy(copy.timeline.immunohistochemistry, locale)}
            onBeginEdit={onBeginEdit}
            onCancelEdit={onCancelEdit}
            onCommitField={onCommitField}
            onUpdateEditorValue={onUpdateEditorValue}
            target={{ field: 'immunohistochemistry', lineNumber: line.lineNumber, section: 'treatmentLine' }}
            theme={theme}
            value={line.immunohistochemistry}
          />
          <NarrativeCell
            cellId={`treatmentLine.${line.lineNumber}.geneticTest`}
            disabled={disabled}
            editValue={getEditValue(line.geneticTest)}
            editor={editor}
            label={getCopy(copy.timeline.genetic, locale)}
            onBeginEdit={onBeginEdit}
            onCancelEdit={onCancelEdit}
            onCommitField={onCommitField}
            onUpdateEditorValue={onUpdateEditorValue}
            target={{ field: 'geneticTest', lineNumber: line.lineNumber, section: 'treatmentLine' }}
            theme={theme}
            value={line.geneticTest}
          />
        </div>
      </div>
    </article>
  )
}

function EmptyState({ theme }: { theme: Theme }) {
  const { locale } = useLocale()

  return (
    <div className={`${getSectionClass()} text-[var(--ff-timeline-text-muted)]`}>
      <div className={getLabelClass()}>{getCopy(copy.timeline.emptyStateKey, locale)}</div>
      <p
        className={
          theme === 'dark'
            ? "mt-4 font-[var(--ff-font-display)] text-2xl font-bold"
            : "mt-4 font-[var(--ff-font-display)] text-3xl font-bold"
        }
      >
        {getCopy(copy.timeline.emptyTitle, locale)}
      </p>
      <p className="mt-3 text-sm leading-7">{getCopy(copy.timeline.emptyBody, locale)}</p>
    </div>
  )
}

export function TimelineTable({ disabled = false, onCommitField, record, theme }: TimelineTableProps) {
  const { locale } = useLocale()
  const archetype = getPatientArchetype(record)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const sections: Array<
    | { kind: 'initial-onset'; value: InitialOnset }
    | { kind: 'treatment-line'; value: TreatmentLine }
  > = []

  if (archetype !== 'de-novo-advanced' && record.initialOnset) {
    sections.push({ kind: 'initial-onset', value: record.initialOnset })
  }

  for (const line of [...record.treatmentLines].sort((left, right) => left.lineNumber - right.lineNumber)) {
    sections.push({ kind: 'treatment-line', value: line })
  }

  function beginEdit(cellId: string, value: string) {
    if (!onCommitField || disabled) {
      return
    }

    setEditor({ id: cellId, value })
  }

  function cancelEdit() {
    setEditor(null)
  }

  function updateEditorValue(value: string) {
    setEditor((current) => (current ? { ...current, value } : current))
  }

  async function commitField(target: PatientFieldTarget, value: string) {
    if (!onCommitField) {
      return
    }

    setEditor(null)
    await onCommitField(target, value)
  }

  return (
    <section className={getShellClass()}>
      <header className="border-b border-[var(--ff-timeline-shell-border)] px-6 py-6 sm:px-8">
        <div>
          <div className={getLabelClass()}>{getCopy(copy.timeline.tableKey, locale)}</div>
          <h1
            className={
              "mt-3 font-[var(--ff-font-display)] text-4xl font-bold tracking-tight text-[var(--ff-timeline-text-strong)] sm:text-5xl"
            }
          >
            {getCopy(copy.timeline.tableTitle, locale)}
          </h1>
        </div>
      </header>

      <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
        <BasicInfoBlock
          basicInfo={record.basicInfo}
          disabled={disabled}
          editor={editor}
          onBeginEdit={beginEdit}
          onCancelEdit={cancelEdit}
          onCommitField={commitField}
          onUpdateEditorValue={updateEditorValue}
          theme={theme}
        />

        {sections.length === 0 ? <EmptyState theme={theme} /> : null}

        {sections.map((section, index) =>
          section.kind === 'initial-onset' ? (
            <InitialOnsetBlock
              disabled={disabled}
              editor={editor}
              initialOnset={section.value}
              key={`initial-onset-${section.value.triggerDate ?? index}`}
              onBeginEdit={beginEdit}
              onCancelEdit={cancelEdit}
              onCommitField={commitField}
              onUpdateEditorValue={updateEditorValue}
              order={index + 1}
              theme={theme}
            />
          ) : (
            <TreatmentLineBlock
              disabled={disabled}
              editor={editor}
              key={`treatment-line-${section.value.lineNumber}`}
              line={section.value}
              onBeginEdit={beginEdit}
              onCancelEdit={cancelEdit}
              onCommitField={commitField}
              onUpdateEditorValue={updateEditorValue}
              order={index + 1}
              theme={theme}
            />
          ),
        )}
      </div>
    </section>
  )
}

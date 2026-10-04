/**
 * [INPUT]: React 编辑状态、Locale/copy、PatientRecord 与独立时间线分区/字段组件。
 * [OUTPUT]: 提供 TimelineTable 和兼容分区/helpers 入口，按 lineNumber 顺序显示记录并转交字段保存。
 * [POS]: timeline 的组合入口；编辑状态按病历 id 隔离，页面连续阅读，各阶段保留独立边界。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；结构变化时同步所属 AGENTS.md。
 */
import { useState } from 'react'

import { getCopy, copy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import type { Theme } from '@/lib/theme'
import type { PatientFieldTarget, PatientRecord } from '@/types/patient'

import type { EditorState, SharedBlockProps } from './timeline-cell'
import { BasicInfoBlock, InitialOnsetBlock, TreatmentLineBlock } from './timeline-sections'

export { consumeCanceledBlur, markNextBlurAsCanceled } from './timeline-cell'
export { BasicInfoBlock, InitialOnsetBlock, TreatmentLineBlock } from './timeline-sections'

type TimelineTableProps = {
  disabled?: boolean
  onCommitField?: (target: PatientFieldTarget, value: string) => Promise<void> | void
  record: PatientRecord
  theme: Theme
}

export function TimelineTable(props: TimelineTableProps) {
  return <TimelineTableContent key={props.record.id ?? 'draft'} {...props} />
}

function TimelineTableContent({ disabled = false, onCommitField, record, theme }: TimelineTableProps) {
  const { locale } = useLocale()
  const [editor, setEditor] = useState<EditorState | null>(null)
  const lines = [...record.treatmentLines].sort((left, right) => left.lineNumber - right.lineNumber)
  const shared: SharedBlockProps = {
    disabled,
    editor,
    onBeginEdit: (id, value) => {
      if (onCommitField && !disabled) setEditor({ id, value })
    },
    onCancelEdit: () => setEditor(null),
    onCommitField: onCommitField ? async (target, value) => {
      setEditor(null)
      await onCommitField(target, value)
    } : undefined,
    onUpdateEditorValue: (value) => setEditor((current) => current ? { ...current, value } : current),
    theme,
  }

  return (
    <section className="min-w-0 space-y-6 text-[var(--ff-timeline-shell-text)]">
      <header>
        <h1 className="font-[var(--ff-font-display)] text-2xl font-bold leading-tight text-[var(--ff-timeline-text-strong)] sm:text-3xl">
          {getCopy(copy.timeline.tableKey, locale)}
        </h1>
      </header>
      <BasicInfoBlock {...shared} basicInfo={record.basicInfo} />
      {record.initialOnset ? <InitialOnsetBlock {...shared} initialOnset={record.initialOnset} order={1} /> : null}
      {lines.map((line, index) => (
        <TreatmentLineBlock {...shared} key={line.id ?? line.lineNumber} line={line} order={index + (record.initialOnset ? 2 : 1)} />
      ))}
      {!record.initialOnset && lines.length === 0 ? (
        <div className="border-t border-[var(--ff-timeline-section-border)] py-6 text-[var(--ff-timeline-text-muted)]">
          <h2 className="font-[var(--ff-font-display)] text-xl font-bold">{getCopy(copy.timeline.emptyTitle, locale)}</h2>
          <p className="mt-2 text-base leading-7">{getCopy(copy.timeline.emptyBody, locale)}</p>
        </div>
      ) : null}
    </section>
  )
}

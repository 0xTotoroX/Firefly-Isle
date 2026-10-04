/**
 * [INPUT]: React 本地草稿状态、语言与 PatientFieldTarget；字段提交由工作台持有。
 * [OUTPUT]: EditableCell，提供完整长文本、具名编辑输入和保存/取消操作。
 * [POS]: 工作台病历预览的单字段编辑边界；锁定期间禁止提交，取消保留已有记录。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部与所属 AGENTS.md。
 */
import { useId, useState } from 'react'
import { useLocale } from '@/lib/locale'
import type { PatientFieldTarget } from '@/types/patient'

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

export function EditableCell({
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
  const { locale } = useLocale()
  const inputId = useId()
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
          'group t-edit-flip t-control-press relative flex min-h-[58px] w-full items-start justify-between gap-3 border-b border-r border-[var(--ff-border-default)] bg-transparent px-4 py-2.5 text-left transition-colors',
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
        <span className="min-w-0 flex-1">
          {!hideLabel ? <span className="block text-sm text-[var(--ff-text-muted)]">{label}</span> : null}
          <span className={`${hideLabel ? '' : 'mt-1 '}block font-[var(--ff-font-ui)] whitespace-pre-wrap break-words text-base leading-relaxed tracking-normal [overflow-wrap:anywhere]`}>
            {value}
          </span>
        </span>
        {critical && isMissing ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--ff-radius-full)] bg-[var(--ff-accent-primary)] text-sm font-bold text-[var(--ff-accent-foreground)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--ff-accent-primary)_16%,transparent)]">
            !
          </span>
        ) : target ? (
          <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-lg text-[var(--ff-text-muted)] opacity-0 transition-opacity group-hover:opacity-100">
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
        if (disabled) return
        onCommitField(target, draft)
        setEditing(false)
      }}
    >
      {!hideLabel ? <label className="mb-2 block text-sm text-[var(--ff-text-muted)]" htmlFor={inputId}>{label}</label> : null}
      <div className="flex flex-wrap items-start gap-2">
        {multiline ? (
          <textarea
            aria-label={label}
            autoFocus
            disabled={disabled}
            id={inputId}
            className="min-h-28 min-w-0 basis-full flex-1 resize-y rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] px-3 py-2 text-base leading-relaxed text-[var(--ff-text-primary)] outline-none focus:border-[var(--ff-accent-primary)]"
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            value={draft}
          />
        ) : (
          <input
            aria-label={label}
            autoFocus
            disabled={disabled}
            id={inputId}
            className="min-h-11 min-w-0 basis-full flex-1 sm:basis-auto rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] px-3 py-2 text-base leading-relaxed text-[var(--ff-text-primary)] outline-none focus:border-[var(--ff-accent-primary)]"
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            value={draft}
          />
        )}
        <button
          className="t-control-press inline-flex min-h-11 items-center justify-center gap-1 px-3 text-sm font-semibold rounded-[var(--ff-radius-sm)] bg-[var(--ff-accent-primary)] text-[var(--ff-accent-foreground)]"
          disabled={disabled}
          type="submit"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-lg">check</span>
          {locale === 'zh' ? '保存' : 'Save'}
        </button>
        <button
          className="t-control-press inline-flex min-h-11 items-center justify-center gap-1 px-3 text-sm font-semibold rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] text-[var(--ff-text-secondary)]"
          onClick={() => setEditing(false)}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-lg">close</span>
          {locale === 'zh' ? '取消' : 'Cancel'}
        </button>
      </div>
    </form>
  )
}

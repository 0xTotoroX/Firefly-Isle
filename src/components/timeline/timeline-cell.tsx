/**
 * [INPUT]: React 编辑事件/ref、Locale、PatientFieldTarget 与 timeline-format 显示格式。
 * [OUTPUT]: 提供 TimelineCell、共享编辑契约与单次 Escape blur 取消 helpers。
 * [POS]: timeline 的字段展示/编辑边界；长内容可换行，叙述字段使用多行编辑，只读字段不伪装为按钮。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；结构变化时同步所属 AGENTS.md。
 */
import { useRef, type ChangeEvent, type FocusEvent, type KeyboardEvent } from 'react'

import { useLocale } from '@/lib/locale'
import type { Theme } from '@/lib/theme'
import type { PatientFieldTarget } from '@/types/patient'

import { display } from './timeline-format'

export type EditorState = { id: string; value: string }
type BlurCommitGuard = { current: boolean }
export type SharedBlockProps = {
  disabled: boolean
  editor: EditorState | null
  onBeginEdit: (cellId: string, value: string) => void
  onCancelEdit: () => void
  onCommitField?: (target: PatientFieldTarget, value: string) => Promise<void> | void
  onUpdateEditorValue: (value: string) => void
  theme: Theme
}
export type TimelineField = {
  cellId: string
  critical?: boolean
  editValue: string
  label: string
  multiline?: boolean
  target: PatientFieldTarget
  value?: string
}

export function markNextBlurAsCanceled(guard: BlurCommitGuard) {
  guard.current = true
}

export function consumeCanceledBlur(guard: BlurCommitGuard) {
  if (!guard.current) return false
  guard.current = false
  return true
}

export function TimelineCell({
  cellId, critical = false, disabled, editValue, editor, label, multiline = false,
  onBeginEdit, onCancelEdit, onCommitField, onUpdateEditorValue, target, value,
}: SharedBlockProps & TimelineField) {
  const { locale } = useLocale()
  const skipCommitOnBlurRef = useRef(false)
  const rendered = display(value)
  const missing = rendered === undefined
  const isEditing = editor?.id === cellId
  const missingText = locale === 'zh' ? '未填写' : 'Not recorded'
  const valueClass = `block whitespace-pre-wrap text-base leading-7 [overflow-wrap:anywhere] ${missing ? 'text-[var(--ff-timeline-text-muted)]' : 'text-[var(--ff-timeline-text-body)]'}`
  const cellClass = critical && missing
    ? 'border-[var(--ff-timeline-cell-critical-border)] bg-[var(--ff-timeline-cell-critical-bg)]'
    : 'border-[var(--ff-timeline-cell-border)] bg-[var(--ff-timeline-cell-bg)]'
  const inputProps = {
    'aria-label': label,
    autoFocus: true,
    className: 'mt-2 w-full min-w-0 bg-transparent text-base leading-7 outline-none [overflow-wrap:anywhere]',
    disabled,
    onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!consumeCanceledBlur(skipCommitOnBlurRef)) void onCommitField?.(target, event.currentTarget.value)
    },
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onUpdateEditorValue(event.target.value),
    onFocus: () => { skipCommitOnBlurRef.current = false },
    onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        markNextBlurAsCanceled(skipCommitOnBlurRef)
        onCancelEdit()
      }
    },
    value: editor?.value ?? '',
  }

  return (
    <div className={`min-w-0 rounded-[var(--ff-radius-md)] border p-4 ${cellClass}`}>
      <div className="text-sm font-medium leading-6 text-[var(--ff-timeline-label)]">{label}</div>
      {isEditing ? (
        multiline ? <textarea {...inputProps} rows={4} /> : <input {...inputProps} />
      ) : onCommitField && !disabled ? (
        <button
          aria-label={`${label}：${rendered ?? missingText}`}
          className="mt-2 w-full min-w-0 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ff-accent-primary)]"
          disabled={disabled}
          onClick={() => {
            // Escape may unmount an input before blur fires; each new edit starts a fresh guard.
            skipCommitOnBlurRef.current = false
            onBeginEdit(cellId, editValue)
          }}
          type="button"
        >
          <span className={valueClass}>{rendered ?? missingText}</span>
        </button>
      ) : (
        <p className={`mt-2 ${valueClass}`}>{rendered ?? missingText}</p>
      )}
    </div>
  )
}

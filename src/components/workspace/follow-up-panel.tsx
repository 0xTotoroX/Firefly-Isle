/**
 * [INPUT]: 依赖 react 的 Effect 与 useState，依赖 @/components/system/surfaces 的 PanelSurface 承载追问容器，依赖 03 Apple Editorial 标题字体合同，依赖 transitions-dev.css 的 .t-panel-slide 动效合同。
 * [OUTPUT]: 对外提供 FollowUpPanel 组件，渲染追问文案、补充输入与提交动作。
 * [POS]: components/workspace 的追问补充区块，被 workspace-page 组合，用于把 follow-up 展示层从 route 移出。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useState } from 'react'

import { getCopy, copy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'

import { PanelSurface } from '@/components/system/surfaces'

type FollowUpPanelProps = {
  busy?: boolean
  currentQuestion: string
  onSubmit: (value: string) => void
  theme: 'dark' | 'light'
}

export function FollowUpPanel({ busy = false, currentQuestion, onSubmit, theme }: FollowUpPanelProps) {
  const { locale } = useLocale()
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(() => typeof document === 'undefined')

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOpen(true))

    return () => window.cancelAnimationFrame(frame)
  }, [])

  const textareaClassName =
    theme === 'dark'
      ? 'mt-4 h-28 w-full resize-none border border-[var(--ff-border-default)] bg-[var(--ff-surface-base)] p-4 outline-none focus:border-[var(--ff-accent-primary)]'
      : 'mt-4 h-32 w-full resize-none border-2 border-[var(--ff-border-default)] bg-transparent p-4 outline-none'

  const buttonClassName =
    theme === 'dark'
      ? "mt-4 border border-[var(--ff-accent-primary)] px-4 py-3 font-[var(--ff-font-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--ff-accent-text)]"
      : "mt-4 border-2 border-[var(--ff-border-default)] px-6 py-3 font-[var(--ff-font-ui)] text-xs font-bold uppercase tracking-[0.2em]"

  return (
    <div className="t-panel-slide" data-open={open}>
      <PanelSurface className={theme === 'dark' ? 'p-6' : 'ff-light-ink-shadow p-6'} theme={theme} tone="panel">
        <h3
          className={
            theme === 'dark'
              ? 'font-[var(--ff-font-display)] text-base font-bold tracking-normal text-[var(--ff-accent-text)]'
              : 'font-[var(--ff-font-display)] text-base font-bold tracking-normal text-[var(--ff-text-primary)]'
          }
        >
          {getCopy(copy.workspace.followUp.title, locale)}
        </h3>
        <p className="mt-3 text-sm leading-7 text-[var(--ff-text-subtle)]">{currentQuestion}</p>
        <textarea
          disabled={busy}
          className={textareaClassName}
          onChange={(event) => setValue(event.target.value)}
          placeholder={getCopy(copy.workspace.followUp.placeholder, locale)}
          value={value}
        />
        <button
          disabled={busy || !value.trim()}
          className={buttonClassName}
          onClick={() => {
            if (busy || !value.trim()) return
            onSubmit(value)
            setValue('')
          }}
          type="button"
        >
          {getCopy(copy.workspace.followUp.submit, locale)}
        </button>
      </PanelSurface>
    </div>
  )
}

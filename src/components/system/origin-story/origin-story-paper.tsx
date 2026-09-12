/**
 * [INPUT]: 依赖 react 的弹层生命周期、lucide-react 的关闭图标、顶部生命故事按钮 anchor 与 origin-story-content 的公开内容源。
 * [OUTPUT]: 对外提供 OriginStoryPaper 组件，以 V3 Clinical Archive Console token 渲染暗亮同构的创作初衷阅读弹层，支持可见关闭按钮、Esc、遮罩点击、焦点约束、滚动锁定与焦点恢复。
 * [POS]: src/components/system/origin-story 的阅读入口层；只编排公开内容与系统级 dialog 交互，不创建独立材质、Canvas 或 WebGL 上下文。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, type RefObject } from 'react'

import { X } from 'lucide-react'

import {
  originStoryFooter,
  originStorySourceText,
  originStorySubtitle,
  originStoryTitle,
  storyParagraphs,
} from './origin-story-content'

type OriginStoryPaperProps = {
  anchorRef: RefObject<HTMLElement>
  onClose: () => void
  open: boolean
  theme: 'dark' | 'light'
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function OriginStoryPaper({ anchorRef, onClose, open, theme }: OriginStoryPaperProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const anchorElement = anchorRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
      const first = focusable.at(0)
      const last = focusable.at(-1)

      if (!first || !last) {
        event.preventDefault()
        return
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      const focusTarget = anchorElement ?? previouslyFocused
      window.requestAnimationFrame(() => focusTarget?.focus())
    }
  }, [anchorRef, onClose, open])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-black/70 p-2 backdrop-blur-sm sm:p-4 md:pl-[calc(var(--ff-sidebar-offset)+1rem)]"
      data-origin-story-theme={theme}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <article
        aria-describedby="origin-story-subtitle"
        aria-labelledby="origin-story-title"
        aria-modal="true"
        className="t-modal is-open relative flex h-[calc(100dvh-1rem)] w-full max-w-[58rem] flex-col overflow-hidden rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] text-[var(--ff-text-primary)] shadow-[0_28px_80px_rgba(0,0,0,0.42)] sm:h-[min(88dvh,60rem)]"
        id="origin-story-paper"
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <h2 className="sr-only" id="origin-story-title">
          {originStoryTitle}
        </h2>

        <header className="relative shrink-0 border-b border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] px-5 py-4 pr-16 sm:px-7 sm:py-5 sm:pr-20">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-[var(--ff-font-mono)] text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ff-text-muted)]">
            <span>Origin note</span>
            <span aria-hidden="true" className="h-px w-5 bg-[var(--ff-border-default)]" />
            <span className="text-[var(--ff-accent-text)]">Public source</span>
          </div>
          <p className="mt-3 max-w-2xl font-[var(--ff-font-display)] text-lg font-semibold leading-7 text-[var(--ff-text-primary)] sm:text-xl" id="origin-story-subtitle">
            {originStorySubtitle}
          </p>

          <button
            aria-label="关闭创作初衷"
            className="t-control-press absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] text-[var(--ff-text-muted)] transition-colors hover:border-[var(--ff-border-strong)] hover:text-[var(--ff-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ff-accent-primary)] sm:right-5 sm:top-5"
            onClick={onClose}
            ref={closeButtonRef}
            title="关闭创作初衷"
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-[47rem] px-5 py-7 sm:px-8 sm:py-10 md:px-10">
            <div className="border-l border-[var(--ff-accent-primary)] pl-4 sm:pl-6">
              <div className="space-y-5 font-[var(--ff-font-ui)] text-[15px] font-normal leading-7 text-[var(--ff-text-subtle)] sm:text-base sm:leading-8">
                {storyParagraphs.map((paragraph) => (
                  <p className="font-normal" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
              </div>

              <p className="mt-9 break-all border-t border-[var(--ff-border-muted)] pt-5 font-[var(--ff-font-mono)] text-[11px] font-normal leading-6 text-[var(--ff-text-muted)] sm:text-xs">
                {originStorySourceText}
              </p>
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] px-5 py-3 font-[var(--ff-font-ui)] text-[11px] font-normal leading-5 text-[var(--ff-text-muted)] sm:px-7 sm:py-4 sm:text-xs">
          {originStoryFooter}
        </footer>
      </article>
    </div>
  )
}

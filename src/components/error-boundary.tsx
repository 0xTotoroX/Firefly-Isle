/**
 * [INPUT]: 依赖 react 的 Component 错误捕获生命周期、copy.errorBoundary 文案与当前 document 语言标记。
 * [OUTPUT]: 对外提供 ErrorBoundary 组件。
 * [POS]: components 的全局渲染崩溃护栏，捕获子树渲染错误并给出可恢复降级 UI；禁止消费 Theme/Locale 上下文，保证崩溃发生在 Provider 层时护栏自身仍可渲染。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

import { copy, getCopy } from '@/lib/copy'
import { reportError } from '@/lib/error-reporting'
import type { Locale } from '@/lib/locale'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
}

function readCurrentLocale(): Locale {
  return document.documentElement.lang.startsWith('en') ? 'en' : 'zh'
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, undefined, info.componentStack ?? undefined)
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    const { error } = this.state

    if (!error) {
      return this.props.children
    }

    const locale = readCurrentLocale()
    const isDevelopment = import.meta.env.DEV

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--ff-surface-base)] px-6 text-[var(--ff-text-primary)]">
        <div className="w-full max-w-md border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] px-8 py-8 text-center">
          <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.4em] text-[var(--ff-accent-text)]">
            {getCopy(copy.errorBoundary.status, locale)}
          </div>
          <div className="mt-3 font-[var(--ff-font-display)] text-2xl font-black tracking-tight">
            {getCopy(copy.errorBoundary.title, locale)}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ff-text-muted)]">
            {getCopy(copy.errorBoundary.description, locale)}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex h-9 items-center justify-center rounded-lg border border-[var(--ff-border-default)] bg-[var(--ff-surface-subtle)] px-4 text-sm font-medium text-[var(--ff-text-primary)] outline-none transition-colors hover:border-[var(--ff-accent-primary)] focus-visible:ring-2 focus-visible:ring-[var(--ff-accent-primary)]"
          >
            {getCopy(copy.errorBoundary.action, locale)}
          </button>
          {isDevelopment ? (
            <pre className="mt-6 max-h-40 overflow-auto break-words border border-[var(--ff-border-default)] bg-[var(--ff-surface-base)] p-3 text-left font-[var(--ff-font-mono)] text-xs text-[var(--ff-text-muted)]">
              {getCopy(copy.errorBoundary.detail, locale)}: {error.message}
            </pre>
          ) : null}
        </div>
      </div>
    )
  }
}

// @vitest-environment happy-dom
/**
 * [INPUT]: 依赖 happy-dom 环境、@testing-library/react 的渲染与查询、@testing-library/jest-dom 的匹配器与 ./error-boundary。
 * [OUTPUT]: 对外提供 ErrorBoundary 的真实渲染行为回归测试。
 * [POS]: components 的错误边界 DOM 测试，验证子树渲染崩溃时降级 UI 可见、重载按钮触发整页刷新、正常子树不受影响。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ErrorBoundary } from './error-boundary'

function ThrowingChild(): ReactElement {
  throw new Error('boom')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders children untouched when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <p data-testid="stable">safe</p>
      </ErrorBoundary>,
    )

    expect(screen.getByTestId('stable')).toHaveTextContent('safe')
  })

  it('shows the bilingual recovery fallback and reloads on action', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reload = vi.fn()
    Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true })

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    )

    expect(screen.getByText('页面出现了一点问题')).toBeVisible()
    expect(screen.getByText('页面异常')).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: '重新加载' }))

    expect(reload).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalled()
  })
})

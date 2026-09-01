/**
 * [INPUT]: 依赖 node:fs 的源码合同检查。
 * [OUTPUT]: 对外提供 ErrorBoundary 崩溃护栏的结构回归测试。
 * [POS]: components 的错误边界合同测试，约束边界不消费 Theme/Locale 上下文、始终提供整页重载恢复路径，并保持双语文案走 copy 字典。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function readBoundarySource() {
  return readFileSync(new URL('./error-boundary.tsx', import.meta.url), 'utf8')
}

describe('ErrorBoundary crash contract', () => {
  it('derives fallback state from render errors and recovers through a full reload', () => {
    const source = readBoundarySource()

    expect(source).toContain('getDerivedStateFromError')
    expect(source).toContain('window.location.reload()')
    expect(source).toContain("state: ErrorBoundaryState = { error: null }")
  })

  it('stays renderable when theme or locale providers themselves crash', () => {
    const source = readBoundarySource()

    expect(source).not.toContain('useTheme')
    expect(source).not.toContain('useLocale')
    expect(source).not.toContain('useThemeContext')
  })

  it('keeps fallback copy in the shared copy dictionary', () => {
    const source = readBoundarySource()

    expect(source).toContain('copy.errorBoundary')
    expect(source).not.toMatch(/出错了|Something went wrong/)
  })

  it('exposes raw error details only in development', () => {
    const source = readBoundarySource()

    expect(source).toContain('import.meta.env.DEV')
  })
})

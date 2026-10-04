// @vitest-environment happy-dom
/**
 * [INPUT]: React DOM、MemoryRouter、非持久化 LocaleProvider 与真实 DemoSessionProvider。
 * [OUTPUT]: 侧栏偏好失败降级、键盘缩放/折叠和 Demo 偏好隔离的交互回归。
 * [POS]: system 侧栏行为测试；浏览器布局验证另覆盖短视口滚动几何。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md。
 */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DemoSessionProvider } from '@/lib/demo-session'
import { LocaleProvider } from '@/lib/locale'
import { ArchiveSideNav } from './sidebar-nav'

function renderSidebar(demo = false) {
  const sidebar = <ArchiveSideNav dark onSignOut={vi.fn()} userLabel="测试账户" />
  return render(
    <MemoryRouter>
      <LocaleProvider persist={false}>
        {demo ? <DemoSessionProvider>{sidebar}</DemoSessionProvider> : sidebar}
      </LocaleProvider>
    </MemoryRouter>,
  )
}

const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')!
beforeEach(() => {
  const values = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  } })
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
})
afterEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(window, 'localStorage', storageDescriptor)
})

describe('sidebar optional width preference', () => {
  it('renders and resizes when reading stored width fails', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError') })
    renderSidebar()

    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '220')
    expect(screen.getByRole('link', { name: '设置' })).toBeVisible()
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowRight' })
    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '232')
  })

  it('keeps resize, collapse and restore working when storing width fails', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
    renderSidebar()

    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowRight' })
    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '232')
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'Enter' })
    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '72')
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'Enter' })
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '显示侧边栏' }))
    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '232')
    expect(screen.getByRole('button', { name: '退出登录' })).toBeVisible()
  })

  it('uses valid saved width and persists keyboard resizing', () => {
    window.localStorage.setItem('firefly-sidebar-expanded-width-v8', '244')
    renderSidebar()
    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '244')
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' })
    expect(window.localStorage.getItem('firefly-sidebar-expanded-width-v8')).toBe('232')
  })

  it('never reads or writes real width preferences in Demo', () => {
    const getItem = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => { throw new Error('Demo must not read preferences') })
    const setItem = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('Demo must not persist preferences') })
    renderSidebar(true)
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowRight' })

    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '232')
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })
})

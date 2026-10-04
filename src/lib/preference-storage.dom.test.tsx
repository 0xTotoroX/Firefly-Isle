// @vitest-environment happy-dom
/**
 * [INPUT]: 真实 ThemeProvider/LocaleProvider、React DOM 与受控的浏览器存储失败。
 * [OUTPUT]: 非必要偏好在存储读取/写入/访问拒绝时的交互降级及 Demo 不持久化回归。
 * [POS]: lib 偏好状态行为测试，验证主题、强调色、语言和 HTML 属性仍随用户操作变化。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md。
 */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ACCENT_STORAGE_KEY, defaultAccentHex } from './accent'
import { LocaleProvider, LOCALE_STORAGE_KEY, useLocale } from './locale'
import { ThemeProvider, THEME_STORAGE_KEY, useTheme } from './theme'

function PreferenceControls() {
  const { theme, accent, setAccent, toggleTheme } = useTheme()
  const { locale, setLocale, toggleLocale } = useLocale()
  return <>
    <output data-testid="preferences">{theme}|{accent}|{locale}</output>
    <button onClick={toggleTheme}>切换主题</button>
    <button onClick={() => setAccent('#336699')}>更换强调色</button>
    <button onClick={() => setLocale('en')}>设为英文</button>
    <button onClick={toggleLocale}>切换语言</button>
  </>
}

function renderPreferences(persist = true) {
  render(<ThemeProvider persist={persist}><LocaleProvider persist={persist}><PreferenceControls /></LocaleProvider></ThemeProvider>)
}

const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')!
beforeEach(() => {
  const values = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  } })
})
afterEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(window, 'localStorage', storageDescriptor)
})

describe('optional persisted preferences', () => {
  it.each(['read', 'write', 'access'] as const)('keeps theme, accent and language usable when storage %s fails', (failure) => {
    const fail = () => { throw new DOMException('Storage unavailable', 'SecurityError') }
    if (failure === 'access') Object.defineProperty(window, 'localStorage', { configurable: true, get: fail })
    else vi.spyOn(window.localStorage, failure === 'read' ? 'getItem' : 'setItem').mockImplementation(fail)

    renderPreferences()
    expect(screen.getByTestId('preferences')).toHaveTextContent(`dark|${defaultAccentHex}|zh`)
    fireEvent.click(screen.getByRole('button', { name: '切换主题' }))
    fireEvent.click(screen.getByRole('button', { name: '更换强调色' }))
    fireEvent.click(screen.getByRole('button', { name: '设为英文' }))
    expect(screen.getByTestId('preferences')).toHaveTextContent('light|#336699|en')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    expect(document.documentElement.style.getPropertyValue('--ff-accent')).toBe('#336699')
    fireEvent.click(screen.getByRole('button', { name: '切换语言' }))
    expect(document.documentElement).toHaveAttribute('lang', 'zh-CN')
  })

  it('still reads and writes selected preferences when storage works', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    window.localStorage.setItem(ACCENT_STORAGE_KEY, '#336699')
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    renderPreferences()
    expect(screen.getByTestId('preferences')).toHaveTextContent('light|#336699|en')
    fireEvent.click(screen.getByRole('button', { name: '切换主题' }))
    fireEvent.click(screen.getByRole('button', { name: '切换语言' }))
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh')
  })

  it('does not access real storage when persistence is disabled for Demo', () => {
    const readStorage = vi.fn(() => { throw new Error('Demo must not access storage') })
    Object.defineProperty(window, 'localStorage', { configurable: true, get: readStorage })
    renderPreferences(false)
    fireEvent.click(screen.getByRole('button', { name: '切换主题' }))
    fireEvent.click(screen.getByRole('button', { name: '更换强调色' }))
    fireEvent.click(screen.getByRole('button', { name: '切换语言' }))
    expect(screen.getByTestId('preferences')).toHaveTextContent('light|#336699|en')
    expect(readStorage).not.toHaveBeenCalled()
  })
})

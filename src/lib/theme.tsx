/**
 * [INPUT]: 依赖 react 的 Context、hooks 与浏览器 localStorage / documentElement。
 * [OUTPUT]: 对外提供 ThemeProvider、useTheme、Theme 类型与 THEME_STORAGE_KEY 常量。
 * [POS]: lib 的主题状态中心，统一管理 Dark / Light 切换、持久化与 DOM 同步。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { ACCENT_STORAGE_KEY, applyAccent, defaultAccentHex, normalizeAccentHex } from '@/lib/accent'

export type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'firefly-theme'

type ThemeContextValue = {
  accent: string
  setAccent: (accent: string) => void
  setTheme: (theme: Theme) => void
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

function readStoredAccent() {
  if (typeof window === 'undefined') {
    return defaultAccentHex
  }

  return normalizeAccentHex(window.localStorage.getItem(ACCENT_STORAGE_KEY))
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [accent, setAccentState] = useState(readStoredAccent)

  useEffect(() => {
    applyTheme(theme)
    applyAccent(accent, theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent)
  }, [accent, theme])

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
  }, [])

  const setAccent = useCallback((nextAccent: string) => {
    setAccentState(normalizeAccentHex(nextAccent))
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(
    () => ({ accent, setAccent, setTheme, theme, toggleTheme }),
    [accent, setAccent, setTheme, theme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}

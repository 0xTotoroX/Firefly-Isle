/**
 * [INPUT]: 依赖 react 的 Context、hooks 与浏览器 localStorage / documentElement。
 * [OUTPUT]: 对外提供 ThemeProvider、useTheme、Theme 类型与 THEME_STORAGE_KEY 常量。
 * [POS]: lib 的主题状态中心，统一管理 Dark / Light 切换、可选持久化与 DOM 同步；存储拒绝或写满时保留内存偏好。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
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

  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
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

  try {
    return normalizeAccentHex(window.localStorage.getItem(ACCENT_STORAGE_KEY))
  } catch {
    return defaultAccentHex
  }
}

export function ThemeProvider({ children, persist = true }: PropsWithChildren<{ persist?: boolean }>) {
  const [theme, setThemeState] = useState<Theme>(() => persist ? readStoredTheme() : 'dark')
  const [accent, setAccentState] = useState(() => persist ? readStoredAccent() : defaultAccentHex)

  useEffect(() => {
    applyTheme(theme)
    applyAccent(accent, theme)
    if (persist) {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme)
        window.localStorage.setItem(ACCENT_STORAGE_KEY, accent)
      } catch {
        // Preferences still apply in this tab when storage is unavailable.
      }
    }
  }, [accent, theme, persist])

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

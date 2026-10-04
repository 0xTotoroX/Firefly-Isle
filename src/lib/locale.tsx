/**
 * [INPUT]: 依赖 react 的 Context、hooks、brand 页面标题与浏览器 localStorage/documentElement。
 * [OUTPUT]: 对外提供 LocaleProvider、useLocale、Locale 类型、LOCALE_STORAGE_KEY 常量与文档语言同步工具。
 * [POS]: lib 的语言状态中心，统一管理 zh / en 切换、持久化、HTML lang/data-locale 与语言真相源消费入口；存储失败不阻断当前标签的语言切换。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { brand } from '@/lib/brand'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type Locale = 'zh' | 'en'

export const LOCALE_STORAGE_KEY = 'firefly-locale'

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function getLocaleDocumentAttributes(locale: Locale) {
  return {
    dataLocale: locale,
    lang: locale === 'zh' ? 'zh-CN' : 'en',
  }
}

export function syncDocumentLocale(locale: Locale) {
  if (typeof document === 'undefined') {
    return
  }

  const { dataLocale, lang } = getLocaleDocumentAttributes(locale)
  document.title = brand.pageTitle[locale]
  document.documentElement.lang = lang
  document.documentElement.dataset.locale = dataLocale
}

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'zh'
  }

  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

function writeStoredLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Locale is an optional preference; the current tab keeps its selected language.
  }
}

export function LocaleProvider({ children, persist = true }: PropsWithChildren<{ persist?: boolean }>) {
  const [locale, setLocaleState] = useState<Locale>(() => persist ? readStoredLocale() : 'zh')

  useEffect(() => {
    syncDocumentLocale(locale)
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    if (persist) writeStoredLocale(nextLocale)
  }, [persist])

  const toggleLocale = useCallback(() => {
    setLocaleState((currentLocale) => {
      const nextLocale = currentLocale === 'zh' ? 'en' : 'zh'
      if (persist) writeStoredLocale(nextLocale)
      return nextLocale
    })
  }, [persist])

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale }),
    [locale, setLocale, toggleLocale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)

  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider')
  }

  return context
}

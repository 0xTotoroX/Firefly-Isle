/**
 * [INPUT]: 依赖 node:fs 读取 locale 源码，依赖 vitest，依赖 ./locale 的语言 DOM 属性工具。
 * [OUTPUT]: 对外提供 locale 默认文档语义、英文切换语义与 LocaleProvider 同步合同回归测试。
 * [POS]: src/lib 的 locale 行为测试，约束 zh/en 不只改变文案，也同步 HTML lang 与 data-locale。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
/// <reference types="node" />

import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { getLocaleDocumentAttributes, syncDocumentLocale } from './locale'

const localeSource = readFileSync(new URL('./locale.tsx', import.meta.url), 'utf8')

describe('locale document contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps the default Chinese locale to semantic HTML attributes', () => {
    expect(getLocaleDocumentAttributes('zh')).toEqual({
      dataLocale: 'zh',
      lang: 'zh-CN',
    })
  })

  it('maps the English locale to semantic HTML attributes', () => {
    expect(getLocaleDocumentAttributes('en')).toEqual({
      dataLocale: 'en',
      lang: 'en',
    })
  })

  it('writes locale attributes to the document root when a browser document exists', () => {
    const documentElement = {
      dataset: {} as Record<string, string>,
      lang: '',
    }

    vi.stubGlobal('document', { documentElement })

    syncDocumentLocale('en')

    expect(documentElement.lang).toBe('en')
    expect(documentElement.dataset.locale).toBe('en')
  })

  it('keeps LocaleProvider as the single bridge from locale state to document attributes', () => {
    expect(localeSource).toContain("return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'zh'")
    expect(localeSource).toContain('useEffect(() => {\n    syncDocumentLocale(locale)\n  }, [locale])')
  })
})

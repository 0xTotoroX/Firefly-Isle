/**
 * [INPUT]: React静态渲染、纯SourceLicenseLink及真实登录/顶栏/隐私门控组件。
 * [OUTPUT]: 所有公开入口的同源、无需认证和不泄露当前路由的源码许可链接测试。
 * [POS]: system许可入口回归，使用合成页面，不读取用户数据。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SourceLicenseLink } from './source-license-link'
import { ClinicalTopBar } from './topbar'
import { LocaleProvider } from '@/lib/locale'
import { ThemeProvider } from '@/lib/theme'
import { BackgroundAudioProvider } from '@/lib/background-audio'

describe('source/license link', () => {
  it.each(['zh', 'en'] as const)('offers a public same-origin source page in %s without forwarding a patient route', (locale) => {
    const markup = renderToStaticMarkup(<SourceLicenseLink locale={locale} />)
    expect(markup).toContain('href="/source/index.html"')
    expect(markup).toContain('referrerPolicy="no-referrer"')
    expect(markup).toContain(locale === 'zh' ? '源码与许可' : 'Source &amp; license')
    expect(markup).not.toContain('github.com')
  })
  it('keeps the entry in the shared topbar used by public shares and account pages', () => {
    const markup = renderToStaticMarkup(<ThemeProvider persist={false}><LocaleProvider persist={false}><BackgroundAudioProvider persist={false}><ClinicalTopBar theme="dark" /></BackgroundAudioProvider></LocaleProvider></ThemeProvider>)
    expect(markup).toContain('href="/source/index.html"')
    expect(markup).toContain('源码与许可')
  })
})

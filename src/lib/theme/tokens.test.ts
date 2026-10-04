/**
 * [INPUT]: 依赖 node:fs 读取 src/main.tsx、src/index.css 与页面/组件/共享品牌字标源码，依赖 vitest，依赖 ./tokens 的 V3 主题合同。
 * [OUTPUT]: 对外提供主题 token、CSS 全局约束、边缘钉住顶栏、localized typography 与 latin 子集自托管字体加载回归测试。
 * [POS]: src/lib/theme 的测试文件，阻止 action 色、light 侧栏 shell 归属、紧凑响应式侧栏、边缘钉住顶栏、宽幅 shell、圆角合同与 locale 驱动字体系统回退到旧双主题漂移。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
/// <reference types="node" />

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  accentBase,
  sidebarDefaultWidth,
  sidebarLabelHideWidth,
  sidebarMaxWidth,
  sidebarMinWidth,
  sidebarOffsetClass,
  sidebarWidthClass,
  shellWideContentClass,
  shellViewportOffsetClass,
  themeTokens,
} from './tokens'
import { clinicalColors } from '../accent'

const mainSource = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8')
const indexCss = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')
const workspacePageSource = readFileSync(new URL('../../routes/workspace-page.tsx', import.meta.url), 'utf8')
const extractionComposerSource = readFileSync(new URL('../../components/workspace/extraction-composer.tsx', import.meta.url), 'utf8')
const reportPreviewFrameSource = readFileSync(new URL('../../components/workspace/report-preview-frame.tsx', import.meta.url), 'utf8')
const timelineTableSource = ['TimelineTable.tsx', 'timeline-sections.tsx'].map((name) => readFileSync(new URL(`../../components/timeline/${name}`, import.meta.url), 'utf8')).join('\n')
const topbarSource = readFileSync(new URL('../../components/system/topbar.tsx', import.meta.url), 'utf8')
const followUpPanelSource = readFileSync(new URL('../../components/workspace/follow-up-panel.tsx', import.meta.url), 'utf8')
const loginEntryViewSource = readFileSync(new URL('../../components/login/login-entry-view.tsx', import.meta.url), 'utf8')
const brandWordmarkSource = readFileSync(new URL('../../components/system/brand-wordmark.tsx', import.meta.url), 'utf8')
const originStoryPaperSource = readFileSync(new URL('../../components/system/origin-story/origin-story-paper.tsx', import.meta.url), 'utf8')
const privacyGateSource = readFileSync(new URL('../../components/privacy-gate.tsx', import.meta.url), 'utf8')
const privacyPageSource = readFileSync(new URL('../../routes/privacy-page.tsx', import.meta.url), 'utf8')
const recordPageSource = readFileSync(new URL('../../routes/record-page.tsx', import.meta.url), 'utf8')

describe('V3 theme token contract', () => {
  it('uses orange as the only primary action color across dark and light themes', () => {
    expect(themeTokens.dark.accent.primary).toBe('#C48A4A')
    expect(themeTokens.light.accent.primary).toBe('#C48A4A')
    expect(themeTokens.dark.accent.success).toBe(clinicalColors.dark.success)
    expect(themeTokens.light.accent.success).toBe(clinicalColors.light.success)
  })

  it('keeps the light sidebar joined to the workspace shell color', () => {
    expect(themeTokens.light.surface.sidebar).toBe(themeTokens.light.surface.base)
    expect(indexCss).toContain('--ff-surface-sidebar: #ffffff')
  })

  it('uses a resizable V3 sidebar geometry with an icon-only threshold', () => {
    expect(sidebarDefaultWidth).toBe(220)
    expect(sidebarMinWidth).toBe(72)
    expect(sidebarMaxWidth).toBe(296)
    expect(sidebarLabelHideWidth).toBe(204)
    expect(sidebarWidthClass).toBe('w-[var(--ff-sidebar-width)]')
    expect(sidebarOffsetClass).toBe('md:ml-[var(--ff-sidebar-offset)]')
    expect(shellViewportOffsetClass).toBe('left-0 right-0 md:left-[var(--ff-sidebar-offset)]')
    expect(shellWideContentClass).toBe('mx-auto w-full max-w-[1760px]')
  })

  it('keeps the V3 radius contract available in CSS', () => {
    expect(indexCss).not.toContain('border-radius: 0 !important')
    expect(indexCss).toContain('--ff-radius-md: 8px')
    expect(indexCss).toContain('--ff-sidebar-width: 220px')
  })

  it('uses locale-driven typography tokens across the app shell', () => {
    expect(mainSource).not.toContain('@fontsource/fraunces')
    expect(mainSource).toContain("import '@fontsource/inter/latin-400.css'")
    expect(mainSource).toContain("import '@fontsource/inter/latin-500.css'")
    expect(mainSource).toContain("import '@fontsource/inter/latin-600.css'")
    expect(mainSource).toContain("import '@fontsource/inter/latin-700.css'")
    expect(mainSource).toContain("import '@fontsource/ibm-plex-mono/latin-400.css'")
    expect(mainSource).toContain("import '@fontsource/ibm-plex-mono/latin-500.css'")
    expect(mainSource).toContain("import '@fontsource/ibm-plex-mono/latin-600.css'")
    expect(mainSource).not.toContain('fonts.googleapis.com')

    expect(indexCss).toContain('--ff-font-display-zh: var(--ff-font-ui-zh)')
    expect(indexCss).toContain('--ff-font-ui-zh: "PingFang SC", "Hiragino Sans GB", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif')
    expect(indexCss).toContain('--ff-font-display-en: var(--ff-font-ui-en)')
    expect(indexCss).toContain('--ff-font-ui-en: "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif')
    expect(indexCss).toContain('--ff-font-display: var(--ff-font-display-zh)')
    expect(indexCss).toContain('--ff-font-ui: var(--ff-font-ui-zh)')
    expect(indexCss).toContain('--ff-font-mono: "IBM Plex Mono", "SFMono-Regular", "SF Mono", ui-monospace, monospace')
    expect(indexCss).toContain(':root[data-locale="en"] {\n  --ff-font-display: var(--ff-font-display-en);\n  --ff-font-ui: var(--ff-font-ui-en);\n}')
    expect(indexCss).toContain('h1,\nh2,\nh3,\nh4,\nh5,\nh6 {\n  font-family: var(--ff-font-display);\n}')
    expect(indexCss).toContain('.font-\\[var\\(--ff-font-display\\)\\] {\n  font-family: var(--ff-font-display);\n}')
    expect(indexCss).toContain('.font-\\[var\\(--ff-font-ui\\)\\] {\n  font-family: var(--ff-font-ui);\n}')
    expect(indexCss).toContain('.font-\\[var\\(--ff-font-mono\\)\\] {\n  font-family: var(--ff-font-mono);\n}')
    expect(indexCss).not.toContain('--ff-font-display: "Inter", "Noto Sans SC", sans-serif')
    expect(indexCss).not.toContain('--ff-font-ui: "Inter", "Noto Sans SC", sans-serif')

    for (const source of [workspacePageSource, extractionComposerSource, reportPreviewFrameSource, timelineTableSource, topbarSource]) {
      expect(source).not.toContain("font-['Inter']")
      expect(source).not.toContain("font-['Inter_Tight']")
      expect(source).not.toContain("font-['JetBrains_Mono']")
      expect(source).not.toContain("font-['Newsreader']")
      expect(source).not.toContain('data-locale')
      expect(source).toContain('font-[var(--ff-font')
    }

    expect(topbarSource).toContain('whitespace-nowrap font-[var(--ff-font-display)] text-base')
    expect(extractionComposerSource).toContain('label className="font-[var(--ff-font-display)] text-2xl')
    expect(reportPreviewFrameSource).toContain('<h2 className="font-[var(--ff-font-display)] text-2xl')
    expect(timelineTableSource).toContain('font-[var(--ff-font-display)] text-2xl')
    expect(timelineTableSource).not.toMatch(/text-\[(?:9|10|11)px\]/)
    expect(reportPreviewFrameSource).toContain("const previewSectionTitleClass = 'font-[var(--ff-font-display)] text-base font-semibold")
    expect(reportPreviewFrameSource).toContain('className={`mb-2 ${previewSectionTitleClass}`}')
    expect(privacyGateSource).toContain('className="mt-3 font-[var(--ff-font-display)] text-lg font-bold tracking-normal"')
    expect(loginEntryViewSource).toContain('BrandWordmark')
    expect(brandWordmarkSource).toContain('font-[var(--ff-font-ui)]')

    for (const source of [
      followUpPanelSource,
      loginEntryViewSource,
      originStoryPaperSource,
      privacyPageSource,
      recordPageSource,
      timelineTableSource,
      reportPreviewFrameSource,
      privacyGateSource,
    ]) {
      expect(source).not.toMatch(/<h[1-6][^>]*font-\[var\(--ff-font-(ui|mono)\)\]/)
    }

    expect(extractionComposerSource).toContain('bg-[var(--ff-accent-primary)] px-6 font-[var(--ff-font-ui)] text-sm font-bold')
  })
})

describe('single accent color system', () => {
  it('derives primary from the selected accent while warnings retain their meaning', () => {
    for (const theme of ['dark', 'light'] as const) {
      expect(themeTokens[theme].accent.primary).toBe(accentBase)
      expect(themeTokens[theme].accent.warning).toBe(clinicalColors[theme].warning)
      expect(themeTokens[theme].border.strong).toBe(accentBase)
    }
  })

  it('keeps clinical semantic colors independent of the accent family', () => {
    for (const theme of ['dark', 'light'] as const) {
      expect(themeTokens[theme].accent.critical).toBe(clinicalColors[theme].critical)
      expect(themeTokens[theme].accent.low).toBe(clinicalColors[theme].low)
      expect(themeTokens[theme].accent.success).toBe(clinicalColors[theme].success)
    }
  })
})

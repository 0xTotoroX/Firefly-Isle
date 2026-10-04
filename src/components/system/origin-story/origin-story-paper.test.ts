/**
 * [INPUT]: 依赖 react、react-dom/server、vitest 与 OriginStoryPaper 的纯 DOM 阅读弹层。
 * [OUTPUT]: 对外验证 V3 token、普通正文、纯文本来源、可见关闭按钮与无 Canvas/WebGL 的展示合同。
 * [POS]: components/system/origin-story 的阅读弹层回归测试，防止重新引入独立羊皮纸材质、隐藏关闭控件或尾段粗体。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { originStorySourceText, originStorySubtitle, storyParagraphs } from './origin-story-content'
import { OriginStoryPaper } from './origin-story-paper'

function renderPaper(theme: 'dark' | 'light' = 'dark') {
  return renderToStaticMarkup(
    createElement(OriginStoryPaper, {
      anchorRef: createRef<HTMLElement>(),
      onClose: () => undefined,
      open: true,
      theme,
    }),
  )
}

describe('OriginStoryPaper', () => {
  it.each(['light', 'dark'] as const)('uses the same V3 clinical archive structure in %s mode', (theme) => {
    const markup = renderPaper(theme)

    expect(markup).toContain(`data-origin-story-theme="${theme}"`)
    expect(markup).toContain('var(--ff-surface-panel)')
    expect(markup).toContain('var(--ff-border-default)')
    expect(markup).toContain('var(--ff-accent-primary)')
    expect(markup).toContain('Origin note')
    expect(markup).toContain('Public source')
    expect(markup).toContain(originStorySubtitle)
    expect(markup).not.toContain('一位92岁老人想看完世界杯决赛的故事')
    expect(markup).toContain('aria-modal="true"')
    expect(markup).toContain('aria-label="关闭创作初衷"')
  })

  it('renders every story paragraph at normal weight, including the closing paragraph', () => {
    const markup = renderPaper()

    for (const paragraph of storyParagraphs) {
      expect(markup).toContain(paragraph)
    }

    expect(markup).toContain(`<p class="font-normal">${storyParagraphs.at(-1)}</p>`)
    expect(markup).not.toContain(`<strong>${storyParagraphs.at(-1)}</strong>`)
    expect(markup).not.toContain(`<b>${storyParagraphs.at(-1)}</b>`)
  })

  it('keeps the canonical source as plain text at the end of the reading body', () => {
    const markup = renderPaper()

    expect(markup).toContain(originStorySourceText.replaceAll('&', '&amp;'))
    expect(markup).not.toContain('<a ')
    expect(markup.indexOf(storyParagraphs.at(-1) ?? '')).toBeLessThan(markup.indexOf('原帖：YouTube 社区帖子'))
  })

  it('does not render the closed dialog', () => {
    const markup = renderToStaticMarkup(
      createElement(OriginStoryPaper, {
        anchorRef: createRef<HTMLElement>(),
        onClose: () => undefined,
        open: false,
        theme: 'dark',
      }),
    )

    expect(markup).toBe('')
  })
})

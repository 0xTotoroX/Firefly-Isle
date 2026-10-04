/**
 * [INPUT]: 依赖 vitest 与 origin-story-content 的公开原帖内容合同。
 * [OUTPUT]: 对外验证创作初衷完整呈现用户指定的公开故事，并将唯一规范来源地址作为正文末尾纯文本。
 * [POS]: origin-story 内容源的回归测试，避免再次把公开原帖错误压缩成无关泛化摘要或引入非公开材料。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it } from 'vitest'

import {
  originStorySubtitle,
  originStorySourceLabel,
  originStorySourceText,
  originStorySourceUrl,
  originStoryText,
  storyParagraphs,
} from './origin-story-content'

describe('origin story public source content', () => {
  it('uses the restrained life theme requested for the reading header', () => {
    expect(originStorySubtitle).toBe('生命')
  })

  it('keeps the complete story derived from the user-specified public post', () => {
    expect(storyParagraphs).toHaveLength(25)
    expect(storyParagraphs[0]).toBe('今天遇到一个让我印象很深的病人。')
    expect(storyParagraphs).toContain('DNI（Do Not Intubate），就是如果以后发生呼吸衰竭，不进行气管插管，不使用有创呼吸机。')
    expect(storyParagraphs).toContain('DNR（Do Not Resuscitate），就是如果心脏或呼吸停止，不实施心肺复苏（CPR）。')
    expect(storyParagraphs).toContain('“我想……等世界杯决赛看完……再签，可以吗？”')
    expect(storyParagraphs.at(-1)).toBe('而我们能做的，就是尽力帮他把这个愿望，留到终场哨响的那一刻。')
    expect(originStoryText).toBe([...storyParagraphs, originStorySourceText].join('\n\n'))
  })

  it('appends one canonical source address as plain text at the end of the body', () => {
    expect(originStorySourceLabel).toBe('原帖：YouTube 社区帖子')
    expect(originStorySourceUrl).toBe('https://www.youtube.com/post/Ugkx2pyfj6hZm_j7M4tjutIm7D9BFqg-mfyB')
    expect(originStorySourceText).toBe(`${originStorySourceLabel} ${originStorySourceUrl}`)
    expect(originStoryText.endsWith(originStorySourceText)).toBe(true)
  })
})

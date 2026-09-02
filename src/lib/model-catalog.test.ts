/**
 * [INPUT]: 依赖 vitest、node:fs 的页面装配源码检查与 ./model-catalog。
 * [OUTPUT]: 对外提供模型目录协议与页面装配的回归测试。
 * [POS]: lib 的模型目录测试，约束目录协议字段完整、文字/图像默认模型绑定 deepseek v4 族、目录页消费共享真相源而非字面量。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { defaultImageModel, defaultTextModel, listVisibleModels, modelCatalog } from './model-catalog'

function readModelsPageSource() {
  return readFileSync(new URL('../routes/models-page.tsx', import.meta.url), 'utf8')
}

describe('model catalog protocol', () => {
  it('binds the text pipeline to DeepSeek v4 Flash and the image pipeline to the DeepSeek v4 image model', () => {
    expect(defaultTextModel.slug).toBe('deepseek-v4-flash')
    expect(defaultTextModel.inputModalities).toEqual(['text'])
    expect(defaultImageModel.slug).toBe('deepseek-v4-image')
    expect(defaultImageModel.inputModalities).toContain('image')
  })

  it('declares protocol-complete entries with unique slugs and stable priority order', () => {
    for (const entry of modelCatalog) {
      expect(entry.slug.length).toBeGreaterThan(0)
      expect(entry.displayName.length).toBeGreaterThan(0)
      expect(entry.description.length).toBeGreaterThan(0)
      expect(['text', 'image']).toContain(entry.modality)
      expect(['list', 'hidden']).toContain(entry.visibility)
      expect(entry.inputModalities.length).toBeGreaterThan(0)
    }

    const slugs = modelCatalog.map((entry) => entry.slug)

    expect(new Set(slugs).size).toBe(slugs.length)

    const sorted = listVisibleModels().every((entry, index, all) => index === 0 || all[index - 1].priority <= entry.priority)

    expect(sorted).toBe(true)
  })

  it('filters by modality without leaking hidden entries', () => {
    const textModels = listVisibleModels('text')

    for (const entry of textModels) {
      expect(entry.modality).toBe('text')
    }
  })

  it('renders the models page from the shared catalog instead of literals', () => {
    const source = readModelsPageSource()

    expect(source).toContain('listVisibleModels()')
    expect(source).toContain('deepseek-v4-flash')
    expect(source).not.toContain("slug: 'deepseek")
  })

  it('does not list Gemini 2.5 Flash in the visible catalog', () => {
    expect(listVisibleModels().some((entry) => entry.slug.includes('gemini'))).toBe(false)
    expect(modelCatalog.some((entry) => entry.slug === 'gemini-2.5-flash')).toBe(false)
  })
})

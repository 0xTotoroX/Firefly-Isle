/**
 * [INPUT]: 依赖 react-dom/server、vitest、LocaleProvider 与 llm-provider-settings-panel 的字段可见性纯函数。
 * [OUTPUT]: 对外提供模型设置三种模式的第二行字段显隐、顺序与 DeepSeek 连通性测试入口回归测试。
 * [POS]: components/workspace 的 provider 设置 UI 合同测试，约束系统内置、API 自提供与自定义模式的字段边界。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/lib/locale'

import { getLlmProviderVisibleFields, LlmProviderSettingsPanel } from './llm-provider-settings-panel'

vi.mock('@/lib/llm/provider-settings', () => ({
  getLlmProviderSetting: vi.fn().mockResolvedValue({ keySet: false, mode: 'system', provider: 'deepseek' }),
  resetLlmProviderSetting: vi.fn(),
  saveLlmProviderSetting: vi.fn(),
  testLlmProviderConnection: vi.fn(),
}))

describe('llm provider settings panel field visibility', () => {
  it('hides the settings field row for the built-in system provider', () => {
    expect(getLlmProviderVisibleFields('system')).toEqual([])
  })

  it('shows provider, API key, and model for API self-provided mode without base URL', () => {
    expect(getLlmProviderVisibleFields('preset')).toEqual(['provider', 'apiKey', 'model'])
  })

  it('shows base URL before API key and model for custom mode without provider', () => {
    expect(getLlmProviderVisibleFields('custom')).toEqual(['baseUrl', 'apiKey', 'model'])
  })

  it('renders a DeepSeek service test action in the provider settings panel', () => {
    const markup = renderToStaticMarkup(
      createElement(LocaleProvider, null, createElement(LlmProviderSettingsPanel, { theme: 'dark' })),
    )

    expect(markup).toContain('测试 DeepSeek 服务')
    expect(markup).toContain('data-llm-provider-test="true"')
  })
})

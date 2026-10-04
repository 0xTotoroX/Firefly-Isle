/**
 * [INPUT]: 依赖 vitest 的 Supabase session 与 fetch mock，依赖 provider-settings client 的设置请求封装。
 * [OUTPUT]: 对外提供 LLM provider settings 前端协议测试，约束 provider/model 保存、读取、重置、系统 DeepSeek 绕过测试与明文 key 不回读。
 * [POS]: src/lib/llm 的 provider 设置客户端测试，确保浏览器只通过 Edge Function 保存密钥与模型名。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mocks.getSession,
    },
  }),
  hasSupabaseEnv: true,
  hasSupabaseFunctionEnv: true,
  supabaseEdgeFunctionUrl: 'https://edge.example.test/functions/v1',
}))

import {
  getLlmProviderSetting,
  resetLlmProviderSetting,
  saveLlmProviderSetting,
  testLlmProviderConnection,
} from './provider-settings'

describe('llm provider settings client', () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'session-token',
        },
      },
      error: null,
    })
  })

  it('saves preset providers with model values and without editable base URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ keySet: true, mode: 'user', model: 'gpt-4.1-mini', provider: 'openai' })),
    )

    await saveLlmProviderSetting({
      apiKey: 'openai-user-key',
      model: 'gpt-4.1-mini',
      provider: 'openai',
    })

    expect(fetch).toHaveBeenCalledWith('https://edge.example.test/functions/v1/llm-proxy/settings', {
      body: JSON.stringify({
        apiKey: 'openai-user-key',
        model: 'gpt-4.1-mini',
        provider: 'openai',
      }),
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      method: 'PUT',
    })
  })

  it('saves custom OpenAI-style providers with base URL, API key, and model', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ baseUrl: 'https://llm.example.test/v1', keySet: true, mode: 'user', model: 'custom-model', provider: 'custom_openai' })),
    )

    await saveLlmProviderSetting({
      apiKey: 'custom-key',
      baseUrl: 'https://llm.example.test/v1',
      model: 'custom-model',
      provider: 'custom_openai',
    })

    expect(fetch).toHaveBeenCalledWith(
      'https://edge.example.test/functions/v1/llm-proxy/settings',
      expect.objectContaining({
        body: JSON.stringify({
          apiKey: 'custom-key',
          baseUrl: 'https://llm.example.test/v1',
          model: 'custom-model',
          provider: 'custom_openai',
        }),
        method: 'PUT',
      }),
    )
  })

  it('redacts plaintext keys even if a malformed server payload includes one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ apiKey: 'server-bug-key', keySet: true, mode: 'user', provider: 'kimi' })),
    )

    const setting = await getLlmProviderSetting()

    expect(setting).toEqual({ keySet: true, mode: 'user', provider: 'kimi' })
    expect(setting).not.toHaveProperty('apiKey')
  })

  it('resets to system DeepSeek with a DELETE request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ keySet: false, mode: 'system', provider: 'deepseek' })),
    )

    await resetLlmProviderSetting()

    expect(fetch).toHaveBeenCalledWith('https://edge.example.test/functions/v1/llm-proxy/settings', {
      headers: {
        Authorization: 'Bearer session-token',
      },
      method: 'DELETE',
    })
  })

  it('tests system DeepSeek connectivity through llm-proxy without exposing provider keys', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ model: 'deepseek-v4-flash', text: 'OK' })),
    )

    await expect(testLlmProviderConnection()).resolves.toEqual({
      model: 'deepseek-v4-flash',
      ok: true,
    })

    expect(fetch).toHaveBeenCalledWith('https://edge.example.test/functions/v1/llm-proxy', {
      body: JSON.stringify({
        messages: [
          {
            content: '请只回复 OK，用于测试模型服务连通性。',
            role: 'user',
          },
        ],
        bypassSavedSetting: true,
        model: 'deepseek-v4-flash',
        provider: 'deepseek',
      }),
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}

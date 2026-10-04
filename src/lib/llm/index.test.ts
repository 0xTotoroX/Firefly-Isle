/**
 * [INPUT]: 依赖 vitest 的 Supabase session 与 fetch mock，依赖 ./index 的 chat 请求封装。
 * [OUTPUT]: 对外提供 LLM adapter 请求协议回归测试，约束 provider/model/responseFormat 透传。
 * [POS]: src/lib/llm 的前端协议测试，确保调用方仍只通过 chat 边界访问模型代理。
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

import { chat } from './index'

const messages = [
  {
    role: 'user' as const,
    content: '请结构化这段病史。',
  },
]

describe('llm chat adapter', () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'session-token',
        },
      },
      error: null,
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ model: 'deepseek-v4-flash', text: '{"treatmentLines":[]}' }), {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        }),
      ),
    )
  })

  it('serializes provider, model, and responseFormat into the proxy request body', async () => {
    await chat(messages, {
      model: 'deepseek-v4-flash',
      provider: 'deepseek',
      responseFormat: 'json_object',
    })

    expect(fetch).toHaveBeenCalledWith('https://edge.example.test/functions/v1/llm-proxy', {
      body: JSON.stringify({
        messages,
        model: 'deepseek-v4-flash',
        provider: 'deepseek',
        responseFormat: 'json_object',
      }),
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  })
})

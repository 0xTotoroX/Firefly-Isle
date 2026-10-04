/**
 * [INPUT]: consumeUsage、Vitest 与注入 fetch/响应。
 * [OUTPUT]: 原子 RPC 参数、获准/拒绝、非法响应和网络失败的回归。
 * [POS]: 模型/OCR 共享配额协议测试，不调用真实上游。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it, vi } from 'vitest'
import { consumeUsage } from './usage-limits.ts'

const config = { supabaseAnonKey: 'anon', supabaseUrl: 'https://test.supabase.co', userToken: 'session' }

describe('consumeUsage', () => {
  it.each([
    [{ allowed: true, reason: null }, 'allowed'],
    [{ allowed: false, reason: 'window' }, 'window'],
    [{ allowed: false, reason: 'quota' }, 'quota'],
    [{ allowed: 'true', reason: null }, 'unavailable'],
    [{ allowed: true, reason: 'quota' }, 'unavailable'],
    [{ allowed: false, reason: 'unexpected' }, 'unavailable'],
    [null, 'unavailable'],
    [[], 'unavailable'],
  ])('validates RPC result %j', async (body, expected) => {
    const fetchMock = vi.fn(async () => Response.json(body))
    expect(await consumeUsage(config, 'llm_chat', fetchMock)).toBe(expected)
    expect(fetchMock).toHaveBeenCalledWith(`${config.supabaseUrl}/rest/v1/rpc/consume_usage`, expect.objectContaining({
      method: 'POST', body: JSON.stringify({ event_kind: 'llm_chat' }),
      headers: expect.objectContaining({ Authorization: 'Bearer session', apikey: 'anon' }),
    }))
  })

  it.each([
    async () => new Response('{}', { status: 503 }),
    async () => new Response('invalid JSON'),
    async () => { throw new Error('offline') },
  ])('fails closed for RPC errors', async (fetchMock) => {
    expect(await consumeUsage(config, 'ocr_document', fetchMock)).toBe('unavailable')
  })
})

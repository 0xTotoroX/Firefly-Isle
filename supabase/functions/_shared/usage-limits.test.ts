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

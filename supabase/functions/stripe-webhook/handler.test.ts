/**
 * [INPUT]: 依赖 vitest、node:crypto 的 HMAC-SHA256、./handler 与注入 fetch mock。
 * [OUTPUT]: 对外提供 stripe-webhook 的签名校验、事件落库与幂等写路径回归测试。
 * [POS]: supabase/functions/stripe-webhook 的测试文件，约束无密钥 fail-closed、坏签名拒绝、合法事件按 user_id upsert、无关事件忽略。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

import { createStripeWebhookHandler, type RuntimeEnv } from './handler'

const WEBHOOK_SECRET = 'whsec_test'

function createEnv(overrides: Record<string, string | undefined> = {}): RuntimeEnv {
  const values: Record<string, string | undefined> = {
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    SUPABASE_URL: 'https://project.supabase.co',
    ...overrides,
  }

  return { get: (name: string) => values[name] }
}

function createFetchMock() {
  const calls: Array<{ body?: string; url: string }> = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ body: typeof init?.body === 'string' ? init.body : undefined, url: input.toString() })

    return new Response('{}', { status: 200 })
  })

  return { calls, fetchMock }
}

function signedRequest(rawBody: string, secret = WEBHOOK_SECRET, timestampOffsetSeconds = 0) {
  const timestamp = Math.floor(Date.now() / 1000) + timestampOffsetSeconds
  const signature = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')

  return new Request('https://edge.test/stripe-webhook', {
    body: rawBody,
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': `t=${timestamp},v1=${signature}`,
    },
    method: 'POST',
  })
}

const checkoutEvent = {
  data: {
    object: {
      amount_total: 1500,
      client_reference_id: 'auth-user',
      currency: 'usd',
      id: 'cs_123',
      metadata: { amount_cents: '1500', user_id: 'auth-user' },
      mode: 'payment',
      payment_intent: 'pi_123',
      payment_status: 'paid',
      status: 'complete',
    },
  },
  id: 'evt_1',
  type: 'checkout.session.completed',
}

describe('stripe-webhook handler', () => {
  it('fails closed with BILLING_DISABLED when secrets are missing', async () => {
    const { fetchMock } = createFetchMock()
    const handler = createStripeWebhookHandler({ env: createEnv({ STRIPE_WEBHOOK_SECRET: undefined }), fetch: fetchMock })

    const response = await handler(signedRequest(JSON.stringify(checkoutEvent)))

    expect(response.status).toBe(503)
  })

  it('rejects payloads with an invalid or stale signature', async () => {
    const { fetchMock } = createFetchMock()
    const handler = createStripeWebhookHandler({ env: createEnv(), fetch: fetchMock })

    const badSignature = await handler(signedRequest(JSON.stringify(checkoutEvent), 'whsec_wrong'))
    const stale = await handler(signedRequest(JSON.stringify(checkoutEvent), WEBHOOK_SECRET, -3600))

    expect(badSignature.status).toBe(400)
    expect(stale.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('persists a completed checkout as an idempotent donation upsert', async () => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createStripeWebhookHandler({ env: createEnv(), fetch: fetchMock })

    const response = await handler(signedRequest(JSON.stringify(checkoutEvent)))
    const payload = await response.json() as { received: boolean }

    expect(response.status).toBe(200)
    expect(payload.received).toBe(true)

    const upsert = calls.find((call) => call.url.includes('/rest/v1/donations'))

    expect(upsert?.url).toContain('on_conflict=stripe_checkout_session_id')
    expect(upsert?.body).toContain('"user_id":"auth-user"')
    expect(upsert?.body).toContain('"amount_cents":1500')
    expect(upsert?.body).toContain('"status":"paid"')
    expect(upsert?.body).not.toContain('service-key')
  })

  it('ignores unsupported event types without touching the database', async () => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createStripeWebhookHandler({ env: createEnv(), fetch: fetchMock })

    const response = await handler(signedRequest(JSON.stringify({ id: 'evt_2', type: 'invoice.paid' })))
    const payload = await response.json() as { ignored: string | null }

    expect(response.status).toBe(200)
    expect(payload.ignored).toBe('invoice.paid')
    expect(calls.some((call) => call.url.includes('/rest/v1/donations'))).toBe(false)
  })
})

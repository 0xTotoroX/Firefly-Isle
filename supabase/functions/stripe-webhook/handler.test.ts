/**
 * [INPUT]: 依赖 vitest、node:crypto 的 HMAC-SHA256、./handler 与注入 fetch mock。
 * [OUTPUT]: 原始正文签名、付款状态与单 RPC 协议的回归；并发/重放由真实 SQL 检查。
 * [POS]: 只使用合成 Checkout 与注入 fetch；无配置关闭、非捐赠忽略、无付款事实拒绝。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

import { createStripeWebhookHandler, type RuntimeEnv } from './handler'

const WEBHOOK_SECRET = 'whsec_test'
const OWNER_ID = 'd0000000-0000-4000-8000-000000000001'

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
      client_reference_id: OWNER_ID,
      currency: 'usd',
      id: 'cs_123',
      metadata: { amount_cents: '1500', user_id: OWNER_ID },
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
  it.each(['STRIPE_WEBHOOK_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_URL'])('fails closed when %s is missing', async (key) => {
    const { fetchMock } = createFetchMock()
    const handler = createStripeWebhookHandler({ env: createEnv({ [key]: undefined }), fetch: fetchMock })

    const response = await handler(signedRequest(JSON.stringify(checkoutEvent)))

    expect(response.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
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

  it('records confirmed payment through the atomic donation RPC', async () => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createStripeWebhookHandler({ env: createEnv(), fetch: fetchMock })

    const response = await handler(signedRequest(JSON.stringify(checkoutEvent)))
    const payload = await response.json() as { received: boolean }

    expect(response.status).toBe(200)
    expect(payload.received).toBe(true)

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://project.supabase.co/rest/v1/rpc/record_donation_payment')
    expect(JSON.parse(calls[0].body!)).toEqual({
      p_user_id: OWNER_ID,
      p_amount_cents: 1500,
      p_currency: 'usd',
      p_status: 'paid',
      p_checkout_session_id: 'cs_123',
      p_payment_intent_id: 'pi_123',
    })
    expect(calls[0].body).not.toContain('service-key')
  })

  it('ignores unsupported event types without touching the database', async () => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createStripeWebhookHandler({ env: createEnv(), fetch: fetchMock })

    const response = await handler(signedRequest(JSON.stringify({ id: 'evt_2', type: 'invoice.paid' })))
    const payload = await response.json() as { ignored: string | null }

    expect(response.status).toBe(200)
    expect(payload.ignored).toBe('invoice.paid')
    expect(calls).toHaveLength(0)
  })

  it.each([
    ['checkout.session.completed', 'unpaid', 'pending'],
    ['checkout.session.async_payment_succeeded', 'paid', 'paid'],
    ['checkout.session.async_payment_failed', 'unpaid', 'failed'],
  ])('maps %s with payment status %s to %s', async (type, payment_status, expected) => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createStripeWebhookHandler({ env: createEnv(), fetch: fetchMock })
    const event = { ...checkoutEvent, type, data: { object: { ...checkoutEvent.data.object, payment_status, status: 'complete' } } }
    expect((await handler(signedRequest(JSON.stringify(event)))).status).toBe(200)
    expect(JSON.parse(calls[0].body!).p_status).toBe(expected)
  })

  it.each(['subscription', 'setup'])('ignores %s checkout sessions', async (mode) => {
    const { fetchMock } = createFetchMock()
    const handler = createStripeWebhookHandler({ env: createEnv(), fetch: fetchMock })
    const event = { ...checkoutEvent, data: { object: { ...checkoutEvent.data.object, mode } } }
    expect((await handler(signedRequest(JSON.stringify(event)))).status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    { amount_total: null },
    { amount_total: 0 },
    { amount_total: 1.5 },
    { payment_status: 'no_payment_required' },
    { currency: null },
    { client_reference_id: 'not-a-user-id' },
    { client_reference_id: 'd0000000-0000-4000-8000-000000000002' },
    { mode: null },
    { id: null },
  ])('rejects invalid donation facts without falling back to metadata: %j', async (patch) => {
    const { fetchMock } = createFetchMock()
    const handler = createStripeWebhookHandler({ env: createEnv(), fetch: fetchMock })
    const event = { ...checkoutEvent, data: { object: { ...checkoutEvent.data.object, ...patch } } }
    expect((await handler(signedRequest(JSON.stringify(event)))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an asynchronous success without confirmed payment', async () => {
    const { fetchMock } = createFetchMock()
    const handler = createStripeWebhookHandler({ env: createEnv(), fetch: fetchMock })
    const event = { ...checkoutEvent, type: 'checkout.session.async_payment_succeeded', data: { object: { ...checkoutEvent.data.object, payment_status: 'unpaid' } } }
    expect((await handler(signedRequest(JSON.stringify(event)))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('verifies the original UTF-8 body and supports a valid signature during secret rotation', async () => {
    const { calls, fetchMock } = createFetchMock()
    const handler = createStripeWebhookHandler({ env: createEnv(), fetch: fetchMock })
    const rawBody = JSON.stringify({ ...checkoutEvent, description: '合成捐赠' }, null, 2)
    const request = signedRequest(rawBody)
    request.headers.set('Stripe-Signature', `${request.headers.get('Stripe-Signature')},v1=wrong`)
    expect((await handler(request)).status).toBe(200)
    const original = signedRequest(rawBody)
    const modified = new Request(original.url, { method: 'POST', headers: original.headers, body: rawBody.replace('1500', '1501') })
    expect((await handler(modified)).status).toBe(400)
    expect(calls).toHaveLength(1)
    expect(calls[0].body).not.toContain('合成捐赠')
  })

  it.each(['null', '[]', '{'])('rejects a signed non-event body: %s', async (body) => {
    const { fetchMock } = createFetchMock()
    const handler = createStripeWebhookHandler({ env: createEnv(), fetch: fetchMock })
    expect((await handler(signedRequest(body))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['response', 'network'])('returns a retryable error after a database %s failure', async (failure) => {
    const fetchMock = failure === 'response'
      ? vi.fn().mockResolvedValue(new Response('{}', { status: 500 }))
      : vi.fn().mockRejectedValue(new Error('offline'))
    const handler = createStripeWebhookHandler({ env: createEnv(), fetch: fetchMock })
    const response = await handler(signedRequest(JSON.stringify(checkoutEvent)))
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('subscription')
  })
})

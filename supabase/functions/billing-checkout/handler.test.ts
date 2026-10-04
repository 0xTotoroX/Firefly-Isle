/**
 * [INPUT]: 依赖 vitest、node:crypto 的 HMAC、./handler 与注入 fetch mock。
 * [OUTPUT]: 对外提供 billing-checkout 的开关门控、鉴权与请求构造回归测试。
 * [POS]: supabase/functions/billing-checkout 的测试文件，约束未配置时 fail-closed、一次性 Checkout 请求携带用户身份、金额与捐赠 metadata。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { describe, expect, it, vi } from 'vitest'

import { createBillingCheckoutHandler, type RuntimeEnv } from './handler'

function createEnv(overrides: Record<string, string | undefined> = {}): RuntimeEnv {
  const values: Record<string, string | undefined> = {
    STRIPE_CHECKOUT_CANCEL_URL: 'https://firefly.test/cancel',
    STRIPE_CHECKOUT_SUCCESS_URL: 'https://firefly.test/success',
    STRIPE_SECRET_KEY: 'sk_test_key',
    SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_URL: 'https://project.supabase.co',
    ...overrides,
  }

  return { get: (name: string) => values[name] }
}

const authUser = { email: 'rider@firefly.test', id: 'auth-user' }

function createFetchMock(upstream: Response | Error, responses: Record<string, unknown> = {}) {
  const calls: Array<{ body?: string; url: string }> = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString()

    calls.push({ body: typeof init?.body === 'string' ? init.body : undefined, url })

    if (url.includes('/auth/v1/user')) {
      return new Response(JSON.stringify(responses.authUser ?? authUser), { status: 200 })
    }

    if (upstream instanceof Error) {
      throw upstream
    }

    return upstream
  })

  return { calls, fetchMock }
}

function createRequest(token = 'session-token') {
  return new Request('https://edge.test/billing-checkout', {
    body: JSON.stringify({}),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
}

describe('billing-checkout handler', () => {
  it('fails closed with BILLING_DISABLED when Stripe is not configured', async () => {
    const { fetchMock } = createFetchMock(new Response('{}', { status: 200 }))
    const handler = createBillingCheckoutHandler({ env: createEnv({ STRIPE_SECRET_KEY: undefined }), fetch: fetchMock })

    const response = await handler(createRequest())
    const payload = await response.json() as { error: { name: string } }

    expect(response.status).toBe(503)
    expect(payload.error.name).toBe('BILLING_DISABLED')
  })

  it('rejects requests without a valid Supabase session', async () => {
    const { fetchMock } = createFetchMock(new Response('{}', { status: 200 }), { authUser: { email: null, id: null } })
    const handler = createBillingCheckoutHandler({ env: createEnv(), fetch: fetchMock })

    const response = await handler(createRequest('invalid-token'))

    expect(response.status).toBe(401)
  })

  it('creates a one-time donation checkout session bound to the user id', async () => {
    const { calls, fetchMock } = createFetchMock(new Response(JSON.stringify({ id: 'cs_1', url: 'https://checkout.stripe.test/session' }), { status: 200 }))
    const handler = createBillingCheckoutHandler({ env: createEnv(), fetch: fetchMock })

    const response = await handler(createRequest())
    const payload = await response.json() as { checkoutUrl: string; sessionId: string }

    expect(response.status).toBe(200)
    expect(payload).toEqual({ checkoutUrl: 'https://checkout.stripe.test/session', sessionId: 'cs_1' })

    const stripeCall = calls.find((call) => call.url.includes('api.stripe.com'))
    const params = new URLSearchParams(stripeCall?.body ?? '')

    expect(params.get('mode')).toBe('payment')
    expect(params.get('submit_type')).toBe('donate')
    expect(params.get('client_reference_id')).toBe('auth-user')
    expect(params.get('metadata[user_id]')).toBe('auth-user')
    expect(params.get('line_items[0][price_data][unit_amount]')).toBe('1500')
    expect(params.get('customer_email')).toBe('rider@firefly.test')
    expect(stripeCall?.body).not.toContain('sk_test_key')
  })

  it('maps Stripe failures to a stable error without leaking the key', async () => {
    const { fetchMock } = createFetchMock(new Response('card error', { status: 402 }))
    const handler = createBillingCheckoutHandler({ env: createEnv(), fetch: fetchMock })

    const response = await handler(createRequest())
    const payload = await response.json() as { error: { message: string; name: string } }

    expect(response.status).toBe(502)
    expect(payload.error.name).toBe('StripeError')
    expect(payload.error.message).not.toContain('sk_test_key')
  })
})

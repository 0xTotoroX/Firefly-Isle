/**
 * [INPUT]: Web Crypto HMAC-SHA256、Stripe Checkout 事件、注入 fetch 与 record_donation_payment RPC。
 * [OUTPUT]: 对外提供 createStripeWebhookHandler、RuntimeEnv、verifyStripeSignature 与 StripeWebhookEvent 类型。
 * [POS]: 原文验签后校验一次性捐赠的付款事实；数据库按 Checkout Session 原子合并状态并保留注销后的解除关联，无配置时关闭。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const SIGNATURE_TOLERANCE_SECONDS = 300

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, stripe-signature, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

export type RuntimeEnv = {
  get(name: string): string | undefined
}

type RuntimeFetch = (input: string | URL, init?: RequestInit) => Promise<Response>

export type ErrorCode = 'BILLING_DISABLED' | 'InvalidRequestError' | 'ConfigurationError' | 'SignatureError' | 'UnhandledEventError'

export type StripeWebhookEvent = {
  data?: {
    object?: {
      amount_total?: number | null
      client_reference_id?: string | null
      currency?: string | null
      current_period_end?: number | null
      customer?: string | null
      id?: string
      metadata?: { amount_cents?: string; user_id?: string } | null
      mode?: string | null
      payment_intent?: string | null
      payment_status?: string | null
      status?: string
    }
  }
  id?: string
  type?: string
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status,
  })
}

function errorBody(name: ErrorCode, message: string) {
  return {
    error: {
      message,
      name,
    },
  }
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false
  }

  let mismatch = 0

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return mismatch === 0
}

export async function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string, now = Date.now()): Promise<boolean> {
  if (!signatureHeader || !secret) {
    return false
  }

  const parts = signatureHeader.split(',').map((part) => part.trim().split('='))
  const timestamp = parts.find(([name]) => name === 't')?.[1]
  const signatures = parts.filter(([name]) => name === 'v1').map(([, value]) => value)

  if (!timestamp || signatures.length === 0) {
    return false
  }

  const timestampSeconds = Number.parseInt(timestamp, 10)

  if (!Number.isFinite(timestampSeconds) || Math.abs(now / 1000 - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS) {
    return false
  }

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { hash: 'SHA-256', name: 'HMAC' }, false, ['sign'])
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`))
  const expected = [...new Uint8Array(signatureBuffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

  return signatures.some((signature) => timingSafeEqual(signature, expected))
}

function mapDonationRow(event: StripeWebhookEvent): Record<string, unknown> | null {
  const object = event.data?.object
  const sessionId = object?.id
  const userId = object?.client_reference_id || object?.metadata?.user_id
  const amountCents = object?.amount_total
  const currency = object?.currency
  const paymentIntent = object?.payment_intent
  if (object?.mode !== 'payment' || typeof sessionId !== 'string' || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)
    || typeof amountCents !== 'number' || !Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 2_147_483_647
    || typeof currency !== 'string' || !/^[a-z]{3}$/.test(currency)
    || (paymentIntent != null && (typeof paymentIntent !== 'string' || !/^pi_[A-Za-z0-9_]+$/.test(paymentIntent)))
    || (userId != null && (typeof userId !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(userId)))
    || (object.client_reference_id && object.metadata?.user_id && object.client_reference_id !== object.metadata.user_id)) {
    return null
  }
  let status: 'pending' | 'paid' | 'failed'
  if (event.type === 'checkout.session.async_payment_failed' && object.payment_status === 'unpaid') status = 'failed'
  else if (event.type !== 'checkout.session.async_payment_failed' && object.payment_status === 'paid') status = 'paid'
  else if (event.type === 'checkout.session.completed' && object.payment_status === 'unpaid') status = 'pending'
  else return null
  return {
    p_amount_cents: amountCents,
    p_currency: currency,
    p_status: status,
    p_checkout_session_id: sessionId,
    p_payment_intent_id: paymentIntent ?? null,
    p_user_id: userId ?? null,
  }
}

async function recordDonation(row: Record<string, unknown>, config: { serviceKey: string; supabaseUrl: string }, runtimeFetch: RuntimeFetch): Promise<boolean> {
  try {
    const response = await runtimeFetch(`${config.supabaseUrl}/rest/v1/rpc/record_donation_payment`, {
      body: JSON.stringify(row),
      headers: {
        Authorization: `Bearer ${config.serviceKey}`,
        'Content-Type': 'application/json',
        apikey: config.serviceKey,
      },
      method: 'POST',
    })

    return response.ok
  } catch {
    return false
  }
}

export function createStripeWebhookHandler(options: { env: RuntimeEnv; fetch?: RuntimeFetch }) {
  const runtimeFetch = options.fetch ?? fetch

  return async function handleStripeWebhookRequest(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (request.method !== 'POST') {
      return jsonResponse(405, errorBody('InvalidRequestError', 'Only POST is supported.'))
    }

    const get = (name: string) => options.env.get(name)?.trim() ?? ''
    const webhookSecret = get('STRIPE_WEBHOOK_SECRET')
    const serviceKey = get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = get('SUPABASE_URL')

    if (!webhookSecret || !serviceKey || !supabaseUrl) {
      return jsonResponse(503, errorBody('BILLING_DISABLED', 'Billing is not configured for this deployment.'))
    }

    const rawBody = await request.text()
    const signatureHeader = request.headers.get('stripe-signature')

    if (!(await verifyStripeSignature(rawBody, signatureHeader, webhookSecret))) {
      return jsonResponse(400, errorBody('SignatureError', 'Stripe signature verification failed.'))
    }

    let event: StripeWebhookEvent

    try {
      event = JSON.parse(rawBody) as StripeWebhookEvent
    } catch {
      return jsonResponse(400, errorBody('InvalidRequestError', 'Request body must be valid JSON.'))
    }

    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      return jsonResponse(400, errorBody('InvalidRequestError', 'Request body must be an event object.'))
    }

    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed'].includes(event.type ?? '')) {
      return jsonResponse(200, { received: true, ignored: event.type ?? null })
    }
    if (event.data?.object?.mode && event.data.object.mode !== 'payment') {
      return jsonResponse(200, { received: true, ignored: event.type })
    }

    const row = mapDonationRow(event)

    if (!row) {
      return jsonResponse(400, errorBody('UnhandledEventError', 'Checkout session has invalid donation payment facts.'))
    }

    const persisted = await recordDonation(row, { serviceKey, supabaseUrl }, runtimeFetch)

    if (!persisted) {
      return jsonResponse(502, errorBody('ConfigurationError', 'Could not persist the donation payment.'))
    }

    return jsonResponse(200, { received: true })
  }
}

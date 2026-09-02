/**
 * [INPUT]: 依赖 Web Crypto 的 HMAC-SHA256、Stripe webhook 事件结构、注入的 runtime fetch 与 Supabase REST 写路径。
 * [OUTPUT]: 对外提供 createStripeWebhookHandler、RuntimeEnv、verifyStripeSignature 与 StripeWebhookEvent 类型。
 * [POS]: supabase/functions/stripe-webhook 的可测试核心，验证签名后把 customer.subscription 事件落到 subscriptions 表（按 user_id upsert 幂等）；无服务端密钥时 fail-closed 返回 BILLING_DISABLED。
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
  const amountCents = object?.amount_total ?? Number(object?.metadata?.amount_cents)

  if (!sessionId || !Number.isInteger(amountCents) || amountCents <= 0) {
    return null
  }

  return {
    amount_cents: amountCents,
    currency: object?.currency ?? 'usd',
    status: object?.payment_status === 'paid' || object?.status === 'complete' ? 'paid' : 'pending',
    stripe_checkout_session_id: sessionId,
    stripe_payment_intent_id: object?.payment_intent ?? null,
    user_id: userId ?? null,
  }
}

async function upsertDonation(row: Record<string, unknown>, config: { serviceKey: string; supabaseUrl: string }, runtimeFetch: RuntimeFetch): Promise<boolean> {
  try {
    const response = await runtimeFetch(`${config.supabaseUrl}/rest/v1/donations?on_conflict=stripe_checkout_session_id`, {
      body: JSON.stringify(row),
      headers: {
        Authorization: `Bearer ${config.serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
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

    if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
      return jsonResponse(200, { received: true, ignored: event.type ?? null })
    }

    const row = mapDonationRow(event)

    if (!row) {
      return jsonResponse(400, errorBody('UnhandledEventError', 'Checkout session is missing an amount or session id.'))
    }

    const persisted = await upsertDonation(row, { serviceKey, supabaseUrl }, runtimeFetch)

    if (!persisted) {
      return jsonResponse(502, errorBody('ConfigurationError', 'Could not persist the subscription change.'))
    }

    return jsonResponse(200, { received: true })
  }
}

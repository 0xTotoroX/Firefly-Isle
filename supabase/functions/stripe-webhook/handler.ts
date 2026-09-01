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
      current_period_end?: number | null
      customer?: string | null
      id?: string
      metadata?: { user_id?: string } | null
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

const SUPPORTED_STATUSES = new Set(['active', 'trialing', 'past_due', 'canceled', 'incomplete'])

function mapSubscriptionRow(event: StripeWebhookEvent): Record<string, unknown> | null {
  const object = event.data?.object
  const userId = object?.metadata?.user_id
  const subscriptionId = object?.id
  const status = object?.status

  if (!userId || !subscriptionId || !status || !SUPPORTED_STATUSES.has(status)) {
    return null
  }

  const periodEnd = object?.current_period_end

  return {
    current_period_end: typeof periodEnd === 'number' ? new Date(periodEnd * 1000).toISOString() : null,
    plan_id: 'pro',
    status,
    stripe_customer_id: object?.customer ?? null,
    stripe_subscription_id: subscriptionId,
    user_id: userId,
  }
}

async function upsertSubscription(row: Record<string, unknown>, config: { serviceKey: string; supabaseUrl: string }, runtimeFetch: RuntimeFetch): Promise<boolean> {
  try {
    const response = await runtimeFetch(`${config.supabaseUrl}/rest/v1/subscriptions?on_conflict=user_id`, {
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

    if (event.type !== 'customer.subscription.created' && event.type !== 'customer.subscription.updated' && event.type !== 'customer.subscription.deleted') {
      return jsonResponse(200, { received: true, ignored: event.type ?? null })
    }

    const row = mapSubscriptionRow(event)

    if (!row) {
      return jsonResponse(400, errorBody('UnhandledEventError', 'Subscription event is missing a user id, subscription id or supported status.'))
    }

    const persisted = await upsertSubscription(row, { serviceKey, supabaseUrl }, runtimeFetch)

    if (!persisted) {
      return jsonResponse(502, errorBody('ConfigurationError', 'Could not persist the subscription change.'))
    }

    return jsonResponse(200, { received: true })
  }
}

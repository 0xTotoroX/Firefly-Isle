/**
 * [INPUT]: 依赖 Fetch API、注入的 runtime fetch、Supabase JWT 校验结构与 Stripe REST API。
 * [OUTPUT]: 对外提供 createBillingCheckoutHandler、RuntimeEnv 与 billing-checkout HTTP 协议。
 * [POS]: supabase/functions/billing-checkout 的可测试核心，为登录用户创建一次性捐赠 Checkout；无 STRIPE_SECRET_KEY 或成功/取消地址时返回 BILLING_DISABLED。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

export type RuntimeEnv = {
  get(name: string): string | undefined
}

type RuntimeFetch = (input: string | URL, init?: RequestInit) => Promise<Response>

type SupabaseAuthUser = {
  id?: string
  email?: string | null
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

export type ErrorCode = 'AuthError' | 'BILLING_DISABLED' | 'ConfigurationError' | 'StripeError'

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization')

  return authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null
}

async function verifyUser(token: string, config: { supabaseAnonKey: string; supabaseUrl: string }, runtimeFetch: RuntimeFetch): Promise<{ email: string | null; id: string } | null> {
  try {
    const response = await runtimeFetch(`${config.supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const user = (await response.json()) as SupabaseAuthUser

    return typeof user?.id === 'string' && user.id.trim().length > 0 ? { email: user.email ?? null, id: user.id } : null
  } catch {
    return null
  }
}

export function createBillingCheckoutHandler(options: { env: RuntimeEnv; fetch?: RuntimeFetch }) {
  const runtimeFetch = options.fetch ?? fetch

  return async function handleBillingCheckoutRequest(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (request.method !== 'POST') {
      return jsonResponse(405, errorBody('AuthError', 'Only POST is supported.'))
    }

    const get = (name: string) => options.env.get(name)?.trim() ?? ''
    const stripeSecretKey = get('STRIPE_SECRET_KEY')
    const supabaseAnonKey = get('SUPABASE_ANON_KEY')
    const supabaseUrl = get('SUPABASE_URL')
    const successUrl = get('STRIPE_CHECKOUT_SUCCESS_URL')
    const cancelUrl = get('STRIPE_CHECKOUT_CANCEL_URL')

    if (!stripeSecretKey || !successUrl || !cancelUrl) {
      return jsonResponse(503, errorBody('BILLING_DISABLED', 'Billing is not configured for this deployment.'))
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse(500, errorBody('ConfigurationError', 'Missing Supabase environment variables.'))
    }

    const token = extractBearerToken(request)

    if (!token) {
      return jsonResponse(401, errorBody('AuthError', 'Missing Supabase bearer token.'))
    }

    const user = await verifyUser(token, { supabaseAnonKey, supabaseUrl }, runtimeFetch)

    if (!user) {
      return jsonResponse(401, errorBody('AuthError', 'Invalid Supabase session.'))
    }

    let amountCents = 1500

    try {
      const payload = (await request.json()) as { amountCents?: number }
      const requested = Number(payload.amountCents)

      if (Number.isInteger(requested) && requested >= 100 && requested <= 100_000) {
        amountCents = requested
      }
    } catch {
      amountCents = 1500
    }

    const body = new URLSearchParams({
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': 'MyOncode donation',
      'line_items[0][price_data][unit_amount]': String(amountCents),
      'line_items[0][quantity]': '1',
      mode: 'payment',
      submit_type: 'donate',
      client_reference_id: user.id,
      'metadata[user_id]': user.id,
      'metadata[amount_cents]': String(amountCents),
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    if (user.email) {
      body.set('customer_email', user.email)
    }

    try {
      const response = await runtimeFetch('https://api.stripe.com/v1/checkout/sessions', {
        body: body.toString(),
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      })

      if (!response.ok) {
        return jsonResponse(502, errorBody('StripeError', 'Stripe checkout session could not be created.'))
      }

      const payload = (await response.json()) as { id?: string; url?: string }

      if (!payload.url) {
        return jsonResponse(502, errorBody('StripeError', 'Stripe checkout session returned no redirect url.'))
      }

      return jsonResponse(200, { checkoutUrl: payload.url, sessionId: payload.id ?? null })
    } catch {
      return jsonResponse(502, errorBody('StripeError', 'Stripe checkout request failed.'))
    }
  }
}

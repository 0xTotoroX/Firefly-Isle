/**
 * [INPUT]: Supabase Auth 的 code exchange/session 方法与回调 URL。
 * [OUTPUT]: 统一 query/fragment 错误、一次性 code 兑换与显式终态；重置密码可要求本次 code 产生会话。
 * [POS]: 两个公共认证回调的共享动作层；SDK 在这些路由关闭自动 URL 兑换，避免重复消费 code。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { copy, getCopy } from '@/lib/copy'
import type { Locale } from '@/lib/locale'
import type { RecoverySession } from '@/lib/password-recovery'

export type CallbackSession = RecoverySession & { user: { id: string; email?: string; is_anonymous?: boolean } }
export type AuthCallbackClient = {
  exchangeCodeForSession: (code: string) => Promise<{ data: { session: CallbackSession | null }; error: unknown | null }>
  getSession: () => Promise<{ data: { session: CallbackSession | null }; error: unknown | null }>
}
export type AuthCallbackResult =
  | { status: 'authenticated'; session: CallbackSession }
  | { status: 'anonymous' }
  | { message: string; status: 'error' }

const exchanges = new WeakMap<AuthCallbackClient, Map<string, ReturnType<AuthCallbackClient['exchangeCodeForSession']>>>()

function getCallbackHref() {
  return typeof window === 'undefined' ? undefined : window.location.href
}

function callbackParams(href = getCallbackHref()) {
  try {
    const url = new URL(href ?? '', 'https://firefly.local')
    return { query: url.searchParams, fragment: new URLSearchParams(url.hash.slice(1)) }
  } catch {
    return { query: new URLSearchParams(), fragment: new URLSearchParams() }
  }
}

export function getOAuthCallbackErrorMessage(href = getCallbackHref(), locale: Locale = 'zh') {
  const { query, fragment } = callbackParams(href)
  for (const params of [query, fragment]) {
    const description = params.get('error_description') ?? ''
    if (params.get('error_code') === 'bad_oauth_state' || description.includes('OAuth state has expired')) {
      return locale === 'zh' ? 'Google 登录请求已过期，请重新使用 Google 继续。' : 'The Google sign-in request expired. Try Google again.'
    }
    if (['error', 'error_code', 'error_description'].some((key) => params.has(key))) {
      return getCopy(copy.authFeedback.callbackInvalid, locale)
    }
  }
  return null
}

function exchangeOnce(auth: AuthCallbackClient, code: string) {
  let requests = exchanges.get(auth)
  if (!requests) {
    requests = new Map()
    exchanges.set(auth, requests)
  }
  let request = requests.get(code)
  if (!request) {
    request = Promise.resolve().then(() => auth.exchangeCodeForSession(code))
    requests.set(code, request)
  }
  return request
}

export async function restoreAuthCallbackSession(
  auth: AuthCallbackClient,
  href = getCallbackHref(),
  options: { requireCode?: boolean; locale?: Locale } = {},
): Promise<AuthCallbackResult> {
  const locale = options.locale ?? 'zh'
  const invalid = getCopy(options.requireCode ? copy.authFeedback.resetLinkInvalid : copy.authFeedback.callbackInvalid, locale)
  const callbackError = getOAuthCallbackErrorMessage(href, locale)
  if (callbackError) return { message: options.requireCode ? invalid : callbackError, status: 'error' }
  const code = callbackParams(href).query.get('code')
  if (options.requireCode && !code) return { message: invalid, status: 'error' }

  try {
    // Never consult a retained session after a failed exchange.
    const { data, error } = code ? await exchangeOnce(auth, code) : await auth.getSession()
    if (error) return { message: code ? invalid : getCopy(copy.authFeedback.restoreFailed, locale), status: 'error' }
    if (options.requireCode && (!data.session?.user.email || data.session.user.is_anonymous || !data.session.access_token || !data.session.refresh_token)) return { message: invalid, status: 'error' }
    return data.session ? { status: 'authenticated', session: data.session } : code ? { message: invalid, status: 'error' } : { status: 'anonymous' }
  } catch {
    return { message: getCopy(copy.authFeedback.callbackUnavailable, locale), status: 'error' }
  }
}

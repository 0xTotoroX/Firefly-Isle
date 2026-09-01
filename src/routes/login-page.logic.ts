/**
 * [INPUT]: 依赖 @/components/login-page-view 的 AuthMode/AuthFeedback 类型，依赖 Supabase Auth 方法的结构化子集。
 * [OUTPUT]: 对外提供 submitEmailAuth、startAnonymousAuth、startGoogleAuth、getAuthRedirectTo 与 LoginAuthClient 类型。
 * [POS]: routes 的登录页动作层，隔离 Supabase Auth 调用、反馈文案、无邮箱确认注册会话要求与 Google OAuth 参数，让 login-page.tsx 只负责状态接线。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { AuthFeedback, AuthMode } from '@/components/login-page-view'
import { copy, getCopy } from '@/lib/copy'
import { getOnlineRequiredMessage, isBrowserOffline } from '@/lib/network-status'
import type { Locale } from '@/lib/locale'

export type LoginAuthClient = {
  resetPasswordForEmail: (email: string, options?: { redirectTo?: string }) => Promise<{ error: unknown | null }>
  signInAnonymously: () => Promise<{ error: unknown | null }>
  signInWithOAuth: (input: {
    provider: 'google'
    options?: { queryParams?: { prompt?: 'select_account' }; redirectTo?: string }
  }) => Promise<{ error: unknown | null }>
  signInWithPassword: (input: { email: string; password: string }) => Promise<{ error: unknown | null }>
  signUp: (input: { email: string; password: string }) => Promise<{ data: { session: unknown | null } | null; error: unknown | null }>
}

export type AuthActionResult = {
  clearPassword?: boolean
  feedback: AuthFeedback
  nextMode?: AuthMode
}

type SubmitEmailAuthInput = {
  auth: LoginAuthClient
  email: string
  locale?: Locale
  mode: AuthMode
  password: string
  passwordResetRedirectTo?: string
}

export function getAuthRedirectTo(path: '/app' | '/auth/callback' | '/login' = '/app') {
  if (typeof window === 'undefined') {
    return undefined
  }

  return `${window.location.origin}${path}`
}

function withRedirect(redirectTo?: string) {
  return redirectTo ? { redirectTo } : undefined
}

function withGoogleAccountSelection(redirectTo?: string) {
  return {
    ...withRedirect(redirectTo),
    queryParams: { prompt: 'select_account' as const },
  }
}

export async function submitEmailAuth({
  auth,
  email,
  locale = 'zh',
  mode,
  password,
  passwordResetRedirectTo,
}: SubmitEmailAuthInput): Promise<AuthActionResult> {
  if (isBrowserOffline()) {
    return {
      feedback: { message: getOnlineRequiredMessage(locale), tone: 'error' },
    }
  }

  if (mode === 'password-reset') {
    const { error } = await auth.resetPasswordForEmail(email, withRedirect(passwordResetRedirectTo))

    if (error) {
      return {
        feedback: { message: getCopy(copy.authFeedback.resetFailed, locale), tone: 'error' },
      }
    }

    return {
      feedback: { message: getCopy(copy.authFeedback.resetSent, locale), tone: 'success' },
      nextMode: 'login',
    }
  }

  if (mode === 'login') {
    const { error } = await auth.signInWithPassword({ email, password })

    if (error) {
      return {
        feedback: { message: getCopy(copy.authFeedback.invalidCredentials, locale), tone: 'error' },
      }
    }

    return {
      feedback: { message: getCopy(copy.authFeedback.signingIn, locale), tone: 'neutral' },
    }
  }

  const { data, error } = await auth.signUp({ email, password })

  if (error) {
    return {
      feedback: { message: getCopy(copy.authFeedback.signUpFailed, locale), tone: 'error' },
    }
  }

  if (data?.session) {
    return {
      clearPassword: true,
      feedback: { message: getCopy(copy.authFeedback.signUpSuccess, locale), tone: 'neutral' },
    }
  }

  return {
    feedback: { message: getCopy(copy.authFeedback.signUpNoSession, locale), tone: 'error' },
  }
}

export async function startAnonymousAuth(auth: LoginAuthClient, locale: Locale = 'zh'): Promise<AuthActionResult> {
  if (isBrowserOffline()) {
    return {
      feedback: { message: getOnlineRequiredMessage(locale), tone: 'error' },
    }
  }

  const { error } = await auth.signInAnonymously()

  if (error) {
    return {
      feedback: { message: getCopy(copy.authFeedback.anonymousFailed, locale), tone: 'error' },
    }
  }

  return {
    feedback: { message: getCopy(copy.authFeedback.anonymousReady, locale), tone: 'neutral' },
  }
}

export async function startGoogleAuth(auth: LoginAuthClient, redirectTo?: string, locale: Locale = 'zh'): Promise<AuthActionResult> {
  if (isBrowserOffline()) {
    return {
      feedback: { message: getOnlineRequiredMessage(locale), tone: 'error' },
    }
  }

  const { error } = await auth.signInWithOAuth({
    options: withGoogleAccountSelection(redirectTo),
    provider: 'google',
  })

  if (error) {
    return {
      feedback: { message: getCopy(copy.authFeedback.googleFailed, locale), tone: 'error' },
    }
  }

  return {
    feedback: { message: getCopy(copy.authFeedback.googlePending, locale), tone: 'neutral' },
  }
}

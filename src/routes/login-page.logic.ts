/**
 * [INPUT]: 依赖 @/components/login-page-view 的 AuthMode/AuthFeedback 类型，依赖 Supabase Auth 方法的结构化子集。
 * [OUTPUT]: 对外提供 submitEmailAuth、startAnonymousAuth、startGoogleAuth、getAuthRedirectTo 与 LoginAuthClient 类型。
 * [POS]: routes 的登录页动作层，区分本次认证成功、邮箱确认等待与 OAuth 跳转，供容器安全决定导航。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
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
  signUp: (input: { email: string; password: string; options?: { emailRedirectTo?: string } }) => Promise<{ data: { session: unknown | null; user?: unknown | null } | null; error: unknown | null }>
}

export type AuthActionResult = {
  authenticated?: true
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
  signUpRedirectTo?: string
}

export function getAuthRedirectTo(path: '/app' | '/auth/callback' | '/auth/reset-password' | '/login' = '/app') {
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
  signUpRedirectTo,
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
      authenticated: true,
      feedback: { message: getCopy(copy.authFeedback.signingIn, locale), tone: 'neutral' },
    }
  }

  const { data, error } = await auth.signUp({ email, password, ...(signUpRedirectTo ? { options: { emailRedirectTo: signUpRedirectTo } } : {}) })

  if (error) {
    return {
      feedback: { message: getCopy(copy.authFeedback.signUpFailed, locale), tone: 'error' },
    }
  }

  if (data?.session) {
    return {
      authenticated: true,
      clearPassword: true,
      feedback: { message: getCopy(copy.authFeedback.signUpSuccess, locale), tone: 'neutral' },
    }
  }

  return data?.user ? {
    clearPassword: true,
    feedback: { message: getCopy(copy.authFeedback.signUpPending, locale), tone: 'success' },
    nextMode: 'login',
  } : {
    feedback: { message: getCopy(copy.authFeedback.signUpFailed, locale), tone: 'error' },
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
    authenticated: true,
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

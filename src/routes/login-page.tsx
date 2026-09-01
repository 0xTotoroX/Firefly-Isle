/**
 * [INPUT]: 依赖 react 的表单状态 hooks，依赖 @/components/login-page-view 的展示层，依赖 ./login-page.logic 的认证动作，依赖 @/lib/theme、@/lib/locale、copy 字典与 @/lib/supabase 的认证边界。
 * [OUTPUT]: 对外提供 LoginPage 组件，对应 /login。
 * [POS]: routes 的登录页容器，管理邮箱登录、注册、重置密码、手机/微信占位、Google OAuth、匿名进入与主题切换，不承载大段设计复刻 markup。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { type FormEvent, useState } from 'react'

import {
  type AuthMethod,
  type AuthFeedback,
  type AuthMode,
  LoginPageView,
} from '@/components/login-page-view'
import { copy, getCopy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import { getSupabaseClient, hasSupabaseEnv } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'

import {
  type LoginAuthClient,
  getAuthRedirectTo,
  startAnonymousAuth,
  startGoogleAuth,
  submitEmailAuth,
  type AuthActionResult,
} from './login-page.logic'

function missingEnvFeedback(mode: AuthMode, locale: 'zh' | 'en'): AuthFeedback {
  if (mode === 'password-reset') {
    return { tone: 'error', message: getCopy(copy.authFeedback.missingEnv, locale) }
  }

  return { tone: 'error', message: getCopy(copy.authFeedback.missingEnv, locale) }
}

function unexpectedFeedback(mode: AuthMode, locale: 'zh' | 'en'): AuthFeedback {
  if (mode === 'password-reset') {
    return { tone: 'error', message: getCopy(copy.authFeedback.resetFailed, locale) }
  }

  return { tone: 'error', message: getCopy(copy.authFeedback.serviceUnavailable, locale) }
}

export function LoginPage({ authError = null }: { authError?: string | null }) {
  const { theme, toggleTheme } = useTheme()
  const { locale } = useLocale()
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email')
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getAuthClient = (): LoginAuthClient => getSupabaseClient().auth as unknown as LoginAuthClient

  const applyAuthResult = (result: AuthActionResult) => {
    if (result.clearPassword) {
      setPassword('')
    }

    if (result.nextMode) {
      setMode(result.nextMode)
    }

    setFeedback(result.feedback)
  }

  const handleAuthMethodChange = (nextMethod: AuthMethod) => {
    if (nextMethod === 'phone' && mode === 'password-reset') {
      setMode('login')
    }

    setAuthMethod(nextMethod)
    setFeedback(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!hasSupabaseEnv) {
      setFeedback(missingEnvFeedback(mode, locale))
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      applyAuthResult(
        await submitEmailAuth({
          auth: getAuthClient(),
          email,
          locale,
          mode,
          password,
          passwordResetRedirectTo: getAuthRedirectTo('/login'),
        }),
      )
    } catch {
      setFeedback(unexpectedFeedback(mode, locale))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAnonymousLogin = async () => {
    if (!hasSupabaseEnv) {
      setFeedback({ tone: 'error', message: getCopy(copy.authFeedback.missingEnvAnonymous, locale) })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      applyAuthResult(await startAnonymousAuth(getAuthClient(), locale))
    } catch {
      setFeedback({ tone: 'error', message: getCopy(copy.authFeedback.anonymousFailed, locale) })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (!hasSupabaseEnv) {
      setFeedback({ tone: 'error', message: getCopy(copy.authFeedback.missingEnvGoogle, locale) })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      applyAuthResult(await startGoogleAuth(getAuthClient(), getAuthRedirectTo('/auth/callback'), locale))
    } catch {
      setFeedback({ tone: 'error', message: getCopy(copy.authFeedback.googleFailed, locale) })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <LoginPageView
      authMethod={authMethod}
      authError={authError}
      email={email}
      feedback={feedback}
      isSubmitting={isSubmitting}
      mode={mode}
      onAnonymousLogin={handleAnonymousLogin}
      onAuthMethodChange={handleAuthMethodChange}
      onEmailChange={setEmail}
      onGoogleLogin={handleGoogleLogin}
      onModeChange={setMode}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
      onToggleTheme={toggleTheme}
      password={password}
      theme={theme}
    />
  )
}

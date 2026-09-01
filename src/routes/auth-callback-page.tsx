/**
 * [INPUT]: 依赖 react-router-dom 的 Navigate，依赖 @/lib/auth 的 session 真相源，依赖 @/lib/supabase 的 Auth client，依赖 async-resource 的共享加载基元，依赖 ./auth-callback-page.logic 的回调恢复动作，依赖 ./login-page 的失败回落入口。
 * [OUTPUT]: 对外提供 AuthCallbackPage 组件，对应 /auth/callback。
 * [POS]: routes 的公共 OAuth 回调页，先恢复 Supabase session，再让路由守卫把已认证用户送入 /app。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Navigate } from 'react-router-dom'

import { useAsyncResource } from '@/lib/async-resource'
import { useAuth } from '@/lib/auth'
import { copy, getCopy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import { getSupabaseClient, hasSupabaseEnv } from '@/lib/supabase'

import { restoreAuthCallbackSession, type AuthCallbackResult } from './auth-callback-page.logic'
import { LoginPage } from './login-page'

function AuthCallbackStatus() {
  const { locale } = useLocale()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--ff-surface-base)] px-6 text-[var(--ff-text-primary)]">
      <div className="border border-[var(--ff-border-default)] bg-[var(--ff-surface-panel)] px-8 py-6 text-center">
        <div className="font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.4em] text-[var(--ff-accent-primary)]">
          Auth callback
        </div>
        <div className="mt-3 font-[var(--ff-font-display)] text-2xl font-black tracking-tight">
          {getCopy(copy.authFeedback.callbackRestoring, locale)}
        </div>
      </div>
    </div>
  )
}

export function AuthCallbackPage() {
  const { isAuthenticated } = useAuth()
  const { locale } = useLocale()
  const resource = useAsyncResource(
    () =>
      isAuthenticated || !hasSupabaseEnv
        ? Promise.resolve<AuthCallbackResult | null>(null)
        : restoreAuthCallbackSession(getSupabaseClient().auth),
    [isAuthenticated],
  )

  if (isAuthenticated) {
    return <Navigate replace to="/app" />
  }

  if (!hasSupabaseEnv) {
    return <LoginPage authError={getCopy(copy.authFeedback.callbackMissingEnv, locale)} />
  }

  if (resource.error) {
    return <LoginPage authError={getCopy(copy.authFeedback.callbackUnavailable, locale)} />
  }

  if (resource.data?.status === 'anonymous') {
    return <Navigate replace to="/login" />
  }

  return <AuthCallbackStatus />
}

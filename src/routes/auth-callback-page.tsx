/**
 * [INPUT]: 依赖 react-router-dom 的 Navigate 与当前 URL，依赖 @/lib/supabase 的 Auth client，依赖 async-resource 的共享加载基元，依赖 ./auth-callback-page.logic 的回调恢复动作，依赖 ./login-page 的失败回落入口。
 * [OUTPUT]: 对外提供 AuthCallbackPage 组件，对应 /auth/callback。
 * [POS]: routes 的公共 OAuth 回调页，优先显示回调错误，成功后进入 /dashboard，无会话回到 /login。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { Navigate, useLocation } from 'react-router-dom'

import { useAsyncResource } from '@/lib/async-resource'
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
        <div className="mt-3 font-[var(--ff-font-display)] text-2xl font-black tracking-tight">
          {getCopy(copy.authFeedback.callbackRestoring, locale)}
        </div>
      </div>
    </div>
  )
}

export function AuthCallbackPage() {
  const location = useLocation()
  const { locale } = useLocale()
  const href = `${location.pathname}${location.search}${location.hash}`
  const resource = useAsyncResource(
    () => !hasSupabaseEnv ? Promise.resolve<AuthCallbackResult | null>(null) : restoreAuthCallbackSession(getSupabaseClient().auth, href, { locale }),
    [href, locale],
  )

  if (!hasSupabaseEnv) {
    return <LoginPage authError={getCopy(copy.authFeedback.callbackMissingEnv, locale)} />
  }

  if (resource.error) {
    return <LoginPage authError={getCopy(copy.authFeedback.callbackUnavailable, locale)} />
  }

  if (resource.data?.status === 'error') return <LoginPage authError={resource.data.message} />
  if (resource.data?.status === 'authenticated') return <Navigate replace to="/dashboard" />

  if (resource.data?.status === 'anonymous') {
    return <Navigate replace to="/login" />
  }

  return <AuthCallbackStatus />
}

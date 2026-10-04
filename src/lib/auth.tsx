/**
 * [INPUT]: 依赖 react 的 Context、hooks，依赖 @supabase/supabase-js 的 Session/User，依赖 @/lib/supabase 的客户端入口、@/lib/locale 的界面语言与 copy 字典的认证反馈文案。
 * [OUTPUT]: 对外提供 AuthProvider、useAuth 与允许独立 Demo 空身份的 useOptionalAuth；在路由就绪前完成 URL callback、会话恢复及自建后端旧 JWT 换取。
 * [POS]: 认证状态中心；缺配置就绪状态由初始化决定，effect 仅恢复和订阅真实会话。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { copy, getCopy } from '@/lib/copy'
import { useLocale } from '@/lib/locale'
import {
  completeSupabaseSessionMigration,
  getSupabaseClient,
  hasPendingSupabaseSessionMigration,
  hasSupabaseEnv,
  needsSupabaseSessionRefresh,
} from '@/lib/supabase'

type AuthContextValue = {
  authError: string | null
  isAuthenticated: boolean
  isAuthReady: boolean
  isSigningOut: boolean
  session: Session | null
  signOut: () => Promise<boolean>
  user: User | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const { locale } = useLocale()
  const [session, setSession] = useState<Session | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthReady, setIsAuthReady] = useState(!hasSupabaseEnv)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    if (!hasSupabaseEnv) {
      return
    }

    const supabase = getSupabaseClient()
    let active = true
    let initializing = true

    void supabase.auth
      .initialize()
      .then(async ({ error: initializeError }) => {
        let { data, error } = await supabase.auth.getSession()
        if (data.session && needsSupabaseSessionRefresh(data.session.access_token)) {
          const refreshed = await supabase.auth.refreshSession()
          data = refreshed.data
          error = refreshed.error
        }

        if (!active) {
          return
        }

        const migrationFailed = data.session
          ? needsSupabaseSessionRefresh(data.session.access_token)
          : hasPendingSupabaseSessionMigration
        if (error || migrationFailed) {
          setAuthError(getCopy(copy.authFeedback.restoreFailed, locale))
          setSession(null)
        } else {
          if (data.session) completeSupabaseSessionMigration(data.session.access_token)
          setSession(data.session ?? null)
          setAuthError(initializeError ? getCopy(copy.authFeedback.callbackInvalid, locale) : null)
        }

        initializing = false
        setIsAuthReady(true)
      })
      .catch(() => {
        initializing = false
        if (!active) {
          return
        }

        setAuthError(getCopy(copy.authFeedback.restoreFailed, locale))
        setSession(null)
        setIsAuthReady(true)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active || initializing) {
        return
      }

      if (nextSession && needsSupabaseSessionRefresh(nextSession.access_token)) {
        setSession(null)
        setAuthError(getCopy(copy.authFeedback.restoreFailed, locale))
        return
      }
      if (nextSession) completeSupabaseSessionMigration(nextSession.access_token)
      setSession(nextSession ?? null)
      setAuthError(null)
      setIsAuthReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
    // locale 只参与错误文案构造，不应触发 session 重新恢复。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = useCallback(async () => {
    if (!hasSupabaseEnv) {
      setAuthError(getCopy(copy.authFeedback.missingEnv, locale))
      return false
    }

    setIsSigningOut(true)

    try {
      const { error } = await getSupabaseClient().auth.signOut()

      if (error) {
        setAuthError(getCopy(copy.authFeedback.signOutFailed, locale))
        return false
      }

      setSession(null)
      setAuthError(null)
      return true
    } finally {
      setIsSigningOut(false)
    }
    // locale 只参与错误文案构造，不应重建 signOut 回调。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      authError: hasSupabaseEnv ? authError : getCopy(copy.authFeedback.missingEnv, locale),
      isAuthenticated: session !== null,
      isAuthReady,
      isSigningOut,
      session,
      signOut,
      user: session?.user ?? null,
    }),
    [authError, isAuthReady, isSigningOut, locale, session, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}

export function useOptionalAuth() { return useContext(AuthContext) }

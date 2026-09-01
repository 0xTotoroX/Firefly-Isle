/**
 * [INPUT]: 依赖 react 的 Context、hooks，依赖 @supabase/supabase-js 的 Session/User，依赖 @/lib/supabase 的客户端入口、@/lib/locale 的界面语言与 copy 字典的认证反馈文案。
 * [OUTPUT]: 对外提供 AuthProvider 与 useAuth，并在路由就绪前完成 Supabase URL callback/session 初始化。
 * [POS]: lib 的认证状态中心，统一管理 session 恢复、认证状态广播与登出动作。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
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
import { getSupabaseClient, hasSupabaseEnv } from '@/lib/supabase'

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
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setAuthError(getCopy(copy.authFeedback.missingEnv, locale))
      setIsAuthReady(true)
      return
    }

    const supabase = getSupabaseClient()
    let active = true

    void supabase.auth
      .initialize()
      .then(async ({ error: initializeError }) => {
        const { data, error } = await supabase.auth.getSession()

        if (!active) {
          return
        }

        if (error) {
          setAuthError(getCopy(copy.authFeedback.restoreFailed, locale))
          setSession(null)
        } else {
          setSession(data.session ?? null)
          setAuthError(initializeError ? getCopy(copy.authFeedback.callbackInvalid, locale) : null)
        }

        setIsAuthReady(true)
      })
      .catch(() => {
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
      if (!active) {
        return
      }

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
      authError,
      isAuthenticated: session !== null,
      isAuthReady,
      isSigningOut,
      session,
      signOut,
      user: session?.user ?? null,
    }),
    [authError, isAuthReady, isSigningOut, session, signOut],
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

/**
 * [INPUT]: 依赖 @supabase/supabase-js 的 createClient，依赖 Vite 注入的 Supabase 环境变量。
 * [OUTPUT]: Supabase 客户端、独立会话存储、环境边界和可选旧会话迁移状态；Auth 使用 PKCE URL 回调恢复。
 * [POS]: lib 的 BaaS 边界入口，把客户端初始化与环境变量读取锁在一处。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  completeLegacySupabaseSessionMigration,
  copyLegacySupabaseSession,
  isLegacySupabaseSession,
  isSelfHostedSupabaseUrl,
} from './supabase-session-migration'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
const supabaseEdgeFunctionUrl = import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL?.trim() ?? ''
const authStorageKey = import.meta.env.VITE_SUPABASE_AUTH_STORAGE_KEY?.trim() ?? ''
const wechatAuthProvider = import.meta.env.VITE_SUPABASE_WECHAT_PROVIDER?.trim() ?? ''

let client: SupabaseClient | null = null
export let hasPendingSupabaseSessionMigration = false

export function needsSupabaseSessionRefresh(accessToken: string) {
  return isSelfHostedSupabaseUrl(supabaseUrl) && isLegacySupabaseSession(accessToken)
}

export function completeSupabaseSessionMigration(accessToken: string) {
  if (!isSelfHostedSupabaseUrl(supabaseUrl) || isLegacySupabaseSession(accessToken)) return
  try {
    if (typeof window !== 'undefined') completeLegacySupabaseSessionMigration(window.localStorage)
  } catch {
    // Supabase can use in-memory storage when browser persistence is unavailable.
  }
  hasPendingSupabaseSessionMigration = false
}

export const hasSupabaseEnv = supabaseUrl.length > 0 && supabaseAnonKey.length > 0
export const hasSupabaseFunctionEnv = supabaseEdgeFunctionUrl.length > 0
export const hasWechatAuthProvider = /^custom:[a-z0-9][a-z0-9_-]*$/i.test(wechatAuthProvider)

export const supabaseEnv = {
  supabaseUrl,
  supabaseAnonKey,
  supabaseEdgeFunctionUrl,
  wechatAuthProvider,
}

export { supabaseEdgeFunctionUrl }
export { wechatAuthProvider }

export function getSupabaseClient() {
  if (!hasSupabaseEnv) {
    throw new Error('Missing Supabase environment variables in .env.local')
  }

  if (!client) {
    if (typeof window !== 'undefined') {
      try {
        hasPendingSupabaseSessionMigration = !authStorageKey && copyLegacySupabaseSession(supabaseUrl, window.localStorage)
      } catch {
        // Let the SDK initialize with its own storage fallback.
      }
    }
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        // These routes explicitly exchange once and inspect errors before retained sessions.
        detectSessionInUrl: typeof window === 'undefined' || !['/auth/callback', '/auth/reset-password'].includes(window.location?.pathname ?? ''),
        flowType: 'pkce',
        persistSession: true,
        ...(authStorageKey ? { storageKey: authStorageKey } : {}),
      },
    })
  }

  return client
}

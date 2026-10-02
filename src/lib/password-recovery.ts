/**
 * [INPUT]: 恢复链接换取的凭据快照、Supabase AuthClient 与公开后端配置。
 * [OUTPUT]: updateRecoveredPassword，用隔离的内存会话更新恢复账号的密码。
 * [POS]: 改密身份边界；不读取或覆盖共享登录存储，避免其他标签切换账号后写入错误身份。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { AuthClient } from '@supabase/supabase-js'
import { supabaseEnv } from '@/lib/supabase'

export type RecoverySession = {
  access_token?: string
  refresh_token?: string
  user: { id: string }
}

export async function updateRecoveredPassword(session: RecoverySession, password: string): Promise<{ error: unknown | null }> {
  const accessToken = session.access_token
  const refreshToken = session.refresh_token
  const expectedOwnerId = session.user.id
  if (!accessToken || !refreshToken) return { error: new Error('Missing password recovery credentials.') }

  const auth = new AuthClient({
    url: `${supabaseEnv.supabaseUrl.replace(/\/$/, '')}/auth/v1`,
    headers: { apikey: supabaseEnv.supabaseAnonKey },
    storageKey: `firefly-password-recovery-${crypto.randomUUID()}`,
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  })
  try {
    const restored = await auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    if (restored.error || restored.data.session?.user.id !== expectedOwnerId) {
      return { error: restored.error ?? new Error('Password recovery identity changed.') }
    }
    return await auth.updateUser({ password })
  } finally {
    await auth.stopAutoRefresh()
  }
}

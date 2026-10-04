/**
 * [INPUT]: Browser storage and the configured Supabase URL.
 * [OUTPUT]: Preserves cloud sessions during the VPS endpoint change and detects tokens requiring refresh.
 * [POS]: One-time compatibility boundary for the original Firefly Supabase project.
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
const LEGACY_ORIGIN = 'https://irkjblpzmclqekxbexll.supabase.co'
const LEGACY_STORAGE_KEY = 'sb-irkjblpzmclqekxbexll-auth-token'
const SELF_HOSTED_ORIGIN = 'https://supabase.ghibli1024.com'
const TARGET_STORAGE_KEY = 'sb-supabase-auth-token'
const COMPLETED_STORAGE_KEY = 'firefly-supabase-migration-v1'

export function isSelfHostedSupabaseUrl(url: string) {
  return new URL(url).origin === SELF_HOSTED_ORIGIN
}

export function copyLegacySupabaseSession(url: string, storage: Pick<Storage, 'getItem' | 'setItem'>) {
  if (!isSelfHostedSupabaseUrl(url) || storage.getItem(COMPLETED_STORAGE_KEY)) return false

  const existing = storage.getItem(TARGET_STORAGE_KEY)
  if (existing) {
    try {
      return isLegacySupabaseSession(JSON.parse(existing).access_token)
    } catch {
      return false
    }
  }

  const saved = storage.getItem(LEGACY_STORAGE_KEY)
  if (!saved) return false
  storage.setItem(TARGET_STORAGE_KEY, saved)
  // Retain the source entry so a failed network request cannot destroy an anonymous identity.
  return true
}

export function completeLegacySupabaseSessionMigration(storage: Pick<Storage, 'setItem'>) {
  // Keep the source for rollback, but do not import it again after a later sign-out.
  storage.setItem(COMPLETED_STORAGE_KEY, '1')
}

export function isLegacySupabaseSession(accessToken: string) {
  try {
    const payload = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(payload)) as { iss?: string }
    return claims.iss === `${LEGACY_ORIGIN}/auth/v1`
  } catch {
    return false
  }
}

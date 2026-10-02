/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端与 hasSupabaseEnv，依赖 @/lib/locale 的 Locale 类型与 network-status 的离线判定。
 * [OUTPUT]: 对外提供 getUserProfile、saveUserProfile API 与 UserProfileView / ProfileSettingsError 类型。
 * [POS]: profiles 认证读写；导出可指定预期账号，缺少可选 profiles 表时读取降级为 null，其他错误继续传播。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { isOnlineRequiredError } from '@/lib/network-status'
import { getSupabaseClient, hasSupabaseEnv } from '@/lib/supabase'
import type { Locale } from '@/lib/locale'
import type { Theme } from '@/lib/theme'

export type UserProfileView = {
  createdAt?: string
  displayName: string | null
  locale: Locale
  theme: Theme
  updatedAt?: string
}

export class ProfileSettingsError extends Error {
  readonly requiresOnline: boolean

  constructor(message: string, options: { requiresOnline?: boolean } = {}) {
    super(message)
    this.name = 'ProfileSettingsError'
    this.requiresOnline = options.requiresOnline ?? false
  }
}

type ProfileRow = {
  created_at: string | null
  display_name: string | null
  locale: Locale
  theme: Theme
  updated_at: string | null
}

function isMissingProfilesTableError(error: { code?: string; message?: string | null }) {
  return error.code === 'PGRST205' && /profiles/i.test(error.message ?? '')
}

function mapProfileRow(row: ProfileRow): UserProfileView {
  return {
    createdAt: row.created_at ?? undefined,
    displayName: row.display_name,
    locale: row.locale,
    theme: row.theme,
    updatedAt: row.updated_at ?? undefined,
  }
}

async function requireAuthenticatedUser() {
  if (!hasSupabaseEnv) {
    throw new ProfileSettingsError('Missing Supabase environment variables.')
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new ProfileSettingsError('Missing authenticated user for profile settings.')
  }

  return { supabase, userId: data.user.id }
}

export async function getUserProfile(expectedUserId?: string): Promise<UserProfileView | null> {
  const { supabase, userId } = await requireAuthenticatedUser()
  if (expectedUserId && expectedUserId !== userId) {
    throw new ProfileSettingsError('Account changed while loading profile settings.')
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, locale, theme, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle<ProfileRow>()

  if (!error) {
    return data ? mapProfileRow(data) : null
  }

  // 先取 message，再走推断类型谓词守卫；守卫后 PostgrestError 会被收窄为 never。
  const message = error.message || 'Could not load profile settings.'

  if (isMissingProfilesTableError(error)) {
    // 007_profiles 迁移尚未应用到当前项目时，档案能力整体降级为「无档案」。
    return null
  }

  if (isOnlineRequiredError(error)) {
    throw new ProfileSettingsError('Network required for profile settings.', { requiresOnline: true })
  }

  throw new ProfileSettingsError(message)
}

export async function saveUserProfile(input: { displayName?: string | null; locale?: Locale; theme?: Theme }): Promise<UserProfileView> {
  const { supabase, userId } = await requireAuthenticatedUser()
  const patch: Partial<ProfileRow> = {}

  if (input.displayName !== undefined) {
    const trimmed = input.displayName?.trim()

    patch.display_name = trimmed ? trimmed : null
  }

  if (input.locale !== undefined) {
    patch.locale = input.locale
  }

  if (input.theme !== undefined) {
    patch.theme = input.theme
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, ...patch })
    .select('user_id, display_name, locale, theme, created_at, updated_at')
    .single<ProfileRow>()

  if (error) {
    const message = error.message || 'Could not save profile settings.'

    if (isOnlineRequiredError(error)) {
      throw new ProfileSettingsError('Network required for profile settings.', { requiresOnline: true })
    }

    throw new ProfileSettingsError(message)
  }

  return mapProfileRow(data)
}

export async function deleteOwnAccount(): Promise<void> {
  const { supabase } = await requireAuthenticatedUser()
  const { error } = await supabase.rpc('delete_own_account')

  if (error) {
    throw new ProfileSettingsError(error.message || 'Could not delete account.')
  }
}

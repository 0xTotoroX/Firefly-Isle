/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端与 hasSupabaseEnv，依赖 network-status 的离线判定与 OnlineRequiredError，依赖 @/lib/profile-settings 的档案读取与 ProfileSettingsError。
 * [OUTPUT]: 对外提供 buildAccountDataExport、downloadAccountDataExport API 与 AccountDataExport / AccountExportRow 类型。
 * [POS]: src/lib 的隐私合规数据导出客户端，聚合当前用户的全部 RLS 行为单份 JSON；SHALL NOT 导出 LLM 密钥密文与授权码 hash 等敏感材料。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { ensureBrowserOnline } from '@/lib/network-status'
import { getUserProfile, ProfileSettingsError } from '@/lib/profile-settings'
import { getSupabaseClient, hasSupabaseEnv } from '@/lib/supabase'
import type { UserProfileView } from '@/lib/profile-settings'

export type AccountExportRow = Record<string, unknown>

export type AccountDataExport = {
  account: {
    exportedAt: string
    userId: string
    email: string | null
  }
  format: 'firefly-isle.account-export'
  labReportBatches: AccountExportRow[]
  labResults: AccountExportRow[]
  llmProviderSettings: AccountExportRow[]
  patients: AccountExportRow[]
  profile: UserProfileView | null
  recordShares: AccountExportRow[]
  treatmentLines: AccountExportRow[]
  version: 1
}

async function requireUserId() {
  if (!hasSupabaseEnv) {
    throw new ProfileSettingsError('Missing Supabase environment variables.')
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new ProfileSettingsError('Missing authenticated user for data export.')
  }

  return { supabase, userId: data.user.id, email: data.user.email ?? null }
}

async function queryOwnRows(query: (patientIds: string[]) => PromiseLike<{ data: unknown; error: { message: string } | null }>, patientIds: string[]) {
  const { data, error } = await query(patientIds)

  if (error) {
    throw new ProfileSettingsError(error.message || 'Could not collect account data.')
  }

  return (data ?? []) as AccountExportRow[]
}

export async function buildAccountDataExport(): Promise<AccountDataExport> {
  ensureBrowserOnline()
  const { supabase, userId, email } = await requireUserId()

  const patients = await queryOwnRows(
    () => supabase.from('patients').select('*').eq('user_id', userId),
    [],
  )
  const patientIds = patients.map((patient) => String(patient.id))

  const [treatmentLines, labResults, labReportBatches] = await Promise.all([
    patientIds.length
      ? queryOwnRows((ids) => supabase.from('treatment_lines').select('*').in('patient_id', ids), patientIds)
      : Promise.resolve([] as AccountExportRow[]),
    patientIds.length
      ? queryOwnRows((ids) => supabase.from('lab_results').select('*').in('patient_id', ids), patientIds)
      : Promise.resolve([] as AccountExportRow[]),
    patientIds.length
      ? queryOwnRows((ids) => supabase.from('lab_report_batches').select('*').in('patient_id', ids), patientIds)
      : Promise.resolve([] as AccountExportRow[]),
  ])

  const [profile, providerSettings, recordShares] = await Promise.all([
    getUserProfile().catch(() => null),
    queryOwnRows(() => supabase.from('llm_provider_settings').select('provider, base_url, model, created_at, updated_at'), patientIds),
    queryOwnRows(() => supabase.from('record_shares').select('id, patient_id, expires_at, revoked_at, created_at'), patientIds),
  ])

  return {
    account: {
      exportedAt: new Date().toISOString(),
      userId,
      email,
    },
    format: 'firefly-isle.account-export',
    labReportBatches,
    labResults,
    llmProviderSettings: providerSettings,
    patients,
    profile,
    recordShares,
    treatmentLines,
    version: 1,
  }
}

export function buildAccountExportFileName(exportedAt = new Date()) {
  const stamp = exportedAt.toISOString().slice(0, 10)

  return `firefly-isle-export-${stamp}.json`
}

export async function downloadAccountDataExport(): Promise<string> {
  const data = await buildAccountDataExport()
  const fileName = buildAccountExportFileName(new Date(data.account.exportedAt))
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)

  return fileName
}

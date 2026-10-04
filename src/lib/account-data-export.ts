/**
 * [INPUT]: 依赖 brand 下载前缀、@/lib/supabase 的客户端与 hasSupabaseEnv，依赖 network-status 的离线判定与 OnlineRequiredError，依赖 @/lib/profile-settings 的档案读取与 ProfileSettingsError。
 * [OUTPUT]: 对外提供 buildAccountDataExport、downloadAccountDataExport API 与 AccountDataExport / AccountExportRow 类型。
 * [POS]: 按稳定 id 分页导出全部用户表；采集到下载持续绑定发起账号，排除密钥密文和分享码 hash。多次读取不代表数据库快照。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { brand } from '@/lib/brand'
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
  donations: AccountExportRow[]
  followUpVisits: AccountExportRow[]
  labReportBatches: AccountExportRow[]
  labResults: AccountExportRow[]
  llmProviderSettings: AccountExportRow[]
  patients: AccountExportRow[]
  profile: UserProfileView | null
  recordShares: AccountExportRow[]
  sideEffects: AccountExportRow[]
  subscriptions: AccountExportRow[]
  treatmentLines: AccountExportRow[]
  usageEvents: AccountExportRow[]
  version: 1
}

type PageQuery = PromiseLike<{ data: unknown; error: { message: string } | null }> & {
  gt(column: string, value: string): PageQuery
  limit(count: number): PageQuery
  order(column: string, options: { ascending: boolean }): PageQuery
}

const PAGE_SIZE = 500
const PATIENT_BATCH_SIZE = 100

async function readAllRows(makeQuery: () => PageQuery, assertIdentity: () => void) {
  const rows: AccountExportRow[] = []
  let cursor: string | undefined

  while (true) {
    assertIdentity()
    let query = makeQuery().order('id', { ascending: true }).limit(PAGE_SIZE)
    if (cursor) query = query.gt('id', cursor)
    const { data, error } = await query
    assertIdentity()
    if (error) throw new ProfileSettingsError(error.message || 'Could not collect account data.')
    if (!Array.isArray(data)) throw new ProfileSettingsError('Invalid account export response.')
    if (data.length === 0) return rows
    const nextCursor = (data[data.length - 1] as AccountExportRow).id
    if (typeof nextCursor !== 'string' || (cursor && nextCursor <= cursor)) {
      throw new ProfileSettingsError('Account export pagination did not advance.')
    }
    rows.push(...data)
    cursor = nextCursor
  }
}

async function collectAccountRows(userId: string, assertIdentity: () => void) {
  const supabase = getSupabaseClient()
  const ownedRows = (table: string, columns = '*', ownerColumn = 'user_id') =>
    readAllRows(() => supabase.from(table).select(columns).eq(ownerColumn, userId), assertIdentity)
  const patients = await ownedRows('patients')
  const patientIds = patients.map((patient) => String(patient.id))
  const patientRows = async (table: string) => {
    const rows: AccountExportRow[] = []
    for (let start = 0; start < patientIds.length; start += PATIENT_BATCH_SIZE) {
      const ids = patientIds.slice(start, start + PATIENT_BATCH_SIZE)
      rows.push(...await readAllRows(() => supabase.from(table).select('*').in('patient_id', ids), assertIdentity))
    }
    return rows
  }
  const [treatmentLines, labResults, labReportBatches, profile, providerSettings, recordShares,
    sideEffects, followUpVisits, usageEvents, subscriptions, donations] = await Promise.all([
    patientRows('treatment_lines'),
    patientRows('lab_results'),
    patientRows('lab_report_batches'),
    getUserProfile(userId),
    ownedRows('llm_provider_settings', 'id, provider, base_url, model, created_at, updated_at'),
    ownedRows('record_shares', 'id, patient_id, expires_at, revoked_at, created_at', 'owner_user_id'),
    ownedRows('side_effects'),
    ownedRows('follow_up_visits'),
    ownedRows('usage_events'),
    ownedRows('subscriptions'),
    ownedRows('donations'),
  ])
  return {
    donations,
    followUpVisits,
    labReportBatches,
    labResults,
    // The id is only needed as an internal pagination cursor; keep the v1 view.
    llmProviderSettings: providerSettings.map((row) => {
      const metadata = { ...row }
      delete metadata.id
      return metadata
    }),
    patients,
    profile,
    recordShares,
    sideEffects,
    subscriptions,
    treatmentLines,
    usageEvents,
  }
}

async function withAccountDataExport<T>(consume: (data: AccountDataExport) => T): Promise<T> {
  ensureBrowserOnline()
  if (!hasSupabaseEnv) throw new ProfileSettingsError('Missing Supabase environment variables.')
  const supabase = getSupabaseClient()
  let observedUserId: string | undefined
  let cancelled = false
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    const nextUserId = session?.user.id
    if (event === 'SIGNED_OUT' || (observedUserId && nextUserId !== observedUserId)) cancelled = true
    if (nextUserId) observedUserId = nextUserId
  })
  const assertIdentity = () => {
    if (cancelled) throw new ProfileSettingsError('Account changed during data export. Please try again.')
  }

  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) throw new ProfileSettingsError('Missing authenticated user for data export.')
    const user = data.user
    if (observedUserId && observedUserId !== user.id) cancelled = true
    observedUserId = user.id
    assertIdentity()
    const rows = await collectAccountRows(user.id, assertIdentity)
    const current = await supabase.auth.getUser()
    if (current.error || current.data.user?.id !== user.id) cancelled = true
    assertIdentity()
    return consume({
      ...rows,
      account: { exportedAt: new Date().toISOString(), userId: user.id, email: user.email ?? null },
      format: 'firefly-isle.account-export',
      version: 1,
    })
  } finally {
    cancelled = true
    subscription.unsubscribe()
  }
}

export function buildAccountDataExport(): Promise<AccountDataExport> {
  return withAccountDataExport((data) => data)
}

export function buildAccountExportFileName(exportedAt = new Date()) {
  const stamp = exportedAt.toISOString().slice(0, 10)

  return `${brand.slug}-export-${stamp}.json`
}

export function downloadAccountDataExport(): Promise<string> {
  return withAccountDataExport((data) => {
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
  })
}

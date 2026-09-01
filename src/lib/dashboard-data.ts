/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端与 hasSupabaseEnv，依赖 network-status 的 OnlineRequiredError，依赖 @/lib/profile-settings 的 ProfileSettingsError。
 * [OUTPUT]: 对外提供 loadDashboardData 与 DashboardData / DashboardAbnormalReading / DashboardLatestRecord 类型。
 * [POS]: src/lib 的 Dashboard 数据聚合层，全部卡片消费 owner RLS 真实计数与读数；usage_ledger 未迁移时 AI 次数降级为 0；异常读数按指标去重取最近一条。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { ensureBrowserOnline } from '@/lib/network-status'
import { ProfileSettingsError } from '@/lib/profile-settings'
import { getSupabaseClient, hasSupabaseEnv } from '@/lib/supabase'

export type DashboardAbnormalReading = {
  itemId: string
  itemName: string
  patientId: string
  reference: string | null
  status: 'high' | 'low'
  testDate: string | null
  unit: string | null
  value: number
}

export type DashboardLatestRecord = {
  id: string
  tumorType: string | null
  updatedAt: string | null
}

export type DashboardData = {
  abnormalReadings: DashboardAbnormalReading[]
  activeShareCount: number
  aiCallCount30d: number
  labReadingCount: number
  latestRecord: DashboardLatestRecord | null
  patientCount: number
}

type CountResult = { count: number | null; error: { code?: string; message: string } | null }

async function countRows(count: () => PromiseLike<CountResult>): Promise<number> {
  const { count: total, error } = await count()

  if (error) {
    throw new ProfileSettingsError(error.message || 'Could not load dashboard data.')
  }

  return total ?? 0
}

type PatientRow = {
  basic_info: { tumorType?: string } | null
  id: string
  updated_at: string | null
}

type LabRow = {
  created_at: string | null
  id: string
  item_name: string
  patient_id: string
  reference_high: number | null
  reference_low: number | null
  test_date: string | null
  unit: string | null
  value: number
}

export async function loadDashboardData(): Promise<DashboardData> {
  ensureBrowserOnline()

  if (!hasSupabaseEnv) {
    throw new ProfileSettingsError('Missing Supabase environment variables.')
  }

  const supabase = getSupabaseClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    throw new ProfileSettingsError('Missing authenticated user for dashboard data.')
  }

  const [patientCount, labReadingCount, activeShareCount, latestRecordResult] = await Promise.all([
    countRows(() => supabase.from('patients').select('id', { count: 'exact', head: true })),
    countRows(() => supabase.from('lab_results').select('id', { count: 'exact', head: true })),
    countRows(() =>
      supabase
        .from('record_shares')
        .select('id', { count: 'exact', head: true })
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString()),
    ),
    supabase
      .from('patients')
      .select('id, updated_at, basic_info')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle<PatientRow>(),
  ])

  if (latestRecordResult.error) {
    throw new ProfileSettingsError(latestRecordResult.error.message || 'Could not load dashboard data.')
  }

  const latestRow = latestRecordResult.data
  const latestRecord: DashboardLatestRecord | null = latestRow
    ? {
        id: latestRow.id,
        tumorType: latestRow.basic_info?.tumorType ?? null,
        updatedAt: latestRow.updated_at,
      }
    : null

  const aiCallCount30d = await countAiCalls30d(supabase)
  const abnormalReadings = await loadRecentAbnormalReadings(supabase)

  return {
    abnormalReadings,
    activeShareCount,
    aiCallCount30d,
    labReadingCount,
    latestRecord,
    patientCount,
  }
}

// usage_events（009）未应用到当前项目时降级为 0，不让整页失败。
async function countAiCalls30d(supabase: ReturnType<typeof getSupabaseClient>): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'llm_chat')
    .gte('created_at', since)

  if (error) {
    return 0
  }

  return count ?? 0
}

const MAX_LAB_ROWS_SCANNED = 200
const MAX_ABNORMAL_CARDS = 4

async function loadRecentAbnormalReadings(supabase: ReturnType<typeof getSupabaseClient>): Promise<DashboardAbnormalReading[]> {
  const { data, error } = await supabase
    .from('lab_results')
    .select('id, patient_id, item_name, value, unit, reference_low, reference_high, test_date, created_at')
    .order('created_at', { ascending: false })
    .limit(MAX_LAB_ROWS_SCANNED)

  if (error || !data) {
    return []
  }

  const latestPerItem = new Map<string, DashboardAbnormalReading>()

  for (const row of data as LabRow[]) {
    const isHigh = row.reference_high !== null && row.value > row.reference_high
    const isLow = row.reference_low !== null && row.value < row.reference_low

    if (!isHigh && !isLow) {
      continue
    }

    if (latestPerItem.has(row.item_name)) {
      continue
    }

    const low = row.reference_low
    const high = row.reference_high

    latestPerItem.set(row.item_name, {
      itemId: row.id,
      itemName: row.item_name,
      patientId: row.patient_id,
      reference: low !== null && high !== null ? `${low} - ${high}` : high !== null ? `≤ ${high}` : low !== null ? `≥ ${low}` : null,
      status: isHigh ? 'high' : 'low',
      testDate: row.test_date,
      unit: row.unit,
      value: row.value,
    })
  }

  return [...latestPerItem.values()].slice(0, MAX_ABNORMAL_CARDS)
}

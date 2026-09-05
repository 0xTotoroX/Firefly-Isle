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

export type DashboardSideEffect = {
  id: string
  ongoing: boolean
  overdue: boolean
  patientId: string
  severity: 'mild' | 'moderate' | 'severe'
  symptom: string
}

export type DashboardNextVisit = {
  daysUntil: number
  nextVisitOn: string
  patientId: string
}

export type DashboardData = {
  abnormalReadings: DashboardAbnormalReading[]
  activeShareCount: number
  aiCallCount30d: number
  labReadingCount: number
  latestRecord: DashboardLatestRecord | null
  nextVisit: DashboardNextVisit | null
  patientCount: number
  recentSideEffects: DashboardSideEffect[]
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

  const [aiCallCount30d, abnormalReadings, recentSideEffects, nextVisit] = await Promise.all([
    countAiCalls30d(supabase),
    loadRecentAbnormalReadings(supabase),
    loadRecentSideEffects(supabase),
    loadNextFollowUpVisit(supabase),
  ])

  return {
    abnormalReadings,
    activeShareCount,
    aiCallCount30d,
    labReadingCount,
    latestRecord,
    nextVisit,
    patientCount,
    recentSideEffects,
  }
}

// follow_up_visits（013）未迁移时降级为 null，不让整页失败。
async function loadNextFollowUpVisit(supabase: ReturnType<typeof getSupabaseClient>): Promise<DashboardNextVisit | null> {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('follow_up_visits')
    .select('patient_id, next_visit_on')
    .gte('next_visit_on', today)
    .order('next_visit_on', { ascending: true })
    .limit(1)

  if (error || !data || data.length === 0) {
    return null
  }

  const row = data[0] as { next_visit_on: string; patient_id: string }
  const target = new Date(`${row.next_visit_on}T00:00:00`)
  const todayStart = new Date(`${today}T00:00:00`)

  return {
    daysUntil: Math.round((target.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)),
    nextVisitOn: row.next_visit_on,
    patientId: row.patient_id,
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

const MAX_SIDE_EFFECT_CARDS = 4

type SideEffectRow = {
  id: string
  occurred_on: string | null
  patient_id: string
  resolved_on: string | null
  severity: 'mild' | 'moderate' | 'severe'
  symptom: string
}

const OVERDUE_MS = 7 * 24 * 60 * 60 * 1000

// side_effects（012）未迁移时降级为空列表，不让整页失败。
async function loadRecentSideEffects(supabase: ReturnType<typeof getSupabaseClient>): Promise<DashboardSideEffect[]> {
  const { data, error } = await supabase
    .from('side_effects')
    .select('id, patient_id, symptom, severity, occurred_on, resolved_on')
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(MAX_SIDE_EFFECT_CARDS)

  if (error || !data) {
    return []
  }

  return (data as SideEffectRow[]).map((row) => {
    const occurredMs = row.occurred_on ? new Date(`${row.occurred_on}T00:00:00`).getTime() : Number.NaN

    return {
      id: row.id,
      ongoing: row.resolved_on === null,
      overdue: row.resolved_on === null && Number.isFinite(occurredMs) && Date.now() - occurredMs >= OVERDUE_MS,
      patientId: row.patient_id,
      severity: row.severity,
      symptom: row.symptom,
    }
  })
}

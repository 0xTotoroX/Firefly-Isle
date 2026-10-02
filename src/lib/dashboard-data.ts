/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端与 hasSupabaseEnv，依赖 network-status 的 OnlineRequiredError，依赖 @/lib/profile-settings 的 ProfileSettingsError。
 * [OUTPUT]: 对外提供 loadDashboardData 与 DashboardData / DashboardAbnormalReading 类型。
 * [POS]: Dashboard 聚合层：消费 owner RLS 计数与最新状态 RPC，单个分区失败显式标记，不伪装为零或空态。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { ensureBrowserOnline } from '@/lib/network-status'
import { calendarDaysBetween, localCalendarDate } from '@/lib/calendar-date'
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
  aiCallCount30d: number | null
  labReadingCount: number
  nextVisit: DashboardNextVisit | null
  patientCount: number
  recentSideEffects: DashboardSideEffect[]
  unavailableSections: DashboardSection[]
}

export type DashboardSection = 'usage' | 'labs' | 'symptoms' | 'followUp'

type CountResult = { count: number | null; error: { code?: string; message: string } | null }

async function countRows(count: () => PromiseLike<CountResult>): Promise<number> {
  const { count: total, error } = await count()

  if (error) {
    throw new ProfileSettingsError(error.message || 'Could not load dashboard data.')
  }

  return total ?? 0
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

  const [patientCount, labReadingCount, activeShareCount] = await Promise.all([
    countRows(() => supabase.from('patients').select('id', { count: 'exact', head: true })),
    countRows(() => supabase.from('lab_results').select('id', { count: 'exact', head: true })),
    countRows(() =>
      supabase
        .from('record_shares')
        .select('id', { count: 'exact', head: true })
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString()),
    ),
  ])

  const optionalResults = await Promise.allSettled([
    countAiCalls30d(supabase),
    loadRecentAbnormalReadings(supabase),
    loadRecentSideEffects(supabase),
    loadNextFollowUpVisit(supabase),
  ])
  const [usage, labs, symptoms, followUp] = optionalResults
  const sections: DashboardSection[] = ['usage', 'labs', 'symptoms', 'followUp']

  return {
    abnormalReadings: labs.status === 'fulfilled' ? labs.value : [],
    activeShareCount,
    aiCallCount30d: usage.status === 'fulfilled' ? usage.value : null,
    labReadingCount,
    nextVisit: followUp.status === 'fulfilled' ? followUp.value : null,
    patientCount,
    recentSideEffects: symptoms.status === 'fulfilled' ? symptoms.value : [],
    unavailableSections: sections.filter((_, index) => optionalResults[index].status === 'rejected'),
  }
}

// RPC 只返回每位患者最新就诊后的计划；逾期安排不被过滤。
async function loadNextFollowUpVisit(supabase: ReturnType<typeof getSupabaseClient>): Promise<DashboardNextVisit | null> {
  const { data, error } = await supabase.rpc('dashboard_next_follow_up')

  if (error) throw new ProfileSettingsError(error.message)
  if (!data || data.length === 0) return null

  const row = data[0] as { next_visit_on: string; patient_id: string }

  return {
    daysUntil: calendarDaysBetween(localCalendarDate(), row.next_visit_on),
    nextVisitOn: row.next_visit_on,
    patientId: row.patient_id,
  }
}

async function countAiCalls30d(supabase: ReturnType<typeof getSupabaseClient>): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'llm_chat')
    .gte('created_at', since)

  if (error) throw new ProfileSettingsError(error.message)

  return count ?? 0
}

async function loadRecentAbnormalReadings(supabase: ReturnType<typeof getSupabaseClient>): Promise<DashboardAbnormalReading[]> {
  const { data, error } = await supabase.rpc('dashboard_recent_abnormal_readings')
  if (error) throw new ProfileSettingsError(error.message)

  return ((data ?? []) as LabRow[]).map((row) => {
    const isHigh = row.reference_high !== null && row.value > row.reference_high
    const low = row.reference_low
    const high = row.reference_high

    return {
      itemId: row.id,
      itemName: row.item_name,
      patientId: row.patient_id,
      reference: low !== null && high !== null ? `${low} - ${high}` : high !== null ? `≤ ${high}` : low !== null ? `≥ ${low}` : null,
      status: isHigh ? 'high' : 'low',
      testDate: row.test_date,
      unit: row.unit,
      value: row.value,
    }
  })
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

async function loadRecentSideEffects(supabase: ReturnType<typeof getSupabaseClient>): Promise<DashboardSideEffect[]> {
  const { data, error } = await supabase
    .from('side_effects')
    .select('id, patient_id, symptom, severity, occurred_on, resolved_on')
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(MAX_SIDE_EFFECT_CARDS)

  if (error) throw new ProfileSettingsError(error.message)

  return ((data ?? []) as SideEffectRow[]).map((row) => {
    const days = calendarDaysBetween(row.occurred_on ?? '', localCalendarDate())

    return {
      id: row.id,
      ongoing: row.resolved_on === null,
      overdue: row.resolved_on === null && days >= 7,
      patientId: row.patient_id,
      severity: row.severity,
      symptom: row.symptom,
    }
  })
}

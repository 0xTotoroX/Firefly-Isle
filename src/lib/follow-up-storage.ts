/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端与 hasSupabaseEnv，依赖 network-status 的在线守卫。
 * [OUTPUT]: 对外提供 loadFollowUpVisits、createFollowUpVisit、updateFollowUpVisit、deleteFollowUpVisit、setFollowUpStatus 与随访类型。
 * [POS]: 随访 owner CRUD，新增提交用户归属，编辑保留患者关联，确认写入行数并显式报告读取失败。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { ensureBrowserOnline } from '@/lib/network-status'
import { isCalendarDate } from '@/lib/calendar-date'
import { getSupabaseClient, hasSupabaseEnv } from '@/lib/supabase'
import type { FollowUpStatus } from '@/types/patient'

export type FollowUpVisit = {
  conclusion?: string
  doctor?: string
  id: string
  location?: string
  nextPlan?: string
  nextVisitOn?: string
  patientId: string
  visitedOn: string
}

export type FollowUpVisitInput = {
  conclusion?: string | null
  doctor?: string | null
  location?: string | null
  nextPlan?: string | null
  nextVisitOn?: string | null
  visitedOn: string
}

export class FollowUpStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FollowUpStorageError'
  }
}

type FollowUpVisitRow = {
  conclusion: string | null
  doctor: string | null
  id: string
  location: string | null
  next_plan: string | null
  next_visit_on: string | null
  patient_id: string
  visited_on: string
}

const VISIT_COLUMNS = 'id, patient_id, visited_on, location, doctor, conclusion, next_plan, next_visit_on'

function mapRow(row: FollowUpVisitRow): FollowUpVisit {
  return {
    conclusion: row.conclusion ?? undefined,
    doctor: row.doctor ?? undefined,
    id: row.id,
    location: row.location ?? undefined,
    nextPlan: row.next_plan ?? undefined,
    nextVisitOn: row.next_visit_on ?? undefined,
    patientId: row.patient_id,
    visitedOn: row.visited_on,
  }
}

function requireClient() {
  if (!hasSupabaseEnv) {
    throw new FollowUpStorageError('Missing Supabase environment variables.')
  }

  return getSupabaseClient()
}

function toEditableRow(input: FollowUpVisitInput) {
  if (!isCalendarDate(input.visitedOn) || (input.nextVisitOn && (!isCalendarDate(input.nextVisitOn) || input.nextVisitOn < input.visitedOn))) {
    throw new FollowUpStorageError('Invalid visit dates.')
  }

  return {
    conclusion: input.conclusion?.trim() || null,
    doctor: input.doctor?.trim() || null,
    location: input.location?.trim() || null,
    next_plan: input.nextPlan?.trim() || null,
    next_visit_on: input.nextVisitOn || null,
    visited_on: input.visitedOn,
  }
}

export async function loadFollowUpVisits(patientId: string): Promise<FollowUpVisit[]> {
  ensureBrowserOnline()
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('follow_up_visits')
    .select(VISIT_COLUMNS)
    .eq('patient_id', patientId)
    .order('visited_on', { ascending: false })
    .order('created_at', { ascending: false })
    .returns<FollowUpVisitRow[]>()

  if (!error) {
    return (data ?? []).map(mapRow)
  }

  throw new FollowUpStorageError(error.message || 'Could not load follow-up visits.')
}

export async function createFollowUpVisit(patientId: string, input: FollowUpVisitInput): Promise<FollowUpVisit> {
  ensureBrowserOnline()
  const supabase = requireClient()
  const row = toEditableRow(input)
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) throw new FollowUpStorageError('Authentication required.')

  const { data, error } = await supabase
    .from('follow_up_visits')
    .insert({ ...row, patient_id: patientId, user_id: authData.user.id })
    .select(VISIT_COLUMNS)
    .single<FollowUpVisitRow>()

  if (error || !data) {
    throw new FollowUpStorageError(error?.message || 'Could not save the follow-up visit.')
  }

  return mapRow(data)
}

export async function updateFollowUpVisit(id: string, input: FollowUpVisitInput): Promise<void> {
  ensureBrowserOnline()
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('follow_up_visits')
    .update(toEditableRow(input))
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    throw new FollowUpStorageError(error?.message || 'Follow-up visit no longer available.')
  }
}

export async function deleteFollowUpVisit(id: string): Promise<void> {
  ensureBrowserOnline()
  const supabase = requireClient()
  const { data, error } = await supabase.from('follow_up_visits').delete().eq('id', id).select('id').maybeSingle()

  if (error || !data) {
    throw new FollowUpStorageError(error?.message || 'Follow-up visit no longer available.')
  }
}

export async function setFollowUpStatus(patientId: string, status: FollowUpStatus | null): Promise<void> {
  ensureBrowserOnline()
  const supabase = requireClient()
  const { data, error } = await supabase.from('patients').update({ follow_up_status: status }).eq('id', patientId).select('id').maybeSingle()

  if (error || !data) {
    throw new FollowUpStorageError(error?.message || 'Patient no longer available.')
  }
}

/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端与 hasSupabaseEnv，依赖 network-status 的在线守卫。
 * [OUTPUT]: 对外提供 loadSideEffects、createSideEffect、updateSideEffect、deleteSideEffect 与 SideEffectRecord / SideEffectSeverity / SideEffectInput 类型。
 * [POS]: 症状 owner CRUD，校验日期/症状并显式提交用户归属，写后确认目标行，读取失败交给页面恢复。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { ensureBrowserOnline } from '@/lib/network-status'
import { isCalendarDate } from '@/lib/calendar-date'
import { getSupabaseClient, hasSupabaseEnv } from '@/lib/supabase'

export type SideEffectSeverity = 'mild' | 'moderate' | 'severe'

export type SideEffectRecord = {
  id: string
  lineId?: string
  medication?: string
  notes?: string
  occurredOn: string
  patientId: string
  resolvedOn?: string
  severity: SideEffectSeverity
  symptom: string
}

export type SideEffectInput = {
  lineId?: string | null
  medication?: string | null
  notes?: string | null
  occurredOn: string
  resolvedOn?: string | null
  severity: SideEffectSeverity
  symptom: string
}

export class SideEffectStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SideEffectStorageError'
  }
}

type SideEffectRow = {
  id: string
  line_id: string | null
  medication: string | null
  notes: string | null
  occurred_on: string
  patient_id: string
  resolved_on: string | null
  severity: SideEffectSeverity
  symptom: string
}

const SIDE_EFFECT_COLUMNS = 'id, patient_id, line_id, occurred_on, resolved_on, symptom, severity, medication, notes'

function mapRow(row: SideEffectRow): SideEffectRecord {
  return {
    id: row.id,
    lineId: row.line_id ?? undefined,
    medication: row.medication ?? undefined,
    notes: row.notes ?? undefined,
    occurredOn: row.occurred_on,
    patientId: row.patient_id,
    resolvedOn: row.resolved_on ?? undefined,
    severity: row.severity,
    symptom: row.symptom,
  }
}

function requireClient() {
  if (!hasSupabaseEnv) {
    throw new SideEffectStorageError('Missing Supabase environment variables.')
  }

  return getSupabaseClient()
}

function toEditableRow(input: SideEffectInput) {
  if (!input.symptom.trim() || input.symptom.trim().length > 120 || !isCalendarDate(input.occurredOn)
    || (input.resolvedOn && (!isCalendarDate(input.resolvedOn) || input.resolvedOn < input.occurredOn))) {
    throw new SideEffectStorageError('Invalid symptom or dates.')
  }

  return {
    line_id: input.lineId ?? null,
    medication: input.medication?.trim() || null,
    notes: input.notes?.trim() || null,
    occurred_on: input.occurredOn,
    resolved_on: input.resolvedOn || null,
    severity: input.severity,
    symptom: input.symptom.trim(),
  }
}

export async function loadSideEffects(patientId: string): Promise<SideEffectRecord[]> {
  ensureBrowserOnline()
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('side_effects')
    .select(SIDE_EFFECT_COLUMNS)
    .eq('patient_id', patientId)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .returns<SideEffectRow[]>()

  if (!error) {
    return (data ?? []).map(mapRow)
  }

  throw new SideEffectStorageError(error.message || 'Could not load side-effect records.')
}

export async function createSideEffect(patientId: string, input: SideEffectInput): Promise<SideEffectRecord> {
  ensureBrowserOnline()
  const supabase = requireClient()
  const row = toEditableRow(input)
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) throw new SideEffectStorageError('Authentication required.')

  const { data, error } = await supabase
    .from('side_effects')
    .insert({ ...row, patient_id: patientId, user_id: authData.user.id })
    .select(SIDE_EFFECT_COLUMNS)
    .single<SideEffectRow>()

  if (error || !data) {
    throw new SideEffectStorageError(error?.message || 'Could not save the side-effect record.')
  }

  return mapRow(data)
}

export async function updateSideEffect(id: string, input: SideEffectInput): Promise<void> {
  ensureBrowserOnline()
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('side_effects')
    .update(toEditableRow(input))
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    throw new SideEffectStorageError(error?.message || 'Symptom record no longer available.')
  }
}

export async function deleteSideEffect(id: string): Promise<void> {
  ensureBrowserOnline()
  const supabase = requireClient()
  const { data, error } = await supabase.from('side_effects').delete().eq('id', id).select('id').maybeSingle()

  if (error || !data) {
    throw new SideEffectStorageError(error?.message || 'Symptom record no longer available.')
  }
}

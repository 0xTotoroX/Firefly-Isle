/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端与 hasSupabaseEnv，依赖 network-status 的在线守卫。
 * [OUTPUT]: 对外提供 loadSideEffects、createSideEffect、updateSideEffect、deleteSideEffect 与 SideEffectRecord / SideEffectSeverity / SideEffectInput 类型。
 * [POS]: src/lib 的患者副作用日志客户端，owner RLS 直读写 side_effects 表；表未迁移时读取降级为空列表，写入报可解释错误。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { ensureBrowserOnline } from '@/lib/network-status'
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

function isMissingTableError(error: { code?: string }) {
  return error.code === 'PGRST205'
}

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

function toRow(patientId: string, input: SideEffectInput) {
  return {
    line_id: input.lineId ?? null,
    medication: input.medication?.trim() || null,
    notes: input.notes?.trim() || null,
    occurred_on: input.occurredOn,
    patient_id: patientId,
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

  if (isMissingTableError(error)) {
    return []
  }

  throw new SideEffectStorageError(error.message || 'Could not load side-effect records.')
}

export async function createSideEffect(patientId: string, input: SideEffectInput): Promise<SideEffectRecord> {
  ensureBrowserOnline()
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('side_effects')
    .insert(toRow(patientId, input))
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
  const { error } = await supabase
    .from('side_effects')
    .update({
      line_id: input.lineId ?? null,
      medication: input.medication?.trim() || null,
      notes: input.notes?.trim() || null,
      occurred_on: input.occurredOn,
      resolved_on: input.resolvedOn || null,
      severity: input.severity,
      symptom: input.symptom.trim(),
    })
    .eq('id', id)

  if (error) {
    throw new SideEffectStorageError(error.message || 'Could not update the side-effect record.')
  }
}

export async function deleteSideEffect(id: string): Promise<void> {
  ensureBrowserOnline()
  const supabase = requireClient()
  const { error } = await supabase.from('side_effects').delete().eq('id', id)

  if (error) {
    throw new SideEffectStorageError(error.message || 'Could not delete the side-effect record.')
  }
}

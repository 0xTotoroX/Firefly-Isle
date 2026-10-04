/**
 * [INPUT]: 依赖 Web Crypto、@/lib/supabase 的客户端入口、PatientRecord 类型。
 * [OUTPUT]: 对外提供授权码生成/hash、分享创建/列表/撤销、分享链接生成与 loadSharedPatientRecordByCode。
 * [POS]: lib/records 的病历分享边界，隔离 record_shares RPC/CRUD、授权码一次性明文展示和只读 PatientRecord 访问状态。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { ensureBrowserOnline } from '@/lib/network-status'
import { getSupabaseClient } from '@/lib/supabase'
import type { PatientRecord } from '@/types/patient'

type RecordShareRow = {
  created_at: string | null
  expires_at: string
  id: string
  patient_id: string
  revoked_at: string | null
}

export type RecordShare = {
  createdAt?: string
  expiresAt: string
  id: string
  patientId: string
  revokedAt?: string
}

export type CreatedRecordShare = {
  code: string
  share: RecordShare
  url: string
}

export type SharedRecordStatus = 'active' | 'expired' | 'revoked' | 'unavailable'

export type SharedRecordLoadResult =
  | {
      record: PatientRecord
      status: 'active'
    }
  | {
      record: null
      status: Exclude<SharedRecordStatus, 'active'>
    }

export class RecordSharePermissionError extends Error {
  constructor(message = 'You do not own this patient record.') {
    super(message)
    this.name = 'RecordSharePermissionError'
  }
}

const RECORD_SHARE_COLUMNS = 'id, patient_id, expires_at, revoked_at, created_at'
const SHARE_CODE_BYTES = 18
const SHARE_CODE_PATTERN = /^[A-Za-z0-9_-]{20,128}$/
const SHARE_TTL_DAYS = 7

function getCrypto() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new Error('Web Crypto is required for record sharing.')
  }

  return globalThis.crypto
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function mapShareRow(row: RecordShareRow): RecordShare {
  return {
    createdAt: row.created_at ?? undefined,
    expiresAt: row.expires_at,
    id: row.id,
    patientId: row.patient_id,
    revokedAt: row.revoked_at ?? undefined,
  }
}

async function requireAuthenticatedUser() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw error ?? new RecordSharePermissionError('Missing authenticated user.')
  }

  return {
    supabase,
    userId: data.user.id,
  }
}

export function getDefaultShareExpiry(now = new Date()) {
  const expiresAt = new Date(now)

  expiresAt.setDate(expiresAt.getDate() + SHARE_TTL_DAYS)
  return expiresAt.toISOString()
}

export function generateShareCode(bytes?: Uint8Array) {
  const randomBytes = bytes ?? getCrypto().getRandomValues(new Uint8Array(SHARE_CODE_BYTES))

  return toBase64Url(randomBytes)
}

export async function hashShareCode(code: string) {
  const normalized = code.trim()
  const digest = await getCrypto().subtle.digest('SHA-256', new TextEncoder().encode(normalized))

  return toHex(digest)
}

export function getRecordSharePath(code: string) {
  return `/share/${encodeURIComponent(code.trim())}`
}

export function getRecordShareUrl(code: string) {
  const path = getRecordSharePath(code)
  const origin = globalThis.location?.origin

  return origin ? `${origin}${path}` : path
}

export async function createRecordShare(patientId: string, expiresAt = getDefaultShareExpiry()): Promise<CreatedRecordShare> {
  ensureBrowserOnline()

  const { supabase, userId } = await requireAuthenticatedUser()
  const { data: ownedPatient, error: ownerError } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .eq('user_id', userId)
    .maybeSingle<{ id: string }>()

  if (ownerError) {
    throw ownerError
  }

  if (!ownedPatient) {
    throw new RecordSharePermissionError()
  }

  const code = generateShareCode()
  const codeHash = await hashShareCode(code)
  const { data, error } = await supabase
    .from('record_shares')
    .insert({
      code_hash: codeHash,
      expires_at: expiresAt,
      owner_user_id: userId,
      patient_id: patientId,
    })
    .select(RECORD_SHARE_COLUMNS)
    .single<RecordShareRow>()

  if (error || !data) {
    throw error ?? new Error('Failed to create record share.')
  }

  return {
    code,
    share: mapShareRow(data),
    url: getRecordShareUrl(code),
  }
}

export async function listRecordShares(patientId: string) {
  ensureBrowserOnline()

  const { data, error } = await getSupabaseClient()
    .from('record_shares')
    .select(RECORD_SHARE_COLUMNS)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .returns<RecordShareRow[]>()

  if (error) {
    throw error
  }

  return (data ?? []).map(mapShareRow)
}

export async function revokeRecordShare(shareId: string, revokedAt = new Date().toISOString()) {
  ensureBrowserOnline()

  const { data, error } = await getSupabaseClient()
    .from('record_shares')
    .update({ revoked_at: revokedAt })
    .eq('id', shareId)
    .select(RECORD_SHARE_COLUMNS)
    .single<RecordShareRow>()

  if (error || !data) {
    throw error ?? new Error('Failed to revoke record share.')
  }

  return mapShareRow(data)
}

export async function loadSharedPatientRecordByCode(code: string): Promise<SharedRecordLoadResult> {
  if (!SHARE_CODE_PATTERN.test(code.trim())) {
    return {
      record: null,
      status: 'unavailable',
    }
  }

  ensureBrowserOnline()

  const codeHash = await hashShareCode(code)
  const { data, error } = await getSupabaseClient()
    .rpc('get_shared_patient_record', { share_code_hash: codeHash })

  if (error) {
    throw error
  }

  if (!data) {
    return {
      record: null,
      status: 'unavailable',
    }
  }

  if (data.status !== 'active') {
    return { record: null, status: data.status }
  }
  return data.record
    ? { record: data.record as PatientRecord, status: 'active' }
    : { record: null, status: 'unavailable' }
}

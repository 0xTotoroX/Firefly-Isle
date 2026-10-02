// @vitest-environment happy-dom
/**
 * [INPUT]: 真实 Supabase 查询构造器、合成分页/RLS 服务端与认证事件。
 * [OUTPUT]: 全表导出、服务端行数限制、身份连续性、下载及隐私投影的行为回归。
 * [POS]: 仅在内存中响应请求，不连接外部 Supabase。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createClient, type AuthChangeEvent, type Session } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getUserProfile = vi.fn()
vi.mock('@/lib/profile-settings', () => ({
  ProfileSettingsError: class ProfileSettingsError extends Error {},
  getUserProfile: (...args: unknown[]) => getUserProfile(...args),
}))

type Row = Record<string, unknown> & { id: string }
type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void
const ownerA = 'a0000000-0000-4000-8000-000000000001'
const ownerB = 'a0000000-0000-4000-8000-000000000002'
const childTables = ['treatment_lines', 'lab_results', 'lab_report_batches']
let rowsByTable: Record<string, Row[]>
let currentUser: string | null
let serverLimit: number
let authCallback: AuthCallback | undefined
let beforeRead: ((table: string, query: URLSearchParams) => void) | undefined
let failRead: ((table: string, query: URLSearchParams) => boolean) | undefined
const requests: Array<{ table: string; query: URLSearchParams }> = []
const unsubscribe = vi.fn(() => { authCallback = undefined })
const getUser = vi.fn()
const onAuthStateChange = vi.fn((callback: AuthCallback) => {
  authCallback = callback
  return { data: { subscription: { unsubscribe } } }
})

async function serveRequest(input: RequestInfo | URL) {
  const url = new URL(input instanceof Request ? input.url : input.toString())
  const table = url.pathname.split('/').at(-1)!
  const query = url.searchParams
  requests.push({ table, query })
  beforeRead?.(table, query)
  if (failRead?.(table, query)) return new Response(JSON.stringify({ message: 'page failed' }), { status: 500 })
  let rows = rowsByTable[table].filter((row) => {
    if (childTables.includes(table)) {
      return rowsByTable.patients.some((patient) => patient.id === row.patient_id && patient.user_id === currentUser)
    }
    return row[table === 'record_shares' ? 'owner_user_id' : 'user_id'] === currentUser
  })
  for (const [column, filter] of query.entries()) {
    if (filter.startsWith('eq.')) rows = rows.filter((row) => row[column] === filter.slice(3))
    if (filter.startsWith('gt.')) rows = rows.filter((row) => String(row[column]) > filter.slice(3))
    if (filter.startsWith('in.(')) {
      const values = filter.slice(4, -1).split(',')
      rows = rows.filter((row) => values.includes(String(row[column])))
    }
  }
  rows = [...rows]
  if (query.get('order') === 'id.asc') rows.sort((left, right) => left.id.localeCompare(right.id))
  else rows.reverse()
  rows = rows.slice(0, Math.min(Number(query.get('limit') ?? 1000), serverLimit))
  const columns = query.get('select') ?? '*'
  const result = columns === '*' ? rows : rows.map((row) => Object.fromEntries(columns.split(',').map((column) => [column, row[column]])))
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
}

const queryClient = createClient('https://export.example.test', 'synthetic-anon-key', {
  accessToken: async () => 'synthetic-token',
  global: { fetch: serveRequest },
})
const from = vi.fn((table: string) => queryClient.from(table))
vi.mock('@/lib/supabase', () => ({
  hasSupabaseEnv: true,
  getSupabaseClient: () => ({ auth: { getUser, onAuthStateChange }, from }),
}))

import { buildAccountDataExport, buildAccountExportFileName, downloadAccountDataExport } from './account-data-export'

function changeUser(userId: string | null, event: AuthChangeEvent = userId ? 'SIGNED_IN' : 'SIGNED_OUT') {
  currentUser = userId
  authCallback?.(event, userId ? { user: { id: userId } } as Session : null)
}

function rowId(index: number) {
  return `b0000000-0000-4000-8000-${String(index).padStart(12, '0')}`
}

beforeEach(() => {
  vi.clearAllMocks()
  requests.length = 0
  currentUser = ownerA
  serverLimit = 1000
  beforeRead = undefined
  failRead = undefined
  authCallback = undefined
  rowsByTable = Object.fromEntries([
    'patients', ...childTables, 'llm_provider_settings', 'record_shares', 'side_effects',
    'follow_up_visits', 'usage_events', 'subscriptions', 'donations',
  ].map((table) => [table, [ownerA, ownerB].map((owner) => ({
    id: owner, user_id: owner, owner_user_id: owner, patient_id: owner,
    ...(table === 'llm_provider_settings' ? { provider: 'deepseek', api_key_ciphertext: 'ciphertext-secret', api_key_iv: 'iv-secret' } : {}),
    ...(table === 'record_shares' ? { code_hash: 'hash-secret' } : {}),
  }))]))
  getUserProfile.mockResolvedValue({ displayName: null, locale: 'zh', theme: 'dark' })
  getUser.mockImplementation(async () => ({ data: { user: currentUser ? { id: currentUser, email: 'synthetic@example.test' } : null }, error: null }))
})

afterEach(() => { vi.restoreAllMocks() })

describe('account export', () => {
  it('includes every owner table while preserving the v1 format and excluding protected columns', async () => {
    const data = await buildAccountDataExport()
    expect(data.format).toBe('firefly-isle.account-export')
    expect(data.version).toBe(1)
    expect(data.account.userId).toBe(ownerA)
    for (const name of ['patients', 'treatmentLines', 'labResults', 'labReportBatches', 'llmProviderSettings',
      'recordShares', 'sideEffects', 'followUpVisits', 'usageEvents', 'subscriptions', 'donations'] as const) {
      expect(data[name], name).toHaveLength(1)
    }
    expect(getUserProfile).toHaveBeenCalledWith(ownerA)
    expect(data.llmProviderSettings[0]).not.toHaveProperty('id')
    const json = JSON.stringify(data)
    for (const value of [ownerB, 'api_key_ciphertext', 'api_key_iv', 'code_hash', 'ciphertext-secret', 'iv-secret', 'hash-secret']) {
      expect(json).not.toContain(value)
    }
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('collects more than 1000 readings even when the server caps each response below the requested page size', async () => {
    serverLimit = 37
    rowsByTable.lab_results = Array.from({ length: 1103 }, (_, index) => ({ id: rowId(index), patient_id: ownerA }))
    const data = await buildAccountDataExport()
    expect(data.labResults.map((row) => row.id)).toEqual(rowsByTable.lab_results.map((row) => row.id))
    expect(new Set(data.labResults.map((row) => row.id)).size).toBe(1103)
  })

  it('does not skip later records when an earlier page is deleted during collection', async () => {
    serverLimit = 2
    rowsByTable.lab_results = Array.from({ length: 5 }, (_, index) => ({ id: rowId(index), patient_id: ownerA }))
    const expected = rowsByTable.lab_results.map((row) => row.id)
    beforeRead = (table, query) => {
      if (table === 'lab_results' && query.has('id')) rowsByTable.lab_results = rowsByTable.lab_results.filter((row) => row.id !== rowId(0))
    }
    expect((await buildAccountDataExport()).labResults.map((row) => row.id)).toEqual(expected)
  })

  it('paginates patients and queries children in bounded URL batches', async () => {
    rowsByTable.patients = Array.from({ length: 1101 }, (_, index) => ({ id: rowId(index), user_id: ownerA }))
    rowsByTable.lab_results = rowsByTable.patients.map((row) => ({ id: row.id, patient_id: row.id }))
    const data = await buildAccountDataExport()
    expect(data.patients).toHaveLength(1101)
    expect(data.labResults).toHaveLength(1101)
    expect(requests.filter((request) => request.table === 'lab_results').every((request) => request.query.toString().length < 5000)).toBe(true)
  })

  it('does not query patient children when no patient is owned', async () => {
    rowsByTable.patients = []
    for (const table of [...childTables, 'side_effects', 'follow_up_visits', 'record_shares']) rowsByTable[table] = []
    const data = await buildAccountDataExport()
    expect(data.patients).toEqual([])
    expect(requests.some((request) => childTables.includes(request.table))).toBe(false)
    expect(data.followUpVisits).toEqual([])
    expect(data.usageEvents).toHaveLength(1)
  })

  it('rejects a later-page failure instead of returning a partial export', async () => {
    serverLimit = 1
    rowsByTable.lab_results.push({ id: rowId(1), patient_id: ownerA })
    failRead = (table, query) => table === 'lab_results' && query.has('id')
    await expect(buildAccountDataExport()).rejects.toThrow('page failed')
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('propagates profile read failures and preserves an explicitly unavailable optional profile', async () => {
    getUserProfile.mockRejectedValueOnce(new Error('profile offline'))
    await expect(buildAccountDataExport()).rejects.toThrow('profile offline')
    getUserProfile.mockResolvedValueOnce(null)
    expect((await buildAccountDataExport()).profile).toBeNull()
  })

  it.each(['sign-out', 'switch', 'switch-back'])('produces no download after %s during collection', async (change) => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:synthetic')
    let changed = false
    beforeRead = (table) => {
      if (table !== 'lab_results' || changed) return
      changed = true
      changeUser(change === 'sign-out' ? null : ownerB)
      if (change === 'switch-back') changeUser(ownerA)
    }
    await expect(downloadAccountDataExport()).rejects.toThrow('Account changed')
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('detects a switch during the initial user lookup', async () => {
    getUser.mockImplementationOnce(async () => {
      changeUser(ownerB)
      return { data: { user: { id: ownerA } }, error: null }
    })
    await expect(buildAccountDataExport()).rejects.toThrow('Account changed')
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects an identity mismatch during the final verification even without an auth event', async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: ownerA } }, error: null })
    getUser.mockResolvedValueOnce({ data: { user: { id: ownerB } }, error: null })
    await expect(buildAccountDataExport()).rejects.toThrow('Account changed')
  })

  it('allows token refresh for the same user and downloads the complete JSON', async () => {
    let exportedBlob: Blob | undefined
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => { exportedBlob = blob as Blob; return 'blob:synthetic' })
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    beforeRead = () => changeUser(ownerA, 'TOKEN_REFRESHED')
    const filename = await downloadAccountDataExport()
    const data = JSON.parse(await exportedBlob!.text())
    expect(filename).toBe(buildAccountExportFileName())
    expect(data.account.userId).toBe(ownerA)
    expect(data.followUpVisits).toHaveLength(1)
    expect(click).toHaveBeenCalledOnce()
    expect(revoke).toHaveBeenCalledWith('blob:synthetic')
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})

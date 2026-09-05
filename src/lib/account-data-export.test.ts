/**
 * [INPUT]: 依赖 vitest 模块 mock、@/lib/supabase 与 @/lib/profile-settings 的 mock 边界、./account-data-export。
 * [OUTPUT]: 对外提供账户数据导出聚合与敏感材料排除的回归测试。
 * [POS]: lib 的隐私导出测试，约束导出只聚合 owner RLS 行、密钥密文与授权码 hash 不进入导出负载、空病历时跳过子表查询。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUserProfile = vi.fn()

vi.mock('@/lib/profile-settings', () => ({
  ProfileSettingsError: class ProfileSettingsError extends Error {
    requiresOnline = false
  },
  getUserProfile: (...args: unknown[]) => getUserProfile(...args),
}))

const getUser = vi.fn()
const from = vi.fn()
const selectCalls: string[] = []

vi.mock('@/lib/supabase', () => ({
  hasSupabaseEnv: true,
  getSupabaseClient: () => ({
    auth: { getUser },
    from,
  }),
}))

import { buildAccountDataExport, buildAccountExportFileName } from './account-data-export'

function chain(result: { data: unknown; error: { message: string } | null }) {
  const promise = Promise.resolve(result) as Promise<{ data: unknown; error: { message: string } | null }> & {
    eq: () => ReturnType<typeof chain>
    in: () => ReturnType<typeof chain>
  }

  promise.eq = () => chain(result)
  promise.in = () => chain(result)

  return promise
}

function makeTable(result: { data: unknown; error: { message: string } | null }) {
  return (table: string) => ({
    select: (columns: string) => {
      selectCalls.push(`${table}:${columns}`)

      return chain(result)
    },
  })
}

beforeEach(() => {
  selectCalls.length = 0
  getUserProfile.mockResolvedValue({ displayName: null, locale: 'zh', theme: 'dark' })
  getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'rider@firefly.test' } }, error: null })
})

describe('buildAccountDataExport', () => {
  it('aggregates every owner row and excludes key ciphertext and share code hashes', async () => {
    from.mockImplementation(
      makeTable({
        data: [{ id: 'p1' }],
        error: null,
      }),
    )

    const data = await buildAccountDataExport()

    expect(data.format).toBe('firefly-isle.account-export')
    expect(data.account.userId).toBe('user-1')
    expect(data.patients).toHaveLength(1)
    expect(selectCalls.some((call) => call.startsWith('side_effects:'))).toBe(true)

    const settingsSelect = selectCalls.find((call) => call.startsWith('llm_provider_settings:')) ?? ''
    const sharesSelect = selectCalls.find((call) => call.startsWith('record_shares:')) ?? ''

    expect(settingsSelect).toContain('provider')
    expect(settingsSelect).not.toContain('api_key_ciphertext')
    expect(settingsSelect).not.toContain('api_key_iv')
    expect(sharesSelect).not.toContain('code_hash')
  })

  it('skips child table queries when the account owns no patients', async () => {
    from.mockImplementation(
      makeTable({
        data: [],
        error: null,
      }),
    )

    const data = await buildAccountDataExport()

    expect(data.patients).toHaveLength(0)
    expect(selectCalls.some((call) => call.startsWith('treatment_lines:'))).toBe(false)
    expect(selectCalls.some((call) => call.startsWith('lab_results:'))).toBe(false)
  })

  it('names the export file with the current date', () => {
    expect(buildAccountExportFileName(new Date('2026-09-02T10:00:00Z'))).toBe('firefly-isle-export-2026-09-02.json')
  })
})

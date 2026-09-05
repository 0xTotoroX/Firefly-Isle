/**
 * [INPUT]: 依赖 vitest 模块 mock、@/lib/supabase 的 mock 边界与 ./dashboard-data。
 * [OUTPUT]: 对外提供 Dashboard 数据聚合的回归测试。
 * [POS]: lib 的 Dashboard 测试，约束真实计数聚合、异常读数按指标去重、usage_events 缺表降级与未登录拒绝。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUser = vi.fn()
const from = vi.fn()

vi.mock('@/lib/supabase', () => ({
  hasSupabaseEnv: true,
  getSupabaseClient: () => ({
    auth: { getUser },
    from,
  }),
}))

import { loadDashboardData } from './dashboard-data'

type RouteResult = { count?: number | null; data?: unknown; error?: { code?: string; message: string } | null }

const routeResults = new Map<string, RouteResult>()

function routeKey(table: string, columns: string) {
  if (table === 'patients' && columns === 'id') {
    return 'patients:count'
  }

  if (table === 'patients') {
    return 'patients:latest'
  }

  if (table === 'lab_results' && columns === 'id') {
    return 'lab_results:count'
  }

  return `${table}:scan`
}

function stub(key: string, result: RouteResult) {
  routeResults.set(key, result)
}

beforeEach(() => {
  routeResults.clear()
  getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'rider@firefly.test' } }, error: null })

  from.mockImplementation((table: string) => {
    let columns = ''

    const builder = {
      eq: () => builder,
      gt: () => builder,
      gte: () => builder,
      is: () => builder,
      limit: () => builder,
      maybeSingle: () => builder,
      order: () => builder,
      select: (nextColumns: string) => {
        columns = nextColumns
        return builder
      },
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(routeResults.get(routeKey(table, columns)) ?? { data: null, error: null, count: 0 }).then(resolve),
    }

    return builder
  })
})

describe('loadDashboardData', () => {
  it('aggregates real counts, the latest record and deduped abnormal readings', async () => {
    stub('patients:count', { count: 3 })
    stub('lab_results:count', { count: 12 })
    stub('record_shares:scan', { count: 1 })
    stub('usage_events:scan', { count: 7 })
    stub('side_effects:scan', {
      data: [
        { id: 'se1', occurred_on: '2026-09-01', patient_id: 'p1', resolved_on: null, severity: 'moderate', symptom: '恶心' },
      ],
      error: null,
    })
    stub('follow_up_visits:scan', {
      data: [{ next_visit_on: '2026-09-20', patient_id: 'p1' }],
      error: null,
    })
    stub('patients:latest', {
      data: { basic_info: { tumorType: '乳腺癌' }, id: 'p1', updated_at: '2026-08-02T10:00:00Z' },
      error: null,
    })
    stub('lab_results:scan', {
      data: [
        { created_at: '2026-08-02', id: 'r2', item_name: 'CA15-3', patient_id: 'p1', reference_high: 25, reference_low: null, test_date: '2026-08-02', unit: 'U/mL', value: 40 },
        { created_at: '2026-08-01', id: 'r1', item_name: 'CA15-3', patient_id: 'p1', reference_high: 25, reference_low: null, test_date: '2026-08-01', unit: 'U/mL', value: 32 },
        { created_at: '2026-08-02', id: 'r3', item_name: '白细胞', patient_id: 'p1', reference_high: null, reference_low: 3.5, test_date: '2026-08-02', unit: '10^9/L', value: 2.8 },
      ],
      error: null,
    })

    const data = await loadDashboardData()

    expect(data.patientCount).toBe(3)
    expect(data.labReadingCount).toBe(12)
    expect(data.activeShareCount).toBe(1)
    expect(data.aiCallCount30d).toBe(7)
    expect(data.latestRecord).toMatchObject({ id: 'p1', tumorType: '乳腺癌' })
    expect(data.abnormalReadings).toHaveLength(2)
    expect(data.abnormalReadings[0]).toMatchObject({ itemName: 'CA15-3', status: 'high', value: 40 })
    expect(data.abnormalReadings[1]).toMatchObject({ itemName: '白细胞', status: 'low' })
    expect(data.recentSideEffects).toHaveLength(1)
    expect(data.recentSideEffects[0]).toMatchObject({ symptom: '恶心', severity: 'moderate', ongoing: true })
  })

  it('returns zero AI calls when the usage ledger is not migrated yet', async () => {
    stub('patients:count', { count: 1 })
    stub('patients:latest', { data: null, error: null })
    stub('record_shares:scan', { count: 0 })
    stub('usage_events:scan', { count: null, error: { code: 'PGRST205', message: 'Could not find the table public.usage_events' } })
    stub('lab_results:scan', { data: [], error: null })
    stub('side_effects:scan', { data: [], error: { code: 'PGRST205', message: 'Could not find the table public.side_effects' } })
    stub('follow_up_visits:scan', { data: [], error: { code: 'PGRST205', message: 'Could not find the table public.follow_up_visits' } })

    const data = await loadDashboardData()

    expect(data.aiCallCount30d).toBe(0)
    expect(data.patientCount).toBe(1)
    expect(data.recentSideEffects).toEqual([])
    expect(data.nextVisit).toBeNull()
  })

  it('rejects unauthenticated dashboard loads', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(loadDashboardData()).rejects.toMatchObject({ name: 'ProfileSettingsError' })
  })
})

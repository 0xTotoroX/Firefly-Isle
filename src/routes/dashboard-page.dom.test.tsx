// @vitest-environment happy-dom
/**
 * [INPUT]: 依赖 happy-dom 环境、@testing-library/react、@testing-library/user-event、@testing-library/jest-dom、vitest 模块 mock 与 ./dashboard-page。
 * [OUTPUT]: 对外提供 DashboardPage 的真实渲染行为回归测试。
 * [POS]: routes 的总览页 DOM 测试，约束精确数字渲染、最近病历与异常读数链接、空态可执行动作与加载失败反馈。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { BackgroundAudioProvider } from '@/lib/background-audio'
import { copy, getCopy } from '@/lib/copy'
import { LocaleProvider } from '@/lib/locale'
import { ThemeProvider } from '@/lib/theme'

import { DashboardPage } from './dashboard-page'

const loadDashboardData = vi.fn()

vi.mock('@/lib/dashboard-data', () => ({
  loadDashboardData: (...args: unknown[]) => loadDashboardData(...args),
}))

const localStorageState = new Map<string, string>()

const localStorageMock = {
  getItem: (key: string) => localStorageState.get(key) ?? null,
  removeItem: (key: string) => {
    localStorageState.delete(key)
  },
  setItem: (key: string, value: string) => {
    localStorageState.set(key, value)
  },
}

vi.stubGlobal('localStorage', localStorageMock)
Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorageMock })

function renderDashboard() {
  return render(
    <ThemeProvider>
      <LocaleProvider>
        <MemoryRouter>
          <BackgroundAudioProvider>
            <DashboardPage />
          </BackgroundAudioProvider>
        </MemoryRouter>
      </LocaleProvider>
    </ThemeProvider>,
  )
}

const fullData = {
  recentSideEffects: [
    { id: 'se1', ongoing: true, patientId: 'p1', severity: 'moderate' as const, symptom: '恶心' },
  ],
  abnormalReadings: [
    { itemId: 'r2', itemName: 'CA15-3', patientId: 'p1', reference: '0 - 25', status: 'high' as const, testDate: '2026-08-02', unit: 'U/mL', value: 40 },
    { itemId: 'r3', itemName: '白细胞', patientId: 'p1', reference: '3.5 - 9.5', status: 'low' as const, testDate: '2026-08-02', unit: '10^9/L', value: 2.8 },
  ],
  activeShareCount: 1,
  aiCallCount30d: 7,
  labReadingCount: 12,
  latestRecord: { id: 'p1', tumorType: '乳腺癌', updatedAt: '2026-08-02T10:00:00Z' },
  patientCount: 3,
}

describe('DashboardPage', () => {
  it('renders exact counts, the latest record link and abnormal readings', async () => {
    loadDashboardData.mockResolvedValue(fullData)
    renderDashboard()

    expect(await screen.findByText('3')).toBeVisible()
    expect(screen.getByText('12')).toBeVisible()
    expect(screen.getByText('1')).toBeVisible()
    expect(screen.getByText('7')).toBeVisible()
    expect(screen.getByText('乳腺癌')).toBeVisible()
    expect(screen.getByText('恶心')).toBeVisible()
    expect(screen.getByRole('link', { name: getCopy(copy.dashboard.viewRecord, 'zh') })).toHaveAttribute('href', '/record/p1')
    expect(screen.getByText('CA15-3')).toBeVisible()
    expect(screen.getByText(getCopy(copy.dashboard.highLabel, 'zh'))).toBeVisible()
    expect(screen.getByText(getCopy(copy.dashboard.lowLabel, 'zh'))).toBeVisible()

    const analyticsLinks = screen.getAllByRole('link', { name: getCopy(copy.dashboard.viewAnalytics, 'zh') })

    expect(analyticsLinks).toHaveLength(2)

    for (const link of analyticsLinks) {
      expect(link).toHaveAttribute('href', '/analytics/p1')
    }
  })

  it('offers an actionable empty state for accounts without records', async () => {
    loadDashboardData.mockResolvedValue({ ...fullData, patientCount: 0, latestRecord: null, abnormalReadings: [], recentSideEffects: [] })
    renderDashboard()

    expect(await screen.findByRole('link', { name: getCopy(copy.dashboard.emptyAction, 'zh') })).toHaveAttribute('href', '/app')
  })

  it('explains load failures instead of showing a blank page', async () => {
    loadDashboardData.mockRejectedValue(new Error('offline'))
    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent('总览数据读取失败')
  })
})

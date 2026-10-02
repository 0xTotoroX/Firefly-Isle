// @vitest-environment happy-dom
/**
 * [INPUT]: 依赖 happy-dom 环境、@testing-library/react、@testing-library/user-event、@testing-library/jest-dom、vitest 模块 mock 与 ./dashboard-page。
 * [OUTPUT]: 对外提供 DashboardPage 的真实渲染行为回归测试。
 * [POS]: routes 的总览页 DOM 测试，约束精确数字渲染、最近病历与异常读数链接、空态可执行动作与加载失败反馈。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import '@testing-library/jest-dom/vitest'

import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BackgroundAudioProvider } from '@/lib/background-audio'
import { copy, getCopy } from '@/lib/copy'
import { LocaleProvider } from '@/lib/locale'
import { ThemeProvider } from '@/lib/theme'

import { DashboardPage } from './dashboard-page'

const loadDashboardData = vi.fn()
const loadRecords = vi.fn()
let userId = 'owner-a'
vi.mock('@/lib/auth', () => ({ useOptionalAuth: () => ({ user: { id: userId } }) }))
vi.mock('@/lib/patient-record-storage', () => ({ loadPatientRecordSummaries: (...args: unknown[]) => loadRecords(...args) }))

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
  unavailableSections: [],
  nextVisit: { daysUntil: 12, nextVisitOn: '2026-09-17', patientId: 'p1' },
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
  patientCount: 3,
}

const firstPage = { records: [{ id: 'p1', name: '合成甲', tumorType: '乳腺癌', updatedAt: '2026-08-02T10:00:00Z' }], nextCursor: null }
const cursor = { createdAt: '2026-08-02T10:00:00Z', id: 'p1' }
const laterPage = { records: [{ id: 'p2', name: '合成乙', tumorType: '另一病种', updatedAt: '2026-08-01T10:00:00Z' }], nextCursor: null }
beforeEach(() => {
  vi.clearAllMocks()
  userId = 'owner-a'
  loadDashboardData.mockResolvedValue(fullData)
  loadRecords.mockResolvedValue(firstPage)
})

describe('DashboardPage', () => {
  it('renders exact counts, the latest record link and abnormal readings', async () => {
    loadDashboardData.mockResolvedValue(fullData)
    renderDashboard()

    expect(await screen.findByText('3')).toBeVisible()
    expect(screen.getByText('12')).toBeVisible()
    expect(screen.getByText('1')).toBeVisible()
    expect(screen.getByText('7')).toBeVisible()
    expect(screen.getByText('乳腺癌')).toBeVisible()
    expect(screen.getByTestId('dashboard-next-visit')).toBeVisible()
    expect(screen.getAllByText(/12 天后/).length).toBeGreaterThan(0)
    expect(screen.getByText('恶心')).toBeVisible()
    expect(screen.getByRole('link', { name: getCopy(copy.dashboard.viewRecord, 'zh') })).toHaveAttribute('href', '/record/p1')
    expect(screen.getByText('CA15-3')).toBeVisible()
    expect(screen.getByText(getCopy(copy.dashboard.highLabel, 'zh'))).toBeVisible()
    expect(screen.getByText(getCopy(copy.dashboard.lowLabel, 'zh'))).toBeVisible()

    const analyticsLinks = screen.getAllByRole('link', { name: getCopy(copy.dashboard.viewAnalytics, 'zh') })

    expect(analyticsLinks).toHaveLength(3)

    for (const link of analyticsLinks) {
      expect(link).toHaveAttribute('href', '/analytics/p1')
    }
  })

  it('offers an actionable empty state for accounts without records', async () => {
    loadRecords.mockResolvedValue({ records: [], nextCursor: null })
    loadDashboardData.mockResolvedValue({ ...fullData, patientCount: 0, abnormalReadings: [], recentSideEffects: [], nextVisit: null })
    renderDashboard()

    expect(await screen.findByRole('link', { name: getCopy(copy.dashboard.emptyAction, 'zh') })).toHaveAttribute('href', '/app')
  })

  it('explains load failures instead of showing a blank page', async () => {
    loadDashboardData.mockRejectedValue(new Error('offline'))
    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent('总览数据读取失败')
  })
})

it('keeps successful dashboard data while failed sections are retryable', async () => {
  loadDashboardData.mockResolvedValue({ ...fullData, aiCallCount30d: null, abnormalReadings: [], unavailableSections: ['usage', 'labs'] })
  renderDashboard()
  expect(await screen.findByText('—')).toBeVisible()
  expect(screen.getByText('恶心')).toBeVisible()
  expect(screen.queryByText(getCopy(copy.dashboard.abnormalEmpty, 'zh'))).not.toBeInTheDocument()
  loadDashboardData.mockResolvedValue(fullData)
  await userEvent.click(screen.getAllByRole('button', { name: '重新读取' })[0])
  expect(await screen.findByText('CA15-3')).toBeVisible()
})

it.each([[-2, '已逾期 · 2 天'], [0, '今天复查']])('distinguishes the calendar reminder at %s days', async (daysUntil, label) => {
  loadDashboardData.mockResolvedValue({ ...fullData, nextVisit: { ...fullData.nextVisit, daysUntil } })
  renderDashboard()
  expect(await screen.findByTestId('dashboard-next-visit')).toHaveTextContent(label)
})

it('keeps navigation available without a selected patient', async () => {
  renderDashboard()
  expect(await screen.findByRole('link', { name: '病历' })).toHaveAttribute('href', '/dashboard#records')
  expect(screen.getByRole('link', { name: '统计' })).toHaveAttribute('href', '/dashboard#records')
  expect(screen.queryByText('先提取')).not.toBeInTheDocument()
})

it('loads later records with all links scoped to the selected patient', async () => {
  loadRecords.mockResolvedValueOnce({ ...firstPage, nextCursor: cursor }).mockResolvedValueOnce(laterPage)
  renderDashboard()
  await userEvent.click(await screen.findByRole('button', { name: '加载更多病历' }))
  expect(await screen.findByText('合成乙')).toBeVisible()
  const actions = within(screen.getByRole('navigation', { name: '合成乙' }))
  expect(actions.getByRole('link', { name: '查看病历' })).toHaveAttribute('href', '/record/p2')
  expect(actions.getByRole('link', { name: '查看指标' })).toHaveAttribute('href', '/analytics/p2')
  expect(actions.getByRole('link', { name: '继续录入' })).toHaveAttribute('href', '/app?patient=p2')
  expect(screen.getByText('合成甲')).toBeVisible()
  expect(screen.queryByRole('button', { name: '加载更多病历' })).not.toBeInTheDocument()
  expect(loadRecords).toHaveBeenNthCalledWith(2, 'owner-a', cursor)
})

it('retains loaded rows and retries the failed page without restarting pagination', async () => {
  loadRecords.mockResolvedValueOnce({ ...firstPage, nextCursor: cursor }).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(laterPage)
  renderDashboard()
  await userEvent.click(await screen.findByRole('button', { name: '加载更多病历' }))
  expect(await screen.findByText('更多病历暂时无法读取，已加载的病历仍可使用。')).toBeVisible()
  expect(screen.getByText('合成甲')).toBeVisible()
  expect(screen.getByText('恶心')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: '重新读取病历' }))
  expect(await screen.findByText('合成乙')).toBeVisible()
  expect(loadRecords).toHaveBeenNthCalledWith(3, 'owner-a', cursor)
  expect(screen.getAllByText('合成甲')).toHaveLength(1)
})

it('keeps the clinical dashboard usable when the first record page fails', async () => {
  loadRecords.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(firstPage)
  renderDashboard()
  expect(await screen.findByText('病历读取失败，请重试。')).toBeVisible()
  expect(screen.getByText('恶心')).toBeVisible()
  expect(screen.queryByText('从第一份病历开始')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '重新读取病历' }))
  expect(await screen.findByText('合成甲')).toBeVisible()
})

it('discards a previous account page that completes after switching accounts', async () => {
  let finishOld!: (value: typeof firstPage) => void
  loadRecords.mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve })).mockResolvedValueOnce(laterPage)
  const rendered = renderDashboard()
  await screen.findByText('恶心')
  userId = 'owner-b'
  rendered.rerender(<ThemeProvider><LocaleProvider><MemoryRouter><BackgroundAudioProvider><DashboardPage /></BackgroundAudioProvider></MemoryRouter></LocaleProvider></ThemeProvider>)
  expect(await screen.findByText('合成乙')).toBeVisible()
  await act(async () => finishOld(firstPage))
  expect(screen.queryByText('合成甲')).not.toBeInTheDocument()
  expect(loadRecords).toHaveBeenNthCalledWith(2, 'owner-b', null)
})

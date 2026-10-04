// @vitest-environment happy-dom
/**
 * [INPUT]: 依赖 happy-dom、@testing-library/react、@testing-library/user-event、@testing-library/jest-dom、vitest 模块 mock 与 ./side-effects-page。
 * [OUTPUT]: 对外提供 SideEffectsPage 的真实渲染行为回归测试。
 * [POS]: routes 的副作用日志页 DOM 测试，约束列表渲染、新增链路（症状+严重程度+日期）、编辑回填与删除刷新。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BackgroundAudioProvider } from '@/lib/background-audio'
import { LocaleProvider } from '@/lib/locale'
import { ThemeProvider } from '@/lib/theme'

import { SideEffectsPage } from './side-effects-page'

const loadFollowUpVisits = vi.fn()
const loadPatientRecordById = vi.fn()
const loadSideEffects = vi.fn()
const createSideEffect = vi.fn()
const updateSideEffect = vi.fn()
const deleteSideEffect = vi.fn()

vi.mock('@/lib/patient-record-storage', () => ({
  loadPatientRecordById: (...args: unknown[]) => loadPatientRecordById(...args),
}))

vi.mock('@/lib/follow-up-storage', () => ({
  loadFollowUpVisits: (...args: unknown[]) => loadFollowUpVisits(...args),
}))

vi.mock('@/lib/side-effect-storage', () => ({
  SideEffectStorageError: class SideEffectStorageError extends Error {},
  createSideEffect: (...args: unknown[]) => createSideEffect(...args),
  deleteSideEffect: (...args: unknown[]) => deleteSideEffect(...args),
  loadSideEffects: (...args: unknown[]) => loadSideEffects(...args),
  updateSideEffect: (...args: unknown[]) => updateSideEffect(...args),
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

const sampleEntry = {
  id: 'se-1',
  lineId: 'line-2',
  medication: '自行服用止吐药',
  notes: '',
  occurredOn: '2026-09-01',
  patientId: 'p1',
  severity: 'moderate' as const,
  symptom: '恶心',
}

function renderPage() {
  return render(
    <ThemeProvider>
      <LocaleProvider>
        <MemoryRouter initialEntries={['/record/p1/side-effects']}>
          <BackgroundAudioProvider>
            <MemoryRoutes />
          </BackgroundAudioProvider>
        </MemoryRouter>
      </LocaleProvider>
    </ThemeProvider>,
  )
}

function MemoryRoutes() {
  return (
    <>
    <Link to="/record/p2/side-effects">Switch patient</Link>
    <Routes>
      <Route element={<SideEffectsPage />} path="/record/:id/side-effects" />
    </Routes>
    </>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorageState.clear()
  loadFollowUpVisits.mockResolvedValue([])
  createSideEffect.mockResolvedValue(sampleEntry)
  updateSideEffect.mockResolvedValue(undefined)
  deleteSideEffect.mockResolvedValue(undefined)
  loadPatientRecordById.mockResolvedValue({
    basicInfo: { tumorType: '乳腺癌' },
    id: 'p1',
    treatmentLines: [
      { id: 'line-1', lineNumber: 1, regimen: 'AC 方案' },
      { id: 'line-2', lineNumber: 2, regimen: 'T-DXd' },
    ],
  })
  loadSideEffects.mockResolvedValue([])
})

describe('SideEffectsPage', () => {
  it('lists saved entries with severity chips and line attribution', async () => {
    loadSideEffects.mockResolvedValue([sampleEntry])
    renderPage()

    expect(within(await screen.findByTestId('side-effect-list')).getByText('恶心')).toBeVisible()
    expect(screen.getAllByText('中度').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/L2/).length).toBeGreaterThan(0)
    expect(screen.getByText(/自行服用止吐药/)).toBeVisible()
    expect(screen.getByText(/未缓解/)).toBeVisible()
  })

  it('creates an entry from the form and reloads the list', async () => {
    createSideEffect.mockResolvedValue({ ...sampleEntry, id: 'se-2' })
    renderPage()

    await userEvent.type(await screen.findByTestId('side-effect-symptom-input'), '乏力')
    await userEvent.click(screen.getByTestId('side-effect-severity-moderate'))
    await userEvent.click(screen.getByTestId('side-effect-save-button'))

    await waitFor(() => {
      expect(createSideEffect).toHaveBeenCalledWith('p1', expect.objectContaining({ severity: 'moderate', symptom: '乏力' }))
    })
  })

  it('deletes an entry and refreshes', async () => {
    loadSideEffects.mockResolvedValue([sampleEntry])
    deleteSideEffect.mockResolvedValue(undefined)
    renderPage()

    await userEvent.click(await screen.findByTestId('side-effect-delete-se-1'))
    expect(deleteSideEffect).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() => {
      expect(deleteSideEffect).toHaveBeenCalledWith('se-1')
      expect(loadSideEffects).toHaveBeenCalledTimes(2)
    })
  })

  it('generates a visit summary for the picked range and marks overdue entries', async () => {
    const overdueEntry = { ...sampleEntry, id: 'se-old', occurredOn: '2026-08-01', resolvedOn: null }
    loadSideEffects.mockResolvedValue([overdueEntry])
    renderPage()

    expect(await screen.findByText(/超过 7 天未缓解/)).toBeVisible()

    fireEvent.change(screen.getByTestId('side-effect-summary-from'), { target: { value: '2026-08-01' } })
    await userEvent.click(screen.getByTestId('side-effect-summary-generate'))

    const output = screen.getByTestId('side-effect-summary-output') as HTMLTextAreaElement

    expect(output.value).toContain('复诊摘要')
    expect(output.value).toContain('恶心')

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
    await userEvent.click(screen.getByTestId('side-effect-summary-copy'))

    expect(screen.getByText('摘要已复制')).toBeVisible()
  })

  it('remembers custom symptoms locally after saving', async () => {
    createSideEffect.mockResolvedValue({ ...sampleEntry, id: 'se-3' })
    renderPage()

    await userEvent.type(await screen.findByTestId('side-effect-symptom-input'), '晨起手僵')
    await userEvent.click(screen.getByTestId('side-effect-save-button'))

    await waitFor(() => {
      expect(createSideEffect).toHaveBeenCalled()
    })

    const stored = JSON.parse(localStorage.getItem('firefly-custom-symptoms') ?? '[]') as string[]

    expect(stored).toContain('晨起手僵')
  })

  it('backfills the form when editing an entry', async () => {
    loadSideEffects.mockResolvedValue([sampleEntry])
    renderPage()

    await userEvent.click(await screen.findByTestId('side-effect-edit-se-1'))

    expect(screen.getByTestId('side-effect-symptom-input')).toHaveValue('恶心')
    expect(screen.getByTestId('side-effect-severity-moderate')).toHaveAttribute('aria-pressed', 'true')
  })
})

it('preserves inputs on save failure and lets the user retry', async () => {
  createSideEffect.mockRejectedValueOnce(new Error('offline'))
  renderPage()
  await userEvent.type(await screen.findByLabelText('症状'), '测试症状')
  await userEvent.click(screen.getByTestId('side-effect-save-button'))
  expect(await screen.findByRole('alert')).toHaveTextContent('保存失败')
  expect(screen.getByLabelText('症状')).toHaveValue('测试症状')
  await userEvent.click(screen.getByTestId('side-effect-save-button'))
  await waitFor(() => expect(createSideEffect).toHaveBeenCalledTimes(2))
})

it('shows a retryable read failure without an editable form or empty history', async () => {
  loadSideEffects.mockRejectedValueOnce(new Error('offline'))
  renderPage()
  expect(await screen.findByRole('alert')).toHaveTextContent('读取失败')
  expect(screen.queryByTestId('side-effect-save-button')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '重新读取' }))
  expect(await screen.findByLabelText('症状')).toBeVisible()
})

it('rejects reversed symptom dates before calling storage', async () => {
  renderPage()
  await userEvent.type(await screen.findByLabelText('症状'), '乏力')
  fireEvent.change(screen.getByTestId('side-effect-date-input'), { target: { value: '2026-09-12' } })
  fireEvent.change(document.getElementById('symptom-resolvedOn')!, { target: { value: '2026-09-11' } })
  await userEvent.click(screen.getByTestId('side-effect-save-button'))
  expect(screen.getByRole('alert')).toHaveTextContent('不能早于')
  expect(createSideEffect).not.toHaveBeenCalled()
})

it('includes overlapping ongoing symptoms, then invalidates the summary when dates change', async () => {
  loadSideEffects.mockResolvedValue([{ ...sampleEntry, occurredOn: '2026-01-01', resolvedOn: null }, { ...sampleEntry, id: 'old', symptom: '旧症状', occurredOn: '2026-01-01', resolvedOn: '2026-08-01' }])
  renderPage()
  await screen.findByTestId('side-effect-summary-from')
  fireEvent.change(screen.getByTestId('side-effect-summary-from'), { target: { value: '2026-09-01' } })
  fireEvent.change(screen.getByTestId('side-effect-summary-to'), { target: { value: '2026-09-12' } })
  await userEvent.click(screen.getByTestId('side-effect-summary-generate'))
  const output = screen.getByTestId('side-effect-summary-output') as HTMLTextAreaElement
  expect(output.value).toContain('恶心')
  expect(output.value).not.toContain('旧症状')
  fireEvent.change(screen.getByTestId('side-effect-summary-to'), { target: { value: '2026-09-13' } })
  expect(screen.queryByTestId('side-effect-summary-output')).not.toBeInTheDocument()
})

it('requires complete visit data for a summary and keeps visit context with no symptoms', async () => {
  loadFollowUpVisits.mockRejectedValueOnce(new Error('offline'))
  renderPage()
  expect(await screen.findByTestId('side-effect-summary-generate')).toBeDisabled()
  loadFollowUpVisits.mockResolvedValue([{ id: 'v1', patientId: 'p1', visitedOn: '2026-09-01', nextVisitOn: '2026-09-25', conclusion: '继续记录' }])
  await userEvent.click(screen.getByRole('button', { name: '重新读取' }))
  await waitFor(() => expect(screen.getByTestId('side-effect-summary-generate')).toBeEnabled())
  await userEvent.click(screen.getByTestId('side-effect-summary-generate'))
  expect((screen.getByTestId('side-effect-summary-output') as HTMLTextAreaElement).value).toContain('2026-09-25')
})

it('clears the patient-specific draft on route change', async () => {
  renderPage()
  await userEvent.type(await screen.findByLabelText('症状'), '患者一草稿')
  await userEvent.click(screen.getByRole('link', { name: 'Switch patient' }))
  expect(await screen.findByLabelText('症状')).toHaveValue('')
  expect(loadSideEffects).toHaveBeenLastCalledWith('p2')
})

it('keeps presets expandable without blocking direct symptom entry', async () => {
  renderPage()
  await screen.findByLabelText('症状')
  expect(screen.getByRole('button', { name: '恶心', hidden: true })).not.toBeVisible()
  await userEvent.click(screen.getByText('选择常见症状'))
  await userEvent.click(screen.getByRole('button', { name: '恶心' }))
  expect(screen.getByLabelText('症状')).toHaveValue('恶心')
})

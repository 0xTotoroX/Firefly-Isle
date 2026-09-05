// @vitest-environment happy-dom
/**
 * [INPUT]: 依赖 happy-dom、@testing-library/react、@testing-library/user-event、@testing-library/jest-dom、vitest 模块 mock 与 ./side-effects-page。
 * [OUTPUT]: 对外提供 SideEffectsPage 的真实渲染行为回归测试。
 * [POS]: routes 的副作用日志页 DOM 测试，约束列表渲染、新增链路（症状+严重程度+日期）、编辑回填与删除刷新。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import '@testing-library/jest-dom/vitest'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BackgroundAudioProvider } from '@/lib/background-audio'
import { LocaleProvider } from '@/lib/locale'
import { ThemeProvider } from '@/lib/theme'

import { SideEffectsPage } from './side-effects-page'

const loadPatientRecordById = vi.fn()
const loadSideEffects = vi.fn()
const createSideEffect = vi.fn()
const updateSideEffect = vi.fn()
const deleteSideEffect = vi.fn()

vi.mock('@/lib/patient-record-storage', () => ({
  loadPatientRecordById: (...args: unknown[]) => loadPatientRecordById(...args),
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
    <Routes>
      <Route element={<SideEffectsPage />} path="/record/:id/side-effects" />
    </Routes>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorageState.clear()
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

    expect(await screen.findByText('恶心')).toBeVisible()
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

    await waitFor(() => {
      expect(deleteSideEffect).toHaveBeenCalledWith('se-1')
      expect(loadSideEffects).toHaveBeenCalledTimes(2)
    })
  })

  it('backfills the form when editing an entry', async () => {
    loadSideEffects.mockResolvedValue([sampleEntry])
    renderPage()

    await userEvent.click(await screen.findByTestId('side-effect-edit-se-1'))

    expect(screen.getByTestId('side-effect-symptom-input')).toHaveValue('恶心')
    expect(screen.getByTestId('side-effect-severity-moderate')).toHaveAttribute('aria-pressed', 'true')
  })
})

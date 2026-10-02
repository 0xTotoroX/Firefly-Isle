/** @vitest-environment happy-dom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('@/lib/patient-record-storage', () => ({ loadPatientRecordById: mocks.load }))
vi.mock('@/lib/locale', () => ({ useLocale: () => ({ locale: 'zh' }) }))
vi.mock('@/lib/theme', () => ({ useTheme: () => ({ theme: 'light' }) }))
vi.mock('@/components/app-shell', () => ({ ArchiveSideNav: () => null, ClinicalTopBar: () => null }))
import { LabAnalyticsPage } from './lab-analytics-page'

function renderAnalytics() {
  return render(<MemoryRouter initialEntries={['/analytics/patient-a']}><Routes><Route path="/analytics/:id" element={<LabAnalyticsPage />} /></Routes></MemoryRouter>)
}
beforeEach(() => vi.clearAllMocks())
describe('analytics loading and recovery', () => {
  it('does not show empty or normal results while loading', async () => {
    let resolve!: (value: unknown) => void
    mocks.load.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    renderAnalytics()
    expect(screen.getByRole('status').textContent).toBe('正在读取指标数据…')
    expect(screen.queryByText('暂无已保存指标')).toBeNull()
    expect(screen.queryByText('最近一次异常指标')).toBeNull()
    await act(async () => resolve({ id: 'patient-a', treatmentLines: [], labResults: [] }))
    expect(await screen.findByText('暂无已保存指标')).toBeTruthy()
    expect(screen.getByRole('link', { name: '上传化验报告' }).getAttribute('href')).toBe('/app?patient=patient-a')
  })

  it('shows a recoverable failure without claiming no data and reloads the same patient', async () => {
    mocks.load.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ id: 'patient-a', treatmentLines: [], labResults: [{ category: 'blood-routine', itemCode: 'wbc', itemName: '白细胞', value: 4.2, unit: '10^9/L', testDate: '2026-10-02' }] })
    renderAnalytics()
    await screen.findByRole('alert')
    expect(screen.queryByText('暂无已保存指标')).toBeNull()
    expect(screen.queryByText('最近一次异常指标')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '重试读取指标' }))
    await waitFor(() => expect(screen.getAllByText('白细胞').length).toBeGreaterThan(0))
    expect(mocks.load.mock.calls).toEqual([['patient-a'], ['patient-a']])
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('link', { name: '为当前患者上传化验报告' }).getAttribute('href')).toBe('/app?patient=patient-a')
  })
})

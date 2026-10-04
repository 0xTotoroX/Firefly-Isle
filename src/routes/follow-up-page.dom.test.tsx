// @vitest-environment happy-dom
/**
 * [INPUT]: Testing Library、真实 FollowUpPage 与存储边界 mock。
 * [OUTPUT]: 随访表单恢复、日期校验、删除确认、状态修改与患者隔离回归。
 * [POS]: routes 的随访交互合同，数据库权限另由 test:database 验证。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { BackgroundAudioProvider } from '@/lib/background-audio'
import { LocaleProvider } from '@/lib/locale'
import { ThemeProvider } from '@/lib/theme'
import { FollowUpPage } from './follow-up-page'

const storage = vi.hoisted(() => ({ loadPatientRecordById: vi.fn(), loadFollowUpVisits: vi.fn(), createFollowUpVisit: vi.fn(), updateFollowUpVisit: vi.fn(), deleteFollowUpVisit: vi.fn(), setFollowUpStatus: vi.fn() }))
vi.mock('@/lib/patient-record-storage', () => ({ loadPatientRecordById: storage.loadPatientRecordById }))
vi.mock('@/lib/follow-up-storage', () => storage)
const localState = new Map<string, string>()
const localStorageMock = { getItem: (key: string) => localState.get(key) ?? null, setItem: (key: string, value: string) => { localState.set(key, value) }, removeItem: (key: string) => { localState.delete(key) }, clear: () => localState.clear() }
vi.stubGlobal('localStorage', localStorageMock)
Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorageMock })
const visit = { id: 'v1', patientId: 'p1', visitedOn: '2026-09-01', nextVisitOn: '2026-09-25', location: '门诊', doctor: '', conclusion: '保存的备注', nextPlan: '' }

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  storage.loadPatientRecordById.mockResolvedValue({ id: 'p1', basicInfo: { name: '测试病历' }, followUpStatus: 'treating', treatmentLines: [] })
  storage.loadFollowUpVisits.mockResolvedValue([visit])
  storage.createFollowUpVisit.mockResolvedValue(visit)
  storage.updateFollowUpVisit.mockResolvedValue(undefined)
  storage.deleteFollowUpVisit.mockResolvedValue(undefined)
  storage.setFollowUpStatus.mockResolvedValue(undefined)
})

function renderPage() {
  return render(<ThemeProvider><LocaleProvider><MemoryRouter initialEntries={['/record/p1/follow-up']}><BackgroundAudioProvider>
    <Link to="/record/p2/follow-up">Switch patient</Link>
    <Routes><Route path="/record/:id/follow-up" element={<FollowUpPage />} /></Routes>
  </BackgroundAudioProvider></MemoryRouter></LocaleProvider></ThemeProvider>)
}

it('edits a saved visit without creating another and preserves fields on failure', async () => {
  storage.updateFollowUpVisit.mockRejectedValueOnce(new Error('offline'))
  renderPage()
  await userEvent.click(await screen.findByTestId('follow-up-edit-v1'))
  expect(screen.getByLabelText('就诊日期')).toHaveValue('2026-09-01')
  await userEvent.clear(screen.getByLabelText('结论 / 备注'))
  await userEvent.type(screen.getByLabelText('结论 / 备注'), '新的备注')
  await userEvent.click(screen.getByTestId('follow-up-save-button'))
  expect(await screen.findByRole('alert')).toHaveTextContent('保存失败')
  expect(screen.getByLabelText('结论 / 备注')).toHaveValue('新的备注')
  await userEvent.click(screen.getByTestId('follow-up-save-button'))
  await waitFor(() => expect(storage.updateFollowUpVisit).toHaveBeenCalledTimes(2))
  expect(storage.updateFollowUpVisit).toHaveBeenLastCalledWith('v1', expect.objectContaining({ conclusion: '新的备注', visitedOn: '2026-09-01' }))
  expect(storage.createFollowUpVisit).not.toHaveBeenCalled()
})

it('validates calendar ordering before creating a visit', async () => {
  renderPage()
  fireEvent.change(await screen.findByLabelText('就诊日期'), { target: { value: '2026-09-12' } })
  fireEvent.change(screen.getByLabelText('下次复查日期'), { target: { value: '2026-09-11' } })
  await userEvent.click(screen.getByTestId('follow-up-save-button'))
  expect(screen.getByRole('alert')).toHaveTextContent('不能早于')
  expect(storage.createFollowUpVisit).not.toHaveBeenCalled()
  expect(screen.getByLabelText('下次复查日期')).toHaveAttribute('aria-invalid', 'true')
})

it('requires confirmation, keeps the dialog on failure, and retries deletion', async () => {
  storage.deleteFollowUpVisit.mockRejectedValueOnce(new Error('offline'))
  renderPage()
  await userEvent.click(await screen.findByTestId('follow-up-delete-v1'))
  expect(storage.deleteFollowUpVisit).not.toHaveBeenCalled()
  await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '取消' }))
  expect(storage.deleteFollowUpVisit).not.toHaveBeenCalled()
  await userEvent.click(screen.getByTestId('follow-up-delete-v1'))
  await userEvent.click(screen.getByRole('button', { name: '确认删除' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('删除失败')
  expect(screen.getByRole('alertdialog')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: '确认删除' }))
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  expect(storage.deleteFollowUpVisit).toHaveBeenCalledTimes(2)
})

it('recovers from failed loads and never renders a misleading empty state', async () => {
  storage.loadFollowUpVisits.mockRejectedValueOnce(new Error('offline'))
  renderPage()
  expect(await screen.findByRole('alert')).toHaveTextContent('随访记录读取失败')
  expect(screen.queryByTestId('follow-up-save-button')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '重新读取' }))
  expect(await screen.findByLabelText('就诊日期')).toBeVisible()
})

it('keeps the previous status after failure and updates it after retry', async () => {
  storage.setFollowUpStatus.mockRejectedValueOnce(new Error('offline'))
  renderPage()
  await userEvent.click(await screen.findByTestId('follow-up-status-completed'))
  expect(await screen.findByRole('alert')).toBeVisible()
  expect(screen.getByTestId('follow-up-status-treating')).toHaveAttribute('aria-pressed', 'true')
  storage.loadPatientRecordById.mockResolvedValue({ id: 'p1', basicInfo: {}, followUpStatus: 'completed' })
  await userEvent.click(screen.getByTestId('follow-up-status-completed'))
  await waitFor(() => expect(screen.getByTestId('follow-up-status-completed')).toHaveAttribute('aria-pressed', 'true'))
})

it('clears an edit draft when the patient route changes', async () => {
  renderPage()
  await userEvent.click(await screen.findByTestId('follow-up-edit-v1'))
  await userEvent.click(screen.getByRole('link', { name: 'Switch patient' }))
  expect(await screen.findByLabelText('结论 / 备注')).toHaveValue('')
  expect(storage.loadFollowUpVisits).toHaveBeenLastCalledWith('p2')
})

/** @vitest-environment happy-dom */
/**
 * [INPUT]: WorkspacePage、React 测试库、Router 及 OCR/提取/保存 mock。
 * [OUTPUT]: 主题/语言、草稿、OCR/追问/编辑互斥、只重试保存及过期恢复/账号结果的回归。
 * [POS]: 工作台状态稳定性与患者范围化验读回的生命周期测试。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ theme: 'light', locale: 'zh', extract: vi.fn(), save: vi.fn(async (...args: [import('@/types/patient').PatientRecord, string?, string?]) => args[0]), user: { id: 'test-user' }, latest: vi.fn(), byId: vi.fn(), ocr: vi.fn() }))
vi.mock('@/lib/theme', () => ({ useTheme: () => ({ theme: mocks.theme }) }))
vi.mock('@/lib/locale', () => ({ useLocale: () => ({ locale: mocks.locale }) }))
vi.mock('@/lib/auth', () => ({ useOptionalAuth: () => ({ user: mocks.user }) }))
vi.mock('@/lib/records/patient-record-storage', () => ({ loadLatestPatientRecord: mocks.latest, loadPatientRecordById: mocks.byId, persistPatientRecord: mocks.save }))
vi.mock('@/lib/extraction', async () => ({ ...await vi.importActual('@/lib/extraction'), extractPatientRecord: mocks.extract }))
vi.mock('@/lib/medical-document-ocr', () => ({ recognizeMedicalDocument: mocks.ocr, getMedicalDocumentOcrMessage: () => 'OCR failed' }))
vi.mock('@/components/app-shell', () => ({ ArchiveSideNav: () => null, ClinicalTopBar: () => null }))
vi.mock('@/components/system/surfaces', () => ({ MainShell: ({ children }: { children: ReactNode }) => <div>{children}</div>, PanelSurface: ({ children }: { children: ReactNode }) => <div>{children}</div>, SectionSurface: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('@/components/workspace/report-preview-frame', () => ({ ReportPreviewFrame: ({ isSaving, record, onCommitField }: ComponentProps<typeof import('@/components/workspace/report-preview-frame').ReportPreviewFrame>) => <><output aria-label="saving">{String(isSaving)}</output><output aria-label="record">{JSON.stringify(record)}</output><button onClick={() => onCommitField({ section: 'basicInfo', field: 'age' }, '63')}>修改年龄</button></> }))
vi.mock('@/components/workspace/lab-report-import', () => ({ LabReportImport: ({ record, onSaved }: ComponentProps<typeof import('@/components/workspace/lab-report-import').LabReportImport>) => <button onClick={() => void onSaved(record!.id!)}>完成化验保存</button> }))
vi.mock('@/components/workspace/extraction-composer', () => ({ ExtractionComposer: ({ error, extractionInput, onInputChange, onImportFile, onExtract, onExtractAsNew, onRetry, retryMode, ocrState }: ComponentProps<typeof import('@/components/workspace/extraction-composer').ExtractionComposer>) => <>
  <button onClick={onExtract}>提取示例</button>
  {onExtractAsNew ? <button onClick={onExtractAsNew}>新建另一病历</button> : null}
  <textarea aria-label="患者资料" value={extractionInput} onChange={(event) => onInputChange(event.target.value)} />
  <button onClick={() => onImportFile?.(new File(['synthetic'], 'synthetic.png', { type: 'image/png' }))}>识别示例</button>
  <output aria-label="待确认文字">{ocrState?.text}</output>
  <output aria-label="工作台错误">{error}</output>
  {retryMode === 'save' ? <button onClick={onRetry}>重试保存病历</button> : null}
</> }))
import { WorkspacePage } from './workspace-page'
function renderWorkspace(entry = '/app') {
  return render(<WorkspacePage />, { wrapper: ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter> })
}
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: 'test-user' }; mocks.locale = 'zh'; mocks.theme = 'light'; mocks.latest.mockResolvedValue(null); mocks.byId.mockResolvedValue(null); mocks.ocr.mockResolvedValue({ text: '合成 OCR 内容' }) })
describe('stable workspace state', () => {
  it('keeps a typed draft across both theme changes', async () => {
    const view = renderWorkspace()
    await waitFor(() => expect(mocks.latest).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText('患者资料'), { target: { value: '用户尚未提交的病历输入' } })
    mocks.theme = 'dark'; view.rerender(<WorkspacePage />)
    expect((screen.getByLabelText('患者资料') as HTMLTextAreaElement).value).toBe('用户尚未提交的病历输入')
    mocks.theme = 'light'; view.rerender(<WorkspacePage />)
    expect((screen.getByLabelText('患者资料') as HTMLTextAreaElement).value).toBe('用户尚未提交的病历输入')
  })
  it('keeps OCR text awaiting confirmation after switching theme', async () => {
    const view = renderWorkspace()
    fireEvent.click(screen.getByRole('button', { name: '识别示例' }))
    await waitFor(() => expect(screen.getByLabelText('待确认文字').textContent).toBe('合成 OCR 内容'))
    mocks.theme = 'dark'; view.rerender(<WorkspacePage />)
    expect(screen.getByLabelText('待确认文字').textContent).toBe('合成 OCR 内容')
  })
})

function pendingRecord() {
  let resolve!: (record: import('@/types/patient').PatientRecord) => void
  const promise = new Promise<import('@/types/patient').PatientRecord>((done) => { resolve = done })
  return { promise, resolve }
}
it('keeps saving across locale and same-user auth refresh', async () => {
  const record = { id: 'record-a', basicInfo: { name: 'Original' }, treatmentLines: [] }
  mocks.latest.mockResolvedValue(record)
  const pending = pendingRecord(); mocks.save.mockImplementationOnce(() => pending.promise)
  const view = renderWorkspace()
  await waitFor(() => expect(screen.getByLabelText('record').textContent).toContain('Original'))
  fireEvent.click(screen.getByText('修改年龄'))
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
  mocks.locale = 'en'; mocks.user = { id: 'test-user' }; view.rerender(<WorkspacePage />)
  await act(async () => pending.resolve(mocks.save.mock.calls[0][0]))
  await waitFor(() => expect(screen.getByLabelText('saving').textContent).toBe('false'))
  expect(mocks.latest).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText('record').textContent).toContain('63')
})
it('discards an old account extraction before any persistence call', async () => {
  const pending = pendingRecord(); mocks.extract.mockReturnValueOnce(pending.promise)
  const view = renderWorkspace()
  fireEvent.change(screen.getByLabelText('患者资料'), { target: { value: '合成账号 A 输入' } })
  fireEvent.click(screen.getByText('提取示例'))
  await waitFor(() => expect(mocks.extract).toHaveBeenCalledTimes(1))
  mocks.user = { id: 'other-user' }; view.rerender(<WorkspacePage />)
  await act(async () => pending.resolve({ basicInfo: { name: 'A private draft' }, treatmentLines: [] }))
  expect(mocks.save).not.toHaveBeenCalled()
  expect((screen.getByLabelText('患者资料') as HTMLTextAreaElement).value).toBe('')
})
it('blocks a second follow-up while the first model request is pending', async () => {
  const record = { id: 'record-a', basicInfo: { name: 'Original' }, treatmentLines: [] }
  mocks.latest.mockResolvedValue(record)
  const pending = pendingRecord(); mocks.extract.mockReturnValueOnce(pending.promise)
  renderWorkspace()
  const field = await screen.findByPlaceholderText('一次性补充缺失信息...')
  fireEvent.change(field, { target: { value: '第一条补充' } })
  fireEvent.click(screen.getByText('提交补充'))
  expect((screen.getByText('提交补充') as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByText('提交补充'))
  expect(mocks.extract).toHaveBeenCalledTimes(1)
  await act(async () => pending.resolve(record))
  expect(mocks.save).toHaveBeenCalledTimes(1)
})

it('retries an initial extraction save without another model call', async () => {
  const record = { basicInfo: { name: '合成患者' }, treatmentLines: [] }
  mocks.extract.mockResolvedValueOnce(record)
  mocks.save.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...record, id: 'saved-patient' })
  renderWorkspace()
  fireEvent.change(screen.getByLabelText('患者资料'), { target: { value: '合成提取输入' } })
  fireEvent.click(screen.getByRole('button', { name: '提取示例' }))
  fireEvent.click(await screen.findByRole('button', { name: '重试保存病历' }))
  await waitFor(() => expect(screen.getByLabelText('record').textContent).toContain('saved-patient'))
  expect(mocks.extract).toHaveBeenCalledTimes(1)
  expect(mocks.save).toHaveBeenCalledTimes(2)
  expect(mocks.save.mock.calls[1][0]).toEqual(record)
  const requestId = mocks.save.mock.calls[0][2]
  expect(requestId).toMatch(/^[0-9a-f-]{36}$/)
  expect(mocks.save.mock.calls[1][2]).toBe(requestId)
})

it('loads the explicit patient and reloads their saved lab data without creating a patient', async () => {
  const record = { id: 'patient-b', basicInfo: { name: '指定患者' }, treatmentLines: [] }
  mocks.byId.mockResolvedValueOnce(record).mockResolvedValueOnce({ ...record, labResults: [{ itemCode: 'wbc', value: 4.2 }] })
  renderWorkspace('/app?patient=patient-b')
  await waitFor(() => expect(screen.getByLabelText('record').textContent).toContain('指定患者'))
  fireEvent.click(screen.getByRole('button', { name: '完成化验保存' }))
  await waitFor(() => expect(screen.getByLabelText('record').textContent).toContain('wbc'))
  expect(mocks.byId.mock.calls).toEqual([['patient-b'], ['patient-b']])
  expect(mocks.latest).not.toHaveBeenCalled()
  expect(mocks.extract).not.toHaveBeenCalled()
  expect(mocks.save).not.toHaveBeenCalled()
})

it('uses a fresh request id for each new draft and after changing accounts', async () => {
  const record = { basicInfo: { name: '合成患者' }, treatmentLines: [] }
  mocks.extract.mockResolvedValue(record)
  mocks.save.mockImplementation(async (draft) => ({ ...draft, id: 'saved-patient' }))
  const view = renderWorkspace()
  fireEvent.change(screen.getByLabelText('患者资料'), { target: { value: '第一份新病历' } })
  fireEvent.click(screen.getByRole('button', { name: '提取示例' }))
  fireEvent.click(await screen.findByRole('button', { name: '新建另一病历' }))
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2))
  mocks.user = { id: 'another-user' }; view.rerender(<WorkspacePage />)
  fireEvent.change(screen.getByLabelText('患者资料'), { target: { value: '新账号病历' } })
  fireEvent.click(screen.getByRole('button', { name: '提取示例' }))
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(3))
  expect(new Set(mocks.save.mock.calls.map((call) => call[2])).size).toBe(3)
  expect(mocks.save.mock.calls[2][1]).toBe('another-user')
})


it('holds follow-up and field edits until the pending OCR operation finishes', async () => {
  const record = { id: 'record-a', basicInfo: { name: 'Synthetic patient' }, treatmentLines: [] }
  mocks.latest.mockResolvedValue(record)
  let finishOcr!: (result: { text: string }) => void
  mocks.ocr.mockReturnValueOnce(new Promise<{ text: string }>((resolve) => { finishOcr = resolve }))
  renderWorkspace()
  const answer = await screen.findByPlaceholderText('一次性补充缺失信息...')
  fireEvent.click(screen.getByRole('button', { name: '识别示例' }))
  fireEvent.change(answer, { target: { value: '合成追问回答' } })
  fireEvent.click(screen.getByRole('button', { name: '提交补充' }))
  fireEvent.click(screen.getByRole('button', { name: '修改年龄' }))
  expect(mocks.extract).not.toHaveBeenCalled()
  expect(mocks.save).not.toHaveBeenCalled()
  await act(async () => finishOcr({ text: '合成 OCR 内容' }))
  expect(screen.getByLabelText('待确认文字').textContent).toBe('合成 OCR 内容')
  fireEvent.click(screen.getByRole('button', { name: '修改年龄' }))
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
})

it('starts only one OCR request when import is invoked twice before completion', async () => {
  let finishOcr!: (result: { text: string }) => void
  mocks.ocr.mockReturnValueOnce(new Promise<{ text: string }>((resolve) => { finishOcr = resolve }))
  renderWorkspace()
  fireEvent.click(screen.getByRole('button', { name: '识别示例' }))
  fireEvent.click(screen.getByRole('button', { name: '识别示例' }))
  expect(mocks.ocr).toHaveBeenCalledTimes(1)
  await act(async () => finishOcr({ text: '合成 OCR 内容' }))
  expect(screen.getByLabelText('待确认文字').textContent).toBe('合成 OCR 内容')
})

it('drops pending OCR text when the account changes and accepts the new account import', async () => {
  let finishOcr!: (result: { text: string }) => void
  mocks.ocr.mockReturnValueOnce(new Promise<{ text: string }>((resolve) => { finishOcr = resolve }))
  const view = renderWorkspace()
  fireEvent.click(screen.getByRole('button', { name: '识别示例' }))
  mocks.user = { id: 'another-user' }
  view.rerender(<WorkspacePage />)
  await act(async () => finishOcr({ text: '旧账号合成 OCR 内容' }))
  expect(screen.getByLabelText('待确认文字').textContent).toBe('')
  fireEvent.click(screen.getByRole('button', { name: '识别示例' }))
  await waitFor(() => expect(screen.getByLabelText('待确认文字').textContent).toBe('合成 OCR 内容'))
  expect(mocks.save).not.toHaveBeenCalled()
})


it('ignores a late initial-load failure once a new extraction owns the workspace', async () => {
  let failLoad!: (error: Error) => void
  mocks.latest.mockReturnValueOnce(new Promise((_, reject) => { failLoad = reject }))
  const extraction = pendingRecord()
  mocks.extract.mockReturnValueOnce(extraction.promise)
  renderWorkspace()
  await waitFor(() => expect(mocks.latest).toHaveBeenCalledTimes(1))
  fireEvent.change(screen.getByLabelText('患者资料'), { target: { value: '新病历合成输入' } })
  fireEvent.click(screen.getByRole('button', { name: '提取示例' }))
  await act(async () => failLoad(new Error('late load failure')))
  expect(screen.getByLabelText('工作台错误').textContent).toBe('')
  await act(async () => extraction.resolve({ basicInfo: { name: 'New synthetic record' }, treatmentLines: [] }))
  expect(screen.getByLabelText('record').textContent).toContain('New synthetic record')
})

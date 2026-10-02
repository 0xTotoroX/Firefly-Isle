/** @vitest-environment happy-dom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ theme: 'light', locale: 'zh', extract: vi.fn(), save: vi.fn(async (record) => record), user: { id: 'test-user' }, latest: vi.fn(), ocr: vi.fn() }))
vi.mock('@/lib/theme', () => ({ useTheme: () => ({ theme: mocks.theme }) }))
vi.mock('@/lib/locale', () => ({ useLocale: () => ({ locale: mocks.locale }) }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('@/lib/patient-record-storage', () => ({ loadLatestPatientRecord: mocks.latest, persistPatientRecord: mocks.save }))
vi.mock('@/lib/extraction', async () => ({ ...await vi.importActual('@/lib/extraction'), extractPatientRecord: mocks.extract }))
vi.mock('@/lib/medical-document-ocr', () => ({ recognizeMedicalDocument: mocks.ocr, getMedicalDocumentOcrMessage: () => 'OCR failed' }))
vi.mock('@/components/app-shell', () => ({ ArchiveSideNav: () => null, ClinicalTopBar: () => null }))
vi.mock('@/components/system/surfaces', () => ({ MainShell: ({ children }: { children: ReactNode }) => <div>{children}</div>, PanelSurface: ({ children }: { children: ReactNode }) => <div>{children}</div>, SectionSurface: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('@/components/workspace/report-preview-frame', () => ({ ReportPreviewFrame: ({ isSaving, record, onCommitField }: ComponentProps<typeof import('@/components/workspace/report-preview-frame').ReportPreviewFrame>) => <><output aria-label="saving">{String(isSaving)}</output><output aria-label="record">{JSON.stringify(record)}</output><button onClick={() => onCommitField({ section: 'basicInfo', field: 'age' }, '63')}>修改年龄</button></> }))
vi.mock('@/components/workspace/extraction-composer', () => ({ ExtractionComposer: ({ extractionInput, onInputChange, onImportFile, onExtract, ocrState }: { onExtract: () => void; extractionInput: string; onInputChange: (value: string) => void; onImportFile: (file: File) => void; ocrState: { text: string | null } }) => <>
  <button onClick={onExtract}>提取示例</button>
  <textarea aria-label="患者资料" value={extractionInput} onChange={(event) => onInputChange(event.target.value)} />
  <button onClick={() => onImportFile(new File(['synthetic'], 'synthetic.png', { type: 'image/png' }))}>识别示例</button>
  <output aria-label="待确认文字">{ocrState.text}</output>
</> }))
import { WorkspacePage } from './workspace-page'
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: 'test-user' }; mocks.locale = 'zh'; mocks.theme = 'light'; mocks.latest.mockResolvedValue(null); mocks.ocr.mockResolvedValue({ text: '合成 OCR 内容' }) })
describe('stable workspace state', () => {
  it('keeps a typed draft across both theme changes', async () => {
    const view = render(<WorkspacePage />)
    await waitFor(() => expect(mocks.latest).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText('患者资料'), { target: { value: '用户尚未提交的病历输入' } })
    mocks.theme = 'dark'; view.rerender(<WorkspacePage />)
    expect((screen.getByLabelText('患者资料') as HTMLTextAreaElement).value).toBe('用户尚未提交的病历输入')
    mocks.theme = 'light'; view.rerender(<WorkspacePage />)
    expect((screen.getByLabelText('患者资料') as HTMLTextAreaElement).value).toBe('用户尚未提交的病历输入')
  })
  it('keeps OCR text awaiting confirmation after switching theme', async () => {
    const view = render(<WorkspacePage />)
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
  const view = render(<WorkspacePage />)
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
  const view = render(<WorkspacePage />)
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
  render(<WorkspacePage />)
  const field = await screen.findByPlaceholderText('一次性补充缺失信息...')
  fireEvent.change(field, { target: { value: '第一条补充' } })
  fireEvent.click(screen.getByText('提交补充'))
  expect((screen.getByText('提交补充') as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByText('提交补充'))
  expect(mocks.extract).toHaveBeenCalledTimes(1)
  await act(async () => pending.resolve(record))
  expect(mocks.save).toHaveBeenCalledTimes(1)
})

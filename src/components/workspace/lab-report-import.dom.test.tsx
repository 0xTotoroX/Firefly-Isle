/** @vitest-environment happy-dom */
/**
 * [INPUT]: React 测试库、LabReportImport、内存 Router 和注入 OCR/保存 mock。
 * [OUTPUT]: 未知指标复核、重复确认、失败保留草稿和保存后读回重试的 DOM 回归。
 * [POS]: 患者范围的化验审核交互测试；只用合成资料和 mock 服务。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ ocr: vi.fn(), save: vi.fn() }))
vi.mock('@/lib/locale', () => ({ useLocale: () => ({ locale: 'zh' }) }))
vi.mock('@/lib/medical-document-ocr', () => ({ recognizeMedicalDocument: mocks.ocr, getMedicalDocumentOcrMessage: () => '识别失败' }))
vi.mock('@/lib/labs/lab-report-storage', () => ({ saveLabReportBatch: mocks.save }))
import { LabReportImport } from './lab-report-import'

const patient = { id: 'patient-a', basicInfo: { name: '合成患者甲' }, treatmentLines: [] }
function renderImport(onSaved: (patientId: string) => Promise<void> = vi.fn(async () => undefined)) {
  const onActiveChange = vi.fn()
  const view = render(<MemoryRouter><LabReportImport disabled={false} onActiveChange={onActiveChange} onSaved={onSaved} record={patient} theme="light" /></MemoryRouter>)
  return { ...view, onSaved, onActiveChange }
}
async function upload(text = '检查日期 2026-10-02\n白细胞 4.2 参考范围 3.5-9.5') {
  mocks.ocr.mockResolvedValueOnce({ text })
  fireEvent.change(screen.getByLabelText('报告图片或 PDF'), { target: { files: [new File(['synthetic'], 'synthetic.png', { type: 'image/png' })] } })
  await screen.findByRole('table', { name: '化验指标审核' })
}
const saveButton = () => screen.getByRole('button', { name: '确认并保存化验报告' }) as HTMLButtonElement
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue({ status: 'saved', batch: { id: 'batch-a' }, readings: [] }) })

describe('patient-scoped lab report review', () => {
  it.each([
    ['blood-routine', '白细胞 4.2', 'wbc'],
    ['blood-biochemistry', '丙氨酸氨基转移酶 25', 'alt'],
    ['tumor-marker', 'CEA 6.2', 'cea'],
  ])('reviews and saves %s under the visible current patient', async (category, line, code) => {
    const { onSaved, onActiveChange } = renderImport()
    expect(screen.getByRole('link', { name: '合成患者甲' }).getAttribute('href')).toBe('/record/patient-a')
    fireEvent.change(screen.getByLabelText('报告类型'), { target: { value: category } })
    await upload(`2026-10-02\n${line}`)
    expect(mocks.save).not.toHaveBeenCalled()
    expect(onActiveChange).toHaveBeenCalledWith(true)
    fireEvent.click(saveButton())
    await screen.findByText('化验报告已保存。')
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ batch: expect.objectContaining({ patientId: 'patient-a', category, testDate: '2026-10-02', ocrText: `2026-10-02\n${line}`, sourceFileName: 'synthetic.png' }), readings: expect.arrayContaining([expect.objectContaining({ itemCode: code })]), replaceExisting: false }))
    expect(onSaved).toHaveBeenCalledWith('patient-a')
    expect(onActiveChange).toHaveBeenLastCalledWith(false)
  })

  it('requires unknown rows to be mapped or excluded and validates edits before saving', async () => {
    renderImport()
    await upload('2026-10-02\n未知指标 4.2\n另一个未知项目 8')
    expect(saveButton().disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('指标 1'), { target: { value: 'wbc' } })
    fireEvent.click(screen.getByLabelText('保存第 2 行'))
    fireEvent.change(screen.getByLabelText('数值 1'), { target: { value: 'bad' } })
    expect(saveButton().disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('数值 1'), { target: { value: '5.1' } })
    fireEvent.change(screen.getByLabelText('参考下限 1'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('参考上限 1'), { target: { value: '2' } })
    expect(saveButton().disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('参考下限 1'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('检查日期 1'), { target: { value: '' } })
    expect(saveButton().disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('统一检查日期'), { target: { value: '2026-10-03' } })
    fireEvent.click(saveButton())
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
    expect(mocks.save.mock.calls[0][0].readings).toEqual([expect.objectContaining({ itemCode: 'wbc', value: 5.1, referenceLow: 1, referenceHigh: 2, testDate: '2026-10-03' })])
  })

  it('does not replace a duplicate until the user explicitly confirms', async () => {
    mocks.save.mockResolvedValueOnce({ status: 'duplicate', existingBatch: { id: 'existing' } }).mockResolvedValueOnce({ status: 'duplicate', existingBatch: { id: 'existing' } })
    const { onSaved } = renderImport()
    await upload()
    fireEvent.click(saveButton())
    await screen.findByRole('button', { name: '确认替换已有批次' })
    expect(onSaved).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '取消替换' }))
    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect((screen.getByLabelText('数值 1') as HTMLInputElement).value).toBe('4.2')
    fireEvent.click(saveButton())
    fireEvent.click(await screen.findByRole('button', { name: '确认替换已有批次' }))
    await screen.findByText('化验报告已保存。')
    expect(mocks.save.mock.calls.map((call) => call[0].replaceExisting)).toEqual([false, false, true])
  })

  it('preserves reviewed values after a save failure and retries without repeating OCR', async () => {
    mocks.save.mockRejectedValueOnce(new Error('offline'))
    renderImport()
    await upload()
    fireEvent.change(screen.getByLabelText('数值 1'), { target: { value: '6.3' } })
    fireEvent.click(saveButton())
    await screen.findByText('未能保存化验报告，已保留审核内容。请重试保存。')
    expect((screen.getByLabelText('数值 1') as HTMLInputElement).value).toBe('6.3')
    fireEvent.click(saveButton())
    await screen.findByText('化验报告已保存。')
    expect(mocks.ocr).toHaveBeenCalledTimes(1)
    expect(mocks.save).toHaveBeenCalledTimes(2)
    expect(mocks.save.mock.calls[1][0].readings[0].value).toBe(6.3)
  })

  it('retries only the readback when saving succeeded but refreshing failed', async () => {
    const onSaved = vi.fn().mockRejectedValueOnce(new Error('read failed')).mockResolvedValue(undefined)
    renderImport(onSaved)
    await upload()
    fireEvent.click(saveButton())
    await screen.findByText('报告已保存，当前病历读取失败。请重试刷新。')
    fireEvent.click(screen.getByRole('button', { name: '重试刷新病历' }))
    await screen.findByText('化验报告已保存。')
    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(onSaved).toHaveBeenCalledTimes(2)
  })

  it('discards late OCR results after switching patient', async () => {
    let resolve!: (value: { text: string }) => void
    mocks.ocr.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const props = { disabled: false, onActiveChange: vi.fn(), onSaved: vi.fn(), theme: 'light' as const }
    const view = render(<MemoryRouter><LabReportImport {...props} key="a" record={patient} /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('报告图片或 PDF'), { target: { files: [new File(['a'], 'a.png', { type: 'image/png' })] } })
    view.rerender(<MemoryRouter><LabReportImport {...props} record={{ ...patient, id: 'patient-b', basicInfo: { name: '合成患者乙' } }} /></MemoryRouter>)
    await act(async () => resolve({ text: '2026-10-02\n白细胞 4.2' }))
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByRole('link', { name: '合成患者乙' }).getAttribute('href')).toBe('/record/patient-b')
    expect(mocks.save).not.toHaveBeenCalled()
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

it('keeps each file independently reviewable when one OCR request fails', async () => {
  mocks.ocr.mockResolvedValueOnce({ text: '2026-10-01\n白细胞 4.2' }).mockRejectedValueOnce(new Error('bad image')).mockResolvedValueOnce({ text: '2026-10-03\n白细胞 6.2' })
  renderImport()
  const input = screen.getByLabelText('报告图片或 PDF') as HTMLInputElement
  expect(input.multiple).toBe(true)
  fireEvent.change(input, { target: { files: ['a.png', 'b.png', 'c.png'].map((name) => new File(['synthetic'], name, { type: 'image/png' })) } })
  await screen.findByRole('button', { name: 'c.png · 待审核' })
  fireEvent.click(saveButton())
  await screen.findByRole('button', { name: 'a.png · 已保存' })
  await screen.findByText('识别失败')
  mocks.ocr.mockResolvedValueOnce({ text: '2026-10-02\n白细胞 5.2' })
  fireEvent.click(screen.getByRole('button', { name: '重试识别' }))
  await waitFor(() => expect(saveButton().disabled).toBe(false))
  fireEvent.click(saveButton())
  await screen.findByRole('button', { name: 'b.png · 已保存' })
  await waitFor(() => expect((screen.getByLabelText('数值 1') as HTMLInputElement).value).toBe('6.2'))
  fireEvent.click(saveButton())
  await screen.findByText('化验报告已保存。')
  expect(mocks.ocr.mock.calls.map(([file]) => file.name)).toEqual(['a.png', 'b.png', 'c.png', 'b.png'])
  expect(mocks.save.mock.calls.map(([input]) => [input.batch.sourceFileName, input.batch.testDate])).toEqual([['a.png', '2026-10-01'], ['b.png', '2026-10-02'], ['c.png', '2026-10-03']])
})

it('resets units and reference limits when changing the indicator and requires a new duplicate check', async () => {
  mocks.save.mockResolvedValueOnce({ status: 'duplicate', existingBatch: { id: 'existing' } })
  renderImport()
  await upload()
  fireEvent.click(saveButton())
  await screen.findByRole('button', { name: '确认替换已有批次' })
  fireEvent.change(screen.getByLabelText('指标 1'), { target: { value: 'hemoglobin' } })
  expect((screen.getByLabelText('单位 1') as HTMLInputElement).value).toBe('g/L')
  expect((screen.getByLabelText('参考下限 1') as HTMLInputElement).value).toBe('115')
  expect((screen.getByLabelText('参考上限 1') as HTMLInputElement).value).toBe('150')
  expect(screen.queryByRole('button', { name: '确认替换已有批次' })).toBeNull()
  fireEvent.click(saveButton())
  await screen.findByText('化验报告已保存。')
  expect(mocks.save.mock.calls[1][0].replaceExisting).toBe(false)
})

it('coalesces refresh clicks and leaves a later draft intact', async () => {
  const pending = deferred<void>()
  const onSaved = vi.fn(() => pending.promise)
  renderImport(onSaved)
  await upload()
  fireEvent.click(saveButton())
  const retry = await screen.findByRole('button', { name: '重试刷新病历' })
  expect((retry as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(retry)
  fireEvent.click(retry)
  expect(onSaved).toHaveBeenCalledTimes(1)
  await act(async () => pending.resolve())
  await screen.findByText('化验报告已保存。')
  await upload('2026-10-03\n白细胞 7.2')
  expect((screen.getByLabelText('数值 1') as HTMLInputElement).value).toBe('7.2')
  expect(onSaved).toHaveBeenCalledTimes(1)
})

it('ignores a previous patient refresh completing during the next patient review', async () => {
  const pending = deferred<void>()
  const onSaved = vi.fn(() => pending.promise)
  const onActiveChange = vi.fn()
  const view = render(<MemoryRouter><LabReportImport disabled={false} onActiveChange={onActiveChange} onSaved={onSaved} record={patient} theme="light" /></MemoryRouter>)
  await upload()
  fireEvent.click(saveButton())
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  view.rerender(<MemoryRouter><LabReportImport disabled={false} onActiveChange={onActiveChange} onSaved={onSaved} record={{ ...patient, id: 'patient-b' }} theme="light" /></MemoryRouter>)
  await upload('2026-10-03\n白细胞 7.2')
  await act(async () => pending.resolve())
  expect((screen.getByLabelText('数值 1') as HTMLInputElement).value).toBe('7.2')
  expect(screen.queryByText('化验报告已保存。')).toBeNull()
})

it('does not refresh an earlier report while another report is still saving', async () => {
  const secondSave = deferred<{ status: string }>()
  mocks.ocr.mockResolvedValueOnce({ text: '2026-10-01\n白细胞 4.2' }).mockResolvedValueOnce({ text: '2026-10-02\n白细胞 5.2' })
  mocks.save.mockResolvedValueOnce({ status: 'saved' }).mockReturnValueOnce(secondSave.promise)
  let secondCommitted = false
  const readCommitStates: boolean[] = []
  const onSaved = vi.fn(async () => { readCommitStates.push(secondCommitted) })
  renderImport(onSaved)
  fireEvent.change(screen.getByLabelText('报告图片或 PDF'), { target: { files: ['a.png', 'b.png'].map((name) => new File(['synthetic'], name, { type: 'image/png' })) } })
  await screen.findByRole('button', { name: 'b.png · 待审核' })
  fireEvent.click(saveButton())
  await waitFor(() => expect((screen.getByLabelText('检查日期 1') as HTMLInputElement).value).toBe('2026-10-02'))
  fireEvent.click(saveButton())
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2))
  fireEvent.click(screen.getByRole('button', { name: 'a.png · 已保存' }))
  const refresh = screen.getByRole('button', { name: '重试刷新病历' }) as HTMLButtonElement
  expect(refresh.disabled).toBe(true)
  fireEvent.click(refresh)
  expect(onSaved).toHaveBeenCalledTimes(1)
  secondCommitted = true
  await act(async () => secondSave.resolve({ status: 'saved' }))
  await screen.findByText('化验报告已保存。')
  expect(readCommitStates).toEqual([false, true])
  expect(mocks.save.mock.calls.map(([input]) => input.batch.sourceFileName)).toEqual(['a.png', 'b.png'])
})

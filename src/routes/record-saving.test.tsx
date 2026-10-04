/** @vitest-environment happy-dom */
/**
 * [INPUT]: RecordPage、Router、React 测试库及延迟/失败的病历保存 mock。
 * [OUTPUT]: 连续保存、失败恢复、语言切换和迟到患者响应隔离的 DOM 回归。
 * [POS]: 病历编排与字段队列的真实 React 生命周期测试。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import type { PatientRecord } from '@/types/patient'
const mocks = vi.hoisted(() => ({ locale: 'zh', load: vi.fn(), save: vi.fn() }))
vi.mock('@/lib/locale', () => ({ useLocale: () => ({ locale: mocks.locale }) }))
vi.mock('@/lib/theme', () => ({ useTheme: () => ({ theme: 'dark' }) }))
vi.mock('@/components/app-shell', () => ({ ArchiveSideNav: () => null, ClinicalTopBar: () => null }))
vi.mock('@/components/system/surfaces', () => ({ MainShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('@/lib/patient-record-storage', () => ({ persistPatientRecord: mocks.save }))
vi.mock('@/lib/record-sharing', () => ({ listRecordShares: vi.fn(async () => []), createRecordShare: vi.fn(), revokeRecordShare: vi.fn() }))
vi.mock('./record-page.logic', async () => ({ ...await vi.importActual('./record-page.logic'), loadPatientRecordById: mocks.load }))
vi.mock('./record-page.view', () => ({ RecordPageContent: (props: ComponentProps<typeof import('./record-page.view').RecordPageContent>) => <>
  <output aria-label="record">{JSON.stringify(props.activeRecordLoadState.record)}</output>
  <output aria-label="save">{props.saveState.status}</output>
  <button onClick={() => void props.onCommitField?.({ section: 'basicInfo', field: 'name' }, '新姓名')}>改姓名</button>
  <button onClick={() => void props.onCommitField?.({ section: 'basicInfo', field: 'age' }, '63')}>改年龄</button>
  <Link to="/record/b">另一病历</Link>
</> }))
import { RecordPage } from './record-page'
const initial: PatientRecord = { id: 'a', basicInfo: { name: '原姓名', age: 50 }, treatmentLines: [] }
function deferred() {
  let resolve!: (record: PatientRecord) => void
  let reject!: (error: Error) => void
  const promise = new Promise<PatientRecord>((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}
function page() { return <MemoryRouter initialEntries={['/record/a']}><Routes><Route path="/record/:id" element={<RecordPage userId="owner-a" />} /></Routes></MemoryRouter> }
beforeEach(() => { vi.clearAllMocks(); mocks.locale = 'zh'; mocks.load.mockImplementation(async (id) => ({ ...initial, id })); mocks.save.mockImplementation(async (record) => record) })
it('serializes rapid edits and renders both saved values', async () => {
  const first = deferred(); mocks.save.mockImplementationOnce(() => first.promise)
  render(page()); await waitFor(() => expect(screen.getByLabelText('record').textContent).toContain('原姓名'))
  fireEvent.click(screen.getByText('改姓名')); fireEvent.click(screen.getByText('改年龄'))
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
  await act(async () => first.resolve(mocks.save.mock.calls[0][0]))
  await waitFor(() => expect(screen.getByLabelText('save').textContent).toBe('saved'))
  expect(mocks.save).toHaveBeenLastCalledWith(expect.objectContaining({ basicInfo: expect.objectContaining({ name: '新姓名', age: 63 }) }), 'owner-a')
  expect(JSON.parse(screen.getByLabelText('record').textContent!)).toMatchObject({ basicInfo: { name: '新姓名', age: 63 } })
})
it('a failed earlier edit cannot roll back the following successful edit', async () => {
  const first = deferred(); mocks.save.mockImplementationOnce(() => first.promise)
  render(page()); await waitFor(() => expect(screen.getByLabelText('record').textContent).toContain('原姓名'))
  fireEvent.click(screen.getByText('改姓名')); fireEvent.click(screen.getByText('改年龄'))
  await act(async () => first.reject(new Error('offline')))
  await waitFor(() => expect(screen.getByLabelText('save').textContent).toBe('saved'))
  expect(JSON.parse(screen.getByLabelText('record').textContent!)).toMatchObject({ basicInfo: { name: '原姓名', age: 63 } })
})
it('language changes keep an in-flight save and do not reload the record', async () => {
  const first = deferred(); mocks.save.mockImplementationOnce(() => first.promise)
  const view = render(page()); await waitFor(() => expect(screen.getByLabelText('record').textContent).toContain('原姓名'))
  fireEvent.click(screen.getByText('改姓名')); await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
  mocks.locale = 'en'; view.rerender(page())
  await act(async () => first.resolve(mocks.save.mock.calls[0][0]))
  await waitFor(() => expect(screen.getByLabelText('save').textContent).toBe('saved'))
  expect(mocks.load).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText('record').textContent).toContain('新姓名')
})
it('late save completion cannot replace the newly opened patient', async () => {
  const first = deferred(); mocks.save.mockImplementationOnce(() => first.promise)
  render(page()); await waitFor(() => expect(screen.getByLabelText('record').textContent).toContain('原姓名'))
  fireEvent.click(screen.getByText('改姓名')); await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
  fireEvent.click(screen.getByText('另一病历')); await waitFor(() => expect(JSON.parse(screen.getByLabelText('record').textContent!).id).toBe('b'))
  await act(async () => first.resolve(mocks.save.mock.calls[0][0]))
  expect(JSON.parse(screen.getByLabelText('record').textContent!)).toMatchObject({ id: 'b', basicInfo: { name: '原姓名' } })
})

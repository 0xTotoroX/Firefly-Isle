// @vitest-environment happy-dom
/**
 * [INPUT]: 真实 RecordPageContent、虚构病历、Testing Library 与 MemoryRouter。
 * [OUTPUT]: 病历页签键盘导航、患者链接和默认折叠分享的行为合同。
 * [POS]: routes 的记录阅读导航回归，不调用存储或创建分享。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { LocaleProvider } from '@/lib/locale'
import { demoPatientRecord } from '@/components/record/demo-record'
import { RecordPageContent, type RecordViewMode } from './record-page.view'

const localStorageMock = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
vi.stubGlobal('localStorage', localStorageMock)
Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorageMock })

function Page() {
  const [viewMode, setViewMode] = useState<RecordViewMode>('dossier')
  const recordRef = useRef<HTMLDivElement>(null)
  return <LocaleProvider><MemoryRouter><RecordPageContent
    activeRecordLoadState={{ error: null, isLoading: false, record: { ...demoPatientRecord, id: 'p1' }, recordId: 'p1' }}
    demoRecord={demoPatientRecord} onCommitField={() => undefined} onCommitRange={() => undefined}
    demoRoute={false} exportState={{ error: null, format: null, isExporting: false }} isChartEditing={false} locale="zh"
    onCreateShare={() => undefined} onCopyShareUrl={() => undefined} onRevokeShare={() => undefined}
    onChartEditingChange={() => undefined} onExport={() => undefined} onViewModeChange={setViewMode} recordRef={recordRef}
    saveState={{ error: null, status: 'idle' }} theme="light" viewMode={viewMode}
    shareState={{ createdUrl: null, error: null, isCreating: false, isLoading: false, revokingShareId: null, shares: [] }}
  /></MemoryRouter></LocaleProvider>
}

it('supports End and arrow keys while preserving focus on the selected tab', async () => {
  render(<Page />)
  await userEvent.click(screen.getByRole('tab', { name: '档案视图' }))
  await userEvent.keyboard('{End}')
  expect(screen.getByRole('tab', { name: '甘特图视图' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tab', { name: '甘特图视图' })).toHaveFocus()
  await userEvent.keyboard('{ArrowLeft}')
  expect(screen.getByRole('tab', { name: '极简表格' })).toHaveAttribute('aria-selected', 'true')
  await userEvent.keyboard('{Home}')
  expect(screen.getByRole('tab', { name: '档案视图' })).toHaveAttribute('aria-selected', 'true')
})

it('keeps patient-scoped links and sharing collapsed above the dossier', () => {
  const { container } = render(<Page />)
  expect(screen.getByRole('navigation', { name: '当前病历导航' })).toBeVisible()
  expect(screen.getByRole('link', { name: '返回工作台' })).toHaveAttribute('href', '/app?patient=p1')
  expect(screen.getByTestId('record-follow-up-link')).toHaveAttribute('href', '/record/p1/follow-up')
  expect(container.querySelector('details')).not.toHaveAttribute('open')
  expect(screen.getByText('展开分享设置')).toBeVisible()
  expect(screen.queryByText(/hash/)).not.toBeInTheDocument()
})

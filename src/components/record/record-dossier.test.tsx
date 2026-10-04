/**
 * @vitest-environment happy-dom
 * [INPUT]: 虚构病历、MemoryRouter 与真实 RecordDossier 组件。
 * [OUTPUT]: 长病历章节/阶段定位、导出排除和失败反馈回归。
 * [POS]: record 阅读交互测试，不访问真实账号或后端。
 * [PROTOCOL]: 阅读行为变化时同步本测试与目录 AGENTS.md。
 */
import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { demoPatientRecord } from './demo-record'
import { RecordDossier, RecordUnavailableDossier } from './record-dossier'

const exportProps = { exportError: null, exportFormat: null, isExporting: false, locale: 'zh' as const, onExport: vi.fn() }

describe('long record reading', () => {
  it('provides working section targets and treatment-stage navigation outside the export', () => {
    const { container } = render(<MemoryRouter><RecordDossier {...exportProps} clinicalAnalysisState={{ error: null, isLoading: false, result: null }} isEditable={false} isExportDisabled={false} record={demoPatientRecord} recordRef={createRef()} /></MemoryRouter>)
    const nav = screen.getByRole('navigation', { name: '病历章节' })
    expect(nav.hasAttribute('data-html2canvas-ignore')).toBe(true)
    for (const link of nav.querySelectorAll('a')) {
      expect(document.getElementById(link.hash.slice(1))).not.toBeNull()
    }
    const select = screen.getByRole('combobox', { name: '跳至治疗阶段' }) as HTMLSelectElement
    const stage = document.getElementById(select.options[select.options.length - 1].value)!
    stage.scrollIntoView = vi.fn()
    fireEvent.change(select, { target: { value: stage.id } })
    expect(stage.scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(select.value).toBe('')
    expect(container.querySelectorAll('[data-export-timeline]').length).toBe(select.options.length - 1)
  })

  it('reports the actual unavailable reason without a stale loading claim', () => {
    render(<MemoryRouter><RecordUnavailableDossier {...exportProps} message="无法载入这份病历。" /></MemoryRouter>)
    expect(screen.getByText('无法载入这份病历。')).toBeTruthy()
    expect(screen.queryByText('真实病历载入中')).toBeNull()
  })
})

// @vitest-environment happy-dom
/**
 * [INPUT]: 真实 React 指标面板、合成读数和用户交互。
 * [OUTPUT]: 验证监测回选、搜索、日期定位、范围切换及分类重置。
 * [POS]: components/analytics 的交互回归，确保职责拆分仍保留指标查看闭环。
 * [PROTOCOL]: 行为变化时同步本测试及模块地图。
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LabResult } from '@/types/patient'
import { LabAnalyticsDashboard } from './lab-analytics-dashboard'

const readings: LabResult[] = [
  ...['2024-12-01', '2025-01-01', '2025-02-01'].map((testDate, index): LabResult => ({
    category: 'blood-routine', itemCode: 'wbc', itemName: '白细胞', referenceLow: 3.5,
    referenceHigh: 9.5, testDate, unit: '10^9/L', value: 3.4 - index * 0.3,
  })),
  ...[20, 25, 32].map((value, index): LabResult => ({
    category: 'tumor-marker', itemCode: 'ca15_3', itemName: 'CA15-3', referenceLow: 0,
    referenceHigh: 25, testDate: `2025-0${index + 1}-01`, unit: 'U/mL', value,
  })),
]

function renderAnalytics(labResults = readings) {
  return render(<MemoryRouter><LabAnalyticsDashboard labResults={labResults} theme="light" /></MemoryRouter>)
}

beforeEach(() => {
  // Layout scrolling is covered by browser checks; these tests exercise the selection state.
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
})
afterEach(() => { vi.restoreAllMocks() })

describe('analytics navigation', () => {
  it('selects a rise alert and clears its highlight when changing category', () => {
    const { container } = renderAnalytics()
    fireEvent.keyDown(screen.getByRole('button', { name: '查看 肿瘤标志物 CA15-3 趋势图并标出连续上涨段' }), { key: 'Enter' })
    expect(screen.getByRole('button', { name: '状态文字显示：显示' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('heading', { name: 'CA15-3' })).toBeTruthy()
    expect(container.querySelectorAll('[data-rise-highlight-date]').length).toBe(3)
    expect(screen.getByRole('button', { name: '定位到 2025-03-01 的趋势点' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: '血常规' }))
    expect(screen.getByRole('heading', { name: '白细胞' })).toBeTruthy()
    expect(container.querySelector('[data-rise-highlight]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '肿瘤标志物' }))
    expect(container.querySelector('[data-rise-highlight]')).toBeNull()
    expect(screen.getByRole('button', { name: '定位到 2025-03-01 的趋势点' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('keeps chart and equivalent-table selections linked and labels the actual data year', () => {
    const { container } = renderAnalytics()
    const table = screen.getByTestId('lab-chart-equivalent-table')
    fireEvent.keyDown(within(table).getByRole('button', { name: '定位到 2024-12-01 的趋势点' }), { key: ' ' })
    expect(screen.getByLabelText('2024-12-01 当前定位点')).toBeTruthy()
    const secondPoint = container.querySelector('[data-chart-point-date="2025-01-01"]')!
    fireEvent.click(secondPoint)
    expect(within(table).getByRole('button', { name: '定位到 2025-01-01 的趋势点' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: '2025 年' }))
    expect(within(table).queryByText('2024-12-01')).toBeNull()
    expect(within(table).getAllByRole('button')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: '全部' }))
    expect(within(table).getAllByRole('button')).toHaveLength(3)
  })

  it('keeps empty search recoverable and preserves the patient upload destination', () => {
    const { unmount } = renderAnalytics()
    const search = screen.getByRole('textbox', { name: '搜索指标名称' })
    fireEvent.change(search, { target: { value: '不存在的指标' } })
    expect(screen.getByText('没有匹配的指标')).toBeTruthy()
    fireEvent.change(search, { target: { value: 'wbc' } })
    expect(screen.queryByText('没有匹配的指标')).toBeNull()
    expect(screen.getByRole('heading', { name: '白细胞' })).toBeTruthy()
    unmount()
    render(<MemoryRouter><LabAnalyticsDashboard labResults={[]} theme="light" uploadHref="/app?patientId=fictional" /></MemoryRouter>)
    expect(screen.getByRole('link', { name: '上传化验报告' }).getAttribute('href')).toBe('/app?patientId=fictional')
  })

  it('does not select a point when a drag gesture finishes on it', () => {
    const { container } = renderAnalytics()
    const scroller = screen.getByTestId('lab-trend-chart-scroll')
    Object.assign(scroller, {
      hasPointerCapture: vi.fn().mockReturnValue(false),
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    })
    const firstPoint = container.querySelector('[data-chart-point-date="2024-12-01"]')!
    fireEvent.pointerDown(scroller, { pointerId: 1, clientX: 200 })
    fireEvent.pointerMove(scroller, { pointerId: 1, clientX: 250 })
    expect(scroller.className).toContain('cursor-grabbing')
    fireEvent.pointerUp(scroller, { pointerId: 1, clientX: 250 })
    fireEvent.click(firstPoint)
    expect(screen.getByLabelText('2025-02-01 当前定位点')).toBeTruthy()
    fireEvent.click(firstPoint)
    expect(screen.getByLabelText('2024-12-01 当前定位点')).toBeTruthy()
  })

  it('disables export until enough dated readings exist to draw a chart', () => {
    renderAnalytics(readings.slice(0, 1))
    expect((screen.getByRole('button', { name: '导出图表' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('需要更多读数才能形成趋势线')).toBeTruthy()
  })
})

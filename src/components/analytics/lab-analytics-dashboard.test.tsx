/**
 * [INPUT]: 依赖 react-dom/server 静态渲染、vitest 断言与 LabAnalyticsDashboard 纯展示组件。
 * [OUTPUT]: 对外提供统计页摘要、分类指标、图表编辑开关、趋势图点位热区、连续上涨段高亮、趋势图时间点/全局状态文字显示、趋势图等价表格、公开 Demo 空态引导和非诊断文案回归测试。
 * [POS]: components/analytics 的界面合同测试，约束选定深色临床控制塔布局在无浏览器交互时也保留核心信息结构、公开 /demo/analytics 引导与肿瘤标志物提醒联动标识。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { LabAnalyticsDashboard } from './lab-analytics-dashboard'
import { LabTrendChart } from './lab-trend-chart'
import type { LabResult, PatientRecord } from '@/types/patient'

const labResults: LabResult[] = [
  { category: 'blood-routine', itemCode: 'wbc', itemName: '白细胞', referenceHigh: 9.5, referenceLow: 3.5, testDate: '2026-04-10', unit: '10^9/L', value: 3.4 },
  { category: 'blood-routine', itemCode: 'wbc', itemName: '白细胞', referenceHigh: 9.5, referenceLow: 3.5, testDate: '2026-05-10', unit: '10^9/L', value: 2.8 },
  { category: 'blood-routine', itemCode: 'basophil_abs', itemName: '嗜碱性粒细胞绝对值', referenceHigh: 0.06, referenceLow: 0, testDate: '2026-04-10', unit: '10^9/L', value: 0.01 },
  { category: 'blood-routine', itemCode: 'basophil_abs', itemName: '嗜碱性粒细胞绝对值', referenceHigh: 0.06, referenceLow: 0, testDate: '2026-05-10', unit: '10^9/L', value: 0.02 },
  { category: 'tumor-marker', itemCode: 'ca15_3', itemName: 'CA15-3', referenceHigh: 25, referenceLow: 0, testDate: '2026-03-01', unit: 'U/mL', value: 20 },
  { category: 'tumor-marker', itemCode: 'ca15_3', itemName: 'CA15-3', referenceHigh: 25, referenceLow: 0, testDate: '2026-04-01', unit: 'U/mL', value: 25 },
  { category: 'tumor-marker', itemCode: 'ca15_3', itemName: 'CA15-3', referenceHigh: 25, referenceLow: 0, testDate: '2026-05-01', unit: 'U/mL', value: 32 },
]

const smallDecimalResults: LabResult[] = [
  { category: 'blood-routine', itemCode: 'basophil_abs', itemName: '嗜碱性粒细胞绝对值', referenceHigh: 0.06, referenceLow: 0, testDate: '2026-04-10', unit: '10^9/L', value: 0.01 },
  { category: 'blood-routine', itemCode: 'basophil_abs', itemName: '嗜碱性粒细胞绝对值', referenceHigh: 0.06, referenceLow: 0, testDate: '2026-05-10', unit: '10^9/L', value: 0.02 },
]

function renderDashboard(options: Partial<{ isDemo: boolean; labResults: LabResult[]; record: PatientRecord | null }> = {}) {
  return renderToStaticMarkup(
    <LabAnalyticsDashboard
      labResults={options.labResults ?? labResults}
      theme="dark"
    />,
  )
}

function countMatches(markup: string, pattern: string) {
  return markup.split(pattern).length - 1
}

describe('LabAnalyticsDashboard', () => {
  it('renders the clinical control-tower analytics structure', () => {
    const markup = renderDashboard()

    expect(markup).toContain('指标管理')
    expect(markup).toContain('最近一次异常指标')
    expect(markup).toContain('肿瘤标志物连续两次攀升 &gt;20%')
    expect(markup).toContain('血常规')
    expect(markup).toContain('血生化')
    expect(markup).toContain('肿瘤标志物')
    expect(markup).toContain('搜索指标名称')
    expect(markup).toContain('选择趋势数据范围')
    expect(markup).toContain('次数据')
    expect(markup).toContain('导出图表')
    expect(markup).toContain('状态：')
    expect(markup).toContain('选择全局状态显示方式')
    expect(markup).toContain('状态文字显示：显示')
    expect(markup).toContain('状态文字显示：隐藏')
    expect(markup).toContain('aria-label="状态文字显示：隐藏" aria-pressed="true"')
    expect(markup).not.toContain('选择状态显示方式')
    expect(markup).toContain('时间点：')
    expect(markup).toContain('时间点显示：显示')
    expect(markup).toContain('时间点显示：隐藏')
    expect(markup).toContain('今年')
    expect(markup).toContain('全部')
    expect(markup).toContain('趋势图可横向滑动')
    expect(markup).toContain('data-scroll-hint="true"')
    expect(markup).toContain('[touch-action:pan-y]')
    expect(markup).not.toContain('当前病历：张某某')
    expect(markup).not.toContain('开启编辑')
    expect(markup).not.toContain('完成编辑')
    expect(markup).toContain('repeat(auto-fit,minmax(min(100%,18rem),1fr))')
    expect(markup).toContain('grid-cols-[auto_minmax(0,1fr)]')
    expect(markup).toContain('whitespace-nowrap')
    expect(markup).not.toContain('flex items-center justify-between gap-4')
    expect(markup).not.toContain('演示数据')
    expect(markup).not.toContain('当前病历：张某某 ·')
    expect(markup).not.toContain('开启图表编辑')
    expect(markup).not.toContain('编辑图表')
    expect(markup).not.toContain('font-[var(--ff-font-display)] text-lg font-black tracking-normal text-[var(--ff-text-primary)]">指标管理')
    expect(markup).not.toContain('实验室趋势')
    expect(markup).not.toContain('LAB ANALYTICS')
    expect(markup).not.toContain('Supabase')
    expect(markup).not.toContain('shadow-[0_16px_34px_rgba')
    expect(markup).not.toContain('linear-gradient(90deg')
  })

  it('renders chart plus an equivalent data table and text status labels', () => {
    const markup = renderDashboard()

    expect(markup).toContain('选中指标趋势折线图')
    expect(markup).toContain('data-testid="lab-chart-equivalent-table"')
    expect(markup).toContain('CA15-3')
    expect(markup).toContain('偏高')
    expect(markup).toContain('参考范围')
    expect(markup).toContain('↑')
    expect(markup).toContain('↓')
    expect(markup).toContain('text-[var(--ff-critical)]')
    expect(markup).toContain('text-[var(--ff-low)]')
  })

  it('makes monitor rows selectable so they can drive the trend chart', () => {
    const markup = renderDashboard()

    expect(markup).toContain('aria-label="查看 血常规 白细胞 趋势图"')
    expect(markup).toContain('aria-label="查看 肿瘤标志物 CA15-3 趋势图并标出连续上涨段"')
    expect(markup).toContain('data-rise-alert-code="ca15_3"')
    expect(markup).toContain('aria-label="定位到 2026-04-10 的趋势点"')
    expect(markup).toContain('aria-label="2026-05-10 当前定位点"')
    expect(markup).toContain('aria-label="定位到 2026-04-10 的表格日期"')
    expect(markup).toContain('aria-label="定位到 2026-05-10 的表格日期，当前定位点"')
    expect(markup).toContain('data-chart-row-date="2026-04-10"')
    expect(markup).toContain('data-chart-point-control="true"')
    expect(markup).toContain('data-chart-point-date="2026-04-10"')
    expect(markup).toContain('data-chart-point-date="2026-05-10"')
    expect(markup).toContain('data-lab-indicator-code="wbc"')
    expect(markup).toContain('role="button"')
    expect(markup).toContain('tabindex="0"')
    expect(countMatches(markup, 'data-chart-point-date=')).toBe(3)
  })

  it('renders a visual marker for a selected continuous tumor-marker rise window', () => {
    const markup = renderToStaticMarkup(
      <LabTrendChart
        highlightedDates={['2026-03-01', '2026-04-01', '2026-05-01']}
        onSelectDate={() => undefined}
        points={[
          { date: '2026-02-01', referenceHigh: 25, referenceLow: 0, referenceRangeLabel: '0-25 U/mL', status: 'normal', unit: 'U/mL', value: 18 },
          { date: '2026-03-01', referenceHigh: 25, referenceLow: 0, referenceRangeLabel: '0-25 U/mL', status: 'normal', unit: 'U/mL', value: 20 },
          { date: '2026-04-01', referenceHigh: 25, referenceLow: 0, referenceRangeLabel: '0-25 U/mL', status: 'normal', unit: 'U/mL', value: 25 },
          { date: '2026-05-01', referenceHigh: 25, referenceLow: 0, referenceRangeLabel: '0-25 U/mL', status: 'high', unit: 'U/mL', value: 32 },
        ]}
        selectedDate={null}
        timeLabelDisplay="none"
      />,
    )

    expect(markup).toContain('aria-label="连续上涨检查结果区间"')
    expect(markup).toContain('data-rise-highlight="true"')
    expect(markup).toContain('连续上涨段')
    expect(markup).toContain('data-rise-highlight-date="2026-03-01"')
    expect(markup).toContain('data-rise-highlight-date="2026-05-01"')
  })

  it('preserves small decimal lab values instead of rounding them to zero', () => {
    const markup = renderDashboard({ labResults: smallDecimalResults })

    expect(markup).toContain('嗜碱性粒细胞绝对值')
    expect(markup).toContain('0.01')
    expect(markup).toContain('0.02')
    expect(markup).not.toContain('0 10^9/L')
  })

  it('keeps analytics read-only and points upload work back to /app', () => {
    const markup = renderDashboard({ labResults: [] })

    expect(markup).toContain('请回到 /app 输入区上传病历、血常规、血生化或肿瘤标志物图片/PDF')
    expect(markup).toContain('/demo/analytics')
    expect(markup).not.toContain('type="file"')
    expect(markup).not.toContain('上传实验室报告')
  })

  it('shows empty state without fake demo readings', () => {
    const markup = renderDashboard({ labResults: [] })

    expect(markup).toContain('暂无已保存指标')
    expect(markup).toContain('本页只读取已保存到网页端的指标数据')
    expect(markup).not.toContain('实验室')
    expect(markup).not.toContain('CA15-3')
  })

  it('keeps demo analytics header free of redundant patient labels', () => {
    const markup = renderDashboard({ isDemo: true })

    expect(markup).not.toContain('当前病历：张某某')
    expect(markup).not.toContain('演示数据')
  })

  it('keeps monitoring text non-diagnostic', () => {
    const markup = renderDashboard()

    expect(markup).toContain('仅作趋势提示')
    expect(markup).toContain('不提供诊断、疾病进展结论、用药或治疗建议')
    expect(markup).not.toContain('恶化')
  })
})

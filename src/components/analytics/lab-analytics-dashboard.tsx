/**
 * [INPUT]: 依赖 react 状态/ref/指针键盘事件、lucide-react 图标、@/components/system/surfaces、@/lib/lab-results 趋势工具、@/lib/lab-dictionary 分类字典与 PatientRecord/LabResult。
 * [OUTPUT]: 对外提供 LabAnalyticsDashboard，区分加载、失败和真实空态，并提供读取重试及化验上传链接。
 * [POS]: components/analytics 的指标管理统计界面，负责只读图表、全局状态文字切换、可搜索/可滚动分类指标索引、监测表回选指标、肿瘤连续上涨提醒联动高亮、表格日期与图表点双向定位、可拖动横向滑动趋势图、时间点密度切换、SVG 图表导出、等价表格、demo 展示与非诊断监测面板展示；文件上传入口留在 /app 输入区。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { type KeyboardEvent, type PointerEvent, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Download, TrendingUp } from 'lucide-react'

import { PanelSurface, SectionSurface } from '@/components/system/surfaces'
import { LAB_CATEGORY_LABELS } from '@/lib/lab-dictionary'
import {
  buildLabChartSeries,
  buildLabTrendRows,
  detectTumorMarkerContinuousRise,
  summarizeLatestAbnormalByCategory,
  type TumorMarkerRiseAlert,
} from '@/lib/lab-results'
import type { Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import type { LabResult, LabResultCategory } from '@/types/patient'

import { formatRatio, formatValue, RiseRatioLabel, statusText, StatusLabel } from './lab-analytics-format'
import {
  categories,
  chartDragThreshold,
  defaultChartPointLimit,
  defaultItemByCategory,
  formatAlertWindow,
  type HighlightedRiseWindow,
  LabTimelineDragHint,
  monitorRowClass,
  scrollAreaClass,
  SummaryCard,
} from './lab-analytics-controls'
import { LabTrendChart, timeLabelDisplayOptions, type TimeLabelDisplay } from './lab-trend-chart'

type LabAnalyticsDashboardProps = {
  isLoading?: boolean
  labResults: LabResult[]
  loadError?: string | null
  onRetry?: () => void
  uploadHref?: string
  theme: Theme
}

export function LabAnalyticsDashboard({
  isLoading = false,
  labResults,
  loadError = null,
  onRetry,
  uploadHref = '/app',
  theme,
}: LabAnalyticsDashboardProps) {
  const [activeCategory, setActiveCategory] = useState<LabResultCategory>('blood-routine')
  const [indicatorSearch, setIndicatorSearch] = useState('')
  const [showStatusText, setShowStatusText] = useState(false)
  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null)
  const [selectedPointDate, setSelectedPointDate] = useState<string | null>(null)
  const [selectedPointLimit, setSelectedPointLimit] = useState(defaultChartPointLimit)
  const [highlightedRiseWindow, setHighlightedRiseWindow] = useState<HighlightedRiseWindow | null>(null)
  const [timeLabelDisplay, setTimeLabelDisplay] = useState<TimeLabelDisplay>('none')
  const chartScrollRef = useRef<HTMLDivElement>(null)
  const chartTableRef = useRef<HTMLDivElement>(null)
  const chartDragRef = useRef({ hasMoved: false, pointerId: -1, startScroll: 0, startX: 0 })
  const suppressChartPointClickRef = useRef(false)
  const [isChartDragging, setIsChartDragging] = useState(false)
  const trendRows = useMemo(() => buildLabTrendRows(labResults), [labResults])
  const abnormalSummaries = useMemo(() => summarizeLatestAbnormalByCategory(labResults), [labResults])
  const riseAlerts = useMemo(() => detectTumorMarkerContinuousRise(labResults), [labResults])
  const abnormalReadings = abnormalSummaries.flatMap((summary) => summary.abnormalReadings)
  const normalizedSearch = indicatorSearch.trim().toLowerCase()
  const activeRows = trendRows.filter((row) => row.category === activeCategory)
  const visibleRows = normalizedSearch
    ? activeRows.filter((row) => {
        const haystack = `${row.itemName} ${row.itemCode} ${statusText[row.status]} ${row.unit ?? ''}`.toLowerCase()
        return haystack.includes(normalizedSearch)
      })
    : activeRows
  const selectedPool = visibleRows.length > 0 ? visibleRows : activeRows
  const selectedRow = selectedPool.find((row) => row.itemCode === selectedItemCode) ?? selectedPool.find((row) => row.itemCode === defaultItemByCategory[activeCategory]) ?? selectedPool[0]
  const series = buildLabChartSeries(labResults, selectedRow?.itemCode ?? '')
  const maxPointLimit = Math.max(series.points.length, 1)
  const effectivePointLimit = Math.min(selectedPointLimit, maxPointLimit)
  const chartPointLimitOptions = Array.from({ length: maxPointLimit }, (_, index) => index + 1)
  const latestSeriesYear = series.points.at(-1)?.date.slice(0, 4)
  const currentYearPointLimit = latestSeriesYear ? Math.max(series.points.filter((point) => point.date.startsWith(`${latestSeriesYear}-`)).length, 1) : maxPointLimit
  const visibleSeriesPoints = series.points.slice(-effectivePointLimit)
  const highlightedRiseDates = highlightedRiseWindow && highlightedRiseWindow.itemCode === selectedRow?.itemCode ? highlightedRiseWindow.dates : []
  const abnormalCount = abnormalReadings.length
  const missingReferenceCount = abnormalSummaries.reduce((sum, summary) => sum + summary.missingReferenceCount, 0)
  const coveredCount = new Set(labResults.map((reading) => `${reading.category}:${reading.itemCode}`)).size
  const hasData = labResults.length > 0

  function scrollChartToPoint(date: string) {
    if (typeof window === 'undefined') {
      return
    }

    window.requestAnimationFrame(() => {
      const chartScroller = chartScrollRef.current
      const pointIndex = visibleSeriesPoints.findIndex((point) => point.date === date)

      if (!chartScroller || pointIndex < 0) {
        return
      }

      const maxIndex = Math.max(visibleSeriesPoints.length - 1, 1)
      const maxScroll = Math.max(chartScroller.scrollWidth - chartScroller.clientWidth, 0)
      const targetLeft = (maxScroll * pointIndex) / maxIndex

      chartScroller.scrollTo({ behavior: 'smooth', left: targetLeft })
    })
  }

  function scrollTableToPoint(date: string) {
    if (typeof window === 'undefined') {
      return
    }

    window.requestAnimationFrame(() => {
      const tableScroller = chartTableRef.current
      const row = [...(tableScroller?.querySelectorAll<HTMLElement>('[data-chart-row-date]') ?? [])]
        .find((candidate) => candidate.dataset.chartRowDate === date)

      row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      row?.focus({ preventScroll: true })
    })
  }

  function selectIndicator(category: LabResultCategory, itemCode: string, focusChart = false) {
    setActiveCategory(category)
    setSelectedItemCode(itemCode)
    setIndicatorSearch('')
    setSelectedPointDate(null)
    setHighlightedRiseWindow(null)

    if (!focusChart || typeof window === 'undefined') {
      return
    }

    window.requestAnimationFrame(() => {
      const chartScroller = chartScrollRef.current

      chartScroller?.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      chartScroller?.scrollTo({ behavior: 'smooth', left: chartScroller.scrollWidth })
    })
  }

  function selectChartPoint(date: string, options: { scrollChart?: boolean; scrollTable?: boolean } = {}) {
    setSelectedPointDate(date)

    if (options.scrollChart) {
      scrollChartToPoint(date)
    }

    if (options.scrollTable) {
      scrollTableToPoint(date)
    }
  }

  function selectRiseAlert(alert: TumorMarkerRiseAlert) {
    const dates = alert.points.map((point) => point.date)
    const seriesPoints = buildLabChartSeries(labResults, alert.itemCode).points
    const firstHighlightIndex = seriesPoints.findIndex((point) => point.date === dates[0])
    const requiredPointLimit = firstHighlightIndex >= 0 ? seriesPoints.length - firstHighlightIndex : dates.length

    setActiveCategory('tumor-marker')
    setSelectedItemCode(alert.itemCode)
    setIndicatorSearch('')
    setSelectedPointDate(dates.at(-1) ?? null)
    setHighlightedRiseWindow({ dates, itemCode: alert.itemCode })
    setSelectedPointLimit((current) => Math.max(current, requiredPointLimit))

    if (typeof window === 'undefined') {
      return
    }

    window.requestAnimationFrame(() => {
      const chartScroller = chartScrollRef.current

      chartScroller?.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      chartScroller?.scrollTo({ behavior: 'smooth', left: chartScroller.scrollWidth })
    })
  }

  function handleChartPointRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, date: string) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    selectChartPoint(date, { scrollChart: true })
  }

  function handleMonitorRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, category: LabResultCategory, itemCode: string) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    selectIndicator(category, itemCode, true)
  }

  function handleChartPointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = chartScrollRef.current

    if (!target) {
      return
    }

    chartDragRef.current = {
      hasMoved: false,
      pointerId: event.pointerId,
      startScroll: target.scrollLeft,
      startX: event.clientX,
    }
  }

  function handleChartPointerMove(event: PointerEvent<HTMLDivElement>) {
    const target = chartScrollRef.current

    if (!target || chartDragRef.current.pointerId !== event.pointerId) {
      return
    }

    const dragDelta = event.clientX - chartDragRef.current.startX

    if (!chartDragRef.current.hasMoved && Math.abs(dragDelta) < chartDragThreshold) {
      return
    }

    if (!chartDragRef.current.hasMoved) {
      chartDragRef.current.hasMoved = true
      suppressChartPointClickRef.current = true
      setIsChartDragging(true)

      if (!target.hasPointerCapture(event.pointerId)) {
        target.setPointerCapture(event.pointerId)
      }
    }

    event.preventDefault()
    target.scrollLeft = chartDragRef.current.startScroll - dragDelta
  }

  function stopChartDragging(event: PointerEvent<HTMLDivElement>) {
    const target = chartScrollRef.current

    if (!target || chartDragRef.current.pointerId !== event.pointerId) {
      return
    }

    const hadMoved = chartDragRef.current.hasMoved

    setIsChartDragging(false)

    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId)
    }

    chartDragRef.current = { hasMoved: false, pointerId: -1, startScroll: 0, startX: 0 }

    if (hadMoved && typeof window !== 'undefined') {
      window.setTimeout(() => {
        suppressChartPointClickRef.current = false
      }, 0)
    }
  }

  function shouldSuppressChartPointSelect() {
    if (!suppressChartPointClickRef.current) {
      return false
    }

    suppressChartPointClickRef.current = false
    return true
  }

  function handleChartKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = chartScrollRef.current
    const moves: Record<string, number> = {
      ArrowLeft: -220,
      ArrowRight: 220,
      End: target?.scrollWidth ?? 0,
      Home: -(target?.scrollWidth ?? 0),
    }

    if (!target || !(event.key in moves)) {
      return
    }

    event.preventDefault()
    target.scrollBy({ behavior: 'smooth', left: moves[event.key] })
  }

  function handleExportChart() {
    const svg = chartScrollRef.current?.querySelector('svg[aria-label="选中指标趋势折线图"]')

    if (!svg || typeof document === 'undefined') {
      return
    }

    const clonedSvg = svg.cloneNode(true) as SVGSVGElement
    const svgNamespace = 'http://www.w3.org/2000/svg'
    const rootStyles = getComputedStyle(document.documentElement)
    const exportedVariables = [
      '--ff-accent-primary',
      '--ff-accent-success',
      '--ff-border-default',
      '--ff-surface-inset',
      '--ff-text-muted',
      '--ff-text-primary',
      '--ff-text-secondary',
    ]
      .map((name) => `${name}:${rootStyles.getPropertyValue(name).trim()};`)
      .join('')
    const style = document.createElementNS(svgNamespace, 'style')
    const background = document.createElementNS(svgNamespace, 'rect')

    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clonedSvg.querySelectorAll('[data-export-axis-label]').forEach((label) => label.removeAttribute('display'))
    style.textContent = `:root{${exportedVariables}}text{font-family:${rootStyles.getPropertyValue('--ff-font-ui')}}`
    background.setAttribute('width', '100%')
    background.setAttribute('height', '100%')
    background.setAttribute('fill', 'var(--ff-surface-inset)')
    clonedSvg.insertBefore(background, clonedSvg.firstChild)
    clonedSvg.insertBefore(style, clonedSvg.firstChild)

    const source = new XMLSerializer().serializeToString(clonedSvg)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const filename = selectedRow?.itemName.replace(/[\\/:*?"<>|\s]+/g, '-') || '指标趋势'

    link.href = url
    link.download = `${filename}-趋势图.svg`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return <PanelSurface className="p-5 text-sm" theme={theme}><p role="status">正在读取指标数据…</p></PanelSurface>
  }
  if (loadError) {
    return <PanelSurface className="p-5 text-sm" theme={theme} tone="warning"><p role="alert">{loadError}</p>{onRetry ? <button className="mt-3 min-h-[44px] rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 font-semibold" onClick={onRetry} type="button">重试读取指标</button> : null}</PanelSurface>
  }

  return (
    <div className="flex min-h-0 flex-col gap-4" data-testid="lab-analytics-dashboard">
      <div className="flex min-h-7 flex-col gap-2 text-sm font-semibold text-[var(--ff-text-secondary)] md:flex-row md:items-center md:justify-between">
        <h1 className="sr-only">指标管理</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div aria-label="选择全局状态显示方式" className="inline-flex h-8 items-center overflow-hidden rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)]">
            <span className="px-2 text-xs text-[var(--ff-text-muted)]">状态：</span>
            {[
              { label: '显示', value: true },
              { label: '隐藏', value: false },
            ].map((option) => (
              <button
                aria-label={`状态文字显示：${option.label}`}
                aria-pressed={showStatusText === option.value}
                className={cn(
                  'h-full border-l border-[var(--ff-border-default)] px-2.5 text-xs font-bold text-[var(--ff-text-secondary)] hover:text-[var(--ff-accent-text)]',
                  showStatusText === option.value ? 'bg-[color-mix(in_srgb,var(--ff-accent-primary)_12%,transparent)] text-[var(--ff-accent-text)]' : null,
                )}
                key={option.label}
                onClick={() => setShowStatusText(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3">
        <SummaryCard Icon={AlertCircle} index="01" label="最近一次异常指标" tone={abnormalCount > 0 ? 'alert' : 'safe'} value={isLoading ? '读取中' : `${abnormalCount} 项`} />
        <SummaryCard Icon={TrendingUp} index="02" label="肿瘤标志物连续两次攀升 >20%" tone={riseAlerts.length > 0 ? 'alert' : 'safe'} value={`${riseAlerts.length} 项`} />
        <SummaryCard Icon={CheckCircle2} index="03" label="覆盖指标 / 缺参考" tone="safe" value={`${coveredCount} / ${missingReferenceCount}`} />
      </div>

      {!hasData ? (
        <PanelSurface className="p-8 text-center" theme={theme} tone="panel">
          <div className="font-[var(--ff-font-display)] text-2xl font-black tracking-normal">暂无已保存指标</div>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--ff-text-secondary)]">请回到 /app 输入区上传病历、血常规、血生化或肿瘤标志物图片/PDF；本页只读取已保存到网页端的指标数据。没有真实输入时，请使用 /demo/analytics 查看演示统计。</p>
          <Link className="mt-4 inline-flex min-h-[44px] items-center rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] px-4 text-sm font-semibold" to={uploadHref}>上传化验报告</Link>
        </PanelSurface>
      ) : (
        <div className="grid gap-4">
          <div className="grid min-w-0 gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
            <SectionSurface className="flex min-h-[520px] flex-col p-4 xl:h-[760px] xl:min-h-0 xl:overflow-hidden" theme={theme} tone="panel">
              <div aria-label="指标分类" className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <button
                    aria-pressed={activeCategory === category}
                    className={cn(
                      'h-10 shrink-0 rounded-[var(--ff-radius-sm)] border px-3 text-sm font-bold tracking-normal',
                      activeCategory === category
                        ? 'border-[var(--ff-accent-primary)] bg-[color-mix(in_srgb,var(--ff-accent-primary)_14%,transparent)] text-[var(--ff-accent-text)]'
                        : 'border-[var(--ff-border-default)] text-[var(--ff-text-secondary)]',
                    )}
                    key={category}
                    onClick={() => {
                      setActiveCategory(category)
                      setSelectedItemCode(null)
                      setIndicatorSearch('')
                    }}
                    type="button"
                  >
                    {LAB_CATEGORY_LABELS[category]}
                  </button>
                ))}
              </div>
              <label className="mt-3 flex h-10 shrink-0 items-center gap-2 rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] px-3 text-sm focus-within:border-[var(--ff-accent-primary)]">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[var(--ff-text-muted)]">search</span>
                <input
                  className="min-w-0 flex-1 bg-transparent text-[var(--ff-text-primary)] outline-none placeholder:text-[var(--ff-text-muted)]"
                  data-testid="lab-indicator-search"
                  onChange={(event) => setIndicatorSearch(event.target.value)}
                  placeholder="搜索指标名称"
                  value={indicatorSearch}
                />
              </label>
              <div className={cn('mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1', scrollAreaClass)}>
                {visibleRows.length > 0 ? (
                  visibleRows.map((row) => (
                    <button
                      className={cn(
                        'flex min-h-[50px] w-full items-center justify-between gap-3 rounded-[var(--ff-radius-sm)] border px-3 py-2 text-left',
                        selectedRow?.itemCode === row.itemCode
                        ? 'border-[var(--ff-accent-primary)] bg-[color-mix(in_srgb,var(--ff-accent-primary)_8%,transparent)] shadow-[inset_3px_0_0_var(--ff-accent-primary)]'
                        : 'border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)]',
                      )}
                      key={`${row.category}:${row.itemCode}`}
                      data-lab-indicator-category={row.category}
                      data-lab-indicator-code={row.itemCode}
                      onClick={() => selectIndicator(row.category, row.itemCode)}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-[var(--ff-text-primary)]">{row.itemName}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--ff-text-muted)]">
                          <span>{row.latestDate ?? '缺日期'}</span>
                          <span>·</span>
                          <StatusLabel compact={!showStatusText} status={row.status} />
                        </span>
                      </span>
                      <span className="shrink-0 text-right font-[var(--ff-font-mono)] text-sm text-[var(--ff-text-primary)]">
                        {formatValue(row.latestValue, row.unit)}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] p-4 text-sm font-semibold text-[var(--ff-text-secondary)]">没有匹配的指标</div>
                )}
              </div>
            </SectionSurface>

            <SectionSurface className="flex min-w-0 flex-col overflow-hidden p-4 sm:p-5 xl:h-[760px]" theme={theme} tone="panel">
              {selectedRow ? (
                <>
                  <div className="mb-3 flex shrink-0 flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="font-[var(--ff-font-display)] text-2xl font-black tracking-normal">{selectedRow.itemName}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[var(--ff-text-secondary)]">
                        <span className="inline-flex items-center gap-1">
                          最新值
                          {formatValue(selectedRow.latestValue, selectedRow.unit)}
                        </span>
                        <span>·</span>
                        <StatusLabel compact={!showStatusText} status={selectedRow.status} />
                        <span>· 参考 {selectedRow.referenceRangeLabel}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 text-sm font-semibold text-[var(--ff-text-muted)]">
                      <div aria-label="选择时间点显示方式" className="inline-flex h-9 items-center overflow-hidden rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)]">
                        <span className="px-3 text-[var(--ff-text-muted)]">时间点：</span>
                        {timeLabelDisplayOptions.map((option) => (
                          <button
                            aria-label={`时间点显示：${option.label}`}
                            aria-pressed={timeLabelDisplay === option.value}
                            className={cn(
                              'h-full border-l border-[var(--ff-border-default)] px-3 font-bold text-[var(--ff-text-secondary)] hover:text-[var(--ff-accent-text)]',
                              timeLabelDisplay === option.value ? 'bg-[color-mix(in_srgb,var(--ff-accent-primary)_12%,transparent)] text-[var(--ff-accent-text)]' : null,
                            )}
                            key={option.value}
                            onClick={() => setTimeLabelDisplay(option.value)}
                            type="button"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <div aria-label="选择趋势数据范围" className="inline-flex h-9 items-center overflow-hidden rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)]">
                        <label className="inline-flex h-full items-center gap-2 px-3">
                          <span>最近</span>
                          <select
                            aria-label="选择趋势数据范围"
                            className="bg-transparent font-[var(--ff-font-mono)] text-[var(--ff-text-primary)] outline-none"
                            onChange={(event) => setSelectedPointLimit(Number(event.target.value))}
                            value={effectivePointLimit}
                          >
                            {chartPointLimitOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                          <span>次数据</span>
                        </label>
                        <button
                          className="h-full border-l border-[var(--ff-border-default)] px-3 font-bold text-[var(--ff-text-secondary)] hover:text-[var(--ff-accent-text)]"
                          onClick={() => setSelectedPointLimit(currentYearPointLimit)}
                          type="button"
                        >
                          今年
                        </button>
                        <button
                          className="h-full border-l border-[var(--ff-border-default)] px-3 font-bold text-[var(--ff-text-secondary)] hover:text-[var(--ff-accent-text)]"
                          onClick={() => setSelectedPointLimit(maxPointLimit)}
                          type="button"
                        >
                          全部
                        </button>
                      </div>
                      <button className="inline-flex h-9 items-center gap-1 rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] px-3 text-[var(--ff-text-secondary)] hover:border-[var(--ff-accent-primary)] hover:text-[var(--ff-accent-text)]" onClick={handleExportChart} type="button">
                        <Download aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
                        导出图表
                      </button>
                    </div>
                  </div>
                  <div className="relative shrink-0">
                    <div
                      aria-label="趋势图可横向滑动"
                      className={cn(
                        'h-[328px] w-full max-w-full overflow-x-auto overflow-y-hidden pb-2 outline-none focus-visible:ring-1 focus-visible:ring-[var(--ff-accent-primary)]',
                        'select-none [touch-action:pan-y]',
                        isChartDragging ? 'cursor-grabbing' : 'cursor-grab',
                        scrollAreaClass,
                      )}
                      data-testid="lab-trend-chart-scroll"
                      onKeyDown={handleChartKeyDown}
                      onPointerCancel={stopChartDragging}
                      onPointerDown={handleChartPointerDown}
                      onPointerMove={handleChartPointerMove}
                      onPointerUp={stopChartDragging}
                      ref={chartScrollRef}
                      tabIndex={0}
                    >
                      <LabTrendChart
                        highlightedDates={highlightedRiseDates}
                        onSelectDate={(date) => selectChartPoint(date, { scrollTable: true })}
                        points={visibleSeriesPoints}
                        selectedDate={selectedPointDate}
                        shouldSuppressSelect={shouldSuppressChartPointSelect}
                        timeLabelDisplay={timeLabelDisplay}
                      />
                    </div>
                    <LabTimelineDragHint />
                  </div>
                  <div className={cn('mt-4 min-h-0 flex-1 overflow-auto', scrollAreaClass)} ref={chartTableRef}>
                    <table className="min-w-full border-collapse text-left text-sm" data-testid="lab-chart-equivalent-table">
                      <thead className="sticky top-0 z-10 bg-[var(--ff-surface-panel)] font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--ff-text-muted)]">
                        <tr className="border-b border-[var(--ff-border-default)]">
                          <th className="py-2 pr-3">日期</th>
                          <th className="py-2 pr-3">数值</th>
                          <th className="py-2 pr-3">参考范围</th>
                          <th className="py-2 pr-3">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleSeriesPoints.map((point) => (
                          <tr
                            aria-label={`定位到 ${point.date} 的趋势点`}
                            aria-pressed={selectedPointDate === point.date}
                            className={cn('border-b border-[var(--ff-border-default)]', monitorRowClass, selectedPointDate === point.date ? 'bg-[color-mix(in_srgb,var(--ff-accent-primary)_10%,transparent)]' : null)}
                            key={`${point.date}-${point.value}`}
                            data-chart-row-date={point.date}
                            onClick={() => selectChartPoint(point.date, { scrollChart: true })}
                            onKeyDown={(event) => handleChartPointRowKeyDown(event, point.date)}
                            role="button"
                            tabIndex={0}
                          >
                            <td className="py-2 pr-3">{point.date}</td>
                            <td className="py-2 pr-3">
                              {formatValue(point.value, point.unit)}
                            </td>
                            <td className="py-2 pr-3">{point.referenceRangeLabel}</td>
                            <td className="py-2 pr-3"><StatusLabel compact={!showStatusText} status={point.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[360px] items-center justify-center text-sm font-semibold text-[var(--ff-text-secondary)]">该分类暂无已保存读数</div>
              )}
            </SectionSurface>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionSurface className="min-h-[360px] p-4 sm:p-5" theme={theme} tone="panel">
              <h2 className="font-[var(--ff-font-display)] text-xl font-black tracking-normal">最近异常读数</h2>
              <div className={cn('mt-4 overflow-x-auto', scrollAreaClass)}>
                {abnormalReadings.length > 0 ? (
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-[var(--ff-surface-panel)] font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--ff-text-muted)]">
                      <tr className="border-b border-[var(--ff-border-default)]">
                        <th className="py-2 pr-3">指标</th>
                        <th className="py-2 pr-3">数值</th>
                        <th className="py-2 pr-3">参考范围</th>
                        <th className="py-2 pr-3">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abnormalReadings.map((reading) => (
                        <tr
                          aria-label={`查看 ${LAB_CATEGORY_LABELS[reading.category]} ${reading.itemName} 趋势图`}
                          className={cn('border-b border-[var(--ff-border-default)]', monitorRowClass)}
                          key={`${reading.category}:${reading.itemCode}:${reading.testDate}`}
                          onClick={() => selectIndicator(reading.category, reading.itemCode, true)}
                          onKeyDown={(event) => handleMonitorRowKeyDown(event, reading.category, reading.itemCode)}
                          role="button"
                          tabIndex={0}
                        >
                          <td className="py-2 pr-3">{LAB_CATEGORY_LABELS[reading.category]} · {reading.itemName}</td>
                          <td className="py-2 pr-3">
                            {formatValue(reading.value, reading.unit)}
                          </td>
                          <td className="py-2 pr-3">{reading.referenceRangeLabel}</td>
                          <td className="py-2 pr-3"><StatusLabel compact={!showStatusText} status={reading.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] p-3 text-sm font-semibold text-[var(--ff-text-secondary)]">当前最近一次检查未发现可计算异常指标</div>
                )}
              </div>
            </SectionSurface>

            <SectionSurface className="min-h-[360px] p-4 sm:p-5" theme={theme} tone="panel">
              <h2 className="font-[var(--ff-font-display)] text-xl font-black tracking-normal text-[var(--ff-accent-text)]">肿瘤标志物连续上涨提醒</h2>
              <div className={cn('mt-4 overflow-x-auto', scrollAreaClass)}>
                {riseAlerts.length > 0 ? (
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-[var(--ff-surface-panel)] font-[var(--ff-font-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--ff-text-muted)]">
                      <tr className="border-b border-[var(--ff-border-default)]">
                        <th className="py-2 pr-3">指标</th>
                        <th className="py-2 pr-3">最近三次结果</th>
                        <th className="py-2 pr-3">连续上涨</th>
                        <th className="py-2 pr-3">累计上涨</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riseAlerts.map((alert) => (
                        <tr
                          aria-label={`查看 肿瘤标志物 ${alert.itemName} 趋势图并标出连续上涨段`}
                          className={cn(
                            'border-b border-[var(--ff-border-default)]',
                            monitorRowClass,
                            highlightedRiseWindow?.itemCode === alert.itemCode ? 'bg-[color-mix(in_srgb,var(--ff-critical)_10%,transparent)]' : null,
                          )}
                          key={alert.itemCode}
                          data-rise-alert-code={alert.itemCode}
                          onClick={() => selectRiseAlert(alert)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') {
                              return
                            }

                            event.preventDefault()
                            selectRiseAlert(alert)
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <td className="py-2 pr-3">{alert.itemName}</td>
                          <td className="py-2 pr-3">{formatAlertWindow(alert)}</td>
                          <td className="py-2 pr-3"><RiseRatioLabel>{`${formatRatio(alert.intervalRiseRatios[0])} → ${formatRatio(alert.intervalRiseRatios[1])}`}</RiseRatioLabel></td>
                          <td className="py-2 pr-3"><RiseRatioLabel>{formatRatio(alert.cumulativeRiseRatio)}</RiseRatioLabel></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="rounded-[var(--ff-radius-sm)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] p-3 text-sm font-semibold text-[var(--ff-text-secondary)]">暂无满足连续两次上涨超过 20% 的肿瘤标志物</div>
                )}
              </div>
            </SectionSurface>
          </div>
        </div>
      )}

      <PanelSurface className="shrink-0 p-2 text-center text-sm leading-6 text-[var(--ff-text-secondary)]" theme={theme} tone="inset">
        仅作趋势提示：本页只基于已保存的指标读数提供复核线索，不提供诊断、疾病进展结论、用药或治疗建议。
      </PanelSurface>
    </div>
  )
}

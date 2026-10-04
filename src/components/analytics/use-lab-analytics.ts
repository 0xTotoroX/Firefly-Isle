/**
 * [INPUT]: React 状态与 ref、lab-results 纯计算和指标分类默认值。
 * [OUTPUT]: useLabAnalytics 与 LabAnalyticsState，集中指标选择、范围和监测联动。
 * [POS]: components/analytics 的只读统计选择状态层，不持久化读数。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md。
 */
import { useMemo, useRef, useState } from 'react'
import { buildLabChartSeries, buildLabTrendRows, detectTumorMarkerContinuousRise, summarizeLatestAbnormalByCategory, type TumorMarkerRiseAlert } from '@/lib/labs/lab-results'
import type { LabResult, LabResultCategory } from '@/types/patient'
import { defaultChartPointLimit, defaultItemByCategory, type HighlightedRiseWindow } from './lab-analytics-controls'
import { statusText } from './lab-analytics-format'
import type { TimeLabelDisplay } from './lab-trend-chart'

export function useLabAnalytics(labResults: LabResult[]) {
  const [activeCategory, setActiveCategory] = useState<LabResultCategory>('blood-routine')
  const [indicatorSearch, setIndicatorSearch] = useState('')
  const [showStatusText, setShowStatusText] = useState(true)
  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null)
  const [selectedPointDate, setSelectedPointDate] = useState<string | null>(null)
  const [selectedPointLimit, setSelectedPointLimit] = useState(defaultChartPointLimit)
  const [highlightedRiseWindow, setHighlightedRiseWindow] = useState<HighlightedRiseWindow | null>(null)
  const [timeLabelDisplay, setTimeLabelDisplay] = useState<TimeLabelDisplay>('none')
  const chartScrollRef = useRef<HTMLDivElement>(null)
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
  const latestSeriesYear = series.points.at(-1)?.date.slice(0, 4)
  const latestYearPointLimit = latestSeriesYear ? Math.max(series.points.filter((point) => point.date.startsWith(`${latestSeriesYear}-`)).length, 1) : maxPointLimit
  const visibleSeriesPoints = series.points.slice(-effectivePointLimit)
  const highlightedRiseDates = highlightedRiseWindow && highlightedRiseWindow.itemCode === selectedRow?.itemCode ? highlightedRiseWindow.dates : []
  const abnormalCount = abnormalReadings.length
  const missingReferenceCount = abnormalSummaries.reduce((sum, summary) => sum + summary.missingReferenceCount, 0)
  const coveredCount = new Set(labResults.map((reading) => `${reading.category}:${reading.itemCode}`)).size
  const hasData = labResults.length > 0

  function selectCategory(category: LabResultCategory) {
    setActiveCategory(category)
    setSelectedItemCode(null)
    setIndicatorSearch('')
    setSelectedPointDate(null)
    setHighlightedRiseWindow(null)
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

  return {
    activeCategory, abnormalCount, abnormalReadings, chartScrollRef, coveredCount,
    effectivePointLimit, hasData, highlightedRiseDates, highlightedRiseWindow,
    indicatorSearch, latestSeriesYear, latestYearPointLimit, maxPointLimit,
    missingReferenceCount, riseAlerts, selectedPointDate, selectedRow,
    showStatusText, timeLabelDisplay, visibleRows, visibleSeriesPoints,
    selectCategory, selectIndicator, selectRiseAlert, setIndicatorSearch,
    setSelectedPointDate, setSelectedPointLimit, setShowStatusText, setTimeLabelDisplay,
  }
}

export type LabAnalyticsState = ReturnType<typeof useLabAnalytics>

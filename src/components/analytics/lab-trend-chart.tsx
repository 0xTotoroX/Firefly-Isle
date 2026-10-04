/**
 * [INPUT]: 依赖 react 的键盘/鼠标事件类型、@/lib/labs/lab-results 的 LabChartPoint 与 lab-analytics-format 的格式化工具，接收父级拖动状态与连续上涨日期用于避免拖动结束误选点并标出重点趋势段。
 * [OUTPUT]: 对外提供 LabTrendChart、TimeLabelDisplay 与 timeLabelDisplayOptions。
 * [POS]: components/analytics 的趋势图渲染层，承接横向 SVG 折线、参考范围、点位选择、连续上涨段高亮与时间标签密度控制，让 Dashboard 只负责状态编排。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { type KeyboardEvent, type MouseEvent } from 'react'

import type { LabChartPoint } from '@/lib/labs/lab-results'

import { formatNumber, formatStatusLabel, formatValue } from './lab-analytics-format'

export const timeLabelDisplayOptions = [
  { label: '显示', value: 'all' },
  { label: '隐藏', value: 'none' },
] as const

export type TimeLabelDisplay = (typeof timeLabelDisplayOptions)[number]['value']

type LabTrendChartProps = {
  highlightedDates?: string[]
  onSelectDate: (date: string) => void
  points: LabChartPoint[]
  selectedDate: string | null
  shouldSuppressSelect?: () => boolean
  timeLabelDisplay: TimeLabelDisplay
}

export function LabTrendChart({ highlightedDates = [], onSelectDate, points, selectedDate, shouldSuppressSelect, timeLabelDisplay }: LabTrendChartProps) {
  if (points.length < 2) {
    return <div className="flex h-full items-center justify-center rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)] text-sm font-semibold text-[var(--ff-text-secondary)]">需要更多读数才能形成趋势线</div>
  }

  const values = points.flatMap((point) => [point.value, point.referenceHigh, point.referenceLow].filter((value): value is number => value !== undefined))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const ticks = Array.from({ length: 5 }, (_, index) => max - (index * span) / 4)
  const chartLeft = Math.max(56, ...ticks.map((tick) => formatNumber(tick).length * 8 + 16))
  const chartRight = Math.max(690, chartLeft + Math.max(points.length - 1, 1) * 86)
  const chartTop = 34
  const chartBottom = 284
  const chartWidth = chartRight - chartLeft
  const chartHeight = chartBottom - chartTop
  const svgWidth = chartRight + 96
  const svgHeight = 314
  const dateLabelY = chartBottom + 18
  const referenceLow = points.find((point) => point.referenceLow !== undefined)?.referenceLow
  const referenceHigh = points.find((point) => point.referenceHigh !== undefined)?.referenceHigh
  const yForValue = (value: number) => chartBottom - ((value - min) / span) * chartHeight
  const pointCoordinates = points.map((point, index) => {
    const x = chartLeft + (index * chartWidth) / Math.max(points.length - 1, 1)
    const y = yForValue(point.value)

    return { point, x, y }
  })
  const chartPoints = pointCoordinates
    .map(({ x, y }) => `${x},${y}`)
    .join(' ')
  const highlightedDateSet = new Set(highlightedDates)
  const highlightedCoordinates = pointCoordinates.filter(({ point }) => highlightedDateSet.has(point.date))
  const highlightedPoints = highlightedCoordinates.map(({ x, y }) => `${x},${y}`).join(' ')
  const highlightedLabelX = highlightedCoordinates.length > 0 ? (highlightedCoordinates[0].x + highlightedCoordinates[highlightedCoordinates.length - 1].x) / 2 : chartLeft
  const highlightedLabelY = highlightedCoordinates.length > 0 ? Math.max(chartTop + 18, Math.min(...highlightedCoordinates.map(({ y }) => y)) - 18) : chartTop
  const latestPoint = points[points.length - 1]
  const selectedPoint = (selectedDate ? points.find((point) => point.date === selectedDate) : null) ?? latestPoint
  const selectedPointIndex = Math.max(0, points.findIndex((point) => point.date === selectedPoint.date))
  const selectedX = chartLeft + (selectedPointIndex * chartWidth) / Math.max(points.length - 1, 1)
  const selectedY = yForValue(selectedPoint.value)
  const handlePointKeyDown = (event: KeyboardEvent<SVGGElement>, date: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    onSelectDate(date)
  }
  const handleChartPointClick = (event: MouseEvent<SVGSVGElement>) => {
    const target = event.target as Element
    const control = target.closest<SVGGElement>('[data-chart-point-date]')
    const date = control?.dataset.chartPointDate

    if (!date) {
      return
    }

    event.stopPropagation()

    if (shouldSuppressSelect?.()) {
      return
    }

    onSelectDate(date)
  }
  const shouldShowDateLabel = () => {
    if (timeLabelDisplay === 'none') {
      return false
    }

    return true
  }

  return (
    <div className="relative" style={{ height: svgHeight, minWidth: '100%', width: svgWidth }}>
      <svg
        aria-hidden="true"
        className="pointer-events-none sticky left-0 top-0 z-10 block"
        style={{ height: svgHeight, marginBottom: -svgHeight, width: chartLeft }}
        viewBox={`0 0 ${chartLeft} ${svgHeight}`}
      >
        <rect fill="var(--ff-surface-inset)" height={svgHeight} width={chartLeft} x="0" y="0" />
        <rect fill="url(#lab-axis-fade)" height={svgHeight} width={chartLeft} x="0" y="0" />
        <defs>
          <linearGradient id="lab-axis-fade" x1="0" x2="1" y1="0" y2="0">
            <stop offset="72%" stopColor="var(--ff-surface-inset)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => {
          const y = yForValue(tick)

          return (
            <text fill="var(--ff-text-muted)" fontSize="13" key={tick} textAnchor="end" x={chartLeft - 10} y={y + 4}>
              {formatNumber(tick)}
            </text>
          )
        })}
        <line stroke="var(--ff-border-default)" x1={chartLeft - 1} x2={chartLeft - 1} y1={chartTop} y2={chartBottom} />
      </svg>
      <svg
        aria-label="选中指标趋势折线图"
        className="block rounded-[var(--ff-radius-md)] border border-[var(--ff-border-default)] bg-[var(--ff-surface-inset)]"
        onClick={handleChartPointClick}
        role="img"
        style={{ height: svgHeight, width: '100%' }}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      >
        {referenceLow !== undefined && referenceHigh !== undefined ? (
          <g>
            <rect
              fill="color-mix(in srgb, var(--ff-accent-success) 18%, transparent)"
              height={Math.max(4, yForValue(referenceLow) - yForValue(referenceHigh))}
              opacity="0.72"
              width={chartWidth}
              x={chartLeft}
              y={yForValue(referenceHigh)}
            />
            <line stroke="var(--ff-text-muted)" strokeDasharray="6 6" strokeOpacity="0.62" x1={chartLeft} x2={chartRight} y1={yForValue(referenceHigh)} y2={yForValue(referenceHigh)} />
            <line stroke="var(--ff-text-muted)" strokeDasharray="6 6" strokeOpacity="0.62" x1={chartLeft} x2={chartRight} y1={yForValue(referenceLow)} y2={yForValue(referenceLow)} />
          </g>
        ) : null}
        {ticks.map((tick) => {
          const y = yForValue(tick)

          return (
            <g key={tick}>
              <line stroke="var(--ff-border-default)" strokeOpacity="0.55" x1={chartLeft} x2={chartRight} y1={y} y2={y} />
              <text data-export-axis-label="true" display="none" fill="var(--ff-text-muted)" fontSize="13" textAnchor="end" x={chartLeft - 10} y={y + 4}>
                {formatNumber(tick)}
              </text>
            </g>
          )
        })}
        <line stroke="var(--ff-border-default)" x1={chartLeft} x2={chartRight} y1={chartBottom} y2={chartBottom} />
        <polyline fill="none" points={chartPoints} stroke="var(--ff-accent-primary)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        {highlightedCoordinates.length >= 2 ? (
          <g aria-label="连续上涨检查结果区间" data-rise-highlight="true" pointerEvents="none">
            <polyline fill="none" points={highlightedPoints} stroke="var(--ff-critical)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.22" strokeWidth="12" />
            <polyline fill="none" points={highlightedPoints} stroke="var(--ff-critical)" strokeDasharray="8 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
            <rect fill="color-mix(in srgb, var(--ff-critical) 16%, var(--ff-surface-inset))" height="22" rx="11" stroke="color-mix(in srgb, var(--ff-critical) 62%, transparent)" width="86" x={highlightedLabelX - 43} y={highlightedLabelY - 16} />
            <text fill="var(--ff-critical)" fontSize="13" fontWeight="800" textAnchor="middle" x={highlightedLabelX} y={highlightedLabelY - 1}>
              连续上涨段
            </text>
            {highlightedCoordinates.map(({ point, x, y }) => (
              <g data-rise-highlight-date={point.date} key={`rise-${point.date}`}>
                <circle cx={x} cy={y} fill="var(--ff-surface-inset)" r="9" stroke="var(--ff-critical)" strokeWidth="2.5" />
                <circle cx={x} cy={y} fill="var(--ff-critical)" r="3.5" />
              </g>
            ))}
          </g>
        ) : null}
        {pointCoordinates.map(({ point, x, y }, index) => {
          const isSelected = point.date === selectedPoint.date
          const valueLabelY = y - 12

          return (
            <g
              aria-label={`定位到 ${point.date} 的表格日期`}
              className="cursor-pointer outline-none"
              data-chart-point-control="true"
              data-chart-point-date={point.date}
              key={`${point.date}-${index}`}
              onKeyDown={(event) => handlePointKeyDown(event, point.date)}
              role="button"
              tabIndex={0}
            >
              <rect fill="transparent" height="46" rx="8" width="68" x={x - 34} y={Math.max(chartTop, valueLabelY - 24)} />
              <circle aria-label={`${point.date} ${formatValue(point.value, point.unit)} ${formatStatusLabel(point.status)}`} cx={x} cy={y} fill="var(--ff-accent-primary)" r="5" />
              {!isSelected ? (
                <text fill="var(--ff-accent-primary)" fontSize="13" fontWeight="700" textAnchor="middle" x={x} y={valueLabelY}>
                  {formatNumber(point.value)}
                </text>
              ) : null}
              {shouldShowDateLabel() ? (
                <text fill="var(--ff-text-muted)" fontSize="12" pointerEvents="none" textAnchor="middle" x={x} y={dateLabelY}>
                  {point.date.slice(5)}
                </text>
              ) : null}
            </g>
          )
        })}
        <g
          aria-label={`定位到 ${selectedPoint.date} 的表格日期，当前定位点`}
          className="cursor-pointer outline-none"
          data-chart-point-control="true"
          data-chart-point-date={selectedPoint.date}
          onKeyDown={(event) => handlePointKeyDown(event, selectedPoint.date)}
          role="button"
          tabIndex={0}
        >
          <rect fill="transparent" height="62" rx="10" width="72" x={selectedX - 36} y={selectedY - 40} />
          <circle aria-label={`${selectedPoint.date} 当前定位点`} cx={selectedX} cy={selectedY} fill="none" r="10" stroke="var(--ff-accent-primary)" strokeWidth="2" />
          <text fill="var(--ff-accent-primary)" fontSize="14" fontWeight="700" textAnchor="middle" x={selectedX} y={selectedY - 20}>
            {formatNumber(selectedPoint.value)}
          </text>
        </g>
        {referenceLow !== undefined && referenceHigh !== undefined ? (
          <g>
            <line stroke="var(--ff-border-default)" x1={chartRight + 16} x2={chartRight + 16} y1={yForValue(referenceHigh)} y2={yForValue(referenceLow)} />
            <text fill="var(--ff-text-secondary)" fontSize="13" x={chartRight + 24} y={(yForValue(referenceHigh) + yForValue(referenceLow)) / 2 - 5}>
              参考范围
            </text>
            <text fill="var(--ff-text-secondary)" fontSize="13" x={chartRight + 24} y={(yForValue(referenceHigh) + yForValue(referenceLow)) / 2 + 12}>
              {formatNumber(referenceLow)} - {formatNumber(referenceHigh)}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  )
}
